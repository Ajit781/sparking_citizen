import React, { useState, useRef, useEffect } from 'react';
import {
  Alert,
  Image,
  Linking,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
  Dimensions,
  requireNativeComponent,
  Modal,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors } from '../theme/colors';
import CivicNavbar from '../components/CivicNavbar';

const NativeMap = requireNativeComponent('NativeMap');

import { citizenService } from '../services/citizenService';
import CarLoader from '../components/CarLoader';

interface ParkingDetailsScreenProps {
  onBack: () => void;
  onReserveSlot: () => void;
}

const AMENITIES = [
  { id: 'cctv', label: 'CCTV\nSurveillance', icon: require('../../assets/icons/icon_cctv.png') },
  { id: 'secure', label: 'Secure\nParking', icon: require('../../assets/icons/icon_shield_check.png') },
  { id: 'lit', label: 'Well Lit\nArea', icon: require('../../assets/icons/icon_light.png') },
  { id: 'toilet', label: 'Toilets\nAvailable', icon: require('../../assets/icons/icon_toilet.png') },
  { id: 'shops', label: 'Nearby\nShops', icon: require('../../assets/icons/icon_shop.png') },
  { id: 'wheelchair', label: 'Wheelchair\nAccessible', icon: require('../../assets/icons/icon_wheelchair.png') },
];

