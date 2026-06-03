import { useState } from "react";
import { getAlbumDetailService } from "../services/albumService";
import {
  getPlaylistDetailService,
} from "../services/playlistService";
import {
  getDailyTopTracksService,
  getMonthlyTopTracksService,
} from "../services/trackService";
import { getApiErrorMessage } from "../utils/apiError";
import {
  DAILY_TOP_TRACK_LIMIT,
  createDailyTopTracksCollectionMeta,
  getDailyTopTracksHeroImage,
  getPreviousDateValue,
} from "../utils/dailyTopTracks";
import {
  MONTHLY_TOP_TRACK_LIMIT,
  createMonthlyTopTracksCollectionMeta,
  getCurrentMonthValue,
  getMonthlyTopTracksHeroImage,
} from "../utils/monthlyTopTracks";
import { getResourceId } from "../utils/homeContent";
import { usePlayer } from "./usePlayer";

export const useContentPlayback = () => {
  const [playbackError, setPlaybackError] = useState("");
  const { playAlbum, playPlaylist, playCollection } = usePlayer();

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

  const playDailyTopTracksItem = async (item) => {
    const selectedDate = item?.raw?.date || getPreviousDateValue();
    const selectedLimit = Number(item?.raw?.limit) || DAILY_TOP_TRACK_LIMIT;

    try {
      setPlaybackError("");

      const response = await getDailyTopTracksService({
        date: selectedDate,
        limit: selectedLimit,
      });
      const topTracks = response?.topTracks ?? [];

      if (topTracks.length === 0) {
        setPlaybackError("This daily chart does not have any playable tracks yet.");
        return;
      }

      const heroImage =
        item?.image ||
        item?.raw?.image ||
        getDailyTopTracksHeroImage(topTracks);

      await playCollection(topTracks, {
        startIndex: 0,
        collection: createDailyTopTracksCollectionMeta({
          date: response?.meta?.date || selectedDate,
          image: heroImage,
        }),
      });
    } catch (error) {
      setPlaybackError(
        getApiErrorMessage(
          error,
          "Unable to load the daily top tracks for playback right now."
        )
      );
    }
  };

  const playMonthlyTopTracksItem = async (item) => {
    const selectedMonth = item?.raw?.month || getCurrentMonthValue();
    const selectedLimit = Number(item?.raw?.limit) || MONTHLY_TOP_TRACK_LIMIT;

    try {
      setPlaybackError("");

      const response = await getMonthlyTopTracksService({
        month: selectedMonth,
        limit: selectedLimit,
      });
      const topTracks = response?.topTracks ?? [];

      if (topTracks.length === 0) {
        setPlaybackError("This monthly chart does not have any playable tracks yet.");
        return;
      }

      const heroImage =
        item?.image ||
        item?.raw?.image ||
        getMonthlyTopTracksHeroImage(topTracks);

      await playCollection(topTracks, {
        startIndex: 0,
        collection: createMonthlyTopTracksCollectionMeta({
          month: response?.meta?.date || selectedMonth,
          image: heroImage,
        }),
      });
    } catch (error) {
      setPlaybackError(
        getApiErrorMessage(
          error,
          "Unable to load the monthly top tracks for playback right now."
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
    playDailyTopTracksItem,
    playMonthlyTopTracksItem,
    playPlaylistItem,
  };
};
