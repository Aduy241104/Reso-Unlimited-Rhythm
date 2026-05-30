import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  FlatList, 
  TouchableOpacity, 
  StatusBar,
  Platform
} from 'react-native';
import { useAuth } from '../../hooks/useAuth';

export default function HomeScreen() {
  const { logout } = useAuth();

  // 🚀 MOCK DATA GIẢ LẬP CỨNG TẠI CHỖ (Đúng cấu trúc form của Album & Playlist)
  const mockPlaylists = [
    { id: 'p1', title: 'Chill Lo-Fi Beats', desc: 'Relax your mind', color: '#ff9f43' },
    { id: 'p2', title: 'Coding Focus', desc: 'Deep work electronic', color: '#9b6cff' },
    { id: 'p3', title: 'Midnight Melancholy', desc: 'Dark ambient sounds', color: '#4f7cff' },
    { id: 'p4', title: 'Cyberpunk Ride', desc: 'Synthwave energy', color: '#ee5253' },
  ];

  const mockAlbums = [
    { id: 'a1', title: 'Ethereal Echoes', artist: 'Luna Eclipse', color: '#10ac84' },
    { id: 'a2', title: 'Neon Horizon', artist: 'Retro Future', color: '#ff9f43' },
    { id: 'a3', title: 'Vortex of Soul', artist: 'The Paradox', color: '#0abde3' },
    { id: 'a4', title: 'Shadow Symphony', artist: 'Dark Orchestra', color: '#9b6cff' },
  ];

  // Component phụ vẽ cái Card hình vuông (thay ảnh bằng các khối màu chuyển sắc mượt mà)
  const renderMockCard = ({ item, isAlbum }) => {
    return (
      <TouchableOpacity style={styles.cardItem} activeOpacity={0.8}>
        {/* Khối màu giả lập ảnh Cover */}
        <View style={[styles.cardImagePlaceholder, { backgroundColor: item.color }]}>
          <Text style={styles.cardVisualText}>{isAlbum ? '💿' : '🎵'}</Text>
        </View>
        <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.cardSubTitle} numberOfLines={1}>
          {isAlbum ? item.artist : item.desc}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f0f14" />
      
      {/* HEADER TOP BAR CHUẨN FORM */}
      <View style={styles.header}>
        <View>
          <Text style={styles.brandText}>RESO MUSIC</Text>
          <Text style={styles.welcomeText}>Home Journey</Text>
        </View>
        <TouchableOpacity style={styles.logoutBadge} onPress={logout} activeOpacity={0.7}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
        
        {/* SECTION 1: SYSTEM PLAYLIST FORM */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>System Playlist</Text>
          <Text style={styles.sectionDesc}>Curated to help you enjoy the right music at the right moment.</Text>
          
          <FlatList
            data={mockPlaylists}
            renderItem={({ item }) => renderMockCard({ item, isAlbum: false })}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}
          />
        </View>

        {/* SECTION 2: LATEST ALBUMS FORM */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Latest Albums</Text>
          <Text style={styles.sectionDesc}>Browse featured albums collections tailored for every mood.</Text>
          
          <FlatList
            data={mockAlbums}
            renderItem={({ item }) => renderMockCard({ item, isAlbum: true })}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}
          />
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#0f0f14' // Nền tối chuẩn Dark Soundscape
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 30,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  brandText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ff9f43',
    letterSpacing: 3,
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#ffffff',
    marginTop: 2,
  },
  logoutBadge: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  logoutText: {
    color: '#ff9f43',
    fontSize: 12,
    fontWeight: '600',
  },
  scrollBody: {
    paddingVertical: 20,
  },
  sectionContainer: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
    paddingHorizontal: 20,
  },
  sectionDesc: {
    fontSize: 13,
    color: '#a09ba6',
    paddingHorizontal: 20,
    marginTop: 4,
    marginBottom: 15,
    lineHeight: 18,
  },
  horizontalList: {
    paddingHorizontal: 14,
  },
  cardItem: {
    width: 140,
    marginHorizontal: 6,
  },
  cardImagePlaceholder: {
    width: 140,
    height: 140,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.85,
  },
  cardVisualText: {
    fontSize: 32,
  },
  cardTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 8,
  },
  cardSubTitle: {
    color: '#a09ba6',
    fontSize: 12,
    marginTop: 2,
  },
});