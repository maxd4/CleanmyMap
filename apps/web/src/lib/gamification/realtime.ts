// Client-side helper to connect to gamification websocket relay and expose events
export function connectGamificationWS(url: string, onMessage: (data: unknown) => void) {
  const ws = new WebSocket(url);
  ws.addEventListener('open', () => console.info('Gamification WS connected'));
  ws.addEventListener('message', (ev) => {
    try {
      const data = JSON.parse(ev.data);
      onMessage(data);
    } catch (e) {
      console.error('Invalid gamification message', e);
    }
  });
  ws.addEventListener('close', () => console.info('Gamification WS closed'));
  return ws;
}
