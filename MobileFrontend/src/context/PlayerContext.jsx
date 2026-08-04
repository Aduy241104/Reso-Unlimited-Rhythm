import React, { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import listenEventService from '../services/listenEventService';
import trackService from '../services/trackService';
import { tokenStorage } from '../storage/tokenStorage';
import {
  buildExpoAudioSource,
  buildPlayableQueue,
  formatPlayerTime,
  getPlayableDuration,
  hasSyncedLrc,
  normalizePlayerTrack,
  resolveTrackLyricsSyncUrl,
} from '../utils/player';

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
  hasNext: false,
  hasPrevious: false,
  playTrack: () => {},
  playQueue: () => {},
  playAtIndex: () => {},
  togglePlayback: () => {},
  playNext: () => {},
  playPrevious: () => {},
  seekTo: () => {},
  moveQueueItem: () => {},
  removeFromQueue: () => {},
  clearUpcoming: () => {},
});

// Commands that do not need playback progress live in a separate context so
// screens using them are not re-rendered by the 250 ms audio status updates.
export const PlayerQueueCommandContext = createContext(() => {});

const MAX_SEEK_FREE_PROGRESS_DELTA_SECONDS = 2;

export const PlayerProvider = ({ children }) => {
  const player = useAudioPlayer(null, {
    updateInterval: 250,
    keepAudioSessionActive: true,
  });
  const status = useAudioPlayerStatus(player);
  const [queue, setQueue] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [currentError, setCurrentError] = useState('');
  const [isPreparing, setIsPreparing] = useState(false);
  const queueRef = useRef([]);
  const currentIndexRef = useRef(-1);
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

  const currentTrack = currentIndex >= 0 ? queue[currentIndex] || null : null;
  const currentDuration = Math.max(Number(status?.duration) || 0, getPlayableDuration(currentTrack));
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < queue.length - 1;
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

      const nextQueue = [...prev];
      nextQueue[index] = track;
      queueRef.current = nextQueue;
      return nextQueue;
    });
  }, []);

  const resetQueueState = useCallback(() => {
    void flushCurrentListenAttempt();
    loadRequestRef.current += 1;
    queueRef.current = [];
    currentIndexRef.current = -1;
    player.pause();
    setQueue([]);
    setCurrentIndex(-1);
    setCurrentError('');
    setIsPreparing(false);
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
  }, [flushCurrentListenAttempt, player, resetListenProgress]);

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

      const accessToken = await tokenStorage.getAccessToken().catch(() => null);
      const audioSource = buildExpoAudioSource(resolvedTrack, accessToken);

      if (!audioSource) {
        player.pause();
        setCurrentError('This track does not have a playable audio source.');
        setIsPreparing(false);
        return false;
      }

      void flushCurrentListenAttempt();
      player.replace(audioSource);
      startListenAttempt(resolvedTrack);
      try {
        player.setActiveForLockScreen(true, {
          title: resolvedTrack.title,
          artist: resolvedTrack.artistName,
          artworkUrl: resolvedTrack.image || undefined,
        });
      } catch {}

      if (options.resetPosition !== false) {
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
    flushCurrentListenAttempt,
    player,
    resolveTrackForPlayback,
    startListenAttempt,
    syncQueueTrack,
  ]);

  const playQueue = useCallback((tracks = [], startIndex = 0, options = {}) => {
    const normalizedQueue = buildPlayableQueue(tracks);

    if (normalizedQueue.length === 0) {
      return;
    }

    const safeIndex = Math.min(Math.max(0, startIndex), normalizedQueue.length - 1);

    queueRef.current = normalizedQueue;
    currentIndexRef.current = safeIndex;
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
    if (!hasPrevious) {
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
    hasPrevious,
    loadTrackAtIndex,
    player,
    startListenAttempt,
  ]);

  const playNext = useCallback(() => {
    if (!hasNext) {
      player.pause();
      trackListenProgress(progressSeconds, Boolean(status?.playing));
      void flushCurrentListenAttempt();
      return;
    }

    void loadTrackAtIndex(currentIndex + 1, { autoPlay: true });
  }, [
    currentIndex,
    flushCurrentListenAttempt,
    hasNext,
    loadTrackAtIndex,
    player,
    progressSeconds,
    status?.playing,
    trackListenProgress,
  ]);

  const seekTo = useCallback((value) => {
    if (!currentTrack) {
      return;
    }

    const nextValue = Math.min(Math.max(0, Number(value) || 0), currentDuration);

    alignListenProgressAfterSeek(nextValue);
    void player.seekTo(nextValue).catch(() => {});
  }, [alignListenProgressAfterSeek, currentDuration, currentTrack, player]);

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
    trackListenProgress(status?.currentTime, Boolean(status?.playing));
  }, [status?.currentTime, status?.playing, trackListenProgress]);

  useEffect(() => {
    const didJustFinish = Boolean(status?.didJustFinish);

    if (didJustFinish && !didFinishRef.current) {
      trackListenProgress(status?.currentTime, Boolean(status?.playing));
      void flushCurrentListenAttempt();

      if (hasNext) {
        void loadTrackAtIndex(currentIndex + 1, { autoPlay: true });
      }
    }

    didFinishRef.current = didJustFinish;
  }, [
    currentIndex,
    flushCurrentListenAttempt,
    hasNext,
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
    hasNext,
    hasPrevious,
    playTrack,
    playQueue,
    playAtIndex,
    togglePlayback,
    playNext,
    playPrevious,
    seekTo,
    moveQueueItem,
    removeFromQueue,
    clearUpcoming,
  }), [
    clearUpcoming,
    currentIndex,
    currentTrack,
    currentError,
    hasNext,
    hasPrevious,
    isBuffering,
    isPlaying,
    isPreparing,
    moveQueueItem,
    playNext,
    playPrevious,
    playAtIndex,
    playQueue,
    playTrack,
    progressRatio,
    progressSeconds,
    queue,
    removeFromQueue,
    seekTo,
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
