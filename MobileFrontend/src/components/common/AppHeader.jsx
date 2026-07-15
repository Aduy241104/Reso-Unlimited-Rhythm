import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import theme from '../../theme';

export const AppHeader = ({ title, onBack }) => {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top }]}>
      {onBack ? (
        <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.75}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
      ) : null}
      <Text style={styles.text}>{title}</Text>
    </View>
  );
};
const styles = StyleSheet.create({
  header: {
    backgroundColor: theme.colors.surface,
    height: 90,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.containerPadding,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.sm,
    marginLeft: -theme.spacing.sm,
  },
  text: { color: theme.colors.text, fontSize: theme.typography.sizes.lg, fontWeight: theme.typography.weights.bold },
});
export default AppHeader;
