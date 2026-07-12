import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';

import authRoutes from './routes/auth.js';
import projectRoutes from './routes/projects.js';
import chatRoutes from './routes/chat.js';
import queryRoutes from './routes/query.js';
import tableRoutes from './routes/tables.js';

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL || '*', credentials: true }));
app.use(express.json({ limit: '5mb' }));

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/query', queryRoutes);
app.use('/api/tables', tableRoutes);

// Central error handler so a thrown error never crashes the process
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 5000;

async function start() {
  if (!process.env.APP_MONGO_URI) {
    console.error('APP_MONGO_URI is not set. Copy .env.example to .env and fill it in.');
    process.exit(1);
  }
  await mongoose.connect(process.env.APP_MONGO_URI);
  console.log('Connected to app metadata database');
  app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
