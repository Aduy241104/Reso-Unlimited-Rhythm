import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppButton from '../../components/common/AppButton';
import AppLoader from '../../components/common/AppLoader';
import ErrorState from '../../components/common/ErrorState';
import { Artwork } from '../detail/EntityDetailComponents';
import artistService from '../../services/artistService';
import trackService from '../../services/trackService';
import { formatCompactNumber, formatDateLabel, formatMonthLabel } from '../../utils/media';

const TRACK_RANKING_LIMIT = 50;
const ARTIST_RANKING_LIMIT = 20;

const getScreenTitle = (contentType, period) => {
  const contentLabel = contentType === 'artist' ? 'nghệ sĩ' : 'bài hát';
  const periodLabel = period === 'monthly' ? 'tháng' : 'ngày';

  return `Top ${contentLabel} theo ${periodLabel}`;
};

const getPeriodLabel = ({ period, date, month }) => {
  if (period === 'monthly') {
    return formatMonthLabel(month) || month || 'Tháng gần nhất';
  }

  return formatDateLabel(date) || date || 'Ngày gần nhất';
};

const RankingRow = ({ item, index, contentType, onPress }) => {
  const isArtist = contentType === 'artist';
  const title = isArtist ? item.name : item.title;
  const image = isArtist ? item.avatar : item.image;
  const subtitle = isArtist
    ? `${formatCompactNumber(item.playCount)} lượt phát · ${formatCompactNumber(item.uniqueListeners)} người nghe`
    : `${item.artistName || 'Nghệ sĩ không xác định'} · ${formatCompactNumber(item.playCount)} lượt phát`;

  return (
    <TouchableOpacity style={styles.rankingRow} activeOpacity={0.8} onPress={onPress}>
      <Text style={styles.rankText}>#{item.rank || index + 1}</Text>
      <Artwork
        uri={image}
        label={title}
        rounded={isArtist}
        style={[styles.rowArtwork, isArtist && styles.artistArtwork]}
        textStyle={styles.rowArtworkText}
      />
      <View style={styles.rowContent}>
        <Text style={styles.rowTitle} numberOfLines={1}>{title}</Text>
        <Text style={styles.rowSubtitle} numberOfLines={1}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#737373" />
    </TouchableOpacity>
  );
};

export default function RankingListScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const contentType = route.params?.contentType === 'artist' ? 'artist' : 'track';
  const period = route.params?.period === 'monthly' ? 'monthly' : 'daily';
  const date = route.params?.date || '';
  const month = route.params?.month || '';
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const title = useMemo(() => getScreenTitle(contentType, period), [contentType, period]);
  const periodLabel = useMemo(
    () => getPeriodLabel({ period, date, month }),
    [date, month, period]
  );

  const loadRanking = useCallback(async ({ refresh = false } = {}) => {
    if (refresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      let result;

      if (contentType === 'artist') {
        result = period === 'monthly'
          ? await artistService.getMonthlyTopArtists({ month, limit: ARTIST_RANKING_LIMIT })
          : await artistService.getDailyTopArtists({ date, limit: ARTIST_RANKING_LIMIT });
      } else {
        result = period === 'monthly'
          ? await trackService.getMonthlyTopTracks({ month, limit: TRACK_RANKING_LIMIT })
          : await trackService.getDailyTopTracks({ date, limit: TRACK_RANKING_LIMIT });
      }

      setItems(Array.isArray(result?.items) ? result.items : []);
      setErrorMessage('');
    } catch (error) {
      setItems([]);
      setErrorMessage(error?.message || 'Không thể tải bảng xếp hạng lúc này.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [contentType, date, month, period]);

  useEffect(() => {
    loadRanking();
  }, [loadRanking]);

  const handleOpenItem = useCallback((item) => {
    const entityId = item?.entityId || item?.id;

    if (!entityId) {
      return;
    }

    navigation.navigate('EntityDetail', {
      entityType: contentType,
      entityId,
      initialTitle: contentType === 'artist' ? item.name : item.title,
    });
  }, [contentType, navigation]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity
          style={styles.backButton}
          activeOpacity={0.75}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={22} color="#ffffff" />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>{periodLabel}</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {isLoading ? (
        <View style={styles.centerState}>
          <AppLoader size="large" />
        </View>
      ) : errorMessage ? (
        <View style={styles.centerState}>
          <ErrorState message={errorMessage} />
          <AppButton title="Thử lại" onPress={() => loadRanking()} style={styles.retryButton} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item, index) => `${contentType}-${item.entityId || item.id || index}`}
          renderItem={({ item, index }) => (
            <RankingRow
              item={item}
              index={index}
              contentType={contentType}
              onPress={() => handleOpenItem(item)}
            />
          )}
          contentContainerStyle={[
            styles.listContent,
            items.length === 0 && styles.emptyListContent,
            { paddingBottom: 28 + insets.bottom },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={(
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => loadRanking({ refresh: true })}
              tintColor="#ffffff"
            />
          )}
          ListHeaderComponent={(
            <View style={styles.listHeader}>
              <Text style={styles.listEyebrow}>BẢNG XẾP HẠNG</Text>
              <Text style={styles.listTitle}>{items.length} kết quả</Text>
            </View>
          )}
          ListEmptyComponent={(
            <View style={styles.emptyState}>
              <Ionicons name="stats-chart-outline" size={28} color="#737373" />
              <Text style={styles.emptyTitle}>Chưa có dữ liệu xếp hạng</Text>
              <Text style={styles.emptyText}>Hãy kéo xuống để làm mới danh sách.</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1f1f1f',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: '#151515',
  },
  headerCopy: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: '#8f8f8f',
    fontSize: 11,
    marginTop: 2,
  },
  headerSpacer: {
    width: 40,
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  retryButton: {
    minWidth: 150,
    marginTop: 12,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 18,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  listHeader: {
    marginBottom: 10,
  },
  listEyebrow: {
    color: '#8f8f8f',
    fontSize: 9,
    letterSpacing: 1.8,
  },
  listTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 4,
  },
  rankingRow: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#1c1c1c',
  },
  rankText: {
    width: 34,
    color: '#a3a3a3',
    fontSize: 13,
    fontWeight: '700',
  },
  rowArtwork: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  rowArtworkText: {
    fontSize: 13,
  },
  artistArtwork: {
    borderRadius: 24,
  },
  rowContent: {
    flex: 1,
    minWidth: 0,
    marginHorizontal: 12,
  },
  rowTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  rowSubtitle: {
    color: '#8f8f8f',
    fontSize: 11,
    marginTop: 4,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  emptyTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 12,
  },
  emptyText: {
    color: '#8f8f8f',
    fontSize: 12,
    marginTop: 6,
    textAlign: 'center',
  },
});
