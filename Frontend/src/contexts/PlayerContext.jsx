import { useEffect, useRef, useState } from "react";
import PlayerContext from "./player-context";
import { getApiErrorMessage } from "../utils/apiError";
import {
  getTrackPlaybackSource,
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
    streamUrl: resolveTrackMediaUrl(track),
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
  const audioRef = useRef(null);
  const queueRef = useRef([]);
  const currentIndexRef = useRef(-1);
  const objectUrlRef = useRef("");
  const playbackRequestIdRef = useRef(0);
  const playTrackByIndexRef = useRef(null);

  const syncQueueState = (nextQueue) => {
    queueRef.current = nextQueue;
    setQueue(nextQueue);
  };

  const releaseCurrentObjectUrl = () => {
    if (!objectUrlRef.current) {
      return;
    }

    URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = "";
  };

  useEffect(() => {
    const audio = new Audio();
    audio.preload = "metadata";
    audio.volume = DEFAULT_VOLUME;
    audioRef.current = audio;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime || 0);
    };

    const handleLoadedMetadata = () => {
      setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
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

    currentIndexRef.current = nextIndex;
    setCurrentIndex(nextIndex);
    setCurrentTrack(nextTrack);
    setCurrentTime(0);
    setDuration(nextTrack.duration || 0);
    setErrorMessage("");
    setIsBuffering(true);

    try {
      let source = null;

      if (nextTrack.streamUrl) {
        source = {
          url: nextTrack.streamUrl,
          revokeOnChange: false,
        };
      } else {
        source = await getTrackPlaybackSource(nextTrack.id);
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
        title: source.track?.title || nextTrack.title,
        artist: source.track?.artist || nextTrack.artist,
        artistName: source.track?.artist?.name || nextTrack.artistName,
        duration: Number(source.track?.duration) || nextTrack.duration,
        image:
          source.track?.coverImage ||
          source.track?.album?.coverImage ||
          nextTrack.image,
        playback: source.track?.playback || nextTrack.playback,
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
      return;
    }

    const previousIndex = currentIndexRef.current - 1;

    if (previousIndex < 0) {
      audio.currentTime = 0;
      setCurrentTime(0);
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
