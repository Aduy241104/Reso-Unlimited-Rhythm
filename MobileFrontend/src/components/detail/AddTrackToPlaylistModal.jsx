import React from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppModal from '../common/AppModal';
import AppLoader from '../common/AppLoader';
import ErrorState from '../common/ErrorState';
import { formatDuration, getInitials, resolveImageUri } from '../../utils/media';

const readText = (value, fallback = '') => {
  if (typeof value === 'string' || typeof value === 'number') {
    const normalizedValue = String(value).trim();
    return normalizedValue || fallback;
  }

  return fallback;
};

const Artwork = ({ uri, label }) => {
  const imageUri = resolveImageUri(uri);

  if (imageUri) {
    return <Image source={{ uri: imageUri }} style={styles.artwork} resizeMode="cover" />;
  }

  return (
    <View style={[styles.artwork, styles.artworkFallback]}>
      <Text style={styles.artworkFallbackText}>{getInitials(label)}</Text>
    </View>
  );
};

const PlaylistRow = ({ item, isSubmitting, onPress }) => {
  const title = readText(item?.title, 'Playlist chưa có tên');
  const trackCount = Number(item?.trackCount) || 0;
  const durationLabel = Number(item?.totalDuration) > 0 ? formatDuration(item.totalDuration) : '';
  const visibilityLabel = item?.type === 'system' ? 'Hệ thống' : item?.isPublic ? 'Công khai' : 'Riêng tư';
  const metaLabel = [
    trackCount > 0 ? `${trackCount} bài hát` : 'Chưa có bài hát',
    durationLabel,
    visibilityLabel,
  ].filter(Boolean).join(' - ');

  return (
    <TouchableOpacity
      style={[styles.row, isSubmitting ? styles.rowDisabled : null]}
      activeOpacity={0.85}
      disabled={isSubmitting}
      onPress={onPress}
    >
      <Artwork uri={item?.coverImage || item?.image} label={title} />

      <View style={styles.rowContent}>
        <Text style={styles.rowTitle} numberOfLines={1}>{title}</Text>
        <Text style={styles.rowSubtitle} numberOfLines={2}>{metaLabel}</Text>
      </View>

      <View style={styles.rowAction}>
        {isSubmitting ? (
          <AppLoader size="small" color="#1ed760" />
        ) : (
          <Ionicons name="add-circle-outline" size={22} color="#1ed760" />
        )}
      </View>
    </TouchableOpacity>
  );
};

export default function AddTrackToPlaylistModal({
  errorMessage = '',
  isLoading = false,
  onClose,
  onRetry,
  onSelectPlaylist,
  playlists = [],
  submittingPlaylistId = '',
  trackTitle = '',
  visible = false,
}) {
  const safeTrackTitle = readText(trackTitle, 'bài hát này');

  return (
    <AppModal visible={visible} onClose={onClose} position="bottom">
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>THÊM VÀO PLAYLIST</Text>
          <Text style={styles.title}>Chọn playlist</Text>
          <Text style={styles.description} numberOfLines={2}>
            {`Lưu "${safeTrackTitle}" vào một trong các playlist cá nhân của bạn.`}
          </Text>
        </View>

        <TouchableOpacity style={styles.closeButton} activeOpacity={0.8} onPress={onClose}>
          <Text style={styles.closeButtonText}>Đóng</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.centerState}>
          <AppLoader size="large" />
        </View>
      ) : errorMessage ? (
        <View style={styles.centerState}>
          <ErrorState message={errorMessage} />
          <TouchableOpacity style={styles.retryButton} activeOpacity={0.85} onPress={onRetry}>
            <Text style={styles.retryButtonText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      ) : playlists.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Chưa có playlist cá nhân</Text>
          <Text style={styles.emptyText}>
            Hãy tạo playlist trong Thư viện trước, rồi quay lại đây để thêm bài hát này.
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {playlists.map((playlist, index) => {
            const playlistId = String(playlist?.id || playlist?._id || `playlist-${index}`);

            return (
              <PlaylistRow
                key={playlistId}
                item={playlist}
                isSubmitting={submittingPlaylistId === playlistId}
                onPress={() => onSelectPlaylist?.(playlist)}
              />
            );
          })}
        </ScrollView>
      )}
    </AppModal>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 18,
  },
  headerCopy: {
    flex: 1,
  },
  eyebrow: {
    color: '#8a8a8a',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  title: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '800',
    marginTop: 8,
  },
  description: {
    color: '#a3a3a3',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
  },
  closeButton: {
    paddingVertical: 4,
  },
  closeButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  centerState: {
    minHeight: 220,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    minHeight: 180,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#252525',
    backgroundColor: '#111111',
    padding: 18,
    justifyContent: 'center',
  },
  emptyTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  emptyText: {
    color: '#a3a3a3',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
  },
  retryButton: {
    minWidth: 150,
    marginTop: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#2d2d2d',
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 18,
    paddingVertical: 10,
    alignItems: 'center',
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  list: {
    maxHeight: 420,
  },
  listContent: {
    gap: 12,
    paddingBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#252525',
    backgroundColor: '#111111',
    padding: 12,
  },
  rowDisabled: {
    opacity: 0.72,
  },
  artwork: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#202020',
  },
  artworkFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  artworkFallbackText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
  },
  rowContent: {
    flex: 1,
    marginLeft: 12,
  },
  rowTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  rowSubtitle: {
    color: '#9a9a9a',
    fontSize: 11,
    lineHeight: 17,
    marginTop: 4,
  },
  rowAction: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
});
