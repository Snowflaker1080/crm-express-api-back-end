const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const morgan = require('morgan')
const cors = require('cors');
const mongoose = require('mongoose');

// Routers - express
const authRouter = require('./controllers/auth');
const testJwtRouter = require('./controllers/test-jwt');
const usersRouter = require('./controllers/users');

const app = express();

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || true, // set FE URL in prod, e.g. 'http://localhost:5173'
  credentials: true,
}));
app.use(express.json());
app.use(morgan('dev'));

// API routes
app.use('/api/auth', authRouter);
app.use('/api/test', testJwtRouter);
app.use('/api/users', usersRouter);


// 404 handler
app.use((req, res) => res.status(404).json({ error: 'Not Found' }));

// Central error handler (last)
app.use((err, req, res, next) => {
  console.error(err); // avoid noisy stacks in prod if you prefer
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Server error' });
});

// --- Connect to MongoDB + Boot ---
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('Missing MONGODB_URI in environment');
  process.exit(1);
}

(async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log(`Connected to MongoDB ${mongoose.connection.name}.`);

    app.listen(PORT, () => {
      console.log(`Express API listening on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to connect to MongoDB:', err.message);
    process.exit(1);
  }
})();

// Connection event logs
mongoose.connection.on('error', (e) => {
  console.error('MongoDB connection error:', e);
});
mongoose.connection.on('disconnected', () => {
  console.warn('MongoDB disconnected');
});