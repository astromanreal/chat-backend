import dotenv from 'dotenv';
dotenv.config({ quiet: true });
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import connectDB from './config/db.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/user.js';

connectDB();
const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

// Root route for health check
app.get('/', (req, res) => {
  res.json({ message: 'API is running...' });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
