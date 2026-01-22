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
      enum: ['active', 'locked', 'expired', 'archived'],
      default: 'active',
    },
    maxParticipants: {
      type: Number,
      default: 2,
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from creation
    },
    isLocked: {
      type: Boolean,
      default: false,
    },
    // ADDED: Voice Call state management
    voiceCall: {
      isActive: { type: Boolean, default: false },
      host: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      participants: [
        {
          _id: false, // Prevent sub-document IDs
          user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
          isMuted: { type: Boolean, default: true },
          micAccess: { type: Boolean, default: false }, // Mic access granted by host
        },
      ],
    },
  },
  {
    timestamps: true,
  }
);

// Middleware to delete associated messages when a room is removed
chatRoomSchema.pre(
  'deleteOne',
  { document: true, query: false },
  async function (next) {
    console.log(`Deleting messages for room: ${this._id}`);
    await mongoose.model('Message').deleteMany({ chatRoom: this._id });
    next();
  }
);

const ChatRoom = mongoose.model('ChatRoom', chatRoomSchema);

export default ChatRoom;