export default function ParkingDetailsScreen({ onBack, onReserveSlot }: ParkingDetailsScreenProps) {
  const insets = useSafeAreaInsets();
  const [isFavorite, setIsFavorite] = useState(false);
  const [isBookingLoading, setIsBookingLoading] = useState(false);
  const lot = citizenService.getSelectedParkingDetails();
  const userLoc = citizenService.getUserLocation();
  const mapRef = useRef<any>(null);

  const [alertModal, setAlertModal] = useState<{ type: 'error' | 'info' | 'success'; title: string; message: string } | null>(null);

  const showAlert = (type: 'error' | 'info' | 'success', title: string, message: string) => {
    setAlertModal({ type, title, message });
  };

  const formatDisplayDate = (d: Date) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  };

  // 1. Safe coordinates parsing
  const rawLotLat = lot?.latitude ?? (lot as any)?.lat;
  const rawLotLng = lot?.longitude ?? (lot as any)?.lng;
  const parsedLotLat = parseFloat(String(rawLotLat));
  const parsedLotLng = parseFloat(String(rawLotLng));

  const lotLat = !isNaN(parsedLotLat) ? parsedLotLat : 22.5726;
  const lotLng = !isNaN(parsedLotLng) ? parsedLotLng : 88.3639;

  // 2. User coordinates
  const rawUserLat = userLoc?.latitude ?? (userLoc as any)?.lat;
  const rawUserLng = userLoc?.longitude ?? (userLoc as any)?.lng;
  const parsedUserLat = parseFloat(String(rawUserLat));
  const parsedUserLng = parseFloat(String(rawUserLng));

  const hasUserLoc = !isNaN(parsedUserLat) && !isNaN(parsedUserLng);
  const userLat = hasUserLoc ? parsedUserLat : null;
  const userLng = hasUserLoc ? parsedUserLng : null;

  // 3. Camera animate
  useEffect(() => {
    const timer = setTimeout(() => {
      if (userLat !== null && userLng !== null && mapRef.current) {
        mapRef.current.fitToCoordinates(
          [
            { latitude: userLat, longitude: userLng },
            { latitude: lotLat, longitude: lotLng },
          ],
          {
            edgePadding: { top: 40, right: 40, bottom: 40, left: 40 },
            animated: true,
          }
        );
      } else if (mapRef.current) {
        mapRef.current.animateToRegion(
          {
            latitude: lotLat,
            longitude: lotLng,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          },
          500
        );
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [lotLat, lotLng, userLat, userLng]);

  const handleShare = async () => {
    try {
      await Share.share({
        message: `${lot?.location || 'Parking Area'}\n${lot?.address || ''}\nAvailable now on S-Parking app!`,
      });
    } catch (e) {
      // ignore
    }
  };

  const handleNavigate = () => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lotLat},${lotLng}`;
    Linking.canOpenURL(url)
      .then(supported => {
        if (supported) {
          Linking.openURL(url);
        } else {
          Alert.alert('Directions', `Navigating to ${lot?.location || 'Parking'}`);
        }
      })
      .catch(() => {
        Alert.alert('Directions', `Navigating to ${lot?.location || 'Parking'}`);
      });
  };

  return (
    <View style={s.container}>
      <CarLoader visible={isBookingLoading} message="Preparing Booking..." />
      {/* ================= 1. TOP HEADER ================= */}
      <CivicNavbar
        title="Parking Area Details"
        onBack={onBack}
        rightContent={
          <View style={s.topActions}>
            <Pressable
              onPress={() => setIsFavorite(!isFavorite)}
              style={s.actionBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={[s.favIcon, isFavorite && s.favIconActive]}>
                {isFavorite ? '♥' : '♡'}
              </Text>
            </Pressable>
            <Pressable
              onPress={handleShare}
              style={s.actionBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Image
                source={require('../../assets/icons/icon_booking.png')}
                style={s.shareIconImg}
                resizeMode="contain"
              />
            </Pressable>
          </View>
        }
      />

      <ScrollView
        style={s.scroll}
        contentContainerStyle={[
          s.scrollContent,
          { paddingBottom: 90 + Math.max(insets.bottom, 14) },
        ]}
        showsVerticalScrollIndicator={false}>

        {/* ================= 2. ROUTE MAP PREVIEW ================= */}
        <View style={{ width: Dimensions.get('window').width, height: 250 }}>
          {/* @ts-ignore */}
          <NativeMap
            style={{ width: '100%', height: '100%' }}
            coordinates={{ latitude: lotLat, longitude: lotLng }}
            userCoordinates={userLat !== null && userLng !== null ? { latitude: userLat, longitude: userLng } : null}
          />

          {/* Floating 'Center Lot' Button */}
          <Pressable
            onPress={() => {
              Alert.alert('Focus', 'Map is actively centered on this parking slot.');
            }}
            style={s.myLocationPill}>
            <Image
              source={require('../../assets/icons/booking_history_location_pin.png')}
              style={s.pinPillIcon}
              resizeMode="contain"
            />
            <Text style={s.locationPillText}>Slot Spot</Text>
          </Pressable>
        </View>

        {/* ================= 3. PARKING INFO CARD ================= */}
        <View style={s.mainCard}>
          <View style={s.infoRow}>
            {/* Gate Entrance Photo */}
            <Image
              source={require('../../assets/parking_gate_jadavpur.png')}
              style={s.gateImage}
              resizeMode="cover"
            />

            {/* Title & Distance info */}
            <View style={s.infoContent}>
              <View style={s.titleDistanceRow}>
                <Text style={s.parkingName} numberOfLines={2}>
                  {lot?.location || lot?.name || 'Parking Area'}
                </Text>
              </View>
              <View style={s.areaCodeBadge}>
                <Text style={s.areaCodeText}>Code: {lot?.parking_area_code || lot?.parking_area_id || 'N/A'}</Text>
              </View>
              <View style={s.addressRow}>
                <Image
                  source={require('../../assets/icons/booking_history_location_pin.png')}
                  style={s.realPinIcon}
                  resizeMode="contain"
                />
                <Text style={s.addressText} numberOfLines={2}>
                  {lot?.address || 'Address not available'}
                </Text>
              </View>
            </View>

            {/* Distance Badge */}
            <View style={s.distBadge}>
              <Text style={s.distVal}>{lot?.distance_km ? `${lot.distance_km.toFixed(1)}` : '1.2'}</Text>
              <Text style={s.distUnit}>KM</Text>
              <Text style={s.distSub}>away</Text>
            </View>
          </View>


          {/* ================= 4.5. LIVE SENSOR (PHYSICAL SLOTS) ================= */}
          {lot?.physical_slots && (
            <View style={s.sensorDataCard}>
              <View style={s.sensorDataHeader}>
                <Image source={require('../../assets/icons/icon_shield_check.png')} style={{ width: 16, height: 16, tintColor: '#0ea5e9' }} resizeMode="contain" />
                <Text style={s.sensorDataTitle}>Live Slots</Text>
              </View>

              {lot.physical_slots.two_wheeler && (
                <View style={{ marginTop: 8 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#334155', marginBottom: 6 }}>2-Wheeler</Text>
                  <View style={s.sensorStatRow}>
                    <View style={s.sensorStatBox}>
                      <Text style={s.sensorStatLabel}>Total</Text>
                      <Text style={s.sensorStatVal}>{lot.physical_slots.two_wheeler.total}</Text>
                    </View>
                    <View style={s.sensorStatBox}>
                      <Text style={s.sensorStatLabel}>Free</Text>
                      <Text style={[s.sensorStatVal, s.freeGreen]}>{lot.physical_slots.two_wheeler.free}</Text>
                    </View>
                    <View style={s.sensorStatBox}>
                      <Text style={s.sensorStatLabel}>Occupied</Text>
                      <Text style={[s.sensorStatVal, { color: '#EF4444' }]}>{lot.physical_slots.two_wheeler.occupied}</Text>
                    </View>
                  </View>
                </View>
              )}

              {lot.physical_slots.four_wheeler && (
                <View style={{ marginTop: 12 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#334155', marginBottom: 6 }}>4-Wheeler</Text>
                  <View style={s.sensorStatRow}>
                    <View style={s.sensorStatBox}>
                      <Text style={s.sensorStatLabel}>Total</Text>
                      <Text style={s.sensorStatVal}>{lot.physical_slots.four_wheeler.total}</Text>
                    </View>
                    <View style={s.sensorStatBox}>
                      <Text style={s.sensorStatLabel}>Free</Text>
                      <Text style={[s.sensorStatVal, s.freeGreen]}>{lot.physical_slots.four_wheeler.free}</Text>
                    </View>
                    <View style={s.sensorStatBox}>
                      <Text style={s.sensorStatLabel}>Occupied</Text>
                      <Text style={[s.sensorStatVal, { color: '#EF4444' }]}>{lot.physical_slots.four_wheeler.occupied}</Text>
                    </View>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* ================= 5. PARKING FARE (PER HOUR) ================= */}
          <View style={s.fareCard}>
            <View style={s.fareHeaderRow}>
              <View style={s.fareIconCircle}>
                <Text style={s.fareRupeeIcon}>₹</Text>
              </View>
              <View>
                <Text style={s.fareHeading}>PARKING TARIFF</Text>
                <Text style={s.fareSub}>Standard base rates per hour</Text>
              </View>
            </View>

            <View style={s.ratesContainer}>
              <View style={s.rateBox}>
                <View style={s.rateIconWrapper}>
                  <Image source={require('../../assets/icons/icon_bike.png')} style={s.rateIcon} resizeMode="contain" />
                </View>
                <View style={s.rateTextCol}>
                  <Text style={s.rateType}>2-Wheeler</Text>
                  <Text style={s.rateAmount}>₹{lot?.rates?.two_wheeler ?? '10.00'}</Text>
                </View>
              </View>

              <View style={s.rateBox}>
                <View style={s.rateIconWrapper}>
                  <Image source={require('../../assets/icons/icon_car.png')} style={s.rateIcon} resizeMode="contain" />
                </View>
                <View style={s.rateTextCol}>
                  <Text style={s.rateType}>4-Wheeler</Text>
                  <Text style={s.rateAmount}>₹{lot?.rates?.four_wheeler ?? '20.00'}</Text>
                </View>
              </View>
            </View>

            {lot?.policy_price_remarks ? (
              <View style={s.policyRemarksBox}>
                <Text style={s.policyRemarksText}>💡 {lot.policy_price_remarks}</Text>
              </View>
            ) : null}
          </View>

          {/* ================= 6. OPERATING HOURS & AUTHORITY ================= */}
          <View style={s.timingCard}>
            <View style={s.timingCol}>
              <View style={s.timingIconCircle}>
                <Image
                  source={require('../../assets/icons/icon_booking.png')}
                  style={s.timingRealIcon}
                  resizeMode="contain"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.timingLabel}>Operating Hours</Text>
                <Text style={s.timingVal}>24 x 7 <Text style={s.timingSub}>(All Days)</Text></Text>
              </View>
            </View>

            <View style={s.timingDivider} />

            <View style={s.timingCol}>
              <View style={s.shieldIconCircle}>
                <Image
                  source={require('../../assets/icons/icon_shield_check.png')}
                  style={s.shieldRealIcon}
                  resizeMode="contain"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.timingLabel}>Supervised by</Text>
                <Text style={s.authorityVal}>Kolkata Municipal Corp.</Text>
              </View>
            </View>
          </View>

          {/* ================= 7. AMENITIES ================= */}
          <View style={s.amenitiesSection}>
            <Text style={s.sectionSubtitle}>Slot Facilities & Security</Text>
            <View style={s.amenitiesBox}>
              {AMENITIES.map(a => (
                <View key={a.id} style={s.amenityItem}>
                  <View style={s.amenityIconCircle}>
                    <Image source={a.icon} style={s.amenityIcon} resizeMode="contain" />
                  </View>
                  <Text style={s.amenityText}>{a.label}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* ================= 8. FIXED BOTTOM ACTIONS ================= */}
      <View style={[s.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <Pressable
          onPress={handleNavigate}
          style={({ pressed }) => [s.navigateBtn, pressed && s.navigateBtnPressed]}>
          <View style={s.navigateIconCircle}>
            <Image
              source={require('../../assets/icons/search_location_pin.png')}
              style={s.navigateIcon}
              resizeMode="contain"
            />
          </View>
          <Text style={s.navigateText}>Get Directions</Text>
        </Pressable>

        <Pressable
          onPress={() => {
            setIsBookingLoading(true);
            setTimeout(() => {
              setIsBookingLoading(false);
              onReserveSlot();
            }, 1200);
          }}
          style={({ pressed }) => [s.bookNowBtn, pressed && s.bookNowBtnPressed]}>
          <Image
            source={require('../../assets/icons/icon_booking.png')}
            style={s.bookTicketIcon}
            resizeMode="contain"
          />
          <Text style={s.bookNowText}>Reserve Slot</Text>
        </Pressable>
      </View>

      {/* ================= CUSTOM ALERT MODAL ================= */}
      <Modal visible={!!alertModal} transparent animationType="fade" onRequestClose={() => setAlertModal(null)}>
        <View style={s.alertBackdrop}>
          <View style={s.alertBox}>
            <View style={[
              s.alertIconCircle,
              alertModal?.type === 'error' && s.alertIconError,
              alertModal?.type === 'success' && s.alertIconSuccess,
              alertModal?.type === 'info' && s.alertIconInfo,
            ]}>
              <Text style={s.alertIconText}>
                {alertModal?.type === 'error' ? '✕' : alertModal?.type === 'success' ? '✓' : 'ℹ'}
              </Text>
            </View>

            <Text style={[
              s.alertTitle,
              alertModal?.type === 'error' && { color: '#EF4444' },
              alertModal?.type === 'success' && { color: '#16A34A' },
            ]}>{alertModal?.title}</Text>

            <Text style={s.alertMessage}>{alertModal?.message}</Text>

            <Pressable
              style={s.alertBtn}
              onPress={() => setAlertModal(null)}>
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
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  actionBtn: {
    padding: 6,
  },
  favIcon: {
    fontSize: 20,
    color: 'rgba(255,255,255,0.85)',
  },
  favIconActive: {
    color: '#FFD6D6',
  },
  shareIconImg: {
    width: 17,
    height: 17,
    tintColor: '#FFFFFF',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },

  /* Map Overlay */
  myLocationPill: {
    position: 'absolute',
    top: 14,
    right: 14,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  pinPillIcon: {
    width: 12,
    height: 12,
    tintColor: colors.primary,
  },
  locationPillText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: colors.primary,
  },

  /* Main Info Card */
  mainCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -20,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
  },
  gateImage: {
    width: 90,
    height: 72,
    borderRadius: 12,
  },
  infoContent: {
    flex: 1,
  },
  titleDistanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  parkingName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 19,
  },
  areaCodeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    marginTop: 4,
  },
  areaCodeText: {
    fontSize: 10.5,
    color: '#64748B',
    fontWeight: '700',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  realPinIcon: {
    width: 12,
    height: 12,
    tintColor: '#64748B',
  },
  addressText: {
    fontSize: 11,
    color: '#475569',
    flex: 1,
    lineHeight: 15,
  },
  distBadge: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FFEDD5',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 54,
  },
  distVal: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.primary,
    lineHeight: 16,
  },
  distUnit: {
    fontSize: 9,
    fontWeight: '900',
    color: colors.primary,
  },
  distSub: {
    fontSize: 8.5,
    color: '#94A3B8',
    textAlign: 'center',
  },

  /* Slot Status (2W / 4W) */
  slotStatusCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    flexDirection: 'row',
    marginBottom: 14,
  },
  slotCol: {
    flex: 1,
  },
  slotDivider: {
    width: 1,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 10,
  },
  slotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 10,
  },
  typeIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeIcon: {
    width: 16,
    height: 16,
    tintColor: colors.primary,
  },
  slotTypeTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  slotTypeSub: {
    fontSize: 9.5,
    fontWeight: '500',
    color: '#64748B',
  },
  slotNumbersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  slotStat: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 9.5,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 2,
  },
  statNumber: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A',
  },
  freeGreen: {
    color: '#16A34A',
  },

  /* Parking Fare Card */
  fareCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1.2,
    borderColor: '#FED7AA',
    padding: 16,
    marginBottom: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  fareHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  fareIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fareRupeeIcon: {
    fontSize: 22,
    color: '#FFFFFF',
    fontWeight: '900',
  },
  fareHeading: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 0.5,
  },
  fareSub: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 2,
  },
  ratesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  rateBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderColor: '#FFEDD5',
    gap: 10,
  },
  rateIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  rateIcon: {
    width: 20,
    height: 20,
    tintColor: colors.primary,
  },
  rateTextCol: {
    flex: 1,
  },
  rateType: {
    fontSize: 10.5,
    fontWeight: '800',
    color: colors.primary,
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },
  rateAmount: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0F172A',
  },
  policyRemarksBox: {
    marginTop: 14,
    padding: 10,
    backgroundColor: '#FFFBEB',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
  policyRemarksText: {
    fontSize: 11.5,
    color: '#92400E',
    fontWeight: '600',
    lineHeight: 16,
  },

  /* Operating Hours & Authority */
  timingCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  timingCol: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timingDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 8,
  },
  timingIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timingRealIcon: {
    width: 15,
    height: 15,
    tintColor: colors.primary,
  },
  shieldIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shieldRealIcon: {
    width: 16,
    height: 16,
    tintColor: colors.primary,
  },
  timingLabel: {
    fontSize: 9.5,
    color: '#64748B',
    fontWeight: '600',
  },
  timingVal: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 1,
  },
  timingSub: {
    fontSize: 9.5,
    fontWeight: '500',
    color: '#64748B',
  },
  authorityVal: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 1,
  },

  /* Amenities */
  amenitiesSection: {
    marginBottom: 6,
  },
  sectionSubtitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },
  amenitiesBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 12,
    paddingHorizontal: 8,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-start',
  },
  amenityItem: {
    alignItems: 'center',
    width: 52,
  },
  amenityIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 5,
  },
  amenityIcon: {
    width: 17,
    height: 17,
    tintColor: colors.primary,
  },
  amenityText: {
    fontSize: 8.5,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 11,
    fontWeight: '600',
  },

  /* Fixed Bottom Bar */
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#EEF2F6',
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 20,
    zIndex: 9999,
  },
  navigateBtn: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#FFEDD5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFF7ED',
  },
  navigateBtnPressed: {
    backgroundColor: '#FFEDD5',
  },
  navigateIconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  navigateIcon: {
    width: 14,
    height: 14,
    tintColor: colors.primary,
  },
  navigateText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary,
  },
  bookNowBtn: {
    flex: 1.3,
    height: 52,
    borderRadius: 14,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    elevation: 3,
  },
  bookNowBtnPressed: {
    backgroundColor: colors.primaryDark,
  },
  bookTicketIcon: {
    width: 16,
    height: 16,
    tintColor: '#FFFFFF',
  },
  bookNowText: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  /* Modal Base / New Page Container */
  bookingPageContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  bookingPageScroll: {
    padding: 24,
    paddingBottom: 40,
  },
  bookingPageFooter: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  modalBackdropCenter: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 22,
    paddingBottom: 36,
  },
  modalHeaderBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },
  modalCloseText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#64748B',
    padding: 4,
  },
  modalLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 8,
    marginTop: 8,
  },
  vehicleList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  vehicleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  vehicleCardSelected: {
    borderColor: colors.primary,
    backgroundColor: '#FFF7ED',
  },
  vehCardIcon: {
    width: 14,
    height: 14,
    tintColor: '#64748B',
  },
  vehicleText: {
    fontSize: 12.5,
    color: '#334155',
    fontWeight: '700',
  },
  vehicleTextSelected: {
    color: colors.primary,
  },
  noVehicleText: {
    fontSize: 12,
    color: '#EF4444',
  },

  /* DateTime Picker UI */
  dtSection: {
    marginBottom: 10,
  },
  dtSectionLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  dtRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dtBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dtBtnTime: {
    flex: 1,
  },
  dtPickerIcon: {
    width: 14,
    height: 14,
    tintColor: colors.primary,
  },
  dtBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
    flexShrink: 1,
  },
  dtSummary: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 6,
    marginBottom: 12,
    alignItems: 'center',
  },
  dtSummaryText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: colors.primary,
  },

  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  confirmBtn: {
    flex: 1.5,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnDisabled: {
    opacity: 0.7,
  },
  confirmBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  /* ================= 🔥 ULTRA-PREMIUM DIGITAL PASS TICKET POPUP ================= */
  ticketCardWrapper: {
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  ticketTopBrand: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  ticketSealOuter: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  ticketSealInner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ticketSealCheck: {
    fontSize: 24,
    color: colors.primary,
    fontWeight: '900',
  },
  ticketMainHeading: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 2,
    letterSpacing: -0.3,
  },
  ticketSubHeading: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.88)',
    fontWeight: '500',
    marginBottom: 10,
  },
  fastagClearanceTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  fastagClearanceText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.6,
  },

  /* Perforated Divider */
  perforatedDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    height: 24,
  },
  notchLeft: {
    width: 12,
    height: 24,
    backgroundColor: '#FFFFFF',
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    borderRightWidth: 1,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
    marginLeft: -1,
  },
  perforatedDashes: {
    flex: 1,
    borderTopWidth: 1.5,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
  },
  notchRight: {
    width: 12,
    height: 24,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
    borderLeftWidth: 1,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: -1,
  },

  /* Ticket Body Content */
  ticketBodyContent: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: '#F8FAFC',
  },
  slotLocationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  locPinMini: {
    width: 13,
    height: 13,
    tintColor: colors.primary,
  },
  slotLocationText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
    flex: 1,
  },
  passDataGrid: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
    marginBottom: 10,
  },
  passDataCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  passGridSep: {
    width: 1,
    backgroundColor: '#E2E8F0',
  },
  passDataLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  passDataVal: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  miniHSRPBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#94A3B8',
    overflow: 'hidden',
  },
  hsrpIndText: {
    backgroundColor: '#1E3A8A',
    color: '#FFFFFF',
    fontSize: 7,
    fontWeight: '900',
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  hsrpPlateNum: {
    fontSize: 11,
    fontWeight: '900',
    color: '#0F172A',
    paddingHorizontal: 6,
  },

  /* Schedule Window Card */
  scheduleWindowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
    marginBottom: 10,
  },
  schedCol: {
    alignItems: 'center',
    flex: 1,
  },
  schedLabel: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  schedTime: {
    fontSize: 13.5,
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
    fontSize: 9.5,
    fontWeight: '800',
    color: colors.primary,
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 2,
  },

  /* Fare Glance */
  fareGlanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    letterSpacing: 0.5,
  },
  fareGlanceAmount: {
    fontSize: 16,
    fontWeight: '900',
    color: '#16A34A',
    marginTop: 1,
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

  /* Barcode Strip */
  barcodeStripBox: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  barcodePatternText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 13,
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

  /* Ticket Done Button */
  ticketDoneBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ticketDoneBtnPressed: {
    backgroundColor: colors.primaryDark,
  },
  ticketDoneBtnText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '800',
    letterSpacing: 0.3,
  },

  /* Custom Alert Modal */
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
    paddingTop: 32,
    paddingBottom: 28,
    alignItems: 'center',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 16,
  },
  alertIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    backgroundColor: '#F1F5F9',
  },
  alertIconError: {
    backgroundColor: '#FEE2E2',
  },
  alertIconSuccess: {
    backgroundColor: '#DCFCE7',
  },
  alertIconInfo: {
    backgroundColor: '#DBEAFE',
  },
  alertIconText: {
    fontSize: 28,
    fontWeight: '900',
    color: '#64748B',
  },
  alertTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 10,
  },
  alertMessage: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 24,
  },
  alertBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertBtnError: {
    backgroundColor: '#EF4444',
  },
  alertBtnSuccess: {
    backgroundColor: '#16A34A',
  },
  alertBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  sensorDataCard: {
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  sensorDataHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  sensorDataTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0369A1',
    letterSpacing: 0.5,
  },
  sensorStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E0F2FE',
  },
  sensorStatBox: {
    alignItems: 'center',
    flex: 1,
  },
  sensorStatLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '700',
    marginBottom: 4,
  },
  sensorStatVal: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
  },
});