'use strict';

require('dotenv').config();

const express = require('express');
const path    = require('path');
const { testConnection } = require('./config/db');
const imageRoutes        = require('./routes/imageRoutes');
const { UPLOADS_ROOT }   = require('./middleware/upload');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded images as static files
// e.g. GET /uploads/2026/07/30/1753865489123-a8f3d9.jpg
app.use('/uploads', express.static(UPLOADS_ROOT));

app.use('/api/images', imageRoutes);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// Global error handler — returns JSON instead of HTML for all unhandled errors
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('❌  Unhandled error:', err);
  res.status(500).json({ success: false, message: 'Internal server error.' });
});

(async () => {
  try {
    await testConnection();
    app.listen(PORT, () => {
      console.log(`🚀  Server running on http://localhost:${PORT}`);
      console.log(`📁  Uploads served at  http://localhost:${PORT}/uploads`);
    });
  } catch (err) {
    console.error('❌  Failed to start server:', err.message);
    process.exit(1);
  }
})();
