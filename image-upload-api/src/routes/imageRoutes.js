'use strict';

const express = require('express');
const multer  = require('multer');
const { upload } = require('../middleware/upload');
const { uploadImage, listImages, getImage, deleteImage } = require('../controllers/imageController');

const router = express.Router();

const asyncHandler = (fn) => (req, res, next) => fn(req, res, next).catch(next);

router.post('/upload', (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (!err) return next();

    if (err instanceof multer.MulterError) {
      const messages = {
        LIMIT_FILE_SIZE:       'File is too large. Maximum allowed size is 5 MB.',
        LIMIT_UNEXPECTED_FILE: 'Invalid file type. Only JPG, JPEG, and PNG are accepted.',
      };
      return res.status(400).json({
        success: false,
        message: messages[err.code] || `Upload error: ${err.message}`,
      });
    }

    return res.status(500).json({ success: false, message: 'An unexpected error occurred during upload.' });
  });
}, asyncHandler(uploadImage));

router.get('/',       asyncHandler(listImages));
router.get('/:id',    asyncHandler(getImage));
router.delete('/:id', asyncHandler(deleteImage));

module.exports = router;
