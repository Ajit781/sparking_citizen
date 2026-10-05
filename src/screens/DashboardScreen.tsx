import React, {useEffect, useState} from 'react';
import {
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {colors} from '../theme/colors';
import {ScreenName} from '../types/navigation';
import {authService} from '../services/authService';
import {UserSession} from '../services/storageService';
import {citizenService, CitizenProfile, calculateProfileCompletion} from '../services/citizenService';

interface DashboardScreenProps {
  go: (s: ScreenName) => void;
}

export default function DashboardScreen({go}: DashboardScreenProps) {
  const insets = useSafeAreaInsets();
  const [userSession, setUserSession] = useState<UserSession | null>(null);
  const [citizenProfile, setCitizenProfile] = useState<CitizenProfile | null>(null);
  const [profileCompletionPercent, setProfileCompletionPercent] = useState<number>(0);
  const [showProfilePromptModal, setShowProfilePromptModal] = useState<boolean>(false);

  useEffect(() => {
    authService.initToken().catch(err => {
      console.warn('[DashboardScreen] Token init notice:', err?.message || err);
    });

    authService.getStoredSession().then(async session => {
      if (session) {
        setUserSession(session);
        try {
          const profile = await citizenService.getCitizenProfile(session.login_user_id);
          if (profile) {
            setCitizenProfile(profile);
            const percent = calculateProfileCompletion(profile);
            setProfileCompletionPercent(percent);
            if (!profile.profile_complete || percent < 100) {
              if (!citizenService.hasShownProfilePrompt) {
                setTimeout(() => {
                  setShowProfilePromptModal(true);
                  citizenService.hasShownProfilePrompt = true;
                }, 700);
              }
            }
          }
        } catch (err) {
          console.log('[DashboardScreen] Initial profile check notice:', err);
          setProfileCompletionPercent(25);
          if (!citizenService.hasShownProfilePrompt) {
            setTimeout(() => {
              setShowProfilePromptModal(true);
              citizenService.hasShownProfilePrompt = true;
            }, 700);
          }
        }
      }
    });
  }, []);

  return (
    <View style={s.container}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={[
          s.scrollContent,
          {paddingBottom: 76 + Math.max(insets.bottom, 16)},
        ]}
        showsVerticalScrollIndicator={false}>
        {/* ================= 1. SAFFRON TOP HEADER ================= */}
        <View style={s.headerContainer}>
          <Image
            source={require('../../assets/kolkata_skyline_saffron_hd.jpg')}
            style={s.headerBackdrop}
            resizeMode="cover"
          />
          <View style={s.headerOverlay} />

          <View style={s.topBar}>
            <View style={s.brandGroup}>
              <View style={s.logoCircle}>
                <Image
                  source={require('../../assets/SmartParkingLogo.png')}
                  style={s.logoImage}
                  resizeMode="contain"
                />
              </View>
              <View>
                <Text style={s.brandTitle}>S-Parking Dashboard</Text>
                <Text style={s.brandSubtitle}>Real-time Activity & Wallet</Text>
              </View>
            </View>

            <View style={s.badgeWrap}>
              <Text style={s.badgeLiveText}>● LIVE</Text>
            </View>
          </View>

          {/* Wallet & Quick Credits Card */}
          <View style={s.walletCard}>
            <View>
              <Text style={s.walletSub}>Citizen Parking Wallet</Text>
              <Text style={s.walletAmount}>₹350.00</Text>
            </View>
            <Pressable
              onPress={() => Alert.alert('Add Money', 'Online recharge portal will open.')}
              style={s.addMoneyBtn}>
              <Text style={s.addMoneyText}>+ Add Money</Text>
            </Pressable>
          </View>
        </View>

        {/* ================= 2. DASHBOARD BODY ================= */}
        <View style={s.sheet}>
          {/* Active Parking Session Alert Card */}
          <View style={s.activeParkingCard}>
            <View style={s.activeTopRow}>
              <View style={s.activeTag}>
                <Text style={s.activeTagText}>CURRENTLY PARKED</Text>
              </View>
              <Text style={s.activeTimer}>⏱️ 42 mins remaining</Text>
            </View>

            <Text style={s.activeLocation}>South City Mall - Slot B-14</Text>
            <Text style={s.activeVehicle}>Hyundai Creta • WB 02 AK 1234</Text>

            <View style={s.activeActionsRow}>
              <Pressable
                onPress={() => Alert.alert('Extend Time', 'Select duration to extend parking session.')}
                style={s.extendBtn}>
                <Text style={s.extendBtnText}>Extend Time</Text>
              </Pressable>
              <Pressable
                onPress={() => go('parkingDetails')}
                style={s.viewDetailsBtn}>
                <Text style={s.viewDetailsText}>View Slot Details →</Text>
              </Pressable>
            </View>
          </View>

          {/* 4 Stats Highlights Grid */}
          <View style={s.statsGrid}>
            <View style={s.statBox}>
              <Text style={s.statValue}>18</Text>
              <Text style={s.statLabel}>Total Bookings</Text>
            </View>
            <View style={s.statBox}>
              <Text style={s.statValue}>2</Text>
              <Text style={s.statLabel}>My Vehicles</Text>
            </View>
            <View style={s.statBox}>
              <Text style={s.statValue}>₹1,420</Text>
              <Text style={s.statLabel}>Saved on Tariffs</Text>
            </View>
            <View style={s.statBox}>
              <Text style={[s.statValue, {color: colors.success}]}>100%</Text>
              <Text style={s.statLabel}>Grievances Resolved</Text>
            </View>
          </View>

          {/* Recent Parking History */}
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Recent Parking History</Text>
            <Pressable onPress={() => go('parkingDetails')}>
              <Text style={s.seeAllText}>See All</Text>
            </Pressable>
          </View>

          <View style={s.historyCard}>
            <View style={s.historyItem}>
              <View style={s.historyIconWrap}>
                <Image
                  source={require('../../assets/icons/icon_booking.png')}
                  style={s.historyIcon}
                  resizeMode="contain"
                />
              </View>
              <View style={s.historyInfo}>
                <Text style={s.historyTitle}>South City Mall Parking</Text>
                <Text style={s.historyDate}>Yesterday, 04:30 PM • 2 hrs</Text>
              </View>
              <View style={s.historyAmountWrap}>
                <Text style={s.historyAmount}>₹100</Text>
                <Text style={s.historyStatus}>Completed</Text>
              </View>
            </View>

            <View style={s.divider} />

            <View style={s.historyItem}>
              <View style={s.historyIconWrap}>
                <Image
                  source={require('../../assets/icons/icon_booking.png')}
                  style={s.historyIcon}
                  resizeMode="contain"
                />
              </View>
              <View style={s.historyInfo}>
                <Text style={s.historyTitle}>Park Street Municipal Slot</Text>
                <Text style={s.historyDate}>12 Sep 2026, 11:15 AM • 1.5 hrs</Text>
              </View>
              <View style={s.historyAmountWrap}>
                <Text style={s.historyAmount}>₹90</Text>
                <Text style={s.historyStatus}>Completed</Text>
              </View>
            </View>

            <View style={s.divider} />

            <View style={s.historyItem}>
              <View style={s.historyIconWrap}>
                <Image
                  source={require('../../assets/icons/icon_booking.png')}
                  style={s.historyIcon}
                  resizeMode="contain"
                />
              </View>
              <View style={s.historyInfo}>
                <Text style={s.historyTitle}>Salt Lake Sector V Smart Lot</Text>
                <Text style={s.historyDate}>08 Sep 2026, 09:00 AM • 3 hrs</Text>
              </View>
              <View style={s.historyAmountWrap}>
                <Text style={s.historyAmount}>₹120</Text>
                <Text style={s.historyStatus}>Completed</Text>
              </View>
            </View>
          </View>

          {/* Quick Action Navigation Buttons */}
          <View style={s.bottomBtnRow}>
            <Pressable onPress={() => go('home')} style={s.findParkingBtn}>
              <Text style={s.findParkingBtnText}>🗺️ Find New Parking</Text>
            </Pressable>
            <Pressable onPress={() => go('vehicles')} style={s.manageVehiclesBtn}>
              <Text style={s.manageVehiclesBtnText}>🚗 Manage Vehicles</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      {/* ================= PROFILE COMPLETION POPUP MODAL ================= */}
      <Modal
        visible={showProfilePromptModal}
        transparent
        animationType="fade">
        <View style={s.modalBackdrop}>
          <View style={s.profilePromptCard}>
            <View style={s.promptBadge}>
              <Image
                source={require('../../assets/icons/icon_shield_check.png')}
                style={s.promptBadgeIcon}
                resizeMode="contain"
              />
            </View>

            <Text style={s.promptTitle}>Profile {profileCompletionPercent}% Completed</Text>
            <Text style={s.promptDesc}>
              Complete your Citizen Profile to activate automatic deductions, reserved smart slots, and digital receipts across Kolkata.
            </Text>

            {/* Progress Bar */}
            <View style={s.promptProgressWrap}>
              <View style={s.promptProgressBar}>
                <View
                  style={[
                    s.promptProgressFill,
                    {width: `${Math.max(profileCompletionPercent, 25)}%`},
                  ]}
                />
              </View>
              <Text style={s.promptProgressText}>{profileCompletionPercent}% Completed</Text>
            </View>

            {/* Checklist */}
            <View style={s.promptChecklist}>
              <View style={s.checkRow}>
                <Text style={s.checkGreen}>✓</Text>
                <Text style={s.checkText}>Mobile Number Verified (+91)</Text>
              </View>
              <View style={s.checkRow}>
                <Text style={citizenProfile?.full_name ? s.checkGreen : s.checkPending}>
                  {citizenProfile?.full_name ? '✓' : '○'}
                </Text>
                <Text style={s.checkText}>
                  Full Name {citizenProfile?.full_name ? `(${citizenProfile.full_name})` : '(Required)'}
                </Text>
              </View>
              <View style={s.checkRow}>
                <Text style={citizenProfile?.email_id ? s.checkGreen : s.checkPending}>
                  {citizenProfile?.email_id ? '✓' : '○'}
                </Text>
                <Text style={s.checkText}>
                  Email Address {citizenProfile?.email_id ? '(Added)' : '(For digital receipts)'}
                </Text>
              </View>
              <View style={s.checkRow}>
                <Text style={citizenProfile?.address ? s.checkGreen : s.checkPending}>
                  {citizenProfile?.address ? '✓' : '○'}
                </Text>
                <Text style={s.checkText}>
                  Residential Locality {citizenProfile?.address ? '(Added)' : '(For parking permits)'}
                </Text>
              </View>
            </View>

            {/* Action Buttons: Later vs Complete Profile */}
            <View style={s.promptBtnRow}>
              <Pressable
                onPress={() => setShowProfilePromptModal(false)}
                style={s.promptLaterBtn}>
                <Text style={s.promptLaterText}>Later</Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  setShowProfilePromptModal(false);
                  go('setup');
                }}
                style={s.promptCompleteBtn}>
                <Text style={s.promptCompleteText}>Complete Profile</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
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
  headerContainer: {
    backgroundColor: colors.primary,
    paddingTop: 46,
    paddingBottom: 28,
    paddingHorizontal: 18,
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
    opacity: 0.18,
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(230, 81, 0, 0.35)',
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
    gap: 12,
  },
  logoCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  logoImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  brandTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },
  brandSubtitle: {
    color: '#FFE0B2',
    fontSize: 11.5,
    fontWeight: '600',
    marginTop: 1,
  },
  badgeWrap: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  badgeLiveText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  walletCard: {
    zIndex: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  walletSub: {
    color: '#FFE0B2',
    fontSize: 12,
    fontWeight: '600',
  },
  walletAmount: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
    marginTop: 2,
  },
  addMoneyBtn: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  addMoneyText: {
    color: colors.primary,
    fontWeight: '800',
    fontSize: 13,
  },
  sheet: {
    backgroundColor: '#F8FAFD',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    marginTop: -16,
    paddingHorizontal: 14,
    paddingTop: 16,
  },
  activeParkingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.5,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  activeTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  activeTag: {
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  activeTagText: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '800',
  },
  activeTimer: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.danger,
  },
  activeLocation: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  activeVehicle: {
    fontSize: 12.5,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  activeActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  extendBtn: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    borderWidth: 1.2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  extendBtnText: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 13,
  },
  viewDetailsBtn: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewDetailsText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 16,
  },
  statBox: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EEF2F6',
    shadowColor: '#64748B',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.primary,
  },
  statLabel: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 3,
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  seeAllText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '700',
  },
  historyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#EEF2F6',
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  historyIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFF3E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyIcon: {
    width: 20,
    height: 20,
    tintColor: colors.primary,
  },
  historyInfo: {
    flex: 1,
    marginLeft: 12,
  },
  historyTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  historyDate: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  historyAmountWrap: {
    alignItems: 'flex-end',
  },
  historyAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  historyStatus: {
    fontSize: 10,
    color: colors.success,
    fontWeight: '700',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
  },
  bottomBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  findParkingBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  findParkingBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '800',
  },
  manageVehiclesBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  manageVehiclesBtnText: {
    color: colors.primary,
    fontSize: 13.5,
    fontWeight: '800',
  },

  /* Modal Backdrop & Profile Prompt Card */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  profilePromptCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 10},
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  promptBadge: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#FFF7ED',
    borderWidth: 2,
    borderColor: '#FED7AA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  promptBadgeIcon: {
    width: 30,
    height: 30,
    tintColor: colors.primary,
  },
  promptTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
  },
  promptDesc: {
    fontSize: 12.5,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 6,
    paddingHorizontal: 6,
  },
  promptProgressWrap: {
    width: '100%',
    marginTop: 16,
    marginBottom: 14,
  },
  promptProgressBar: {
    height: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    overflow: 'hidden',
  },
  promptProgressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  promptProgressText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
    textAlign: 'right',
    marginTop: 4,
  },
  promptChecklist: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkGreen: {
    fontSize: 13,
    fontWeight: '900',
    color: '#10B981',
    width: 16,
  },
  checkPending: {
    fontSize: 13,
    fontWeight: '900',
    color: '#94A3B8',
    width: 16,
  },
  checkText: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '600',
    flex: 1,
  },
  promptBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 20,
    width: '100%',
  },
  promptLaterBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  promptLaterText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  promptCompleteBtn: {
    flex: 1.6,
    height: 46,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  promptCompleteText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
