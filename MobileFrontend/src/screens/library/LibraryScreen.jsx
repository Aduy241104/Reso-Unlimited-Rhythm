import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import AppHeader from '../../components/common/AppHeader';
import theme from '../../theme';

export default function LibraryScreen() {
  return (
    <View style={styles.container}>
      <AppHeader title="Thư viện" />
      <View style={styles.content}>
        <Text style={styles.text}>Nơi lưu danh sách phát, nghệ sĩ và bài hát của bạn</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  text: {
    color: theme.colors.text,
    fontSize: 14,
    textAlign: 'center',
  },
});
