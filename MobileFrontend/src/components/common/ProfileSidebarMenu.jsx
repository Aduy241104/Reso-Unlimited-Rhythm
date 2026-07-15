import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppAvatar from './AppAvatar';

const OPEN_DURATION = 240;
const CLOSE_DURATION = 180;
const MAX_SIDEBAR_WIDTH = 320;

const SidebarItem = ({ icon, label, onPress, tone = 'default' }) => (
  <Pressable
    style={ ({ pressed }) => [
      styles.itemButton,
      pressed && styles.itemButtonPressed,
    ] }
    onPress={ onPress }
  >
    <Ionicons
      name={ icon }
      size={ 25 }
      color={ tone === 'danger' ? '#ff7b7b' : '#f2f2f2' }
      style={ styles.itemIcon }
    />

    <Text
      style={ [
        styles.itemLabel,
        tone === 'danger' && styles.itemLabelDanger,
      ] }
      numberOfLines={ 1 }
    >
      { label }
    </Text>
  </Pressable>
);

export default function ProfileSidebarMenu({
  visible,
  onClose,
  displayName,
  subtitle,
  avatarUri,
  menuItems = [],
  footerItem = null,
}) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const [shouldRender, setShouldRender] = useState(visible);
  const progress = useRef(new Animated.Value(0)).current;

  const sidebarWidth = Math.min(width * 0.82, MAX_SIDEBAR_WIDTH);

  useEffect(() => {
    if (visible) {
      setShouldRender(true);
      Animated.timing(progress, {
        toValue: 1,
        duration: OPEN_DURATION,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
      return;
    }

    if (!shouldRender) return;

    Animated.timing(progress, {
      toValue: 0,
      duration: CLOSE_DURATION,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setShouldRender(false);
    });
  }, [visible, shouldRender, progress]);

  if (!shouldRender) return null;

  return (
    <Modal
      transparent
      visible={ shouldRender }
      animationType="none"
      statusBarTranslucent
      onRequestClose={ onClose }
    >
      <View style={ styles.container }>
        <Animated.View
          style={ [
            styles.backdrop,
            {
              opacity: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 1],
              }),
            },
          ] }
        />

        <Pressable style={ StyleSheet.absoluteFill } onPress={ onClose } />

        <Animated.View
          style={ [
            styles.sidebar,
            {
              width: sidebarWidth,
              paddingTop: insets.top + 22,
              paddingBottom: insets.bottom + 12,
              transform: [
                {
                  translateX: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-sidebarWidth, 0],
                  }),
                },
              ],
            },
          ] }
        >
          <View style={ styles.header }>
            <AppAvatar uri={ avatarUri } label={ displayName } size={ 48 } />

            <View style={ styles.profileInfo }>
              <Text style={ styles.profileTitle } numberOfLines={ 1 }>
                { displayName }
              </Text>

              { subtitle ? (
                <Text style={ styles.profileSubtitle } numberOfLines={ 1 }>
                  { subtitle }
                </Text>
              ) : null }
            </View>
          </View>

          <View style={ styles.divider } />

          <View style={ styles.content }>
            <View style={ styles.itemList }>
              { menuItems.map((item) => (
                <SidebarItem
                  key={ item.key }
                  icon={ item.icon }
                  label={ item.label }
                  onPress={ item.onPress }
                  tone={ item.tone }
                />
              )) }
            </View>

            { footerItem ? (
              <View style={ styles.footer }>
                <SidebarItem
                  icon={ footerItem.icon }
                  label={ footerItem.label }
                  onPress={ footerItem.onPress }
                  tone={ footerItem.tone }
                />
              </View>
            ) : null }
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.62)',
  },

  sidebar: {
    flex: 1,
    backgroundColor: '#202020',
    borderRightWidth: 1,
    borderRightColor: '#2d2d2d',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 18,
  },

  profileInfo: {
    flex: 1,
    marginLeft: 13,
  },

  profileTitle: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '800',
  },

  profileSubtitle: {
    color: '#a6a6a6',
    fontSize: 13,
    fontWeight: '500',
    marginTop: 3,
  },

  divider: {
    height: 1,
    backgroundColor: '#373737',
  },

  content: {
    flex: 1,
  },

  itemList: {
    paddingTop: 11,
  },

  footer: {
    marginTop: 'auto',
    paddingBottom: 6,
    borderTopWidth: 1,
    borderTopColor: '#373737',
  },

  itemButton: {
    minHeight: 57,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
  },

  itemButtonPressed: {
    backgroundColor: '#2b2b2b',
  },

  itemIcon: {
    width: 34,
    textAlign: 'center',
    marginRight: 10,
  },

  itemLabel: {
    flex: 1,
    color: '#f3f3f3',
    fontSize: 15,
    fontWeight: '500',
  },

  itemLabelDanger: {
    color: '#ff9b9b',
  },
});
