import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity } from 'react-native';

export default function ArtistFollowButton({
  isFollowing = false,
  isLoading = false,
  onPress,
}) {
  return (
    <TouchableOpacity
      style={[
        styles.button,
        isFollowing ? styles.buttonActive : null,
        isLoading ? styles.buttonDisabled : null,
      ]}
      activeOpacity={0.82}
      onPress={onPress}
      disabled={isLoading}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color={isFollowing ? '#000000' : '#ffffff'} />
      ) : (
        <Text style={[styles.buttonText, isFollowing ? styles.buttonTextActive : null]}>
          {isFollowing ? 'Đang theo dõi' : 'Theo dõi'}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    minWidth: 104,
    height: 34,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#3a3a3a',
    backgroundColor: '#181818',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    marginRight: 13,
  },
  buttonActive: {
    backgroundColor: '#1ed760',
    borderColor: '#1ed760',
  },
  buttonDisabled: {
    opacity: 0.72,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  buttonTextActive: {
    color: '#000000',
  },
});
