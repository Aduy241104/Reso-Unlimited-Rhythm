import React from 'react';
import { View, StyleSheet } from 'react-native';
import theme from '../../theme';

export const AppCard = ({ children, style }) => {
  return <View style={[styles.card, style]}>{children}</View>;
};
const styles = StyleSheet.create({
  card: { backgroundColor: theme.colors.card, borderRadius: theme.spacing.md, padding: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.border },
});
export default AppCard;