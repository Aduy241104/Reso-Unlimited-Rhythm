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

const DEFAULT_VOLUME = 0.75;
const FREE_SKIP_LIMIT = 6;
const FREE_SKIP_WINDOW_MS = 5 * 60 * 60 * 1000;
const FREE_SKIP_STORAGE_KEY = "capstone.player.free_skip_window";
const PLAYBACK_STORAGE_KEY = "capstone.player.playback_state";
const MAX_NATURAL_LISTEN_DELTA_SECONDS = 2;
const REPEAT_MODE_SEQUENCE = ["off", "all", "one"];
const MANUAL_QUEUE_SOURCE = "manual";
const CONTEXT_QUEUE_SOURCE = "context";

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

  return {
    queueItemId,
    queueSource,
    id: normalizedTrackId,
    title: track?.title || item?.title || "Untitled track",
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
    .filter((track) => Boolean(track?.id));

const createPersistedQueueTrack = (trackId, playbackTrackId, index) =>
  normalizeQueueTrack(
    {
      id: trackId,
      playbackTrackId: playbackTrackId || trackId,
      title: "Untitled track",
      artistName: "Unknown artist",
    },
    {
      index,
      collectionId: "restored-queue",
      collectionType: "queue",
      queueSource: CONTEXT_QUEUE_SOURCE,
    }
  );

const createFreeSkipWindow = (startedAt = Date.now()) => ({
  startedAt,
  skipCount: 0,
});

const getActiveFreeSkipWindow = (value, now = Date.now()) => {
  const startedAt = Number(value?.startedAt);
  const skipCount = Math.max(Math.floor(Number(value?.skipCount) || 0), 0);

  if (!Number.isFinite(startedAt) || startedAt <= 0) {
    return createFreeSkipWindow(now);
  }

  if (now - startedAt >= FREE_SKIP_WINDOW_MS) {
    return createFreeSkipWindow(now);
  }

  return {
    startedAt,
    skipCount,
  };
};

const loadStoredFreeSkipWindow = () => {
  if (typeof window === "undefined") {
    return createFreeSkipWindow();
  }

  try {
    const rawValue = window.localStorage.getItem(FREE_SKIP_STORAGE_KEY);

    if (!rawValue) {
      return createFreeSkipWindow();
    }

    return getActiveFreeSkipWindow(JSON.parse(rawValue));
  } catch {
    return createFreeSkipWindow();
  }
};

const persistFreeSkipWindow = (value) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(FREE_SKIP_STORAGE_KEY, JSON.stringify(value));
};

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

const resolveSelectedQualityLabel = (track, streamUrl = "") => {
  const qualityOptions = getTrackQualityOptions(track);

  if (qualityOptions.length === 0) {
    return "";
  }

  if (streamUrl) {
    const matchedQuality = qualityOptions.find(
      (quality) => quality.url === streamUrl
    );

    if (matchedQuality?.label) {
      return matchedQuality.label;
    }
  }

  const defaultQuality =
    qualityOptions.find((quality) => quality.isDefault) || qualityOptions[0];

  return defaultQuality?.label || "";
};

