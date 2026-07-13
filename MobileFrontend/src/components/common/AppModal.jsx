import React from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import theme from '../../theme';

export const AppModal = ({ visible, children, onClose, position = 'center' }) => (
  <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
    <View style={[styles.bg, position === 'bottom' && styles.bgBottom]}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <View style={[styles.content, position === 'bottom' && styles.bottomSheetContent]}>
        {children}
      </View>
    </View>
  </Modal>
);

const styles = StyleSheet.create({
  bg: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
  bgBottom: {
    justifyContent: 'flex-end',
    padding: 0,
  },
  content: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.spacing.md,
    padding: theme.spacing.xl,
  },
  bottomSheetContent: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: theme.spacing.md,
    paddingBottom: 32,
    paddingHorizontal: theme.spacing.xl,
  },
});
export default AppModal;
