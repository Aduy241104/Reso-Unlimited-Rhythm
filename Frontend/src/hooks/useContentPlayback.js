import { useState } from "react";
import { getAlbumDetailService } from "../services/albumService";
import { getPlaylistDetailService } from "../services/playlistService";
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
import {
  createRecommendationMixCollectionMeta,
  getRecommendationUserDisplayName,
} from "../utils/recommendation";
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
          "Khong the tai danh sach bai hat cua album de phat luc nay."
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
          "Khong the tai danh sach bai hat cua playlist de phat luc nay."
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
        setPlaybackError(
          "Bang xep hang ngay hien chua co bai hat nao de phat."
        );
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
          "Khong the tai bang xep hang bai hat theo ngay de phat luc nay."
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
        setPlaybackError(
          "Bang xep hang thang hien chua co bai hat nao de phat."
        );
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
          "Khong the tai bang xep hang bai hat theo thang de phat luc nay."
        )
      );
    }
  };

  const playRecommendationMixItem = async (item, user = null) => {
    const mix = item?.raw ?? item;
    const tracks = Array.isArray(mix?.tracks) ? mix.tracks : [];

    if (tracks.length === 0) {
      setPlaybackError("Playlist goi y nay hien chua co bai hat de phat.");
      return;
    }

    try {
      setPlaybackError("");
      await playCollection(tracks, {
        startIndex: 0,
        collection: createRecommendationMixCollectionMeta(
          mix,
          getRecommendationUserDisplayName(user)
        ),
      });
    } catch (error) {
      setPlaybackError(
        getApiErrorMessage(
          error,
          "Khong the phat playlist goi y ca nhan luc nay."
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
    playRecommendationMixItem,
  };
};
