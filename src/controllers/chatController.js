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

// @desc    Get the chat history for the authenticated user
// @route   GET /api/chat/history
// @access  Private
export const getChatHistory = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const chatRooms = await ChatRoom.find({ participants: userId })
    .populate('participants', '_id name username')
    .sort({ updatedAt: -1 })
    .lean();

  const processedRooms = chatRooms.map(room => {
    let otherParticipant = null;

    if (room.participants.length === 2) {
      const other = room.participants.find(p => p._id.toString() !== userId);
      if (other) {
        otherParticipant = {
          _id: other._id,
          name: other.name,
          username: other.username,
        };
      }
    }

    return {
      _id: room._id,
      joinCode: room.joinCode,
      status: room.status,
      updatedAt: room.updatedAt,
      otherParticipant,
    };
  });

  res.status(200).json({ success: true, data: processedRooms });
});

// @desc    Get details of a specific chat room
// @route   GET /api/chat/:roomId
// @access  Private (Participants only)
export const getChatRoomDetails = asyncHandler(async (req, res) => {
  const room = await ChatRoom.findById(req.params.roomId).populate(
    'participants',
    '_id name username'
  );

  if (!room) {
    res.status(404);
    throw new Error('Chat room not found.');
  }

  const isParticipant = room.participants.some(
    (p) => p._id.toString() === req.user.id
  );

  if (!isParticipant) {
    res.status(403);
    throw new Error('Access denied. You are not a member of this chat room.');
  }

  res.status(200).json({ success: true, data: room });
});

// @desc    Create a new chat room
// @route   POST /api/chat/create
// @access  Private
export const createChatRoom = asyncHandler(async (req, res) => {
  const { expiresIn, maxParticipants } = req.body;
  const creatorId = req.user.id;

  const chatRoomData = {
    joinCode: await generateUniqueCode(),
    creator: creatorId, // This correctly assigns the room creator
    participants: [creatorId],
  };

  if (maxParticipants) {
    chatRoomData.maxParticipants = parseInt(maxParticipants, 10);
  }

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

  // ADDED: Enforce the room lock
  if (room.isLocked) {
    res.status(403);
    throw new Error('This chat room has been locked by the creator.');
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

  if (room.participants.length >= room.maxParticipants) {
    res.status(403);
    throw new Error('This chat room is already full.');
  }

  room.participants.push(userId);
  
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
