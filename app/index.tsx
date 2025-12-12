// app/index.tsx
import { Redirect } from 'expo-router';
import useGlobal from '@/src/core/global';

export default function Index() {
  const initialized = useGlobal((s) => s.initialized);
  const authenticated = useGlobal((s) => s.authenticated);

  if (!initialized) return <Redirect href="/Splash" />;
  if (!authenticated) return <Redirect href="/SignIn" />;

  return <Redirect href="/(tabs)" />;
}

