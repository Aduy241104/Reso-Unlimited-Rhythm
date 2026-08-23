import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Liricle from "liricle";
import { useAuth } from "../hooks/useAuth";
import PlayerContext from "./player-context.js";
import { getApiErrorMessage } from "../utils/apiError";
import { getRandomLyricsThemeIndex } from "../utils/lyricsTheme";
import { hasPremiumAccess } from "../utils/premiumAccess";
import {
  getTrackLyricsSyncTextService,
  getTrackPlaybackSource,
  resolveTrackAudioQualityOptions,
  resolveTrackLyricsSyncUrl,
  resolveTrackMediaUrl,
  resolveTrackMediaUrlForQuality,
  recordListenService,
} from "../services/playerService";
import podcastService from "../services/podcastService";
import {
  recordAdvertisementEvent,
  requestAdvertisementDecision,
} from "../services/advertisementService";
import {
  isBlockedTrack,
  isHiddenTrack,
  isPlayableTrack,
} from "../utils/trackStatus";

const DEFAULT_VOLUME = 0.75;
const PLAYBACK_STORAGE_KEY = "capstone.player.playback_state";
const REPEAT_MODE_SEQUENCE = ["off", "all", "one"];
const MANUAL_QUEUE_SOURCE = "manual";
const CONTEXT_QUEUE_SOURCE = "context";
const PODCAST_MEDIA_TYPE = "podcast";
const PLAYER_MODE_TRACK = "track";
const PLAYER_MODE_AD = "ad";

const isPodcastMedia = (media) =>
  media?.mediaType === PODCAST_MEDIA_TYPE ||
  media?.contentType === PODCAST_MEDIA_TYPE ||
  media?.type === PODCAST_MEDIA_TYPE;

const getTrackId = (track, fallbackId = null) =>
  track?.id || track?._id || track?.trackId || fallbackId;

const getExplicitTrackId = (track) =>
  track?.id || track?._id || track?.trackId || null;

const getPlaybackRequestTrackId = (track) =>
  track?.playbackTrackId || getExplicitTrackId(track?.raw) || null;

const getArtistName = (track, fallbackArtistName = "") =>
  track?.artist?.name ||
  track?.artistName ||
  track?.owner?.name ||
  fallbackArtistName ||
  "Unknown artist";

const resolveListenSource = (value = "unknown") => {
  switch (value) {
    case "track_detail":
    case "album":
    case "playlist":
    case "search":
    case "artist_profile":
      return value;
    case "podcast_detail":
      return value;
    case "track":
      return "track_detail";
    default:
      return "unknown";
  }
};

const getTrackImage = (track, fallbackImage = "") => {
  const coverImage = Array.isArray(track?.coverImage)
    ? track.coverImage[0]
    : track?.coverImage;

  return (
    coverImage ||
    track?.coverImageUrl ||
    track?.image ||
    track?.avatar ||
    track?.album?.coverImage ||
    track?.album?.avatar ||
    track?.artist?.avatar ||
    fallbackImage ||
    ""
  );
};

const getQueueItemId = (track, fallbackId = "") =>
  track?.queueItemId ||
  track?.playbackTrackId ||
  track?.id ||
  getTrackId(track?.raw || track, fallbackId) ||
  fallbackId;

const findQueueTrackIndex = (tracks = [], queueItemId = "") =>
  tracks.findIndex((track) => getQueueItemId(track) === queueItemId);

const shuffleTracks = (tracks = []) => {
  const nextTracks = [...tracks];

  for (let index = nextTracks.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [nextTracks[index], nextTracks[randomIndex]] = [
      nextTracks[randomIndex],
      nextTracks[index],
    ];
  }

  return nextTracks;
};

const buildShuffledQueue = (
  orderedQueue = [],
  { currentQueueItemId = "", preserveHistory = false } = {}
) => {
  if (orderedQueue.length === 0) {
    return {
      queue: [],
      currentIndex: -1,
    };
  }

  const activeTrackIndex = currentQueueItemId
    ? findQueueTrackIndex(orderedQueue, currentQueueItemId)
    : -1;

  if (activeTrackIndex < 0) {
    return {
      queue: shuffleTracks(orderedQueue),
      currentIndex: 0,
    };
  }

  const activeTrack = orderedQueue[activeTrackIndex];

  if (!preserveHistory) {
    const remainingTracks = orderedQueue.filter(
      (_, index) => index !== activeTrackIndex
    );

    return {
      queue: [activeTrack, ...shuffleTracks(remainingTracks)],
      currentIndex: 0,
    };
  }

  const playedTracks = orderedQueue.slice(0, activeTrackIndex);
  const upcomingTracks = orderedQueue.slice(activeTrackIndex + 1);

  return {
    queue: [...playedTracks, activeTrack, ...shuffleTracks(upcomingTracks)],
    currentIndex: playedTracks.length,
  };
};

const replaceQueueTrack = (tracks = [], queueItemId = "", nextTrack = null) => {
  let hasReplaced = false;

  return tracks.map((track) => {
    if (!hasReplaced && getQueueItemId(track) === queueItemId && nextTrack) {
      hasReplaced = true;
      return nextTrack;
    }

    return track;
  });
};

const removeQueueTrack = (tracks = [], queueItemId = "") => {
  let hasRemoved = false;

  return tracks.filter((track) => {
    if (!hasRemoved && getQueueItemId(track) === queueItemId) {
      hasRemoved = true;
      return false;
    }

    return true;
  });
};

const insertTrackAfterActiveManualQueue = (
  tracks = [],
  nextTrack = null,
  activeQueueItemId = ""
) => {
  if (!nextTrack) {
    return tracks;
  }

  if (tracks.length === 0) {
    return [nextTrack];
  }

  const activeIndex = activeQueueItemId
    ? findQueueTrackIndex(tracks, activeQueueItemId)
    : -1;

  if (activeIndex < 0) {
    return [...tracks, nextTrack];
  }

  let insertIndex = activeIndex + 1;

  while (
    insertIndex < tracks.length &&
    tracks[insertIndex]?.queueSource === MANUAL_QUEUE_SOURCE
  ) {
    insertIndex += 1;
  }

  return [
    ...tracks.slice(0, insertIndex),
    nextTrack,
    ...tracks.slice(insertIndex),
  ];
};

const normalizeQueueTrack = (item, options = {}) => {
  const track = item?.track ?? item ?? {};
  const normalizedTrackId = getTrackId(
    track,
    `${options.collectionId || options.collectionType || "track"}-${options.index || 0}`
  );
  const queueItemId =
    options.queueItemId ||
    item?.queueItemId ||
    track?.queueItemId ||
    `${options.collectionId || options.collectionType || "track"}:${
      options.index || 0
    }:${normalizedTrackId}`;
  const queueSource =
    item?.queueSource ||
    track?.queueSource ||
    options.queueSource ||
    CONTEXT_QUEUE_SOURCE;
  const mediaType =
    track?.mediaType ||
    track?.contentType ||
    item?.mediaType ||
    item?.contentType ||
    options.mediaType ||
    "track";

  return {
    queueItemId,
    queueSource,
    id: normalizedTrackId,
    mediaType,
    contentType: mediaType,
    type: mediaType === PODCAST_MEDIA_TYPE ? PODCAST_MEDIA_TYPE : "song",
    title: track?.title || item?.title || "Untitled track",
    versionTitle: track?.versionTitle || item?.versionTitle || "",
    artist: track?.artist || null,
    artistName: track?.artistName || getArtistName(track, options.artistName),
    duration: Number(track?.duration) || Number(item?.duration) || 0,
    image: track?.image || getTrackImage(track, options.image),
    playbackTrackId: getTrackId(track, item?.playbackTrackId || null),
    streamUrl: track?.streamUrl || resolveTrackMediaUrl(track),
    lyricsSyncUrl: track?.lyricsSyncUrl || resolveTrackLyricsSyncUrl(track),
    listenSource: resolveListenSource(
      track?.listenSource || options.listenSource || options.collectionType
    ),
    isBlocked: isBlockedTrack(item),
    isHidden: isHiddenTrack(item),
    playback: track?.playback || null,
    raw: track?.raw || track,
  };
};

const normalizeQueue = (tracks, collection = null) =>
  (tracks || [])
    .map((track, index) =>
      normalizeQueueTrack(track, {
        index,
        image: collection?.image,
        artistName: collection?.artistName,
        collectionId: collection?.id,
        collectionType: collection?.type,
        listenSource: collection?.listenSource,
        queueSource: CONTEXT_QUEUE_SOURCE,
      })
    )
    .filter((track) => Boolean(track?.id) && isPlayableTrack(track));

