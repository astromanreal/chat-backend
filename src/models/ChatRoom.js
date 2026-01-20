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

// Middleware to delete all associated messages before a chat room is deleted
// This will trigger on methods like findByIdAndDelete, findOneAndDelete
chatRoomSchema.pre('findOneAndDelete', async function (next) {
  try {
    const room = await this.model.findOne(this.getQuery());
    if (room) {
      // This will now correctly delete messages when a room is deleted by our job
      await mongoose.model('Message').deleteMany({ chatRoom: room._id });
    }
    next();
  } catch (err) {
    next(err);
  }
});

// We have removed the TTL index. Deletion will be handled by a scheduled job.

const ChatRoom = mongoose.model('ChatRoom', chatRoomSchema);

export default ChatRoom;
