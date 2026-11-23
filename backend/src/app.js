import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { connectDB } from './config/db.js';

import authRoutes from './routes/auth.js';
import usersRoutes from './routes/users.js';
import requestRoutes from './routes/requests.js';
import reviewRoutes from './routes/reviews.js';

const app = express();
app.set('trust proxy', 1); // Vercel sits behind a proxy

const vercelOrigins = [
  process.env.VERCEL_URL,
  process.env.VERCEL_PROJECT_PRODUCTION_URL,
  process.env.VERCEL_BRANCH_URL
]
  .filter(Boolean)
  .map(domain => `https://${domain}`);

const allowedOrigins = [
  ...(process.env.CLIENT_URL || 'http://localhost:5173')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean),
  ...vercelOrigins
];

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Origin not allowed by CORS'));
  }
}));

app.use(express.json({ limit: '20kb' }));

app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 250,
  standardHeaders: true,
  legacyHeaders: false
}));

app.use('/api', async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    next(error);
  }
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Neighbourhood Skill Exchange API'
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/reviews', reviewRoutes);

app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ message: 'API route not found.' });
  }
  next();
});

app.use((err, req, res, next) => {
  console.error(err);
  if (res.headersSent) return next(err);
  res.status(500).json({
    message: 'Unexpected server error.'
  });
});

export default app;