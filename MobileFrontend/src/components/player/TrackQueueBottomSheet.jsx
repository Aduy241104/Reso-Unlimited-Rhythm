import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import usePlayer from '../../hooks/usePlayer';

const QueueActionButton = ({ color = '#d0d0d0', disabled = false, icon, onPress }) => (
  <Pressable
    style={[styles.actionButton, disabled && styles.actionButtonDisabled]}
    onPress={onPress}
    disabled={disabled}
    hitSlop={6}
  >
    <Ionicons name={icon} size={16} color={disabled ? '#575757' : color} />
  </Pressable>
);

export default function TrackQueueBottomSheet({
  visible,
  onClose,
  title = 'Track Queue',
  subtitle = '',
}) {
  const insets = useSafeAreaInsets();
  const {
    currentIndex,
    isPlaying,
    playAtIndex,
    queue,
    clearUpcoming,
    moveQueueItem,
    removeFromQueue,
  } = usePlayer();
  const hasUpcoming = currentIndex >= 0 && currentIndex < queue.length - 1;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropTap} onPress={onClose} />

        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 18) + 18 }]}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.subtitle}>
                {subtitle || `${queue.length} track${queue.length === 1 ? '' : 's'} in queue`}
              </Text>
            </View>

            <Pressable style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={18} color="#ffffff" />
            </Pressable>
          </View>

          <View style={styles.summaryRow}>
            <View>
              <Text style={styles.summaryLabel}>Now Playing</Text>
              <Text style={styles.summaryValue}>
                {currentIndex >= 0 ? `Track ${currentIndex + 1} of ${queue.length}` : 'No active track'}
              </Text>
            </View>

            {hasUpcoming ? (
              <Pressable style={styles.clearButton} onPress={clearUpcoming}>
                <Ionicons name="trash-outline" size={14} color="#ffffff" />
                <Text style={styles.clearButtonText}>Clear Next</Text>
              </Pressable>
            ) : null}
          </View>

          <ScrollView style={styles.queueList} showsVerticalScrollIndicator={false}>
            {queue.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="musical-notes-outline" size={22} color="#6f6f6f" />
                <Text style={styles.emptyTitle}>Queue is empty</Text>
                <Text style={styles.emptyText}>Play a playlist, artist, or track collection to manage the upcoming songs here.</Text>
              </View>
            ) : (
              queue.map((item, index) => {
                const isActive = index === currentIndex;
                const canMoveUp = index > 0;
                const canMoveDown = index < queue.length - 1;

                const handleMove = (event, nextIndex) => {
                  event.stopPropagation();
                  moveQueueItem(index, nextIndex);
                };

                const handleRemove = (event) => {
                  event.stopPropagation();
                  removeFromQueue(index);
                };

                const handleSelectTrack = () => {
                  if (!isActive) {
                    playAtIndex(index, { autoPlay: true });
                  }
                };

                return (
                  <Pressable
                    key={`${item.id}-${index}`}
                    style={[styles.queueItem, isActive && styles.queueItemActive]}
                    onPress={handleSelectTrack}
                  >
                    <View style={[styles.indexBadge, isActive && styles.indexBadgeActive]}>
                      {isActive ? (
                        <Ionicons name={isPlaying ? 'volume-high' : 'pause'} size={14} color="#1ed760" />
                      ) : (
                        <Text style={styles.indexText}>{index + 1}</Text>
                      )}
                    </View>

                    <View style={styles.queueCopy}>
                      <Text style={[styles.trackTitle, isActive && styles.trackTitleActive]} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text style={styles.trackSubtitle} numberOfLines={1}>
                        {item.artistName || 'Unknown artist'}
                      </Text>
                    </View>

                    <Text style={styles.trackDuration}>{item.durationLabel}</Text>

                    <View style={styles.actionsRow}>
                      <QueueActionButton
                        icon="chevron-up"
                        disabled={!canMoveUp}
                        onPress={(event) => handleMove(event, index - 1)}
                      />
                      <QueueActionButton
                        icon="chevron-down"
                        disabled={!canMoveDown}
                        onPress={(event) => handleMove(event, index + 1)}
                      />
                      <QueueActionButton icon="close" color="#ff8f8f" onPress={handleRemove} />
                    </View>
                  </Pressable>
                );
              })
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.52)',
    justifyContent: 'flex-end',
  },
  backdropTap: {
    flex: 1,
  },
  sheet: {
    maxHeight: '86%',
    minHeight: '58%',
    backgroundColor: '#0c0c0c',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#232323',
    paddingHorizontal: 18,
    paddingTop: 10,
  },
  handle: {
    alignSelf: 'center',
    width: 48,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#4b4b4b',
    marginBottom: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerCopy: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
  },
  subtitle: {
    color: '#9b9b9b',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#171717',
    borderWidth: 1,
    borderColor: '#252525',
  },
  summaryRow: {
    marginTop: 18,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 18,
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#222222',
  },
  summaryLabel: {
    color: '#7f7f7f',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  summaryValue: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1b1b1b',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  clearButtonText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  queueList: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 44,
  },
  emptyTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 12,
  },
  emptyText: {
    color: '#989898',
    fontSize: 12,
    lineHeight: 19,
    marginTop: 8,
    textAlign: 'center',
  },
  queueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1d1d1d',
  },
  queueItemActive: {
    borderBottomColor: '#26432d',
  },
  indexBadge: {
    width: 28,
    height: 28,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: '#1f1f1f',
    marginRight: 12,
  },
  indexBadgeActive: {
    backgroundColor: '#102015',
    borderColor: '#2b5d39',
  },
  indexText: {
    color: '#8a8a8a',
    fontSize: 11,
    fontWeight: '800',
  },
  queueCopy: {
    flex: 1,
    marginRight: 10,
  },
  trackTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  trackTitleActive: {
    color: '#1ed760',
  },
  trackSubtitle: {
    color: '#9a9a9a',
    fontSize: 11,
    marginTop: 4,
  },
  trackDuration: {
    color: '#8c8c8c',
    fontSize: 11,
    fontWeight: '700',
    marginRight: 10,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: '#262626',
  },
  actionButtonDisabled: {
    opacity: 0.55,
  },
});
