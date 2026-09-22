import React, { useState, useEffect } from 'react';
import {
  Alert,
  Image,
  Modal,
  PermissionsAndroid,
  Platform,
  Pressable,
  ScrollView,
  ActivityIndicator,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Geolocation from '@react-native-community/geolocation';
import MapView, { Marker } from 'react-native-maps';
import ImageCropPicker from 'react-native-image-crop-picker';
import UmangSkylineFooter from '../components/UmangSkylineFooter';
import CarLoader from '../components/CarLoader';
import ImagePickerActionSheet from '../components/ImagePickerActionSheet';
import { colors } from '../theme/colors';
import { citizenService, GrievanceType, GrievanceSeverity } from '../services/citizenService';
import CivicNavbar from '../components/CivicNavbar';

interface PostGrievanceScreenProps {
  onBack: () => void;
  onSubmitted?: () => void;
}

const SEVERITY_STYLES: Record<string, { color: string; bgColor: string }> = {
  LOW: { color: '#16A34A', bgColor: '#F0FDF4' },
  MEDIUM: { color: '#D97706', bgColor: '#FFFBEB' },
  HIGH: { color: colors.primary, bgColor: '#FFF7ED' },
  CRITICAL: { color: '#DC2626', bgColor: '#FEF2F2' },
};



export default function PostGrievanceScreen({ onBack, onSubmitted }: PostGrievanceScreenProps) {
  const insets = useSafeAreaInsets();

  // 1. All selections strictly NULL / EMPTY by default (Zero pre-selection)
  const [grievanceType, setGrievanceType] = useState<GrievanceType | null>(null);
  const [severity, setSeverity] = useState<GrievanceSeverity | null>(null);
  const [parkingArea, setParkingArea] = useState<string>('');
  const [description, setDescription] = useState('');
  const [additionalDetails, setAdditionalDetails] = useState('');
  const [photos, setPhotos] = useState<{ uri: string, base64?: string | null }[]>([]);
  const [addressText, setAddressText] = useState('');

  // Location Map State (Default to Kolkata City Center)
  const [locationCoords, setLocationCoords] = useState<{ lat: number; lng: number }>({ lat: 22.5726, lng: 88.3639 });
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [successTicket, setSuccessTicket] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // API State
  const [apiGrievanceTypes, setApiGrievanceTypes] = useState<GrievanceType[]>([]);
  const [apiSeverities, setApiSeverities] = useState<GrievanceSeverity[]>([]);
  const [isLoadingMasters, setIsLoadingMasters] = useState(true);

  // Modals
  const [modalType, setModalType] = useState<'none' | 'type' | 'area'>('none');

  useEffect(() => {
    loadMasterData();
  }, []);

  const loadMasterData = async () => {
    try {
      setIsLoadingMasters(true);
      const data = await citizenService.getCitizenGrievanceTypes();
      setApiGrievanceTypes(data.grievance_types || []);
      setApiSeverities(data.severities || []);

      // ✅ NO DEFAULT SELECTIONS:
      // grievanceType, parkingArea aur severity teeno blank rahenge
    } catch (error) {
      console.log('Failed to load grievance masters:', error);
    } finally {
      setIsLoadingMasters(false);
    }
  };

  const handlePickFromGallery = async () => {
    try {
      const images = await ImageCropPicker.openPicker({
        mediaType: 'photo',
        includeBase64: true,
        multiple: true,
        maxFiles: 5 - photos.length,
        compressImageQuality: 0.3,
        compressImageMaxWidth: 400,
        compressImageMaxHeight: 400,
      });

      const newPhotos = images.map(img => ({ uri: img.path, base64: img.data }));
      setPhotos(p => [...p, ...newPhotos].slice(0, 5));
    } catch (e: any) {
      if (e.message !== 'User cancelled image selection') {
        console.warn(e);
      }
    }
  };

  const handleTakePhoto = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA);
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert('Permission Denied', 'Camera permission is required to capture evidence.');
          return;
        }
      } catch (err) {
        console.warn(err);
      }
    }
    setShowImagePicker(false);
    
    setTimeout(async () => {
      try {
        const image = await ImageCropPicker.openCamera({
          mediaType: 'photo',
          includeBase64: true,
          compressImageQuality: 0.3,
          compressImageMaxWidth: 400,
          compressImageMaxHeight: 400,
        });

        if (image.path) {
          setPhotos(p => [...p, { uri: image.path, base64: image.data }].slice(0, 5));
        }
      } catch (e: any) {
        if (e.code !== 'E_PICKER_CANCELLED' && e.message !== 'User cancelled image selection') {
          console.error('Camera capture error: ', e);
          Alert.alert('Error', 'Failed to capture photo from camera.');
        }
      }
    }, 500);
  };

  const handleAddPhoto = () => {
    if (photos.length >= 5) {
      Alert.alert('Upload Limit', 'You can upload up to 5 photos as supporting evidence.');
      return;
    }
    setShowImagePicker(true);
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos(p => p.filter((_, i) => i !== index));
  };

  const handleUseCurrentLocation = async () => {
    let hasPermission = false;
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        );
        hasPermission = granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn('Location permission error:', err);
      }
    } else {
      hasPermission = true;
    }

    if (hasPermission) {
      setIsLocating(true);
      Geolocation.getCurrentPosition(
        position => {
          setLocationCoords({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setIsLocating(false);
          setAddressText(`${position.coords.latitude.toFixed(5)}, ${position.coords.longitude.toFixed(5)}`);
        },
        error => {
          console.warn('Geolocation error:', error.message);
          setIsLocating(false);
          Alert.alert('GPS Notice', 'Could not fetch current GPS location. Please ensure location is enabled.');
        },
        { enableHighAccuracy: false, timeout: 15000, maximumAge: 10000 }
      );
    } else {
      Alert.alert('Permission Required', 'Please allow location permission to tag grievance location.');
    }
  };

  const handleSubmit = async () => {
    if (!grievanceType) {
      Alert.alert('Category Required', 'Please select a grievance category.');
      return;
    }
    if (!parkingArea) {
      Alert.alert('Parking Area Required', 'Please select the affected parking bay/area.');
      return;
    }
    if (!severity) {
      Alert.alert('Urgency Required', 'Please select an urgency/severity level.');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Description Required', 'Please provide details about the parking grievance.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        grievance_type_id: grievanceType.grievance_type_id,
        severity_id: severity.severity_id,
        grievance_text: description.trim(),
        latitude: locationCoords.lat,
        longitude: locationCoords.lng,
        location_address: addressText || parkingArea || 'Detected Location',
        landmark: additionalDetails || 'Not specified',
        parking_area_id: 1,
        image_file_name: photos.length > 0 ? 'grievance_photo.jpg' : null,
        image_mime_type: photos.length > 0 ? 'image/jpeg' : null,
        grievance_image: photos.length > 0 ? photos[0].base64 || null : null,
      };

      const result = await citizenService.postCitizenGrievance(payload);

      const ticketNo = result?.data?.ticket_no || result?.ticket_no || `KMC-GRV-${Math.floor(10000 + Math.random() * 90000)}`;
      setSuccessTicket(ticketNo);
      setIsSubmitting(false);
      setShowSuccessModal(true);
    } catch (error: any) {
      setIsSubmitting(false);
      Alert.alert('Submission Notice', error.message || 'Could not post grievance. Please try again.');
    }
  };

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      {/* ================= 1. REUSABLE CIVIC NAVBAR ================= */}
      <CivicNavbar
        title="Post Grievance"
        subtitle="Official Citizen Redressal Portal"
        badge="KMC SUPPORT"
        onBack={onBack}
      />

      {/* ================= 2. FORM BODY ================= */}
      <ScrollView
        style={s.scroll}
        contentContainerStyle={[
          s.scrollContent,
          { paddingBottom: 40 + Math.max(insets.bottom, 16) },
        ]}
        showsVerticalScrollIndicator={false}>

        <View style={s.formCard}>

          {/* Field 1: Grievance Type (Blank by default) */}
          <View style={s.fieldGroup}>
            <Text style={s.fieldLabel}>GRIEVANCE CATEGORY <Text style={s.requiredStar}>*</Text></Text>
            <Pressable
              onPress={() => setModalType('type')}
              style={({ pressed }) => [s.inputCard, pressed && s.inputCardPressed]}>
              <View style={s.inputIconBox}>
                <Image
                  source={require('../../assets/icons/icon_file_text.png')}
                  style={s.fieldIcon}
                  resizeMode="contain"
                />
              </View>
              <View style={s.fieldBody}>
                <Text style={s.subLabel}>Category Type</Text>
                <Text
                  style={[
                    s.fieldPickerVal,
                    !grievanceType && s.fieldPickerPlaceholder,
                  ]}
                  numberOfLines={1}>
                  {grievanceType ? grievanceType.name : 'Select Grievance Category'}
                </Text>
              </View>
              <Image
                source={require('../../assets/icons/icon_chevron.png')}
                style={s.dropdownChevron}
                resizeMode="contain"
              />
            </Pressable>
          </View>

          {/* Field 2: Parking Area (Text Input) */}
          <View style={s.fieldGroup}>
            <Text style={s.fieldLabel}>PARKING BAY / AREA <Text style={s.requiredStar}>*</Text></Text>
            <View style={s.inputCard}>
              <View style={[s.inputIconBox, { backgroundColor: '#EFF6FF' }]}>
                <Image
                  source={require('../../assets/icons/nav_parking.png')}
                  style={[s.fieldIcon, { tintColor: '#2563EB' }]}
                  resizeMode="contain"
                />
              </View>
              <View style={s.fieldBody}>
                <Text style={s.subLabel}>Affected Location</Text>
                <TextInput
                  style={[s.fieldPickerVal, { paddingVertical: 0, paddingHorizontal: 0, marginTop: 4 }]}
                  placeholder="Enter Parking Area / Location"
                  placeholderTextColor="#94A3B8"
                  value={parkingArea}
                  onChangeText={setParkingArea}
                />
              </View>
            </View>
          </View>

          {/* Field 3: Severity (Blank by default — zero pre-selected chips) */}
          <View style={s.fieldGroup}>
            <Text style={s.fieldLabel}>URGENCY / SEVERITY <Text style={s.requiredStar}>*</Text></Text>
            <View style={s.severityChipRow}>
              {apiSeverities.map(sev => {
                const isSelected = severity?.code === sev.code;
                const styleDef = SEVERITY_STYLES[sev.code] || SEVERITY_STYLES['MEDIUM'];

                return (
                  <Pressable
                    key={sev.severity_id.toString()}
                    onPress={() => setSeverity(sev)}
                    style={[
                      s.severityChip,
                      isSelected && {
                        borderColor: styleDef.color,
                        backgroundColor: styleDef.bgColor,
                        borderWidth: 1.5,
                      },
                    ]}>
                    <View
                      style={[
                        s.severityDot,
                        { backgroundColor: isSelected ? styleDef.color : '#CBD5E1' }
                      ]}
                    />
                    <Text
                      style={[
                        s.severityChipText,
                        isSelected && { color: styleDef.color, fontWeight: '900' },
                      ]}>
                      {sev.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Field 4: Description Textarea */}
          <View style={s.fieldGroup}>
            <Text style={s.fieldLabel}>DETAILED DESCRIPTION <Text style={s.requiredStar}>*</Text></Text>
            <View style={s.textAreaWrap}>
              <TextInput
                style={s.textAreaInput}
                placeholder="Explain the issue clearly (e.g., overcharging by operator, vehicle obstruction, broken boom barrier)..."
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={4}
                value={description}
                onChangeText={t => {
                  if (t.length <= 500) setDescription(t);
                }}
                maxLength={500}
              />
              <Text style={s.charCountFloating}>{description.length}/500</Text>
            </View>
          </View>

          {/* Field 5: Supporting Photos */}
          <View style={s.fieldGroup}>
            <Text style={s.fieldLabel}>EVIDENCE PHOTOS <Text style={s.optionalTag}>(OPTIONAL • MAX 5)</Text></Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.photosRow}>
              {/* Dashed upload box */}
              <Pressable
                onPress={handleAddPhoto}
                style={({ pressed }) => [s.dashedUploadBox, pressed && s.dashedUploadBoxPressed]}>
                <View style={s.cameraCircleIcon}>
                  <Image
                    source={require('../../assets/icons/icon_camera_real.png')}
                    style={s.cameraIconImg}
                    resizeMode="contain"
                  />
                </View>
                <Text style={s.uploadPromptText}>Add Photo</Text>
                <Text style={s.uploadSubPrompt}>Camera / Gallery</Text>
              </Pressable>

              {/* Thumbnails */}
              {photos.map((photo, index) => (
                <View key={index} style={s.thumbnailContainer}>
                  <Image
                    source={{ uri: photo.uri }}
                    style={s.thumbImage}
                    resizeMode="cover"
                  />
                  <Pressable
                    onPress={() => handleRemovePhoto(index)}
                    style={s.thumbDeleteBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Text style={s.thumbDeleteIcon}>✕</Text>
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          </View>

          {/* Field 6: Location Tag & Mini Map */}
          <View style={s.fieldGroup}>
            <Text style={s.fieldLabel}>GEO-LOCATION TAG <Text style={s.requiredStar}>*</Text></Text>

            <View style={s.miniMapCard}>
              <MapView
                style={s.miniMapImage}
                region={{
                  latitude: locationCoords.lat,
                  longitude: locationCoords.lng,
                  latitudeDelta: 0.006,
                  longitudeDelta: 0.006,
                }}
                scrollEnabled={false}
                zoomEnabled={false}>
                <Marker coordinate={{ latitude: locationCoords.lat, longitude: locationCoords.lng }} />
              </MapView>

              {/* Floating 'Use Current Location' Button */}
              <Pressable
                onPress={handleUseCurrentLocation}
                style={({ pressed }) => [s.currentLocationBtn, pressed && s.currentLocationBtnPressed]}>
                <Image
                  source={require('../../assets/icons/booking_history_location_pin.png')}
                  style={s.pinTargetIcon}
                  resizeMode="contain"
                />
                <Text style={s.currentLocationText}>
                  {isLocating ? 'Detecting GPS...' : 'Use Current GPS'}
                </Text>
              </Pressable>
            </View>

            {/* Address Input Row */}
            <View style={s.addressRow}>
              <Image
                source={require('../../assets/icons/booking_history_location_pin.png')}
                style={s.addressPinImg}
                resizeMode="contain"
              />
              <TextInput
                style={s.addressTextInput}
                value={addressText}
                onChangeText={setAddressText}
                placeholder="Enter street name, landmark, or ward number"
                placeholderTextColor="#94A3B8"
              />
            </View>
          </View>

          {/* Field 7: Additional Details */}
          <View style={s.fieldGroup}>
            <Text style={s.fieldLabel}>ADDITIONAL LANDMARK <Text style={s.optionalTag}>(OPTIONAL)</Text></Text>
            <View style={s.singleInputCard}>
              <TextInput
                style={s.singleInput}
                placeholder="e.g. Near Gate 3, opposite metro pillar 42"
                placeholderTextColor="#94A3B8"
                value={additionalDetails}
                onChangeText={setAdditionalDetails}
              />
            </View>
          </View>

          {/* Submit Button */}
          <Pressable
            onPress={handleSubmit}
            disabled={isSubmitting}
            style={({ pressed }) => [
              s.submitBtn,
              pressed && s.submitBtnPressed,
              isSubmitting && { opacity: 0.7 }
            ]}>
            {isSubmitting ? (
              <Text style={s.submitBtnText}>Submitting to KMC...</Text>
            ) : (
              <View style={s.submitBtnContent}>
                <Text style={s.submitBtnText}>Submit Grievance</Text>
                <Image
                  source={require('../../assets/icons/icon_chevron.png')}
                  style={s.submitChevron}
                  resizeMode="contain"
                />
              </View>
            )}
          </Pressable>

          {/* Trust Seal */}
          <View style={s.trustRow}>
            <Image
              source={require('../../assets/icons/icon_shield_check.png')}
              style={s.trustShieldImg}
              resizeMode="contain"
            />
            <Text style={s.trustText}>
              Directly routed to KMC Municipal Enforcement & Vigilance Wing
            </Text>
          </View>
        </View>

        <View style={s.footerWrapper}>
          <UmangSkylineFooter />
        </View>
      </ScrollView>

      {/* ================= SELECTION MODALS (CENTER POPUPS) ================= */}
      <Modal visible={modalType !== 'none'} transparent animationType="fade" onRequestClose={() => setModalType('none')}>
        <View style={s.popupBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setModalType('none')} />

          <View style={s.popupCard}>

            {/* Header */}
            <View style={s.popupHeaderRow}>
              <View>
                <View style={s.popupThemeTag}>
                  <Text style={s.popupThemeTagText}>KMC SELECTION</Text>
                </View>
                <Text style={s.popupTitle}>
                  {modalType === 'type' ? 'Select Grievance Category' : 'Select Parking Bay'}
                </Text>
              </View>

              <Pressable
                onPress={() => setModalType('none')}
                style={s.popupCloseCircle}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={s.popupCloseText}>✕</Text>
              </Pressable>
            </View>

            {/* List */}
            <ScrollView style={{ maxHeight: 340 }} showsVerticalScrollIndicator={false}>
              {modalType === 'type' &&
                apiGrievanceTypes.map(gt => {
                  const isSelected = grievanceType?.code === gt.code;
                  return (
                    <Pressable
                      key={gt.grievance_type_id.toString()}
                      onPress={() => {
                        setGrievanceType(gt);
                        setModalType('none');
                      }}
                      style={[
                        s.popupOptionRow,
                        isSelected && s.popupOptionRowSelected,
                      ]}>
                      <View style={[s.popupOptionIconBox, isSelected && s.popupOptionIconBoxSelected]}>
                        <Image
                          source={require('../../assets/icons/icon_file_text.png')}
                          style={[s.popupOptionIcon, isSelected && { tintColor: colors.primary }]}
                          resizeMode="contain"
                        />
                      </View>
                      <Text
                        style={[
                          s.popupOptionText,
                          isSelected && s.popupOptionTextSelected,
                        ]}>
                        {gt.name}
                      </Text>
                      {isSelected && <Text style={s.checkMarkText}>✓</Text>}
                    </Pressable>
                  );
                })}


            </ScrollView>

            <Pressable onPress={() => setModalType('none')} style={s.popupCancelBtn}>
              <Text style={s.popupCancelText}>Cancel</Text>
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
        title="Evidence Photo"
        subtitle="Choose photo source to support your grievance"
      />

      {/* ================= SUCCESS TICKET MODAL ================= */}
      <Modal visible={showSuccessModal} transparent animationType="fade">
        <View style={s.popupBackdrop}>
          <View style={[s.popupCard, { alignItems: 'center', paddingVertical: 26 }]}>
            <View style={s.successCircle}>
              <Text style={s.successCheckMark}>✓</Text>
            </View>
            <Text style={s.successMainTitle}>Grievance Lodged!</Text>
            <Text style={s.successSubText}>
              Your grievance has been successfully forwarded to Kolkata Municipal Redressal Cell.
            </Text>

            <View style={s.ticketBox}>
              <Text style={s.ticketLabel}>TICKET NUMBER</Text>
              <Text style={s.ticketValue}>{successTicket}</Text>
            </View>

            <View style={s.slaNoticeBadge}>
              <Text style={s.slaText}>⚡ Priority resolution SLA: 4 Hours</Text>
            </View>

            <Pressable
              style={s.trackBtn}
              onPress={() => {
                setShowSuccessModal(false);
                if (onSubmitted) onSubmitted();
                else onBack();
              }}>
              <Text style={s.trackBtnText}>Done — Track My Grievances</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {isLoadingMasters && (
        <View style={StyleSheet.absoluteFillObject}>
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(255,255,255,0.8)' }]} />
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={{ marginTop: 10, color: colors.primary, fontWeight: '700' }}>Loading master data...</Text>
          </View>
        </View>
      )}

      <CarLoader visible={isSubmitting} message="Submitting Grievance..." />
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
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  formCard: {
    gap: 12,
  },

  /* Field Structure */
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.6,
  },
  requiredStar: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '900',
  },
  optionalTag: {
    fontSize: 9.5,
    color: '#94A3B8',
    fontWeight: '700',
  },

  /* Selector Card */
  inputCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  inputCardPressed: {
    backgroundColor: '#FFFBF7',
    borderColor: colors.primary,
  },
  inputIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldIcon: {
    width: 18,
    height: 18,
    tintColor: colors.primary,
  },
  fieldBody: {
    flex: 1,
    justifyContent: 'center',
  },
  subLabel: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '600',
    marginBottom: 1,
  },
  fieldPickerVal: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  fieldPickerPlaceholder: {
    color: '#94A3B8',
    fontWeight: '500',
  },
  dropdownChevron: {
    width: 13,
    height: 13,
    tintColor: '#94A3B8',
    transform: [{ rotate: '90deg' }],
  },

  /* Severity Chips (Unselected by default) */
  severityChipRow: {
    flexDirection: 'row',
    gap: 8,
  },
  severityChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
  },
  severityDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  severityChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },

  /* Textarea */
  textAreaWrap: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    padding: 12,
    position: 'relative',
  },
  textAreaInput: {
    fontSize: 13.5,
    color: '#0F172A',
    minHeight: 84,
    textAlignVertical: 'top',
    lineHeight: 18,
    fontWeight: '500',
    paddingBottom: 16,
  },
  charCountFloating: {
    position: 'absolute',
    bottom: 6,
    right: 12,
    fontSize: 10.5,
    color: '#94A3B8',
    fontWeight: '600',
  },

  /* Photo Upload Studio */
  photosRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 2,
  },
  dashedUploadBox: {
    width: 120,
    height: 82,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#FED7AA',
    borderStyle: 'dashed',
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dashedUploadBoxPressed: {
    backgroundColor: '#FFEDD5',
  },
  cameraCircleIcon: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  cameraIconImg: {
    width: 20,
    height: 20,
    tintColor: colors.primary,
  },
  uploadPromptText: {
    fontSize: 11,
    fontWeight: '900',
    color: colors.primary,
  },
  uploadSubPrompt: {
    fontSize: 8.5,
    color: '#64748B',
    marginTop: 1,
    fontWeight: '600',
  },
  thumbnailContainer: {
    width: 82,
    height: 82,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  thumbDeleteBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbDeleteIcon: {
    fontSize: 9,
    color: '#FFFFFF',
    fontWeight: '900',
  },

  /* Mini Map */
  miniMapCard: {
    height: 100,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
  },
  miniMapImage: {
    width: '100%',
    height: '100%',
  },
  currentLocationBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  currentLocationBtnPressed: {
    backgroundColor: '#F8FAFC',
  },
  pinTargetIcon: {
    width: 12,
    height: 12,
    tintColor: colors.primary,
  },
  currentLocationText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: colors.primary,
  },
  addressRow: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  addressPinImg: {
    width: 14,
    height: 14,
    tintColor: colors.primary,
  },
  addressTextInput: {
    flex: 1,
    fontSize: 12.5,
    color: '#0F172A',
    fontWeight: '600',
    padding: 0,
  },

  /* Single Input */
  singleInputCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  singleInput: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '600',
    padding: 0,
  },

  /* Submit Button */
  submitBtn: {
    backgroundColor: colors.primary,
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnPressed: {
    backgroundColor: colors.primaryDark,
    transform: [{ scale: 0.98 }],
  },
  submitBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  submitBtnText: {
    fontSize: 15.5,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  submitChevron: {
    width: 14,
    height: 14,
    tintColor: '#FFFFFF',
  },

  /* Trust */
  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  trustShieldImg: {
    width: 13,
    height: 13,
    tintColor: colors.primary,
  },
  trustText: {
    fontSize: 10.5,
    color: '#64748B',
    fontWeight: '600',
    textAlign: 'center',
  },

  footerWrapper: {
    marginHorizontal: -16,
    marginTop: 10,
  },

  /* Selection Popups */
  popupBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.68)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  popupCard: {
    width: '100%',
    maxWidth: 345,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 12,
  },
  popupHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  popupThemeTag: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  popupThemeTagText: {
    fontSize: 8,
    fontWeight: '900',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  popupTitle: {
    fontSize: 16.5,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  popupCloseCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  popupCloseText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#64748B',
  },
  popupOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginBottom: 6,
    gap: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  popupOptionRowSelected: {
    backgroundColor: '#FFF7ED',
    borderColor: colors.primary,
    borderWidth: 1.2,
  },
  popupOptionIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  popupOptionIconBoxSelected: {
    backgroundColor: '#FFFFFF',
  },
  popupOptionIcon: {
    width: 16,
    height: 16,
    tintColor: '#64748B',
  },
  popupOptionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    flex: 1,
  },
  popupOptionTextSelected: {
    color: colors.primary,
    fontWeight: '900',
  },
  checkMarkText: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.primary,
  },
  popupCancelBtn: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  popupCancelText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#64748B',
  },

  /* Success Ticket Modal */
  successCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#BBF7D0',
    marginBottom: 12,
  },
  successCheckMark: {
    fontSize: 28,
    fontWeight: '900',
    color: '#16A34A',
  },
  successMainTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 4,
  },
  successSubText: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 17,
    marginBottom: 16,
    paddingHorizontal: 10,
  },
  ticketBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    width: '100%',
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  ticketLabel: {
    fontSize: 9.5,
    color: '#94A3B8',
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  ticketValue: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.primary,
    letterSpacing: 0.8,
  },
  slaNoticeBadge: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FED7AA',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 20,
  },
  slaText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#92400E',
  },
  trackBtn: {
    backgroundColor: colors.primary,
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  trackBtnText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '800',
  },

  /* Submit Loader Overlay */
  submitLoaderOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitLoaderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: 32,
    paddingHorizontal: 36,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 14,
    minWidth: 200,
  },
  submitSpinnerWrap: {
    marginBottom: 20,
  },
  submitSpinnerOuter: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 4,
    borderColor: '#FFEDD5',
    borderTopColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitSpinnerInner: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFF7ED',
    borderWidth: 2,
    borderColor: '#FED7AA',
  },
  submitLoaderTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  submitLoaderSub: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    textAlign: 'center',
  },
});