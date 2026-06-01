import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import theme from '../../theme';

export const AppBadge = ({ text }) => (
  <View style={styles.badge}><Text style={styles.text}>{text}</Text></View>
);
const styles = StyleSheet.create({
  badge: { backgroundColor: theme.colors.primary, paddingHorizontal: theme.spacing.sm, paddingVertical: theme.spacing.xs, borderRadius: 4, alignSelf: 'flex-start' },
  text: { color: theme.colors.text, fontSize: theme.typography.sizes.xs, fontWeight: theme.typography.weights.bold },
});
export default AppBadge;