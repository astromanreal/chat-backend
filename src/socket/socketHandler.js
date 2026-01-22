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
    const { id: userId } = socket.user;
    console.log(`[Socket Connected] UserID: ${userId}`);

    // --- Chat and Room Logic ---
    socket.on('joinRoom', async ({ roomId }) => {
      try {
        if (!mongoose.Types.ObjectId.isValid(roomId)) {
          return socket.emit('error', { message: 'Invalid room ID format.' });
        }

        const room = await ChatRoom.findById(roomId);
        if (!room || !room.participants.includes(userId)) {
          return socket.emit('error', { message: 'Not authorized to join this room.' });
        }

        socket.join(roomId);
        socket.currentRoom = roomId;
        console.log(`[Room Joined] UserID: ${userId} -> RoomID: ${roomId}`);

        const messages = await Message.find({ chatRoom: roomId })
          .populate('sender', 'name username _id')
          .sort({ createdAt: 'asc' });

        const otherParticipantId = room.participants.find(id => id.toString() !== userId);
        
        let otherUser = null;
        if (otherParticipantId) {
            otherUser = await User.findById(otherParticipantId).select('name username _id');
        }

        socket.emit('joinedRoom', { 
            roomId, 
            messages, 
            otherUser, 
            isLocked: room.isLocked,
            voiceCall: room.voiceCall // Pass voice call state on join
        });

        if (otherUser) {
            const currentUser = await User.findById(userId).select('name username _id');
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
        if (!room || !room.participants.includes(userId)) {
          return socket.emit('error', { message: 'You are not a member of this room.' });
        }

        const message = new Message({ chatRoom: roomId, sender: userId, content });
        await message.save();
        await message.populate('sender', 'name username _id');

        io.to(roomId).emit('receiveMessage', message);
      } catch (error) {
        console.error('[Error sending message]:', error);
        socket.emit('error', { message: 'Failed to send message.' });
      }
    });

    socket.on('toggleLockRoom', async ({ roomId }) => {
      try {
        const room = await ChatRoom.findById(roomId);
        if (!room) {
          return socket.emit('error', { message: 'Chat room not found.' });
        }

        if (room.creator.toString() !== userId) {
          return socket.emit('error', { message: 'Only the creator can lock or unlock the room.' });
        }

        if (room.participants.length < 2 && !room.isLocked) {
          return socket.emit('error', { message: 'A room can only be locked after a second participant has joined.' });
        }

        room.isLocked = !room.isLocked;
        await room.save();

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

    // --- Voice Call Signaling Logic ---

    socket.on('start-call', async ({ roomId }) => {
        try {
            const room = await ChatRoom.findById(roomId);
            if (!room || room.creator.toString() !== userId) return;
            io.to(roomId).emit('call-started', { voiceCall: room.voiceCall });
            console.log(`[Call Started] RoomID: ${roomId} by Host: ${userId}`);
        } catch (error) {
            console.error('Error starting call:', error);
        }
    });

    socket.on('end-call', async ({ roomId }) => {
        try {
            const room = await ChatRoom.findById(roomId);
            if (!room || room.voiceCall.host.toString() !== userId) return;
            io.to(roomId).emit('call-ended');
            console.log(`[Call Ended] RoomID: ${roomId} by Host: ${userId}`);
        } catch (error) {
            console.error('Error ending call:', error);
        }
    });
    
    socket.on('webrtc-offer', ({ targetUserId, sdp }) => {
        io.to(targetUserId).emit('webrtc-offer', { senderUserId: userId, sdp });
    });

    socket.on('webrtc-answer', ({ targetUserId, sdp }) => {
        io.to(targetUserId).emit('webrtc-answer', { senderUserId: userId, sdp });
    });

    socket.on('webrtc-ice-candidate', ({ targetUserId, candidate }) => {
        io.to(targetUserId).emit('webrtc-ice-candidate', { senderUserId: userId, candidate });
    });

    socket.on('update-mic-access', async ({ roomId, targetUserId, hasMicAccess }) => {
        try {
            const room = await ChatRoom.findById(roomId);
            if (!room || room.voiceCall.host.toString() !== userId) return;

            const participant = room.voiceCall.participants.find(p => p.user.toString() === targetUserId);
            if (participant) {
                participant.micAccess = hasMicAccess;
                await room.save();
                io.to(roomId).emit('mic-access-changed', { userId: targetUserId, hasMicAccess });
            }
        } catch (error) {
            console.error('Error updating mic access:', error);
        }
    });
    
    socket.on('update-mute-status', async ({ roomId, isMuted }) => {
        try {
            const room = await ChatRoom.findById(roomId);
            if (!room || !room.voiceCall.isActive) return;

            const participant = room.voiceCall.participants.find(p => p.user.toString() === userId);
            if (participant) {
                participant.isMuted = isMuted;
                await room.save();
                socket.to(roomId).emit('mute-status-changed', { userId, isMuted });
            }
        } catch (error) {
            console.error('Error updating mute status:', error);
        }
    });

    // --- Disconnect Handling ---
    socket.on('disconnect', () => {
      console.log(`[Socket Disconnected] UserID: ${userId}`);
      if (socket.currentRoom) {
        socket.to(socket.currentRoom).emit('userLeft', { userId }); // Restored original event
      }
    });
  });
};

export default initializeSocket;
