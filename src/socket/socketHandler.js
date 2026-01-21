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
        socket.currentRoom = roomId;
        console.log(`[Room Joined] UserID: ${socket.user.id} -> RoomID: ${roomId}`);

        // ... (rest of the joinRoom logic is correct)
        const messages = await Message.find({ chatRoom: roomId }).populate('sender', 'name username _id').sort({ createdAt: 'asc' });
        const otherParticipantId = room.participants.find(id => id.toString() !== socket.user.id);
        let otherUser = null;
        if (otherParticipantId) {
            otherUser = await User.findById(otherParticipantId).select('name username _id');
        }
        socket.emit('joinedRoom', { roomId, messages, otherUser, isLocked: room.isLocked }); // Send lock status on join

        if (otherUser) {
            const currentUser = await User.findById(socket.user.id).select('name username _id');
            socket.to(roomId).emit('userJoined', { otherUser: currentUser });
        }

      } catch (error) {
        console.error('[Error joining room]:', error);
        socket.emit('error', { message: 'Server error while joining room.' });
      }
    });

    socket.on('sendMessage', async ({ roomId, content }) => {
      try {
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

    // ADDED: Real-time room lock/unlock handling
    socket.on('toggleLockRoom', async ({ roomId }) => {
      try {
        const room = await ChatRoom.findById(roomId);
        if (!room) {
          return socket.emit('error', { message: 'Chat room not found.' });
        }

        if (room.creator.toString() !== socket.user.id) {
          return socket.emit('error', { message: 'Only the creator can lock or unlock the room.' });
        }

        if (room.participants.length < 2 && !room.isLocked) {
          return socket.emit('error', { message: 'A room can only be locked after a second participant has joined.' });
        }

        room.isLocked = !room.isLocked;
        await room.save();

        // Broadcast the new lock state to everyone in the room
        io.to(roomId).emit('roomStateChanged', { isLocked: room.isLocked });

        console.log(`[Room Lock Toggled] RoomID: ${roomId} -> Locked: ${room.isLocked}`);

      } catch (error) {
        console.error('[Error toggling room lock]:', error);
        socket.emit('error', { message: 'Failed to update room lock state.' });
      }
    });

    socket.on('typing', ({ roomId, isTyping }) => {
        socket.to(roomId).emit('typing', { isTyping });
    });

    socket.on('disconnect', () => {
      console.log(`[Socket Disconnected] UserID: ${socket.user.id}`);
      if (socket.currentRoom) {
        socket.to(socket.currentRoom).emit('userLeft', { userId: socket.user.id });
      }
    });
  });
};

export default initializeSocket;
