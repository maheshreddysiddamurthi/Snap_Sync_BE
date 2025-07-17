import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  auth0Id: string;
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
  picture?: string;
  emailVerified: boolean;
  lastUpdated: Date;
  createdAt: Date;
  mobileNumber?: string; // Added mobileNumber field
}

const userSchema = new Schema<IUser>({
  auth0Id: { type: String, required: true, unique: true },
  email: { type: String, required: true },
  name: { type: String, required: true },
  firstName: { type: String },
  lastName: { type: String },
  picture: { type: String },
  emailVerified: { type: Boolean, default: false },
  lastUpdated: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  mobileNumber: { type: String } // Added mobileNumber to schema
});

export default mongoose.model<IUser>('User', userSchema); 