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
  const joinCode = await generateUniqueCode();
  const creatorId = req.user.id;

  const chatRoom = await ChatRoom.create({
    joinCode,
    creator: creatorId,
    participants: [creatorId],
  });

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

  // First, find the room to perform initial checks and see if user is already in.
  const roomToCheck = await ChatRoom.findOne({ joinCode });

  if (!roomToCheck) {
    res.status(404);
    throw new Error('Invalid join code. Room not found.');
  }
  
  if (roomToCheck.status !== 'active') {
    res.status(403);
    throw new Error(`This chat room is currently ${roomToCheck.status}.`);
  }

  // Allow user to 're-join' if they are already a participant.
  if (roomToCheck.participants.includes(userId)) {
    res.status(200).json({
      success: true,
      message: 'You are already in this room.',
      data: {
        roomId: roomToCheck._id,
      },
    });
    return;
  }

  // **ATOMIC OPERATION**
  // Find a room that matches the code AND is not locked. Then, atomically
  // add the user to the participants list and lock the room.
  const updatedRoom = await ChatRoom.findOneAndUpdate(
    {
      joinCode: joinCode,
      isLocked: false, // Condition: Only update if the room isn't already locked
    },
    {
      $push: { participants: userId }, // Action: Add the new user
      $set: { isLocked: true },       // Action: Lock the room
    },
    { new: true } // Option: Return the updated document
  );

  // If the atomic operation failed, updatedRoom will be null.
  // This means the room was locked by another user between our initial check and now.
  if (!updatedRoom) {
    res.status(403);
    throw new Error('This chat room was locked just before you joined. Access denied.');
  }

  // If we get here, the user successfully joined and the room is now locked.
  res.status(200).json({
    success: true,
    message: 'Successfully joined and locked the chat room.',
    data: {
      roomId: updatedRoom._id,
    },
  });
});
