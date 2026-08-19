import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import axiosClient from '../../api/axiosClient';
import { API_ENDPOINTS } from '../../api/apiEndpoints';
import AudioQualityBottomSheet from '../../components/player/AudioQualityBottomSheet';
import PlayerDetailSheet from '../../components/player/PlayerDetailSheet';
import TrackLyricsBottomSheet from '../../components/player/TrackLyricsBottomSheet';
import TrackQueueBottomSheet from '../../components/player/TrackQueueBottomSheet';
import usePlayer from '../../hooks/usePlayer';
import { getErrorMessage } from '../../utils/media';
import { hasSyncedLrc } from '../../utils/player';

export default function PlayerSheetScreen() {
  const navigation = useNavigation();
  const [isQueueVisible, setIsQueueVisible] = useState(false);
  const [isLyricsVisible, setIsLyricsVisible] = useState(false);
  const [isQualityMenuVisible, setIsQualityMenuVisible] = useState(false);
  const [trackDetailResponse, setTrackDetailResponse] = useState(null);
  const [artistProfileResponse, setArtistProfileResponse] = useState(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [detailErrorMessage, setDetailErrorMessage] = useState('');
  const requestRef = useRef(0);
  const {
    currentTrack,
    currentError,
    duration,
    isBuffering,
    isPremium,
    isShuffleEnabled,
    queue,
    currentIndex,
    isPlaying,
    repeatMode,
    availableAudioQualities,
    selectedAudioQuality,
    progressSeconds,
    progressRatio,
    hasNext,
    hasPrevious,
    togglePlayback,
    playNext,
    playPrevious,
    seekTo,
    toggleShuffle,
    cycleRepeatMode,
    changeAudioQuality,
  } = usePlayer();
  const trackId = currentTrack?.entityId || currentTrack?.id || '';
  const hasTimedLyrics = hasSyncedLrc(currentTrack);

  const loadPlayerDetail = useCallback(async () => {
    if (!trackId) {
      requestRef.current += 1;
      setTrackDetailResponse(null);
      setArtistProfileResponse(null);
      setDetailErrorMessage('');
      setIsDetailLoading(false);
      return;
    }

    const requestId = requestRef.current + 1;
    requestRef.current = requestId;
    setIsDetailLoading(true);
    setTrackDetailResponse(null);
    setArtistProfileResponse(null);
    setDetailErrorMessage('');

    try {
      const trackResponse = await axiosClient.get(`${API_ENDPOINTS.TRACKS.DETAIL}/${trackId}`);

      if (requestRef.current !== requestId) {
        return;
      }

      setTrackDetailResponse(trackResponse);
      const artistId = trackResponse?.data?.track?.artist?.id;

      if (artistId) {
        try {
          const artistResponse = await axiosClient.get(`${API_ENDPOINTS.ARTISTS.DETAIL}/${encodeURIComponent(artistId)}/profile`);

          if (requestRef.current !== requestId) {
            return;
          }

          setArtistProfileResponse(artistResponse);
        } catch {
          if (requestRef.current !== requestId) {
            return;
          }

          setArtistProfileResponse(null);
        }
      } else {
        setArtistProfileResponse(null);
      }
    } catch (error) {
      if (requestRef.current !== requestId) {
        return;
      }

      setTrackDetailResponse(null);
      setArtistProfileResponse(null);
      setDetailErrorMessage(getErrorMessage(error, 'Không thể tải chi tiết bài hát lúc này.'));
    } finally {
      if (requestRef.current === requestId) {
        setIsDetailLoading(false);
      }
    }
  }, [trackId]);

  useEffect(() => {
    void loadPlayerDetail();
  }, [loadPlayerDetail]);

  useEffect(() => {
    if (currentTrack && hasTimedLyrics) {
      return;
    }

    setIsLyricsVisible(false);
  }, [currentTrack, hasTimedLyrics]);

  useEffect(() => {
    if (currentTrack) {
      return;
    }

    setIsQualityMenuVisible(false);
  }, [currentTrack]);

  const handleOpenLyrics = useCallback(() => {
    if (!currentTrack || !hasTimedLyrics) {
      return;
    }

    setIsLyricsVisible(true);
  }, [currentTrack, hasTimedLyrics]);

  const handleOpenTrackDetail = useCallback(() => {
    if (!trackId) {
      return;
    }

    navigation.replace('EntityDetail', {
      entityType: 'track',
      entityId: trackId,
      initialTitle: currentTrack?.title || 'Chi tiết bài hát',
    });
  }, [currentTrack?.title, navigation, trackId]);

  const handlePremiumRequired = useCallback((feature = 'Tính năng này') => {
    Alert.alert(
      'Dành cho tài khoản Premium',
      `${feature} chỉ khả dụng khi tài khoản đang có Premium.`,
      [{ text: 'Đóng', style: 'cancel' }]
    );
  }, []);

  const handleSeek = useCallback((nextPosition) => {
    if (!isPremium) {
      handlePremiumRequired('Tua bài hát');
      return;
    }

    seekTo(nextPosition);
  }, [handlePremiumRequired, isPremium, seekTo]);

  const handleToggleShuffle = useCallback(() => {
    toggleShuffle();
  }, [toggleShuffle]);

  const handleCycleRepeat = useCallback(() => {
    if (!isPremium) {
      handlePremiumRequired('Chế độ lặp');
      return;
    }

    cycleRepeatMode();
  }, [cycleRepeatMode, handlePremiumRequired, isPremium]);

  const handleSelectQuality = useCallback(async (quality) => {
    if (!isPremium) {
      handlePremiumRequired('Chọn chất lượng âm thanh');
      return;
    }

    const didChange = await changeAudioQuality(quality);

    if (!didChange) {
      Alert.alert('Không thể đổi chất lượng', 'Vui lòng thử lại sau khi bài hát tải xong.');
    }
  }, [changeAudioQuality, handlePremiumRequired, isPremium]);

  return (
    <View style={styles.container}>
      <PlayerDetailSheet
        currentError={currentError}
        currentIndex={currentIndex}
        currentTrack={currentTrack}
        duration={duration}
        hasNext={hasNext}
        hasPrevious={hasPrevious}
        hasSyncedLyrics={hasTimedLyrics}
        isBuffering={isBuffering}
        isPremium={isPremium}
        isShuffleEnabled={isShuffleEnabled}
        isPlaying={isPlaying}
        artistProfileResponse={artistProfileResponse}
        detailErrorMessage={detailErrorMessage}
        isDetailLoading={isDetailLoading}
        onClose={() => navigation.goBack()}
        onOpenLyrics={handleOpenLyrics}
        onOpenTrackDetail={handleOpenTrackDetail}
        onOpenQueue={() => setIsQueueVisible(true)}
        onPlayNext={playNext}
        onPlayPrevious={playPrevious}
        onPremiumRequired={handlePremiumRequired}
        onOpenQualityMenu={() => setIsQualityMenuVisible(true)}
        onRetryDetail={loadPlayerDetail}
        onSeek={handleSeek}
        onToggleShuffle={handleToggleShuffle}
        onCycleRepeat={handleCycleRepeat}
        onTogglePlayback={togglePlayback}
        progressRatio={progressRatio}
        progressSeconds={progressSeconds}
        queueLength={queue.length}
        repeatMode={repeatMode}
        availableAudioQualities={availableAudioQualities}
        selectedAudioQuality={selectedAudioQuality}
        trackDetailResponse={trackDetailResponse}
      />

      <TrackLyricsBottomSheet
        visible={isLyricsVisible}
        onClose={() => setIsLyricsVisible(false)}
      />

      <TrackQueueBottomSheet
        visible={isQueueVisible}
        onClose={() => setIsQueueVisible(false)}
        title="Hàng chờ phát"
        subtitle={`${queue.length} bài hát trong phiên này`}
      />
      <AudioQualityBottomSheet
        visible={isQualityMenuVisible}
        onClose={() => setIsQualityMenuVisible(false)}
        availableAudioQualities={availableAudioQualities}
        selectedAudioQuality={selectedAudioQuality}
        isPremium={isPremium}
        onPremiumRequired={handlePremiumRequired}
        onSelectQuality={handleSelectQuality}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
