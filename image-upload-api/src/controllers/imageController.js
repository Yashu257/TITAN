'use strict';

const path = require('path');
const fs   = require('fs');
const { pool } = require('../config/db');

async function uploadImage(req, res) {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'No file provided. Send the image in the "image" form-data field.',
    });
  }

  const { filename, path: absolutePath, size, mimetype } = req.file;

  const relativePath = path.relative(
    path.join(__dirname, '..', '..'),
    absolutePath
  ).replace(/\\/g, '/');

  try {
    const [result] = await pool.execute(
      `INSERT INTO images (image_path, image_name, image_size, image_type) VALUES (?, ?, ?, ?)`,
      [relativePath, filename, size, mimetype]
    );

    const [[record]] = await pool.execute(
      'SELECT * FROM images WHERE id = ?',
      [result.insertId]
    );

    return res.status(201).json({ success: true, message: 'Image uploaded successfully.', data: record });
  } catch (err) {
    fs.unlink(absolutePath, () => {});
    throw err;
  }
}

async function listImages(req, res) {
  const limit  = Math.min(parseInt(req.query.limit)  || 20, 100);
  const offset = Math.max(parseInt(req.query.offset) || 0,  0);

  const [[{ total }]] = await pool.execute('SELECT COUNT(*) AS total FROM images');
  const [rows] = await pool.execute(
    'SELECT * FROM images ORDER BY created_at DESC LIMIT ? OFFSET ?',
    [limit, offset]
  );

  return res.json({ success: true, data: rows, meta: { total, limit, offset } });
}

async function getImage(req, res) {
  const id = parseInt(req.params.id);
  if (!id || id < 1) {
    return res.status(400).json({ success: false, message: 'Invalid image ID.' });
  }

  const [[record]] = await pool.execute('SELECT * FROM images WHERE id = ?', [id]);
  if (!record) {
    return res.status(404).json({ success: false, message: 'Image not found.' });
  }

  return res.json({ success: true, data: record });
}

async function deleteImage(req, res) {
  const id = parseInt(req.params.id);
  if (!id || id < 1) {
    return res.status(400).json({ success: false, message: 'Invalid image ID.' });
  }

  const [[record]] = await pool.execute('SELECT * FROM images WHERE id = ?', [id]);
  if (!record) {
    return res.status(404).json({ success: false, message: 'Image not found.' });
  }

  await pool.execute('DELETE FROM images WHERE id = ?', [id]);

  const absolutePath = path.join(__dirname, '..', '..', record.image_path);
  fs.unlink(absolutePath, (err) => {
    if (err) console.warn(`⚠️  Could not delete file ${absolutePath}:`, err.message);
  });

  return res.json({ success: true, message: 'Image deleted successfully.' });
}

module.exports = { uploadImage, listImages, getImage, deleteImage };
