import { useState } from "react";
import { getAlbumDetailService } from "../services/albumService";
import {
  getPlaylistDetailService,
} from "../services/playlistService";
import { getApiErrorMessage } from "../utils/apiError";
import { getResourceId } from "../utils/homeContent";
import { usePlayer } from "./usePlayer";

export const useContentPlayback = () => {
  const [playbackError, setPlaybackError] = useState("");
  const { playAlbum, playPlaylist } = usePlayer();

  const playAlbumItem = async (item) => {
    const albumSummary = item?.raw ?? item;
    const albumId = getResourceId(albumSummary);

    if (!albumId) {
      return;
    }

    try {
      setPlaybackError("");
      const albumDetail = await getAlbumDetailService(albumId);
      await playAlbum(albumDetail, albumDetail?.tracks ?? []);
    } catch (error) {
      setPlaybackError(
        getApiErrorMessage(
          error,
          "Unable to load the album tracks for playback right now."
        )
      );
    }
  };

  const playPlaylistItem = async (item) => {
    const playlistSummary = item?.raw ?? item;
    const playlistId = getResourceId(playlistSummary);

    if (!playlistId) {
      return;
    }

    try {
      setPlaybackError("");
      const playlistDetail = await getPlaylistDetailService(playlistId);
      await playPlaylist(playlistDetail, playlistDetail?.tracks ?? []);
    } catch (error) {
      setPlaybackError(
        getApiErrorMessage(
          error,
          "Unable to load the playlist tracks for playback right now."
        )
      );
    }
  };

  const clearPlaybackError = () => {
    setPlaybackError("");
  };

  return {
    playbackError,
    clearPlaybackError,
    playAlbumItem,
    playPlaylistItem,
  };
};
