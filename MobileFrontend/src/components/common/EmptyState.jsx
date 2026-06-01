import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import theme from '../../theme';

export const EmptyState = () => (
  <View style={styles.box}><Text style={styles.text}>No items available</Text></View>
);
const styles = StyleSheet.create({
  box: { padding: theme.spacing.xl, alignItems: 'center' },
  text: { color: theme.colors.textMuted },
});
export default EmptyState;