import { useEffect, useRef, useState } from "react";
import Liricle from "liricle";
import PlayerContext from "./player-context";
import { getApiErrorMessage } from "../utils/apiError";
import { getRandomLyricsThemeIndex } from "../utils/lyricsTheme";
import {
  getTrackLyricsSyncTextService,
  getTrackPlaybackSource,
  resolveTrackLyricsSyncUrl,
  resolveTrackMediaUrl,
} from "../services/playerService";

const DEFAULT_VOLUME = 0.75;

const getArtistName = (track, fallbackArtistName = "") =>
  track?.artist?.name || track?.artistName || fallbackArtistName || "Unknown artist";

const normalizeQueueTrack = (item, options = {}) => {
  const track = item?.track ?? item ?? {};

  return {
    id:
      track?.id ||
      `${options.collectionId || options.collectionType || "track"}-${options.index || 0}`,
    title: track?.title || "Untitled track",
    artist: track?.artist || null,
    artistName: getArtistName(track, options.artistName),
    duration: Number(track?.duration) || 0,
    image:
      track?.coverImage ||
      track?.image ||
      track?.artist?.avatar ||
      options.image ||
      "",
    playbackTrackId: track?.id || null,
    streamUrl: resolveTrackMediaUrl(track),
    lyricsSyncUrl: resolveTrackLyricsSyncUrl(track),
    playback: track?.playback || null,
    raw: track,
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
      })
    )
    .filter((track) => Boolean(track?.id));

