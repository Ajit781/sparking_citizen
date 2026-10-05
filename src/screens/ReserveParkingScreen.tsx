import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  ScrollView,
  ActivityIndicator,
  Modal,
  Platform,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors } from '../theme/colors';
import { citizenService } from '../services/citizenService';
import CivicNavbar from '../components/CivicNavbar';
import CarLoader from '../components/CarLoader';

interface ReserveParkingScreenProps {
  onBack: () => void;
  onBookSuccess: () => void;
}

export default function ReserveParkingScreen({ onBack, onBookSuccess }: ReserveParkingScreenProps) {
  const insets = useSafeAreaInsets();
  const lot = citizenService.getSelectedParkingDetails();

  const [vehicles, setVehicles] = useState<any[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);
  const [isLoadingVehicles, setIsLoadingVehicles] = useState(true);
  const [isBooking, setIsBooking] = useState(false);
  const [bookingSuccessData, setBookingSuccessData] = useState<any>(null);

  const [alertModal, setAlertModal] = useState<{ type: 'error' | 'info' | 'success'; title: string; message: string } | null>(null);

  // Default to empty dates
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  useEffect(() => {
    citizenService
      .getCitizenVehicles()
      .then(v => {
        setVehicles(v);
        if (v.length > 0) {
          setSelectedVehicleId(v[0].vehicle_id);
        }
      })
      .finally(() => setIsLoadingVehicles(false));
  }, []);

  const showAlert = (type: 'error' | 'info' | 'success', title: string, message: string) => {
    setAlertModal({ type, title, message });
  };

  const formatDisplayDate = (d?: Date) => {
    if (!d) return 'Select Date';
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]}`;
  };

  const formatDisplayTime = (d?: Date) => {
    if (!d) return 'Select Time';
    const h = d.getHours();
    const m = d.getMinutes();
    const ampm = h >= 12 ? 'PM' : 'AM';
    const displayH = h % 12 || 12;
    return `${displayH}:${m.toString().padStart(2, '0')} ${ampm}`;
  };

  const formatAPITime = (d: Date) => {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
  };

  const handleConfirmBooking = async () => {
    if (!selectedVehicleId) {
      showAlert('error', 'No Vehicle Selected', 'Please select a vehicle to proceed with booking.');
      return;
    }
    if (!startDate || !endDate) {
      showAlert('error', 'Missing Schedule', 'Please select both start and end dates and times.');
      return;
    }
    if (endDate <= startDate) {
      showAlert('error', 'Invalid Time Window', 'End time must be after start time.');
      return;
    }

    setIsBooking(true);
    try {
      const result = await citizenService.createCitizenBooking({
        vehicle_id: selectedVehicleId,
        parking_area_id: lot?.parking_area_id || lot?.id || 1,
        booking_start_time: formatAPITime(startDate),
        booking_end_time: formatAPITime(endDate),
        payment_mode_id: null,
      });

      setBookingSuccessData(result);
    } catch (error: any) {
      showAlert('error', 'Booking Failed', error.message || 'Unable to book parking slot. Please try again.');
    } finally {
      setIsBooking(false);
    }
  };

  const handleDoneAndNavigateToBookings = () => {
    setBookingSuccessData(null);
    onBookSuccess();
  };

  const durationHrs = (startDate && endDate)
    ? Math.max(0, Math.round((endDate.getTime() - startDate.getTime()) / 36e5))
    : 0;

  const hourlyRate = parseFloat(String(lot?.rates?.four_wheeler ?? '20')) || 20;
  const estimatedFare = durationHrs > 0 ? durationHrs * hourlyRate : hourlyRate;

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      <CarLoader visible={isBooking} message="Confirming Booking..." />

      {/* ================= 1. ULTRA-PREMIUM CIVIC NAVBAR ================= */}
      <CivicNavbar
        title="Reserve Parking"
        subtitle={lot?.location || lot?.name || 'Smart Slot'}
        onBack={onBack}
        rightContent={
          <View style={s.navRightPill}>
            <View style={s.livePulseMiniDot} />
            <Text style={s.navRightPillText}>Smart</Text>
          </View>
        }
      />

      <ScrollView
        contentContainerStyle={[
          s.scrollContent,
          { paddingBottom: 110 + Math.max(insets.bottom, 16) }
        ]}
        showsVerticalScrollIndicator={false}>

        {/* ================= 2. CONTEXT SUMMARY CARD ================= */}
        <View style={s.slotSummaryCard}>
          <View style={s.slotIconCircle}>
            <Image
              source={require('../../assets/icons/nav_parking.png')}
              style={s.slotIconImg}
              resizeMode="contain"
            />
          </View>

          <View style={s.slotInfoCol}>
            <View style={s.slotTitleRow}>
              <Text style={s.slotNameText}>
                {lot?.location || lot?.name || 'Parking Slot'}
              </Text>
              <View style={s.verifiedTag}>
                <Image
                  source={require('../../assets/icons/icon_shield_check.png')}
                  style={s.shieldMini}
                  resizeMode="contain"
                />
                <Text style={s.verifiedTagText}>VERIFIED</Text>
              </View>
            </View>

            <View style={s.slotAddressRow}>
              <Image
                source={require('../../assets/icons/booking_history_location_pin.png')}
                style={s.pinMini}
                resizeMode="contain"
              />
              <Text style={s.slotAddressText}>
                {lot?.address || 'Kolkata Smart Mobility'}
              </Text>
            </View>
          </View>

          <View style={s.tariffBadge}>
            <Text style={s.tariffRate}>₹{hourlyRate}</Text>
            <Text style={s.tariffUnit}>/hr</Text>
          </View>
        </View>

        {/* ================= 3. VEHICLE SELECTION ================= */}
        <View style={s.sectionHeaderRow}>
          <Text style={s.sectionLabel}>Select Registered Vehicle</Text>
          <Text style={s.sectionCount}>{vehicles.length} saved</Text>
        </View>

        {isLoadingVehicles ? (
          <View style={s.loaderBox}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={s.loadingVehText}>Loading your vehicles...</Text>
          </View>
        ) : vehicles.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.vehicleList}>
            {vehicles.map(v => {
              const isSelected = selectedVehicleId === v.vehicle_id;
              return (
                <Pressable
                  key={v.vehicle_id}
                  style={[s.vehicleCard, isSelected && s.vehicleCardSelected]}
                  onPress={() => setSelectedVehicleId(v.vehicle_id)}>

                  <View style={[s.vehIconBox, isSelected && s.vehIconBoxSelected]}>
                    <Image
                      source={require('../../assets/icons/icon_car.png')}
                      style={[s.vehCardIcon, isSelected && { tintColor: colors.primary }]}
                      resizeMode="contain"
                    />
                  </View>

                  <View style={s.vehInfoCol}>
                    {/* HSRP Indian Plate Look */}
                    <View style={s.hsrpMiniPlate}>
                      <Text style={s.hsrpIndText}>IND</Text>
                      <Text style={s.hsrpPlateNum}>{v.vehicle_number}</Text>
                    </View>
                    <Text style={s.vehModelText} numberOfLines={1}>
                      {v.vehicle_make || v.vehicle_model || 'Vehicle'} • 4W
                    </Text>
                  </View>

                  {/* Radio Check Circle */}
                  <View style={[s.radioOuter, isSelected && s.radioOuterSelected]}>
                    {isSelected && <View style={s.radioInner} />}
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : (
          <View style={s.noVehicleBox}>
            <Text style={s.noVehicleText}>No registered vehicles found. Please add one in Profile.</Text>
          </View>
        )}

        {/* ================= 4. SCHEDULE DATE & TIME ================= */}
        <View style={[s.sectionHeaderRow, { marginTop: 22 }]}>
          <Text style={s.sectionLabel}>Schedule Date & Time</Text>
        </View>

        {/* Entry / Exit Schedule Grid */}
        <View style={s.schedulerCard}>

          {/* Entry (Start) */}
          <View style={s.schedBlock}>
            <View style={s.schedHeader}>
              <View style={[s.dotIndicator, { backgroundColor: '#16A34A' }]} />
              <Text style={s.schedBlockTitle}>ENTRY (START TIME)</Text>
            </View>

            <View style={s.pickersRow}>
              <Pressable
                style={[s.pickerPill, !startDate && s.pickerPillEmpty]}
                onPress={() => setShowStartDatePicker(true)}>
                <Image
                  source={require('../../assets/icons/icon_booking.png')}
                  style={s.pickerIcon}
                  resizeMode="contain"
                />
                <Text style={[s.pickerText, !startDate && s.pickerTextEmpty]}>
                  {formatDisplayDate(startDate)}
                </Text>
              </Pressable>

              <Pressable
                style={[s.pickerPill, s.pickerPillTime, !startDate && s.pickerPillEmpty]}
                onPress={() => setShowStartTimePicker(true)}>
                <Text style={[s.pickerText, !startDate && s.pickerTextEmpty]}>
                  {formatDisplayTime(startDate)}
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Connected Divider Line */}
          <View style={s.schedConnectorRow}>
            <View style={s.connectorLine} />
            <View style={s.arrowBubble}>
              <Text style={s.arrowChar}>↓</Text>
            </View>
            <View style={s.connectorLine} />
          </View>

          {/* Exit (End) */}
          <View style={s.schedBlock}>
            <View style={s.schedHeader}>
              <View style={[s.dotIndicator, { backgroundColor: colors.primary }]} />
              <Text style={s.schedBlockTitle}>EXIT (DEPARTURE TIME)</Text>
            </View>

            <View style={s.pickersRow}>
              <Pressable
                style={[s.pickerPill, !endDate && s.pickerPillEmpty]}
                onPress={() => setShowEndDatePicker(true)}>
                <Image
                  source={require('../../assets/icons/icon_booking.png')}
                  style={s.pickerIcon}
                  resizeMode="contain"
                />
                <Text style={[s.pickerText, !endDate && s.pickerTextEmpty]}>
                  {formatDisplayDate(endDate)}
                </Text>
              </Pressable>

              <Pressable
                style={[s.pickerPill, s.pickerPillTime, !endDate && s.pickerPillEmpty]}
                onPress={() => setShowEndTimePicker(true)}>
                <Text style={[s.pickerText, !endDate && s.pickerTextEmpty]}>
                  {formatDisplayTime(endDate)}
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Live Calculated Summary Pill */}
          {startDate && endDate && (
            <View style={s.schedDurationBanner}>
              <View style={s.durationLeft}>
                <Text style={s.durationLabel}>Total Duration</Text>
                <Text style={s.durationValue}>{durationHrs} Hours</Text>
              </View>
              <View style={s.durationDivider} />
              <View style={s.durationRight}>
                <Text style={s.durationLabel}>Est. Total Fare</Text>
                <Text style={s.fareValue}>₹{estimatedFare}.00</Text>
              </View>
            </View>
          )}
        </View>

        {/* FASTag badge removed as per request */}

      </ScrollView>

      {/* ================= 5. PREMIUM FIXED CHECKOUT FOOTER ================= */}
      <View style={[s.footerContainer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <View style={s.footerFareCol}>
          <Text style={s.footerFareLabel}>TOTAL ESTIMATED</Text>
          <View style={s.footerFareRow}>
            <Text style={s.footerFareAmount}>₹{estimatedFare}</Text>
            <Text style={s.footerFarePeriod}> / {durationHrs > 0 ? `${durationHrs}h` : '1h'}</Text>
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [
            s.confirmBtn,
            (!startDate || !endDate || isBooking || vehicles.length === 0) && s.confirmBtnDisabled,
            pressed && s.confirmBtnPressed
          ]}
          onPress={handleConfirmBooking}
          disabled={!startDate || !endDate || isBooking || vehicles.length === 0}>
          <View style={s.confirmBtnContent}>
            <Text style={s.confirmBtnText}>Confirm Booking</Text>
            <Image
              source={require('../../assets/icons/icon_chevron.png')}
              style={s.btnForwardChevron}
              resizeMode="contain"
            />
          </View>
        </Pressable>
      </View>

      {/* ================= DATE / TIME NATIVE PICKERS ================= */}
      {showStartDatePicker && (
        <DateTimePicker
          value={startDate || new Date()}
          mode="date"
          display={Platform.OS === 'android' ? 'calendar' : 'spinner'}
          minimumDate={new Date()}
          onChange={(_, date) => {
            setShowStartDatePicker(false);
            if (date) {
              const updated = startDate ? new Date(startDate) : new Date();
              updated.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
              setStartDate(updated);
            }
          }}
        />
      )}
      {showStartTimePicker && (
        <DateTimePicker
          value={startDate || new Date()}
          mode="time"
          display={Platform.OS === 'android' ? 'clock' : 'spinner'}
          is24Hour={false}
          minimumDate={new Date()}
          onChange={(_, date) => {
            setShowStartTimePicker(false);
            if (date) {
              const updated = startDate ? new Date(startDate) : new Date();
              updated.setHours(date.getHours(), date.getMinutes());
              setStartDate(updated);
            }
          }}
        />
      )}
      {showEndDatePicker && (
        <DateTimePicker
          value={endDate || startDate || new Date()}
          mode="date"
          display={Platform.OS === 'android' ? 'calendar' : 'spinner'}
          minimumDate={startDate || new Date()}
          onChange={(_, date) => {
            setShowEndDatePicker(false);
            if (date) {
              const updated = endDate ? new Date(endDate) : new Date();
              updated.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
              setEndDate(updated);
            }
          }}
        />
      )}
      {showEndTimePicker && (
        <DateTimePicker
          value={endDate || startDate || new Date()}
          mode="time"
          display={Platform.OS === 'android' ? 'clock' : 'spinner'}
          is24Hour={false}
          minimumDate={startDate || new Date()}
          onChange={(_, date) => {
            setShowEndTimePicker(false);
            if (date) {
              const updated = endDate ? new Date(endDate) : new Date();
              updated.setHours(date.getHours(), date.getMinutes());
              setEndDate(updated);
            }
          }}
        />
      )}

      {/* ================= 6. ULTRA-PREMIUM SUCCESS PASS MODAL ================= */}
      <Modal
        visible={!!bookingSuccessData}
        transparent
        animationType="fade"
        onRequestClose={() => { }}>
        <View style={s.modalBackdropCenter}>
          {bookingSuccessData && (
            <View style={s.ticketCardWrapper}>

              {/* Header with Seal */}
              <View style={s.ticketTopBrand}>
                <View style={s.ticketSealOuter}>
                  <View style={s.ticketSealInner}>
                    <Text style={s.ticketSealCheck}>✓</Text>
                  </View>
                </View>
                <Text style={s.ticketMainHeading}>Reservation Confirmed!</Text>
              </View>

              {/* Perforated Tear Line */}
              <View style={s.perforatedDivider}>
                <View style={s.notchLeft} />
                <View style={s.perforatedDashes} />
                <View style={s.notchRight} />
              </View>

              {/* Ticket Details */}
              <View style={s.ticketBodyContent}>

                {/* Location Banner */}
                <View style={s.slotLocationPill}>
                  <Image
                    source={require('../../assets/icons/booking_history_location_pin.png')}
                    style={s.locPinMini}
                    resizeMode="contain"
                  />
                  <Text style={s.slotLocationText} numberOfLines={1}>
                    {bookingSuccessData.parking_location || lot?.location || lot?.parking_area_code || 'Smart Parking Slot'}
                  </Text>
                </View>

                {/* ID & Vehicle Grid */}
                <View style={s.passDataGrid}>
                  <View style={s.passDataCol}>
                    <Text style={s.passDataLabel}>PASS NO / ID</Text>
                    <Text style={s.passDataVal} numberOfLines={1}>
                      {bookingSuccessData.booking_no || 'SPK-2026-09'}
                    </Text>
                  </View>
                  <View style={s.passGridSep} />
                  <View style={s.passDataCol}>
                    <Text style={s.passDataLabel}>VEHICLE PLATE</Text>
                    <View style={s.miniHSRPBadge}>
                      <Text style={s.hsrpIndMini}>IND</Text>
                      <Text style={s.hsrpPlateMini}>{bookingSuccessData.vehicle_number || 'WB 02 AK 1234'}</Text>
                    </View>
                  </View>
                </View>

                {/* Window */}
                <View style={s.scheduleWindowCard}>
                  <View style={s.schedCol}>
                    <Text style={s.schedLabel}>START TIME</Text>
                    <Text style={s.schedTime}>
                      {startDate ? startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                    </Text>
                    <Text style={s.schedDate}>
                      {startDate ? startDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '--'}
                    </Text>
                  </View>

                  <View style={s.schedDividerArrow}>
                    <Text style={s.schedArrowChar}>➔</Text>
                    <Text style={s.schedDurationPill}>
                      {durationHrs} hr(s)
                    </Text>
                  </View>

                  <View style={s.schedCol}>
                    <Text style={s.schedLabel}>END TIME</Text>
                    <Text style={s.schedTime}>
                      {endDate ? endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                    </Text>
                    <Text style={s.schedDate}>
                      {endDate ? endDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '--'}
                    </Text>
                  </View>
                </View>

                {/* Fare & Status */}
                <View style={s.fareGlanceRow}>
                  <View>
                    <Text style={s.fareGlanceLabel}>ESTIMATED TARIFF</Text>
                    <Text style={s.fareGlanceAmount}>₹{bookingSuccessData.total_amount ?? estimatedFare}</Text>
                  </View>
                  <View style={s.slotPayStatusBadge}>
                    <View style={s.payGreenDot} />
                    <Text style={s.slotPayStatusText}>Pay at Barrier</Text>
                  </View>
                </View>

                {/* Barcode Strip Removed as per user request */}
              </View>

              {/* Action Button */}
              <Pressable
                style={({ pressed }) => [s.ticketDoneBtn, pressed && s.ticketDoneBtnPressed]}
                onPress={handleDoneAndNavigateToBookings}>
                <Text style={s.ticketDoneBtnText}>Done — View in My Bookings →</Text>
              </Pressable>
            </View>
          )}
        </View>
      </Modal>

      {/* ================= 7. ALERT MODAL ================= */}
      <Modal visible={!!alertModal} transparent animationType="fade" onRequestClose={() => setAlertModal(null)}>
        <View style={s.alertBackdrop}>
          <View style={s.alertBox}>
            <View style={[
              s.alertIconCirc,
              { backgroundColor: alertModal?.type === 'error' ? '#FEE2E2' : '#E0E7FF' }
            ]}>
              <Text style={{ fontSize: 24, color: alertModal?.type === 'error' ? '#EF4444' : colors.primary }}>
                {alertModal?.type === 'error' ? '✕' : 'ℹ'}
              </Text>
            </View>
            <Text style={s.alertTitle}>{alertModal?.title}</Text>
            <Text style={s.alertMsg}>{alertModal?.message}</Text>
            <Pressable style={s.alertBtn} onPress={() => setAlertModal(null)}>
              <Text style={s.alertBtnText}>Got It</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  navRightPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 14,
  },
  livePulseMiniDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#4ADE80',
  },
  navRightPillText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },

  scrollContent: {
    padding: 16,
  },

  /* 2. Slot Summary Card */
  slotSummaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    marginBottom: 20,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  slotIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FFEDD5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotIconImg: {
    width: 22,
    height: 22,
    tintColor: colors.primary,
  },
  slotInfoCol: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  slotTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  slotNameText: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0F172A',
    flexShrink: 1,
  },
  verifiedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
    gap: 2,
    marginTop: 2,
  },
  shieldMini: {
    width: 9,
    height: 9,
    tintColor: '#16A34A',
  },
  verifiedTagText: {
    fontSize: 8.5,
    fontWeight: '900',
    color: '#16A34A',
  },
  slotAddressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 3,
    gap: 3,
  },
  pinMini: {
    width: 11,
    height: 11,
    tintColor: '#64748B',
    marginTop: 2,
  },
  slotAddressText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
    flex: 1,
  },
  tariffBadge: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 5,
    alignItems: 'center',
  },
  tariffRate: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A',
  },
  tariffUnit: {
    fontSize: 8.5,
    fontWeight: '700',
    color: '#64748B',
  },

  /* Section Headers */
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionLabel: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#334155',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  sectionCount: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  sectionSubBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.primary,
  },

  /* Vehicle Selection Cards */
  loaderBox: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  loadingVehText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 8,
    fontWeight: '600',
  },
  vehicleList: {
    gap: 12,
    paddingVertical: 4,
    paddingRight: 20,
  },
  vehicleCard: {
    width: 250,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    padding: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
  },
  vehicleCardSelected: {
    borderColor: colors.primary,
    borderWidth: 1.5,
    backgroundColor: '#FFFBF7',
  },
  vehIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehIconBoxSelected: {
    backgroundColor: '#FFF7ED',
  },
  vehCardIcon: {
    width: 18,
    height: 18,
    tintColor: '#64748B',
  },
  vehInfoCol: {
    flex: 1,
    marginLeft: 12,
  },
  hsrpMiniPlate: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 5,
    alignSelf: 'flex-start',
    overflow: 'hidden',
  },
  hsrpIndText: {
    backgroundColor: '#1E3A8A',
    color: '#FFFFFF',
    fontSize: 7.5,
    fontWeight: '900',
    paddingHorizontal: 4,
    paddingVertical: 1.5,
  },
  hsrpPlateNum: {
    fontSize: 12,
    fontWeight: '900',
    color: '#0F172A',
    paddingHorizontal: 6,
    letterSpacing: 0.5,
  },
  vehModelText: {
    fontSize: 10.5,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 3,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: {
    borderColor: colors.primary,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  noVehicleBox: {
    padding: 16,
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  noVehicleText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '600',
  },

  /* 4. Schedule Card */
  schedulerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  schedBlock: {
    marginBottom: 4,
  },
  schedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  dotIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  schedBlockTitle: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.6,
  },
  pickersRow: {
    flexDirection: 'row',
    gap: 10,
  },
  pickerPill: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  pickerPillEmpty: {
    backgroundColor: '#F1F5F9',
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
  },
  pickerPillTime: {
    flex: 1.2,
    justifyContent: 'center',
  },
  pickerIcon: {
    width: 14,
    height: 14,
    tintColor: colors.primary,
  },
  pickerText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  pickerTextEmpty: {
    color: '#94A3B8',
    fontWeight: '600',
  },

  /* Connector */
  schedConnectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  connectorLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  arrowBubble: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 10,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  arrowChar: {
    fontSize: 11,
    fontWeight: '900',
    color: colors.primary,
  },

  /* Duration & Fare Banner */
  schedDurationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF7ED',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FED7AA',
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginTop: 14,
  },
  durationLeft: {
    flex: 1,
  },
  durationLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#9A3412',
    letterSpacing: 0.4,
  },
  durationValue: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.primary,
    marginTop: 1,
  },
  durationDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#FED7AA',
    marginHorizontal: 12,
  },
  durationRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  fareValue: {
    fontSize: 15,
    fontWeight: '900',
    color: '#16A34A',
    marginTop: 1,
  },

  /* Trust Notice */
  trustNoticeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    gap: 10,
    marginTop: 16,
  },
  trustNoticeIcon: {
    width: 16,
    height: 16,
    tintColor: colors.primary,
    marginTop: 2,
  },
  trustNoticeText: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 16,
    flex: 1,
    fontWeight: '500',
  },

  /* 5. Fixed Footer */
  footerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#EEF2F6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 12,
  },
  footerFareCol: {
    flex: 1,
  },
  footerFareLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  footerFareRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 1,
  },
  footerFareAmount: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
  },
  footerFarePeriod: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  confirmBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 22,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  confirmBtnDisabled: {
    backgroundColor: '#CBD5E1',
    elevation: 0,
    shadowOpacity: 0,
  },
  confirmBtnPressed: {
    backgroundColor: colors.primaryDark,
  },
  confirmBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  btnForwardChevron: {
    width: 14,
    height: 14,
    tintColor: '#FFFFFF',
  },

  /* 6. Success Modal Ticket */
  modalBackdropCenter: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  ticketCardWrapper: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  ticketTopBrand: {
    backgroundColor: colors.primary,
    paddingTop: 24,
    paddingBottom: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  ticketSealOuter: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  ticketSealInner: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ticketSealCheck: {
    color: colors.primary,
    fontSize: 22,
    fontWeight: '900',
  },
  ticketMainHeading: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 2,
    textAlign: 'center',
  },
  ticketSubHeading: {
    color: 'rgba(255, 255, 255, 0.88)',
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 12,
  },
  fastagClearanceTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  fastagClearanceText: {
    color: '#FFFFFF',
    fontSize: 9.5,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  perforatedDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    height: 24,
    overflow: 'hidden',
  },
  notchLeft: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    marginLeft: -12,
  },
  notchRight: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    marginRight: -12,
  },
  perforatedDashes: {
    flex: 1,
    height: 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    borderStyle: 'dashed',
    marginHorizontal: 8,
  },
  ticketBodyContent: {
    padding: 18,
    backgroundColor: '#F8FAFC',
  },
  slotLocationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
    gap: 6,
  },
  locPinMini: {
    width: 14,
    height: 14,
    tintColor: colors.primary,
  },
  slotLocationText: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: '800',
    color: '#1E293B',
  },
  passDataGrid: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    marginBottom: 12,
  },
  passDataCol: {
    flex: 1,
  },
  passGridSep: {
    width: 1,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 12,
  },
  passDataLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#94A3B8',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  passDataVal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  miniHSRPBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignSelf: 'flex-start',
    overflow: 'hidden',
  },
  hsrpIndMini: {
    backgroundColor: '#1E3A8A',
    color: '#FFFFFF',
    fontSize: 7,
    fontWeight: '900',
    paddingHorizontal: 4,
    paddingVertical: 1.5,
  },
  hsrpPlateMini: {
    fontSize: 11,
    fontWeight: '900',
    color: '#0F172A',
    paddingHorizontal: 5,
  },
  scheduleWindowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  schedCol: {
    alignItems: 'center',
    flex: 1,
  },
  schedLabel: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#94A3B8',
    marginBottom: 2,
  },
  schedTime: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A',
  },
  schedDate: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 1,
  },
  schedDividerArrow: {
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  schedArrowChar: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '900',
  },
  schedDurationPill: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.primary,
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 2,
  },
  fareGlanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 10,
  },
  fareGlanceLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#94A3B8',
  },
  fareGlanceAmount: {
    fontSize: 16,
    fontWeight: '900',
    color: '#16A34A',
  },
  slotPayStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  payGreenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
  },
  slotPayStatusText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#16A34A',
  },
  barcodeStripBox: {
    alignItems: 'center',
    paddingTop: 8,
  },
  barcodePatternText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 14,
    letterSpacing: 3,
    color: '#334155',
    fontWeight: '900',
  },
  barcodeInstructionText: {
    fontSize: 9.5,
    color: '#94A3B8',
    fontWeight: '600',
    marginTop: 3,
  },
  ticketDoneBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ticketDoneBtnPressed: {
    backgroundColor: colors.primaryDark,
  },
  ticketDoneBtnText: {
    fontSize: 14.5,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },

  /* 7. Alert Modal */
  alertBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  alertBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 30,
    paddingBottom: 26,
    width: '100%',
    alignItems: 'center',
    elevation: 16,
  },
  alertIconCirc: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  alertTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
  },
  alertMsg: {
    fontSize: 13.5,
    color: '#475569',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 19,
  },
  alertBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  alertBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});