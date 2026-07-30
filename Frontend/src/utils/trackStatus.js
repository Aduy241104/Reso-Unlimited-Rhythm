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

export const isPlayableTrack = (item) => {
  const track = getTrackEntity(item);

  return Boolean(track) && !isBlockedTrack(item);
};
