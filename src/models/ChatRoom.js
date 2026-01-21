import mongoose from "mongoose";

const chatRoomSchema = new mongoose.Schema(
  {
    joinCode: {
      type: String,
      required: true,
      unique: true,
    },
    // ADDED: To track who can lock/unlock the room
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    status: {
      type: String,
      enum: ["active", "locked", "expired", "archived"],
      default: "active",
    },
    maxParticipants: {
      type: Number,
      default: 2,
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from creation
    },
    // ADDED: To track the lock state of the room
    isLocked: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

// Middleware to delete associated messages when a room is removed
chatRoomSchema.pre(
  "deleteOne",
  { document: true, query: false },
  async function (next) {
    console.log(`Deleting messages for room: ${this._id}`);
    await mongoose.model("Message").deleteMany({ chatRoom: this._id });
    next();
  },
);

const ChatRoom = mongoose.model("ChatRoom", chatRoomSchema);

export default ChatRoom;
