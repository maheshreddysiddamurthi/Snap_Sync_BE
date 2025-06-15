import dotenv from 'dotenv';
import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import { auth } from 'express-oauth2-jwt-bearer';
import profileRoutes from './routes/profile';
import indexRoutes from './routes/index';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Debug environment variables
console.log('Environment variables loaded:');
console.log('MONGO_URI:', process.env.MONGO_URI);
console.log('AUTH0_DOMAIN:', process.env.AUTH0_DOMAIN);
console.log('AUTH0_AUDIENCE:', process.env.AUTH0_AUDIENCE);

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
if (!process.env.MONGO_URI) {
  console.error('MONGO_URI is not defined in environment variables');
  process.exit(1);
}

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected successfully'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Example protected route
app.get('/api/protected', jwtCheck, (req: Request, res: Response) => {
  res.json({ message: 'You are authenticated!', user: req.auth });
});

// Example public route
app.get('/api/public', (req: Request, res: Response) => {
  res.json({ message: 'This is a public endpoint.' });
});

app.use('/api/v1', indexRoutes);

app.post('/auth/verify-token', jwtCheck, (req: Request & { auth?: any }, res) => {
  console.log('Full auth data:', req.auth);  // This will show all available fields
  const userData = {
    sub: req.auth?.sub,
    email: req.auth?.email,
    name: req.auth?.name,
    picture: req.auth?.picture
  };
  res.json({ 
    message: 'Token verified successfully',
    user: userData
  });
});

app.use('/api/profile', jwtCheck, profileRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`)); 