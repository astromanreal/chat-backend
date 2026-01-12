import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Please provide a username'],
    unique: true,
    trim: true,
    lowercase: true, // Enforce lowercase usernames
  },
  name: {
    type: String,
    default: ''
  },
  bio: {
    type: String,
    default: ''
  },
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    unique: true,
    trim: true,
    match: [
      /\S+@\S+\.\S+/,
      'Please provide a valid email',
    ],
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false, // Do not return password by default
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  otp: {
    type: String,
    select: false,
  },
  otpExpires: {
    type: Date,
    select: false,
  },
});

export default mongoose.model('User', UserSchema);
