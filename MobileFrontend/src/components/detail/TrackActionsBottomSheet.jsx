import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SHEET_CLOSE_DISTANCE = 520;

const ActionItem = ({ action, onPress }) => (
  <Pressable
    style={ ({ pressed }) => [
      styles.actionItem,
      pressed && !action.disabled && styles.actionItemPressed,
      action.disabled && styles.actionItemDisabled,
    ] }
    onPress={ onPress }
    disabled={ action.disabled }
  >
    <View style={ styles.actionIconWrap }>
      <Ionicons
        name={ action.icon || 'ellipsis-horizontal' }
        size={ 23 }
        color={ action.disabled ? '#5f5f5f' : action.tintColor || '#ffffff' }
      />
    </View>

    <View style={ styles.actionCopy }>
      <Text style={ [styles.actionTitle, action.disabled && styles.actionTitleDisabled] }>
        { action.label }
      </Text>

      { action.description ? (
        <Text style={ styles.actionDescription } numberOfLines={ 2 }>
          { action.description }
        </Text>
      ) : null }
    </View>
  </Pressable>
);

export default function TrackActionsBottomSheet({
  actions = [],
  onClose,
  track,
  visible,
}) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(SHEET_CLOSE_DISTANCE)).current;
  const isClosingRef = useRef(false);

  const sheetActions = Array.isArray(actions) ? actions.filter(Boolean) : [];

  const closeWithAnimation = (afterClose) => {
    if (isClosingRef.current) {
      return;
    }

    isClosingRef.current = true;

    Animated.timing(translateY, {
      toValue: SHEET_CLOSE_DISTANCE,
      duration: 180,
      useNativeDriver: true,
    }).start(() => {
      isClosingRef.current = false;
      translateY.setValue(SHEET_CLOSE_DISTANCE);
      onClose?.();

      if (typeof afterClose === 'function') {
        requestAnimationFrame(afterClose);
      }
    });
  };

  useEffect(() => {
    if (visible) {
      isClosingRef.current = false;
      translateY.setValue(SHEET_CLOSE_DISTANCE);

      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        speed: 18,
        bounciness: 4,
      }).start();
    }
  }, [visible, translateY]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,

      onMoveShouldSetPanResponder: (_, gestureState) => {
        return gestureState.dy > 4 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
      },

      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        }
      },

      onPanResponderRelease: (_, gestureState) => {
        const shouldClose = gestureState.dy > 90 || gestureState.vy > 0.85;

        if (shouldClose) {
          closeWithAnimation();
          return;
        }

        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          speed: 18,
          bounciness: 4,
        }).start();
      },

      onPanResponderTerminate: () => {
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          speed: 18,
          bounciness: 4,
        }).start();
      },
    })
  ).current;

  const handleActionPress = (action) => {
    if (action?.disabled || typeof action?.onPress !== 'function') {
      return;
    }

    closeWithAnimation(() => action.onPress(track));
  };

  if (!track) {
    return null;
  }

  return (
    <Modal
      transparent
      visible={ visible }
      animationType="none"
      statusBarTranslucent
      onRequestClose={ () => closeWithAnimation() }
    >
      <View style={ styles.backdrop }>
        <View style={ styles.backdropTap } />

        <Animated.View
          style={ [
            styles.sheet,
            {
              paddingBottom: Math.max(insets.bottom, 18) + 12,
              transform: [{ translateY }],
            },
          ] }
        >
          <View style={ styles.dragArea } { ...panResponder.panHandlers }>
            <View style={ styles.handle } />
          </View>

          <View style={ styles.actionsList }>
            { sheetActions.map((action, index) => (
              <ActionItem
                key={ action.key || `${action.label}-${index}` }
                action={ action }
                onPress={ () => handleActionPress(action) }
              />
            )) }
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.68)',
  },

  backdropTap: {
    flex: 1,
  },

  sheet: {
    backgroundColor: '#181818',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 10, // từ 18 xuống 10
    paddingTop: 6,
  },

  dragArea: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
    paddingBottom: 16,
  },

  handle: {
    width: 42,
    height: 4,
    borderRadius: 999,
    backgroundColor: '#5a5a5a',
  },

  actionsList: {
    gap: 2, // từ 4 xuống 2
  },

  actionItem: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 4, // từ 6 xuống 4
    paddingVertical: 9,
  },

  actionItemPressed: {
    backgroundColor: '#242424',
  },

  actionItemDisabled: {
    opacity: 0.45,
  },

  actionIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10, // từ 12 xuống 10
  },

  actionCopy: {
    flex: 1,
  },

  actionTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },

  actionTitleDisabled: {
    color: '#777777',
  },

  actionDescription: {
    color: '#9b9b9b',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
});