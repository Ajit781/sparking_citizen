import React, { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { authService } from '../services/authService';
import { UserSession } from '../services/storageService';
import { citizenService, CitizenProfile } from '../services/citizenService';
import { getCitizenAvatarSource, DEFAULT_CITIZEN_AVATAR_BASE64 } from '../constants/defaultAvatar';
import pkg from '../../package.json';

interface ProfileScreenProps {
  onVehicles: () => void;
  onGrievance: () => void;
  onMyGrievances: () => void;
  onLogout: () => void;
  onBooking?: () => void;
  onSetupProfile?: () => void;
}

export default function ProfileScreen({
  onVehicles,
  onGrievance,
  onMyGrievances,
  onLogout,
  onBooking,
  onSetupProfile,
}: ProfileScreenProps) {
  const insets = useSafeAreaInsets();
  const [userSession, setUserSession] = useState<UserSession | null>(null);
  const [citizenProfile, setCitizenProfile] = useState<CitizenProfile | null>(null);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [userAddress, setUserAddress] = useState('');

  // Modals state
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState('');

  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState<{
    visible: boolean;
    title: string;
    content: string;
  }>({ visible: false, title: '', content: '' });

  useEffect(() => {
    authService.getStoredSession().then(async session => {
      if (session) {
        setUserSession(session);
        if (session.user_name) setUserName(session.user_name);
        if (session.mobile_no) setUserPhone(session.mobile_no);

        try {
          const profile = await citizenService.getCitizenProfile(session.login_user_id);
          if (profile) {
            setCitizenProfile(profile);
            if (profile.full_name) setUserName(profile.full_name);
            if (profile.email_id) setUserEmail(profile.email_id);
            if (profile.mobile_no) setUserPhone(profile.mobile_no);
            if (profile.address) setUserAddress(profile.address);

            // If profile is not complete or empty full_name, redirect to setup
            const isRegistered =
              profile.profile_complete === true ||
              (Boolean(profile.full_name) && profile.full_name.trim().length > 0);

            if (!isRegistered && onSetupProfile) {
              console.log('👤 Profile incomplete -> Opening SetupProfileScreen');
              onSetupProfile();
            }
          } else if (onSetupProfile) {
            onSetupProfile();
          }
        } catch (e) {
          console.log('[ProfileScreen] Profile fetch notice:', e);
          if (onSetupProfile) {
            onSetupProfile();
          }
        }
      }
    });
  }, [onSetupProfile]);

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = async () => {
    setShowLogoutModal(false);
    await authService.logout();
    onLogout();
  };

  const handleRateUs = () => {
    Alert.alert(
      'Rate S-Parking',
      'Love the smart parking experience? Support smart parking services by giving us 5 stars!',
      [
        { text: 'Later', style: 'cancel' },
        {
          text: 'Rate 5 Stars ⭐',
          onPress: () => Alert.alert('Thank You!', 'Thank you for your valuable support!'),
        },
      ],
    );
  };

  const notificationsList = [
    {
      id: '1',
      title: 'Slot Reserved Successfully',
      desc: 'Slot B-14 at South City Mall reserved for WB02AK1234.',
      time: '10 mins ago',
      unread: true,
    },
    {
      id: '2',
      title: 'Vehicle Added',
      desc: 'Hyundai Creta (WB 02 AK 1234) added to your profile.',
      time: '2 hours ago',
      unread: true,
    },
    {
      id: '3',
      title: 'Parking Session Expiring',
      desc: 'Your parking session expires in 15 minutes. Extend now to avoid penalty.',
      time: 'Yesterday',
      unread: true,
    },
  ];

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      <ScrollView
        style={s.scroll}
        contentContainerStyle={[
          s.scrollContent,
          { paddingBottom: 85 + Math.max(insets.bottom, 16) },
        ]}
        showsVerticalScrollIndicator={false}>

        {/* ================= 1. BRAND HERO HEADER ================= */}
        <View style={[s.headerContainer, { paddingTop: Math.max(insets.top + 6, 42) }]}>
          <Image
            source={require('../../assets/SmartParkingLogo.png')}
            style={s.headerBackdrop}
            resizeMode="cover"
          />
          <View style={s.headerOverlay} />

          {/* Top Brand Bar */}
          <View style={s.topBar}>
            <View style={s.brandGroup}>
              <View style={s.logoCircle}>
                <Image
                  source={require('../../assets/SmartParkingLogo.png')}
                  style={s.logoImage}
                  resizeMode="contain"
                />
              </View>
              <View style={s.brandTextGroup}>
                <View style={s.brandTitleRow}>
                  <Text style={s.brandTitle}>S-Parking</Text>
                </View>

              </View>
            </View>

          </View>

          {/* ================= 2. 🔥 NEW LUXURY CITIZEN MOBILITY CARD ================= */}
          <View style={s.luxuryProfileCard}>

            {/* Ribbon Header: KMC Tag + Edit Button */}
            <View style={s.cardTopRibbon}>
              <View />

              <Pressable
                onPress={() => {
                  if (onSetupProfile) {
                    onSetupProfile();
                  }
                }}
                style={({ pressed }) => [
                  s.editPassBtn,
                  pressed && s.editPassBtnPressed,
                ]}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={s.editPassBtnText}>Edit Profile</Text>
                <Image
                  source={require('../../assets/icons/icon_chevron.png')}
                  style={s.editPassChevron}
                  resizeMode="contain"
                />
              </Pressable>
            </View>

            {/* User Main Details Row */}
            <View style={s.profileMainRow}>

              {/* Avatar with Ring & Verified Badge */}
              <View style={s.avatarWrapper}>
                <View style={s.avatarOuterRing}>
                  <Image
                    source={getCitizenAvatarSource(citizenProfile?.profile_pic, citizenProfile?.modified_on)}
                    style={[
                      s.avatarImg,
                      (!citizenProfile?.profile_pic || citizenProfile.profile_pic.trim() === '' || citizenProfile.profile_pic === DEFAULT_CITIZEN_AVATAR_BASE64) && { tintColor: colors.primary }
                    ]}
                    resizeMode="cover"
                  />
                </View>
                <View style={s.verifiedCheckDot}>
                  <Text style={s.verifiedCheckChar}>✓</Text>
                </View>
              </View>

              {/* User Details Column */}
              <View style={s.profileMetaCol}>
                <Text style={s.citizenName} numberOfLines={1}>
                  {userName || (userSession?.mobile_no ? `Citizen (${userSession.mobile_no})` : 'Citizen')}
                </Text>

                {/* Phone Chip */}
                <View style={s.metaChip}>
                  <Text style={s.metaChipLabel}>Phone:</Text>
                  <Text style={s.metaChipValue}>
                    {userPhone ? `+91 ${userPhone}` : 'Not linked'}
                  </Text>
                </View>

                {/* Email Chip */}
                {userEmail ? (
                  <View style={s.metaChip}>
                    <Text style={s.metaChipLabel}>Email:</Text>
                    <Text style={s.metaChipValue} numberOfLines={1}>
                      {userEmail}
                    </Text>
                  </View>
                ) : null}

                {/* Address Row */}
                <View style={s.metaAddressRow}>
                  <Image
                    source={require('../../assets/icons/booking_history_location_pin.png')}
                    style={s.pinIconSmall}
                    resizeMode="contain"
                  />
                  <Text style={s.metaAddressText} numberOfLines={1}>
                    {userAddress || 'Select Your Location'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Stats Bar Hidden */}
          </View>
        </View>

        {/* ================= 3. MAIN CONTENT SHEET ================= */}
        <View style={s.sheet}>

          <Text style={s.sectionHeading}>Quick Services</Text>

          {/* 6 Quick Action Grid Cards */}
          <View style={s.gridContainer}>
            {/* Row 1 */}
            <View style={s.gridRow}>
              {/* Card 1: My Vehicles */}
              <Pressable
                onPress={onVehicles}
                style={({ pressed }) => [s.actionCard, pressed && s.cardPressed]}>
                <View style={s.actionIconWrap}>
                  <Image
                    source={require('../../assets/icons/icon_car.png')}
                    style={s.actionIcon}
                    resizeMode="contain"
                  />
                </View>
                <View style={s.actionTextWrap}>
                  <Text style={s.actionTitle}>My Vehicles</Text>
                  <Text style={s.actionSubtitle}>RC status</Text>
                </View>
                <Image
                  source={require('../../assets/icons/icon_chevron.png')}
                  style={s.chevronIcon}
                  resizeMode="contain"
                />
              </Pressable>

              {/* Card 2: Booking Status */}
              <Pressable
                onPress={onBooking ? onBooking : onVehicles}
                style={({ pressed }) => [s.actionCard, pressed && s.cardPressed]}>
                <View style={[s.actionIconWrap, { backgroundColor: '#EFF6FF' }]}>
                  <Image
                    source={require('../../assets/icons/icon_booking.png')}
                    style={[s.actionIcon, { tintColor: '#2563EB' }]}
                    resizeMode="contain"
                  />
                </View>
                <View style={s.actionTextWrap}>
                  <Text style={s.actionTitle}>Bookings</Text>
                  <Text style={s.actionSubtitle}>Live passes & records</Text>
                </View>
                <Image
                  source={require('../../assets/icons/icon_chevron.png')}
                  style={s.chevronIcon}
                  resizeMode="contain"
                />
              </Pressable>
            </View>

            {/* Row 2 */}
            <View style={s.gridRow}>
              {/* Card 3: Feedback */}
              <Pressable
                onPress={() => setShowFeedbackModal(true)}
                style={({ pressed }) => [s.actionCard, pressed && s.cardPressed]}>
                <View style={[s.actionIconWrap, { backgroundColor: '#FAF5FF' }]}>
                  <Image
                    source={require('../../assets/icons/icon_feedback.png')}
                    style={[s.actionIcon, { tintColor: '#9333EA' }]}
                    resizeMode="contain"
                  />
                </View>
                <View style={s.actionTextWrap}>
                  <Text style={s.actionTitle}>Feedback</Text>
                  <Text style={s.actionSubtitle}>Share suggestion</Text>
                </View>
                <Image
                  source={require('../../assets/icons/icon_chevron.png')}
                  style={s.chevronIcon}
                  resizeMode="contain"
                />
              </Pressable>

              {/* Card 4: Notifications (Alerts) */}
              <Pressable
                onPress={() => setShowNotificationsModal(true)}
                style={({ pressed }) => [s.actionCard, pressed && s.cardPressed]}>
                <View style={[s.actionIconWrap, { backgroundColor: '#FFFBEB' }]}>
                  <Image
                    source={require('../../assets/icons/icon_bell.png')}
                    style={[s.actionIcon, { tintColor: '#D97706' }]}
                    resizeMode="contain"
                  />
                </View>
                <View style={s.actionTextWrap}>
                  <Text style={s.actionTitle}>Alerts</Text>
                  <Text style={s.actionSubtitle}>Announcements</Text>
                </View>
                <Image
                  source={require('../../assets/icons/icon_chevron.png')}
                  style={s.chevronIcon}
                  resizeMode="contain"
                />
              </Pressable>
            </View>
          </View>

          {/* ================= 4. SETTINGS & POLICIES ================= */}
          <Text style={[s.sectionHeading, { marginTop: 22 }]}>Account Settings</Text>

          <View style={s.settingsGroupCard}>
            {/* 1. Privacy Policy */}
            <Pressable
              onPress={() => {
                Linking.openURL('http://www.s-parking.com/privacypolicy.html').catch(err => console.error("Couldn't load page", err));
              }}
              style={({ pressed }) => [s.settingsRow, pressed && { opacity: 0.5 }]}>
              <View style={s.settingsIconWrap}>
                <Image
                  source={require('../../assets/icons/icon_shield_check.png')}
                  style={s.settingsIcon}
                  resizeMode="contain"
                />
              </View>
              <Text style={s.settingsLabel}>Privacy Policy</Text>
              <Image
                source={require('../../assets/icons/icon_chevron.png')}
                style={s.settingsChevron}
                resizeMode="contain"
              />
            </Pressable>

            <View style={s.divider} />

            {/* 2. Terms & Conditions */}
            <Pressable
              onPress={() => {
                Linking.openURL('http://www.s-parking.com/termscondition.html').catch(err => console.error("Couldn't load page", err));
              }}
              style={({ pressed }) => [s.settingsRow, pressed && { opacity: 0.5 }]}>
              <View style={s.settingsIconWrap}>
                <Image
                  source={require('../../assets/icons/icon_file_text.png')}
                  style={s.settingsIcon}
                  resizeMode="contain"
                />
              </View>
              <Text style={s.settingsLabel}>Terms & Municipal Tariffs</Text>
              <Image
                source={require('../../assets/icons/icon_chevron.png')}
                style={s.settingsChevron}
                resizeMode="contain"
              />
            </Pressable>

            <View style={s.divider} />

            {/* 3. Help & Support */}
            <Pressable
              onPress={() =>
                setShowInfoModal({
                  visible: true,
                  title: 'Help & Support',
                  content:
                    'Need assistance with your parking slot, payments, or vehicle registrations? Contact our  citizen helpline at 9073936479 or email support@vyomainnovusglobal.com',
                })
              }
              style={({ pressed }) => [s.settingsRow, pressed && { opacity: 0.5 }]}>
              <View style={s.settingsIconWrap}>
                <Image
                  source={require('../../assets/icons/icon_help.png')}
                  style={s.settingsIcon}
                  resizeMode="contain"
                />
              </View>
              <Text style={s.settingsLabel}>Citizen Support</Text>
              <Image
                source={require('../../assets/icons/icon_chevron.png')}
                style={s.settingsChevron}
                resizeMode="contain"
              />
            </Pressable>

            <View style={s.divider} />

            {/* 4. About App */}
            <Pressable
              onPress={() =>
                setShowInfoModal({
                  visible: true,
                  title: 'About S-Parking',
                  content:
                    `S-Parking Citizen Mobile Application v${pkg.version}\n\nPark Smart. Move Better.`,
                })
              }
              style={({ pressed }) => [s.settingsRow, pressed && { opacity: 0.5 }]}>
              <View style={s.settingsIconWrap}>
                <Image
                  source={require('../../assets/icons/icon_info.png')}
                  style={s.settingsIcon}
                  resizeMode="contain"
                />
              </View>
              <Text style={s.settingsLabel}>About v{pkg.version}</Text>
              <Image
                source={require('../../assets/icons/icon_chevron.png')}
                style={s.settingsChevron}
                resizeMode="contain"
              />
            </Pressable>

            <View style={s.divider} />

            {/* 5. Logout */}
            <Pressable onPress={handleLogout} style={({ pressed }) => [s.settingsRow, pressed && { opacity: 0.5 }]}>
              <View style={[s.settingsIconWrap, { backgroundColor: '#FEF2F2' }]}>
                <Image
                  source={require('../../assets/icons/icon_logout.png')}
                  style={[s.settingsIcon, { tintColor: '#DC2626' }]}
                  resizeMode="contain"
                />
              </View>
              <Text style={[s.settingsLabel, s.logoutLabel]}>Sign Out</Text>
              <Image
                source={require('../../assets/icons/icon_chevron.png')}
                style={[s.settingsChevron, { tintColor: '#DC2626' }]}
                resizeMode="contain"
              />
            </Pressable>
          </View>
        </View>
      </ScrollView>

      {/* ================= FEEDBACK MODAL ================= */}
      <Modal visible={showFeedbackModal} transparent animationType="fade">
        <View style={s.modalBackdrop}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Citizen Feedback</Text>
            <Text style={s.modalSubtitle}>Rate your smart parking experience</Text>

            <View style={s.starRatingRow}>
              {[1, 2, 3, 4, 5].map(star => (
                <Pressable
                  key={star}
                  onPress={() => setFeedbackRating(star)}
                  style={s.starTouch}>
                  <Text style={s.starEmoji}>
                    {star <= feedbackRating ? '⭐' : '☆'}
                  </Text>
                </Pressable>
              ))}
            </View>

            <TextInput
              style={s.feedbackInput}
              multiline
              numberOfLines={4}
              placeholder="What did you like or how can we improve?"
              placeholderTextColor="#94A3B8"
              value={feedbackComment}
              onChangeText={setFeedbackComment}
            />

            <View style={s.modalButtonsRow}>
              <Pressable
                onPress={() => setShowFeedbackModal(false)}
                style={s.modalCancelButton}>
                <Text style={s.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setShowFeedbackModal(false);
                  setFeedbackComment('');
                  Alert.alert('Feedback Submitted', 'Thank you for your valuable feedback!');
                }}
                style={s.modalSaveButton}>
                <Text style={s.modalSaveText}>Submit</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ================= NOTIFICATIONS MODAL ================= */}
      <Modal visible={showNotificationsModal} transparent animationType="slide">
        <View style={s.modalBackdrop}>
          <View style={[s.modalCard, { maxHeight: '75%' }]}>
            <View style={s.notifHeaderRow}>
              <Text style={s.modalTitle}>Notifications</Text>
              <Pressable
                onPress={() => setShowNotificationsModal(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Text style={s.notifClose}>✕</Text>
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {notificationsList.map(item => (
                <View key={item.id} style={s.notifItem}>
                  <View style={s.notifDot} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.notifItemTitle}>{item.title}</Text>
                    <Text style={s.notifItemDesc}>{item.desc}</Text>
                    <Text style={s.notifItemTime}>{item.time}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ================= INFO / POLICY MODAL ================= */}
      <Modal visible={showInfoModal.visible} transparent animationType="fade">
        <View style={s.modalBackdrop}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>{showInfoModal.title}</Text>
            <Text style={s.infoModalBody}>{showInfoModal.content}</Text>
            <Pressable
              onPress={() => setShowInfoModal({ visible: false, title: '', content: '' })}
              style={[s.modalSaveButton, { marginTop: 18, width: '100%' }]}>
              <Text style={s.modalSaveText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* ================= LOGOUT CONFIRMATION MODAL ================= */}
      <Modal visible={showLogoutModal} transparent animationType="fade" statusBarTranslucent>
        <View style={s.logoutModalBackdrop}>
          <View style={s.logoutModalCard}>

            {/* Icon */}
            <View style={s.logoutIconCircle}>
              <Image
                source={require('../../assets/icons/icon_logout.png')}
                style={s.logoutIconImg}
                resizeMode="contain"
              />
            </View>

            {/* Title */}
            <Text style={s.logoutModalTitle}>Sign Out?</Text>
            <Text style={s.logoutModalSub}>
              You will be signed out from your S-Parking citizen account. Your data remains safe.
            </Text>

            {/* Divider */}
            <View style={s.logoutDivider} />

            {/* Buttons */}
            <View style={s.logoutBtnRow}>
              <Pressable
                onPress={() => setShowLogoutModal(false)}
                style={s.logoutCancelBtn}>
                <Text style={s.logoutCancelText}>Stay In</Text>
              </Pressable>

              <Pressable
                onPress={confirmLogout}
                style={s.logoutConfirmBtn}>
                <Text style={s.logoutConfirmText}>Sign Out</Text>
              </Pressable>
            </View>

          </View>
        </View>
      </Modal>
    </View>
  );
}

function vehiclesCountFallback(session: any) {
  return session ? '1' : '0';
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFD',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 90,
  },

  /* Brand Top Header */
  headerContainer: {
    backgroundColor: colors.primary,
    paddingBottom: 28,
    paddingHorizontal: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  headerBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    opacity: 0.16,
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(217, 72, 0, 0.28)',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 2,
    marginBottom: 16,
  },
  brandGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 3,
  },
  logoImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  brandTextGroup: {
    justifyContent: 'center',
  },
  brandTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  brandTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  kmcBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  kmcBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  brandSubtitle: {
    color: 'rgba(255, 255, 255, 0.88)',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },
  bellWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  bellWrapperPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
  },
  bellIcon: {
    width: 20,
    height: 20,
    tintColor: '#FFFFFF',
  },
  badge: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: '#EF4444',
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
  },

  /* ================= 🔥 LUXURY CITIZEN PASS CARD ================= */
  luxuryProfileCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.36)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 6,
    zIndex: 2,
  },

  /* Top Ribbon */
  cardTopRibbon: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
  },
  civicPassTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  shieldPassIcon: {
    width: 11,
    height: 11,
    tintColor: '#FFFFFF',
  },
  civicPassText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  editPassBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: 12,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  editPassBtnPressed: {
    transform: [{ scale: 0.95 }],
    opacity: 0.9,
  },
  editPassBtnText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '900',
  },
  editPassChevron: {
    width: 9,
    height: 9,
    tintColor: colors.primary,
  },

  /* Main User Profile Row */
  profileMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatarOuterRing: {
    padding: 3,
    borderRadius: 40,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  avatarImg: {
    width: 66,
    height: 66,
    borderRadius: 33,
  },
  verifiedCheckDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#16A34A',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifiedCheckChar: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
  profileMetaCol: {
    flex: 1,
    marginLeft: 14,
  },
  citizenName: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '900',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 2,
  },
  metaChipLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.75)',
  },
  metaChipValue: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#FFFFFF',
    flexShrink: 1,
  },
  metaAddressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  pinIconSmall: {
    width: 11,
    height: 11,
    tintColor: '#FFFFFF',
  },
  metaAddressText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    flex: 1,
  },

  /* Frosted Glass 3-Pod Stats Bar */
  statsGlanceBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
    paddingVertical: 10,
    paddingHorizontal: 8,
    marginTop: 14,
  },
  statPod: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  podDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  statPodLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.8)',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  statPodValue: {
    fontSize: 14.5,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  activeIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  greenActiveDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#4ADE80',
  },
  activeStatusText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#BBF7D0',
  },
  statSubLink: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 2,
  },
  rewardsSubText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FEF08A',
    marginTop: 2,
  },

  /* Main Sheet */
  sheet: {
    backgroundColor: '#F8FAFD',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -12,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: '800',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
    marginLeft: 2,
  },

  /* 6 Quick Action Grid Cards */
  gridContainer: {
    gap: 10,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardPressed: {
    transform: [{ scale: 0.98 }],
    backgroundColor: '#F8FAFC',
  },
  actionIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIcon: {
    width: 18,
    height: 18,
    tintColor: colors.primary,
  },
  actionTextWrap: {
    flex: 1,
    marginLeft: 8,
    marginRight: 2,
  },
  actionTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  actionSubtitle: {
    fontSize: 9.5,
    color: '#64748B',
    marginTop: 1.5,
  },
  chevronIcon: {
    width: 10,
    height: 10,
    tintColor: '#CBD5E1',
  },

  /* Grouped Settings Card */
  settingsGroupCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
    marginBottom: 16,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  settingsIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsIcon: {
    width: 16,
    height: 16,
    tintColor: '#475569',
  },
  settingsLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    marginLeft: 12,
  },
  logoutLabel: {
    color: '#DC2626',
    fontWeight: '800',
  },
  settingsChevron: {
    width: 12,
    height: 12,
    tintColor: '#CBD5E1',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
  },

  /* Modals */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    marginBottom: 16,
  },
  modalButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  modalCancelButton: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    borderWidth: 1.2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
    color: '#64748B',
    fontWeight: '700',
    fontSize: 13,
  },
  modalSaveButton: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSaveText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },

  /* Star Rating */
  starRatingRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 16,
  },
  starTouch: {
    padding: 4,
  },
  starEmoji: {
    fontSize: 28,
  },
  feedbackInput: {
    height: 90,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    fontSize: 13,
    color: '#0F172A',
    backgroundColor: '#F8FAFD',
    textAlignVertical: 'top',
  },

  /* Notifications */
  notifHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  notifClose: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: '800',
  },
  notifItem: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 10,
  },
  notifDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginTop: 5,
  },
  notifItemTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  notifItemDesc: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 16,
  },
  notifItemTime: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 4,
  },

  /* Info Modal */
  infoModalBody: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 19,
    marginTop: 8,
  },

  /* Logout Confirmation Modal */
  logoutModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  logoutModalCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.22,
    shadowRadius: 24,
    elevation: 14,
  },
  logoutIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#FEF2F2',
    borderWidth: 3,
    borderColor: '#FECACA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  logoutIconImg: {
    width: 30,
    height: 30,
    tintColor: '#EF4444',
  },
  logoutModalTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  logoutModalSub: {
    fontSize: 13.5,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  logoutDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    width: '100%',
    marginVertical: 22,
  },
  logoutBtnRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  logoutCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutCancelText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#475569',
  },
  logoutConfirmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  logoutConfirmText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFFFFF',
  },
});