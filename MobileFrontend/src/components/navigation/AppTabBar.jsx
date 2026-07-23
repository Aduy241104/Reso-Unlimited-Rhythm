import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MiniPlayer from '../player/MiniPlayer';
import theme from '../../theme';

const ACTIVE_BACKGROUND = 'rgba(139, 92, 246, 0.16)';
const TAB_BAR_MIN_HEIGHT = 66;
const TAB_BAR_CONTENT_HEIGHT = 54;

export default function AppTabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();
  const tabBarBottomPadding = Math.max(insets.bottom, 8);
  const tabBarHeight = Math.max(TAB_BAR_MIN_HEIGHT, TAB_BAR_CONTENT_HEIGHT + tabBarBottomPadding);

  const handleOpenPlayer = () => {
    const activeTabRouteName = state.routes[state.index]?.name;

    if (!activeTabRouteName) {
      return;
    }

    navigation.navigate(activeTabRouteName, {
      screen: 'PlayerSheet',
    });
  };

  return (
    <View style={styles.shell}>
      <View style={[styles.floatingPlayer, { bottom: tabBarHeight + 8 }]}>
        <MiniPlayer onPress={handleOpenPlayer} />
      </View>

      <View style={[styles.tabBar, { paddingBottom: tabBarBottomPadding }]}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;
          const label =
            typeof options.tabBarLabel === 'string'
              ? options.tabBarLabel
              : options.title || route.name;
          const color = isFocused ? theme.colors.primaryLight : theme.colors.textMuted;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel || label}
              testID={options.tabBarButtonTestID}
              onPress={onPress}
              onLongPress={onLongPress}
              hitSlop={4}
              style={({ pressed }) => [styles.tabItem, pressed && styles.tabItemPressed]}
            >
              <View style={[styles.iconPill, isFocused && styles.iconPillActive]}>
                {options.tabBarIcon?.({
                  focused: isFocused,
                  color,
                  size: 22,
                })}
              </View>
              <Text
                numberOfLines={1}
                style={[styles.label, { color }, isFocused && styles.labelActive]}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    position: 'relative',
    backgroundColor: theme.colors.background,
    overflow: 'visible',
  },
  floatingPlayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 20,
    elevation: 20,
  },
  tabBar: {
    minHeight: 66,
    paddingTop: 8,
    paddingHorizontal: 6,
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: theme.colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.24,
    shadowRadius: 12,
    elevation: 16,
  },
  tabItem: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabItemPressed: {
    opacity: 0.68,
  },
  iconPill: {
    width: 42,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconPillActive: {
    backgroundColor: ACTIVE_BACKGROUND,
  },
  label: {
    maxWidth: '100%',
    marginTop: 3,
    paddingHorizontal: 2,
    fontSize: 10,
    lineHeight: 13,
    fontWeight: theme.typography.weights.medium,
  },
  labelActive: {
    fontWeight: theme.typography.weights.semibold,
  },
});
