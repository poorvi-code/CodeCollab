import User from '../models/User.js';
import Room from '../models/Room.js';
import Message from '../models/Message.js';
import Notification from '../models/Notification.js';
import jwt from 'jsonwebtoken';

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

const resolvers = {
  Query: {
    me: async (_, __, { user }) => {
      if (!user) throw new Error('Not authenticated');
      return user;
    },
    rooms: async (_, __, { user }) => {
      if (!user) throw new Error('Not authenticated');
      return await Room.find({})
        .populate('createdBy')
        .populate('members')
        .populate('lastUpdatedBy')
        .sort({ createdAt: -1 });
    },
    room: async (_, { id }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      const room = await Room.findById(id)
        .populate('createdBy')
        .populate('members')
        .populate('lastUpdatedBy');
      if (!room) throw new Error('Room not found');
      return room;
    },
    messages: async (_, { roomId }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      return await Message.find({ room: roomId })
        .populate('sender')
        .sort({ timestamp: 1 });
    },
    notifications: async (_, __, { user }) => {
      if (!user) throw new Error('Not authenticated');
      return await Notification.find({ user: user.id })
        .sort({ timestamp: -1 })
        .limit(30);
    },
    dashboardStats: async (_, __, { user }) => {
      if (!user) throw new Error('Not authenticated');

      const totalRoomsCreated = await Room.countDocuments();
      const personalRoomsCreated = await Room.countDocuments({ createdBy: user.id });
      const roomsJoinedCount = await Room.countDocuments({ members: user.id });

      const userRooms = await Room.find({
        $or: [{ createdBy: user.id }, { members: user.id }]
      });

      const collaboratorsSet = new Set();
      userRooms.forEach(room => {
        room.members.forEach(memberId => {
          if (memberId.toString() !== user.id.toString()) {
            collaboratorsSet.add(memberId.toString());
          }
        });
        if (room.createdBy.toString() !== user.id.toString()) {
          collaboratorsSet.add(room.createdBy.toString());
        }
      });

      return {
        totalRoomsCreated,
        personalRoomsCreated,
        roomsJoinedCount,
        activeCollaborators: collaboratorsSet.size,
        userRole: user.role
      };
    }
  },
  Mutation: {
    register: async (_, { name, email, password, role }) => {
      const userExists = await User.findOne({ email });
      if (userExists) throw new Error('User already exists');

      const user = await User.create({
        name,
        email,
        password,
        role: role || 'Developer'
      });

      return {
        token: generateToken(user._id),
        user
      };
    },
    login: async (_, { email, password }) => {
      const user = await User.findOne({ email });
      if (!user || !(await user.comparePassword(password))) {
        throw new Error('Invalid email or password');
      }

      return {
        token: generateToken(user._id),
        user
      };
    },
    createRoom: async (_, { roomName, description, language }, { user }) => {
      if (!user) throw new Error('Not authenticated');

      const room = await Room.create({
        roomName,
        description,
        language: language || 'javascript',
        createdBy: user.id,
        members: [user.id]
      });

      return await Room.findById(room._id)
        .populate('createdBy')
        .populate('members')
        .populate('lastUpdatedBy');
    },
    joinRoom: async (_, { roomId }, { user }) => {
      if (!user) throw new Error('Not authenticated');

      const room = await Room.findById(roomId);
      if (!room) throw new Error('Room not found');

      const isMember = room.members.some(
        (memberId) => memberId.toString() === user.id.toString()
      );

      if (!isMember) {
        room.members.push(user.id);
        await room.save();

        await Notification.create({
          user: user.id,
          notificationMessage: `You joined room: "${room.roomName}"`
        });

        if (room.createdBy.toString() !== user.id.toString()) {
          await Notification.create({
            user: room.createdBy,
            notificationMessage: `Developer "${user.name}" joined your room: "${room.roomName}"`
          });
        }
      }

      return await Room.findById(roomId)
        .populate('createdBy')
        .populate('members')
        .populate('lastUpdatedBy');
    },
    updateRoomCode: async (_, { roomId, code, language }, { user }) => {
      if (!user) throw new Error('Not authenticated');

      const room = await Room.findById(roomId);
      if (!room) throw new Error('Room not found');

      room.code = code;
      if (language) room.language = language;
      room.lastUpdatedBy = user.id;
      await room.save();

      return await Room.findById(roomId)
        .populate('createdBy')
        .populate('members')
        .populate('lastUpdatedBy');
    }
  }
};

export default resolvers;
