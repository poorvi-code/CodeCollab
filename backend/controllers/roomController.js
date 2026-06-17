import Room from '../models/Room.js';
import Notification from '../models/Notification.js';

// @desc    Create a new coding room
// @route   POST /api/rooms
// @access  Private
export const createRoom = async (req, res) => {
  const { roomName, description, language } = req.body;

  try {
    if (!roomName) {
      return res.status(400).json({ message: 'Room name is required' });
    }

    const room = await Room.create({
      roomName,
      description,
      language: language || 'javascript',
      lastUpdatedBy: req.user._id,
      createdBy: req.user._id,
      members: [req.user._id] // Creator is the first member
    });

    // Populate createdBy details
    const populatedRoom = await Room.findById(room._id)
      .populate('createdBy', 'name email avatarColor')
      .populate('lastUpdatedBy', 'name email avatarColor')
      .populate('members', 'name email avatarColor');

    res.status(201).json(populatedRoom);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all coding rooms
// @route   GET /api/rooms
// @access  Private
export const getRooms = async (req, res) => {
  try {
    const rooms = await Room.find({})
      .populate('createdBy', 'name email avatarColor')
      .populate('lastUpdatedBy', 'name email avatarColor')
      .populate('members', 'name email avatarColor')
      .sort({ createdAt: -1 });

    res.json(rooms);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get a room by ID
// @route   GET /api/rooms/:id
// @access  Private
export const getRoomById = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id)
      .populate('createdBy', 'name email avatarColor')
      .populate('lastUpdatedBy', 'name email avatarColor')
      .populate('members', 'name email avatarColor');

    if (room) {
      res.json(room);
    } else {
      res.status(404).json({ message: 'Room not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Join an existing room
// @route   POST /api/rooms/:id/join
// @access  Private
export const joinRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Check if user is already a member
    const isMember = room.members.some(
      (memberId) => memberId.toString() === req.user._id.toString()
    );

    if (!isMember) {
      room.members.push(req.user._id);
      await room.save();

      // Create notification for room members (we can notify creator/members)
      // For now, let's create a notification history record for the user joining
      await Notification.create({
        user: req.user._id,
        notificationMessage: `You joined the room: "${room.roomName}"`
      });
      
      // Let's also create notifications for the room creator that someone joined
      if (room.createdBy.toString() !== req.user._id.toString()) {
        await Notification.create({
          user: room.createdBy,
          notificationMessage: `Developer "${req.user.name}" joined your room: "${room.roomName}"`
        });
      }
    }

    const updatedRoom = await Room.findById(room._id)
      .populate('createdBy', 'name email avatarColor')
      .populate('lastUpdatedBy', 'name email avatarColor')
      .populate('members', 'name email avatarColor');

    res.json(updatedRoom);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Leave a room
// @route   POST /api/rooms/:id/leave
// @access  Private
export const leaveRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Remove user from members
    room.members = room.members.filter(
      (memberId) => memberId.toString() !== req.user._id.toString()
    );

    await room.save();

    // Notify room creator if leaving user wasn't creator
    if (room.createdBy.toString() !== req.user._id.toString()) {
      await Notification.create({
        user: room.createdBy,
        notificationMessage: `Developer "${req.user.name}" left your room: "${room.roomName}"`
      });
    }

    res.json({ message: 'Left room successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete room (Admin only)
// @route   DELETE /api/rooms/:id
// @access  Private/Admin
export const deleteRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Enforce role-based access: Admin OR room creator
    const isAdmin = req.user.role === 'Admin';
    const isCreator = room.createdBy.toString() === req.user._id.toString();

    if (!isAdmin && !isCreator) {
      return res.status(403).json({ message: 'Not authorized. Only room creators or Admins can delete rooms.' });
    }

    await Room.deleteOne({ _id: room._id });
    res.json({ message: 'Room deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
