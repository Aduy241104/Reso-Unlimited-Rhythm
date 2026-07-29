import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import theme from '../../theme';

export const AppLoader = ({ size = 'small', color = theme.colors.primary }) => {
  return (
    <View style={styles.container}>
      <ActivityIndicator size={size} color={color} />
    </View>
  );
};
const styles = StyleSheet.create({
  container: { padding: theme.spacing.md, justifyContent: 'center', alignItems: 'center' },
});
export default AppLoader;