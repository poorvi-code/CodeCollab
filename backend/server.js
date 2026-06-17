import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

import connectDB from './config/db.js';
import User from './models/User.js';
import Room from './models/Room.js';
import Message from './models/Message.js';
import Notification from './models/Notification.js';

import authRoutes from './routes/authRoutes.js';
import roomRoutes from './routes/roomRoutes.js';
import userRoutes from './routes/userRoutes.js';
import compilerRoutes from './routes/compilerRoutes.js';

import typeDefs from './graphql/typeDefs.js';
import resolvers from './graphql/resolvers.js';

dotenv.config();

const PORT = process.env.PORT || 5000;

// Initialize express app
const app = express();
const httpServer = createServer(app);

// Connect to Database
connectDB();

// Middlewares
app.use(cors({
  origin: '*', // For development flexibility
  credentials: true
}));
app.use(express.json());

// REST routes
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/users', userRoutes);
app.use('/api/compiler', compilerRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date() });
});

// Setup Apollo GraphQL Server
const apolloServer = new ApolloServer({
  typeDefs,
  resolvers,
  plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
});

await apolloServer.start();

// Mount GraphQL middleware
app.use(
  '/graphql',
  cors(),
  express.json(),
  expressMiddleware(apolloServer, {
    context: async ({ req }) => {
      const authHeader = req.headers.authorization || '';
      if (authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          const user = await User.findById(decoded.id).select('-password');
          return { user };
        } catch (err) {
          return { user: null };
        }
      }
      return { user: null };
    },
  })
);

// Setup Socket.io Server
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// In-memory code debouncers (auto-save code 1.5s after user stops typing)
const codeSaveTimeouts = {};
const activeRoomUsers = {}; // Keeps track of active sockets in each room

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  // Join Room Event
  socket.on('join-room', async ({ roomId, userId }) => {
    try {
      const user = await User.findById(userId).select('name email avatarColor');
      const room = await Room.findById(roomId);
      
      if (!user || !room) {
        socket.emit('error', { message: 'Invalid user or room' });
        return;
      }

      socket.join(roomId);
      socket.roomId = roomId;
      socket.userId = userId;
      socket.userName = user.name;
      socket.userColor = user.avatarColor;

      // Add user to active tracking
      if (!activeRoomUsers[roomId]) {
        activeRoomUsers[roomId] = [];
      }
      
      // Ensure no duplicate entries for the same user in active users list
      if (!activeRoomUsers[roomId].some(u => u.userId === userId)) {
        activeRoomUsers[roomId].push({
          socketId: socket.id,
          userId: user._id,
          name: user.name,
          avatarColor: user.avatarColor
        });
      }

      console.log(`User ${user.name} joined room ${roomId}`);

      // Broadcast to room that user joined
      socket.to(roomId).emit('user-joined', {
        userId: user._id,
        name: user.name,
        avatarColor: user.avatarColor,
        activeUsers: activeRoomUsers[roomId]
      });

      // Send the current list of active users to the joining client
      socket.emit('active-users-list', activeRoomUsers[roomId]);

      // System notification inside database
      await Notification.create({
        user: userId,
        notificationMessage: `Joined room "${room.roomName}"`
      });

    } catch (err) {
      console.error('Socket join-room error:', err.message);
    }
  });

  // Code Sync Event
  socket.on('code-change', ({ roomId, code }) => {
    // Broadcast changes to everyone else in the room
    socket.to(roomId).emit('code-update', {
      code,
      lastUpdatedBy: {
        userId: socket.userId,
        name: socket.userName
      },
      timestamp: new Date()
    });

    // Debounce database save
    if (codeSaveTimeouts[roomId]) {
      clearTimeout(codeSaveTimeouts[roomId]);
    }
    
    codeSaveTimeouts[roomId] = setTimeout(async () => {
      try {
        await Room.findByIdAndUpdate(roomId, {
          code,
          lastUpdatedBy: socket.userId,
          updatedAt: new Date()
        });
        console.log(`Auto-saved code state for room ${roomId}`);
      } catch (err) {
        console.error('Auto-save error:', err.message);
      }
    }, 1500);
  });

  // Language Change Event
  socket.on('language-change', async ({ roomId, language }) => {
    socket.to(roomId).emit('language-update', { language });
    try {
      await Room.findByIdAndUpdate(roomId, {
        language,
        lastUpdatedBy: socket.userId,
        updatedAt: new Date()
      });
    } catch (err) {
      console.error('Language update error:', err.message);
    }
  });

  socket.on('execution-result', ({ roomId, result }) => {
    io.to(roomId).emit('shared-output', {
      result,
      runner: {
        userId: socket.userId,
        name: socket.userName,
        color: socket.userColor
      },
      timestamp: new Date()
    });
  });

  // Cursor Position Event
  socket.on('cursor-move', ({ roomId, cursor }) => {
    socket.to(roomId).emit('cursor-update', {
      userId: socket.userId,
      name: socket.userName,
      color: socket.userColor,
      cursor
    });
  });

  // Send Message Event
  socket.on('send-chat-message', async ({ roomId, message }) => {
    try {
      const msg = await Message.create({
        sender: socket.userId,
        room: roomId,
        message
      });

      const populatedMsg = await Message.findById(msg._id)
        .populate('sender', 'name avatarColor email');

      // Send message to everyone in the room (including sender)
      io.to(roomId).emit('new-chat-message', populatedMsg);

      // Create message alerts for other users in the room
      const room = await Room.findById(roomId);
      if (room) {
        const otherMembers = room.members.filter(m => m.toString() !== socket.userId.toString());
        for (const memberId of otherMembers) {
          await Notification.create({
            user: memberId,
            notificationMessage: `New message in "${room.roomName}" from "${socket.userName}"`
          });
        }
      }
    } catch (err) {
      console.error('Chat message error:', err.message);
    }
  });

  // User Typing state
  socket.on('typing', ({ roomId, isTyping }) => {
    socket.to(roomId).emit('typing-status', {
      userId: socket.userId,
      name: socket.userName,
      isTyping
    });
  });

  // Disconnect/Leave Event
  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
    const roomId = socket.roomId;
    const userId = socket.userId;

    if (roomId && activeRoomUsers[roomId]) {
      // Remove from active list
      activeRoomUsers[roomId] = activeRoomUsers[roomId].filter(
        (u) => u.userId.toString() !== userId.toString()
      );

      // Notify others
      socket.to(roomId).emit('user-left', {
        userId,
        name: socket.userName,
        activeUsers: activeRoomUsers[roomId]
      });

      console.log(`User ${socket.userName} disconnected from room ${roomId}`);
    }
  });
});

// Run server
httpServer.listen(PORT, () => {
  console.log(`Server running in development mode on port ${PORT}`);
  console.log(`GraphQL endpoint available at http://localhost:${PORT}/graphql`);
});
