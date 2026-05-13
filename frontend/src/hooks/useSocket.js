import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { getToken } from '../services/api';

const SOCKET_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_SOCKET_URL || '';

let globalSocket = null;
let refCount = 0;

export function useSocket() {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const lastRoomRef = useRef(null);

  useEffect(() => {
    const token = getToken();


    if (!globalSocket || globalSocket.disconnected) {
  const url = SOCKET_URL || window.location.origin;
  globalSocket = io(url, {
    auth: token ? { token } : {},
    query: token ? { token } : {},   // ← add this line
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 15,        // ← was 10, increase
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,      // ← add this line
  });
}

    refCount++;
    const s = globalSocket;
    setSocket(s);

    const onConnect = () => {
      setConnected(true);
      if (lastRoomRef.current) {
        s.emit('join_room', { roomCode: lastRoomRef.current });
      }
    };
    const onDisconnect = () => setConnected(false);
    const onError = () => setConnected(false);

    s.on('connect', onConnect);
    s.on('disconnect', onDisconnect);
    s.on('connect_error', onError);

    if (s.connected) setConnected(true);

    return () => {
      s.off('connect', onConnect);
      s.off('disconnect', onDisconnect);
      s.off('connect_error', onError);
      refCount--;
      if (refCount <= 0) {
        s.disconnect();
        globalSocket = null;
        refCount = 0;
      }
      setSocket(null);
      setConnected(false);
    };
  }, []);

  const joinRoom = useCallback((roomCode) => {
    lastRoomRef.current = roomCode;
  }, []);

  const leaveRoom = useCallback(() => {
    lastRoomRef.current = null;
  }, []);

  return { socket, connected, joinRoom, leaveRoom };
}
