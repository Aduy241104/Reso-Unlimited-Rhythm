import React from 'react';
import { Modal, View, StyleSheet } from 'react-native';
import theme from '../../theme';

export const AppModal = ({ visible, children }) => (
  <Modal transparent visible={visible} animationType="fade">
    <View style={styles.bg}><View style={styles.content}>{children}</View></View>
  </Modal>
);
const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: theme.colors.overlay, justifyContent: 'center', padding: theme.spacing.xl },
  content: { backgroundColor: theme.colors.card, borderRadius: theme.spacing.md, padding: theme.spacing.xl },
});
export default AppModal;