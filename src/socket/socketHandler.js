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

    // --- Existing Chat and Room Logic ---
    socket.on('joinRoom', async ({ roomId }) => {
      try {
        const room = await ChatRoom.findById(roomId).lean();
        if (!room || !room.participants.find(p => p.toString() === userId)) {
          return socket.emit('error', { message: 'Not authorized to join this room.' });
        }

        socket.join(roomId);
        socket.currentRoom = roomId;
        console.log(`[Room Joined] UserID: ${userId} -> RoomID: ${roomId}`);
        
        // Also pass the current voice call state when a user joins
        socket.emit('joinedRoom', { 
          roomId, 
          // ... other data
          isLocked: room.isLocked,
          voiceCall: room.voiceCall 
        });

      } catch (error) {
        console.error('[Error joining room]:', error);
        socket.emit('error', { message: 'Server error while joining room.' });
      }
    });
    
    socket.on('sendMessage', async ({ roomId, content }) => {
      // ... existing implementation ...
    });

    socket.on('toggleLockRoom', async ({ roomId }) => {
      // ... existing implementation ...
    });
    
    // --- ADDED: Voice Call Signaling Logic ---

    // Host initiates the call
    socket.on('start-call', async ({ roomId }) => {
        try {
            const room = await ChatRoom.findById(roomId);
            if (!room || room.creator.toString() !== userId) return;
            // The API sets the state, the socket triggers the event
            io.to(roomId).emit('call-started', { voiceCall: room.voiceCall });
            console.log(`[Call Started] RoomID: ${roomId} by Host: ${userId}`);
        } catch (error) {
            console.error('Error starting call:', error);
        }
    });

    // Host ends the call
    socket.on('end-call', async ({ roomId }) => {
        try {
            const room = await ChatRoom.findById(roomId);
            if (!room || room.voiceCall.host.toString() !== userId) return;
            // The API resets the state, the socket triggers the event
            io.to(roomId).emit('call-ended');
            console.log(`[Call Ended] RoomID: ${roomId} by Host: ${userId}`);
        } catch (error) {
            console.error('Error ending call:', error);
        }
    });
    
    // --- WebRTC Signaling Relay ---
    socket.on('webrtc-offer', ({ targetUserId, sdp }) => {
        io.to(targetUserId).emit('webrtc-offer', { senderUserId: userId, sdp });
    });

    socket.on('webrtc-answer', ({ targetUserId, sdp }) => {
        io.to(targetUserId).emit('webrtc-answer', { senderUserId: userId, sdp });
    });

    socket.on('webrtc-ice-candidate', ({ targetUserId, candidate }) => {
        io.to(targetUserId).emit('webrtc-ice-candidate', { senderUserId: userId, candidate });
    });

    // --- Host Controls ---
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
    
    // --- Participant Self-Actions ---
    socket.on('update-mute-status', async ({ roomId, isMuted }) => {
        try {
            const room = await ChatRoom.findById(roomId);
            if (!room || !room.voiceCall.isActive) return;

            const participant = room.voiceCall.participants.find(p => p.user.toString() === userId);
            if (participant) {
                participant.isMuted = isMuted;
                await room.save();
                // Broadcast change to everyone except the sender
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
        // Notify room that a user has left (useful for cleaning up call UI)
        io.to(socket.currentRoom).emit('user-left-room', { userId });
      }
    });
  });
};

export default initializeSocket;
