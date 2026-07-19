import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const READ_END_OFFSET = 24;

export default function ArtistDeclarationModal({
  visible,
  title,
  description,
  sections,
  acceptLabel,
  onClose,
  onAccept,
  bottomInset = 0,
}) {
  const [hasReadToEnd, setHasReadToEnd] = useState(false);
  const [contentHeight, setContentHeight] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);

  useEffect(() => {
    if (visible) {
      setHasReadToEnd(false);
      setContentHeight(0);
      setViewportHeight(0);
    }
  }, [visible]);

  useEffect(() => {
    if (contentHeight > 0 && viewportHeight > 0 && contentHeight <= viewportHeight + READ_END_OFFSET) {
      setHasReadToEnd(true);
    }
  }, [contentHeight, viewportHeight]);

  const contentSections = useMemo(
    () => (Array.isArray(sections) ? sections.filter(Boolean) : []),
    [sections]
  );

  const handleScroll = ({ nativeEvent }) => {
    const { contentOffset, contentSize, layoutMeasurement } = nativeEvent;
    const hasReachedEnd = contentOffset.y + layoutMeasurement.height >= contentSize.height - READ_END_OFFSET;

    if (hasReachedEnd) {
      setHasReadToEnd(true);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.backdrop} />
        <View style={[styles.card, { marginBottom: Math.max(bottomInset, 16) }]}>
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <Text style={styles.title}>{title}</Text>
              {description ? <Text style={styles.subtitle}>{description}</Text> : null}
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose} activeOpacity={0.85}>
              <Ionicons name="close" size={20} color="#ffffff" />
            </TouchableOpacity>
          </View>

          <View style={styles.noticeBox}>
            <Ionicons name="document-text-outline" size={18} color="#f3c26b" />
            <Text style={styles.noticeText}>Vui lòng đọc hết nội dung bên dưới trước khi xác nhận.</Text>
          </View>

          <ScrollView
            style={styles.contentScroll}
            contentContainerStyle={styles.contentBody}
            showsVerticalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            onContentSizeChange={(_, height) => setContentHeight(height)}
            onLayout={(event) => setViewportHeight(event.nativeEvent.layout.height)}
          >
            {contentSections.map((section, index) => (
              <View key={`${section.heading}-${index}`} style={styles.section}>
                <Text style={styles.sectionHeading}>{section.heading}</Text>
                <Text style={styles.sectionText}>{section.body}</Text>
              </View>
            ))}
          </ScrollView>

          <Text style={[styles.readHint, hasReadToEnd ? styles.readHintDone : null]}>
            {hasReadToEnd ? 'Bạn đã đọc hết nội dung, có thể xác nhận.' : 'Cuộn xuống cuối để mở nút xác nhận.'}
          </Text>

          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.secondaryButton} onPress={onClose} activeOpacity={0.85}>
              <Text style={styles.secondaryButtonText}>Hủy</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.primaryButton, !hasReadToEnd ? styles.primaryButtonDisabled : null]}
              onPress={onAccept}
              activeOpacity={0.85}
              disabled={!hasReadToEnd}
            >
              <Text style={[styles.primaryButtonText, !hasReadToEnd ? styles.primaryButtonTextDisabled : null]}>
                {acceptLabel}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  card: {
    backgroundColor: '#101114',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#2d2f36',
    padding: 16,
    maxHeight: '84%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
  },
  subtitle: {
    color: '#9da3ae',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#181a1f',
    borderWidth: 1,
    borderColor: '#2b2d35',
  },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#4a3b23',
    backgroundColor: '#1d1710',
  },
  noticeText: {
    flex: 1,
    color: '#f5dfb5',
    fontSize: 12,
    lineHeight: 18,
  },
  contentScroll: {
    marginTop: 14,
    flexGrow: 0,
  },
  contentBody: {
    paddingBottom: 8,
  },
  section: {
    marginBottom: 14,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2b2d35',
    backgroundColor: '#15171c',
  },
  sectionHeading: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 8,
  },
  sectionText: {
    color: '#c6cad2',
    fontSize: 12,
    lineHeight: 20,
  },
  readHint: {
    color: '#f3c26b',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  readHintDone: {
    color: '#7ff0a6',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  secondaryButton: {
    flex: 1,
    height: 48,
    borderRadius: 999,
    backgroundColor: '#1a1c21',
    borderWidth: 1,
    borderColor: '#2c2f36',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  primaryButton: {
    flex: 1,
    height: 48,
    borderRadius: 999,
    backgroundColor: '#f3c26b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonDisabled: {
    backgroundColor: '#403629',
  },
  primaryButtonText: {
    color: '#201507',
    fontSize: 14,
    fontWeight: '800',
  },
  primaryButtonTextDisabled: {
    color: '#9c8c73',
  },
});