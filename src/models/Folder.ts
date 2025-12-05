import mongoose, { Document, Schema } from 'mongoose';

export interface IFolder extends Document {
  name: string;
  userId: string;
  parentFolderId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const folderSchema = new Schema<IFolder>({
  name: {
    type: String,
    required: true,
    trim: true
  },
  userId: {
    type: String,
    required: true,
    index: true
  },
  parentFolderId: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// Index for efficient queries
folderSchema.index({ userId: 1, parentFolderId: 1 });
folderSchema.index({ userId: 1, name: 1 });

export default mongoose.model<IFolder>('Folder', folderSchema);

