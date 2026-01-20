import User from '../models/User.js';
import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';

// @desc    Get all users (for admin purposes, optional)
export const getUsers = asyncHandler(async (req, res) => {
  const users = await User.find({});
  res.json(users);
});

// @desc    Get current user's profile
export const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  res.status(200).json({ success: true, data: user });
});

// @desc    Get user by ID or Username
// @access  Private
export const getUser = asyncHandler(async (req, res) => {
  const identifier = req.params.id;
  let query;

  // Check if the identifier is a valid MongoDB ObjectId
  if (mongoose.Types.ObjectId.isValid(identifier)) {
    query = { _id: identifier };
  } else {
    // If not a valid ID, assume it's a username
    query = { username: identifier.toLowerCase() };
  }

  const user = await User.findOne(query).select('-password');

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  res.json(user);
});

// @desc    Update current user's profile
export const updateMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  const { name, bio, username } = req.body;

  if (username && username.toLowerCase() !== user.username) {
    const newUsername = username.trim().toLowerCase();
    const existingUser = await User.findOne({ username: newUsername });

    if (existingUser) {
      res.status(400);
      throw new Error('Username is already taken');
    }
    user.username = newUsername;
  }

  if (name !== undefined) {
    user.name = name;
  }

  if (bio !== undefined) {
    user.bio = bio;
  }

  const updatedUser = await user.save();

  res.status(200).json({
    success: true,
    data: updatedUser,
  });
});
