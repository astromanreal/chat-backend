import User from '../models/User.js';
import asyncHandler from 'express-async-handler';

// @desc    Get all users (for admin purposes, optional)
export const getUsers = asyncHandler(async (req, res) => {
  const users = await User.find({});
  res.json(users);
});

// @desc    Get current user's profile
export const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select('-password');
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  res.status(200).json({ success: true, data: user });
});

// @desc    Get user by Username
// @access  Private
export const getUser = asyncHandler(async (req, res) => {
  const { username } = req.params;
  const user = await User.findOne({ username }).select('-password');

  if (!user) {
    res.status(404);
    throw new Error('User not found with that username.');
  }

  res.status(200).json({ success: true, data: user });
});

// @desc    Update current user's profile (name, username, and bio)
// @access  Private
export const updateMe = asyncHandler(async (req, res) => {
  // Destructure all updatable fields from the request body
  const { name, username, bio } = req.body;

  const user = await User.findById(req.user.id);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  // Check if the username is being changed and if the new one is already taken
  if (username && username !== user.username) {
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      res.status(400); // Bad Request
      throw new Error('Username is already taken.');
    }
    user.username = username;
  }

  // Update name and bio if they are provided
  user.name = name || user.name;
  user.bio = bio !== undefined ? bio : user.bio;

  const updatedUser = await user.save();

  // Return the updated user, excluding the password
  const userResponse = updatedUser.toObject();
  delete userResponse.password;

  res.status(200).json({ success: true, data: userResponse });
});
