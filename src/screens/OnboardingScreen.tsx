import React from 'react';
import {
  Dimensions,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { colors } from '../theme/colors';
import UmangSkylineFooter from '../components/UmangSkylineFooter';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const IS_SAFFRON = colors.primary === '#F57C00';

export default function OnboardingScreen({
  index = 0,
  onNext,
  onSkip,
}: {
  index?: number;
  onNext: () => void;
  onSkip?: () => void;
}) {
  // Theme-aware assets
  const badgeSource = require('../../assets/SmartParkingLogo.png');

  const card1Ill = IS_SAFFRON
    ? require('../../assets/onboard_card1_saffron_hd.jpg')
    : require('../../assets/onboard_card1_ill.png');

  const card2Ill = IS_SAFFRON
    ? require('../../assets/onboard_card2_saffron_hd.jpg')
    : require('../../assets/onboard_card2_ill.png');

  const card3Ill = IS_SAFFRON
    ? require('../../assets/onboard_card3_saffron_hd.jpg')
    : require('../../assets/onboard_card3_ill.png');


  const primaryColor = IS_SAFFRON ? colors.primary : '#0C66E4';
  const primaryDarkColor = IS_SAFFRON ? colors.primaryDark : '#0B2545';
  const badgeNumBg = IS_SAFFRON ? '#FFE8D2' : '#E6F0FF';

  return (
    <View style={s.container}>
      <ScrollView
        style={s.scrollView}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Top Floating Clouds Decoration */}
        <View style={s.cloudLeft} />
        <View style={s.cloudRight} />

        {/* Top S-Parking Circular Badge */}
        <View style={s.topBadgeWrapper}>
          <View style={s.badgeCard}>
            <Image
              source={badgeSource}
              style={s.badgeImage}
              resizeMode="contain"
            />
          </View>
        </View>

        {/* Welcome Header */}
        <Text style={[s.title, { color: primaryDarkColor }]}>Welcome to Smart Parking</Text>
        <Text style={s.subtitle}>Smart Parking for a Better City</Text>
        <Text style={s.subText}>Park easy. Move freely. Together for smart parking.</Text>

        {/* Feature Cards List */}
        <View style={s.cardsContainer}>
          {/* Card 1: Find nearby parking */}
          <View style={s.card}>
            <View style={s.cardIllWrapper}>
              <Image source={card1Ill} style={s.cardIllImage} resizeMode="contain" />
            </View>
            <View style={s.cardContent}>
              <View style={[s.numBadge, { backgroundColor: badgeNumBg }]}>
                <Text style={[s.numText, { color: primaryColor }]}>1</Text>
              </View>
              <Text style={[s.cardTitle, { color: primaryDarkColor }]}>Find nearby parking</Text>
              <Text style={s.cardDesc}>
                Discover available parking spots near you in real time on the map.
              </Text>
            </View>
          </View>

          {/* Card 2: Add your vehicle */}
          <View style={s.card}>
            <View style={s.cardIllWrapper}>
              <Image source={card2Ill} style={s.cardIllImage} resizeMode="contain" />
            </View>
            <View style={s.cardContent}>
              <View style={[s.numBadge, { backgroundColor: badgeNumBg }]}>
                <Text style={[s.numText, { color: primaryColor }]}>2</Text>
              </View>
              <Text style={[s.cardTitle, { color: primaryDarkColor }]}>Add your vehicle</Text>
              <Text style={s.cardDesc}>
                Save your vehicle details for a faster and smoother parking experience.
              </Text>
            </View>
          </View>

          {/* Card 3: Book and pay easily */}
          <View style={s.card}>
            <View style={s.cardIllWrapper}>
              <Image source={card3Ill} style={s.cardIllImage} resizeMode="contain" />
            </View>
            <View style={s.cardContent}>
              <View style={[s.numBadge, { backgroundColor: badgeNumBg }]}>
                <Text style={[s.numText, { color: primaryColor }]}>3</Text>
              </View>
              <Text style={[s.cardTitle, { color: primaryDarkColor }]}>Book and pay easily</Text>
              <Text style={s.cardDesc}>
                Select your parking area, choose duration and pay securely – all in a few taps.
              </Text>
            </View>
          </View>
          {/* Removed cards 4 and 5 */}
        </View>

        {/* Bottom Section (Pushed to bottom) */}
        <View style={{ marginTop: 'auto', width: '100%', alignItems: 'center' }}>
          {/* Carousel Dots */}
          <View style={s.dotsRow}>
            <View style={[s.dot, s.dotActive, { backgroundColor: primaryColor }]} />
            <View style={s.dot} />
            <View style={s.dot} />
          </View>

          {/* Get Started Button */}
          <Pressable
            onPress={onNext}
            style={({ pressed }) => [
              s.button,
              { backgroundColor: primaryColor },
              pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
            ]}>
            <Text style={s.buttonText}>Get Started</Text>
            <View style={s.buttonArrowWrapper}>
              <Text style={s.buttonArrow}>→</Text>
            </View>
          </Pressable>

          {/* Umang-style Animated Kolkata Skyline Footer */}
          <View style={{ width: SCREEN_WIDTH }}>
            <UmangSkylineFooter />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFD',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 0,
    alignItems: 'center',
  },
  cloudLeft: {
    position: 'absolute',
    top: 24,
    left: 20,
    width: 68,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E7F0FB',
    opacity: 0.7,
  },
  cloudRight: {
    position: 'absolute',
    top: 36,
    right: 20,
    width: 76,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E7F0FB',
    opacity: 0.7,
  },
  topBadgeWrapper: {
    marginTop: 10,
    marginBottom: 12,
  },
  badgeCard: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#1A365D',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  badgeImage: {
    width: 82,
    height: 82,
    borderRadius: 41,
  },
  title: {
    fontSize: 27,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
    textAlign: 'center',
    marginTop: 4,
  },
  subText: {
    fontSize: 13,
    color: '#718096',
    textAlign: 'center',
    marginTop: 3,
    marginBottom: 16,
  },
  cardsContainer: {
    width: '100%',
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 12,
    shadowColor: '#1A365D',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#EFF4F9',
  },
  cardIllWrapper: {
    width: 110,
    height: 94,
    borderRadius: 16,
    backgroundColor: '#FFF5EB',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardIllImage: {
    width: '100%',
    height: '100%',
  },
  cardContent: {
    flex: 1,
    paddingLeft: 12,
  },
  numBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  numText: {
    fontSize: 13,
    fontWeight: '900',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 2,
  },
  cardDesc: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 18,
    marginBottom: 16,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#CBD5E1',
  },
  dotActive: {
    width: 22,
    borderRadius: 4,
  },
  button: {
    width: '100%',
    height: 52,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  buttonArrowWrapper: {
    position: 'absolute',
    right: 20,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonArrow: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
});
