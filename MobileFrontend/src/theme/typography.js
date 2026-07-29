import { Platform } from 'react-native';

export const typography = {
  fontFamily: Platform.select({
    ios: 'System',
    android: 'Roboto',
    default: 'sans-serif',
  }),
  sizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    heading: 32,
  },
  weights: {
    thin: '300',
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
};