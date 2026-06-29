import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import AppHeader from '../../components/common/AppHeader';
import theme from '../../theme';

export default function PremiumScreen() {
  return (
    <View style={styles.container}>
      <AppHeader title="Premium" />
      <View style={styles.content}>
        <Text style={styles.text}>Khám phá các quyền lợi Premium</Text>
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
