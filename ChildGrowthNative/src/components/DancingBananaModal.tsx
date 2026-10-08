import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Image, Platform, NativeModules } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withSequence, 
  withTiming, 
  withSpring,
  Easing
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { Colors, Layout } from '../constants/theme';
import { Sparkles } from 'lucide-react-native';

const DANCING_BANANA_GIF = require('../assets/images/dancing_banana_tenor.gif');
const DANCING_BANANA_VEO = require('../assets/images/dancing_banana_veo_frame1.png');
const BANANA_SONG_PART1 = require('../assets/audio/ja_se_vznasim_part1.mp3');
const BANANA_SONG_PART2 = require('../assets/audio/ja_se_vznasim_part2.mp3');

// Counter to alternate between Part 1 and Part 2 for every other quest completion
let questPlayCount = 0;

interface DancingBananaModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function DancingBananaModal({ visible, onClose }: DancingBananaModalProps) {
  const { t } = useTranslation();
  const rotation = useSharedValue(0);
  const scale = useSharedValue(0.4);
  const translateY = useSharedValue(0);
  const translateX = useSharedValue(0);
  const shadowGlow = useSharedValue(0.8);
  const soundRef = useRef<any>(null);
  const htmlAudioRef = useRef<HTMLAudioElement | null>(null);

  const resolvedSource = DANCING_BANANA_GIF;

  const playSong = async (songFile: any) => {
    try {
      await stopSong();
      
      // Resolve audio URI safely for all platforms (Metro Web & Mobile)
      let srcUri: string | null = null;
      if (typeof songFile === 'string') {
        srcUri = songFile;
      } else if (songFile && typeof songFile === 'object' && songFile.default) {
        srcUri = songFile.default;
      } else {
        const resolved = Image.resolveAssetSource(songFile);
        if (resolved?.uri) {
          srcUri = resolved.uri;
        }
      }
      console.log('🎵 Starting banana song playback. Platform:', Platform.OS, 'srcUri:', srcUri);

      // Strategy 1: Modern expo-audio (Universal for Mobile & Web)
      let expoAudio: any = null;
      try {
        expoAudio = require('expo-audio');
      } catch (e) {
        console.warn('expo-audio require skipped:', e);
      }

      if (expoAudio?.createAudioPlayer) {
        try {
          if (expoAudio.setAudioModeAsync) {
            await expoAudio.setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
          }
          console.log('🎵 Creating player using official expo-audio...');
          const player = expoAudio.createAudioPlayer(srcUri || songFile);
          soundRef.current = player;
          
          if (player.play) {
            player.volume = 0.6; // 60% volume
            player.play();
            console.log('🎵 Played successfully at 60% volume via expo-audio!');
            return;
          }
        } catch (expoAudioErr) {
          console.warn('🎵 expo-audio playback warning, trying HTML5 Audio fallback:', expoAudioErr);
        }
      }

      // Strategy 2: HTML5 Audio element fallback (Web)
      if (typeof window !== 'undefined' && (window as any).Audio && srcUri) {
        const audio = new (window as any).Audio(srcUri);
        audio.volume = 0.6; // 60% volume
        htmlAudioRef.current = audio;
        audio.play().catch((e: any) => console.warn('Web HTML5 Audio play notice:', e));
        console.log('🎵 Played successfully at 60% volume via HTML5 Audio!');
        return;
      }
    } catch (err) {
      console.warn('🎵 Banana song playback notice:', err);
    }
  };

  const stopSong = async () => {
    if (htmlAudioRef.current) {
      try {
        htmlAudioRef.current.pause();
        htmlAudioRef.current.currentTime = 0;
      } catch (_) {}
      htmlAudioRef.current = null;
    }
    if (soundRef.current) {
      try {
        if (typeof soundRef.current.pause === 'function') {
          soundRef.current.pause();
        }
        if (typeof soundRef.current.release === 'function') {
          soundRef.current.release();
        }
        if (typeof soundRef.current.stopAsync === 'function') {
          await soundRef.current.stopAsync();
        }
        if (typeof soundRef.current.unloadAsync === 'function') {
          await soundRef.current.unloadAsync();
        }
      } catch (_) {}
      soundRef.current = null;
    }
  };

  useEffect(() => {
    let timer: any;

    if (visible) {
      // Increment play count to alternate song parts
      questPlayCount += 1;
      const isPart1 = questPlayCount % 2 !== 0;
      const selectedSong = isPart1 ? BANANA_SONG_PART1 : BANANA_SONG_PART2;
      const durationMs = isPart1 ? 17000 : 15000;

      // High-precision spring pop
      scale.value = withSpring(1, { damping: 8, stiffness: 110 });

      // Ambient glow pulse
      shadowGlow.value = withRepeat(
        withSequence(
          withTiming(1.2, { duration: 400 }),
          withTiming(0.8, { duration: 400 })
        ),
        -1,
        true
      );

      // Play selected song part (Part 1 vs Part 2)
      playSong(selectedSong);

      // Dismiss timer (17s for Part 1, 15s for Part 2)
      timer = setTimeout(() => {
        onClose();
      }, durationMs);

      return () => {
        clearTimeout(timer);
        stopSong();
      };
    } else {
      stopSong();
      scale.value = 0.4;
      rotation.value = 0;
      translateY.value = 0;
      shadowGlow.value = 0.8;
    }
  }, [visible]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: scale.value },
        { translateY: translateY.value },
        { translateX: translateX.value },
        { rotate: `${rotation.value}deg` }
      ],
    };
  });

  const glowStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: shadowGlow.value }],
      opacity: shadowGlow.value * 0.4,
    };
  });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.contentCard}>
          <View style={styles.sparkleRow}>
            <Sparkles size={22} color={Colors.amber} />
            <Text style={styles.titleText}>{t('quest_complete', 'QUEST COMPLETE!')}</Text>
            <Sparkles size={22} color={Colors.amber} />
          </View>

          <View style={styles.animationStage}>
            <Animated.View style={[styles.ambientGlow, glowStyle]} />
            <Animated.View style={[styles.bananaWrapper, animatedStyle]}>
              <Image 
                source={resolvedSource} 
                style={styles.bananaImage}
                resizeMode="contain"
              />
            </Animated.View>
          </View>

          <Text style={styles.subText}>{t('pbjt_text', 'PEANUT BUTTER JELLY TIME! 🍌🎉')}</Text>

          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>{t('keep_going', 'KEEP GOING!')}</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  contentCard: {
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.amber,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    maxWidth: 380,
    width: '100%',
    shadowColor: Colors.amber,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  sparkleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  titleText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 22,
    color: Colors.amber,
    letterSpacing: 1,
  },
  animationStage: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
  },
  ambientGlow: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: Colors.amber,
  },
  bananaWrapper: {
    width: 220,
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bananaImage: {
    width: '100%',
    height: '100%',
  },
  subText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 16,
    textAlign: 'center',
    color: Colors.text,
    marginBottom: 20,
    letterSpacing: 0.5,
  },
  closeButton: {
    backgroundColor: Colors.red,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 999,
  },
  closeButtonText: {
    color: '#FFF',
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 15,
    letterSpacing: 1,
  },
});
