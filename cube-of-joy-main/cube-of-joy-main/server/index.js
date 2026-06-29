import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// In-memory storage for selfies
const selfies = [];

// SSE Clients for real-time updates
const clients = new Set();

const broadcastEvent = (event, data) => {
  for (const client of clients) {
    client.write(`event: ${event}\n`);
    client.write(`data: ${JSON.stringify(data)}\n\n`);
  }
};

console.log('Using in-memory storage for selfies.');

// SSE Endpoint
app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Tell client we are connected
  res.write(': connected\n\n');

  clients.add(res);

  req.on('close', () => {
    clients.delete(res);
  });
});

// Get all selfies
app.get('/api/selfies', async (req, res) => {
  try {
    res.json(selfies);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch selfies' });
  }
});

// Add a selfie
app.post('/api/selfies', async (req, res) => {
  try {
    const { image_data } = req.body;
    if (!image_data) return res.status(400).json({ error: 'image_data is required' });

    const selfie = {
      id: crypto.randomUUID(),
      image_data,
      created_at: new Date().toISOString()
    };
    
    selfies.push(selfie);

    // Broadcast the INSERT event
    broadcastEvent('INSERT', selfie);

    res.status(201).json(selfie);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to add selfie' });
  }
});

// Delete all selfies
app.delete('/api/selfies', async (req, res) => {
  try {
    selfies.length = 0; // Clear array
    
    // Broadcast the DELETE event
    broadcastEvent('DELETE_ALL', {});

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete selfies' });
  }
});

const PORT = 3001;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
