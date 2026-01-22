import express from 'express';
import { 
  createChatRoom, 
  joinChatRoom, 
  getChatRoomDetails, 
  getChatHistory 
} from '../controllers/chatController.js';
import { toggleRoomLock } from '../controllers/roomLockController.js';
// ADDED: Import the new voice call controller
import { startCall, endCall } from '../controllers/voiceCallController.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// --- Chat & Room Management ---
router.get('/history', auth, getChatHistory);
router.post('/create', auth, createChatRoom);
router.post('/join', auth, joinChatRoom);
router.get('/:roomId', auth, getChatRoomDetails);
router.put('/:roomId/lock', auth, toggleRoomLock);

// --- ADDED: Voice Call Management ---

// @desc    Start a new voice call in a room
// @route   POST /api/chat/:roomId/call/start
router.post('/:roomId/call/start', auth, startCall);

// @desc    End the current voice call in a room
// @route   POST /api/chat/:roomId/call/end
router.post('/:roomId/call/end', auth, endCall);

export default router;
