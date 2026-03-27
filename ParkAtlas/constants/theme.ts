import { Platform } from 'react-native';

export const ParkAtlas = {
  primary: '#154212',
  secondary: '#496800',
  tertiary: '#52320b',
  background: '#fcf9f2',
  surface: '#fcf9f2',
  surfaceContainer: '#f1eee7',
  surfaceContainerLow: '#f6f3ec',
  surfaceContainerHigh: '#ebe8e1',
  surfaceContainerHighest: '#e5e2db',
  outline: '#72796e',
  outlineVariant: '#c2c9bb',
  onSurface: '#1c1c18',
  onSurfaceVariant: '#42493e',
  onPrimary: '#ffffff',
};

export const Colors = {
  light: {
    text: ParkAtlas.onSurface,
    background: ParkAtlas.background,
    tint: ParkAtlas.primary,
    icon: ParkAtlas.outline,
    tabIconDefault: ParkAtlas.outline,
    tabIconSelected: ParkAtlas.primary,
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: '#a1d494',
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: '#a1d494',
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
