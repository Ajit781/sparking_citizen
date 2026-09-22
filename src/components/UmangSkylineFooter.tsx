import React, {useEffect, useRef} from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Image,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {colors} from '../theme/colors';

const {width: SCREEN_WIDTH} = Dimensions.get('window');
// Aspect ratio of the transparent Kolkata skyline is 1360 / 344 ≈ 3.953
const BANNER_HEIGHT = 125;
const BANNER_WIDTH = Math.round(BANNER_HEIGHT * 3.953); // ~494px

export default function UmangSkylineFooter() {
  const scrollAnim = useRef(new Animated.Value(-BANNER_WIDTH)).current;

  useEffect(() => {
    // Umang app style continuous left-to-right smooth horizontal scroll
    scrollAnim.setValue(-BANNER_WIDTH);

    const animation = Animated.loop(
      Animated.timing(scrollAnim, {
        toValue: 0,
        duration: 26000, // Smooth, elegant 26s glide
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );

    animation.start();

    return () => animation.stop();
  }, [scrollAnim]);

  return (
    <View style={styles.container}>
      {/* 1. Animated Kolkata Landmarks Skyline (Transparent: Howrah Bridge, Victoria Memorial, Towers) */}
      <View style={styles.skylineOverflow} pointerEvents="none">
        <Animated.View
          style={[
            styles.animatedTrack,
            {
              width: BANNER_WIDTH * 4,
              transform: [{translateX: scrollAnim}],
            },
          ]}>
          <Image
            source={require('../../assets/kolkata_skyline_transparent.png')}
            style={styles.skylineImage}
            resizeMode="contain"
          />
          <Image
            source={require('../../assets/kolkata_skyline_transparent.png')}
            style={styles.skylineImage}
            resizeMode="contain"
          />
          <Image
            source={require('../../assets/kolkata_skyline_transparent.png')}
            style={styles.skylineImage}
            resizeMode="contain"
          />
          <Image
            source={require('../../assets/kolkata_skyline_transparent.png')}
            style={styles.skylineImage}
            resizeMode="contain"
          />
        </Animated.View>
      </View>

      {/* 2. Foreground Curved White Arch (Powered by KMC & Clean City | Happy Citizens) - Placed lower */}
      <View style={styles.archWrapper} pointerEvents="none">
        <View style={styles.whiteArch}>
          <Text style={styles.poweredByText}>Powered by</Text>
          <Text style={[styles.kmcText, {color: colors.primaryDark}]}>
            Kolkata Municipal Corporation
          </Text>
          <View style={styles.sloganRow}>
            <View style={[styles.sloganLine, {backgroundColor: colors.primary}]} />
            <Text style={[styles.sloganText, {color: colors.muted}]}>
              Clean City | Happy Citizens
            </Text>
            <View style={[styles.sloganLine, {backgroundColor: colors.primary}]} />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH,
    height: BANNER_HEIGHT,
    position: 'relative',
    marginTop: 16,
    overflow: 'hidden',
    alignSelf: 'center',
    backgroundColor: 'transparent',
  },
  skylineOverflow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  animatedTrack: {
    flexDirection: 'row',
    height: BANNER_HEIGHT,
    backgroundColor: 'transparent',
  },
  skylineImage: {
    width: BANNER_WIDTH,
    height: BANNER_HEIGHT,
  },
  archWrapper: {
    position: 'absolute',
    bottom: -6,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'flex-end',
    backgroundColor: 'transparent',
  },
  whiteArch: {
    backgroundColor: 'rgba(255, 255, 255, 0.82)',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 22,
    paddingTop: 6,
    paddingBottom: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: 'rgba(245, 124, 0, 0.18)',
    shadowColor: '#1A365D',
    shadowOffset: {width: 0, height: -2},
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  poweredByText: {
    fontSize: 9.5,
    color: '#64748B',
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  kmcText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
    marginTop: 0,
  },
  sloganRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 6,
  },
  sloganLine: {
    width: 22,
    height: 1.2,
    borderRadius: 1,
    opacity: 0.8,
  },
  sloganText: {
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});

