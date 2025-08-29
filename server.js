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
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// API routes
app.use('/api/auth', authRouter);
app.use('/api/test', testJwtRouter);
app.use('/api/users', usersRouter);


// 404 handler
app.use((req, res) => res.status(404).json({ error: 'Not Found' }));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI);
mongoose.connection.on('connected', () => {
  console.log(`Connected to MongoDB ${mongoose.connection.name}.`);
});

// Boot server and listen on port 3000
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Express API listening on port ${PORT}`);
});
