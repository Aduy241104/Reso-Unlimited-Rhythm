import Constants from 'expo-constants';
import { Platform } from 'react-native';

const DEFAULT_API_PORT = '8080';
const DEFAULT_API_PATH = '/api';

const trimTrailingSlash = (value = '') => value.replace(/\/+$/, '');

const readString = (value) => {
  if (typeof value !== 'string') {
    return '';
  }

  const normalizedValue = value.trim();
  return normalizedValue || '';
};

const readExpoHostUri = () => {
  return (
    readString(Constants.expoConfig?.hostUri) ||
    readString(Constants.expoGoConfig?.debuggerHost) ||
    readString(Constants.manifest2?.extra?.expoClient?.hostUri) ||
    ''
  );
};

const extractHost = (value) => {
  const candidate = readString(value);

  if (!candidate) {
    return '';
  }

  const withoutProtocol = candidate.replace(/^[a-z]+:\/\//i, '');
  const withoutPath = withoutProtocol.split('/')[0] || '';
  const host = withoutPath.split(':')[0] || '';

  return readString(host);
};

const buildApiBaseUrl = (host) => {
  const normalizedHost = extractHost(host);

  if (!normalizedHost) {
    return '';
  }

  return `http://${normalizedHost}:${DEFAULT_API_PORT}${DEFAULT_API_PATH}`;
};

const getDefaultApiBaseUrl = () => {
  if (Platform.OS === 'android') {
    return `http://10.0.2.2:${DEFAULT_API_PORT}${DEFAULT_API_PATH}`;
  }

  return `http://localhost:${DEFAULT_API_PORT}${DEFAULT_API_PATH}`;
};

export const resolveApiBaseUrl = () => {
  const configuredBaseUrl = trimTrailingSlash(
    readString(process.env.EXPO_PUBLIC_API_URL)
  );

  if (__DEV__) {
    const expoHostBaseUrl = buildApiBaseUrl(readExpoHostUri());

    if (expoHostBaseUrl) {
      return expoHostBaseUrl;
    }
  }

  if (configuredBaseUrl) {
    return configuredBaseUrl;
  }

  return getDefaultApiBaseUrl();
};

export const API_BASE_URL = resolveApiBaseUrl();
