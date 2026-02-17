const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');
const errorHandler = require('./utils/errorHandler');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();

// Middleware
app.use(express.json());
app.use(cors({
    origin: "http://localhost:5173",
    credentials: true
}));
app.use('/uploads', express.static('uploads'));

// Routes
console.log('Mounting routes...');
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/contact', require('./routes/contact.routes'));
console.log('Routes mounted');
app.use('/api/meeting', require('./routes/meeting.routes'));
app.use('/api/action', require('./routes/action.routes'));

// Base route
app.get('/', (req, res) => {
    res.send({ success: true, message: 'AI Sales Workspace API is running' });
});

// Error Handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
