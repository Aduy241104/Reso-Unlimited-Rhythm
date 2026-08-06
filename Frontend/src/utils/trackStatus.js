const getTrackEntity = (item) => item?.track || item?.raw || item || null;

const normalizeStatus = (value) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

export const isBlockedTrack = (item) => {
  const track = getTrackEntity(item);

  return Boolean(
    item?.isBlocked ||
      item?.blocked ||
      item?.is_blocked ||
      track?.isBlocked ||
      track?.blocked ||
      track?.is_blocked ||
      normalizeStatus(track?.activeStatus) === "blocked" ||
      normalizeStatus(item?.activeStatus) === "blocked"
  );
};

export const isHiddenTrack = (item) => {
  const track = getTrackEntity(item);

  return Boolean(
    item?.isHidden ||
      item?.hidden ||
      item?.is_hidden ||
      track?.isHidden ||
      track?.hidden ||
      track?.is_hidden ||
      normalizeStatus(track?.activeStatus) === "hidden" ||
      normalizeStatus(item?.activeStatus) === "hidden"
  );
};

export const isUnavailableTrack = (item) =>
  isBlockedTrack(item) || isHiddenTrack(item);

export const isPlayableTrack = (item) => {
  const track = getTrackEntity(item);

  return Boolean(track) && !isUnavailableTrack(item);
};

export const filterPlayableTracks = (items = []) =>
  (Array.isArray(items) ? items : []).filter(isPlayableTrack);
