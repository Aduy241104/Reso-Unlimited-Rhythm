import axiosClient from "../axios/axiosClient";

const SESSION_KEY = "reso.advertisement.session.v1";

export const getAdvertisementSessionId = () => {
  if (typeof window === "undefined") return "server-render-session";
  let value = window.sessionStorage.getItem(SESSION_KEY);
  if (!value) {
    value = typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `ad-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    window.sessionStorage.setItem(SESSION_KEY, value);
  }
  return value;
};

export const requestAdvertisementDecision = async ({ type, placement = "", transitionId = "", genreIds = [] } = {}) => {
  const response = await axiosClient.post("/api/ads/decision", {
    sessionId: getAdvertisementSessionId(), type, placement, transitionId, genreIds,
  });
  return response?.data?.data || null;
};

export const recordAdvertisementEvent = async ({ decisionToken, eventType, playedSeconds = 0 } = {}) => {
  if (!decisionToken || !eventType) return null;
  try {
    return await axiosClient.post("/api/ads/events", {
      decisionToken, eventType, playedSeconds: Math.max(Number(playedSeconds) || 0, 0),
    });
  } catch { return null; }
};

export const isSafeAdvertisementUrl = (value) => {
  try { return ["http:", "https:"].includes(new URL(value).protocol); }
  catch { return false; }
};
