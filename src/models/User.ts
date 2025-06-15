import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  auth0Id: string;
  email: string;
  name?: string;
  createdAt: Date;
}

const userSchema = new Schema<IUser>({
  auth0Id: { type: String, required: true, unique: true },
  email: { type: String, required: true },
  name: String,
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model<IUser>('User', userSchema); 