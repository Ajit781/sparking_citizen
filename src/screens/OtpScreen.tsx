import React, {useEffect, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {colors} from '../theme/colors';
import {getErrorMessage} from '../utils/errorUtils';
import UmangSkylineFooter from '../components/UmangSkylineFooter';
import ErrorModal from '../components/ErrorModal';
import {authService} from '../services/authService';
import {UserSession} from '../services/storageService';

const {width: SCREEN_WIDTH, height: SCREEN_HEIGHT} = Dimensions.get('window');
const BOX_WIDTH = 58;
const BOX_HEIGHT = 64;

export default function OtpScreen({
  mobileNumber,
  initialOtpForGateway,
  onBack,
  onNext,
}: {
  mobileNumber: string;
  initialOtpForGateway?: string;
  onBack: () => void;
  onNext: (session: UserSession) => void;
}) {
  const [otp, setOtp] = useState(initialOtpForGateway || '');
  const [countdown, setCountdown] = useState(45);
  const [canResend, setCanResend] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);

  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    let timer: any;
    if (countdown > 0) {
      timer = setInterval(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
    } else {
      setCanResend(true);
    }
    return () => clearInterval(timer);
  }, [countdown]);

  const handleVerifyOtp = async () => {
    Keyboard.dismiss();
    setErrorMessage(null);
    setSuccessMessage(null);

    const trimmedOtp = otp.trim();
    if (trimmedOtp.length < 4) {
      setErrorMessage('Please enter the 4-digit OTP sent to your mobile number.');
      return;
    }

    setIsLoading(true);
    try {
      const session = await authService.validateOtp(mobileNumber, trimmedOtp);
      setIsLoading(false);
      onNext(session);
    } catch (error: any) {
      setIsLoading(false);
      const message = getErrorMessage(error, 'OTP verification failed. Please check and try again.');
      setApiError(message);
    }
  };

  const handleResendOtp = async () => {
    if (!canResend || isResending) return;

    setIsResending(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const result = await authService.generateOtp(mobileNumber);
      setIsResending(false);
      setCountdown(result.resend_after_seconds || 45);
      setCanResend(false);
      setSuccessMessage('A new OTP has been sent successfully.');
    } catch (error: any) {
      setIsResending(false);
      const message = getErrorMessage(error, 'Failed to resend OTP. Please try again.');
      setApiError(message);
    }
  };

  const formattedTime = `00:${countdown < 10 ? `0${countdown}` : countdown}`;

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
        {/* 1. Top 4K Hero Banner - Extended downwards to 265px */}
        <View style={s.heroWrapper}>
          <Image
            source={require('../../assets/otp_hero_saffron_hd.jpg')}
            style={s.heroImage}
            resizeMode="cover"
          />
          {/* Floating Back Button */}
          <Pressable
            onPress={onBack}
            style={({pressed}) => [
              s.backButton,
              pressed && {opacity: 0.8, transform: [{scale: 0.95}]},
            ]}
            hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
            <Text style={s.backIcon}>‹</Text>
          </Pressable>
        </View>

        {/* 2. Rounded White Bottom Card (Overlapping the hero image with rounded top corners) */}
        <View style={s.bottomSheet}>
          {/* Overlapping Circular Logo Card & App Title */}
          <View style={s.overlappingBadgeWrapper}>
            <View style={s.badgeCard}>
              <Image
                source={require('../../assets/SmartParkingLogo.png')}
                style={s.badgeImage}
                resizeMode="contain"
              />
            </View>
            <Text style={[s.brandTitle, {color: colors.primaryDark}]}>Smart Parking</Text>
            <Text style={s.brandSubtitle}>for a Better City</Text>
          </View>

          {/* OTP Verification Title & Phone */}
          <Text style={s.title}>OTP Verification</Text>
          <Text style={s.subtitle}>Please enter the OTP sent to</Text>
          <Text style={[s.phoneHighlight, {color: colors.primaryDark}]}>
            {mobileNumber || '7980544903'}
          </Text>

          {/* Dynamic Error Banner */}
          {!!errorMessage && (
            <View style={s.errorContainer}>
              <Text style={s.errorIcon}>⚠️</Text>
              <Text style={s.errorText}>{errorMessage}</Text>
            </View>
          )}

          {/* Success Notification */}
          {!!successMessage && (
            <View style={s.successContainer}>
              <Text style={s.successIcon}>✅</Text>
              <Text style={s.successText}>{successMessage}</Text>
            </View>
          )}

          {/* 3. 4-Box OTP Input Fields */}
          <Pressable
            onPress={() => inputRef.current?.focus()}
            style={s.otpBoxesRow}>
            {[0, 1, 2, 3].map(index => {
              const digit = otp[index] || '';
              const isActive = isFocused && (otp.length === index || (otp.length === 4 && index === 3));
              const isFilled = digit.length > 0;

              return (
                <View
                  key={index}
                  style={[
                    s.otpBox,
                    isFilled && s.otpBoxFilled,
                    isActive && s.otpBoxActive,
                  ]}>
                  {digit ? (
                    <Text style={s.otpDigit}>{digit}</Text>
                  ) : isActive ? (
                    <Text style={[s.otpCursor, {color: colors.primary}]}>|</Text>
                  ) : null}
                </View>
              );
            })}

            {/* Hidden native input capturing user keystrokes (4 digits) */}
            <TextInput
              ref={inputRef}
              value={otp}
              onChangeText={text => {
                const numericOnly = text.replace(/[^0-9]/g, '').slice(0, 4);
                setOtp(numericOnly);
                if (errorMessage) setErrorMessage(null);
              }}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              keyboardType="number-pad"
              maxLength={4}
              style={s.hiddenInput}
              caretHidden
            />
          </Pressable>

          {/* 4. Resend Timer & Action Link */}
          <View style={s.resendContainer}>
            <Text style={s.resendTimerText}>
              {canResend ? 'Did not receive OTP?' : `Resend OTP in ${formattedTime}`}
            </Text>
            {canResend ? (
              <Pressable onPress={handleResendOtp} disabled={isResending}>
                <Text style={[s.resendLink, {color: colors.primary}, isResending && {opacity: 0.6}]}>
                  {isResending ? 'Resending...' : 'Resend OTP'}
                </Text>
              </Pressable>
            ) : (
              <Text style={[s.resendLink, {color: colors.primary, opacity: 0.45}]}>
                Resend OTP
              </Text>
            )}
          </View>

          {/* 5. Verify & Continue Button */}
          {isLoading ? (
            <View style={s.loaderWrap}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[s.loaderText, {color: colors.primary}]}>Verifying OTP...</Text>
            </View>
          ) : (
            <Pressable
              onPress={handleVerifyOtp}
              style={({pressed}) => [
                s.button,
                {backgroundColor: colors.primary},
                pressed && {opacity: 0.9, transform: [{scale: 0.98}]},
              ]}>
              <Text style={s.buttonText}>Verify & Continue</Text>
              <View style={s.buttonArrowWrapper}>
                <Text style={s.buttonArrow}>→</Text>
              </View>
            </Pressable>
          )}

          {/* 6. Footer: Secure Verification Trust Section */}
          <View style={[s.secureSection, { marginTop: 'auto' }]}>
            <View style={s.dividerRow}>
              <View style={s.dividerLine} />
              <Text style={s.dividerText}>Secure Verification</Text>
              <View style={s.dividerLine} />
            </View>

            <View style={s.shieldBadge}>
              <Image
                source={require('../../assets/secure_shield_saffron.png')}
                style={s.shieldImage}
                resizeMode="contain"
              />
            </View>

            <Text style={s.trustText}>
              Your information is safe with us{'\n'}and will never be shared.
            </Text>
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
    height: 265,
    position: 'relative',
    overflow: 'hidden',
  },
  heroImage: {
    width: SCREEN_WIDTH,
    height: 265,
  },
  backButton: {
    position: 'absolute',
    top: 40,
    left: 16,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  backIcon: {
    fontSize: 26,
    color: '#1E293B',
    fontWeight: '800',
    marginTop: -2,
    marginLeft: -2,
  },
  bottomSheet: {
    flex: 1,
    width: '100%',
    minHeight: SCREEN_HEIGHT - 230,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    marginTop: -32,
    paddingHorizontal: 22,
    paddingBottom: 50,
    alignItems: 'center',
    shadowColor: '#1A365D',
    shadowOffset: {width: 0, height: -4},
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
    shadowColor: '#1A365D',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.14,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  badgeImage: {
    width: 82,
    height: 82,
    borderRadius: 41,
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
    marginTop: 8,
  },
  brandSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    letterSpacing: 0.2,
    marginTop: 14,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    fontWeight: '500',
  },
  phoneHighlight: {
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 3,
    letterSpacing: 0.3,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderColor: '#EF4444',
    borderWidth: 1,
    padding: 10,
    borderRadius: 12,
    marginTop: 14,
    width: '100%',
    gap: 8,
  },
  errorIcon: {
    fontSize: 16,
  },
  errorText: {
    flex: 1,
    color: '#B91C1C',
    fontSize: 13,
    fontWeight: '600',
  },
  successContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
    borderWidth: 1,
    padding: 10,
    borderRadius: 12,
    marginTop: 14,
    width: '100%',
    gap: 8,
  },
  successIcon: {
    fontSize: 16,
  },
  successText: {
    flex: 1,
    color: '#047857',
    fontSize: 13,
    fontWeight: '600',
  },
  otpBoxesRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    gap: 12,
    position: 'relative',
    width: '100%',
  },
  otpBox: {
    width: BOX_WIDTH,
    height: BOX_HEIGHT,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1A365D',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  otpBoxFilled: {
    borderColor: '#CBD5E1',
    borderWidth: 1.2,
  },
  otpBoxActive: {
    borderColor: colors.primary,
    borderWidth: 1.8,
    shadowColor: colors.primary,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
  },
  otpDigit: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
  },
  otpCursor: {
    fontSize: 24,
    fontWeight: '300',
  },
  hiddenInput: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0,
  },
  resendContainer: {
    alignItems: 'center',
    marginTop: 22,
    marginBottom: 20,
    gap: 5,
  },
  resendTimerText: {
    fontSize: 13.5,
    color: '#64748B',
    fontWeight: '500',
  },
  resendLink: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.2,
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
    shadowOffset: {width: 0, height: 4},
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
  secureSection: {
    width: '100%',
    alignItems: 'center',
    marginTop: 28,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    gap: 12,
    marginBottom: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    fontSize: 12.5,
    color: '#94A3B8',
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  shieldBadge: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  shieldImage: {
    width: 40,
    height: 40,
  },
  trustText: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    fontWeight: '500',
  },
});
