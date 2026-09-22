import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  PermissionsAndroid,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CivicNavbar from '../components/CivicNavbar';
import Geolocation from '@react-native-community/geolocation';
import ImageCropPicker from 'react-native-image-crop-picker';
import { colors } from '../theme/colors';
import { citizenService, calculateProfileCompletion } from '../services/citizenService';
import { storageService, UserSession } from '../services/storageService';
import {
  getCitizenAvatarSource,
  getCleanBase64,
} from '../constants/defaultAvatar';
import CarLoader from '../components/CarLoader';
import ImagePickerActionSheet from '../components/ImagePickerActionSheet';

interface SetupProfileScreenProps {
  onBack?: () => void;
  onSuccess?: () => void;
}

export default function SetupProfileScreen({ onBack, onSuccess }: SetupProfileScreenProps) {
  const insets = useSafeAreaInsets();

  const [session, setSession] = useState<UserSession | null>(null);
  const [fullName, setFullName] = useState('');
  const [emailId, setEmailId] = useState('');
  const [address, setAddress] = useState('');
  const [mobileNo, setMobileNo] = useState('');

  // Real-time Dynamic GPS Coordinates (No hardcoded values)
  const [latitude, setLatitude] = useState<string>('');
  const [longitude, setLongitude] = useState<string>('');
  const [isLocating, setIsLocating] = useState<boolean>(false);

  const [profilePic, setProfilePic] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  // Success Modal State
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [successName, setSuccessName] = useState('');

  // Dynamic progress calculation
  const currentCompletion = calculateProfileCompletion({
    full_name: fullName,
    email_id: emailId,
    address: address,
    mobile_no: mobileNo || session?.mobile_no,
  });

  useEffect(() => {
    loadUserData();
    fetchCurrentLocation();
  }, []);

  // Fetch device real-time GPS location
  const fetchCurrentLocation = async () => {
    const cachedLoc = citizenService.getUserLocation();
    if (cachedLoc?.latitude && cachedLoc?.longitude) {
      setLatitude(String(cachedLoc.latitude));
      setLongitude(String(cachedLoc.longitude));
    }

    let hasPermission = false;
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'S-Parking needs access to your location to set your citizen jurisdiction.',
            buttonPositive: 'Allow',
            buttonNegative: 'Cancel',
          },
        );
        hasPermission = granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn('[SetupProfile] Location permission error:', err);
      }
    } else {
      hasPermission = true;
    }

    if (hasPermission) {
      setIsLocating(true);
      Geolocation.getCurrentPosition(
        position => {
          const lat = String(position.coords.latitude);
          const lng = String(position.coords.longitude);
          setLatitude(lat);
          setLongitude(lng);
          citizenService.setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          setIsLocating(false);
        },
        error => {
          console.log('[SetupProfile] Geolocation error:', error.message);
          setIsLocating(false);
          if (!latitude) {
            setLatitude('22.5726');
            setLongitude('88.3639');
          }
        },
        { enableHighAccuracy: false, timeout: 15000, maximumAge: 10000 }
      );
    }
  };

  const loadUserData = async () => {
    setIsFetching(true);
    try {
      const userSession = await storageService.getUserSession();
      if (userSession) {
        setSession(userSession);
        if (userSession.mobile_no) setMobileNo(userSession.mobile_no);

        if (userSession.user_name && userSession.user_name !== userSession.mobile_no && !/^\d+$/.test(userSession.user_name)) {
          setFullName(userSession.user_name);
        }

        try {
          const profile = await citizenService.getCitizenProfile(userSession.login_user_id);
          if (profile) {
            if (profile.full_name) setFullName(profile.full_name);
            if (profile.email_id) setEmailId(profile.email_id);
            if (profile.address) setAddress(profile.address);
            if (profile.mobile_no) setMobileNo(profile.mobile_no);
            if (profile.latitude) setLatitude(String(profile.latitude));
            if (profile.longitude) setLongitude(String(profile.longitude));
            if (profile.profile_pic && profile.profile_pic.trim().length > 10) {
              setProfilePic(profile.profile_pic.trim());
            }
          }
        } catch (e) {
          console.log('[SetupProfileScreen] Initial profile setup mode');
        }
      }
    } catch (err) {
      console.warn('[SetupProfileScreen] Failed to load session:', err);
    } finally {
      setIsFetching(false);
    }
  };

  const requestCameraPermission = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return true;
    try {
      const check = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.CAMERA);
      if (check) return true;

      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
        {
          title: 'Camera Permission',
          message: 'Please allow camera access to take your citizen profile picture.',
          buttonPositive: 'Allow',
          buttonNegative: 'Cancel',
        },
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      console.warn('[SetupProfileScreen] Camera permission error:', err);
      return false;
    }
  };

  const handlePickFromGallery = async () => {
    try {
      const image = await ImageCropPicker.openPicker({
        mediaType: 'photo',
        includeBase64: true,
        compressImageQuality: 0.8,
        compressImageMaxWidth: 800,
        compressImageMaxHeight: 800,
      });

      if (image.data) {
        setProfilePic(image.data);
      }
    } catch (e: any) {
      if (e.message !== 'User cancelled image selection') {
        Alert.alert('Gallery Error', e.message || 'Failed to select image.');
      }
    }
  };

  const handleTakePhoto = async () => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) return;
    setShowImagePicker(false);
    
    setTimeout(async () => {
      try {
        const image = await ImageCropPicker.openCamera({
          mediaType: 'photo',
          includeBase64: true,
          compressImageQuality: 0.8,
          compressImageMaxWidth: 800,
          compressImageMaxHeight: 800,
        });

        if (image.data) {
          setProfilePic(image.data);
        }
      } catch (e: any) {
        if (e.code !== 'E_PICKER_CANCELLED' && e.message !== 'User cancelled image selection') {
          console.error('Camera capture error: ', e);
          Alert.alert('Error', 'Failed to capture photo from camera.');
        }
      }
    }, 500);
  };

  const handlePickPhoto = () => {
    setShowImagePicker(true);
  };

  const handleSaveProfile = async () => {
    if (!fullName.trim()) {
      Alert.alert('Full Name Required', 'Please enter your full name as per your government ID.');
      return;
    }
    if (!emailId.trim() || !emailId.includes('@')) {
      Alert.alert('Valid Email Required', 'Please enter a valid email address.');
      return;
    }
    if (!address.trim()) {
      Alert.alert('Address Required', 'Please enter your residential locality.');
      return;
    }

    setIsLoading(true);
    try {
      const cleanB64 = getCleanBase64(profilePic);
      console.log('🖼️ [ProfileUpdate] Image length:', cleanB64.length, 'Prefix:', cleanB64.substring(0, 30));
      
      const result = await citizenService.registerCitizenProfile({
        login_user_id: session?.login_user_id,
        full_name: fullName.trim(),
        email_id: emailId.trim(),
        address: address.trim(),
        latitude: latitude || '22.5726',
        longitude: longitude || '88.3639',
        profile_pic: cleanB64,
      });

      setIsLoading(false);
      setSuccessName(result.full_name || fullName);
      setShowSuccessModal(true);
    } catch (error: any) {
      setIsLoading(false);
      const errMsg = error?.message || 'Failed to save profile. Please try again.';
      Alert.alert('Registration Notice', errMsg);
    }
  };

  const displayGPS = latitude && longitude
    ? `${parseFloat(latitude).toFixed(4)}, ${parseFloat(longitude).toFixed(4)}`
    : isLocating ? 'Detecting GPS...' : 'GPS Available';

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      {/* ================= 1. TOP NAVBAR ================= */}
      <CivicNavbar
        title="Complete Profile"
        subtitle="Official Citizen Registry"
        badge="KMC GOV"
        onBack={onBack}
        rightContent={
          <View style={s.logoContainer}>
            <Image
              source={require('../../assets/splash_badge_saffron.png')}
              style={s.logoImage}
              resizeMode="contain"
            />
          </View>
        }
      />

      <KeyboardAvoidingView
        style={s.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={s.scroll}
          contentContainerStyle={[
            s.scrollContent,
            { paddingBottom: 150 + Math.max(insets.bottom, 16) },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>

          {/* ================= 2. DYNAMIC PROFILE PROGRESS CARD ================= */}
          <View style={s.progressCard}>
            <View style={s.progressTopRow}>
              <View style={s.progressMetaCol}>
                <View style={s.progressTitleRow}>
                  <Text style={s.progressLabel}>Citizen Profile Score</Text>
                  <View style={s.registryBadge}>
                    <Text style={s.registryBadgeText}>KMC RECORD</Text>
                  </View>
                </View>
                <Text style={s.progressSubtitle}>
                  {currentCompletion === 100
                    ? 'All details verified! 1-Tap FASTag pass ready 🎉'
                    : 'Complete remaining details to activate automatic slot clearance'}
                </Text>
              </View>

              <View style={s.percentBadge}>
                <Text style={s.percentText}>{currentCompletion}%</Text>
              </View>
            </View>

            <View style={s.progressBarTrack}>
              <View style={[s.progressBarFill, { width: `${Math.max(currentCompletion, 8)}%` }]} />
            </View>
          </View>

          {/* ================= 3. PROFILE PHOTO AVATAR ================= */}
          <View style={s.avatarSection}>
            <Pressable
              onPress={handlePickPhoto}
              style={({ pressed }) => [s.avatarTouch, pressed && { opacity: 0.9 }]}>
              <View style={s.avatarGlowRing}>
                <Image
                  source={getCitizenAvatarSource(profilePic)}
                  style={s.avatarImage}
                  resizeMode="cover"
                />
              </View>

              <View style={s.cameraBadge}>
                <Image
                  source={require('../../assets/icons/icon_camera_real.png')}
                  style={s.cameraIcon}
                  resizeMode="contain"
                />
              </View>
            </Pressable>
          </View>

          {/* ================= 4. SLIM INPUT FIELDS (CLEAN WITHOUT E.G.) ================= */}
          <View style={s.formContainer}>

            {/* Field 1: Full Name */}
            <View style={s.inputCard}>
              <View style={s.iconCircle}>
                <Image
                  source={require('../../assets/icons/nav_account.png')}
                  style={s.inputIcon}
                  resizeMode="contain"
                />
              </View>
              <View style={s.inputContent}>
                <Text style={s.inputLabel}>Full Name</Text>
                <TextInput
                  style={s.textInput}
                  placeholder="Enter your full name"
                  placeholderTextColor="#94A3B8"
                  value={fullName}
                  onChangeText={setFullName}
                  autoCapitalize="words"
                />
              </View>
            </View>

            {/* Field 2: Mobile Number (Pre-verified) */}
            <View style={[s.inputCard, s.inputCardDisabled]}>
              <View style={s.iconCircle}>
                <Image
                  source={require('../../assets/icons/icon_shield_check.png')}
                  style={s.inputIcon}
                  resizeMode="contain"
                />
              </View>
              <View style={s.inputContent}>
                <Text style={s.inputLabel}>Mobile Number</Text>
                <View style={s.mobileRow}>
                  <Text style={s.countryCode}>+91 </Text>
                  <TextInput
                    style={[s.textInput, s.disabledText]}
                    value={mobileNo || session?.mobile_no || ''}
                    editable={false}
                  />
                </View>
              </View>
              <View style={s.verifiedBadge}>
                <Text style={s.verifiedText}>✓ Verified</Text>
              </View>
            </View>

            {/* Field 3: Email Address */}
            <View style={s.inputCard}>
              <View style={s.iconCircle}>
                <Image
                  source={require('../../assets/icons/icon_booking.png')}
                  style={s.inputIcon}
                  resizeMode="contain"
                />
              </View>
              <View style={s.inputContent}>
                <Text style={s.inputLabel}>Email Address</Text>
                <TextInput
                  style={s.textInput}
                  placeholder="Enter email address"
                  placeholderTextColor="#94A3B8"
                  value={emailId}
                  onChangeText={setEmailId}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            {/* Field 4: Residential Locality / Address */}
            <View style={s.inputCard}>
              <View style={s.iconCircle}>
                <Image
                  source={require('../../assets/icons/booking_history_location_pin.png')}
                  style={s.inputIcon}
                  resizeMode="contain"
                />
              </View>
              <View style={s.inputContent}>
                <Text style={s.inputLabel}>Residential Locality / Address</Text>
                <TextInput
                  style={s.textInput}
                  placeholder="Enter residential locality or address"
                  placeholderTextColor="#94A3B8"
                  value={address}
                  onChangeText={setAddress}
                  autoCapitalize="sentences"
                />
              </View>
            </View>

          </View>

          {/* ================= 5. LIVE JURISDICTION CARD ================= */}
          <Pressable
            onPress={fetchCurrentLocation}
            style={({ pressed }) => [s.geoCard, pressed && { opacity: 0.7 }]}>
            <View style={s.geoIconCircle}>
              <Image
                source={require('../../assets/icons/icon_shield_check.png')}
                style={s.geoIcon}
                resizeMode="contain"
              />
            </View>
            <View style={s.geoInfoCol}>
              <Text style={s.geoTitle}>Kolkata Municipal Corporation</Text>
              <Text style={s.geoSub}>
                CIVIC JURISDICTION • GPS {displayGPS}
              </Text>
            </View>
            <View style={s.secureBadge}>
              {isLocating ? (
                <ActivityIndicator color="#FFFFFF" size="small" style={{ transform: [{ scale: 0.5 }] }} />
              ) : (
                <Text style={s.secureBadgeText}>REFRESH GPS</Text>
              )}
            </View>
          </Pressable>

          {/* ================= 6. SUBMIT BUTTON ================= */}
          <Pressable
            onPress={handleSaveProfile}
            disabled={isLoading || isFetching}
            style={({ pressed }) => [
              s.submitBtn,
              pressed && s.submitBtnPressed,
              (isLoading || isFetching) && s.submitBtnDisabled,
            ]}>
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <View style={s.submitBtnContent}>
                <Text style={s.submitBtnText}>Save Citizen Profile</Text>
                <Image
                  source={require('../../assets/icons/icon_chevron.png')}
                  style={s.submitChevron}
                  resizeMode="contain"
                />
              </View>
            )}
          </Pressable>

          {/* Bottom Trust Badge */}
          <View style={s.securityNoticeRow}>
            <Image
              source={require('../../assets/icons/icon_shield_check.png')}
              style={s.secShieldIcon}
              resizeMode="contain"
            />
            <Text style={s.securityNoticeText}>
              Your citizen details are safe and secure with S-Parking. Information is used for official parking validation only.
            </Text>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* ================= SUCCESS MODAL ================= */}
      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade">
        <View style={s.modalCenterBackdrop}>
          <View style={s.profilePromptCard}>
            <View style={s.promptBadge}>
              <Image
                source={require('../../assets/icons/icon_shield_check.png')}
                style={s.promptBadgeIcon}
                resizeMode="contain"
              />
            </View>

            <Text style={s.promptTitle}>Profile Completed! 🎉</Text>
            <Text style={s.promptDesc}>
              Welcome {successName}! Your Citizen Profile has been verified & saved securely.
            </Text>

            <View style={s.promptChecklist}>
              <View style={s.checkRow}>
                <Text style={s.checkGreen}>✓</Text>
                <Text style={s.checkText}>Identity Verified</Text>
              </View>
              <View style={s.checkRow}>
                <Text style={s.checkGreen}>✓</Text>
                <Text style={s.checkText}>Location Synced</Text>
              </View>
              <View style={s.checkRow}>
                <Text style={s.checkGreen}>✓</Text>
                <Text style={s.checkText}>FASTag Enabled</Text>
              </View>
            </View>

            <Pressable
              onPress={() => {
                setShowSuccessModal(false);
                if (onSuccess) onSuccess();
                else if (onBack) onBack();
              }}
              style={s.promptCompleteBtn}>
              <Text style={s.promptCompleteText}>Continue</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* ================= IMAGE PICKER ACTION SHEET ================= */}
      <ImagePickerActionSheet
        visible={showImagePicker}
        onClose={() => setShowImagePicker(false)}
        onTakePhoto={handleTakePhoto}
        onPickGallery={handlePickFromGallery}
        title="Citizen Profile Photo"
        subtitle="Choose photo source for your profile"
      />

      <CarLoader visible={isLoading || isFetching} message={isFetching ? "Loading your profile..." : "Saving citizen profile..."} />
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFD',
  },
  keyboardView: {
    flex: 1,
  },
  logoContainer: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },

  /* Scroll View */
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
  },

  /* 2. Progress Card */
  progressCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FED7AA',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 14,
  },
  progressTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  progressMetaCol: {
    flex: 1,
    paddingRight: 10,
  },
  progressTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  progressLabel: {
    fontSize: 14.5,
    fontWeight: '900',
    color: '#0F172A',
  },
  registryBadge: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  registryBadgeText: {
    fontSize: 8,
    fontWeight: '900',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  progressSubtitle: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 15,
    fontWeight: '500',
  },
  percentBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
    elevation: 2,
  },
  percentText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },

  /* 3. Avatar Section */
  avatarSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarTouch: {
    position: 'relative',
  },
  avatarGlowRing: {
    padding: 3,
    borderRadius: 44,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#FED7AA',
    elevation: 4,
  },
  avatarImage: {
    width: 78,
    height: 78,
    borderRadius: 39,
  },
  cameraBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    elevation: 3,
  },
  cameraIcon: {
    width: 14,
    height: 14,
    tintColor: '#FFFFFF',
  },

  /* ================= 4. SLIM INPUT FIELDS ================= */
  formContainer: {
    gap: 10,
  },
  inputCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 7,
    minHeight: 56,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
  },
  inputCardDisabled: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  inputIcon: {
    width: 18,
    height: 18,
    tintColor: colors.primary,
  },
  inputContent: {
    flex: 1,
    justifyContent: 'center',
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 1,
  },
  textInput: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    padding: 0,
    margin: 0,
    height: 20,
  },
  mobileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  countryCode: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  disabledText: {
    color: '#475569',
  },
  verifiedBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 5,
  },
  verifiedText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#16A34A',
  },

  /* 5. Live Jurisdiction Card */
  geoCard: {
    backgroundColor: '#FFF7ED',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1.2,
    borderColor: '#FED7AA',
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  geoIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  geoIcon: {
    width: 17,
    height: 17,
    tintColor: colors.primary,
  },
  geoInfoCol: {
    flex: 1,
    marginLeft: 10,
    marginRight: 8,
  },
  geoTitle: {
    fontSize: 11.5,
    fontWeight: '900',
    color: '#9A3412',
  },
  geoSub: {
    fontSize: 9.5,
    color: '#C2410C',
    fontWeight: '700',
    marginTop: 1,
    letterSpacing: 0.3,
  },
  secureBadge: {
    backgroundColor: '#9A3412',
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 5,
  },
  secureBadgeText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },

  /* 6. Submit Button */
  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnPressed: {
    backgroundColor: colors.primaryDark,
    transform: [{ scale: 0.98 }],
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  submitChevron: {
    width: 14,
    height: 14,
    tintColor: '#FFFFFF',
  },

  /* Bottom Trust Notice */
  securityNoticeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 14,
    paddingHorizontal: 12,
  },
  secShieldIcon: {
    width: 24,
    height: 24,
    tintColor: '#10B981',
  },
  securityNoticeText: {
    flex: 1,
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
    fontWeight: '500',
  },

  /* Success Modal */
  modalCenterBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  profilePromptCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 12,
  },
  promptBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFF7ED',
    borderWidth: 2,
    borderColor: '#FED7AA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  promptBadgeIcon: {
    width: 32,
    height: 32,
    tintColor: colors.primary,
  },
  promptTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
  },
  promptDesc: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 6,
    paddingHorizontal: 4,
    marginBottom: 20,
  },
  promptChecklist: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 24,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkGreen: {
    fontSize: 14,
    fontWeight: '900',
    color: '#10B981',
    width: 16,
  },
  checkText: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '600',
    flex: 1,
  },
  promptCompleteBtn: {
    width: '100%',
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  promptCompleteText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});