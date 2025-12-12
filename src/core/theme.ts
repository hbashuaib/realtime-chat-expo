// src/core/theme.ts
const base = {
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 },
  radius: { sm: 8, md: 16, lg: 21 },
  fontSize: { sm: 14, md: 16, lg: 18 },
  fontFamily: {
    regular: 'System',
    header: 'LeckerliOne-Regular',
    bold: 'System',
    mono: 'Courier',
  },
};

const light = {
  ...base,
  colors: {
    primary: '#007AFF',
    background: '#ECECEC',
    bubbleMe: '#A0D2FF',
    bubbleFriend: '#FFFFFF',
    textPrimary: '#202020',
    textSecondary: '#808080',
    inputBackground: '#FFFFFF',
    headerBackground: '#007AFF',
    headerText: '#FFFFFF',
    border: '#d0d0d0',
    bannerBackground: '#A0D2FF',   // ✅ light blue for banner
    onPrimary: '#202020',
    actionBlue: '#1E90FF',
    actionRed: '#FF3B30',
  },
};

const dark = {
  ...base,
  colors: {
    primary: '#0A84FF',
    background: '#000',
    bubbleMe: '#8ABEFF',
    bubbleFriend: '#1c1c1e',
    textPrimary: '#fff',
    textSecondary: '#aaa',
    inputBackground: '#1c1c1e',
    headerBackground: '#0A84FF',
    headerText: '#fff',
    border: '#333',
    bannerBackground: '#8ABEFF',   // ✅ lighter blue for dark mode
    onPrimary: '#FFFFFF',          // ✅ bright text
    actionBlue: '#1E90FF',
    actionRed: '#FF453A',
  },
};

export const theme = { light, dark } as const;
export type ColorScheme = keyof typeof theme; // 'light' | 'dark'
