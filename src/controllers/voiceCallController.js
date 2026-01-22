import asyncHandler from 'express-async-handler';
import ChatRoom from '../models/ChatRoom.js';

// @desc    Start a new voice call in a room
// @route   POST /api/chat/:roomId/call/start
// @access  Private (Room Creator only)
export const startCall = asyncHandler(async (req, res) => {
  const { roomId } = req.params;
  const userId = req.user.id;

  const room = await ChatRoom.findById(roomId);

  if (!room) {
    res.status(404);
    throw new Error('Chat room not found.');
  }

  // Authorization: Only the creator can start a call
  if (room.creator.toString() !== userId) {
    res.status(403);
    throw new Error('Access denied. Only the room creator can start a call.');
  }

  if (room.voiceCall.isActive) {
    res.status(400);
    throw new Error('A call is already active in this room.');
  }

  // Initialize participants for the voice call
  const callParticipants = room.participants.map(participantId => ({
    user: participantId,
    isMuted: true, // All users start muted
    micAccess: participantId.toString() === userId, // Host gets mic access by default
  }));

  room.voiceCall = {
    isActive: true,
    host: userId,
    participants: callParticipants,
  };

  await room.save();

  // The real-time 'call-started' event will be emitted via sockets
  // after this request is successful on the client.

  res.status(200).json({
    success: true,
    message: 'Voice call initiated successfully.',
    data: room.voiceCall,
  });
});

// @desc    End the current voice call in a room
// @route   POST /api/chat/:roomId/call/end
// @access  Private (Room Creator only)
export const endCall = asyncHandler(async (req, res) => {
  const { roomId } = req.params;
  const userId = req.user.id;

  const room = await ChatRoom.findById(roomId);

  if (!room) {
    res.status(404);
    throw new Error('Chat room not found.');
  }

  // Authorization: Only the creator/host can end a call
  if (!room.voiceCall.host || room.voiceCall.host.toString() !== userId) {
    res.status(403);
    throw new Error('Access denied. Only the call host can end the call.');
  }

  if (!room.voiceCall.isActive) {
    res.status(400);
    throw new Error('No active call to end in this room.');
  }

  // Reset the voice call state
  room.voiceCall = {
    isActive: false,
    host: null,
    participants: [],
  };

  await room.save();

  // The real-time 'call-ended' event will be emitted via sockets.

  res.status(200).json({
    success: true,
    message: 'Voice call ended successfully.',
  });
});
