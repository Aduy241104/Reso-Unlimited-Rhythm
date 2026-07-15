import React, { forwardRef } from 'react';
import { View, TextInput, Text, StyleSheet } from 'react-native';
import theme from '../../theme';

export const AppInput = forwardRef(({ label, error, ...rest }, ref) => {
  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.wrapper, error && styles.errorBorder]}>
        <TextInput ref={ref} placeholderTextColor={theme.colors.textMuted} style={styles.input} {...rest} />
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
});
const styles = StyleSheet.create({
  container: { marginBottom: theme.spacing.md, width: '100%' },
  label: { color: theme.colors.text, fontSize: theme.typography.sizes.sm, marginBottom: theme.spacing.xs },
  wrapper: { height: 50, backgroundColor: theme.colors.surface, borderRadius: theme.spacing.sm, borderWidth: 1, borderColor: theme.colors.border, paddingHorizontal: theme.spacing.md, justifyContent: 'center' },
  errorBorder: { borderColor: theme.colors.error },
  input: { color: theme.colors.text, fontSize: theme.typography.sizes.md, height: '100%' },
  errorText: { color: theme.colors.error, fontSize: theme.typography.sizes.xs, marginTop: theme.spacing.xs },
});
export default AppInput;