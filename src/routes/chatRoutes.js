import express from 'express';
import { 
  createChatRoom, 
  joinChatRoom, 
  getChatRoomDetails, 
  getChatHistory 
} from '../controllers/chatController.js';
// ADDED: Import the new lock controller
import { toggleRoomLock } from '../controllers/roomLockController.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// @desc    Get the chat history for the authenticated user
// @route   GET /api/chat/history
router.get('/history', auth, getChatHistory);

// @desc    Create a new chat room
// @route   POST /api/chat/create
router.post('/create', auth, createChatRoom);

// @desc    Join an existing chat room
// @route   POST /api/chat/join
router.post('/join', auth, joinChatRoom);

// @desc    Get details of a specific chat room
// @route   GET /api/chat/:roomId
router.get('/:roomId', auth, getChatRoomDetails);

// ADDED: Route to lock/unlock a chat room
// @desc    Lock or unlock a specific chat room
// @route   PUT /api/chat/:roomId/lock
router.put('/:roomId/lock', auth, toggleRoomLock);

export default router;
