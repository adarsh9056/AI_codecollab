import { useRef, useState, useCallback, useEffect } from 'react';

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  {
    urls: 'turn:openrelay.metered.ca:80',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
  {
    urls: 'turn:openrelay.metered.ca:443',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
];

const MAX_RECONNECT_ATTEMPTS = 3;
const RECONNECT_DELAY_MS = 2000;

/**
 * Self-contained audio-only WebRTC hook.
 * Manages its own socket listeners — rooms don't need to wire signaling manually.
 */
export function useWebRTC(socket, roomCode) {
  const [isMuted, setIsMuted] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [audioError, setAudioError] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [localStream, setLocalStream] = useState(null);

  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const lastRequestedMedia = useRef({ audio: true, video: false });
  const iceCandidateQueue = useRef([]);
  const isNegotiating = useRef(false);
  const reconnectAttempts = useRef(0);
  const intentionalStop = useRef(false);
  const activeRef = useRef(false);

  const cleanup = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.onicecandidate = null;
      pcRef.current.ontrack = null;
      pcRef.current.onconnectionstatechange = null;
      pcRef.current.oniceconnectionstatechange = null;
      pcRef.current.close();
      pcRef.current = null;
    }
    iceCandidateQueue.current = [];
    isNegotiating.current = false;
    setRemoteStream(null);
    setIsConnected(false);
  }, []);

  const getLocalStream = useCallback(async (media = { audio: true, video: false }) => {
    // If we already have a stream that satisfies the request, return it.
    if (localStreamRef.current) {
      const hasVideo = !!localStreamRef.current.getVideoTracks().length;
      if (media.video && hasVideo) return localStreamRef.current;
      if (!media.video) return localStreamRef.current;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia(media);
      localStreamRef.current = stream;
      setLocalStream(stream);
      setAudioError(null);
      return stream;
    } catch (err) {
      const msg = err.name === 'NotAllowedError'
        ? 'Media access denied. Please allow microphone/camera permission and try again.'
        : err.name === 'NotFoundError'
          ? 'No media device found. Please connect a camera or microphone.'
          : `Media error: ${err.message}`;
      setAudioError(msg);
      throw err;
    }
  }, []);

  const flushIceCandidates = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc || !pc.remoteDescription) return;
    const queued = iceCandidateQueue.current.splice(0);
    for (const candidate of queued) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (_) { /* non-fatal */ }
    }
  }, []);

  const createPeerConnection = useCallback((stream) => {
    cleanup();
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    pc.onicecandidate = (e) => {
      if (e.candidate && socket && roomCode) {
        socket.emit('webrtc_ice', { roomCode, candidate: e.candidate });
      }
    };

    pc.ontrack = (e) => {
      if (e.streams?.[0]) setRemoteStream(e.streams[0]);
    };

    const handleStateChange = () => {
      const state = pc.connectionState || pc.iceConnectionState;
      if (state === 'connected') {
        setIsConnected(true);
        reconnectAttempts.current = 0;
      } else if (state === 'disconnected' || state === 'failed') {
        setIsConnected(false);
        if (!intentionalStop.current && activeRef.current && reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttempts.current++;
          setTimeout(() => {
            if (activeRef.current && !intentionalStop.current) {
              initiateCall();
            }
          }, RECONNECT_DELAY_MS);
        }
      } else if (state === 'closed') {
        setIsConnected(false);
      }
    };

    pc.onconnectionstatechange = handleStateChange;
    pc.oniceconnectionstatechange = handleStateChange;

    stream.getTracks().forEach((t) => pc.addTrack(t, stream));
    pcRef.current = pc;
    return pc;
  }, [socket, roomCode, cleanup]);

  const initiateCall = useCallback(async () => {
    if (!socket || !roomCode || isNegotiating.current) return;
    isNegotiating.current = true;
    try {
      const stream = await getLocalStream(lastRequestedMedia.current || { audio: true, video: false });
      const pc = createPeerConnection(stream);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('webrtc_offer', { roomCode, offer });
    } catch (err) {
      console.error('WebRTC call initiation failed', err);
    } finally {
      isNegotiating.current = false;
    }
  }, [socket, roomCode, getLocalStream, createPeerConnection]);

  const startAudio = useCallback(async () => {
    if (!socket || !roomCode) return;
    setAudioError(null);
    intentionalStop.current = false;
    activeRef.current = true;
    reconnectAttempts.current = 0;
    lastRequestedMedia.current = { audio: true, video: false };
    await initiateCall();
  }, [socket, roomCode, initiateCall]);

  const startVideo = useCallback(async () => {
    if (!socket || !roomCode) return;
    setAudioError(null);
    intentionalStop.current = false;
    activeRef.current = true;
    reconnectAttempts.current = 0;
    lastRequestedMedia.current = { audio: true, video: true };
    try {
      await initiateCall();
      setIsCameraOn(true);
    } catch (err) {
      console.error('Start video failed', err);
    }
  }, [socket, roomCode, initiateCall]);

  const stopAudio = useCallback(() => {
    intentionalStop.current = true;
    activeRef.current = false;
    cleanup();
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
      setLocalStream(null);
      setIsCameraOn(false);
    }
    setIsMuted(false);
    if (socket && roomCode) socket.emit('webrtc_leave', { roomCode });
  }, [socket, roomCode, cleanup]);

  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const newMuted = !isMuted;
      localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = !newMuted));
      setIsMuted(newMuted);
    }
  }, [isMuted]);

  const toggleCamera = useCallback(() => {
    if (!localStreamRef.current) return;
    const videoTracks = localStreamRef.current.getVideoTracks();
    if (!videoTracks.length) return;
    const enabled = !videoTracks[0].enabled;
    videoTracks.forEach(t => (t.enabled = enabled));
    setIsCameraOn(enabled);
  }, []);

  // --- Socket signaling listeners (self-contained, no external wiring needed) ---
  useEffect(() => {
    if (!socket || !roomCode) return;

    const onOffer = async (data) => {
      if (!data?.offer) return;
      if (isNegotiating.current) return;
      isNegotiating.current = true;
      try {
        const stream = await getLocalStream(lastRequestedMedia.current || { audio: true, video: false });
        const pc = createPeerConnection(stream);
        activeRef.current = true;
        intentionalStop.current = false;
        await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
        await flushIceCandidates();
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('webrtc_answer', { roomCode, answer });
      } catch (err) {
        console.error('Handle offer error', err);
      } finally {
        isNegotiating.current = false;
      }
    };

    const onAnswer = async (data) => {
      if (!data?.answer || !pcRef.current) return;
      try {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
        await flushIceCandidates();
      } catch (err) {
        console.error('Handle answer error', err);
      }
    };

    const onIce = async (data) => {
      if (!data?.candidate) return;
      if (!pcRef.current || !pcRef.current.remoteDescription) {
        iceCandidateQueue.current.push(data.candidate);
      } else {
        try {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (_) { /* non-fatal */ }
      }
    };

    const onLeave = () => {
      cleanup();
    };

    socket.on('webrtc_offer', onOffer);
    socket.on('webrtc_answer', onAnswer);
    socket.on('webrtc_ice', onIce);
    socket.on('webrtc_leave', onLeave);

    return () => {
      socket.off('webrtc_offer', onOffer);
      socket.off('webrtc_answer', onAnswer);
      socket.off('webrtc_ice', onIce);
      socket.off('webrtc_leave', onLeave);
    };
  }, [socket, roomCode, getLocalStream, createPeerConnection, flushIceCandidates, cleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      intentionalStop.current = true;
      activeRef.current = false;
      if (pcRef.current) {
        pcRef.current.onicecandidate = null;
        pcRef.current.ontrack = null;
        pcRef.current.onconnectionstatechange = null;
        pcRef.current.oniceconnectionstatechange = null;
        pcRef.current.close();
        pcRef.current = null;
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
      }
    };
  }, []);

  return {
    isMuted,
    isConnected,
    audioError,
    remoteStream,
    localStream,
    isCameraOn,
    startAudio,
    stopAudio,
    toggleMute,
    startVideo,
    toggleCamera,
  };
}
