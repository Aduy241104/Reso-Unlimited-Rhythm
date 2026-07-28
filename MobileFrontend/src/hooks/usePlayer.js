import { useContext } from 'react';
import { PlayerContext, PlayerQueueCommandContext } from '../context/PlayerContext';

export const usePlayer = () => useContext(PlayerContext);

export const usePlayQueue = () => useContext(PlayerQueueCommandContext);

export default usePlayer;
