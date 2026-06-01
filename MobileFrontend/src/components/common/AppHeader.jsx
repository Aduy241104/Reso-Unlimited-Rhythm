import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import theme from '../../theme';

export const AppHeader = ({ title }) => {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top }]}>
      <Text style={styles.text}>{title}</Text>
    </View>
  );
};
const styles = StyleSheet.create({
  header: { backgroundColor: theme.colors.surface, height: 90, justifyContent: 'center', paddingHorizontal: theme.spacing.containerPadding, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  text: { color: theme.colors.text, fontSize: theme.typography.sizes.lg, fontWeight: theme.typography.weights.bold },
});
export default AppHeader;