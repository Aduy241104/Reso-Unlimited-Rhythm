import { Platform, StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },

  statusBarBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 25,
    backgroundColor: '#121212',
  },

  centerState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#121212',
  },

  retryButton: {
    marginTop: 18,
    borderRadius: 999,
    paddingHorizontal: 22,
    paddingVertical: 11,
    backgroundColor: '#ffffff',
  },

  retryButtonText: {
    color: '#000000',
    fontSize: 13,
    fontWeight: '800',
  },

  backButton: {
    position: 'absolute',
    left: 8,
    zIndex: 30,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  scrollBody: {
    backgroundColor: '#121212',
  },

  heroSection: {
    position: 'relative',
    overflow: 'hidden',
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: '#121212',
  },

  heroRedLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 280,
    backgroundColor: '#d9272b',
  },

  heroDarkLayer: {
    position: 'absolute',
    top: 185,
    left: 0,
    right: 0,
    height: 170,
    backgroundColor: '#3a1f1f',
    opacity: 0.92,
  },

  heroBlackLayer: {
    position: 'absolute',
    top: 320,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#121212',
  },
artwork: {
    backgroundColor: '#282828',
  },

  artworkFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  roundedArtwork: {
    borderRadius: 999,
  },

  artworkFallbackText: {
    color: '#ffffff',
    fontWeight: '900',
    letterSpacing: 1,
  },

  heroImage: {
    alignSelf: 'center',
    width: 224,
    height: 224,
    borderRadius: 4,
    marginBottom: 14,
    backgroundColor: '#282828',

    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOpacity: 0.45,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 12 },
      },
      android: {
        elevation: 12,
      },
    }),
  },

  heroArtistImage: {
    alignSelf: 'stretch',
    width: 'auto',
    height: 360,
    marginHorizontal: -16,
    borderRadius: 0,
  },

  heroFallbackText: {
    fontSize: 42,
    fontWeight: '900',
    color: '#ffffff',
  },

  heroTitle: {
    color: '#ffffff',
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '900',
    letterSpacing: -0.4,
    marginTop: 2,
  },

  artistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 9,
  },

  artistAvatar: {
    width: 23,
    height: 23,
    borderRadius: 12,
    marginRight: 8,
  },

  artistAvatarText: {
    fontSize: 9,
    color: '#ffffff',
    fontWeight: '900',
  },

  artistName: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },

  statCard: {
    width: '48.5%',
    minHeight: 84,
    backgroundColor: '#141414',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#262626',
    paddingHorizontal: 14,
    paddingVertical: 12,
    justifyContent: 'space-between',
  },

  trackStatCardPlain: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    paddingHorizontal: 6,
    paddingVertical: 8,
    minHeight: 64,
  },

  statCardFull: {
    width: '100%',
  },

  statValue: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
  },

  statLabel: {
    color: '#8a8a8a',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 8,
  },

  metaLine: {
    color: '#b7b7b7',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
    marginTop: 8,
  },

  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },

  artistStatsList: {
    marginTop: 16,
    gap: 10,
  },

  artistStatRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },

  artistStatValue: {
    minWidth: 54,
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
    marginRight: 10,
  },

  artistStatLabel: {
    flex: 1,
    color: '#b3b3b3',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },

  iconActionButton: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },

  iconActionButtonDisabled: {
    opacity: 0.6,
  },

  actionSpacer: {
    flex: 1,
  },

  shuffleButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },

  playCircleButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1ed760',

    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOpacity: 0.28,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 7 },
      },
      android: {
        elevation: 8,
      },
    }),
  },

  trackPlayCircleButton: {
    backgroundColor: '#ffffff',
  },

  trackList: {
    paddingHorizontal: 16,
    paddingTop: 8,
    backgroundColor: '#121212',
  },

  listItem: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 6,
    paddingHorizontal: 0,
    paddingVertical: 6,
  },

  listItemPressed: {
    backgroundColor: '#1f1f1f',
  },

  listIndex: {
    width: 24,
    marginRight: 8,
    color: '#b3b3b3',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },

  listArtwork: {
    width: 44,
    height: 44,
    borderRadius: 4,
    marginRight: 12,
  },

  listArtworkText: {
    fontSize: 13,
    color: '#ffffff',
    fontWeight: '800',
  },

  listContent: {
    flex: 1,
    justifyContent: 'center',
  },

  listTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '500',
    letterSpacing: -0.1,
  },

  listSubtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },

  explicitBadge: {
    width: 13,
    height: 13,
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#b3b3b3',
    marginRight: 5,
  },

  explicitBadgeText: {
    color: '#121212',
    fontSize: 8,
    fontWeight: '900',
  },

  listSubtitle: {
    flexShrink: 1,
    color: '#b3b3b3',
    fontSize: 13,
    fontWeight: '500',
  },

  listActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },

  listActionButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },

  moreButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },

  section: {
    paddingHorizontal: 16,
    marginTop: 18,
  },

  trackSectionCompact: {
    paddingHorizontal: 8,
    marginTop: 14,
  },

  sectionTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 12,
  },

  panel: {
    backgroundColor: '#141414',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#262626',
    overflow: 'hidden',
  },

  trackPanelPlain: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderRadius: 0,
    overflow: 'visible',
  },

  albumSurfacePlain: {
    backgroundColor: 'transparent',
    borderWidth: 0,
  },

  artistTrackPanelPlain: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderRadius: 0,
  },

  artistTrackListItem: {
    paddingHorizontal: 0,
  },

  artistTrackArtwork: {
    borderRadius: 4,
  },

  artistAlbumList: {
    paddingRight: 16,
    gap: 14,
  },

  artistAlbumCard: {
    width: 128,
    marginHorizontal: 0,
  },

  infoPanel: {
    borderRadius: 12,
    padding: 14,
    backgroundColor: '#181818',
  },

  albumInfoPlain: {
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
    paddingVertical: 0,
  },

  artistInfoPlain: {
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
    paddingVertical: 0,
  },

  trackInfoPlain: {
    backgroundColor: 'transparent',
    borderRadius: 0,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },

  extraText: {
    color: '#d0d0d0',
    fontSize: 13,
    lineHeight: 20,
  },

  tagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  tagPill: {
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 8,
    backgroundColor: '#242424',
  },

  albumTagPlain: {
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
    paddingVertical: 0,
  },

  trackTagPlain: {
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
    paddingVertical: 0,
  },

  tagText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },

  metaRow: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#242424',
  },

  trackMetaRowPlain: {
    paddingHorizontal: 0,
    borderBottomWidth: 0,
  },

  metaRowLast: {
    borderBottomWidth: 0,
  },

  metaLabel: {
    color: '#8f8f8f',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 6,
  },

  metaValueWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },

  metaValue: {
    flex: 1,
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },

  ownerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141414',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#262626',
    padding: 14,
  },

  ownerAvatar: {
    width: 46,
    height: 46,
    borderRadius: 999,
    backgroundColor: '#202020',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  ownerAvatarText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },

  ownerContent: {
    flex: 1,
  },

  ownerName: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },

  ownerRole: {
    color: '#9a9a9a',
    fontSize: 11,
    marginTop: 4,
  },

  emptyPanelText: {
    color: '#a3a3a3',
    fontSize: 12,
    lineHeight: 19,
    padding: 14,
  },
});

export default styles;
