import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import Message from '../models/Message.js';
import ChatRoom from '../models/ChatRoom.js';
import User from '../models/User.js';

const initializeSocket = (io) => {
  // Middleware to authenticate socket connections
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error: Token not provided'));
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded.user; // Attach user payload to the socket object
      next();
    } catch (err) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.user.id}`);

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
        console.log(`User ${socket.user.id} joined room ${roomId}`);

        const messages = await Message.find({ chatRoom: roomId })
          .populate('sender', 'name username _id')
          .sort({ createdAt: 'asc' });

        const otherParticipantId = room.participants.find(id => id.toString() !== socket.user.id);
        
        let otherUser = null;
        if (otherParticipantId) {
            otherUser = await User.findById(otherParticipantId).select('name username _id');
        }

        // Send room data (history and other user's info) to the user who just joined
        socket.emit('joinedRoom', {
          roomId,
          messages,
          otherUser
        });

        // If the other user exists, notify them that this user has connected
        if (otherUser) {
            const currentUser = await User.findById(socket.user.id).select('name username _id');
            socket.to(roomId).emit('userJoined', { otherUser: currentUser });
        }
      } catch (error) {
        console.error('Error joining room:', error);
        socket.emit('error', { message: 'Server error while joining room.' });
      }
    });

    socket.on('sendMessage', async ({ roomId, content }) => {
      try {
        if (!mongoose.Types.ObjectId.isValid(roomId)) {
          return socket.emit('error', { message: 'Invalid room ID format for sending message.' });
        }
        
        const room = await ChatRoom.findById(roomId);
        if (!room || !room.participants.includes(socket.user.id)) {
          return socket.emit('error', { message: 'You are not a member of this room.' });
        }

        const message = new Message({
          chatRoom: roomId,
          sender: socket.user.id,
          content,
        });

        await message.save();
        await message.populate('sender', 'name username _id');

        io.to(roomId).emit('receiveMessage', message);
      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('error', { message: 'Failed to send message.' });
      }
    });

    socket.on('typing', ({ roomId, isTyping }) => {
        socket.to(roomId).emit('typing', { isTyping });
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.user.id}`);
    });
  });
};

export default initializeSocket;
