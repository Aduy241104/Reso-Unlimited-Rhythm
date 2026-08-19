import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

const GUEST_ID_KEY = 'reso_mobile_guest_id';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const getOrCreateGuestId = async () => {
  const storedGuestId = await AsyncStorage.getItem(GUEST_ID_KEY).catch(() => null);

  if (UUID_PATTERN.test(storedGuestId || '')) {
    return storedGuestId;
  }

  const guestId = Crypto.randomUUID();
  await AsyncStorage.setItem(GUEST_ID_KEY, guestId).catch(() => {});
  return guestId;
};

