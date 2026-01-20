import express from "express";
import {
  createChatRoom,
  joinChatRoom,
  getChatRoomDetails,
} from "../controllers/chatController.js";
import auth from "../middleware/auth.js";

const router = express.Router();

// @desc    Create a new chat room
// @route   POST /api/chat/create
router.post("/create", auth, createChatRoom);

// @desc    Join an existing chat room
// @route   POST /api/chat/join
router.post("/join", auth, joinChatRoom);

// @desc    Get details of a specific chat room
// @route   GET /api/chat/:roomId
router.get("/:roomId", auth, getChatRoomDetails);

export default router;