export const PlayerProvider = ({ children }) => {
  const { user } = useAuth();
  const initialStoredPlaybackStateRef = useRef(null);
  if (initialStoredPlaybackStateRef.current === null) {
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
  const [isShuffleEnabled, setIsShuffleEnabled] = useState(
    initialStoredPlaybackStateRef.current?.shuffle ?? false
  );
  const [repeatMode, setRepeatMode] = useState(
    initialStoredPlaybackStateRef.current?.repeatMode ?? "off"
  );
  const [freeSkipWindow, setFreeSkipWindow] = useState(() =>
    loadStoredFreeSkipWindow()
  );
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
  const isPremiumRef = useRef(false);
  const isShuffleEnabledRef = useRef(false);
  const repeatModeRef = useRef("off");
  const freeSkipWindowRef = useRef(freeSkipWindow);
  const listenTrackRef = useRef({
    trackId: null,
    duration: 0,
    source: "unknown",
    hasReported: false,
  });
  const listenedDurationRef = useRef(0);
  const lastTrackedAudioTimeRef = useRef(0);
  const ignoreNextListenDeltaRef = useRef(true);
  const queueMutationCounterRef = useRef(0);
  const hasAttemptedPlaybackRestoreRef = useRef(false);
  const isRestoringPlaybackRef = useRef(false);

  const isPremium = useMemo(() => hasPremiumAccess(user), [user]);

  const syncQueueState = (nextQueue) => {
    queueRef.current = nextQueue;
    setQueue(nextQueue);
  };

  const syncOrderedQueueState = (nextQueue) => {
    orderedQueueRef.current = nextQueue;
  };

  const syncQualityState = (track, streamUrl = "") => {
    const qualityOptions = getTrackQualityOptions(track);
    const nextQualityLabel = resolveSelectedQualityLabel(track, streamUrl);

    setAvailableAudioQualities(qualityOptions);
    setSelectedQualityLabel(nextQualityLabel);
    selectedQualityLabelRef.current = nextQualityLabel;
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
      duration: 0,
      source: "unknown",
      hasReported: false,
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
    selectedQualityLabelRef.current = "";
  };

  const getLatestFreeSkipWindow = (now = Date.now()) => {
    const nextWindow = getActiveFreeSkipWindow(freeSkipWindowRef.current, now);

    if (
      nextWindow.startedAt !== freeSkipWindowRef.current.startedAt ||
      nextWindow.skipCount !== freeSkipWindowRef.current.skipCount
    ) {
      freeSkipWindowRef.current = nextWindow;
      setFreeSkipWindow(nextWindow);
    }

    return nextWindow;
  };

  const consumeFreeSkip = () => {
    if (isPremiumRef.current) {
      setRestrictionMessage("");
      return true;
    }

    const currentWindow = getLatestFreeSkipWindow();

    if (currentWindow.skipCount >= FREE_SKIP_LIMIT) {
      setRestrictionMessage(
        "Free listeners can skip up to 6 tracks every 5 hours. Upgrade to Premium for unlimited skips."
      );
      return false;
    }

    const nextWindow = {
      ...currentWindow,
      skipCount: currentWindow.skipCount + 1,
    };

    freeSkipWindowRef.current = nextWindow;
    setFreeSkipWindow(nextWindow);
    setRestrictionMessage("");
    return true;
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

    if (delta > 0 && delta <= MAX_NATURAL_LISTEN_DELTA_SECONDS) {
      listenedDurationRef.current += delta;
    }

    lastTrackedAudioTimeRef.current = normalizedNextTime;
  }, []);

  const flushCurrentListenAttempt = useCallback(async () => {
    const activeListen = listenTrackRef.current;

    if (!activeListen?.trackId || activeListen.hasReported) {
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

    activeListen.hasReported = true;

    await recordListenService({
      trackId: activeListen.trackId,
      listenedDuration,
      source: activeListen.source,
    });
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
    }
  }, [isPremium]);

  useEffect(() => {
    selectedQualityLabelRef.current = selectedQualityLabel;
  }, [selectedQualityLabel]);

  useEffect(() => {
    isShuffleEnabledRef.current = isShuffleEnabled;
  }, [isShuffleEnabled]);

  useEffect(() => {
    repeatModeRef.current = repeatMode;
  }, [repeatMode]);

  useEffect(() => {
    freeSkipWindowRef.current = freeSkipWindow;
    persistFreeSkipWindow(freeSkipWindow);
  }, [freeSkipWindow]);

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
      trackListenProgress(nextTime);
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
      const endedTrack = listenTrackRef.current;
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
        await playTrackByIndexRef.current?.(nextIndex, null, {
          skipListenFlush: true,
        });
        return;
      }

      if (repeatModeRef.current === "all" && queueRef.current.length > 0) {
        await playTrackByIndexRef.current?.(0, null, {
          skipListenFlush: true,
        });
        return;
      }

      await playRandomPlaybackTrack({
        skipListenFlush: true,
      });
    };

    const handleError = () => {
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
  }, [flushCurrentListenAttempt, trackListenProgress]);

  useEffect(() => {
    if (!audioRef.current) {
      return;
    }

    audioRef.current.volume = volume;
  }, [volume]);

  useEffect(() => {
    if (hasAttemptedPlaybackRestoreRef.current || !audioRef.current) {
      return;
    }

    hasAttemptedPlaybackRestoreRef.current = true;
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
            index
          )
        );
        const restoredCurrentIndex =
          restoredQueue[resolvedCurrentIndex] ? resolvedCurrentIndex : -1;

        if (restoredCurrentIndex < 0) {
          clearPlaybackState();
          return;
        }

        syncOrderedQueueState(restoredQueue);
        syncQueueState(restoredQueue);
        currentIndexRef.current = restoredCurrentIndex;
        setCurrentIndex(restoredCurrentIndex);
        setCurrentTrack(restoredQueue[restoredCurrentIndex]);
        setCurrentTime(Math.max(Number(persistedCurrentTime) || 0, 0));
        setIsPlaying(false);
        setIsShuffleEnabled(shuffle);
        setRepeatMode(persistedRepeatMode);

        let playbackSource = null;

        try {
          playbackSource = await getTrackPlaybackSource(
            currentPlaybackTrackId || currentTrackId
          );
        } catch {
          clearPlaybackState();
          return;
        }

        if (isCancelled || !playbackSource?.url) {
          return;
        }

        const restoredCurrentTrack = restoredQueue[restoredCurrentIndex];
        const hydratedCurrentTrack = {
          ...restoredCurrentTrack,
          id: getExplicitTrackId(playbackSource.track) || restoredCurrentTrack.id,
          title: playbackSource.track?.title || restoredCurrentTrack.title,
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

        await playTrackByIndexRef.current?.(restoredCurrentIndex, hydratedQueue, {
          autoplay: false,
          resumeTime: persistedCurrentTime,
          skipListenFlush: true,
        });
      } finally {
        isRestoringPlaybackRef.current = false;
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
    if (isRestoringPlaybackRef.current) {
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
    const audio = audioRef.current;
    const workingQueue = incomingQueue || queueRef.current;
    const nextTrack = workingQueue?.[nextIndex];
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
        Boolean(nextTrack.playbackTrackId) &&
        (!nextTrack.streamUrl || !nextTrack.lyricsSyncUrl || !nextTrack.playback);

      if (!shouldHydratePlayback && nextTrack.streamUrl) {
        source = {
          url: (preferredQualityLabel || preferredQualityUrl)
            ? resolveTrackMediaUrlForQuality(nextTrack, {
                label: preferredQualityLabel,
                url: preferredQualityUrl,
              }) || nextTrack.streamUrl
            : nextTrack.streamUrl,
          revokeOnChange: false,
          track: nextTrack.raw,
        };
      } else {
        source = await getTrackPlaybackSource(getPlaybackRequestTrackId(nextTrack), {
          preferredQualityLabel,
          preferredQualityUrl,
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
      const activeQualityLabel = resolveSelectedQualityLabel(
        hydratedTrackSource,
        source.url
      );
      const hydratedTrack = {
        ...nextTrack,
        queueItemId: nextQueueItemId,
        id: getExplicitTrackId(source.track) || nextTrack.id,
        lyricsThemeIndex,
        title: source.track?.title || nextTrack.title,
        artist: source.track?.artist || nextTrack.artist,
        artistName: getArtistName(source.track, nextTrack.artistName),
        duration: Number(source.track?.duration) || nextTrack.duration,
        image: getTrackImage(source.track, nextTrack.image),
        playbackTrackId:
          getExplicitTrackId(source.track) ||
          nextTrack.playbackTrackId,
        playback: source.track?.playback || nextTrack.playback,
        lyricsSyncUrl:
          resolveTrackLyricsSyncUrl(source.track) || nextTrack.lyricsSyncUrl,
        raw: source.track || nextTrack.raw,
        streamUrl: source.url,
        activeQualityLabel,
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
        duration: hydratedTrack.duration || 0,
        source: resolveListenSource(hydratedTrack.listenSource),
        hasReported: false,
      };
      resetListenProgress({
        listenedDuration: preservedListenedDuration,
        currentTime: preservedCurrentTime,
        ignoreNextDelta: true,
      });

      syncQueueState(hydratedQueue);
      syncOrderedQueueState(hydratedOrderedQueue);
      setCurrentTrack(hydratedTrack);
      syncQualityState(hydratedTrack, source.url);
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
    { startIndex = 0, collection = null, shuffle } = {}
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

    await playTrackByIndexRef.current?.(playbackStartIndex, queueToPlay);
  };

  const addTrackToQueue = (track, options = {}) => {
    const baseTrack = track?.track ?? track ?? null;

    if (!baseTrack || !getTrackId(baseTrack)) {
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
    const queueToPlay =
      Array.isArray(options.queue) && options.queue.length > 0
        ? options.queue
        : [track];

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

    await playCollection(queueToPlay, {
      startIndex:
        explicitStartIndex >= 0
          ? explicitStartIndex
          : Math.max(fallbackStartIndex, 0),
      collection: options.collection || null,
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
    let nextIndex = currentIndexRef.current + 1;

    if (nextIndex >= queueRef.current.length) {
      if (repeatModeRef.current === "all" && queueRef.current.length > 0) {
        nextIndex = 0;
      } else {
        if (!consumeFreeSkip()) {
          return;
        }

        await playRandomPlaybackTrack();
        return;
      }
    }

    if (!consumeFreeSkip()) {
      return;
    }

    await playTrackByIndexRef.current?.(nextIndex);
  };

  const playPrevious = async () => {
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
        if (!consumeFreeSkip()) {
          return;
        }

        await playTrackByIndexRef.current?.(queueRef.current.length - 1);
        return;
      }

      audio.currentTime = 0;
      setCurrentTime(0);
      syncLyricsRef.current?.(0, true);
      return;
    }

    if (!consumeFreeSkip()) {
      return;
    }

    await playTrackByIndexRef.current?.(previousIndex);
  };

  const seekTo = (nextTime) => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    if (!isPremiumRef.current) {
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

    const qualityOptions = getTrackQualityOptions(currentTrack);
    const targetQuality =
      qualityOptions.find((quality) => quality.url === normalizedUrl) ||
      qualityOptions.find((quality) => quality.label === normalizedLabel);

    if (!targetQuality) {
      setRestrictionMessage("This track does not provide that audio quality.");
      return;
    }

    if (
      targetQuality.url === currentTrack.streamUrl ||
      (
        !normalizedUrl &&
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

  const activeFreeSkipWindow = getActiveFreeSkipWindow(freeSkipWindow, Date.now());
  const freeSkipsRemaining = Math.max(
    FREE_SKIP_LIMIT - activeFreeSkipWindow.skipCount,
    0
  );

  const value = {
    queue,
    currentIndex,
    currentTrack,
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
    canSeek: isPremium,
    availableAudioQualities,
    selectedQualityLabel,
    isShuffleEnabled,
    repeatMode,
    freeSkipsRemaining,
    freeSkipLimit: FREE_SKIP_LIMIT,
    freeSkipWindowEndsAt: activeFreeSkipWindow.startedAt + FREE_SKIP_WINDOW_MS,
    playTrack,
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
    changeAudioQuality,
    setVolumeLevel,
    removeTrackFromQueue,
  };

  return <PlayerContext.Provider value={ value }>{ children }</PlayerContext.Provider>;
};
