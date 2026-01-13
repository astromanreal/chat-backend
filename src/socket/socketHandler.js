import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import Message from '../models/Message.js';
import ChatRoom from '../models/ChatRoom.js';
import User from '../models/User.js';

const initializeSocket = (io) => {
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error: Token not provided'));
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded.user;
      next();
    } catch (err) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`[Socket Connected] UserID: ${socket.user.id}`);

    socket.on('joinRoom', async ({ roomId }) => {
      try {
        if (!mongoose.Types.ObjectId.isValid(roomId)) {
          return socket.emit('error', { message: 'Invalid room ID format.' });
        }

        const room = await ChatRoom.findById(roomId);
        if (!room || !room.participants.includes(socket.user.id)) {
          return socket.emit('error', { message: 'Not authorized to join this room.' });
        }

        socket.join(roomId);
        socket.currentRoom = roomId; // Store room for disconnect handling
        console.log(`[Room Joined] UserID: ${socket.user.id} -> RoomID: ${roomId}`);

        const messages = await Message.find({ chatRoom: roomId })
          .populate('sender', 'name username _id')
          .sort({ createdAt: 'asc' });

        const otherParticipantId = room.participants.find(id => id.toString() !== socket.user.id);
        
        let otherUser = null;
        if (otherParticipantId) {
            otherUser = await User.findById(otherParticipantId).select('name username _id');
        }

        // 1. Send initial data to the user who just connected
        console.log(`[Emit joinedRoom] To UserID: ${socket.user.id} -> With OtherUser: ${otherUser?._id}`);
        socket.emit('joinedRoom', { roomId, messages, otherUser });

        // 2. If another user exists, notify them that this user has joined
        if (otherUser) {
            const currentUser = await User.findById(socket.user.id).select('name username _id');
            console.log(`[Emit userJoined] To RoomID: ${roomId} -> For OtherUser: ${otherUser._id} -> Announcing User: ${currentUser._id}`);
            socket.to(roomId).emit('userJoined', { otherUser: currentUser });
        }
      } catch (error) {
        console.error('[Error joining room]:', error);
        socket.emit('error', { message: 'Server error while joining room.' });
      }
    });

    socket.on('sendMessage', async ({ roomId, content }) => {
      try {
        // ... (sendMessage logic remains the same, it is correct)
        const room = await ChatRoom.findById(roomId);
        if (!room || !room.participants.includes(socket.user.id)) {
          return socket.emit('error', { message: 'You are not a member of this room.' });
        }

        const message = new Message({ chatRoom: roomId, sender: socket.user.id, content });
        await message.save();
        await message.populate('sender', 'name username _id');

        io.to(roomId).emit('receiveMessage', message);
      } catch (error) {
        console.error('[Error sending message]:', error);
        socket.emit('error', { message: 'Failed to send message.' });
      }
    });

    socket.on('typing', ({ roomId, isTyping }) => {
        socket.to(roomId).emit('typing', { isTyping });
    });

    // 3. Handle user disconnection
    socket.on('disconnect', () => {
      console.log(`[Socket Disconnected] UserID: ${socket.user.id}`);
      if (socket.currentRoom) {
        console.log(`[Emit userLeft] To RoomID: ${socket.currentRoom} -> Announcing UserID: ${socket.user.id}`);
        // Notify the other person in the room that this user has left
        socket.to(socket.currentRoom).emit('userLeft', { userId: socket.user.id });
      }
    });
  });
};

export default initializeSocket;
