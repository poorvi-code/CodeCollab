import express from 'express';
import {
  deleteSubmission,
  executeCode,
  getRoomSubmissions,
  getSupportedLanguages
} from '../controllers/compilerController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/languages', protect, getSupportedLanguages);
router.post('/execute', protect, executeCode);
router.get('/rooms/:roomId/submissions', protect, getRoomSubmissions);
router.delete('/submissions/:id', protect, deleteSubmission);

export default router;
