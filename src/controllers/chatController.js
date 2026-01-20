import ChatRoom from '../models/ChatRoom.js';
import User from '../models/User.js';
import asyncHandler from 'express-async-handler';

// Helper function to generate a unique 6-digit code
const generateUniqueCode = async () => {
  let code;
  let isUnique = false;
  while (!isUnique) {
    code = Math.floor(100000 + Math.random() * 900000).toString();
    const existingRoom = await ChatRoom.findOne({ joinCode: code });
    if (!existingRoom) {
      isUnique = true;
    }
  }
  return code;
};

// @desc    Create a new chat room
// @route   POST /api/chat/create
// @access  Private
export const createChatRoom = asyncHandler(async (req, res) => {
  const { expiresIn, maxParticipants } = req.body;
  const creatorId = req.user.id;

  const chatRoomData = {
    joinCode: await generateUniqueCode(),
    creator: creatorId,
    participants: [creatorId],
  };

  // Handle optional maxParticipants
  if (maxParticipants) {
    chatRoomData.maxParticipants = parseInt(maxParticipants, 10);
  }

  // Handle optional expiresIn
  if (expiresIn && expiresIn !== 'never') {
    const now = new Date();
    switch (expiresIn) {
      case '10m':
        now.setMinutes(now.getMinutes() + 10);
        chatRoomData.expiresAt = now;
        break;
      case '1h':
        now.setHours(now.getHours() + 1);
        chatRoomData.expiresAt = now;
        break;
      case '24h':
        now.setHours(now.getHours() + 24);
        chatRoomData.expiresAt = now;
        break;
      default:
        // If an invalid string is passed, it will be ignored and no expiration will be set.
        break;
    }
  }

  const chatRoom = await ChatRoom.create(chatRoomData);

  res.status(201).json({
    success: true,
    message: 'Chat room created successfully.',
    data: {
      joinCode: chatRoom.joinCode,
      roomId: chatRoom._id,
    },
  });
});

// @desc    Join an existing chat room
// @route   POST /api/chat/join
// @access  Private
export const joinChatRoom = asyncHandler(async (req, res) => {
  const { joinCode } = req.body;
  const userId = req.user.id;

  if (!joinCode) {
    res.status(400);
    throw new Error('Please provide a join code.');
  }

  const room = await ChatRoom.findOne({ joinCode });

  if (!room) {
    res.status(404);
    throw new Error('Invalid join code. Room not found.');
  }
  
  if (room.status !== 'active') {
    res.status(403);
    throw new Error(`This chat room is currently ${room.status}.`);
  }

  if (room.participants.includes(userId)) {
    return res.status(200).json({
      success: true,
      message: 'You are already in this room.',
      data: { roomId: room._id },
    });
  }

  // Check if the room is full
  if (room.participants.length >= room.maxParticipants) {
    res.status(403);
    throw new Error('This chat room is already full.');
  }

  // Add the user to the room
  room.participants.push(userId);
  
  // Lock the room if it has reached its max capacity
  if (room.participants.length === room.maxParticipants) {
    room.status = 'locked';
  }
  
  await room.save();

  res.status(200).json({
    success: true,
    message: 'Successfully joined the chat room.',
    data: {
      roomId: room._id,
    },
  });
});
