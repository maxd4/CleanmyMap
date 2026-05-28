/* Lightweight WebSocket relay that LISTENs Postgres NOTIFY on 'gamification' channel and broadcasts to connected clients.

Usage: node tools/gamification-ws-server.js
Requires env: DATABASE_URL, PORT (optional, default 8080)
*/
const { Client } = require('pg');
const WebSocket = require('ws');

const PORT = process.env.PORT || 8080;
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('Set DATABASE_URL env var to your Postgres connection string');
  process.exit(1);
}

const pg = new Client({ connectionString: DATABASE_URL });
const wss = new WebSocket.Server({ port: PORT });

wss.on('connection', (ws) => {
  console.log('Client connected');
  ws.send(JSON.stringify({ type: 'welcome', ts: Date.now() }));
  ws.on('close', () => console.log('Client disconnected'));
});

pg.connect().then(() => {
  console.log('Connected to Postgres, listening to gamification channel');
  pg.on('notification', (msg) => {
    try {
      const payload = JSON.parse(msg.payload);
      const text = JSON.stringify(payload);
      // broadcast to all websocket clients
      for (const client of wss.clients) {
        if (client.readyState === WebSocket.OPEN) client.send(text);
      }
    } catch (e) {
      console.error('Failed to parse notification payload', e);
    }
  });
  pg.query('LISTEN gamification');
}).catch((err) => {
  console.error('Failed to connect to Postgres', err);
  process.exit(1);
});

console.log(`WebSocket relay running on ws://0.0.0.0:${PORT}`);
