import React from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import theme from '../../theme';

export const AppSearchBar = ({ ...rest }) => (
  <View style={styles.bar}>
    <TextInput placeholderTextColor={theme.colors.textMuted} style={styles.input} {...rest} />
  </View>
);
const styles = StyleSheet.create({
  bar: { height: 45, backgroundColor: theme.colors.surface, borderRadius: theme.spacing.sm, paddingHorizontal: theme.spacing.md, justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.border },
  input: { color: theme.colors.text },
});
export default AppSearchBar;