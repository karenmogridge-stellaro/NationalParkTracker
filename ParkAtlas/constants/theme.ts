import { Platform } from 'react-native';

export const ParkAtlas = {
  primary: '#1b4332',
  secondary: '#1b4332',
  tertiary: '#52320b',
  background: '#ffffff',
  surface: '#ffffff',
  surfaceContainer: '#ffffff',
  surfaceContainerLow: '#ffffff',
  surfaceContainerHigh: '#ffffff',
  surfaceContainerHighest: '#ffffff',
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
    // A lighter tint of the new brand green (#1b4332) — the brand color itself is
    // nearly the same darkness as the dark background and disappears when selected.
    tint: '#95d5b2',
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: '#95d5b2',
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