const createPersistedQueueTrack = (
  trackId,
  playbackTrackId,
  index,
  storedTrack = null
) =>
  normalizeQueueTrack(
    {
      queueItemId: storedTrack?.queueItemId,
      queueSource: storedTrack?.queueSource,
      id: trackId,
      playbackTrackId: playbackTrackId || trackId,
      mediaType: storedTrack?.mediaType || storedTrack?.contentType || "track",
      contentType: storedTrack?.contentType || storedTrack?.mediaType || "track",
      title: storedTrack?.title || "Untitled track",
      versionTitle: storedTrack?.versionTitle || "",
      artistName: storedTrack?.artistName || "Unknown artist",
      duration: storedTrack?.duration,
      image: storedTrack?.image,
      listenSource: storedTrack?.listenSource,
      streamUrl: storedTrack?.streamUrl || "",
    },
    {
      index,
      collectionId: "restored-queue",
      collectionType: "queue",
      queueSource: CONTEXT_QUEUE_SOURCE,
    }
  );

const createStoredQueueTrack = (track) => ({
  queueItemId: String(track?.queueItemId || "").trim(),
  queueSource:
    track?.queueSource === MANUAL_QUEUE_SOURCE
      ? MANUAL_QUEUE_SOURCE
      : CONTEXT_QUEUE_SOURCE,
  id: String(track?.id || track?.playbackTrackId || "").trim(),
  playbackTrackId: String(
    track?.playbackTrackId || track?.id || ""
  ).trim(),
  mediaType: isPodcastMedia(track) ? PODCAST_MEDIA_TYPE : "track",
  contentType: isPodcastMedia(track) ? PODCAST_MEDIA_TYPE : "track",
  title: String(track?.title || "Untitled track"),
  versionTitle: String(track?.versionTitle || ""),
  artistName: String(track?.artistName || getArtistName(track)),
  duration: Math.max(Number(track?.duration) || 0, 0),
  image: String(track?.image || getTrackImage(track) || ""),
  listenSource: resolveListenSource(track?.listenSource),
  streamUrl: isPodcastMedia(track) ? String(track?.streamUrl || "") : "",
});

const clearStoredPlaybackState = () => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(PLAYBACK_STORAGE_KEY);
};

const normalizeStoredPlaybackState = (value) => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const queueTrackIds = Array.isArray(value.queueTrackIds)
    ? value.queueTrackIds
        .map((trackId) => String(trackId || "").trim())
        .filter(Boolean)
    : [];
  const queuePlaybackTrackIds = Array.isArray(value.queuePlaybackTrackIds)
    ? value.queuePlaybackTrackIds
        .map((trackId) => String(trackId || "").trim())
        .filter(Boolean)
    : [];
  const queueTracks = Array.isArray(value.queueTracks)
    ? value.queueTracks.filter(
        (track) => track && typeof track === "object"
      )
    : [];
  const currentTrackId = String(value.currentTrackId || "").trim();
  const currentPlaybackTrackId = String(
    value.currentPlaybackTrackId || currentTrackId
  ).trim();
  const currentIndex = Number(value.currentIndex);
  const currentTime = Math.max(Number(value.currentTime) || 0, 0);
  const volume = Math.min(Math.max(Number(value.volume) || 0, 0), 1);
  const updatedAt = Number(value.updatedAt);
  const repeatMode = REPEAT_MODE_SEQUENCE.includes(value.repeatMode)
    ? value.repeatMode
    : "off";

  if (
    !currentTrackId ||
    queueTrackIds.length === 0 ||
    !Number.isInteger(currentIndex) ||
    currentIndex < 0 ||
    currentIndex >= queueTrackIds.length
  ) {
    return null;
  }

  return {
    currentTrackId,
    currentPlaybackTrackId,
    queueTrackIds,
    queuePlaybackTrackIds,
    queueTracks,
    currentIndex,
    currentTime,
    isPlaying: Boolean(value.isPlaying),
    shuffle: Boolean(value.shuffle),
    repeatMode,
    volume: Number.isFinite(volume) ? volume : DEFAULT_VOLUME,
    updatedAt: Number.isFinite(updatedAt) && updatedAt > 0 ? updatedAt : Date.now(),
  };
};

const loadStoredPlaybackState = () => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const rawValue = window.localStorage.getItem(PLAYBACK_STORAGE_KEY);

    if (!rawValue) {
      return null;
    }

    const normalizedValue = normalizeStoredPlaybackState(JSON.parse(rawValue));

    if (!normalizedValue) {
      clearStoredPlaybackState();
      return null;
    }

    return normalizedValue;
  } catch {
    clearStoredPlaybackState();
    return null;
  }
};

const persistPlaybackState = (value) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(PLAYBACK_STORAGE_KEY, JSON.stringify(value));
};

const waitForAudioMetadata = (audio, timeoutMs = 1500) =>
  new Promise((resolve) => {
    if (!audio || audio.readyState >= 1) {
      resolve();
      return;
    }

    let isResolved = false;
    const timeoutId = window.setTimeout(() => {
      if (isResolved) {
        return;
      }

      isResolved = true;
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("error", handleError);
      resolve();
    }, timeoutMs);

    const handleLoadedMetadata = () => {
      if (isResolved) {
        return;
      }

      isResolved = true;
      window.clearTimeout(timeoutId);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("error", handleError);
      resolve();
    };

    const handleError = () => {
      if (isResolved) {
        return;
      }

      isResolved = true;
      window.clearTimeout(timeoutId);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("error", handleError);
      resolve();
    };

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("error", handleError);
  });

const getTrackQualityOptions = (track) => resolveTrackAudioQualityOptions(track);

const resolveSelectedQuality = (track, streamUrl = "", preferredBitrate = 0) => {
  const qualityOptions = getTrackQualityOptions(track);

  if (qualityOptions.length === 0) {
    return null;
  }

  const normalizedPreferredBitrate = Number(preferredBitrate) || 0;

  if (normalizedPreferredBitrate > 0) {
    const bitrateMatch = qualityOptions.find(
      (quality) => quality.bitrate === normalizedPreferredBitrate
    );

    if (bitrateMatch) {
      return bitrateMatch;
    }
  }

  if (streamUrl) {
    const matchedQuality = qualityOptions.find(
      (quality) => quality.url === streamUrl
    );

    if (matchedQuality) {
      return matchedQuality;
    }
  }

  return qualityOptions.find((quality) => quality.isDefault) || qualityOptions[0];
};