export const PlayerProvider = ({ children }) => {
  const [queue, setQueue] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(DEFAULT_VOLUME);
  const [errorMessage, setErrorMessage] = useState("");
  const [activeCollection, setActiveCollection] = useState(null);
  const [lyricsLines, setLyricsLines] = useState([]);
  const [activeLyricLineIndex, setActiveLyricLineIndex] = useState(-1);
  const [activeLyricWordIndex, setActiveLyricWordIndex] = useState(-1);
  const [isLyricsLoading, setIsLyricsLoading] = useState(false);
  const [lyricsErrorMessage, setLyricsErrorMessage] = useState("");
  const audioRef = useRef(null);
  const queueRef = useRef([]);
  const currentIndexRef = useRef(-1);
  const objectUrlRef = useRef("");
  const playbackRequestIdRef = useRef(0);
  const lyricsRequestIdRef = useRef(0);
  const playTrackByIndexRef = useRef(null);
  const liricleRef = useRef(null);
  const syncLyricsRef = useRef(null);
  const lyricsReadyRef = useRef(false);
  const currentLyricsThemeIndexRef = useRef(-1);

  const syncQueueState = (nextQueue) => {
    queueRef.current = nextQueue;
    setQueue(nextQueue);
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
      setCurrentTime(audio.currentTime || 0);
      syncLyricsRef.current?.(audio.currentTime || 0);
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

    const handleEnded = () => {
      const nextIndex = currentIndexRef.current + 1;

      if (nextIndex < queueRef.current.length) {
        playTrackByIndexRef.current?.(nextIndex);
        return;
      }

      setIsPlaying(false);
      setCurrentTime(0);
      syncLyricsRef.current?.(0, true);
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
  }, []);

  useEffect(() => {
    if (!audioRef.current) {
      return;
    }

    audioRef.current.volume = volume;
  }, [volume]);

  playTrackByIndexRef.current = async (nextIndex, incomingQueue = null) => {
    const audio = audioRef.current;
    const workingQueue = incomingQueue || queueRef.current;
    const nextTrack = workingQueue?.[nextIndex];

    if (!audio || !nextTrack) {
      return;
    }

    playbackRequestIdRef.current += 1;
    const requestId = playbackRequestIdRef.current;
    const lyricsThemeIndex = getRandomLyricsThemeIndex(
      currentLyricsThemeIndexRef.current
    );

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
    setIsBuffering(true);
    resetLyricsState();

    try {
      let source = null;
      const shouldHydratePlayback =
        Boolean(nextTrack.playbackTrackId) &&
        (!nextTrack.streamUrl || !nextTrack.lyricsSyncUrl || !nextTrack.playback);

      if (!shouldHydratePlayback && nextTrack.streamUrl) {
        source = {
          url: nextTrack.streamUrl,
          revokeOnChange: false,
          track: nextTrack.raw,
        };
      } else {
        source = await getTrackPlaybackSource(nextTrack.playbackTrackId || nextTrack.id);
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

      const hydratedTrack = {
        ...nextTrack,
        lyricsThemeIndex,
        title: source.track?.title || nextTrack.title,
        artist: source.track?.artist || nextTrack.artist,
        artistName: source.track?.artist?.name || nextTrack.artistName,
        duration: Number(source.track?.duration) || nextTrack.duration,
        image:
          source.track?.coverImage ||
          source.track?.album?.coverImage ||
          nextTrack.image,
        playbackTrackId: source.track?.id || nextTrack.playbackTrackId,
        playback: source.track?.playback || nextTrack.playback,
        lyricsSyncUrl:
          resolveTrackLyricsSyncUrl(source.track) || nextTrack.lyricsSyncUrl,
        raw: source.track || nextTrack.raw,
        streamUrl: source.url,
      };

      const hydratedQueue = workingQueue.map((track, index) =>
        index === nextIndex ? hydratedTrack : track
      );

      syncQueueState(hydratedQueue);
      setCurrentTrack(hydratedTrack);
      releaseCurrentObjectUrl();
      objectUrlRef.current = source.revokeOnChange ? source.url : "";
      audio.src = source.url;
      audio.load();
      await loadLyricsForTrack(hydratedTrack);
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
    { startIndex = 0, collection = null } = {}
  ) => {
    const normalizedQueue = normalizeQueue(tracks, collection);

    if (normalizedQueue.length === 0) {
      setErrorMessage("This collection does not have any playable tracks yet.");
      return;
    }

    const safeIndex =
      startIndex >= 0 && startIndex < normalizedQueue.length ? startIndex : 0;

    setActiveCollection(collection);
    syncQueueState(normalizedQueue);
    await playTrackByIndexRef.current?.(safeIndex, normalizedQueue);
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
    });

    const explicitStartIndex =
      typeof options.startIndex === "number" ? options.startIndex : -1;

    const fallbackStartIndex = queueToPlay.findIndex((queueItem) => {
      const candidate = queueItem?.track ?? queueItem;
      return candidate?.id && candidate.id === normalizedTrack.id;
    });

    await playCollection(queueToPlay, {
      startIndex:
        explicitStartIndex >= 0
          ? explicitStartIndex
          : Math.max(fallbackStartIndex, 0),
      collection: options.collection || null,
    });
  };

  const playAlbum = async (album, tracks = []) => {
    const albumTracks = tracks.length > 0 ? tracks : album?.tracks ?? [];

    await playCollection(albumTracks, {
      startIndex: 0,
      collection: {
        id: album?.id,
        type: "album",
        title: album?.title || "Album",
        image: album?.coverImage || "",
        artistName: album?.artist?.name || "",
      },
    });
  };

  const playPlaylist = async (playlist, tracks = []) => {
    const playlistTracks = tracks.length > 0 ? tracks : playlist?.tracks ?? [];

    await playCollection(playlistTracks, {
      startIndex: 0,
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
    const nextIndex = currentIndexRef.current + 1;

    if (nextIndex >= queueRef.current.length) {
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

    const boundedTime = Math.min(
      Math.max(Number(nextTime) || 0, 0),
      Number.isFinite(audio.duration) ? audio.duration : duration
    );

    audio.currentTime = boundedTime;
    setCurrentTime(boundedTime);
    syncLyricsRef.current?.(boundedTime, true);
  };

  const setVolumeLevel = (nextVolume) => {
    const boundedVolume = Math.min(Math.max(Number(nextVolume) || 0, 0), 1);

    if (audioRef.current) {
      audioRef.current.volume = boundedVolume;
    }

    setVolume(boundedVolume);
  };

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
    activeCollection,
    lyricsLines,
    activeLyricLineIndex,
    activeLyricWordIndex,
    isLyricsLoading,
    lyricsErrorMessage,
    playTrack,
    playAlbum,
    playPlaylist,
    playCollection,
    togglePlayPause,
    playNext,
    playPrevious,
    seekTo,
    setVolumeLevel,
  };

  return <PlayerContext.Provider value={ value }>{ children }</PlayerContext.Provider>;
};
