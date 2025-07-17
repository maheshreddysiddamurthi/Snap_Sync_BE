"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const User_1 = __importDefault(require("../models/User"));
const router = express_1.default.Router();
router.get('/sync', (req, res) => {
    res.json({ message: 'Hello, world!' });
});
// POST /api/profile/sync
const syncHandler = async (req, res) => {
    try {
        const authReq = req;
        const { user: userData } = authReq.body; // Extract user data from body
        console.log('Received User Data in Body:', JSON.stringify(userData, null, 2));
        const { sub, email, name, nickname, picture, email_verified, updated_at, firstName, lastName } = userData;
        // Validate required fields from the received user data
        if (!email) {
            console.error('Missing email in received user data:', userData);
            return res.status(400).json({ error: 'Email is required' });
        }
        // Try to find user by auth0Id first
        let user = await User_1.default.findOne({ auth0Id: sub });
        if (!user) {
            // If not found by auth0Id, try to find by email (for existing users from other sources)
            user = await User_1.default.findOne({ email: email });
            if (user) {
                // User found by email but without auth0Id, update it
                console.log('User found by email, updating with Auth0 ID:', user._id);
                user.auth0Id = sub; // Link Auth0 ID to existing user
            }
            else {
                // No user found, create a new one
                console.log('No existing user found, creating new user.');
                user = new User_1.default({
                    auth0Id: sub,
                    email: email,
                    name: name || nickname || email,
                    firstName: firstName || undefined,
                    lastName: lastName || undefined,
                    picture: picture || undefined,
                    emailVerified: email_verified || false,
                    lastUpdated: updated_at ? new Date(updated_at) : new Date()
                });
            }
        }
        // Update existing user or newly created user
        user.email = email;
        user.name = name || nickname || email;
        if (firstName)
            user.firstName = firstName;
        if (lastName)
            user.lastName = lastName;
        if (picture)
            user.picture = picture;
        user.emailVerified = email_verified || false;
        user.lastUpdated = updated_at ? new Date(updated_at) : new Date();
        await user.save();
        res.json({
            message: 'Profile synced successfully',
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                firstName: user.firstName,
                lastName: user.lastName,
                picture: user.picture,
                emailVerified: user.emailVerified,
                lastUpdated: user.lastUpdated,
                mobileNumber: user.mobileNumber
            }
        });
    }
    catch (err) {
        console.error('Profile sync error:', err);
        // Check for specific duplicate key error (E11000) and provide more user-friendly message
        if (err.code === 11000 && err.keyPattern && err.keyPattern.email) {
            return res.status(409).json({ error: 'A user with this email already exists. Please log in with your existing account or use a different email.' });
        }
        res.status(500).json({ error: err instanceof Error ? err.message : 'An error occurred' });
    }
};
router.post('/sync', syncHandler);
router.post('/mobile', async (req, res) => {
    var _a, _b;
    try {
        const authReq = req;
        const mobileNumber = req.body.mobileNumber;
        const auth0Id = (_b = (_a = authReq.auth) === null || _a === void 0 ? void 0 : _a.payload) === null || _b === void 0 ? void 0 : _b.sub;
        if (!auth0Id || !mobileNumber) {
            return res.status(400).json({ error: 'auth0Id (from token) and mobileNumber are required' });
        }
        if (!/^\d{10}$/.test(mobileNumber)) {
            return res.status(400).json({ error: 'Invalid mobile number. Must be 10 digits.' });
        }
        const user = await User_1.default.findOneAndUpdate({ auth0Id }, { mobileNumber }, { new: true });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({
            message: 'Mobile number updated successfully',
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                mobileNumber: user.mobileNumber
            }
        });
    }
    catch (err) {
        res.status(500).json({ error: err instanceof Error ? err.message : 'An error occurred' });
    }
});
exports.default = router;
