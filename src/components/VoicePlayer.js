// src/components/VoicePlayer.js
import React, { useEffect, useRef, useState } from 'react';
import { TouchableOpacity, ActivityIndicator } from 'react-native';
import { Audio } from 'expo-av';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';

import { theme } from '@/src/core/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function VoicePlayer({ uri, onProgress }) {
  //const [sound, setSound] = useState(null);
  const soundRef = useRef(null);
  const mountedRef = useRef(true);
  const tapLockRef = useRef(false);

  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);

  const colorScheme = useColorScheme();
  const currentTheme = theme[colorScheme];

  // Prevent extremely frequent progress updates
  const lastUpdateRef = useRef(0);
  const UPDATE_INTERVAL_MS = 150;

  useEffect(() => {
    
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      const s = soundRef.current;
      soundRef.current = null;
      if (s) s.unloadAsync().catch(() => {});
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  
  async function togglePlayback() {
    if (tapLockRef.current) return;
    tapLockRef.current = true;

    try {
      // Case 1: No sound loaded yet → create and play
      if (!soundRef.current) {
        setLoading(true);
        onProgress?.(0);

        await Audio.setAudioModeAsync({
          staysActiveInBackground: false,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          //interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_MIX_WITH_OTHERS,
          //interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DUCK_OTHERS,
        });

        // 🔎 Logging before createAsync
        console.log('[VoicePlayer] Attempting to load URI:', uri);

        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: encodeURI(String(uri)) }, // ensure proper encoding
          { shouldPlay: false }
        );

        // 🔎 Logging after createAsync
        console.log('[VoicePlayer] Sound object created:', newSound);

        soundRef.current = newSound;
        setLoading(false);

        newSound.setOnPlaybackStatusUpdate((status) => {
          if (!status.isLoaded) return;

          if (status.didJustFinish) {
            if (mountedRef.current) {
              setPlaying(false);
              onProgress?.(1);
            }
            setTimeout(() => {
              newSound.unloadAsync().catch(() => {});
              if (mountedRef.current && soundRef.current === newSound) {
                soundRef.current = null;
              }
            }, 50);
            return;
          }

          const now = Date.now();
          if (now - lastUpdateRef.current >= UPDATE_INTERVAL_MS) {
            lastUpdateRef.current = now;
            const d = (status.durationMillis ?? 0) / 1000;
            const p = (status.positionMillis ?? 0) / 1000;
            if (d > 0 && mountedRef.current) {
              onProgress?.(Math.min(1, Math.max(0, p / d)));
            }
          }
        });

        await newSound.playAsync();
        console.log('[VoicePlayer] Playback started');
        if (mountedRef.current) setPlaying(true);

      } else {
        // Case 2: Toggle existing sound
        const status = await soundRef.current.getStatusAsync();
        if (status.isPlaying) {
          await soundRef.current.pauseAsync();
          if (mountedRef.current) setPlaying(false);
        } else {
          await soundRef.current.playAsync();
          if (mountedRef.current) setPlaying(true);
        }
      }
    } catch (err) {
      console.error('[VoicePlayer] Failed to load/play sound:', err);
      setLoading(false);
      if (mountedRef.current) setPlaying(false);
      const s = soundRef.current;
      soundRef.current = null;
      if (s) { try { await s.unloadAsync(); } catch {} }
      onProgress?.(0);
    } finally {
      setTimeout(() => { tapLockRef.current = false; }, 150);
    }
  }

  return (
    <TouchableOpacity
      onPress={togglePlayback}
      style={{
        justifyContent: 'center',
        alignItems: 'center',
        height: 50,
        width: 50,
      }}
    >
      {loading ? (
        <ActivityIndicator size="small" color={currentTheme.colors.primary} />
      ) : (
        <FontAwesomeIcon
          icon={playing ? 'pause' : 'play'}
          size={20}
          color={currentTheme.colors.primary}
        />
      )}
    </TouchableOpacity>
  );
}

