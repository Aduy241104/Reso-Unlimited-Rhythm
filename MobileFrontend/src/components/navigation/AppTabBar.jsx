import React from 'react';
import { View } from 'react-native';
import { BottomTabBar } from '@react-navigation/bottom-tabs';
import MiniPlayer from '../player/MiniPlayer';

export default function AppTabBar(props) {
  const handleOpenPlayer = () => {
    const activeTabRouteName = props.state.routes[props.state.index]?.name;

    if (!activeTabRouteName) {
      return;
    }

    props.navigation.navigate(activeTabRouteName, {
      screen: 'PlayerSheet',
    });
  };

  return (
    <View>
      <MiniPlayer onPress={handleOpenPlayer} />
      <BottomTabBar {...props} />
    </View>
  );
}