export const PlayerProvider = ({ children }) => {
  const { user } = useAuth();
  const initialStoredPlaybackStateRef = useRef(undefined);
  if (initialStoredPlaybackStateRef.current === undefined) {
    initialStoredPlaybackStateRef.current = loadStoredPlaybackState();
  }
  const [queue, setQueue] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(
    initialStoredPlaybackStateRef.current?.volume ?? DEFAULT_VOLUME
  );
  const [errorMessage, setErrorMessage] = useState("");
  const [restrictionMessage, setRestrictionMessage] = useState("");
  const [activeCollection, setActiveCollection] = useState(null);
  const [lyricsLines, setLyricsLines] = useState([]);
  const [activeLyricLineIndex, setActiveLyricLineIndex] = useState(-1);
  const [activeLyricWordIndex, setActiveLyricWordIndex] = useState(-1);
  const [isLyricsLoading, setIsLyricsLoading] = useState(false);
  const [lyricsErrorMessage, setLyricsErrorMessage] = useState("");
  const [availableAudioQualities, setAvailableAudioQualities] = useState([]);
  const [selectedQualityLabel, setSelectedQualityLabel] = useState("");
  const [selectedQualityBitrate, setSelectedQualityBitrate] = useState(0);
  const [isShuffleEnabled, setIsShuffleEnabled] = useState(
    initialStoredPlaybackStateRef.current?.shuffle ?? false
  );
  const [repeatMode, setRepeatMode] = useState(
    initialStoredPlaybackStateRef.current?.repeatMode ?? "off"
  );
  const [playerMode, setPlayerMode] = useState(PLAYER_MODE_TRACK);
  const [currentAd, setCurrentAd] = useState(null);
  const [canSkipAd, setCanSkipAd] = useState(false);
  const audioRef = useRef(null);
  const queueRef = useRef([]);
  const orderedQueueRef = useRef([]);
  const currentIndexRef = useRef(-1);
  const objectUrlRef = useRef("");
  const playbackRequestIdRef = useRef(0);
  const lyricsRequestIdRef = useRef(0);
  const playTrackByIndexRef = useRef(null);
  const liricleRef = useRef(null);
  const syncLyricsRef = useRef(null);
  const lyricsReadyRef = useRef(false);
  const currentLyricsThemeIndexRef = useRef(-1);
  const selectedQualityLabelRef = useRef("");
  const selectedQualityBitrateRef = useRef(0);
  const isPremiumRef = useRef(false);
  const isShuffleEnabledRef = useRef(false);
  const repeatModeRef = useRef("off");
  const listenTrackRef = useRef({
    trackId: null,
    mediaType: "track",
    duration: 0,
    source: "unknown",
    hasReported: false,
    isReporting: false,
  });
  const listenedDurationRef = useRef(0);
  const lastTrackedAudioTimeRef = useRef(0);
  const ignoreNextListenDeltaRef = useRef(true);
  const queueMutationCounterRef = useRef(0);
  const isRestoringPlaybackRef = useRef(false);
  const playerModeRef = useRef(PLAYER_MODE_TRACK);
  const currentAdDecisionRef = useRef(null);
  const adEventStartedRef = useRef(false);
  const pendingAfterAdRef = useRef(null);
  const finishAdvertisementRef = useRef(null);
  const maybePlayAdvertisementRef = useRef(null);

  const isPremium = useMemo(() => hasPremiumAccess(user), [user]);

  const syncQueueState = (nextQueue) => {
    queueRef.current = nextQueue;
    setQueue(nextQueue);
  };

  const syncOrderedQueueState = (nextQueue) => {
    orderedQueueRef.current = nextQueue;
  };

  const syncQualityState = (track, streamUrl = "", preferredBitrate = 0) => {
    const qualityOptions = getTrackQualityOptions(track);
    const nextQuality = resolveSelectedQuality(
      track,
      streamUrl,
      preferredBitrate
    );
    const nextQualityLabel = nextQuality?.label || "";
    const nextQualityBitrate = nextQuality?.bitrate || 0;

    setAvailableAudioQualities(qualityOptions);
    setSelectedQualityLabel(nextQualityLabel);
    setSelectedQualityBitrate(nextQualityBitrate);
    selectedQualityLabelRef.current = nextQualityLabel;
    selectedQualityBitrateRef.current = nextQualityBitrate;
  };

  const createManualQueueTrack = (track, options = {}) => {
    queueMutationCounterRef.current += 1;
    const baseTrack = track?.track ?? track ?? {};
    const normalizedTrackId = getTrackId(
      baseTrack,
      `manual-track-${queueMutationCounterRef.current}`
    );

    return normalizeQueueTrack(track, {
      ...options,
      collectionId: options.collection?.id || "manual-queue",
      collectionType: options.collection?.type || "queue",
      queueSource: MANUAL_QUEUE_SOURCE,
      queueItemId: `manual:${Date.now()}:${queueMutationCounterRef.current}:${normalizedTrackId}`,
    });
  };

  const createRandomPlaybackQueueTrack = () => {
    queueMutationCounterRef.current += 1;

    return normalizeQueueTrack(
      {
        title: "Random track",
        artistName: "Unknown artist",
      },
      {
        index: queueMutationCounterRef.current,
        collectionId: "random-playback",
        collectionType: "queue",
        queueSource: CONTEXT_QUEUE_SOURCE,
        queueItemId: `random:${Date.now()}:${queueMutationCounterRef.current}`,
      }
    );
  };

  const playRandomPlaybackTrack = async (options = {}) => {
    const nextQueueTrack = createRandomPlaybackQueueTrack();
    const nextQueue = [...queueRef.current, nextQueueTrack];
    const nextOrderedQueue = [...orderedQueueRef.current, nextQueueTrack];

    syncQueueState(nextQueue);
    syncOrderedQueueState(nextOrderedQueue);
    setErrorMessage("");
    setRestrictionMessage("");

    await playTrackByIndexRef.current?.(nextQueue.length - 1, nextQueue, options);
  };

  const clearPlaybackState = () => {
    const audio = audioRef.current;

    playbackRequestIdRef.current += 1;
    clearStoredPlaybackState();
    releaseCurrentObjectUrl();

    if (audio) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    }

    listenTrackRef.current = {
      trackId: null,
      mediaType: "track",
      duration: 0,
      source: "unknown",
      hasReported: false,
      isReporting: false,
    };
    currentIndexRef.current = -1;
    resetListenProgress();
    resetLyricsState();
    syncQueueState([]);
    syncOrderedQueueState([]);
    setCurrentIndex(-1);
    setCurrentTrack(null);
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);
    setIsBuffering(false);
    setErrorMessage("");
    setRestrictionMessage("");
    setActiveCollection(null);
    setAvailableAudioQualities([]);
    setSelectedQualityLabel("");
    setSelectedQualityBitrate(0);
    selectedQualityLabelRef.current = "";
    selectedQualityBitrateRef.current = 0;
    playerModeRef.current = PLAYER_MODE_TRACK;
    currentAdDecisionRef.current = null;
    pendingAfterAdRef.current = null;
    adEventStartedRef.current = false;
    setPlayerMode(PLAYER_MODE_TRACK);
    setCurrentAd(null);
    setCanSkipAd(false);
  };

  const resetLyricsState = () => {
    lyricsRequestIdRef.current += 1;
    lyricsReadyRef.current = false;
    setLyricsLines([]);
    setActiveLyricLineIndex(-1);
    setActiveLyricWordIndex(-1);
    setIsLyricsLoading(false);
    setLyricsErrorMessage("");
  };

  const loadLyricsForTrack = async (track) => {
    lyricsRequestIdRef.current += 1;
    const requestId = lyricsRequestIdRef.current;
    const lyricsSyncUrl = resolveTrackLyricsSyncUrl(track);
    lyricsReadyRef.current = false;

    setLyricsLines([]);
    setActiveLyricLineIndex(-1);
    setActiveLyricWordIndex(-1);
    setLyricsErrorMessage("");

    if (!lyricsSyncUrl) {
      setIsLyricsLoading(false);
      return;
    }

    setIsLyricsLoading(true);

    try {
      const lyricsText = await getTrackLyricsSyncTextService(lyricsSyncUrl);

      if (requestId !== lyricsRequestIdRef.current) {
        return;
      }

      liricleRef.current?.load({ text: lyricsText });
      lyricsReadyRef.current = true;
      setIsLyricsLoading(false);
      syncLyricsRef.current?.(audioRef.current?.currentTime || 0, true);
    } catch (error) {
      if (requestId !== lyricsRequestIdRef.current) {
        return;
      }

      lyricsReadyRef.current = false;
      setIsLyricsLoading(false);
      setLyricsErrorMessage(
        getApiErrorMessage(error, "Unable to load synced lyrics for this track.")
      );
    }
  };

  const releaseCurrentObjectUrl = () => {
    if (!objectUrlRef.current) {
      return;
    }

    URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = "";
  };

  const resetListenProgress = useCallback(({
    listenedDuration = 0,
    currentTime = 0,
    ignoreNextDelta = true,
  } = {}) => {
    listenedDurationRef.current = Math.max(Number(listenedDuration) || 0, 0);
    lastTrackedAudioTimeRef.current = Math.max(Number(currentTime) || 0, 0);
    ignoreNextListenDeltaRef.current = ignoreNextDelta;
  }, []);

  const trackListenProgress = useCallback((nextTime) => {
    const normalizedNextTime = Math.max(Number(nextTime) || 0, 0);
    const previousTrackedTime = Math.max(lastTrackedAudioTimeRef.current || 0, 0);
    const delta = normalizedNextTime - previousTrackedTime;

    if (ignoreNextListenDeltaRef.current) {
      ignoreNextListenDeltaRef.current = false;
      lastTrackedAudioTimeRef.current = normalizedNextTime;
      return;
    }

    // `timeupdate` is throttled by browsers, especially when the tab is
    // backgrounded. Programmatic seeks are already ignored by
    // `ignoreNextListenDeltaRef`, so a larger positive delta can still be
    // legitimate playback progress and must not discard the whole listen.
    if (delta > 0) {
      listenedDurationRef.current += delta;
    }

    lastTrackedAudioTimeRef.current = normalizedNextTime;
  }, []);

  const reportPodcastListenIfReady = useCallback(async (nextTime) => {
    const activeListen = listenTrackRef.current;

    if (
      !activeListen?.trackId ||
      activeListen.mediaType !== PODCAST_MEDIA_TYPE ||
      activeListen.hasReported ||
      activeListen.isReporting
    ) {
      return;
    }

    const podcastDuration = Number(activeListen.duration) || 0;
    const threshold = podcastDuration * 0.5;

    if (threshold <= 0 || Number(nextTime) < threshold) {
      return;
    }

    const listenedDuration = Math.floor(
      Math.min(
        Math.max(Number(listenedDurationRef.current) || 0, 0),
        podcastDuration
      )
    );

    if (listenedDuration < threshold) {
      return;
    }

    activeListen.isReporting = true;

    try {
      const result = await podcastService.stream(
        activeListen.trackId,
        listenedDuration,
        activeListen.source
      );
      if (result) activeListen.hasReported = true;
    } catch (error) {
      console.warn("[PodcastListenTracking] Failed to record listen:", error);
    } finally {
      activeListen.isReporting = false;
    }
  }, []);

  const flushCurrentListenAttempt = useCallback(async () => {
    const activeListen = listenTrackRef.current;

    if (
      !activeListen?.trackId ||
      activeListen.mediaType === PODCAST_MEDIA_TYPE ||
      activeListen.hasReported ||
      activeListen.isReporting
    ) {
      return;
    }

    trackListenProgress(audioRef.current?.currentTime || 0);

    const rawListenedDuration = listenedDurationRef.current;
    const trackDuration = Number(activeListen.duration) || 0;
    const boundedListenedDuration =
      trackDuration > 0
        ? Math.min(Math.max(rawListenedDuration, 0), trackDuration)
        : Math.max(rawListenedDuration, 0);
    const listenedDuration = Math.floor(boundedListenedDuration);

    if (listenedDuration <= 0) {
      return;
    }

    activeListen.isReporting = true;
    try {
      const result = await recordListenService({
        trackId: activeListen.trackId,
        listenedDuration,
        source: activeListen.source,
      });
      if (result) activeListen.hasReported = true;
    } finally {
      activeListen.isReporting = false;
    }
  }, [trackListenProgress]);

  syncLyricsRef.current = (nextTime, continuous = false) => {
    const liricle = liricleRef.current;
    const normalizedTime = Math.max(Number(nextTime) || 0, 0);
    const firstLineTime = liricle?.data?.lines?.[0]?.time;

    if (!liricle?.data) {
      return;
    }

    if (!lyricsReadyRef.current) {
      return;
    }

    if (typeof firstLineTime === "number" && normalizedTime < firstLineTime) {
      setActiveLyricLineIndex(-1);
      setActiveLyricWordIndex(-1);
      return;
    }

    liricle.sync(normalizedTime, continuous);
  };

  useEffect(() => {
    isPremiumRef.current = isPremium;

    if (isPremium) {
      setRestrictionMessage("");
      if (playerModeRef.current === PLAYER_MODE_AD) {
        void finishAdvertisementRef.current?.("skip");
      }
    }
  }, [isPremium]);

  useEffect(() => {
    selectedQualityLabelRef.current = selectedQualityLabel;
  }, [selectedQualityLabel]);

  useEffect(() => {
    selectedQualityBitrateRef.current = selectedQualityBitrate;
  }, [selectedQualityBitrate]);

  useEffect(() => {
    isShuffleEnabledRef.current = isShuffleEnabled;
  }, [isShuffleEnabled]);

  useEffect(() => {
    repeatModeRef.current = repeatMode;
  }, [repeatMode]);

  // Keep one audio engine/listener set for the provider lifetime. Adding the
  // recreated queue helper here would tear down and recreate the engine.
  useEffect(() => {
    const audio = new Audio();
    const liricle = new Liricle();
    audio.preload = "metadata";
    audio.volume = DEFAULT_VOLUME;
    audioRef.current = audio;
    liricleRef.current = liricle;

    liricle.on("load", (data) => {
      setLyricsLines(data?.lines || []);
      setActiveLyricLineIndex(-1);
      setActiveLyricWordIndex(-1);
      setLyricsErrorMessage("");
    });

    liricle.on("loaderror", (error) => {
      lyricsReadyRef.current = false;
      setLyricsLines([]);
      setActiveLyricLineIndex(-1);
      setActiveLyricWordIndex(-1);
      setIsLyricsLoading(false);
      setLyricsErrorMessage(
        getApiErrorMessage(error, "Unable to load synced lyrics for this track.")
      );
    });

    liricle.on("sync", (line, word) => {
      setActiveLyricLineIndex(Number.isInteger(line?.index) ? line.index : -1);
      setActiveLyricWordIndex(Number.isInteger(word?.index) ? word.index : -1);
    });

    const handleTimeUpdate = () => {
      const nextTime = audio.currentTime || 0;
      if (playerModeRef.current === PLAYER_MODE_AD) {
        const ad = currentAdDecisionRef.current?.advertisement;
        setCurrentTime(nextTime);
        if (ad?.skipEnabled) {
          setCanSkipAd(nextTime >= (Number(ad.skipAfterSeconds) || 0));
        }
        return;
      }
      trackListenProgress(nextTime);
      void reportPodcastListenIfReady(nextTime);
      setCurrentTime(nextTime);
      syncLyricsRef.current?.(nextTime || 0);
    };

    const handleLoadedMetadata = () => {
      setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
      syncLyricsRef.current?.(audio.currentTime || 0, true);
    };

    const handlePlay = () => {
      setIsPlaying(true);
      setIsBuffering(false);
      setErrorMessage("");
      if (playerModeRef.current === PLAYER_MODE_AD && !adEventStartedRef.current) {
        adEventStartedRef.current = true;
        const decisionToken = currentAdDecisionRef.current?.decisionToken;
        void recordAdvertisementEvent({ decisionToken, eventType: "started" });
        void recordAdvertisementEvent({ decisionToken, eventType: "impression" });
      }
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    const handleWaiting = () => {
      setIsBuffering(true);
    };

    const handlePlaying = () => {
      setIsBuffering(false);
    };

    const handleEnded = async () => {
      if (playerModeRef.current === PLAYER_MODE_AD) {
        await finishAdvertisementRef.current?.("complete");
        return;
      }
      const endedTrack = listenTrackRef.current;

      if (endedTrack?.mediaType === PODCAST_MEDIA_TYPE) {
        await reportPodcastListenIfReady(endedTrack.duration);
        setIsPlaying(false);
        setIsBuffering(false);
        return;
      }

      if (endedTrack?.trackId) {
        await flushCurrentListenAttempt();
      }

      if (
        repeatModeRef.current === "one" &&
        currentIndexRef.current >= 0 &&
        currentIndexRef.current < queueRef.current.length
      ) {
        await playTrackByIndexRef.current?.(currentIndexRef.current, null, {
          skipListenFlush: true,
        });
        return;
      }

      const nextIndex = currentIndexRef.current + 1;

      if (nextIndex < queueRef.current.length) {
        await maybePlayAdvertisementRef.current?.(() =>
          playTrackByIndexRef.current?.(nextIndex, null, { skipListenFlush: true })
        );
        return;
      }

      if (repeatModeRef.current === "all" && queueRef.current.length > 0) {
        await maybePlayAdvertisementRef.current?.(() =>
          playTrackByIndexRef.current?.(0, null, { skipListenFlush: true })
        );
        return;
      }

      await maybePlayAdvertisementRef.current?.(() =>
        playRandomPlaybackTrack({ skipListenFlush: true })
      );
    };

    const handleError = () => {
      if (playerModeRef.current === PLAYER_MODE_AD) {
        void finishAdvertisementRef.current?.("skip");
        return;
      }
      setIsPlaying(false);
      setIsBuffering(false);
      setErrorMessage("Unable to stream this track right now.");
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("waiting", handleWaiting);
    audio.addEventListener("playing", handlePlaying);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);

    return () => {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("waiting", handleWaiting);
      audio.removeEventListener("playing", handlePlaying);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
      releaseCurrentObjectUrl();
      audioRef.current = null;
      liricleRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    flushCurrentListenAttempt,
    reportPodcastListenIfReady,
    trackListenProgress,
  ]);

  useEffect(() => {
    if (!audioRef.current) {
      return;
    }

    audioRef.current.volume = volume;
  }, [volume]);

  useEffect(() => {
    if (!audioRef.current) {
      return;
    }

    const storedPlaybackState = initialStoredPlaybackStateRef.current;

    if (!storedPlaybackState) {
      return;
    }

    let isCancelled = false;

    const restorePlaybackState = async () => {
      isRestoringPlaybackRef.current = true;

      try {
        const {
          currentTrackId,
          currentPlaybackTrackId,
          queueTrackIds,
          queuePlaybackTrackIds,
          queueTracks,
          currentIndex: persistedCurrentIndex,
          currentTime: persistedCurrentTime,
          shuffle,
          repeatMode: persistedRepeatMode,
        } = storedPlaybackState;
        const resolvedCurrentIndex =
          queueTrackIds[persistedCurrentIndex] === currentTrackId
            ? persistedCurrentIndex
            : queueTrackIds.findIndex(
                (trackId) => String(trackId) === String(currentTrackId)
              );

        if (resolvedCurrentIndex < 0) {
          clearPlaybackState();
          return;
        }

        const restoredQueue = queueTrackIds.map((trackId, index) =>
          createPersistedQueueTrack(
            trackId,
            queuePlaybackTrackIds[index] || trackId,
            index,
            queueTracks[index]
          )
        );
        const restoredCurrentIndex =
          restoredQueue[resolvedCurrentIndex] ? resolvedCurrentIndex : -1;

        if (restoredCurrentIndex < 0) {
          clearPlaybackState();
          return;
        }

        const restoredCurrentTrack = restoredQueue[restoredCurrentIndex];
        let playbackSource = null;

        if (
          isPodcastMedia(restoredCurrentTrack) &&
          restoredCurrentTrack.streamUrl
        ) {
          playbackSource = {
            url: restoredCurrentTrack.streamUrl,
            track: restoredCurrentTrack.raw || restoredCurrentTrack,
          };
        } else {
          try {
            playbackSource = await getTrackPlaybackSource(
              currentPlaybackTrackId || currentTrackId
            );
          } catch {
            if (!isCancelled) {
              clearPlaybackState();
            }
            return;
          }
        }

        if (isCancelled || !playbackSource?.url) {
          return;
        }

        const hydratedCurrentTrack = {
          ...restoredCurrentTrack,
          id: getExplicitTrackId(playbackSource.track) || restoredCurrentTrack.id,
          title: playbackSource.track?.title || restoredCurrentTrack.title,
          versionTitle:
            playbackSource.track?.versionTitle || restoredCurrentTrack.versionTitle || "",
          artist: playbackSource.track?.artist || restoredCurrentTrack.artist,
          artistName: getArtistName(playbackSource.track, restoredCurrentTrack.artistName),
          duration:
            Number(playbackSource.track?.duration) || restoredCurrentTrack.duration,
          image: getTrackImage(playbackSource.track, restoredCurrentTrack.image),
          playbackTrackId:
            getExplicitTrackId(playbackSource.track) ||
            restoredCurrentTrack.playbackTrackId,
          playback: playbackSource.track?.playback || restoredCurrentTrack.playback,
          lyricsSyncUrl:
            resolveTrackLyricsSyncUrl(playbackSource.track) ||
            restoredCurrentTrack.lyricsSyncUrl,
          raw: playbackSource.track || restoredCurrentTrack.raw,
          streamUrl: playbackSource.url,
        };
        const hydratedQueue = replaceQueueTrack(
          restoredQueue,
          getQueueItemId(restoredCurrentTrack),
          hydratedCurrentTrack
        );

        syncOrderedQueueState(hydratedQueue);
        syncQueueState(hydratedQueue);
        currentIndexRef.current = restoredCurrentIndex;
        setCurrentIndex(restoredCurrentIndex);
        setCurrentTrack(hydratedCurrentTrack);
        setCurrentTime(Math.max(Number(persistedCurrentTime) || 0, 0));
        setIsPlaying(false);
        setIsShuffleEnabled(shuffle);
        setRepeatMode(persistedRepeatMode);

        await playTrackByIndexRef.current?.(restoredCurrentIndex, hydratedQueue, {
          autoplay: false,
          resumeTime: persistedCurrentTime,
          skipListenFlush: true,
        });
      } finally {
        if (!isCancelled) {
          isRestoringPlaybackRef.current = false;
        }
      }
    };

    restorePlaybackState();

    return () => {
      isCancelled = true;
    };
    // Restore persisted playback once after the audio element is ready.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isRestoringPlaybackRef.current || playerMode === PLAYER_MODE_AD) {
      return;
    }

    const currentTrackId = String(currentTrack?.id || "").trim();
    const currentPlaybackTrackId = String(
      currentTrack?.playbackTrackId || currentTrack?.id || ""
    ).trim();
    const queueTrackIds = queue
      .map((track) =>
        String(track?.id || track?.playbackTrackId || "").trim()
      )
      .filter(Boolean);
    const queuePlaybackTrackIds = queue
      .map((track) =>
        String(track?.playbackTrackId || track?.id || "").trim()
      )
      .filter(Boolean);
    const queueTracks = queue.map(createStoredQueueTrack);
    const resolvedCurrentIndex =
      queueTrackIds[currentIndex] === currentTrackId
        ? currentIndex
        : queueTrackIds.findIndex(
            (trackId) => trackId === currentTrackId
          );

    if (
      !currentTrackId ||
      !currentPlaybackTrackId ||
      queueTrackIds.length === 0 ||
      queuePlaybackTrackIds.length !== queueTrackIds.length ||
      queueTracks.some(
        (track) => !track.id || !track.playbackTrackId
      ) ||
      resolvedCurrentIndex < 0 ||
      resolvedCurrentIndex >= queueTrackIds.length
    ) {
      clearStoredPlaybackState();
      return;
    }

    persistPlaybackState({
      currentTrackId,
      currentPlaybackTrackId,
      queueTrackIds,
      queuePlaybackTrackIds,
      queueTracks,
      currentIndex: resolvedCurrentIndex,
      currentTime: Math.max(Math.floor(Number(currentTime) || 0), 0),
      isPlaying,
      shuffle: isShuffleEnabled,
      repeatMode,
      volume,
      updatedAt: Date.now(),
    });
  }, [
    currentIndex,
    currentTime,
    currentTrack,
    playerMode,
    isPlaying,
    isShuffleEnabled,
    queue,
    repeatMode,
    volume,
  ]);

  playTrackByIndexRef.current = async (
    nextIndex,
    incomingQueue = null,
    options = {}
  ) => {
    if (playerModeRef.current === PLAYER_MODE_AD) {
      setRestrictionMessage("Quảng cáo đang phát. Vui lòng chờ hoặc bỏ qua khi được phép.");
      return;
    }
    const audio = audioRef.current;
    const workingQueue = incomingQueue || queueRef.current;
    const nextTrack = workingQueue?.[nextIndex];
    const nextTrackIsPodcast = isPodcastMedia(nextTrack);
    const nextTrackPlaybackId = nextTrack?.playbackTrackId || nextTrack?.id;
    const nextQueueItemId = getQueueItemId(nextTrack);
    const isQueueSwitch =
      Array.isArray(incomingQueue) && incomingQueue !== queueRef.current;
    const shouldFlushCurrentListen =
      !options.skipListenFlush &&
      Boolean(listenTrackRef.current?.trackId) &&
      (
        isQueueSwitch ||
        currentIndexRef.current !== nextIndex ||
        listenTrackRef.current.trackId !== nextTrackPlaybackId
      );

    if (!audio || !nextTrack) {
      return;
    }

    if (!isPlayableTrack(nextTrack)) {
      const nextPlayableIndex = workingQueue.findIndex(
        (queueTrack, queueIndex) =>
          queueIndex > nextIndex && isPlayableTrack(queueTrack)
      );

      if (nextPlayableIndex >= 0) {
        await playTrackByIndexRef.current?.(
          nextPlayableIndex,
          incomingQueue,
          options
        );
      } else {
        setErrorMessage("Không còn bài hát khả dụng để phát trong danh sách này.");
      }

      return;
    }

    if (shouldFlushCurrentListen) {
      await flushCurrentListenAttempt();
    }

    playbackRequestIdRef.current += 1;
    const requestId = playbackRequestIdRef.current;
    const lyricsThemeIndex = getRandomLyricsThemeIndex(
      currentLyricsThemeIndexRef.current
    );
    const preferredQualityLabel = isPremiumRef.current
      ? options.preferredQualityLabel || selectedQualityLabelRef.current || ""
      : "";
    const preferredQualityUrl = isPremiumRef.current
      ? options.preferredQualityUrl || ""
      : "";
    const preferredQualityBitrate = isPremiumRef.current
      ? Number(options.preferredQualityBitrate) ||
        selectedQualityBitrateRef.current ||
        0
      : 0;

    currentIndexRef.current = nextIndex;
    currentLyricsThemeIndexRef.current = lyricsThemeIndex;
    setCurrentIndex(nextIndex);
    setCurrentTrack({
      ...nextTrack,
      lyricsThemeIndex,
    });
    setCurrentTime(0);
    setDuration(nextTrack.duration || 0);
    setErrorMessage("");
    setRestrictionMessage("");
    setIsBuffering(true);
    resetLyricsState();

    try {
      let source = null;
      const shouldHydratePlayback =
        !nextTrackIsPodcast &&
        Boolean(nextTrack.playbackTrackId) &&
        (!nextTrack.streamUrl || !nextTrack.lyricsSyncUrl || !nextTrack.playback);

      if (!shouldHydratePlayback && nextTrack.streamUrl) {
        source = {
          url: (preferredQualityLabel || preferredQualityUrl || preferredQualityBitrate)
            ? resolveTrackMediaUrlForQuality(nextTrack, {
                label: preferredQualityLabel,
                url: preferredQualityUrl,
                bitrate: preferredQualityBitrate,
              }) || nextTrack.streamUrl
            : nextTrack.streamUrl,
          revokeOnChange: false,
          track: nextTrack.raw,
        };
      } else {
        source = await getTrackPlaybackSource(getPlaybackRequestTrackId(nextTrack), {
          preferredQualityLabel,
          preferredQualityUrl,
          preferredQualityBitrate,
        });
      }

      if (!source?.url) {
        throw new Error("No playback source was returned for this track.");
      }

      if (requestId !== playbackRequestIdRef.current) {
        if (source.revokeOnChange) {
          URL.revokeObjectURL(source.url);
        }

        return;
      }

      const hydratedTrackSource = source.track || nextTrack.raw || nextTrack;
      const activeQuality = resolveSelectedQuality(
        hydratedTrackSource,
        source.url,
        preferredQualityBitrate
      );
      const hydratedTrack = {
        ...nextTrack,
        queueItemId: nextQueueItemId,
        id: getExplicitTrackId(source.track) || nextTrack.id,
        lyricsThemeIndex,
        title: source.track?.title || nextTrack.title,
        versionTitle: source.track?.versionTitle || nextTrack.versionTitle || "",
        artist: source.track?.artist || nextTrack.artist,
        artistName: getArtistName(source.track, nextTrack.artistName),
        duration: Number(source.track?.duration) || nextTrack.duration,
        image: getTrackImage(source.track, nextTrack.image),
        playbackTrackId:
          getExplicitTrackId(source.track) ||
          nextTrack.playbackTrackId,
        playback: source.track?.playback || nextTrack.playback,
        mediaType: nextTrack.mediaType,
        contentType: nextTrack.contentType,
        lyricsSyncUrl:
          resolveTrackLyricsSyncUrl(source.track) || nextTrack.lyricsSyncUrl,
        raw: source.track || nextTrack.raw,
        streamUrl: source.url,
        activeQualityLabel: activeQuality?.label || "",
        activeQualityBitrate: activeQuality?.bitrate || 0,
      };

      const hydratedQueue = replaceQueueTrack(
        workingQueue,
        nextQueueItemId,
        hydratedTrack
      );
      const hydratedOrderedQueue = replaceQueueTrack(
        orderedQueueRef.current,
        nextQueueItemId,
        hydratedTrack
      );
      const shouldPreserveListenProgress =
        Boolean(options.skipListenFlush) &&
        listenTrackRef.current.trackId ===
          (hydratedTrack.playbackTrackId || hydratedTrack.id);
      const preservedListenedDuration = shouldPreserveListenProgress
        ? listenedDurationRef.current
        : 0;
      const preservedCurrentTime =
        shouldPreserveListenProgress && Number.isFinite(Number(options.resumeTime))
          ? Number(options.resumeTime) || 0
          : 0;

      listenTrackRef.current = {
        trackId: hydratedTrack.playbackTrackId || hydratedTrack.id,
        mediaType: isPodcastMedia(hydratedTrack)
          ? PODCAST_MEDIA_TYPE
          : "track",
        duration: hydratedTrack.duration || 0,
        source: isPodcastMedia(hydratedTrack)
          ? "podcast_detail"
          : resolveListenSource(hydratedTrack.listenSource),
        hasReported: false,
        isReporting: false,
      };
      resetListenProgress({
        listenedDuration: preservedListenedDuration,
        currentTime: preservedCurrentTime,
        ignoreNextDelta: true,
      });

      syncQueueState(hydratedQueue);
      syncOrderedQueueState(hydratedOrderedQueue);
      setCurrentTrack(hydratedTrack);
      syncQualityState(hydratedTrack, source.url, preferredQualityBitrate);
      releaseCurrentObjectUrl();
      objectUrlRef.current = source.revokeOnChange ? source.url : "";
      audio.pause();
      audio.src = source.url;
      audio.load();
      await loadLyricsForTrack(hydratedTrack);

      if (Number.isFinite(Number(options.resumeTime)) && Number(options.resumeTime) > 0) {
        await waitForAudioMetadata(audio);

        const maxDuration = Number.isFinite(audio.duration)
          ? audio.duration
          : hydratedTrack.duration || 0;
        const boundedResumeTime =
          maxDuration > 0
            ? Math.min(Math.max(Number(options.resumeTime) || 0, 0), maxDuration)
            : Math.max(Number(options.resumeTime) || 0, 0);

        audio.currentTime = boundedResumeTime;
        lastTrackedAudioTimeRef.current = boundedResumeTime;
        ignoreNextListenDeltaRef.current = true;
        setCurrentTime(boundedResumeTime);
        syncLyricsRef.current?.(boundedResumeTime, true);
      }

      if (options.autoplay === false) {
        setIsPlaying(false);
        setIsBuffering(false);
        return;
      }

      await audio.play();
    } catch (error) {
      if (requestId !== playbackRequestIdRef.current) {
        return;
      }

      setIsPlaying(false);
      setIsBuffering(false);
      setErrorMessage(
        getApiErrorMessage(
          error,
          "Unable to start playback for this track."
        )
      );
    }
  };

  const playCollection = async (
    tracks,
    { startIndex = 0, collection = null, shuffle, autoplay } = {}
  ) => {
    const normalizedQueue = normalizeQueue(tracks, collection);

    if (normalizedQueue.length === 0) {
      setErrorMessage("This collection does not have any playable tracks yet.");
      return;
    }

    const safeIndex =
      startIndex >= 0 && startIndex < normalizedQueue.length ? startIndex : 0;
    const shouldShuffle =
      typeof shuffle === "boolean" ? shuffle : isShuffleEnabledRef.current;
    const selectedQueueItemId = getQueueItemId(normalizedQueue[safeIndex]);
    const { queue: queueToPlay, currentIndex: playbackStartIndex } = shouldShuffle
      ? buildShuffledQueue(normalizedQueue, {
          currentQueueItemId: selectedQueueItemId,
        })
      : {
          queue: normalizedQueue,
          currentIndex: safeIndex,
        };

    setActiveCollection(collection);
    setRestrictionMessage("");
    syncOrderedQueueState(normalizedQueue);
    syncQueueState(queueToPlay);

    if (typeof shuffle === "boolean") {
      setIsShuffleEnabled(shuffle);
    }

    await playTrackByIndexRef.current?.(playbackStartIndex, queueToPlay, {
      ...(typeof autoplay === "boolean" ? { autoplay } : {}),
    });
  };

  finishAdvertisementRef.current = async (eventType = "complete") => {
    if (playerModeRef.current !== PLAYER_MODE_AD) return;
    const audio = audioRef.current;
    const decision = currentAdDecisionRef.current;
    const nextAction = pendingAfterAdRef.current;
    if (decision?.decisionToken) {
      await recordAdvertisementEvent({
        decisionToken: decision.decisionToken,
        eventType,
        playedSeconds: Number(audio?.currentTime) || 0,
      });
    }
    playerModeRef.current = PLAYER_MODE_TRACK;
    currentAdDecisionRef.current = null;
    pendingAfterAdRef.current = null;
    adEventStartedRef.current = false;
    setPlayerMode(PLAYER_MODE_TRACK);
    setCurrentAd(null);
    setCanSkipAd(false);
    setCurrentTime(0);
    setDuration(0);
    if (typeof nextAction === "function") await nextAction();
  };

  maybePlayAdvertisementRef.current = async (nextAction, placement = "between_tracks") => {
    if (isPremiumRef.current || playerModeRef.current === PLAYER_MODE_AD) {
      await nextAction();
      return;
    }
    try {
      const decision = await requestAdvertisementDecision({
        type: "audio",
        placement,
        transitionId: typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `transition-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      });
      const ad = decision?.advertisement;
      if (!ad?.mediaUrl) {
        await nextAction();
        return;
      }
      const audio = audioRef.current;
      if (!audio) {
        await nextAction();
        return;
      }
      playerModeRef.current = PLAYER_MODE_AD;
      currentAdDecisionRef.current = decision;
      pendingAfterAdRef.current = nextAction;
      adEventStartedRef.current = false;
      setPlayerMode(PLAYER_MODE_AD);
      setCurrentAd(ad);
      setCanSkipAd(Boolean(ad.skipEnabled) && Number(ad.skipAfterSeconds) <= 0);
      setCurrentTime(0);
      setDuration(Number(ad.duration) || 0);
      setIsBuffering(true);
      resetLyricsState();
      releaseCurrentObjectUrl();
      audio.pause();
      audio.src = ad.mediaUrl;
      audio.load();
      await audio.play();
    } catch {
      playerModeRef.current = PLAYER_MODE_TRACK;
      currentAdDecisionRef.current = null;
      pendingAfterAdRef.current = null;
      adEventStartedRef.current = false;
      setPlayerMode(PLAYER_MODE_TRACK);
      setCurrentAd(null);
      setCanSkipAd(false);
      await nextAction();
    }
  };

  const addTrackToQueue = (track, options = {}) => {
    const baseTrack = track?.track ?? track ?? null;

    if (!baseTrack || !getTrackId(baseTrack) || !isPlayableTrack(track)) {
      return;
    }

    const nextQueueTrack = createManualQueueTrack(track, options);
    const activeQueueItemId = getQueueItemId(
      currentTrack || queueRef.current[currentIndexRef.current]
    );
    const nextQueue = insertTrackAfterActiveManualQueue(
      queueRef.current,
      nextQueueTrack,
      activeQueueItemId
    );
    const nextOrderedQueue = insertTrackAfterActiveManualQueue(
      orderedQueueRef.current,
      nextQueueTrack,
      activeQueueItemId
    );

    syncQueueState(nextQueue);
    syncOrderedQueueState(nextOrderedQueue);
    setErrorMessage("");
    setRestrictionMessage("");
  };

  const playTrack = async (track, options = {}) => {
    if (options.preserveQueue && queueRef.current.length > 0) {
      const selectedTrackId = getTrackId(track);
      const matchesSelectedTrack = (queueTrack) =>
        String(getTrackId(queueTrack) || "") === String(selectedTrackId || "");
      const currentQueue = queueRef.current;
      const currentQueueIndex = currentIndexRef.current;
      const currentQueueItemId = getQueueItemId(
        currentQueue[currentQueueIndex]
      );
      const orderedCurrentQueueIndexBeforeRemoval = currentQueueItemId
        ? findQueueTrackIndex(orderedQueueRef.current, currentQueueItemId)
        : -1;
      const selectedTrackIndex = currentQueue.findIndex(matchesSelectedTrack);
      const queueWithoutSelectedTrack =
        selectedTrackIndex >= 0
          ? removeQueueTrack(
              currentQueue,
              getQueueItemId(currentQueue[selectedTrackIndex])
            )
          : currentQueue;
      const orderedQueueWithoutSelectedTrack =
        selectedTrackIndex >= 0
          ? orderedQueueRef.current.filter(
              (queueTrack) => !matchesSelectedTrack(queueTrack)
            )
          : orderedQueueRef.current;
      const adjustedCurrentQueueIndex =
        currentQueueIndex >= 0 && selectedTrackIndex >= 0 &&
        selectedTrackIndex <= currentQueueIndex
          ? currentQueueIndex - 1
          : currentQueueIndex;
      const nextQueueIndex =
        adjustedCurrentQueueIndex >= 0
          ? adjustedCurrentQueueIndex + 1
          : 0;
      const nextTrack = createManualQueueTrack(track, options);
      const nextQueue = [
        ...queueWithoutSelectedTrack.slice(0, nextQueueIndex),
        nextTrack,
        ...queueWithoutSelectedTrack.slice(nextQueueIndex),
      ];
      const orderedCurrentQueueIndex = currentQueueItemId
        ? findQueueTrackIndex(
            orderedQueueWithoutSelectedTrack,
            currentQueueItemId
          )
        : -1;
      let nextOrderedQueueIndex = Math.min(
        Math.max(nextQueueIndex, 0),
        orderedQueueWithoutSelectedTrack.length
      );

      if (orderedCurrentQueueIndex >= 0) {
        nextOrderedQueueIndex = orderedCurrentQueueIndex + 1;
      } else if (orderedCurrentQueueIndexBeforeRemoval >= 0) {
        nextOrderedQueueIndex = orderedCurrentQueueIndexBeforeRemoval;
      }
      const nextOrderedQueue = [
        ...orderedQueueWithoutSelectedTrack.slice(0, nextOrderedQueueIndex),
        nextTrack,
        ...orderedQueueWithoutSelectedTrack.slice(nextOrderedQueueIndex),
      ];

      syncQueueState(nextQueue);
      syncOrderedQueueState(nextOrderedQueue);
      setActiveCollection(options.collection || activeCollection);
      setErrorMessage("");
      setRestrictionMessage("");

      await playTrackByIndexRef.current?.(nextQueueIndex, nextQueue);
      return;
    }

    const queueToPlay =
      Array.isArray(options.queue) && options.queue.length > 0
        ? options.queue
        : [track];

    const playableQueue = queueToPlay.filter(isPlayableTrack);

    const normalizedTrack = normalizeQueueTrack(track, {
      image: options.collection?.image,
      artistName: options.collection?.artistName,
      collectionId: options.collection?.id,
      collectionType: options.collection?.type,
      listenSource: options.collection?.listenSource,
    });

    const explicitStartIndex =
      typeof options.startIndex === "number" ? options.startIndex : -1;

    const fallbackStartIndex = queueToPlay.findIndex((queueItem) => {
      const candidate = queueItem?.track ?? queueItem;
      return getTrackId(candidate) === normalizedTrack.id;
    });

    const requestedQueueIndex =
      explicitStartIndex >= 0 && explicitStartIndex < queueToPlay.length
        ? explicitStartIndex
        : Math.max(fallbackStartIndex, 0);
    const requestedTrackIsPlayable =
      isPlayableTrack(track) && isPlayableTrack(queueToPlay[requestedQueueIndex]);
    const playbackSourceIndex = requestedTrackIsPlayable
      ? requestedQueueIndex
      : queueToPlay.findIndex(
          (queueItem, queueIndex) =>
            queueIndex > requestedQueueIndex && isPlayableTrack(queueItem)
        );

    if (playbackSourceIndex < 0) {
      setErrorMessage("Không còn bài hát khả dụng để phát trong danh sách này.");
      return;
    }

    const playableStartIndex = queueToPlay
      .slice(0, playbackSourceIndex)
      .filter(isPlayableTrack).length;

    await playCollection(playableQueue, {
      startIndex: playableStartIndex,
      collection: options.collection || null,
    });
  };

  const playPodcast = async (podcast, options = {}) => {
    const podcastId = getTrackId(podcast);

    if (!podcastId) {
      setErrorMessage("Podcast này không có mã nội dung hợp lệ.");
      return;
    }

    const podcastTrack = {
      ...podcast,
      id: podcastId,
      playbackTrackId: podcastId,
      mediaType: PODCAST_MEDIA_TYPE,
      contentType: PODCAST_MEDIA_TYPE,
      image: podcast?.coverImageUrl || podcast?.image || podcast?.creator?.avatar || "",
      artistName: podcast?.creator?.name || podcast?.artistName || "Nghệ sĩ",
      streamUrl: podcast?.audioUrl || podcast?.streamUrl || "",
      listenSource: "podcast_detail",
      raw: podcast,
    };

    await playCollection([podcastTrack], {
      startIndex: 0,
      shuffle: false,
      autoplay: options.autoplay,
      collection: {
        id: podcastId,
        type: PODCAST_MEDIA_TYPE,
        title: podcast?.title || "Podcast",
        image: podcastTrack.image,
        artistName: podcastTrack.artistName,
        listenSource: "podcast_detail",
      },
    });
  };

  const playAlbum = async (album, tracks = [], options = {}) => {
    const albumTracks = tracks.length > 0 ? tracks : album?.tracks ?? [];

    await playCollection(albumTracks, {
      startIndex: 0,
      shuffle: options.shuffle,
      collection: {
        id: album?.id,
        type: "album",
        title: album?.title || "Album",
        image: album?.coverImage || "",
        artistName: album?.artist?.name || "",
      },
    });
  };

  const playPlaylist = async (playlist, tracks = [], options = {}) => {
    const playlistTracks = tracks.length > 0 ? tracks : playlist?.tracks ?? [];

    await playCollection(playlistTracks, {
      startIndex: 0,
      shuffle: options.shuffle,
      collection: {
        id: playlist?.id,
        type: "playlist",
        title: playlist?.title || playlist?.name || "Playlist",
        image: playlist?.coverImage || playlist?.image || "",
        artistName: playlist?.owner?.name || playlist?.artist?.name || "",
      },
    });
  };

  const togglePlayPause = async () => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    if (audio.paused) {
      if (audio.src) {
        await audio.play();
        return;
      }

      if (queueRef.current.length > 0) {
        await playTrackByIndexRef.current?.(
          currentIndexRef.current >= 0 ? currentIndexRef.current : 0
        );
      }

      return;
    }

    audio.pause();
  };

  const playNext = async () => {
    if (playerModeRef.current === PLAYER_MODE_AD) return;
    let nextIndex = currentIndexRef.current + 1;

    if (nextIndex >= queueRef.current.length) {
      if (repeatModeRef.current === "all" && queueRef.current.length > 0) {
        nextIndex = 0;
      } else {
        await maybePlayAdvertisementRef.current?.(() => playRandomPlaybackTrack());
        return;
      }
    }

    await maybePlayAdvertisementRef.current?.(() => playTrackByIndexRef.current?.(nextIndex));
  };

  const playPrevious = async () => {
    if (playerModeRef.current === PLAYER_MODE_AD) return;
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    if (audio.currentTime > 5) {
      audio.currentTime = 0;
      setCurrentTime(0);
      syncLyricsRef.current?.(0, true);
      return;
    }

    const previousIndex = currentIndexRef.current - 1;

    if (previousIndex < 0) {
      if (repeatModeRef.current === "all" && queueRef.current.length > 0) {
        await playTrackByIndexRef.current?.(queueRef.current.length - 1);
        return;
      }

      audio.currentTime = 0;
      setCurrentTime(0);
      syncLyricsRef.current?.(0, true);
      return;
    }

    await playTrackByIndexRef.current?.(previousIndex);
  };

  const seekTo = (nextTime) => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    if (playerModeRef.current === PLAYER_MODE_AD) return;

    if (!isPodcastMedia(currentTrack) && !isPremiumRef.current) {
      setRestrictionMessage(
        "Seeking on the progress bar is available for Premium listeners only."
      );
      return;
    }

    const boundedTime = Math.min(
      Math.max(Number(nextTime) || 0, 0),
      Number.isFinite(audio.duration) ? audio.duration : duration
    );

    setRestrictionMessage("");
    audio.currentTime = boundedTime;
    lastTrackedAudioTimeRef.current = boundedTime;
    ignoreNextListenDeltaRef.current = true;
    setCurrentTime(boundedTime);
    syncLyricsRef.current?.(boundedTime, true);
  };

  const seekBy = (seconds) => {
    const audio = audioRef.current;

    if (!audio || !currentTrack || playerModeRef.current === PLAYER_MODE_AD) {
      return;
    }

    if (!isPodcastMedia(currentTrack)) {
      seekTo((Number(audio.currentTime) || currentTime) + Number(seconds || 0));
      return;
    }

    const maxTime = Number.isFinite(audio.duration) ? audio.duration : duration;
    const boundedTime = Math.min(
      Math.max((Number(audio.currentTime) || currentTime) + Number(seconds || 0), 0),
      maxTime || Number.MAX_SAFE_INTEGER
    );

    audio.currentTime = boundedTime;
    lastTrackedAudioTimeRef.current = boundedTime;
    ignoreNextListenDeltaRef.current = true;
    setCurrentTime(boundedTime);
    syncLyricsRef.current?.(boundedTime, true);
  };

  const changeAudioQuality = async (nextQuality) => {
    if (!isPremiumRef.current) {
      setRestrictionMessage(
        "Audio quality switching is available for Premium listeners only."
      );
      return;
    }

    if (!currentTrack || currentIndexRef.current < 0) {
      return;
    }

    const normalizedLabel =
      typeof nextQuality === "string"
        ? nextQuality.trim().toLowerCase()
        : typeof nextQuality?.label === "string"
          ? nextQuality.label.trim().toLowerCase()
          : "";
    const normalizedUrl =
      typeof nextQuality === "object" && nextQuality !== null
        ? nextQuality.url || ""
        : "";
    const normalizedBitrate =
      typeof nextQuality === "object" && nextQuality !== null
        ? Number(nextQuality.bitrate) || 0
        : 0;

    const qualityOptions = getTrackQualityOptions(currentTrack);
    const targetQuality =
      qualityOptions.find(
        (quality) =>
          normalizedBitrate > 0 && quality.bitrate === normalizedBitrate
      ) ||
      qualityOptions.find(
        (quality) =>
          !normalizedBitrate && quality.url === normalizedUrl
      ) ||
      qualityOptions.find((quality) => quality.label === normalizedLabel);

    if (!targetQuality) {
      setRestrictionMessage("This track does not provide that audio quality.");
      return;
    }

    if (
      targetQuality.bitrate === selectedQualityBitrateRef.current ||
      (
        !normalizedBitrate &&
        normalizedLabel &&
        normalizedLabel === selectedQualityLabelRef.current &&
        qualityOptions.filter((quality) => quality.label === normalizedLabel).length === 1
      )
    ) {
      return;
    }

    const audio = audioRef.current;
    const resumeTime = Number(audio?.currentTime) || currentTime;
    const wasPlaying = audio ? !audio.paused : isPlaying;

    setRestrictionMessage("");
    await playTrackByIndexRef.current?.(currentIndexRef.current, queueRef.current, {
      preferredQualityLabel: targetQuality.label,
      preferredQualityUrl: targetQuality.url,
      preferredQualityBitrate: targetQuality.bitrate,
      resumeTime,
      autoplay: wasPlaying,
      skipListenFlush: true,
    });
  };

  const setVolumeLevel = (nextVolume) => {
    const boundedVolume = Math.min(Math.max(Number(nextVolume) || 0, 0), 1);

    if (audioRef.current) {
      audioRef.current.volume = boundedVolume;
    }

    setVolume(boundedVolume);
  };

  const removeTrackFromQueue = async (targetIndex) => {
    if (
      !Number.isInteger(targetIndex) ||
      targetIndex < 0 ||
      targetIndex >= queueRef.current.length
    ) {
      return;
    }

    const targetTrack = queueRef.current[targetIndex];
    const targetQueueItemId = getQueueItemId(targetTrack);
    const nextQueue = queueRef.current.filter((_, index) => index !== targetIndex);
    const nextOrderedQueue = removeQueueTrack(
      orderedQueueRef.current,
      targetQueueItemId
    );
    const activeIndex = currentIndexRef.current;

    if (nextQueue.length === 0) {
      if (listenTrackRef.current?.trackId) {
        await flushCurrentListenAttempt();
      }

      clearPlaybackState();
      return;
    }

    if (activeIndex < 0 || targetIndex > activeIndex) {
      syncOrderedQueueState(nextOrderedQueue);
      syncQueueState(nextQueue);
      return;
    }

    if (targetIndex < activeIndex) {
      const nextIndex = activeIndex - 1;
      currentIndexRef.current = nextIndex;
      syncOrderedQueueState(nextOrderedQueue);
      syncQueueState(nextQueue);
      setCurrentIndex(nextIndex);
      return;
    }

    const audio = audioRef.current;
    const nextIndex =
      targetIndex < nextQueue.length ? targetIndex : nextQueue.length - 1;

    syncOrderedQueueState(nextOrderedQueue);
    await playTrackByIndexRef.current?.(nextIndex, nextQueue, {
      autoplay: audio ? !audio.paused : isPlaying,
    });
  };

  const playFromQueueIndex = async (targetIndex) => {
    if (
      !Number.isInteger(targetIndex) ||
      targetIndex < 0 ||
      targetIndex >= queueRef.current.length
    ) {
      return;
    }

    await playTrackByIndexRef.current?.(targetIndex);
  };

  const toggleShuffle = () => {
    const nextShuffleEnabled = !isShuffleEnabledRef.current;

    setIsShuffleEnabled(nextShuffleEnabled);

    if (orderedQueueRef.current.length === 0) {
      return;
    }

    const activeQueueItemId = getQueueItemId(
      currentTrack || queueRef.current[currentIndexRef.current]
    );

    if (!nextShuffleEnabled) {
      const restoredIndex = activeQueueItemId
        ? findQueueTrackIndex(orderedQueueRef.current, activeQueueItemId)
        : currentIndexRef.current;
      const safeIndex =
        restoredIndex >= 0
          ? restoredIndex
          : Math.min(
              Math.max(currentIndexRef.current, 0),
              orderedQueueRef.current.length - 1
            );

      syncQueueState(orderedQueueRef.current);
      currentIndexRef.current = safeIndex;
      setCurrentIndex(safeIndex);

      if (safeIndex >= 0) {
        setCurrentTrack(orderedQueueRef.current[safeIndex]);
      }

      return;
    }

    const { queue: shuffledQueue, currentIndex: shuffledIndex } = buildShuffledQueue(
      orderedQueueRef.current,
      {
        currentQueueItemId: activeQueueItemId,
        preserveHistory: true,
      }
    );

    syncQueueState(shuffledQueue);
    currentIndexRef.current = shuffledIndex;
    setCurrentIndex(shuffledIndex);

    if (shuffledIndex >= 0) {
      setCurrentTrack(shuffledQueue[shuffledIndex]);
    }
  };

  const cycleRepeatMode = () => {
    setRepeatMode((currentValue) => {
      const currentModeIndex = REPEAT_MODE_SEQUENCE.indexOf(currentValue);
      const nextModeIndex =
        currentModeIndex >= 0
          ? (currentModeIndex + 1) % REPEAT_MODE_SEQUENCE.length
          : 0;

      return REPEAT_MODE_SEQUENCE[nextModeIndex];
    });
  };

  const skipCurrentAd = async () => {
    const ad = currentAdDecisionRef.current?.advertisement;
    const audio = audioRef.current;
    if (
      playerModeRef.current !== PLAYER_MODE_AD ||
      !ad?.skipEnabled ||
      (Number(audio?.currentTime) || 0) < (Number(ad.skipAfterSeconds) || 0)
    ) return;
    await finishAdvertisementRef.current?.("skip");
  };

  const value = {
    queue,
    currentIndex,
    currentTrack,
    playerMode,
    currentMedia: currentTrack,
    currentAd,
    canSkipAd,
    isPlaying,
    isBuffering,
    currentTime,
    duration,
    volume,
    errorMessage,
    restrictionMessage,
    activeCollection,
    lyricsLines,
    activeLyricLineIndex,
    activeLyricWordIndex,
    isLyricsLoading,
    lyricsErrorMessage,
    isPremium,
    canSeek: playerMode !== PLAYER_MODE_AD && isPremium,
    controlsLockedByAd: playerMode === PLAYER_MODE_AD,
    availableAudioQualities,
    selectedQualityLabel,
    selectedQualityBitrate,
    isShuffleEnabled,
    repeatMode,
    playTrack,
    playPodcast,
    playAlbum,
    playPlaylist,
    playCollection,
    addTrackToQueue,
    playFromQueueIndex,
    togglePlayPause,
    playNext,
    playPrevious,
    toggleShuffle,
    cycleRepeatMode,
    seekTo,
    seekBy,
    skipCurrentAd,
    changeAudioQuality,
    setVolumeLevel,
    removeTrackFromQueue,
  };

  return <PlayerContext.Provider value={ value }>{ children }</PlayerContext.Provider>;
};
