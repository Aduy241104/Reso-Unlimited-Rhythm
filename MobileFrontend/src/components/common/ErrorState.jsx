import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import theme from '../../theme';

export const ErrorState = ({ message = 'An error occurred.' }) => (
  <View style={styles.box}><Text style={styles.text}>{message}</Text></View>
);
const styles = StyleSheet.create({
  box: { padding: theme.spacing.xl, alignItems: 'center' },
  text: { color: theme.colors.error },
});
export default ErrorState;