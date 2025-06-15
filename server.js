// server.js
require('dotenv').config({ path: '.env.local' });
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { auth } = require('express-oauth2-jwt-bearer');
const profileRoutes = require('./routes/profile');

const app = express();
app.use(cors());
app.use(express.json());

// Auth0 JWT middleware
const jwtCheck = auth({
    audience: process.env.AUTH0_AUDIENCE,
    issuerBaseURL: `https://${process.env.AUTH0_DOMAIN}/`,
    tokenSigningAlg: 'RS256'
});

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB connection error:', err));

// Example protected route
app.get('/api/protected', jwtCheck, (req, res) => {
    res.json({ message: 'You are authenticated!', user: req.auth });
});

// Example public route
app.get('/api/public', (req, res) => {
    res.json({ message: 'This is a public endpoint.' });
});

app.use('/api/profile', jwtCheck, profileRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`)); 