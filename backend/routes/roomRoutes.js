import express from 'express';
import {
  createRoom,
  getRooms,
  getRoomById,
  joinRoom,
  leaveRoom,
  deleteRoom
} from '../controllers/roomController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .post(protect, createRoom)
  .get(protect, getRooms);

router.route('/:id')
  .get(protect, getRoomById)
  .delete(protect, deleteRoom);

router.post('/:id/join', protect, joinRoom);
router.post('/:id/leave', protect, leaveRoom);

export default router;
