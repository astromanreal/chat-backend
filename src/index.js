import dotenv from 'dotenv';
dotenv.config({ quiet: true });
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import helmet from 'helmet';
import cors from 'cors';
import cron from 'node-cron';
import connectDB from './config/db.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/user.js';
import chatRoutes from './routes/chatRoutes.js';
import errorHandler from './middleware/errorHandler.js';
import initializeSocket from './socket/socketHandler.js';
import cleanupExpiredChatRooms from './jobs/cleanupExpiredChatRooms.js';

connectDB();
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // Be more specific in production!
    methods: ['GET', 'POST'],
  },
});

app.use(helmet());
app.use(cors());
app.use(express.json());

// Schedule the cleanup job to run every hour
cron.schedule('0 * * * *', () => {
  console.log('Triggering hourly cleanup of expired chat rooms.');
  cleanupExpiredChatRooms();
});

app.get('/', (req, res) => {
  res.json({ message: 'API is running...' });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/chat', chatRoutes);

app.use(errorHandler);
initializeSocket(io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server started on port ${PORT}`));
