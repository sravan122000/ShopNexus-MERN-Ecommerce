
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { fileTypeFromFile } from 'file-type';

const dir = path.resolve('uploads');
fs.mkdirSync(dir, { recursive: true });

const allowedTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif'
]);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, dir),
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`);
  }
});

export const uploadProducts = multer({
  storage,
  limits: {
    files: 3,
    fileSize: 5 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    if (!allowedTypes.has(file.mimetype)) {
      return cb(new Error('Only JPEG, PNG, WebP and GIF images are allowed'));
    }
    cb(null, true);
  }
}).array('images', 3);

export async function verifyProductImages(req, res, next) {
  try {
    for (const file of req.files || []) {
      const detected = await fileTypeFromFile(file.path);

      if (!detected || !allowedTypes.has(detected.mime)) {
        for (const uploaded of req.files || []) {
          fs.unlink(uploaded.path, () => {});
        }

        return res.status(400).json({
          message: 'Invalid image content. Upload a genuine JPEG, PNG, WebP or GIF image.'
        });
      }

      const expectedExtension = {
        'image/jpeg': '.jpg',
        'image/png': '.png',
        'image/webp': '.webp',
        'image/gif': '.gif'
      }[detected.mime];

      if (path.extname(file.filename).toLowerCase() !== expectedExtension) {
        for (const uploaded of req.files || []) {
          fs.unlink(uploaded.path, () => {});
        }

        return res.status(400).json({
          message: 'Image file extension does not match its actual format.'
        });
      }
    }

    next();
  } catch (error) {
    for (const uploaded of req.files || []) {
      fs.unlink(uploaded.path, () => {});
    }
    next(error);
  }
}

export function cleanupFailedUploads(req, res, next) {
  res.once('finish', () => {
    if (res.statusCode >= 400) {
      for (const file of req.files || []) {
        fs.unlink(file.path, () => {});
      }
    }
  });

  next();
}
