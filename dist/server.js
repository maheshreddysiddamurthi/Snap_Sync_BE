"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const express_1 = __importDefault(require("express"));
const mongoose_1 = __importDefault(require("mongoose"));
const cors_1 = __importDefault(require("cors"));
const express_oauth2_jwt_bearer_1 = require("express-oauth2-jwt-bearer");
const profile_1 = __importDefault(require("./routes/profile"));
const index_1 = __importDefault(require("./routes/index"));
// Load environment variables
dotenv_1.default.config({ path: '.env.local' });
// Debug environment variables
console.log('Environment variables loaded:');
console.log('MONGO_URI:', process.env.MONGO_URI);
console.log('AUTH0_DOMAIN:', process.env.AUTH0_DOMAIN);
console.log('AUTH0_AUDIENCE:', process.env.AUTH0_AUDIENCE);
const app = (0, express_1.default)();
// Configure CORS
app.use((0, cors_1.default)({
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));
app.use(express_1.default.json());
// Auth0 JWT middleware
const jwtCheck = (0, express_oauth2_jwt_bearer_1.auth)({
    audience: process.env.AUTH0_AUDIENCE,
    issuerBaseURL: `https://${process.env.AUTH0_DOMAIN}/`,
    tokenSigningAlg: 'RS256'
});
// Debug middleware to log requests
app.use((req, res, next) => {
    console.log('Incoming request:', {
        method: req.method,
        path: req.path,
        headers: req.headers,
        body: req.body
    });
    next();
});
// Connect to MongoDB
if (!process.env.MONGO_URI) {
    console.error('MONGO_URI is not defined in environment variables');
    process.exit(1);
}
mongoose_1.default.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB connected successfully'))
    .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
});
// Example protected route
app.get('/api/protected', jwtCheck, (req, res) => {
    console.log('Protected route accessed:', req.auth);
    res.json({ message: 'You are authenticated!', user: req.auth });
});
// Example public route
app.get('/api/public', (req, res) => {
    res.json({ message: 'This is a public endpoint.' });
});
app.use('/api/v1', index_1.default);
app.post('/auth/verify-token', jwtCheck, (req, res) => {
    var _a, _b, _c, _d;
    console.log('Token verification request:', {
        auth: req.auth,
        headers: req.headers
    });
    const userData = {
        sub: (_a = req.auth) === null || _a === void 0 ? void 0 : _a.sub,
        email: (_b = req.auth) === null || _b === void 0 ? void 0 : _b.email,
        name: (_c = req.auth) === null || _c === void 0 ? void 0 : _c.name,
        picture: (_d = req.auth) === null || _d === void 0 ? void 0 : _d.picture
    };
    res.json({
        message: 'Token verified successfully',
        user: userData
    });
});
app.use('/api/profile', jwtCheck, profile_1.default);
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
