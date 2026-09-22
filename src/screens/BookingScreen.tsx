import React, { useState, useEffect } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { citizenService } from '../services/citizenService';
import CivicNavbar from '../components/CivicNavbar';
import CarLoader from '../components/CarLoader';

interface BookingScreenProps {
  onBack?: () => void;
  onBookNew?: () => void;
}

interface BookingItem {
  id: string;
  parkingName: string;
  areaCode: string;
  address: string;
  vehicleNo: string;
  vehicleType: string;
  slotNumber: string;
  timeSlot: string;
  date: string;
  amount: string;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  remainingMinutes?: number;
}



export default function BookingScreen({ onBack, onBookNew }: BookingScreenProps) {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'COMPLETED' | 'CANCELLED'>('ACTIVE');
  const [showQrModal, setShowQrModal] = useState<BookingItem | null>(null);

  const [apiBookings, setApiBookings] = useState<BookingItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    fetchBookings();
  }, [activeTab]);

  const fetchBookings = async () => {
    setIsLoading(true);
    try {
      const apiStatus = activeTab === 'ACTIVE' ? 'UPCOMING' : activeTab;
      const response = await citizenService.getCitizenBookings(undefined, apiStatus);

      if (response && response.bookings) {
        const mapped: BookingItem[] = response.bookings.map((b: any) => ({
          id: b.booking_no,
          parkingName: b.location || b.parking_area_code,
          areaCode: `SPK-${b.parking_area_id}`,
          address: b.address,
          vehicleNo: b.vehicle_number,
          vehicleType: b.vehicle_type_name,
          slotNumber: `Slot ${b.vehicle_type_name} • #${b.slot_no || 'TBA'}`,
          timeSlot: `${formatTime(b.booking_start_time)} - ${formatTime(b.booking_end_time)}`,
          date: formatDate(b.booking_start_time),
          amount: `₹ ${b.total_amount}.00`,
          status: activeTab,
          remainingMinutes: b.remaining_minutes || 0
        }));
        setApiBookings(mapped);
      } else {
        setApiBookings([]);
      }
    } catch (err) {
      console.error('Failed to fetch bookings', err);
      setApiBookings([]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (isoString: string) => {
    if (!isoString) return '';
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (isoString: string) => {
    if (!isoString) return '';
    const d = new Date(isoString);
    return d.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const filteredBookings = apiBookings;

  const handleExtend = (booking: BookingItem) => {
    Alert.alert(
      'Extend Parking Session',
      `Add +1 hour to ${booking.slotNumber} for ₹20.00 via S-Parking Wallet?`,
      [
        { text: 'Dismiss', style: 'cancel' },
        {
          text: 'Confirm (+1 hr)',
          onPress: () =>
            Alert.alert('Session Extended', 'Your parking slot has been extended till 02:00 PM.'),
        },
      ],
    );
  };

  const handleCancelBooking = (bookingId: string) => {
    Alert.alert(
      'Cancel Reservation',
      'Are you sure you want to cancel this slot? 100% refund will be credited back instantly.',
      [
        { text: 'Keep Slot', style: 'cancel' },
        {
          text: 'Cancel Slot',
          style: 'destructive',
          onPress: () => Alert.alert('Booking Cancelled', 'Refund initiated to your original payment method.'),
        },
      ],
    );
  };

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      {/* ================= 1. THEMED ENTERPRISE NAVBAR ================= */}
      <CivicNavbar
        title="Parking Bookings"
        subtitle="Real-time barrier passes & records"
        onBack={onBack}
        rightContent={
          <Pressable
            onPress={onBookNew}
            style={({ pressed }) => [s.newBookingBtn, pressed && s.newBookingBtnPressed]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={s.newBookingIcon}>+</Text>
            <Text style={s.newBookingText}>New</Text>
          </Pressable>
        }
      />

      {/* ================= 2. SEGMENTED FILTER PILLS ================= */}
      {apiBookings.length > 0 && (
        <View style={s.tabsWrapper}>
          <View style={s.tabsPillBox}>
            {(['ACTIVE', 'COMPLETED', 'CANCELLED'] as const).map(tab => {
              const isActive = activeTab === tab;
              const label = tab === 'ACTIVE' ? 'Active' : tab === 'COMPLETED' ? 'Completed' : 'Cancelled';
              const count = apiBookings.filter(b => b.status === tab).length;
              return (
                <Pressable
                  key={tab}
                  onPress={() => setActiveTab(tab)}
                  style={[s.tabPill, isActive && s.tabPillActive]}>
                  <Text style={[s.tabPillText, isActive && s.tabPillTextActive]}>
                    {label}
                  </Text>
                  <View style={[s.tabCountBadge, isActive && s.tabCountBadgeActive]}>
                    <Text style={[s.tabCountText, isActive && s.tabCountTextActive]}>
                      {count}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      {/* ================= 3. MNC PASSES LIST ================= */}
      <ScrollView
        style={s.scroll}
        contentContainerStyle={[
          s.scrollContent,
          { paddingBottom: 50 + Math.max(insets.bottom, 14) },
        ]}
        showsVerticalScrollIndicator={false}>
        {filteredBookings.length === 0 ? (
          <View style={s.emptyState}>
            <View style={s.emptyIconCircle}>
              <Text style={s.emptyEmoji}>🅿️</Text>
            </View>
            <Text style={s.emptyTitle}>No {activeTab.toLowerCase()} reservations</Text>
            <Text style={s.emptySub}>
              You do not have any {activeTab.toLowerCase()} parking sessions at the moment.
            </Text>
            {onBookNew && (
              <Pressable
                onPress={onBookNew}
                style={({ pressed }) => [s.emptyActionBtn, pressed && s.emptyActionBtnPressed]}>
                <Text style={s.emptyActionText}>Reserve a Slot Now</Text>
              </Pressable>
            )}
          </View>
        ) : (
          filteredBookings.map(item => (
            <View key={item.id} style={[s.ticketCard, item.status === 'ACTIVE' && s.ticketCardActive]}>
              {/* Ticket Top Header */}
              <View style={s.ticketTop}>
                <View style={{ flex: 1 }}>
                  <View style={s.metaHeaderRow}>
                    <View style={s.areaBadge}>
                      <Text style={s.areaBadgeText}>{item.areaCode}</Text>
                    </View>

                    {item.status === 'ACTIVE' ? (
                      <View style={s.liveBadge}>
                        <View style={s.pulseDot} />
                        <Text style={s.liveBadgeText}>ACTIVE SESSION</Text>
                      </View>
                    ) : item.status === 'COMPLETED' ? (
                      <View style={s.completedBadge}>
                        <Text style={s.completedBadgeText}>COMPLETED</Text>
                      </View>
                    ) : (
                      <View style={s.cancelledBadge}>
                        <Text style={s.cancelledBadgeText}>CANCELLED</Text>
                      </View>
                    )}
                  </View>

                  <Text style={s.parkingName} numberOfLines={1}>{item.parkingName}</Text>
                  <Text style={s.addressText} numberOfLines={1}>📍 {item.address}</Text>
                </View>

                {item.status === 'ACTIVE' && item.remainingMinutes ? (
                  <View style={s.timerBox}>
                    <Text style={s.timerIcon}>⏱</Text>
                    <Text style={s.timerTime}>{item.remainingMinutes}m</Text>
                    <Text style={s.timerSub}>remaining</Text>
                  </View>
                ) : null}
              </View>

              {/* Perforated Divider */}
              <View style={s.ticketDivider}>
                <View style={s.dashedLine} />
              </View>

              {/* MNC Grid Information */}
              <View style={s.infoGrid}>
                {/* Slot Slot */}
                <View style={s.infoCol}>
                  <Text style={s.infoLabel}>PARKING BAY</Text>
                  <View style={s.slotPill}>
                    <Text style={s.slotText}>{item.slotNumber}</Text>
                  </View>
                </View>

                {/* Plate Badge */}
                <View style={s.infoCol}>
                  <Text style={s.infoLabel}>VEHICLE PLATE</Text>
                  <View style={s.miniPlate}>
                    <Text style={s.miniPlateInd}>IND</Text>
                    <Text style={s.miniPlateNo}>{item.vehicleNo}</Text>
                  </View>
                </View>

                {/* Time Slot */}
                <View style={s.infoCol}>
                  <Text style={s.infoLabel}>TIME WINDOW</Text>
                  <Text style={s.infoVal}>{item.timeSlot}</Text>
                </View>

                {/* Amount Paid */}
                <View style={s.infoCol}>
                  <Text style={s.infoLabel}>TOTAL FARE</Text>
                  <Text style={s.infoValPrice}>{item.amount}</Text>
                </View>
              </View>

              {/* Footer Actions */}
              <View style={s.ticketFooter}>
                {item.status === 'ACTIVE' ? (
                  <View style={s.actionBtnRow}>
                    <Pressable
                      onPress={() => setShowQrModal(item)}
                      style={({ pressed }) => [s.primaryActionBtn, pressed && s.primaryActionBtnPressed]}>
                      <Text style={s.qrIcon}>⚏</Text>
                      <Text style={s.primaryActionText}>Scan QR Pass</Text>
                    </Pressable>

                    <Pressable
                      onPress={() => handleExtend(item)}
                      style={({ pressed }) => [s.secondaryActionBtn, pressed && s.secondaryActionBtnPressed]}>
                      <Text style={s.secondaryActionText}>+ Extend</Text>
                    </Pressable>

                    <Pressable
                      onPress={() => handleCancelBooking(item.id)}
                      style={({ pressed }) => [s.dangerActionBtn, pressed && s.dangerActionBtnPressed]}>
                      <Text style={s.dangerActionText}>Cancel</Text>
                    </Pressable>
                  </View>
                ) : item.status === 'COMPLETED' ? (
                  <View style={s.actionBtnRow}>
                    <Pressable
                      onPress={() => Alert.alert('Tax Invoice', `Invoice #${item.id} sent to registered email.`)}
                      style={({ pressed }) => [s.secondaryActionBtn, pressed && s.secondaryActionBtnPressed]}>
                      <Text style={s.secondaryActionText}>🧾 Download Tax Invoice</Text>
                    </Pressable>

                    <Pressable
                      onPress={() => Alert.alert('Rate Experience', 'Thank you! 5 Star rating submitted.')}
                      style={({ pressed }) => [s.ratingBtn, pressed && s.ratingBtnPressed]}>
                      <Text style={s.ratingBtnText}>★ Rate Slot</Text>
                    </Pressable>
                  </View>
                ) : (
                  <View style={s.refundRow}>
                    <Text style={s.refundIcon}>↺</Text>
                    <Text style={s.refundText}>100% Refund credited to S-Parking Wallet.</Text>
                  </View>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* ================= 4. APPLE WALLET STYLE DIGITAL PASS MODAL ================= */}
      <Modal visible={!!showQrModal} transparent animationType="fade">
        <View style={s.modalBackdrop}>
          <View style={s.passContainer}>
            {/* Pass Header */}
            <View style={s.passHeader}>
              <View>
                <Text style={s.passKolkata}>SMART PARKING PASS</Text>
                <Text style={s.passLocationName}>{showQrModal?.parkingName}</Text>
              </View>
              <Pressable
                onPress={() => setShowQrModal(null)}
                style={s.passCloseBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Text style={s.passCloseText}>✕</Text>
              </Pressable>
            </View>

            {/* QR Scanner Display */}
            <View style={s.qrWrapper}>
              <View style={s.qrFrame}>
                <Text style={s.qrMatrix}>
                  █▀▀▀▀▀█ ▄█▄▄ █▀▀▀▀▀█{'\n'}
                  █ ███ █ ▄▀▄  █ ███ █{'\n'}
                  █ ▀▀▀ █ █ ▀█ █ ▀▀▀ █{'\n'}
                  ▀▀▀▀▀▀▀ █ █▀ ▀▀▀▀▀▀▀{'\n'}
                  ▀▄▀▀▄ ▄▄█▀▀▄▀ ▀█▄▀▄█{'\n'}
                  █▀▀▀▀▀█ ▀█▄▀ █ █ ▀▄▀{'\n'}
                  █ ███ █ ▄ ▄▀ ▀██ ▄▀█{'\n'}
                  █ ▀▀▀ █ █▄█  █▀█ ▄▄█{'\n'}
                  ▀▀▀▀▀▀▀ ▀   ▀▀  ▀▀ ▀
                </Text>
              </View>
              <Text style={s.passIdText}>{showQrModal?.id}</Text>
              <Text style={s.passHintText}>Hold near boom-barrier scanner</Text>
            </View>

            {/* Pass Details Breakdown */}
            <View style={s.passGrid}>
              <View style={s.passGridCol}>
                <Text style={s.passGridLabel}>ASSIGNED BAY</Text>
                <Text style={s.passGridValHighlight}>{showQrModal?.slotNumber}</Text>
              </View>
              <View style={s.passGridCol}>
                <Text style={s.passGridLabel}>VEHICLE NO</Text>
                <Text style={s.passGridVal}>{showQrModal?.vehicleNo}</Text>
              </View>
              <View style={s.passGridCol}>
                <Text style={s.passGridLabel}>VALID TIME</Text>
                <Text style={s.passGridVal}>01:00 PM</Text>
              </View>
            </View>

            <Pressable
              onPress={() => setShowQrModal(null)}
              style={({ pressed }) => [s.passDoneBtn, pressed && s.passDoneBtnPressed]}>
              <Text style={s.passDoneText}>Done & Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <CarLoader visible={isLoading} message="Fetching bookings..." />
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  newBookingBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  newBookingBtnPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
  },
  newBookingIcon: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: -1,
  },
  newBookingText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },

  /* Segmented Pills */
  tabsWrapper: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F6',
  },
  tabsPillBox: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  tabPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 9,
    gap: 6,
  },
  tabPillActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  tabPillText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#64748B',
  },
  tabPillTextActive: {
    color: '#0F172A',
    fontWeight: '800',
  },
  tabCountBadge: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 10,
  },
  tabCountBadgeActive: {
    backgroundColor: colors.primary,
  },
  tabCountText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  tabCountTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },

  /* Scroll */
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },

  /* MNC Ticket Style Card */
  ticketCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  ticketCardActive: {
    borderColor: '#FED7AA',
    borderWidth: 1.5,
  },
  ticketTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  metaHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  areaBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  areaBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.5,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 5,
    borderWidth: 0.5,
    borderColor: '#A7F3D0',
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  liveBadgeText: {
    fontSize: 9.5,
    fontWeight: '900',
    color: '#059669',
    letterSpacing: 0.4,
  },
  completedBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  completedBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.4,
  },
  cancelledBadge: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  cancelledBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#EF4444',
    letterSpacing: 0.4,
  },
  parkingName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 20,
  },
  addressText: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  timerBox: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    minWidth: 70,
  },
  timerIcon: {
    fontSize: 14,
    marginBottom: 1,
  },
  timerTime: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.primary,
  },
  timerSub: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.primaryDark,
    textTransform: 'uppercase',
  },

  /* Dashed Divider */
  ticketDivider: {
    marginVertical: 14,
  },
  dashedLine: {
    borderWidth: 0.75,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
  },

  /* Details Grid */
  infoGrid: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 12,
  },
  infoCol: {
    width: '50%',
  },
  infoLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  slotPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: '#BFDBFE',
  },
  slotText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: colors.primary,
  },
  miniPlate: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  miniPlateInd: {
    fontSize: 7.5,
    fontWeight: '900',
    color: '#0284C7',
    marginRight: 4,
  },
  miniPlateNo: {
    fontSize: 12,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 0.4,
  },
  infoVal: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#334155',
    marginTop: 2,
  },
  infoValPrice: {
    fontSize: 14,
    fontWeight: '900',
    color: '#16A34A',
    marginTop: 1,
  },

  /* Actions */
  ticketFooter: {
    marginTop: 14,
  },
  actionBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  primaryActionBtn: {
    flex: 1.3,
    height: 42,
    backgroundColor: colors.primary,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryActionBtnPressed: {
    backgroundColor: colors.primaryDark,
  },
  qrIcon: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '900',
  },
  primaryActionText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  secondaryActionBtn: {
    flex: 1,
    height: 42,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1.2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryActionBtnPressed: {
    backgroundColor: '#F1F5F9',
  },
  secondaryActionText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#334155',
  },
  dangerActionBtn: {
    height: 42,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerActionBtnPressed: {
    backgroundColor: '#FEE2E2',
  },
  dangerActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#EF4444',
  },
  ratingBtn: {
    flex: 0.8,
    height: 42,
    backgroundColor: '#FFF7ED',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FED7AA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingBtnPressed: {
    backgroundColor: '#FFEDD5',
  },
  ratingBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  refundRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 10,
  },
  refundIcon: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '800',
  },
  refundText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },

  /* Empty State */
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  emptyEmoji: {
    fontSize: 34,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  emptySub: {
    fontSize: 12.5,
    color: '#64748B',
    marginTop: 6,
    textAlign: 'center',
    maxWidth: '80%',
    lineHeight: 18,
  },
  emptyActionBtn: {
    marginTop: 20,
    backgroundColor: colors.primary,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 14,
  },
  emptyActionBtnPressed: {
    backgroundColor: colors.primaryDark,
  },
  emptyActionText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13.5,
  },

  /* Apple Wallet Modal */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  passContainer: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
  },
  passHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 14,
  },
  passKolkata: {
    fontSize: 10,
    fontWeight: '900',
    color: colors.primary,
    letterSpacing: 1,
  },
  passLocationName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
    maxWidth: 240,
  },
  passCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  passCloseText: {
    fontSize: 15,
    color: '#64748B',
    fontWeight: '700',
  },
  qrWrapper: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  qrFrame: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  qrMatrix: {
    fontFamily: 'monospace',
    fontSize: 10,
    lineHeight: 12,
    color: '#0F172A',
    letterSpacing: 2,
    textAlign: 'center',
  },
  passIdText: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 2,
    color: '#0F172A',
    marginTop: 12,
  },
  passHintText: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 3,
    fontWeight: '500',
  },
  passGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    marginTop: 6,
  },
  passGridCol: {
    alignItems: 'center',
  },
  passGridLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  passGridVal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 3,
  },
  passGridValHighlight: {
    fontSize: 13,
    fontWeight: '900',
    color: colors.primary,
    marginTop: 3,
  },
  passDoneBtn: {
    marginTop: 20,
    backgroundColor: colors.primary,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  passDoneBtnPressed: {
    backgroundColor: colors.primaryDark,
  },
  passDoneText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
});