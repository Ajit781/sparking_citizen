import React, { useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { colors } from '../theme/colors';
import { authService, GenerateOtpResult } from '../services/authService';
import { getErrorMessage } from '../utils/errorUtils';
import ErrorModal from '../components/ErrorModal';
import UmangSkylineFooter from '../components/UmangSkylineFooter';
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const HERO_HEIGHT = 295;
const HERO_IMAGE_WIDTH = Math.max(SCREEN_WIDTH, (HERO_HEIGHT * 16) / 10);

const IS_SAFFRON = colors.primary === '#F57C00';

export default function LoginScreen({
  onNext,
}: {
  onNext: (mobile: string, otpResult?: GenerateOtpResult) => void;
}) {
  const [mobileNumber, setMobileNumber] = useState('');
  const [agreed, setAgreed] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  // Theme-aware assets
  const badgeSource = require('../../assets/SmartParkingLogo.png');

  const heroSource = IS_SAFFRON
    ? require('../../assets/login_hero_saffron_hd.jpg')
    : require('../../assets/login_hero_ill.png');


  const primaryColor = IS_SAFFRON ? colors.primary : '#0C66E4';
  const primaryDarkColor = IS_SAFFRON ? colors.primaryDark : '#0B2545';

  const handleSendOtp = async () => {
    setErrorMessage(null);

    const trimmed = mobileNumber.trim();
    if (!trimmed) {
      setErrorMessage('Please enter your mobile number.');
      return;
    }

    if (trimmed.length < 10) {
      setErrorMessage('Please enter a valid 10-digit mobile number.');
      return;
    }

    if (!agreed) {
      setErrorMessage('Please accept the Terms & Conditions and Privacy Policy.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await authService.generateOtp(trimmed);
      setIsLoading(false);
      onNext(trimmed, result);
    } catch (error: any) {
      setIsLoading(false);
      const message = getErrorMessage(error, 'Something went wrong while generating OTP. Please try again.');
      setApiError(message);
    }
  };

  return (
    <>
      <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={s.scrollView}
        contentContainerStyle={s.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        {/* Top Hero Banner with City, Road & White Car */}
        <View style={s.heroWrapper}>
          <Image source={heroSource} style={s.heroImage} resizeMode="cover" />
        </View>

        {/* Rounded Bottom Sheet overlapping the Hero Image */}
        <View style={s.bottomSheet}>
          {/* Overlapping Center Badge */}
          <View style={s.overlappingBadgeWrapper}>
            <View style={s.badgeCard}>
              <Image
                source={badgeSource}
                style={s.badgeImage}
                resizeMode="contain"
              />
            </View>
          </View>

          {/* Center Welcome Section */}
          <View style={s.formCard}>
            <Text style={[s.title, { color: primaryDarkColor }]}>Welcome to Smart Parking</Text>
            <Text style={s.subtitle}>Smart Parking for a Better Kolkata</Text>
            <View style={[s.subAccentBar, { backgroundColor: primaryColor }]} />

            {/* Dynamic Error Banner */}
            {!!errorMessage && (
              <View style={s.errorContainer}>
                <Text style={s.errorIcon}>⚠️</Text>
                <Text style={s.errorText}>{errorMessage}</Text>
              </View>
            )}

            {/* Mobile Number Input Section */}
            <View style={s.inputGroup}>
              <Text style={[s.inputLabel, { color: primaryDarkColor }]}>Mobile Number</Text>
              <View style={s.phoneInputRow}>
                {/* Country Code with Indian Flag */}
                <View style={s.countryCodeBox}>
                  <Text style={s.flagEmoji}>🇮🇳</Text>
                  <Text style={s.countryCodeText}>+91</Text>
                  <Text style={s.chevronIcon}>⌵</Text>
                </View>

                {/* Vertical divider */}
                <View style={s.inputDivider} />

                {/* Text Input */}
                <TextInput
                  placeholder="Enter mobile number"
                  placeholderTextColor="#94A3B8"
                  keyboardType="phone-pad"
                  maxLength={10}
                  value={mobileNumber}
                  onChangeText={text => {
                    setMobileNumber(text.replace(/[^0-9]/g, ''));
                    if (errorMessage) setErrorMessage(null);
                  }}
                  style={s.textInput}
                />
              </View>
              <Text style={s.helperText}>Use your mobile number to continue</Text>
            </View>

            {/* Terms and Conditions Checkbox */}
            <Pressable
              onPress={() => setAgreed(!agreed)}
              style={s.termsRow}>
              <View
                style={[
                  s.checkbox,
                  agreed && { backgroundColor: primaryColor, borderColor: primaryColor },
                ]}>
                {agreed && <Text style={s.checkmarkText}>✓</Text>}
              </View>
              <Text style={s.termsText}>
                I agree to the{' '}
                <Text style={[s.termsLink, { color: primaryColor }]}>Terms & Conditions</Text> and{' '}
                <Text style={[s.termsLink, { color: primaryColor }]}>Privacy Policy</Text>
              </Text>
            </Pressable>

            {/* Send OTP Button */}
            {isLoading ? (
              <View style={s.loaderWrap}>
                <ActivityIndicator size="large" color={primaryColor} />
                <Text style={[s.loaderText, { color: primaryColor }]}>Sending OTP...</Text>
              </View>
            ) : (
              <Pressable
                onPress={handleSendOtp}
                style={({ pressed }) => [
                  s.button,
                  { backgroundColor: primaryColor },
                  pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
                ]}>
                <Text style={s.buttonText}>Send OTP</Text>
                <View style={s.buttonArrowWrapper}>
                  <Text style={s.buttonArrow}>→</Text>
                </View>
              </Pressable>
            )}
          </View>

          {/* Footer at the bottom */}
          <View style={{ marginTop: 'auto', width: '100%', marginHorizontal: -22 }}>
            <UmangSkylineFooter />
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>

      <ErrorModal
        visible={!!apiError}
        message={apiError || ''}
        onClose={() => setApiError(null)}
      />
    </>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 0,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  heroWrapper: {
    width: SCREEN_WIDTH,
    height: HERO_HEIGHT,
    position: 'relative',
    overflow: 'hidden',
  },
  heroImage: {
    width: HERO_IMAGE_WIDTH,
    height: HERO_HEIGHT,
    position: 'absolute',
    left: 0,
    top: 0,
  },
  bottomSheet: {
    flex: 1,
    width: '100%',
    minHeight: SCREEN_HEIGHT - 260,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -18,
    paddingHorizontal: 22,
    paddingBottom: 40,
    alignItems: 'center',
    shadowColor: '#1A365D',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
  },
  overlappingBadgeWrapper: {
    marginTop: -48,
    zIndex: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeCard: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#1A365D',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 14,
    elevation: 8,
  },
  badgeImage: {
    width: 88,
    height: 88,
    borderRadius: 44,
  },
  formCard: {
    width: '100%',
    alignItems: 'center',
    marginTop: 8,
  },
  title: {
    fontSize: 25,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    fontWeight: '500',
  },
  subAccentBar: {
    width: 48,
    height: 3,
    borderRadius: 2,
    marginTop: 10,
    marginBottom: 20,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF1F2',
    borderColor: '#FECDD3',
    borderWidth: 1,
    padding: 12,
    borderRadius: 14,
    marginBottom: 16,
    width: '100%',
    gap: 8,
  },
  errorIcon: {
    fontSize: 16,
  },
  errorText: {
    flex: 1,
    color: '#E11D48',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  inputGroup: {
    width: '100%',
    marginBottom: 18,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 8,
  },
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 52,
    shadowColor: '#1A365D',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  countryCodeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  flagEmoji: {
    fontSize: 18,
  },
  countryCodeText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  chevronIcon: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '700',
    marginTop: -2,
  },
  inputDivider: {
    width: 1,
    height: 22,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#0F172A',
    fontWeight: '600',
    paddingVertical: 0,
  },
  helperText: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 6,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 22,
    gap: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#94A3B8',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkmarkText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    marginTop: -1,
  },
  termsText: {
    flex: 1,
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
  },
  termsLink: {
    fontWeight: '800',
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
  loaderWrap: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  loaderText: {
    fontWeight: '700',
    marginTop: 8,
    fontSize: 14,
  },
});
