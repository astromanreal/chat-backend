import asyncHandler from 'express-async-handler';
import ChatRoom from '../models/ChatRoom.js';

// @desc    Lock or unlock a chat room
// @route   PUT /api/chat/:roomId/lock
// @access  Private (Room Creator only)
export const toggleRoomLock = asyncHandler(async (req, res) => {
  const { roomId } = req.params;
  const userId = req.user.id;

  const room = await ChatRoom.findById(roomId);

  if (!room) {
    res.status(404);
    throw new Error('Chat room not found.');
  }

  // 1. Authorization: Only the creator can lock or unlock
  if (room.creator.toString() !== userId) {
    res.status(403);
    throw new Error('Access denied. Only the room creator can change the lock state.');
  }

  // 2. Condition: Room must have exactly two participants to be locked
  if (room.participants.length < 2 && !room.isLocked) {
      res.status(400);
      throw new Error('A room can only be locked after a second participant has joined.');
  }

  // 3. Action: Toggle the lock state
  room.isLocked = !room.isLocked;
  await room.save();

  // We will add the real-time event emitting logic in the socket handler later

  res.status(200).json({
    success: true,
    message: `Room has been successfully ${room.isLocked ? 'locked' : 'unlocked'}.`,
    data: {
      isLocked: room.isLocked,
    },
  });
});
