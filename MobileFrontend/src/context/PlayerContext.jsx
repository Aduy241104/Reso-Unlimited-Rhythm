import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { AuthContext } from './AuthContext';
import listenEventService from '../services/listenEventService';
import trackService from '../services/trackService';
import { tokenStorage } from '../storage/tokenStorage';
import { hasPremiumAccess } from '../utils/premium';
import {
  createAdvertisementTransitionId,
  recordAdvertisementEvent,
  requestAdvertisementDecision,
} from '../services/advertisementService';
import {
  buildExpoAudioSource,
  buildPlayableQueue,
  formatPlayerTime,
  getPlayableDuration,
  hasSyncedLrc,
  normalizePlayerTrack,
  resolveTrackAudioQualityOptions,
  resolveTrackAudioUri,
  resolveTrackLyricsSyncUrl,
} from '../utils/player';

const REPEAT_MODE_SEQUENCE = ['off', 'all', 'one'];
const SHUFFLE_COLLECTION_TYPES = new Set(['album', 'playlist']);
const PLAYER_MODE_TRACK = 'track';
const PLAYER_MODE_AD = 'ad';

const shuffleTracks = (tracks = []) => {
  const nextTracks = [...tracks];

  for (let index = nextTracks.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [nextTracks[index], nextTracks[randomIndex]] = [nextTracks[randomIndex], nextTracks[index]];
  }

  return nextTracks;
};

const buildShuffledQueue = (tracks, startIndex, preserveStartTrack = false) => {
  if (!Array.isArray(tracks) || tracks.length < 2) {
    return { queue: tracks, startIndex };
  }

  if (!preserveStartTrack) {
    return { queue: shuffleTracks(tracks), startIndex: 0 };
  }

  const activeTrack = tracks[startIndex];
  const remainingTracks = tracks.filter((_, index) => index !== startIndex);

  return {
    queue: [activeTrack, ...shuffleTracks(remainingTracks)],
    startIndex: 0,
  };
};

const findSelectedQuality = (qualityOptions, track, preferredQuality = null) => {
  if (!Array.isArray(qualityOptions) || qualityOptions.length === 0) {
    return null;
  }

  const preferredBitrate = Math.max(0, Number(preferredQuality?.bitrate) || 0);
  const preferredUrl = preferredQuality?.url || '';
  const preferredLabel = String(preferredQuality?.label || '').trim().toLowerCase();
  const defaultAudioUri = resolveTrackAudioUri(track);

  return (
    qualityOptions.find(
      (quality) => preferredBitrate > 0 && quality.bitrate === preferredBitrate
    ) ||
    qualityOptions.find((quality) => preferredUrl && quality.url === preferredUrl) ||
    qualityOptions.find((quality) => preferredLabel && quality.label === preferredLabel) ||
    qualityOptions.find((quality) => quality.isDefault) ||
    qualityOptions.find((quality) => quality.url === defaultAudioUri) ||
    qualityOptions[0]
  );
};

const getQueueIdentity = (track) => String(
  track?.queueItemId || track?.entityId || track?.id || ''
);

export const PlayerContext = createContext({
  currentTrack: null,
  queue: [],
  currentIndex: -1,
  isPlaying: false,
  isBuffering: false,
  isPreparing: false,
  currentError: '',
  progressSeconds: 0,
  progressRatio: 0,
  duration: 0,
  hasNext: false,
  hasPrevious: false,
  isPremium: false,
  isAdvertisementPlaying: false,
  currentAdvertisement: null,
  canSkipAdvertisement: false,
  isShuffleEnabled: true,
  repeatMode: 'off',
  availableAudioQualities: [],
  selectedAudioQuality: null,
  playTrack: () => {},
  playQueue: () => {},
  playAtIndex: () => {},
  togglePlayback: () => {},
  playNext: () => {},
  playPrevious: () => {},
  skipAdvertisement: () => {},
  seekTo: () => {},
  addTrackToQueue: () => {},
  toggleShuffle: () => {},
  cycleRepeatMode: () => {},
  changeAudioQuality: async () => false,
  moveQueueItem: () => {},
  removeFromQueue: () => {},
  clearUpcoming: () => {},
});

// Commands that do not need playback progress live in a separate context so
// screens using them are not re-rendered by the 250 ms audio status updates.
export const PlayerQueueCommandContext = createContext(() => {});

const MAX_SEEK_FREE_PROGRESS_DELTA_SECONDS = 2;

