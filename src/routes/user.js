import express from 'express';
const router = express.Router();
import auth from '../middleware/auth.js';
import * as userController from '../controllers/userController.js';

// @route   GET api/users
// @desc    Get all users
// @access  Private
router.get('/', auth, userController.getUsers);

// @route   GET api/users/me
// @desc    Get current user's profile
// @access  Private
router.get('/me', auth, userController.getMe);

// @route   PUT api/users/me
// @desc    Update current user's profile
// @access  Private
router.put('/me', auth, userController.updateMe);

// @route   GET api/users/:username
// @desc    Get user by username
// @access  Private
router.get('/:username', auth, userController.getUser);

export default router;
