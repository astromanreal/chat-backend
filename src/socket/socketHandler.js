import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import Message from '../models/Message.js';
import ChatRoom from '../models/ChatRoom.js';

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

    // Event to join a specific chat room
    socket.on('joinRoom', async ({ roomId }) => {
      try {
        if (!mongoose.Types.ObjectId.isValid(roomId)) {
            socket.emit('error', { message: 'Invalid room ID format.' });
            return;
        }

        const room = await ChatRoom.findById(roomId);

        if (!room || !room.participants.includes(socket.user.id)) {
          socket.emit('error', { message: 'Not authorized to join this room.' });
          return;
        }

        socket.join(roomId);
        console.log(`User ${socket.user.id} joined room ${roomId}`);
        socket.emit('joinedRoom', { roomId });

      } catch (error) {
        console.error('Error joining room:', error);
        socket.emit('error', { message: 'Server error while joining room.' });
      }
    });

    // Event to handle incoming chat messages
    socket.on('sendMessage', async ({ roomId, content }) => {
      try {
        if (!mongoose.Types.ObjectId.isValid(roomId)) {
            socket.emit('error', { message: 'Invalid room ID format for sending message.' });
            return;
        }
        
        const room = await ChatRoom.findById(roomId);
        if (!room || !room.participants.includes(socket.user.id)) {
          socket.emit('error', { message: 'You are not a member of this room.' });
          return;
        }

        const message = new Message({
          chatRoom: roomId,
          sender: socket.user.id,
          content,
        });

        await message.save();

        // Broadcast the message to all members of the room
        io.to(roomId).emit('receiveMessage', {
          _id: message._id,
          chatRoom: roomId,
          sender: socket.user.id,
          content: message.content,
          createdAt: message.createdAt,
        });
      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('error', { message: 'Failed to send message.' });
      }
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.user.id}`);
    });
  });
};

export default initializeSocket;
