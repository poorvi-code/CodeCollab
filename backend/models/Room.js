import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema({
  roomName: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  code: {
    type: String,
    default: `// Welcome to CodeCollab!
// Write your code here and see updates in real time.

function greet() {
  console.log("Hello, World!");
}

greet();
`
  },
  language: {
    type: String,
    default: 'javascript'
  },
  lastUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

roomSchema.pre('save', function updateTimestamp(next) {
  this.updatedAt = Date.now();
  next();
});

const Room = mongoose.model('Room', roomSchema);
export default Room;
