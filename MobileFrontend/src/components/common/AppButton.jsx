import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import theme from '../../theme';

export const AppButton = ({
  title,
  onPress,
  isLoading = false,
  disabled = false,
  style,
  buttonStyle,
  textStyle,
}) => {
  const isDisabled = disabled || isLoading;
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      style={[styles.btn, style, buttonStyle, isDisabled && styles.disabled]}
      activeOpacity={0.8}
    >
      {isLoading ? <ActivityIndicator color={theme.colors.text} /> : <Text style={[styles.text, textStyle]}>{title}</Text>}
    </TouchableOpacity>
  );
};
const styles = StyleSheet.create({
  btn: { height: 50, backgroundColor: theme.colors.primary, borderRadius: theme.spacing.sm, justifyContent: 'center', alignItems: 'center' },
  disabled: { backgroundColor: theme.colors.card },
  text: { color: theme.colors.text, fontSize: theme.typography.sizes.md, fontWeight: theme.typography.weights.semibold },
});
export default AppButton;
