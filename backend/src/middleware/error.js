import multer from 'multer';
export default function errorHandler(err, req, res, next) {
  console.error(err);

  if (res.headersSent) {
    return next(err);
  }

  let status = 500;
  let message = 'Internal server error';

  if (err instanceof multer.MulterError) {
    status = 400;

    if (err.code === 'LIMIT_FILE_SIZE') {
      message = 'Each image must be 5 MB or smaller';
    } else if (
      err.code === 'LIMIT_FILE_COUNT' ||
      err.code === 'LIMIT_UNEXPECTED_FILE'
    ) {
      message = 'Upload a maximum of 3 images';
    } else {
      message = 'Image upload failed';
    }
  } else if (err.status && err.status >= 400 && err.status < 500) {
    status = err.status;
    message = err.message;
  } else if (err.name === 'ValidationError') {
    status = 400;
    message = 'Invalid data provided';
  } else if (err.code === 11000) {
    status = 409;
    message = 'A record with this value already exists';
  }

  res.status(status).json({ message });
}
