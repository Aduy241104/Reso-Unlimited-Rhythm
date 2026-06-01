import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import AppHeader from '../../components/common/AppHeader';
import theme from '../../theme';

export default function ExploreScreen() {
  return (
    <View style={styles.container}>
      <AppHeader title="Explore Module" />
      <View style={styles.content}><Text style={styles.text}>Explore Workspace Ready</Text></View>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  text: { color: theme.colors.text }
});