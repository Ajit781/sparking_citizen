import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { authService } from '../services/authService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '../config/api.config';
import DeviceInfo from 'react-native-device-info';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Keep theme compatibility
const IS_SAFFRON = colors.primary === '#F57C00' || colors.primary === '#EA580C' || colors.primary === '#C2410C';

export default function SplashScreen({ onNext }: { onNext: () => void }) {
  const insets = useSafeAreaInsets();

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.88)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 1. Pre-warm token in background
    authService.initToken().catch(err => {
      console.warn('[SplashScreen] Token pre-warm notice:', err?.message || err);
    });

    // 1.5 Check dynamic App Version and Base URL
    const checkAppVersion = async () => {
      try {
        // Load cached url first (in case offline or slow network)
        const cachedUrl = await AsyncStorage.getItem('@dynamic_base_url');
        if (cachedUrl) {
          console.log('🌐 [SplashScreen] Loaded cached Base URL:', cachedUrl);
          API_CONFIG.BASE_URL = cachedUrl;
        }

        const packageName = DeviceInfo.getBundleId();
        const appVersion = DeviceInfo.getVersion();
        console.log(`📡 [SplashScreen] Calling CheckAppVersion API for Package: ${packageName}, Version: ${appVersion}`);
        
        const formData = new URLSearchParams();
        formData.append('Package', packageName);
        formData.append('Version', appVersion);

        const response = await fetch('https://www.s-parking.com/sParkingAppVersion/CheckAppVersion.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: formData.toString()
        });

        const data = await response.json();
        console.log('📥 [SplashScreen] AppVersion Response:', data);

        if (data && data.base_url) {
          console.log('✅ [SplashScreen] Updating dynamic base_url to:', data.base_url);
          API_CONFIG.BASE_URL = data.base_url;
          await AsyncStorage.setItem('@dynamic_base_url', data.base_url);
        } else if (data && data.status === 0) {
           Alert.alert("Notice", data.message || "Unable to fetch server details.");
        }
      } catch (error) {
        console.error('❌ [SplashScreen] AppVersion Check Failed:', error);
        if (!API_CONFIG.BASE_URL) {
          Alert.alert("Connection Error", "Failed to connect to the server. Please check your internet connection and try again.");
        }
      }
    };

    checkAppVersion();

    // 2. Entrance Animation (Fade-in + Spring Scale)
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 900,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: 2400,
        useNativeDriver: false,
      }),
    ]).start();

    // 3. Continuous Breathing Aura Pulse behind Emblem
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.18,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // 4. Auto-navigate after 2.5 seconds
    const timer = setTimeout(() => {
      onNext();
    }, 2500);

    return () => {
      clearTimeout(timer);
    };
  }, [onNext]);

  // Assets selection
  const mapSource = IS_SAFFRON
    ? require('../../assets/splash_map_clean_saffron.png')
    : require('../../assets/splash_map_clean.png');

  const badgeSource = require('../../assets/SmartParkingLogo.png');
  const citySource = require('../../assets/splash_city_saffron_clean.png');

  const primaryAccent = colors.primary || '#D94800';

  // Progress Bar width interpolator
  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <Pressable onPress={onNext} style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* 1. Top Map Layer with subtle ambient opacity */}
      <View style={styles.mapContainer} pointerEvents="none">
        <Image
          source={mapSource}
          style={styles.mapImage}
          resizeMode="cover"
        />
        {/* Soft gradient fade so the map dissolves into clean background */}
        <View style={styles.mapSoftDissolve} />
      </View>

      {/* 2. Center Content with High-End Animations */}
      <View style={[styles.contentWrapper, { paddingTop: Math.max(insets.top + 16, SCREEN_HEIGHT * 0.11) }]}>
        <Animated.View
          style={[
            styles.centerContent,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}>

          {/* Breathing Radar Halo Glow behind Badge */}
          <View style={styles.emblemWrapper}>
            <Animated.View
              style={[
                styles.breathingHalo,
                {
                  borderColor: primaryAccent,
                  transform: [{ scale: pulseAnim }],
                },
              ]}
            />

            {/* Circular Luxury Emblem Card */}
            <View style={[styles.badgeCard, { borderColor: primaryAccent + '33' }]}>
              <Image
                source={badgeSource}
                style={styles.badgeImage}
                resizeMode="contain"
              />
            </View>
          </View>
          {/* Official Accreditation Pill */}
          <View style={[styles.kmcCivicTag, { borderColor: primaryAccent + '35' }]}>
            <View style={[styles.pulseMiniDot, { backgroundColor: primaryAccent }]} />
            <Text style={[styles.kmcCivicTagText, { color: primaryAccent }]}>
              SMART PARKING
            </Text>
          </View>

          {/* Title with Executive Kerning */}
          <Text style={[styles.title, { color: primaryAccent }]}>
            Smart Parking
          </Text>
          {/* Tagline */}
          <Text style={styles.subtitle}>
            Park Smart Parking
          </Text>
          {/* 3. Sleek Live Initializing Track Bar */}
          <View style={styles.loadingTrackContainer}>
            <View style={styles.loadingTrackBg}>
              <Animated.View
                style={[
                  styles.loadingTrackFill,
                  {
                    backgroundColor: primaryAccent,
                    width: progressWidth,
                  },
                ]}
              />
            </View>
            <Text style={styles.loadingStatusText}>
              Connecting to live  sensors...
            </Text>
          </View>

        </Animated.View>
      </View>

      {/* 4. Bottom Cityscape & Highway Vector Illustration */}
      <View style={styles.bottomIllustrationContainer} pointerEvents="none">
        <View style={styles.imageCropper}>
          <Image
            source={citySource}
            style={styles.cityImage}
            resizeMode="cover"
          />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F8FAFD',
    overflow: 'hidden',
  },

  /* Top Map Layer */
  mapContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.52,
    opacity: 0.85,
  },
  mapImage: {
    width: '100%',
    height: '100%',
  },
  mapSoftDissolve: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 90,
    backgroundColor: 'rgba(248, 250, 253, 0.85)',
  },

  /* Center Content */
  contentWrapper: {
    flex: 1,
    zIndex: 10,
  },
  centerContent: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },

  /* Emblem & Breathing Ring */
  emblemWrapper: {
    width: 136,
    height: 136,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 16,
  },
  breathingHalo: {
    position: 'absolute',
    width: 132,
    height: 132,
    borderRadius: 66,
    borderWidth: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
    opacity: 0.45,
  },
  badgeCard: {
    width: 114,
    height: 114,
    borderRadius: 57,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 3,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
  },
  badgeImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },

  /* KMC Civic Accreditation Tag */
  kmcCivicTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  pulseMiniDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  kmcCivicTagText: {
    fontSize: 9.5,
    fontWeight: '900',
    letterSpacing: 0.8,
  },

  /* Typography */
  title: {
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginTop: 2,
  },
  subtitle: {
    fontSize: 16,
    color: '#1E293B',
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 4,
    letterSpacing: -0.2,
  },
  subCityNotice: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    fontWeight: '600',
  },
  /* Live Initializing Progress Bar */
  loadingTrackContainer: {
    marginTop: 22,
    alignItems: 'center',
    width: 160,
  },
  loadingTrackBg: {
    width: '100%',
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  loadingTrackFill: {
    height: '100%',
    borderRadius: 2,
  },
  loadingStatusText: {
    fontSize: 10.5,
    color: '#94A3B8',
    fontWeight: '700',
    marginTop: 8,
    letterSpacing: 0.2,
  },

  /* Bottom Vector Cityscape */
  bottomIllustrationContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.38,
    justifyContent: 'flex-end',
  },
  imageCropper: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  cityImage: {
    width: '100%',
    height: '100%',
    transform: [
      { scale: 1.15 },
      { translateY: 20 },
    ],
  },
});