export const PlayerProvider = ({ children }) => {
  const { user } = useContext(AuthContext);
  const isPremium = hasPremiumAccess(user);
  const player = useAudioPlayer(null, {
    updateInterval: 250,
    keepAudioSessionActive: true,
  });
  const status = useAudioPlayerStatus(player);
  const [queue, setQueue] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [currentError, setCurrentError] = useState('');
  const [isPreparing, setIsPreparing] = useState(false);
  const [isShuffleEnabled, setIsShuffleEnabled] = useState(true);
  const [repeatMode, setRepeatMode] = useState('off');
  const [availableAudioQualities, setAvailableAudioQualities] = useState([]);
  const [selectedAudioQuality, setSelectedAudioQuality] = useState(null);
  const [playerMode, setPlayerMode] = useState(PLAYER_MODE_TRACK);
  const [currentAdvertisement, setCurrentAdvertisement] = useState(null);
  const [canSkipAdvertisement, setCanSkipAdvertisement] = useState(false);
  const queueRef = useRef([]);
  const orderedQueueRef = useRef([]);
  const currentIndexRef = useRef(-1);
  const activeCollectionTypeRef = useRef('');
  const isShuffleEnabledRef = useRef(true);
  const repeatModeRef = useRef('off');
  const loadRequestRef = useRef(0);
  const didFinishRef = useRef(false);
  const listenAttemptRef = useRef({
    trackId: '',
    duration: 0,
    source: 'unknown',
    hasReported: false,
  });
  const listenedDurationRef = useRef(0);
  const lastTrackedAudioTimeRef = useRef(0);
  const lastTrackedWallTimeRef = useRef(Date.now());
  const wasPlayingRef = useRef(false);
  const ignoreNextListenDeltaRef = useRef(true);
  const playerModeRef = useRef(PLAYER_MODE_TRACK);
  const currentAdDecisionRef = useRef(null);
  const adEventStartedRef = useRef(false);
  const pendingAfterAdRef = useRef(null);
  const finishAdvertisementRef = useRef(null);
  const maybePlayAdvertisementRef = useRef(null);

  const currentTrack = currentIndex >= 0 ? queue[currentIndex] || null : null;
  const currentDuration = Math.max(Number(status?.duration) || 0, getPlayableDuration(currentTrack));
  const hasPreviousTrack = currentIndex > 0;
  const hasNextTrack = currentIndex >= 0 && currentIndex < queue.length - 1;
  const isAdvertisementPlaying = playerMode === PLAYER_MODE_AD;
  const hasPrevious = !isAdvertisementPlaying && (hasPreviousTrack || (repeatMode === 'all' && queue.length > 0));
  const hasNext = !isAdvertisementPlaying && (hasNextTrack || (repeatMode === 'all' && queue.length > 0));
  const progressSeconds = Number(status?.currentTime) || 0;
  const progressRatio = currentTrack && currentDuration > 0 ? Math.min(progressSeconds / currentDuration, 1) : 0;
  const isPlaying = Boolean(status?.playing);
  const isBuffering = Boolean(status?.isBuffering) || isPreparing;

  const resetListenProgress = useCallback((currentTime = 0) => {
    listenedDurationRef.current = 0;
    lastTrackedAudioTimeRef.current = Math.max(0, Number(currentTime) || 0);
    lastTrackedWallTimeRef.current = Date.now();
    wasPlayingRef.current = false;
    ignoreNextListenDeltaRef.current = true;
  }, []);

  const alignListenProgressAfterSeek = useCallback((currentTime = 0) => {
    lastTrackedAudioTimeRef.current = Math.max(0, Number(currentTime) || 0);
    lastTrackedWallTimeRef.current = Date.now();
    ignoreNextListenDeltaRef.current = true;
  }, []);

  const trackListenProgress = useCallback((nextTime, nextIsPlaying) => {
    const normalizedNextTime = Math.max(0, Number(nextTime) || 0);
    const now = Date.now();
    const previousTime = Math.max(0, Number(lastTrackedAudioTimeRef.current) || 0);
    const elapsedWallSeconds = Math.max(
      0,
      (now - lastTrackedWallTimeRef.current) / 1000
    );
    const delta = normalizedNextTime - previousTime;

    if (ignoreNextListenDeltaRef.current) {
      ignoreNextListenDeltaRef.current = false;
      lastTrackedAudioTimeRef.current = normalizedNextTime;
      lastTrackedWallTimeRef.current = now;
      wasPlayingRef.current = Boolean(nextIsPlaying);
      return;
    }

    const maximumNaturalDelta = Math.max(
      MAX_SEEK_FREE_PROGRESS_DELTA_SECONDS,
      elapsedWallSeconds + 1
    );

    if (
      (wasPlayingRef.current || nextIsPlaying)
      && delta > 0
      && delta <= maximumNaturalDelta
    ) {
      listenedDurationRef.current += delta;
    }

    lastTrackedAudioTimeRef.current = normalizedNextTime;
    lastTrackedWallTimeRef.current = now;
    wasPlayingRef.current = Boolean(nextIsPlaying);
  }, []);

  const flushCurrentListenAttempt = useCallback(() => {
    const activeAttempt = listenAttemptRef.current;

    if (!activeAttempt?.trackId || activeAttempt.hasReported) {
      return Promise.resolve(null);
    }

    const trackDuration = Math.max(0, Number(activeAttempt.duration) || 0);
    const boundedListenedDuration = trackDuration > 0
      ? Math.min(listenedDurationRef.current, trackDuration)
      : listenedDurationRef.current;
    const listenedDuration = Math.max(0, Math.floor(boundedListenedDuration));

    if (listenedDuration <= 0) {
      return Promise.resolve(null);
    }

    activeAttempt.hasReported = true;

    return listenEventService.recordCompletedListenAttempt({
      trackId: activeAttempt.trackId,
      listenedDuration,
      source: activeAttempt.source,
    });
  }, []);

  const startListenAttempt = useCallback((track) => {
    listenAttemptRef.current = {
      trackId: track?.trackId || track?.entityId || track?.id || '',
      duration: Math.max(0, Number(track?.duration) || 0),
      source: track?.listenSource || 'unknown',
      hasReported: false,
    };
    resetListenProgress(0);
  }, [resetListenProgress]);

  const syncQueueTrack = useCallback((index, track) => {
    setQueue((prev) => {
      if (index < 0 || index >= prev.length) {
        return prev;
      }

      const previousIdentity = getQueueIdentity(prev[index]);
      const nextQueue = [...prev];
      nextQueue[index] = track;
      queueRef.current = nextQueue;

      if (previousIdentity) {
        let didReplaceOrderedTrack = false;
        orderedQueueRef.current = orderedQueueRef.current.map((orderedTrack) => {
          if (!didReplaceOrderedTrack && getQueueIdentity(orderedTrack) === previousIdentity) {
            didReplaceOrderedTrack = true;
            return track;
          }

          return orderedTrack;
        });
      }

      return nextQueue;
    });
  }, []);

  const resetQueueState = useCallback(() => {
    void flushCurrentListenAttempt();
    if (playerModeRef.current === PLAYER_MODE_AD && currentAdDecisionRef.current?.decisionToken) {
      void recordAdvertisementEvent({
        decisionToken: currentAdDecisionRef.current.decisionToken,
        eventType: 'skip',
        playedSeconds: Number(status?.currentTime) || 0,
      });
    }
    loadRequestRef.current += 1;
    queueRef.current = [];
    orderedQueueRef.current = [];
    currentIndexRef.current = -1;
    activeCollectionTypeRef.current = '';
    player.pause();
    setQueue([]);
    setCurrentIndex(-1);
    setCurrentError('');
    setIsPreparing(false);
    setAvailableAudioQualities([]);
    setSelectedAudioQuality(null);
    playerModeRef.current = PLAYER_MODE_TRACK;
    currentAdDecisionRef.current = null;
    pendingAfterAdRef.current = null;
    adEventStartedRef.current = false;
    setPlayerMode(PLAYER_MODE_TRACK);
    setCurrentAdvertisement(null);
    setCanSkipAdvertisement(false);
    listenAttemptRef.current = {
      trackId: '',
      duration: 0,
      source: 'unknown',
      hasReported: false,
    };
    resetListenProgress(0);

    try {
      player.clearLockScreenControls();
    } catch {}
  }, [flushCurrentListenAttempt, player, resetListenProgress, status?.currentTime]);

  const resolveTrackForPlayback = useCallback(async (track) => {
    const normalizedTrack = normalizePlayerTrack(track);
    const trackId = normalizedTrack.entityId || normalizedTrack.id;
    const playbackTrack = trackId ? await trackService.getTrackPlayback(trackId) : null;
    const mergedTrack = normalizePlayerTrack({
      ...normalizedTrack,
      ...(playbackTrack || {}),
      entityId: normalizedTrack.entityId || trackId,
      id: normalizedTrack.id || trackId,
    });

    if (hasSyncedLrc(mergedTrack)) {
      return mergedTrack;
    }

    const lyricsSyncUrl = resolveTrackLyricsSyncUrl(mergedTrack);

    if (!lyricsSyncUrl) {
      return mergedTrack;
    }

    try {
      const syncedLyrics = await trackService.getTrackSyncedLyrics(lyricsSyncUrl);

      return normalizePlayerTrack({
        ...mergedTrack,
        lrc: syncedLyrics,
        lyricsSyncUrl,
      });
    } catch {
      return mergedTrack;
    }
  }, []);

  const loadTrackAtIndex = useCallback(async (index, options = {}, explicitQueue = null) => {
    if (playerModeRef.current === PLAYER_MODE_AD) {
      return false;
    }

    const sourceQueue = explicitQueue || queueRef.current;

    if (!Array.isArray(sourceQueue) || sourceQueue.length === 0) {
      return false;
    }

    const safeIndex = Math.min(Math.max(0, index), sourceQueue.length - 1);
    const queuedTrack = sourceQueue[safeIndex];

    if (!queuedTrack) {
      return false;
    }

    const requestId = loadRequestRef.current + 1;
    loadRequestRef.current = requestId;

    currentIndexRef.current = safeIndex;
    setCurrentIndex(safeIndex);
    setCurrentError('');
    setIsPreparing(true);

    try {
      const resolvedTrack = await resolveTrackForPlayback(queuedTrack);

      if (loadRequestRef.current !== requestId) {
        return false;
      }

      syncQueueTrack(safeIndex, resolvedTrack);

      const qualityOptions = resolveTrackAudioQualityOptions(resolvedTrack);
      const preferredQuality = isPremium ? options.preferredQuality || null : null;
      const nextSelectedQuality = findSelectedQuality(
        qualityOptions,
        resolvedTrack,
        preferredQuality
      );
      const accessToken = await tokenStorage.getAccessToken().catch(() => null);
      const audioSource = buildExpoAudioSource(resolvedTrack, accessToken, preferredQuality);

      if (!audioSource) {
        player.pause();
        setCurrentError('This track does not have a playable audio source.');
        setIsPreparing(false);
        return false;
      }

      setAvailableAudioQualities(qualityOptions);
      setSelectedAudioQuality(nextSelectedQuality);

      if (!options.preserveListenAttempt) {
        void flushCurrentListenAttempt();
      }
      didFinishRef.current = false;
      player.replace(audioSource);
      if (!options.preserveListenAttempt) {
        startListenAttempt(resolvedTrack);
      }
      try {
        player.setActiveForLockScreen(true, {
          title: resolvedTrack.title,
          artist: resolvedTrack.artistName,
          artworkUrl: resolvedTrack.image || undefined,
        });
      } catch {}

      if (Number.isFinite(Number(options.resumePosition))) {
        const resumePosition = Math.min(
          Math.max(0, Number(options.resumePosition) || 0),
          Math.max(0, Number(resolvedTrack.duration) || Number(currentDuration) || 0)
        );

        alignListenProgressAfterSeek(resumePosition);
        try {
          await player.seekTo(resumePosition);
        } catch {}
      } else if (options.resetPosition !== false) {
        try {
          await player.seekTo(0);
        } catch {}
      }

      if (options.autoPlay === false) {
        player.pause();
      } else {
        player.play();
      }

      setIsPreparing(false);
      return true;
    } catch (error) {
      if (loadRequestRef.current === requestId) {
        void flushCurrentListenAttempt();
        player.pause();
        setCurrentError(error?.message || 'Unable to load this track right now.');
        setIsPreparing(false);
      }

      return false;
    }
  }, [
    alignListenProgressAfterSeek,
    currentDuration,
    flushCurrentListenAttempt,
    isPremium,
    player,
    resolveTrackForPlayback,
    startListenAttempt,
    syncQueueTrack,
  ]);

  const finishAdvertisement = useCallback(async (eventType = 'complete') => {
    if (playerModeRef.current !== PLAYER_MODE_AD) {
      return;
    }

    const decision = currentAdDecisionRef.current;
    const nextAction = pendingAfterAdRef.current;

    if (decision?.decisionToken) {
      await recordAdvertisementEvent({
        decisionToken: decision.decisionToken,
        eventType,
        playedSeconds: Number(status?.currentTime) || 0,
      });
    }

    playerModeRef.current = PLAYER_MODE_TRACK;
    currentAdDecisionRef.current = null;
    pendingAfterAdRef.current = null;
    adEventStartedRef.current = false;
    setPlayerMode(PLAYER_MODE_TRACK);
    setCurrentAdvertisement(null);
    setCanSkipAdvertisement(false);

    if (typeof nextAction === 'function') {
      await nextAction();
    }
  }, [status?.currentTime]);

  const maybePlayAdvertisement = useCallback(async (nextAction, placement = 'between_tracks') => {
    if (typeof nextAction !== 'function') {
      return;
    }

    if (isPremium || playerModeRef.current === PLAYER_MODE_AD) {
      await nextAction();
      return;
    }

    const decision = await requestAdvertisementDecision({
      type: 'audio',
      placement,
      transitionId: createAdvertisementTransitionId(),
    });
    const advertisement = decision?.advertisement || decision?.ad;

    if (!advertisement?.mediaUrl) {
      await nextAction();
      return;
    }

    const adSource = buildExpoAudioSource({ audioUri: advertisement.mediaUrl }, null);
    if (!adSource) {
      await nextAction();
      return;
    }

    playerModeRef.current = PLAYER_MODE_AD;
    currentAdDecisionRef.current = decision;
    pendingAfterAdRef.current = nextAction;
    adEventStartedRef.current = false;
    didFinishRef.current = false;
    setPlayerMode(PLAYER_MODE_AD);
    setCurrentAdvertisement(advertisement);
    setCanSkipAdvertisement(Boolean(advertisement.skipEnabled) && Number(advertisement.skipAfterSeconds) <= 0);
    setCurrentError('');
    setIsPreparing(true);

    try {
      player.replace(adSource);
      try {
        player.setActiveForLockScreen(true, {
          title: advertisement.title || 'Quảng cáo',
          artist: advertisement.advertiserName || 'Reso',
          artworkUrl: advertisement.thumbnailUrl || undefined,
        });
      } catch {}
      player.play();
      setIsPreparing(false);
    } catch {
      await finishAdvertisement('skip');
    }
  }, [finishAdvertisement, isPremium, player]);

  finishAdvertisementRef.current = finishAdvertisement;
  maybePlayAdvertisementRef.current = maybePlayAdvertisement;

  const playQueue = useCallback((tracks = [], startIndex = 0, options = {}) => {
    const orderedQueue = buildPlayableQueue(tracks);
    let normalizedQueue = orderedQueue;

    if (normalizedQueue.length === 0) {
      return;
    }

    let safeIndex = Math.min(Math.max(0, startIndex), normalizedQueue.length - 1);
    const shouldShuffle =
      SHUFFLE_COLLECTION_TYPES.has(options.collectionType) &&
      (typeof options.shuffle === 'boolean' ? options.shuffle : isShuffleEnabledRef.current);

    if (shouldShuffle) {
      const shuffledResult = buildShuffledQueue(
        normalizedQueue,
        safeIndex,
        Boolean(options.preserveStartTrack)
      );

      normalizedQueue = shuffledResult.queue;
      safeIndex = shuffledResult.startIndex;
    }

    queueRef.current = normalizedQueue;
    orderedQueueRef.current = orderedQueue;
    currentIndexRef.current = safeIndex;
    activeCollectionTypeRef.current = options.collectionType || '';
    setQueue(normalizedQueue);
    setCurrentIndex(safeIndex);
    void loadTrackAtIndex(safeIndex, options, normalizedQueue);
  }, [loadTrackAtIndex]);

  const playAtIndex = useCallback((index, options = {}) => {
    const sourceQueue = queueRef.current;

    if (!Array.isArray(sourceQueue) || sourceQueue.length === 0) {
      return;
    }

    const safeIndex = Math.min(Math.max(0, index), sourceQueue.length - 1);

    currentIndexRef.current = safeIndex;
    setCurrentIndex(safeIndex);
    void loadTrackAtIndex(safeIndex, options, sourceQueue);
  }, [loadTrackAtIndex]);

  const playTrack = useCallback((track, options = {}) => {
    if (!track) {
      return;
    }

    playQueue([normalizePlayerTrack(track)], 0, options);
  }, [playQueue]);

  const togglePlayback = useCallback(() => {
    if (!currentTrack) {
      return;
    }

    if (status?.playing) {
      player.pause();
      return;
    }

    if (currentError) {
      void loadTrackAtIndex(currentIndex, { autoPlay: true, resetPosition: false });
      return;
    }

    if (currentDuration > 0 && progressSeconds >= currentDuration - 0.25) {
      void flushCurrentListenAttempt();
      startListenAttempt(currentTrack);
      alignListenProgressAfterSeek(0);
      void player.seekTo(0).catch(() => {});
    }

    player.play();
  }, [
    alignListenProgressAfterSeek,
    currentDuration,
    currentError,
    currentIndex,
    currentTrack,
    flushCurrentListenAttempt,
    loadTrackAtIndex,
    player,
    progressSeconds,
    startListenAttempt,
    status?.playing,
  ]);

  const playPrevious = useCallback(() => {
    if (playerModeRef.current === PLAYER_MODE_AD) {
      return;
    }

    if (!hasPreviousTrack) {
      if (repeatModeRef.current === 'all' && queueRef.current.length > 0) {
        void loadTrackAtIndex(queueRef.current.length - 1, { autoPlay: true });
        return;
      }

      void flushCurrentListenAttempt();
      startListenAttempt(currentTrack);
      alignListenProgressAfterSeek(0);
      void player.seekTo(0).catch(() => {});
      return;
    }

    void loadTrackAtIndex(currentIndex - 1, { autoPlay: true });
  }, [
    alignListenProgressAfterSeek,
    currentIndex,
    currentTrack,
    flushCurrentListenAttempt,
    hasPreviousTrack,
    loadTrackAtIndex,
    player,
    startListenAttempt,
  ]);

  const playNext = useCallback(async () => {
    if (playerModeRef.current === PLAYER_MODE_AD) {
      return;
    }

    if (!hasNextTrack) {
      if (repeatModeRef.current === 'all' && queueRef.current.length > 0) {
        void maybePlayAdvertisementRef.current?.(() => loadTrackAtIndex(0, { autoPlay: true }));
        return;
      }

      player.pause();
      trackListenProgress(progressSeconds, Boolean(status?.playing));
      void flushCurrentListenAttempt();
      return;
    }

    void maybePlayAdvertisementRef.current?.(() => loadTrackAtIndex(currentIndex + 1, { autoPlay: true }));
  }, [
    currentIndex,
    flushCurrentListenAttempt,
    hasNextTrack,
    loadTrackAtIndex,
    player,
    progressSeconds,
    status?.playing,
    trackListenProgress,
  ]);

  const seekTo = useCallback((value) => {
    if (!currentTrack || !isPremium || playerModeRef.current === PLAYER_MODE_AD) {
      return false;
    }

    const nextValue = Math.min(Math.max(0, Number(value) || 0), currentDuration);

    alignListenProgressAfterSeek(nextValue);
    void player.seekTo(nextValue).catch(() => {});
    return true;
  }, [alignListenProgressAfterSeek, currentDuration, currentTrack, isPremium, player]);

  const skipAdvertisement = useCallback(() => {
    if (playerModeRef.current !== PLAYER_MODE_AD || !canSkipAdvertisement) {
      return false;
    }

    void finishAdvertisementRef.current?.('skip');
    return true;
  }, [canSkipAdvertisement]);

  const addTrackToQueue = useCallback((track) => {
    if (!track) {
      return false;
    }

    const normalizedTrack = normalizePlayerTrack({
      ...track,
      queueItemId: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      queueSource: 'manual',
    });
    const sourceQueue = queueRef.current;
    const activeIndex = currentIndexRef.current;

    if (!normalizedTrack.id) {
      return false;
    }

    let insertIndex = sourceQueue.length;

    if (activeIndex >= 0 && activeIndex < sourceQueue.length) {
      insertIndex = activeIndex + 1;

      while (
        insertIndex < sourceQueue.length &&
        sourceQueue[insertIndex]?.queueSource === 'manual'
      ) {
        insertIndex += 1;
      }
    }

    const nextQueue = [...sourceQueue];
    nextQueue.splice(insertIndex, 0, normalizedTrack);
    queueRef.current = nextQueue;
    setQueue(nextQueue);
    setCurrentError('');

    const orderedQueue = orderedQueueRef.current;
    const activeIdentity = getQueueIdentity(sourceQueue[activeIndex]);
    const orderedActiveIndex = activeIdentity
      ? orderedQueue.findIndex((item) => getQueueIdentity(item) === activeIdentity)
      : -1;
    const orderedInsertIndex = orderedActiveIndex >= 0 ? orderedActiveIndex + 1 : orderedQueue.length;
    const nextOrderedQueue = [...orderedQueue];
    nextOrderedQueue.splice(orderedInsertIndex, 0, normalizedTrack);
    orderedQueueRef.current = nextOrderedQueue;

    if (sourceQueue.length === 0) {
      currentIndexRef.current = 0;
      setCurrentIndex(0);
      void loadTrackAtIndex(0, { autoPlay: true }, nextQueue);
    }

    return true;
  }, [loadTrackAtIndex]);

  const toggleShuffle = useCallback(() => {
    if (!isPremium && isShuffleEnabledRef.current) {
      return false;
    }

    const nextValue = !isShuffleEnabledRef.current;
    isShuffleEnabledRef.current = nextValue;
    setIsShuffleEnabled(nextValue);

    if (
      SHUFFLE_COLLECTION_TYPES.has(activeCollectionTypeRef.current) &&
      orderedQueueRef.current.length > 1 &&
      queueRef.current.length > 0
    ) {
      const activeTrack = queueRef.current[currentIndexRef.current];
      const activeIdentity = getQueueIdentity(activeTrack);
      const orderedActiveIndex = orderedQueueRef.current.findIndex(
        (track) => getQueueIdentity(track) === activeIdentity
      );
      const nextQueueState = nextValue
        ? buildShuffledQueue(
            orderedQueueRef.current,
            Math.max(0, orderedActiveIndex),
            Boolean(activeTrack)
          )
        : {
            queue: [...orderedQueueRef.current],
            startIndex: Math.max(0, orderedActiveIndex),
          };

      queueRef.current = nextQueueState.queue;
      currentIndexRef.current = nextQueueState.startIndex;
      setQueue(nextQueueState.queue);
      setCurrentIndex(nextQueueState.startIndex);
    }

    return true;
  }, [isPremium]);

  const cycleRepeatMode = useCallback(() => {
    if (!isPremium) {
      return false;
    }

    const currentModeIndex = REPEAT_MODE_SEQUENCE.indexOf(repeatModeRef.current);
    const nextMode = REPEAT_MODE_SEQUENCE[
      (currentModeIndex + 1) % REPEAT_MODE_SEQUENCE.length
    ];

    repeatModeRef.current = nextMode;
    setRepeatMode(nextMode);

    return true;
  }, [isPremium]);

  const changeAudioQuality = useCallback(async (nextQuality) => {
    if (!isPremium || !currentTrack || !nextQuality?.url) {
      return false;
    }

    const wasPlaying = Boolean(status?.playing);
    const resumePosition = Math.max(0, Number(status?.currentTime) || 0);
    const didLoad = await loadTrackAtIndex(
      currentIndexRef.current,
      {
        autoPlay: wasPlaying,
        preferredQuality: nextQuality,
        preserveListenAttempt: true,
        resetPosition: false,
        resumePosition,
      },
      queueRef.current
    );

    return Boolean(didLoad);
  }, [currentTrack, isPremium, loadTrackAtIndex, status?.currentTime, status?.playing]);

  const moveQueueItem = useCallback((fromIndex, toIndex) => {
    const sourceQueue = queueRef.current;
    const activeIndex = currentIndexRef.current;

    if (!Array.isArray(sourceQueue) || sourceQueue.length < 2) {
      return;
    }

    if (
      fromIndex < 0
      || fromIndex >= sourceQueue.length
      || toIndex < 0
      || toIndex >= sourceQueue.length
      || fromIndex === toIndex
    ) {
      return;
    }

    const nextQueue = [...sourceQueue];
    const [movedTrack] = nextQueue.splice(fromIndex, 1);
    nextQueue.splice(toIndex, 0, movedTrack);

    let nextCurrentIndex = activeIndex;

    if (activeIndex === fromIndex) {
      nextCurrentIndex = toIndex;
    } else if (fromIndex < activeIndex && toIndex >= activeIndex) {
      nextCurrentIndex = activeIndex - 1;
    } else if (fromIndex > activeIndex && toIndex <= activeIndex) {
      nextCurrentIndex = activeIndex + 1;
    }

    queueRef.current = nextQueue;
    currentIndexRef.current = nextCurrentIndex;
    setQueue(nextQueue);
    setCurrentIndex(nextCurrentIndex);
  }, []);

  const removeFromQueue = useCallback((index) => {
    const sourceQueue = queueRef.current;
    const activeIndex = currentIndexRef.current;

    if (!Array.isArray(sourceQueue) || sourceQueue.length === 0 || index < 0 || index >= sourceQueue.length) {
      return;
    }

    if (sourceQueue.length === 1) {
      resetQueueState();
      return;
    }

    const nextQueue = sourceQueue.filter((_, itemIndex) => itemIndex !== index);
    const shouldReloadActiveTrack = index === activeIndex;
    const nextCurrentIndex = index < activeIndex
      ? activeIndex - 1
      : Math.min(activeIndex, nextQueue.length - 1);

    queueRef.current = nextQueue;
    setQueue(nextQueue);

    if (!shouldReloadActiveTrack) {
      currentIndexRef.current = nextCurrentIndex;
      setCurrentIndex(nextCurrentIndex);
      return;
    }

    void loadTrackAtIndex(nextCurrentIndex, {
      autoPlay: Boolean(status?.playing),
      resetPosition: true,
    }, nextQueue);
  }, [loadTrackAtIndex, resetQueueState, status?.playing]);

  const clearUpcoming = useCallback(() => {
    const sourceQueue = queueRef.current;
    const activeIndex = currentIndexRef.current;

    if (!Array.isArray(sourceQueue) || sourceQueue.length === 0) {
      return;
    }

    if (activeIndex < 0) {
      resetQueueState();
      return;
    }

    const nextQueue = sourceQueue.slice(0, activeIndex + 1);

    queueRef.current = nextQueue;
    currentIndexRef.current = activeIndex;
    setQueue(nextQueue);
    setCurrentIndex(activeIndex);
  }, [resetQueueState]);

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    isShuffleEnabledRef.current = isShuffleEnabled;
  }, [isShuffleEnabled]);

  useEffect(() => {
    repeatModeRef.current = repeatMode;
  }, [repeatMode]);

  useEffect(() => {
    if (isPremium) {
      return;
    }

    repeatModeRef.current = 'off';
    isShuffleEnabledRef.current = true;
    setRepeatMode('off');
    setIsShuffleEnabled(true);
  }, [isPremium]);

  useEffect(() => {
    void setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'doNotMix',
      allowsRecording: false,
      shouldRouteThroughEarpiece: false,
    }).catch(() => {});

    return () => {
      void flushCurrentListenAttempt();
      try {
        player.clearLockScreenControls();
      } catch {}
    };
  }, [flushCurrentListenAttempt, player]);

  useEffect(() => {
    if (isAdvertisementPlaying) {
      return;
    }

    trackListenProgress(status?.currentTime, Boolean(status?.playing));
  }, [isAdvertisementPlaying, status?.currentTime, status?.playing, trackListenProgress]);

  useEffect(() => {
    if (!isAdvertisementPlaying) {
      setCanSkipAdvertisement(false);
      return;
    }

    const skipAfterSeconds = Number(currentAdvertisement?.skipAfterSeconds) || 0;
    setCanSkipAdvertisement(
      Boolean(currentAdvertisement?.skipEnabled) &&
      (Number(status?.currentTime) || 0) >= skipAfterSeconds
    );
  }, [currentAdvertisement, isAdvertisementPlaying, status?.currentTime]);

  useEffect(() => {
    if (!isAdvertisementPlaying || !status?.playing || adEventStartedRef.current) {
      return;
    }

    adEventStartedRef.current = true;
    const decisionToken = currentAdDecisionRef.current?.decisionToken;
    void recordAdvertisementEvent({ decisionToken, eventType: 'started' });
    void recordAdvertisementEvent({ decisionToken, eventType: 'impression' });
  }, [isAdvertisementPlaying, status?.playing]);

  useEffect(() => {
    const didJustFinish = Boolean(status?.didJustFinish);

    if (didJustFinish && !didFinishRef.current) {
      if (playerModeRef.current === PLAYER_MODE_AD) {
        void finishAdvertisementRef.current?.('complete');
        didFinishRef.current = didJustFinish;
        return;
      }

      trackListenProgress(status?.currentTime, Boolean(status?.playing));
      void flushCurrentListenAttempt();

      if (repeatModeRef.current === 'one') {
        void loadTrackAtIndex(currentIndex, { autoPlay: true, resetPosition: true });
      } else if (hasNextTrack) {
        void maybePlayAdvertisementRef.current?.(() => loadTrackAtIndex(currentIndex + 1, { autoPlay: true }));
      } else if (repeatModeRef.current === 'all' && queueRef.current.length > 0) {
        void maybePlayAdvertisementRef.current?.(() => loadTrackAtIndex(0, { autoPlay: true }));
      }
    }

    didFinishRef.current = didJustFinish;
  }, [
    currentIndex,
    flushCurrentListenAttempt,
    hasNextTrack,
    loadTrackAtIndex,
    status?.currentTime,
    status?.didJustFinish,
    status?.playing,
    trackListenProgress,
  ]);

  useEffect(() => {
    if (!currentTrack || !status?.duration || status.duration <= 0) {
      return;
    }

    listenAttemptRef.current.duration = status.duration;

    if (Math.abs((currentTrack.duration || 0) - status.duration) < 0.5) {
      return;
    }

    syncQueueTrack(currentIndex, {
      ...currentTrack,
      duration: status.duration,
      durationLabel: formatPlayerTime(status.duration),
    });
  }, [currentIndex, currentTrack, status?.duration, syncQueueTrack]);

  const contextValue = useMemo(() => ({
    currentTrack,
    queue,
    currentIndex,
    isPlaying,
    isBuffering,
    isPreparing,
    currentError,
    progressSeconds,
    progressRatio,
    duration: currentDuration,
    hasNext,
    hasPrevious,
    isPremium,
    isAdvertisementPlaying,
    currentAdvertisement,
    canSkipAdvertisement,
    isShuffleEnabled,
    repeatMode,
    availableAudioQualities,
    selectedAudioQuality,
    playTrack,
    playQueue,
    playAtIndex,
    togglePlayback,
    playNext,
    playPrevious,
    skipAdvertisement,
    seekTo,
    addTrackToQueue,
    toggleShuffle,
    cycleRepeatMode,
    changeAudioQuality,
    moveQueueItem,
    removeFromQueue,
    clearUpcoming,
  }), [
    addTrackToQueue,
    availableAudioQualities,
    changeAudioQuality,
    clearUpcoming,
    cycleRepeatMode,
    currentIndex,
    currentTrack,
    currentDuration,
    currentError,
    currentAdvertisement,
    canSkipAdvertisement,
    hasNext,
    hasPrevious,
    isAdvertisementPlaying,
    isBuffering,
    isPlaying,
    isPreparing,
    isPremium,
    isShuffleEnabled,
    moveQueueItem,
    playNext,
    playPrevious,
    playAtIndex,
    playQueue,
    playTrack,
    progressRatio,
    progressSeconds,
    queue,
    repeatMode,
    removeFromQueue,
    selectedAudioQuality,
    seekTo,
    skipAdvertisement,
    toggleShuffle,
    togglePlayback,
  ]);

  return (
    <PlayerQueueCommandContext.Provider value={playQueue}>
      <PlayerContext.Provider value={contextValue}>
        {children}
      </PlayerContext.Provider>
    </PlayerQueueCommandContext.Provider>
  );
};
