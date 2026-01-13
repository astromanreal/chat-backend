import User from '../models/User.js';
import asyncHandler from 'express-async-handler';

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

// @desc    Get user by ID
export const getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  res.json(user);
});

// @desc    Update current user's profile
export const updateMe = asyncHandler(async (req, res) => {
  // Find the user from the token
  const user = await User.findById(req.user.id);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  // Get the fields to update from the body
  const { name, bio, username } = req.body;

  // Handle username update separately to check for uniqueness
  if (username && username.toLowerCase() !== user.username) {
    const newUsername = username.trim().toLowerCase();
    // Check if the new username is already taken by another user
    const existingUser = await User.findOne({ username: newUsername });

    if (existingUser) {
      res.status(400);
      throw new Error('Username is already taken');
    }

    // Mongoose validation will handle format and length checks on save
    user.username = newUsername;
  }

  // Update other fields if they are provided in the request.
  // This approach allows setting a field to an empty string like ''.
  if (name !== undefined) {
    user.name = name;
  }

  if (bio !== undefined) {
    user.bio = bio;
  }

  // Save the updated user. Mongoose will run all model validations here.
  const updatedUser = await user.save();

  // Return the updated user data
  res.status(200).json({
    success: true,
    data: updatedUser,
  });
});
