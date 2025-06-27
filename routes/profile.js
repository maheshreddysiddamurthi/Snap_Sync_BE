const express = require('express');
const router = express.Router();
const User = require('../models/User');

// POST /api/profile/sync
router.post('/sync', async (req, res) => {
    try {
        // Auth0 user info is in req.auth
        const { sub, email, name } = req.auth;

        // Find or create user in MongoDB 
        let user = await User.findOne({ auth0Id: sub });
        if (!user) {
            user = new User({ auth0Id: sub, email, name });
            await user.save();
        }
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router; 