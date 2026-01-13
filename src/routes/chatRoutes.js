import express from 'express';
import { createChatRoom, joinChatRoom } from '../controllers/chatController.js';
import auth from '../middleware/auth.js'; // Corrected import

const router = express.Router();

// @route   POST api/chat/create
// @desc    Create a new chat room
// @access  Private
router.post('/create', auth, createChatRoom);

// @route   POST api/chat/join
// @desc    Join an existing chat room with a join code
// @access  Private
router.post('/join', auth, joinChatRoom);

export default router;
