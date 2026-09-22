import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';

interface CivicNavbarProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  rightContent?: React.ReactNode;
  badge?: string; // e.g. "KMC", "FASTag", "LIVE", "STEP 1/2"
  variant?: 'primary' | 'surface'; // default 'primary' (Saffron Brand)
  arrowType?: 'arrow' | 'chevron'; // default 'arrow'
  style?: StyleProp<ViewStyle>;
}

// 🎯 Ultra-Crisp Vector Back Arrow (Never blurs, 100% sharp on all screen resolutions)
function CustomBackIcon({
  color,
  type = 'arrow',
}: {
  color: string;
  type?: 'arrow' | 'chevron';
}) {
  if (type === 'chevron') {
    return (
      <View style={iconStyles.chevronBox}>
        <View style={[iconStyles.chevronShape, { borderColor: color }]} />
      </View>
    );
  }

  // Modern Stem Arrow (←) like Cred / Apple Maps
  return (
    <View style={iconStyles.arrowBox}>
      {/* Horizontal Stem */}
      <View style={[iconStyles.arrowStem, { backgroundColor: color }]} />
      {/* Angled Arrow Head */}
      <View style={[iconStyles.arrowHead, { borderColor: color }]} />
    </View>
  );
}

export default function CivicNavbar({
  title,
  subtitle,
  onBack,
  rightContent,
  badge,
  variant = 'primary',
  arrowType = 'arrow',
  style,
}: CivicNavbarProps) {
  const insets = useSafeAreaInsets();
  const isPrimary = variant === 'primary';
  const iconColor = isPrimary ? '#FFFFFF' : colors.primary;

  return (
    <View
      style={[
        s.topBar,
        isPrimary ? s.topBarPrimary : s.topBarSurface,
        { paddingTop: Math.max(insets.top + 6, 18) },
        style,
      ]}>
      {/* Ambient Glass Reflections for Ultra-Luxury Depth */}
      {isPrimary && (
        <>
          <View style={s.ambientGlowLarge} pointerEvents="none" />
          <View style={s.ambientGlowSmall} pointerEvents="none" />
        </>
      )}

      <View style={s.topBarRow}>
        {/* 1. Left Action: Tactile Glass Back Button */}
        {onBack ? (
          <Pressable
            onPress={onBack}
            style={({ pressed }) => [
              s.backBtn,
              isPrimary ? s.backBtnPrimary : s.backBtnSurface,
              pressed && (isPrimary ? s.backBtnPrimaryPressed : s.backBtnSurfacePressed),
            ]}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <CustomBackIcon color={iconColor} type={arrowType} />
          </Pressable>
        ) : (
          <View style={s.balancePlaceholder} />
        )}

        {/* 2. Center: Perfectly Centered Title & Subtitle Group */}
        <View style={s.navTitleGroup}>
          <View style={s.titleRow}>
            <Text
              style={[
                s.topBarTitle,
                { color: isPrimary ? '#FFFFFF' : '#0F172A' },
              ]}
              numberOfLines={1}>
              {title}
            </Text>

            {/* Optional Micro Badge */}
            {!!badge && (
              <View
                style={[
                  s.titleBadge,
                  isPrimary ? s.titleBadgePrimary : s.titleBadgeSurface,
                ]}>
                <Text
                  style={[
                    s.titleBadgeText,
                    { color: isPrimary ? '#FFFFFF' : colors.primary },
                  ]}>
                  {badge}
                </Text>
              </View>
            )}
          </View>

          {!!subtitle && (
            <View style={s.subtitleRow}>
              {isPrimary && <View style={s.liveMiniDot} />}
              <Text
                style={[
                  s.topBarSubtitle,
                  { color: isPrimary ? 'rgba(255, 255, 255, 0.88)' : '#64748B' },
                ]}
                numberOfLines={1}>
                {subtitle}
              </Text>
            </View>
          )}
        </View>

        {/* 3. Right Action Box: Symmetrical Counterbalance */}
        <View style={s.rightContentBox}>
          {rightContent || <View style={s.balancePlaceholder} />}
        </View>
      </View>
    </View>
  );
}

const iconStyles = StyleSheet.create({
  /* Arrow (←) */
  arrowBox: {
    width: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  arrowStem: {
    width: 14,
    height: 2.6,
    borderRadius: 1.5,
    position: 'absolute',
    left: 4.5,
  },
  arrowHead: {
    width: 9,
    height: 9,
    borderLeftWidth: 2.6,
    borderBottomWidth: 2.6,
    borderRadius: 1.8,
    transform: [{ rotate: '45deg' }],
    position: 'absolute',
    left: 3.5,
  },

  /* Chevron (<) */
  chevronBox: {
    width: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  chevronShape: {
    width: 10,
    height: 10,
    borderLeftWidth: 2.6,
    borderBottomWidth: 2.6,
    borderRadius: 2,
    transform: [{ rotate: '45deg' }],
    marginLeft: 3,
  },
});

const s = StyleSheet.create({
  /* Container Base */
  topBar: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
    position: 'relative',
    overflow: 'hidden',
    zIndex: 10,
  },
  topBarPrimary: {
    backgroundColor: colors.primary,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.18)',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  topBarSurface: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F6',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },

  /* Ambient Glass Glow Circles */
  ambientGlowLarge: {
    position: 'absolute',
    top: -45,
    right: -25,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  ambientGlowSmall: {
    position: 'absolute',
    bottom: -30,
    left: 20,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
  },

  /* Flex Row */
  topBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 2,
  },

  /* Tactile Glass Back Button */
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnPrimary: {
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 3,
  },
  backBtnPrimaryPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.38)',
    transform: [{ scale: 0.92 }],
  },
  backBtnSurface: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  backBtnSurfacePressed: {
    backgroundColor: '#F1F5F9',
    transform: [{ scale: 0.92 }],
  },

  /* Center Title Group */
  navTitleGroup: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    maxWidth: '100%',
  },
  topBarTitle: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  titleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBadgePrimary: {
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  titleBadgeSurface: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  titleBadgeText: {
    fontSize: 8.5,
    fontWeight: '900',
    letterSpacing: 0.6,
  },

  /* Subtitle */
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  liveMiniDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#4ADE80',
  },
  topBarSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },

  /* Right Action Box & Balance Placeholder */
  rightContentBox: {
    minWidth: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  balancePlaceholder: {
    width: 44,
    height: 44,
  },
});