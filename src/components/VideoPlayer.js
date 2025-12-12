// src/components/VideoPlayer.js
import React, { useState, useRef, useEffect } from "react";
import { useEventListener } from "expo";
import { View, TouchableOpacity, Image, Text } from "react-native";
import { VideoView, useVideoPlayer } from "expo-video";
import Slider from "@react-native-community/slider";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";

export default function VideoPlayer({ uri, thumbnail, duration }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasEnded, setHasEnded] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);   // ✅ added
  const [progress, setProgress] = useState(0);       // ✅ added
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const [showPlayer, setShowPlayer] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const videoRef = useRef(null);

  // Create player
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
    p.muted = false;
    p.timeUpdateEventInterval = 250;
  });

  const toSeconds = (t) => {
    if (typeof t !== "number" || Number.isNaN(t)) return 0;
    // If large, it's likely milliseconds; otherwise seconds
    return t > 10000 ? t / 1000 : t;
  };

  // Toggle play/pause
  const togglePlay = async () => {
    if (!showPlayer) {
      setShowPlayer(true);
      if (uri) {
        await player.replaceAsync(uri);  // mount source
        setIsLoaded(false);              // let ready set it true
        await player.play();
        setIsPlaying(true);
        return;
      }
    }

    if (isPlaying) {
      await player.pause();
      setIsPlaying(false);
    } else {
      if (hasEnded) {
        setHasEnded(false);
        await player.replaceAsync(uri, { initialTime: 0 });
      }
      await player.play();
      setIsPlaying(true);
    }
  };  

  const toggleFullscreen = async () => {
    if (videoRef.current) {
      if (isFullscreen) {
        await videoRef.current.exitFullscreen();
      } else {
        await videoRef.current.enterFullscreen();
      }
    }
  };

  // Listen for end of playback
  useEventListener(player, "playToEnd", () => {
    setIsPlaying(false);
    setHasEnded(true);
    setProgress(0);
  });

  // Mark player loaded
  useEventListener(player, "ready", ({ duration }) => {
    setIsLoaded(true);
    const d = toSeconds(duration);
    if (d > 0) setVideoDuration(d);
  });

  useEventListener(player, "timeUpdate", ({ currentTime }) => {
    console.log("timeUpdate:", currentTime);

    const s = toSeconds(currentTime);
    if (s > 0 && !hasEnded) setIsPlaying(true);
    if (!isDragging) setProgress(s); // don't override while dragging
  }); 

  // ✅ interval polling: robust slider movement
  useEffect(() => {
    const interval = setInterval(() => {
      //console.log("poll:", player?.currentTime, player?.duration);

      if (isDragging) return; // don't override the thumb during drag
      const t = player?.currentTime;
      const s = toSeconds(t);
      if (s > 0) setProgress(s);
      // opportunistically capture duration if still 0
      const d = toSeconds(player?.duration);
      if (d > 0 && videoDuration === 0) setVideoDuration(d);
    }, 500);
    return () => clearInterval(interval);
  }, [player, isDragging, videoDuration]);

  const safeSeekTo = async (tSeconds) => {
    try {
      if (isLoaded && typeof player.seekTo === "function") {
        await player.seekTo(tSeconds); // expo-video expects seconds
      } else {
        await player.replaceAsync(uri, { initialTime: tSeconds });
      }
    } catch (err) {
      console.error("safeSeekTo failed:", err);
    }
  };
 
  const formatDuration = (seconds) => {
    if (!seconds) return "";
    const total = Math.floor(seconds);
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  return (
    <View
      style={{
        width: 240,
        height: 160,
        backgroundColor: "#000",
        borderRadius: 8,
        overflow: "hidden",
      }}
    >
      {!showPlayer ? (
        // Thumbnail until user taps play
        <TouchableOpacity
          onPress={async () => {
            setShowPlayer(true);
            if (uri) {
              await player.replaceAsync(uri);   // load video source
              setIsLoaded(false);               // let "ready" event set true
              await player.play();              // start playback
              setIsPlaying(true);
            }
          }}
        >
          {thumbnail ? (
            <Image
              source={{ uri: thumbnail }}
              style={{ width: "100%", height: "100%" }}
              resizeMode="cover"
            />
          ) : (
            <View
              style={{ width: "100%", height: "100%", backgroundColor: "#333" }}
            />
          )}
          {duration && (
            <Text
              style={{
                position: "absolute",
                bottom: 8,
                right: 8,
                backgroundColor: "rgba(0,0,0,0.6)",
                color: "#fff",
                paddingHorizontal: 6,
                borderRadius: 4,
                fontSize: 12,
              }}
            >
              {formatDuration(duration)}
            </Text>
          )}
          <View
            style={{
              position: "absolute",
              alignSelf: "center",
              top: "40%",
              backgroundColor: "rgba(0,0,0,0.6)",
              padding: 16,
              borderRadius: 40,
            }}
          >
            <FontAwesomeIcon icon="play" size={24} color="#fff" />
          </View>
        </TouchableOpacity>
      ) : (
        <>
          <VideoView
            ref={videoRef}
            style={{ width: "100%", height: "100%" }}
            player={player}
            contentFit="contain"
            nativeControls={false}
            onProgress={({ currentTime }) => {
              if (isDragging) return;
              const s = toSeconds(currentTime);
              if (s > 0) setProgress(s);
            }}
            onFullscreenUpdate={({ fullscreenUpdate }) => {
              if (
                fullscreenUpdate ===
                VideoView.FULLSCREEN_UPDATE_PLAYER_DID_PRESENT
              ) {
                setIsFullscreen(true);
              } else if (
                fullscreenUpdate ===
                VideoView.FULLSCREEN_UPDATE_PLAYER_WILL_DISMISS
              ) {
                setIsFullscreen(false);
              }
            }}
          />

          {/* Play/Pause button */}
          <TouchableOpacity
            onPress={togglePlay}
            style={{
              position: "absolute",
              alignSelf: "center",
              top: "40%",
              backgroundColor: "rgba(0,0,0,0.6)",
              padding: 16,
              borderRadius: 40,
            }}
          >
            <FontAwesomeIcon
              icon={isPlaying ? "pause" : "play"}
              size={24}
              color="#fff"
            />
          </TouchableOpacity>

          {/* Fullscreen toggle button */}
          <TouchableOpacity
            onPress={toggleFullscreen}
            style={{
              position: "absolute",
              bottom: 8,
              right: 8,
              backgroundColor: "rgba(0,0,0,0.6)",
              padding: 8,
              borderRadius: 20,
            }}
          >
            <FontAwesomeIcon
              icon={isFullscreen ? "compress" : "expand"}
              size={18}
              color="#fff"
            />
          </TouchableOpacity>

          {/* Progress bar + time labels */}
          <View
            style={{
              position: "absolute",
              bottom: 8,
              left: 8,
              right: 48, // leave space for fullscreen button
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#fff", fontSize: 12, marginRight: 6 }}>
              {formatDuration(progress)}
            </Text>
            <Slider
              style={{ flex: 1 }}
              minimumValue={0}
              maximumValue={Math.max(videoDuration, progress, 1)}
              value={progress}
              minimumTrackTintColor="#fff"
              maximumTrackTintColor="rgba(255,255,255,0.4)"
              thumbTintColor="#fff"
              onSlidingStart={() => setIsDragging(true)}
              onSlidingComplete={async (val) => {
                setIsDragging(false);
                setProgress(val);
                if (!isLoaded) return;
                await safeSeekTo(val);
                await player.play();
                setIsPlaying(true);
              }}
            />
            <Text style={{ color: "#fff", fontSize: 12, marginLeft: 6 }}>
              {formatDuration(videoDuration)}
            </Text>
          </View>
        </>
      )}
    </View>
  );
}
