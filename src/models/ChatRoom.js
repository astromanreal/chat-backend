import mongoose from 'mongoose';

const ChatRoomSchema = new mongoose.Schema({
  joinCode: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  creator: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true,
  },
  participants: [{
    type: mongoose.Schema.ObjectId,
    ref: 'User',
  }],
  status: {
    type: String,
    enum: ['active', 'inactive', 'expired'],
    default: 'active',
  },
  isLocked: {
    type: Boolean,
    default: false,
  },
  expiresAt: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
});

export default mongoose.model('ChatRoom', ChatRoomSchema);
