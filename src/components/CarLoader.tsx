import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Easing, Modal, Text, Image } from 'react-native';
import { colors } from '../theme/colors';

interface CarLoaderProps {
  visible: boolean;
  message?: string;
}

export default function CarLoader({ visible, message = 'Loading...' }: CarLoaderProps) {
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const roadAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(bounceAnim, {
            toValue: -4,
            duration: 150,
            useNativeDriver: true,
            easing: Easing.out(Easing.quad)
          }),
          Animated.timing(bounceAnim, {
            toValue: 0,
            duration: 150,
            useNativeDriver: true,
            easing: Easing.in(Easing.quad)
          }),
        ])
      ).start();

      Animated.loop(
        Animated.timing(roadAnim, {
          toValue: -30,
          duration: 350,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    } else {
      bounceAnim.setValue(0);
      roadAnim.setValue(0);
    }
  }, [visible, bounceAnim, roadAnim]);

  if (!visible) return null;

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 99999, elevation: 999 }]}>
      <View style={s.overlay}>
        <View style={s.loaderCard}>
          
          {/* Animation Container */}
          <View style={s.animationBox}>
            <Animated.View style={[s.carIconContainer, { transform: [{ translateY: bounceAnim }] }]}>
              <Image 
                source={require('../../assets/icons/icon_car.png')} 
                style={s.carIcon} 
                resizeMode="contain" 
              />
            </Animated.View>
            
            {/* Moving Road */}
            <View style={s.roadWrapper}>
              <Animated.View style={[s.road, { transform: [{ translateX: roadAnim }] }]}>
                {/* Create multiple road dashes to ensure seamless looping */}
                {[...Array(15)].map((_, i) => (
                  <View key={i} style={s.roadDash} />
                ))}
              </Animated.View>
            </View>
          </View>

          <Text style={s.loadingText}>{message}</Text>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loaderCard: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 10,
    minWidth: 160,
  },
  animationBox: {
    width: 100,
    height: 60,
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'hidden',
    marginBottom: 16,
  },
  carIconContainer: {
    zIndex: 2,
    marginBottom: 4,
  },
  carIcon: {
    width: 48,
    height: 48,
    tintColor: colors.primary,
  },
  roadWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    overflow: 'hidden',
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
  },
  road: {
    flexDirection: 'row',
    width: 450, // wider than container to allow movement
  },
  roadDash: {
    width: 15,
    height: 4,
    backgroundColor: '#94A3B8',
    marginRight: 15, // width + marginRight = 30 (which is toValue for roadAnim)
  },
  loadingText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 0.5,
  },
});
