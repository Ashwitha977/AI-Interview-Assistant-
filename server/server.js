import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';

import authRoutes from './routes/authRoutes.js';
import interviewRoutes from './routes/interviewRoutes.js';
import questionRoutes from './routes/questionRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import noteRoutes from './routes/noteRoutes.js';

dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'],
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check API
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'PrepWise AI Server is running smoothly',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/interviews', interviewRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/notes', noteRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[ServerError]', err.stack || err.message);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

// 404 Handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API route ${req.originalUrl} not found`,
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 PrepWise AI Server listening on port ${PORT}`);
});
