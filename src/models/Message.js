import mongoose from 'mongoose';

const MessageSchema = new mongoose.Schema({
  chatRoom: {
    type: mongoose.Schema.ObjectId,
    ref: 'ChatRoom',
    required: true,
    index: true,
  },
  sender: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true,
  },
  content: {
    type: String,
    required: true,
    trim: true,
  },
}, {
  timestamps: true,
});

export default mongoose.model('Message', MessageSchema);
