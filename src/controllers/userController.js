import asyncHandler from 'express-async-handler';
import User from '../models/User.js';

// @desc    Get all users (admin action)
export const getUsers = asyncHandler(async (req, res) => {
    const users = await User.find();
    res.status(200).json({ success: true, count: users.length, data: users });
});

// @desc    Get current user's profile
export const getMe = asyncHandler(async (req, res) => {
    // req.user is available from the auth middleware
    const user = await User.findById(req.user.id);
    res.status(200).json({ success: true, data: user });
});

// @desc    Get user by ID (admin action)
export const getUser = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);

    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }

    res.status(200).json({ success: true, data: user });
});

// @desc    Update current user's profile (username, name, bio)
export const updateMe = asyncHandler(async (req, res) => {
    const { username, name, bio } = req.body;

    const updatedData = {};

    if (username) {
        updatedData.username = username.toLowerCase();
    }

    if (name) {
        updatedData.name = name;
    }

    if (bio) {
        updatedData.bio = bio;
    }

    // Check if any data was actually sent to be updated
    if (Object.keys(updatedData).length === 0) {
        res.status(400);
        throw new Error('Please provide data to update.');
    }

    const user = await User.findByIdAndUpdate(req.user.id, updatedData, {
        new: true,         // Return the updated user
        runValidators: true  // Run model validators on update
    });

    res.status(200).json({ success: true, data: user });
});
