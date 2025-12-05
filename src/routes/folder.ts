import express, { Request, Response } from 'express';
import Folder from '../models/Folder';
import { s3Client, S3_BUCKET_NAME } from '../config/s3';
import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

// Helper function to resolve the full path of a folder
async function resolveFolderPath(folderId: string, userId: string): Promise<string> {
  const pathParts: string[] = [];
  let currentFolderId: string | null = folderId;

  // Traverse up the folder hierarchy to build the full path
  while (currentFolderId) {
    const folder = await Folder.findOne({ _id: currentFolderId, userId });
    if (!folder) {
      throw new Error('Folder not found');
    }

    pathParts.unshift(folder.name); // Add to beginning of array
    currentFolderId = folder.parentFolderId || null;
  }

  return pathParts.join('/');
}

const router = express.Router();

// POST /api/create-folder
router.post('/create-folder', async (req: Request & { auth?: any }, res: Response) => {
  try {
    const { name, parentFolderId } = req.body;
    const userId = req.auth?.sub;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Folder name is required' });
    }

    // Check if folder with same name already exists in the same parent folder
    const existingFolder = await Folder.findOne({
      userId,
      name: name.trim(),
      parentFolderId: parentFolderId || null
    });

    if (existingFolder) {
      return res.status(409).json({ error: 'Folder with this name already exists in the current location' });
    }

    // Create new folder in DB
    const folder = new Folder({
      name: name.trim(),
      userId,
      parentFolderId: parentFolderId || null
    });

    await folder.save();

    // Create S3 "folder" prefix as a zero-byte object with trailing slash
    if (!S3_BUCKET_NAME) {
      return res.status(500).json({ error: 'S3_BUCKET_NAME is not configured on server' });
    }

    // Build S3 key path: userId/parentPath/folderName/
    const prefixParts = [userId];

    // If parentFolderId exists, resolve the full parent path
    if (parentFolderId) {
      try {
        const parentPath = await resolveFolderPath(parentFolderId, userId);
        if (parentPath) {
          prefixParts.push(parentPath);
        }
      } catch (pathError) {
        // Rollback DB folder if path resolution fails
        await Folder.deleteOne({ _id: folder._id, userId });
        console.error('Error resolving parent folder path:', pathError);
        return res.status(400).json({ error: 'Invalid parent folder' });
      }
    }

    prefixParts.push(name.trim());
    const key = `${prefixParts.join('/')}/`;

    try {
      await s3Client.send(new PutObjectCommand({
        Bucket: S3_BUCKET_NAME,
        Key: key,
        Body: '',
      }));
    } catch (s3Error) {
      // Rollback DB folder if S3 creation fails
      await Folder.deleteOne({ _id: folder._id, userId });
      console.error('Error creating S3 folder prefix:', s3Error);
      return res.status(502).json({ error: 'Failed to create folder in storage' });
    }

    res.status(201).json({
      message: 'Folder created successfully',
      folder: {
        id: folder._id,
        name: folder.name,
        userId: folder.userId,
        parentFolderId: folder.parentFolderId,
        createdAt: folder.createdAt,
        updatedAt: folder.updatedAt
      }
    });

  } catch (error) {
    console.error('Error creating folder:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/folders - Get all folders for a user
router.get('/folders', async (req: Request & { auth?: any }, res: Response) => {
  try {
    const userId = req.auth?.sub;
    const { parentFolderId } = req.query;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const query: any = { userId };
    if (parentFolderId) {
      query.parentFolderId = parentFolderId;
    } else {
      query.parentFolderId = null; // Root level folders
    }

    const folders = await Folder.find(query).sort({ createdAt: -1 });

    res.json({
      folders: folders.map(folder => ({
        id: folder._id,
        name: folder.name,
        userId: folder.userId,
        parentFolderId: folder.parentFolderId,
        createdAt: folder.createdAt,
        updatedAt: folder.updatedAt
      }))
    });

  } catch (error) {
    console.error('Error fetching folders:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/folder/:id - Delete a folder
router.delete('/folder/:id', async (req: Request & { auth?: any }, res: Response) => {
  try {
    const userId = req.auth?.sub;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const folder = await Folder.findOne({ _id: id, userId });
    if (!folder) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    // Check if folder has subfolders
    const subfolders = await Folder.find({ parentFolderId: id, userId });
    if (subfolders.length > 0) {
      return res.status(400).json({ error: 'Cannot delete folder that contains subfolders' });
    }

    // Build S3 key path for deletion
    let s3Key: string | null = null;
    if (S3_BUCKET_NAME) {
      try {
        const prefixParts = [userId];

        // If folder has a parent, resolve the parent path
        if (folder.parentFolderId) {
          const parentPath = await resolveFolderPath(folder.parentFolderId, userId);
          if (parentPath) {
            prefixParts.push(parentPath);
          }
        }

        prefixParts.push(folder.name);
        s3Key = `${prefixParts.join('/')}/`;
      } catch (pathError) {
        console.error('Error resolving folder path for deletion:', pathError);
        // Continue with DB deletion even if S3 path resolution fails
      }
    }

    // Delete from database
    await Folder.deleteOne({ _id: id, userId });

    // Delete S3 prefix if it exists
    if (s3Key && S3_BUCKET_NAME) {
      try {
        await s3Client.send(new DeleteObjectCommand({
          Bucket: S3_BUCKET_NAME,
          Key: s3Key,
        }));
      } catch (s3Error) {
        console.error('Error deleting S3 folder prefix:', s3Error);
        // Don't fail the request if S3 deletion fails
      }
    }

    res.json({ message: 'Folder deleted successfully' });

  } catch (error) {
    console.error('Error deleting folder:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

