import { useEffect, useRef, useState } from 'react';

export const useWebSocket = (onMessageReceived) => {
  const [connected, setConnected] = useState(false);
  const wsRef = useRef(null);

  useEffect(() => {
    // Construct ws url based on current hostname
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname === 'localhost' ? 'localhost:8000' : window.location.host;
    const wsUrl = `${protocol}//${host}/ws`;

    console.log(`Connecting to WebSocket: ${wsUrl}`);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connected');
      setConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (onMessageReceived) {
          onMessageReceived(data);
        }
      } catch (err) {
        console.error('Error parsing WebSocket message:', err);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected, reconnecting in 5s...');
      setConnected(false);
      // Reconnect logic
      setTimeout(() => {
        if (wsRef.current === ws) {
          // Trigger a reload state by toggling ref or simple component refresh
        }
      }, 5000);
    };

    return () => {
      ws.close();
    };
  }, [onMessageReceived]);

  const sendMessage = (msg) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(typeof msg === 'string' ? msg : JSON.stringify(msg));
    }
  };

  return { connected, sendMessage };
};
