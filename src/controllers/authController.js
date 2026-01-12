import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import asyncHandler from 'express-async-handler';
import User from '../models/User.js';
import sendEmail from '../utils/sendEmail.js';
import usernames from '../utils/usernames.js';

// Helper function to find a unique username that scales
const findUniqueUsername = async () => {
  let potentialUsername = '';
  let isUnique = false;

  // Select a base username from the list
  const baseUsername = usernames[Math.floor(Math.random() * usernames.length)];

  // First, check if the base username itself is available
  let existingUser = await User.findOne({ username: baseUsername });

  if (!existingUser) {
    return baseUsername; // If available, use it directly
  }

  // If the base username is taken, start appending random numbers
  let attempts = 0;
  while (!isUnique) {
    attempts++;
    const randomNumber = Math.floor(100 + Math.random() * 900); // 100-999
    potentialUsername = `${baseUsername}${randomNumber}`;

    existingUser = await User.findOne({ username: potentialUsername });
    if (!existingUser) {
      isUnique = true;
    }

    // Failsafe for extremely rare cases of repeated collisions
    if (attempts > 10 && !isUnique) {
      potentialUsername = `${baseUsername}${Date.now()}`;
      isUnique = true; // Force exit
    }
  }

  return potentialUsername;
};


// Helper function to send JWT response
const sendTokenResponse = (user, statusCode, res) => {
    const payload = { user: { id: user.id } };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '5d' });
    res.status(statusCode).json({ success: true, token });
};

export const register = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        res.status(400);
        throw new Error('Please provide an email and password');
    }

    const username = await findUniqueUsername();

    const user = await User.create({ username, email, password });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = otp;
    user.otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save({ validateBeforeSave: false });

    await sendEmail({
        email: user.email,
        subject: 'Verify Your Email',
        message: otp
    });

    res.status(201).json({ success: true, msg: 'User created. OTP sent to your email' });
});

export const verifyOtp = asyncHandler(async (req, res) => {
    const { email, otp } = req.body;

    if (!email || !otp) {
        res.status(400)
        throw new Error('Please provide email and OTP');
    }

    const user = await User.findOne({ email }).select('+otp');

    if (!user || user.otp !== otp || user.otpExpires < Date.now()) {
        res.status(400)
        throw new Error('Invalid or expired OTP');
    }

    user.isVerified = true;
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save({ validateBeforeSave: false });

    await sendEmail({
        type: 'welcome',
        email: user.email,
        subject: 'Welcome Aboard!',
        context: {
            username: user.username,
            websiteLink: 'http://localhost:3000/dashboard'
        }
    });

    sendTokenResponse(user, 200, res);
});

export const login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        res.status(400);
        throw new Error('Please provide email and password');
    }

    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await user.matchPassword(password))) {
        res.status(401);
        throw new Error('Invalid credentials');
    }

    if (!user.isVerified) {
        res.status(401);
        throw new Error('Please verify your email first');
    }

    sendTokenResponse(user, 200, res);
});

export const forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;

    const user = await User.findOne({ email });

    if (user) {
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        user.otp = otp;
        user.otpExpires = Date.now() + 10 * 60 * 1000;
        await user.save({ validateBeforeSave: false });

        await sendEmail({
            email: user.email,
            subject: 'Password Reset OTP',
            message: otp
        });
    }

    res.status(200).json({ success: true, msg: 'If a user with that email exists, an OTP will be sent.' });
});

export const resetPassword = asyncHandler(async (req, res) => {
    const { email, otp, newPassword } = req.body;

    const user = await User.findOne({ email }).select('+otp');

    if (!user || user.otp !== otp || user.otpExpires < Date.now()) {
        res.status(400)
        throw new Error('Invalid or expired OTP');
    }

    user.password = newPassword;
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    res.status(200).json({ success: true, msg: 'Password has been reset' });
});
