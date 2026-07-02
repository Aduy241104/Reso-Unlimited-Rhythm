import React from 'react';
import { View } from 'react-native';
import { BottomTabBar } from '@react-navigation/bottom-tabs';
import MiniPlayer from '../player/MiniPlayer';

export default function AppTabBar(props) {
  const handleOpenPlayer = () => {
    props.navigation.getParent()?.navigate('PlayerSheet');
  };

  return (
    <View>
      <MiniPlayer onPress={handleOpenPlayer} />
      <BottomTabBar {...props} />
    </View>
  );
}
