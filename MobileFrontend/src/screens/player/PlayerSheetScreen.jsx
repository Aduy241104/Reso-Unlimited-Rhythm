import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import axiosClient from '../../api/axiosClient';
import { API_ENDPOINTS } from '../../api/apiEndpoints';
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
  const [trackDetailResponse, setTrackDetailResponse] = useState(null);
  const [artistProfileResponse, setArtistProfileResponse] = useState(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [detailErrorMessage, setDetailErrorMessage] = useState('');
  const requestRef = useRef(0);
  const {
    currentTrack,
    currentError,
    isBuffering,
    queue,
    currentIndex,
    isPlaying,
    progressSeconds,
    progressRatio,
    hasNext,
    hasPrevious,
    togglePlayback,
    playNext,
    playPrevious,
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
      setDetailErrorMessage(getErrorMessage(error, 'Unable to load track detail right now.'));
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

  const handleOpenLyrics = useCallback(() => {
    if (!currentTrack || !hasTimedLyrics) {
      return;
    }

    setIsLyricsVisible(true);
  }, [currentTrack, hasTimedLyrics]);

  return (
    <View style={styles.container}>
      <PlayerDetailSheet
        currentError={currentError}
        currentIndex={currentIndex}
        currentTrack={currentTrack}
        hasNext={hasNext}
        hasPrevious={hasPrevious}
        hasSyncedLyrics={hasTimedLyrics}
        isBuffering={isBuffering}
        isPlaying={isPlaying}
        artistProfileResponse={artistProfileResponse}
        detailErrorMessage={detailErrorMessage}
        isDetailLoading={isDetailLoading}
        onClose={() => navigation.goBack()}
        onOpenLyrics={handleOpenLyrics}
        onOpenQueue={() => setIsQueueVisible(true)}
        onPlayNext={playNext}
        onPlayPrevious={playPrevious}
        onRetryDetail={loadPlayerDetail}
        onTogglePlayback={togglePlayback}
        progressRatio={progressRatio}
        progressSeconds={progressSeconds}
        queueLength={queue.length}
        trackDetailResponse={trackDetailResponse}
      />

      <TrackLyricsBottomSheet
        visible={isLyricsVisible}
        onClose={() => setIsLyricsVisible(false)}
      />

      <TrackQueueBottomSheet
        visible={isQueueVisible}
        onClose={() => setIsQueueVisible(false)}
        title="Playing Queue"
        subtitle={`${queue.length} track${queue.length === 1 ? '' : 's'} in this session`}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
