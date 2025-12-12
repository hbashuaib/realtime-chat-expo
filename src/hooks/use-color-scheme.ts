// src/hooks/use-color-scheme.ts
import type { ColorScheme } from '@/src/core/theme';
import useGlobal from '@/src/core/global';

export function useColorScheme(): ColorScheme {
  // Subscribe directly to global themeMode
  const themeMode = useGlobal((s) => s.themeMode);  // subscribed
  console.log("useColorScheme hook value:", themeMode);

  return themeMode as ColorScheme;
}
