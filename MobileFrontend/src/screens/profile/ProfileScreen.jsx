import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import AppHeader from '../../components/common/AppHeader';
import theme from '../../theme';

export default function ProfileScreen() {
  return (
    <View style={styles.container}>
      <AppHeader title="Profile Controls" />
      <View style={styles.content}><Text style={styles.text}>Profile Workspace Ready</Text></View>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  text: { color: theme.colors.text }
});