'use strict';

const multer = require('multer');
const path   = require('path');
const fs     = require('fs');
const crypto = require('crypto');

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME  = new Set(['image/jpeg', 'image/jpg', 'image/png']);
const UPLOADS_ROOT  = path.join(__dirname, '..', '..', 'uploads');

function buildUploadDir() {
  const now = new Date();
  const year  = now.getFullYear().toString();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day   = String(now.getDate()).padStart(2, '0');
  const dir   = path.join(UPLOADS_ROOT, year, month, day);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function generateFilename(originalname) {
  const ext    = path.extname(originalname).toLowerCase();
  const random = crypto.randomBytes(3).toString('hex');
  return `${Date.now()}-${random}${ext}`;
}

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    try {
      cb(null, buildUploadDir());
    } catch (err) {
      cb(err);
    }
  },
  filename(_req, file, cb) {
    cb(null, generateFilename(file.originalname));
  },
});

function fileFilter(_req, file, cb) {
  if (ALLOWED_MIME.has(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname));
  }
}

const upload = multer({ storage, fileFilter, limits: { fileSize: MAX_FILE_SIZE } });

module.exports = { upload, UPLOADS_ROOT };
