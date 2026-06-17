import User from '../models/User.js';
import Room from '../models/Room.js';
import Notification from '../models/Notification.js';

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
export const updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      user.name = req.body.name || user.name;
      user.email = req.body.email || user.email;
      
      if (req.body.role) {
        user.role = req.body.role;
      }

      if (req.body.password) {
        user.password = req.body.password; // Schema pre-save hooks will encrypt it
      }

      const updatedUser = await user.save();

      res.json({
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        avatarColor: updatedUser.avatarColor,
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get collaboration history for user
// @route   GET /api/users/history
// @access  Private
export const getUserCollaborationHistory = async (req, res) => {
  try {
    // Find rooms created by user or where they are a member
    const rooms = await Room.find({
      $or: [{ createdBy: req.user._id }, { members: req.user._id }]
    })
    .populate('createdBy', 'name email avatarColor')
    .populate('members', 'name email avatarColor')
    .sort({ createdAt: -1 });

    res.json(rooms);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get user notifications
// @route   GET /api/users/notifications
// @access  Private
export const getUserNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user._id })
      .sort({ timestamp: -1 })
      .limit(50);

    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Mark notification as read
// @route   PUT /api/users/notifications/:id/read
// @access  Private
export const markNotificationRead = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (notification) {
      if (notification.user.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to read this notification' });
      }

      notification.status = 'read';
      await notification.save();
      res.json({ message: 'Notification marked as read' });
    } else {
      res.status(404).json({ message: 'Notification not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get dashboard metrics & stats
// @route   GET /api/users/dashboard
// @access  Private
export const getDashboardStats = async (req, res) => {
  try {
    // 1. Total rooms created on the platform (overall context)
    const totalRoomsCount = await Room.countDocuments();

    // 2. Personal Rooms created by this user
    const personalRoomsCreated = await Room.countDocuments({ createdBy: req.user._id });

    // 3. Rooms in which user is a member
    const roomsJoinedCount = await Room.countDocuments({ members: req.user._id });

    // 4. Find all rooms the user is involved with to calculate unique collaborators
    const userRooms = await Room.find({
      $or: [{ createdBy: req.user._id }, { members: req.user._id }]
    });

    const collaboratorsSet = new Set();
    userRooms.forEach(room => {
      // Add members
      room.members.forEach(memberId => {
        if (memberId.toString() !== req.user._id.toString()) {
          collaboratorsSet.add(memberId.toString());
        }
      });
      // Add creator if not current user
      if (room.createdBy.toString() !== req.user._id.toString()) {
        collaboratorsSet.add(room.createdBy.toString());
      }
    });

    const activeCollaboratorsCount = collaboratorsSet.size;

    // 5. Recent notifications as activities
    const recentActivities = await Notification.find({ user: req.user._id })
      .sort({ timestamp: -1 })
      .limit(5);

    res.json({
      totalRoomsCreated,             // Platform-wide
      personalRoomsCreated,          // User created
      roomsJoinedCount,              // User joined
      activeCollaborators: activeCollaboratorsCount,
      recentActivities,
      userRole: req.user.role
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
