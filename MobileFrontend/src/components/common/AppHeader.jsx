import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import theme from '../../theme';

export const AppHeader = ({ title, onBack }) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.header, { paddingTop: insets.top }]}>
      <View style={styles.content}>
        {onBack ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Quay lại"
            hitSlop={8}
            onPress={onBack}
            style={({ pressed }) => [styles.backButton, pressed && styles.buttonPressed]}
          >
            <Ionicons name="chevron-back" size={22} color={theme.colors.text} />
          </Pressable>
        ) : (
          <View style={styles.titleAccent} />
        )}

        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: theme.colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  content: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.containerPadding,
  },
  backButton: {
    width: 38,
    height: 38,
    marginRight: theme.spacing.md,
    marginLeft: -2,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  buttonPressed: {
    opacity: 0.65,
    transform: [{ scale: 0.96 }],
  },
  titleAccent: {
    width: 4,
    height: 22,
    marginRight: theme.spacing.md,
    borderRadius: 2,
    backgroundColor: theme.colors.primary,
  },
  title: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: theme.typography.weights.bold,
    letterSpacing: -0.35,
  },
});

export default AppHeader;
