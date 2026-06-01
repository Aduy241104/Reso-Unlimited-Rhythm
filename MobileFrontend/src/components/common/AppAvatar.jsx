import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import theme from '../../theme';

export const AppAvatar = ({ source }) => (
  <View style={styles.avatar}>
    <Image source={source || 'https://via.placeholder.com/150'} style={styles.img} transition={150} />
  </View>
);
const styles = StyleSheet.create({
  avatar: { width: 40, height: 40, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: theme.colors.border },
  img: { width: '100%', height: '100%' },
});
export default AppAvatar;