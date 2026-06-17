import express from 'express';
import {
  updateUserProfile,
  getUserCollaborationHistory,
  getUserNotifications,
  markNotificationRead,
  getDashboardStats
} from '../controllers/userController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.put('/profile', protect, updateUserProfile);
router.get('/history', protect, getUserCollaborationHistory);
router.get('/notifications', protect, getUserNotifications);
router.put('/notifications/:id/read', protect, markNotificationRead);
router.get('/dashboard', protect, getDashboardStats);

export default router;
