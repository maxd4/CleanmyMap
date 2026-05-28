Server listener (Node.js) example using pg

Node.js example with native pg client to listen to Postgres NOTIFY:

```js
const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
client.on('notification', (msg) => {
  try {
    const payload = JSON.parse(msg.payload);
    // broadcast to connected websocket clients
    console.log('Realtime gamification event', payload);
  } catch (e) {}
});
await client.query('LISTEN gamification');
```

Client-side snippet to show toast when event arrives (websocket relay example):

```js
// On the client, connect to your websocket endpoint that relays gamification events
const socket = new WebSocket('wss://your-server.example/ws');
socket.addEventListener('message', (ev) => {
  const data = JSON.parse(ev.data);
  if (data.type === 'tier_unlocked' || data.type === 'participant_tier_unlocked') {
    // show toast
    showToast(`${data.title || data.tierId} débloqué !`);
  }
});
```
