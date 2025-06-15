import express, { Request, Response, Router, RequestHandler } from 'express';
import User, { IUser } from '../models/User';
import { AuthResult } from 'express-oauth2-jwt-bearer';

const router: Router = express.Router();

interface Auth0Payload {
  sub: string;
  email: string;
  name?: string;
}

interface AuthRequest extends Request {
  auth: AuthResult & { payload: Auth0Payload };
}

router.get('/sync', (req, res) => {
  res.json({ message: 'Hello, world!' });
});
// POST /api/profile/sync
const syncHandler: RequestHandler = async (req, res) => {
  try {
    const authReq = req as AuthRequest;
    const { sub, email, name } = authReq.auth.payload;

    // Find or create user in MongoDB
    let user = await User.findOne({ auth0Id: sub });
    if (!user) {
      user = new User({ auth0Id: sub, email, name });
      await user.save();
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'An error occurred' });
  }
};

router.post('/sync', syncHandler);


export default router; 