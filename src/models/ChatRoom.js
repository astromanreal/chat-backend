
import mongoose from 'mongoose';

const chatRoomSchema = new mongoose.Schema(
  {
    joinCode: {
      type: String,
      required: true,
      unique: true,
    },
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    status: {
      type: String,
      enum: ['active', 'locked', 'archived'],
      default: 'active',
    },
    maxParticipants: {
      type: Number,
      default: 2,
      min: 2,
    },
    expiresAt: {
      type: Date,
      default: null, // No expiration by default
    },
  },
  {
    timestamps: true,
  }
);

// Create a TTL index on expiresAt. Documents will be automatically deleted after the specified date.
// This only works if expiresAt has a value.
chatRoomSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const ChatRoom = mongoose.model('ChatRoom', chatRoomSchema);

export default ChatRoom;
