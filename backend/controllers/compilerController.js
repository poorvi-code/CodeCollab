import Room from '../models/Room.js';
import Submission from '../models/Submission.js';
import { runCode, supportedLanguages } from '../utils/codeRunner.js';

const canAccessRoom = (room, userId) => {
  return room.members.some((memberId) => memberId.toString() === userId.toString()) ||
    room.createdBy.toString() === userId.toString();
};

export const executeCode = async (req, res) => {
  const { roomId, language, sourceCode, input = '' } = req.body;

  if (!roomId || !language || sourceCode === undefined) {
    return res.status(400).json({ message: 'roomId, language, and sourceCode are required' });
  }

  try {
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    if (!canAccessRoom(room, req.user._id)) {
      return res.status(403).json({ message: 'You are not a member of this room' });
    }

    const result = await runCode({ language, sourceCode, input });

    room.code = sourceCode;
    room.language = result.language;
    room.lastUpdatedBy = req.user._id;
    await room.save();

    const submission = await Submission.create({
      user: req.user._id,
      room: room._id,
      language: result.language,
      sourceCode,
      input,
      output: result.output,
      error: result.error,
      status: result.status,
      executionTimeMs: result.executionTimeMs,
      memoryUsageKb: result.memoryUsageKb
    });

    const populatedSubmission = await Submission.findById(submission._id)
      .populate('user', 'name email avatarColor');

    res.status(201).json({
      ...result,
      submission: populatedSubmission
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getRoomSubmissions = async (req, res) => {
  try {
    const room = await Room.findById(req.params.roomId);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    if (!canAccessRoom(room, req.user._id)) {
      return res.status(403).json({ message: 'You are not a member of this room' });
    }

    const submissions = await Submission.find({ room: req.params.roomId })
      .populate('user', 'name email avatarColor')
      .sort({ createdAt: -1 })
      .limit(30);

    res.json(submissions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteSubmission = async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id);
    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    const isOwner = submission.user.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'Admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Only the submission owner or an admin can delete it' });
    }

    await Submission.deleteOne({ _id: submission._id });
    res.json({ message: 'Submission deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getSupportedLanguages = (req, res) => {
  res.json(supportedLanguages);
};
