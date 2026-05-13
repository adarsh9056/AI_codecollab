import api from '../services/api';

let sessionId = null;

function getSessionId() {
  if (!sessionId) {
    sessionId = `s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }
  return sessionId;
}

export function trackEvent(eventType, payload = {}, { roomId, contestId } = {}) {
  try {
    api.post('/analytics/event', {
      eventType,
      payload,
      sessionId: getSessionId(),
      roomId: roomId || undefined,
      contestId: contestId || undefined,
    }).catch(() => {});
  } catch (_) {
    // analytics are non-critical — never block UI
  }
}
