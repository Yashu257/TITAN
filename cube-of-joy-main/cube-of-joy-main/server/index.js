import express from 'express';
import cors from 'cors';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Uploads folder: <project-root>/uploads/
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const app = express();
app.set('trust proxy', true); // trust ngrok/reverse-proxy forwarded headers
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Serve uploaded images as static files
app.use('/uploads', express.static(UPLOADS_DIR));

const PORT = process.env.PORT || 3001;

// MySQL connection pool
const pool = mysql.createPool({
  host:     process.env.DB_HOST     || 'localhost',
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME     || 'cube_of_joy',
  port:     parseInt(process.env.DB_PORT || '3306'),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Initialize database
async function initDatabase() {
  try {
    const connection = await pool.getConnection();
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME || 'cube_of_joy'}`);
    await connection.query(`USE ${process.env.DB_NAME || 'cube_of_joy'}`);

    const [cols] = await connection.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = '${process.env.DB_NAME || 'cube_of_joy'}'
        AND TABLE_NAME = 'selfies'
        AND COLUMN_NAME = 'image_data'
    `);
    if (cols.length > 0) {
      await connection.query('DROP TABLE selfies');
      console.log('Migrated: dropped old selfies table (was storing base64 in DB)');
    }

    // Users table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id         VARCHAR(36)  PRIMARY KEY,
        name       VARCHAR(200) NOT NULL,
        email      VARCHAR(200) NOT NULL UNIQUE,
        created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS selfies (
        id         VARCHAR(36)  PRIMARY KEY,
        file_path  VARCHAR(500) NOT NULL COMMENT 'Relative path, e.g. uploads/filename.jpg',
        type       VARCHAR(20)  NOT NULL DEFAULT 'selfie' COMMENT 'selfie | upload',
        user_id    VARCHAR(36)  NULL COMMENT 'FK to users.id',
        created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Migrate: add type column if missing
    const [columns] = await connection.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'selfies' AND COLUMN_NAME = 'type'`
    );
    if (columns.length === 0) {
      await connection.query(`ALTER TABLE selfies ADD COLUMN type VARCHAR(20) NOT NULL DEFAULT 'selfie'`);
      console.log('Migration: added type column');
    }

    // Migrate: add user_id column if missing
    const [userIdCols] = await connection.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'selfies' AND COLUMN_NAME = 'user_id'`
    );
    if (userIdCols.length === 0) {
      await connection.query(`ALTER TABLE selfies ADD COLUMN user_id VARCHAR(36) NULL`);
      console.log('Migration: added user_id column');
    }

    connection.release();
    console.log('MySQL database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    process.exit(1);
  }
}

// ─── USER ENDPOINTS ──────────────────────────────────────────────────────────

// POST /api/users — create or find user by email
app.post('/api/users', async (req, res) => {
  try {
    const { name, email } = req.body;
    if (!name || !email) return res.status(400).json({ error: 'name and email are required' });

    const [existing] = await pool.query('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);
    if (existing.length > 0) {
      return res.json(existing[0]); // returning existing user
    }

    const id = crypto.randomUUID();
    await pool.query('INSERT INTO users (id, name, email) VALUES (?, ?, ?)', [id, name, email.toLowerCase()]);
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// SSE Clients for real-time updates
const clients = new Set();

const broadcastEvent = (event, data) => {
  for (const client of clients) {
    client.write(`event: ${event}\n`);
    client.write(`data: ${JSON.stringify(data)}\n\n`);
  }
};

// SSE Endpoint
app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.write(': connected\n\n');
  clients.add(res);
  req.on('close', () => clients.delete(res));
});

// GET selfies — optional ?type=selfie|upload, ?user_id=xxx, ?latest_per_user=1 filters
app.get('/api/selfies', async (req, res) => {
  try {
    const { type, user_id, latest_per_user } = req.query;
    const baseUrl = `${req.protocol}://${req.get('host')}`;

    if (latest_per_user === '1') {
      // One row per user — the most recent selfie they took
      const [rows] = await pool.query(
        `SELECT s.* FROM selfies s
         INNER JOIN (
           SELECT user_id, MAX(created_at) AS max_created
           FROM selfies WHERE type = 'selfie' AND user_id IS NOT NULL
           GROUP BY user_id
         ) latest ON s.user_id = latest.user_id AND s.created_at = latest.max_created
         ORDER BY s.created_at ASC`
      );
      return res.json(rows.map(row => ({ ...row, image_data: `${baseUrl}/${row.file_path}` })));
    }

    const conditions = [];
    const params = [];
    if (type) { conditions.push('type = ?'); params.push(type); }
    if (user_id) { conditions.push('user_id = ?'); params.push(user_id); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const [rows] = await pool.query(`SELECT * FROM selfies ${where} ORDER BY created_at ASC`, params);
    res.json(rows.map(row => ({ ...row, image_data: `${baseUrl}/${row.file_path}` })));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch selfies' });
  }
});

// GET single selfie by ID
app.get('/api/selfies/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM selfies WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const row = rows[0];
    res.json({ ...row, image_data: `${baseUrl}/${row.file_path}` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch selfie' });
  }
});

// POST — receive base64 image, save to disk, store path in DB
app.post('/api/selfies', async (req, res) => {
  try {
    const { image_data } = req.body;
    if (!image_data) return res.status(400).json({ error: 'image_data is required' });

    const matches = image_data.match(/^data:image\/(jpeg|jpg|png|webp);base64,(.+)$/);
    if (!matches) return res.status(400).json({ error: 'Invalid image format' });

    const ext      = matches[1] === 'jpeg' ? 'jpg' : matches[1];
    const base64   = matches[2];
    const buffer   = Buffer.from(base64, 'base64');

    const filename  = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const filePath  = path.join(UPLOADS_DIR, filename);
    const relPath   = `uploads/${filename}`;

    fs.writeFileSync(filePath, buffer);

    const id = crypto.randomUUID();
    const createdAt = new Date();
    const type = req.body.type === 'upload' ? 'upload' : 'selfie';
    const user_id = req.body.user_id || null;

    await pool.query(
      'INSERT INTO selfies (id, file_path, type, user_id, created_at) VALUES (?, ?, ?, ?, ?)',
      [id, relPath, type, user_id, createdAt]
    );

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const selfie = {
      id,
      file_path:  relPath,
      type,
      user_id,
      image_data: `${baseUrl}/${relPath}`,
      created_at: createdAt
    };

    broadcastEvent('INSERT', selfie);
    res.status(201).json(selfie);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to add selfie' });
  }
});

// DELETE all selfies — remove DB records AND files
app.delete('/api/selfies', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT file_path FROM selfies');
    await pool.query('DELETE FROM selfies');

    for (const row of rows) {
      const filePath = path.join(__dirname, '..', row.file_path);
      fs.unlink(filePath, (err) => {
        if (err) console.warn(`Could not delete file ${filePath}:`, err.message);
      });
    }

    broadcastEvent('DELETE_ALL', {});
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete selfies' });
  }
});

initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Uploads folder: ${UPLOADS_DIR}`);
  });
});
