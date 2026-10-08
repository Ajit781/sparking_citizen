import React, { useEffect, useRef } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { ScreenName } from '../types/navigation';

interface NavItemProps {
  icon: any;
  label: string;
  active: boolean;
  onPress: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, active, onPress }) => {
  const scaleAnim = useRef(new Animated.Value(active ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: active ? 1 : 0,
      friction: 6,
      tension: 50,
      useNativeDriver: true,
    }).start();
  }, [active, scaleAnim]);

  const iconTranslateY = scaleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [2, -2],
  });

  const dotOpacity = scaleAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0, 1],
  });

  const dotScale = scaleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, 1],
  });

  return (
    <Pressable
      onPress={onPress}
      style={styles.itemContainer}
      hitSlop={{ top: 12, bottom: 12, left: 16, right: 16 }}>

      <Animated.View style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center', transform: [{ translateY: iconTranslateY }] }}>
        <Image
          source={icon}
          style={[
            styles.icon,
            { tintColor: active ? colors.primary : '#94A3B8' },
          ]}
          resizeMode="contain"
        />
      </Animated.View>

      <Text
        style={[
          styles.label,
          active ? styles.activeLabel : styles.inactiveLabel,
        ]}>
        {label}
      </Text>
    </Pressable>
  );
};

export default function BottomNav({
  active,
  go,
}: {
  active: ScreenName;
  go: (s: ScreenName) => void;
}) {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 16) + 4;

  return (
    <View style={[styles.fullWidthContainer, { paddingBottom: bottomPadding }]}>
      <View style={styles.navRow}>
        <NavItem
          icon={require('../../assets/icons/nav_parking.png')}
          label="Home"
          active={active === 'home'}
          onPress={() => go('home')}
        />
        <NavItem
          icon={require('../../assets/icons/nav_booking_calendar.png')}
          label="Bookings"
          active={active === 'booking'}
          onPress={() => go('booking')}
        />
        <NavItem
          icon={require('../../assets/icons/icon_megaphone.png')}
          label="Grievances"
          active={active === 'myGrievances' || active === 'postGrievance'}
          onPress={() => go('myGrievances')}
        />
        <NavItem
          icon={require('../../assets/icons/nav_account.png')}
          label="Profile"
          active={active === 'profile' || active === 'setup'}
          onPress={() => go('profile')}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fullWidthContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.03)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 10,
    zIndex: 999,
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingTop: 2,
    paddingBottom: 0,
  },
  itemContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    width: 24,
    height: 24,
    marginBottom: 2,
  },
  activeDot: {
    position: 'absolute',
    bottom: -4,
    left: '50%',
    marginLeft: -2.5,
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 3,
    elevation: 2,
  },
  label: {
    fontSize: 10.5,
    marginTop: 2,
    letterSpacing: 0.2,
  },
  activeLabel: {
    color: colors.primary,
    fontWeight: '900',
  },
  inactiveLabel: {
    color: '#94A3B8',
    fontWeight: '600',
  },
});


