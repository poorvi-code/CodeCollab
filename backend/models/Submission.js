import mongoose from 'mongoose';

const submissionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true
  },
  language: {
    type: String,
    required: true
  },
  sourceCode: {
    type: String,
    required: true
  },
  input: {
    type: String,
    default: ''
  },
  output: {
    type: String,
    default: ''
  },
  error: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['success', 'compilation_error', 'runtime_error', 'timeout', 'unsupported'],
    required: true
  },
  executionTimeMs: {
    type: Number,
    default: 0
  },
  memoryUsageKb: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

const Submission = mongoose.model('Submission', submissionSchema);
export default Submission;
