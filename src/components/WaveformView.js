// src/components/WaveformView.js
import React, { useState } from 'react';
import { View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';

import { theme } from '@/src/core/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function WaveformView({ waveform = [], height = 50, style, progress = 0 }) {
  const [containerWidth, setContainerWidth] = useState(0);

  const colorScheme = useColorScheme();
  const currentTheme = theme[colorScheme];

  const barWidth = 2;
  const gap = 1;

  // Compute only after measuring real width
  const totalBars = containerWidth > 0 ? Math.floor(containerWidth / (barWidth + gap)) : 0;

  const bars = React.useMemo(() => {
    if (!Array.isArray(waveform) || waveform.length === 0 || totalBars === 0) return [];
    return waveform.slice(0, totalBars);
  }, [waveform, totalBars]);

  const activeBars = Math.floor((progress || 0) * (totalBars || 0));

  if (__DEV__) {
    console.log(
      '[WaveformView] containerWidth:', containerWidth,
      'bars:', bars.length,
      'waveform sample:', waveform.slice(0,5)
    );
  }

  return (
    <View
      style={[
        {
          height,
          justifyContent: 'center',
          alignItems: 'center',
          flexDirection: 'row',
          flex: 1,
          flexShrink: 1,
        },
        style,
      ]}
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        if (w && w !== containerWidth) setContainerWidth(w);
      }}
    >
      {containerWidth > 0 ? (
        <Svg width={containerWidth} height={height}>
          {bars.map((amp, i) => {
            const norm = Math.max(0, Math.min(1, Math.abs(amp)));
            const minPx = 2;
            const barHeight = Math.max(minPx, norm * height);
            const isActive = i <= activeBars;
            return (
              <Rect
                key={i}
                x={i * (barWidth + gap)}
                y={(height - barHeight) / 2}
                width={barWidth}
                height={barHeight}
                fill={isActive ? currentTheme.colors.primary : currentTheme.colors.textSecondary}
                rx={1}
              />
            );
          })}
        </Svg>
      ) : (
        // Placeholder to avoid zero-width renders; keeps layout stable
        <Svg width={200} height={height} />
      )}
    </View>
  );
}

