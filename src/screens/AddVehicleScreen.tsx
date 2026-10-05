import React, { useState, useEffect } from 'react';
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
  PermissionsAndroid,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ImageCropPicker from 'react-native-image-crop-picker';
import UmangSkylineFooter from '../components/UmangSkylineFooter';
import CarLoader from '../components/CarLoader';
import LoadingOverlay from '../components/LoadingOverlay';
import { getErrorMessage } from '../utils/errorUtils';
import ErrorModal from '../components/ErrorModal';
import VisionCamera from '../components/VisionCamera';
import ImagePickerActionSheet from '../components/ImagePickerActionSheet';
import { colors } from '../theme/colors';
import { citizenService } from '../services/citizenService';
import { DEFAULT_VEHICLE_IMAGE_BASE64, getVehicleImageSource } from '../constants/defaultVehicleImage';
import CivicNavbar from '../components/CivicNavbar';

interface AddVehicleScreenProps {
  vehicle?: any;
  onBack: () => void;
  onVehicleAdded?: () => void;
}

/* ================= REAL CAMERA VECTOR ICON COMPONENT ================= */
const RealCameraIcon = ({ size = 20, color = '#FFFFFF' }: { size?: number; color?: string }) => {
  const notchWidth = size * 0.38;
  const notchHeight = size * 0.18;
  const bodyHeight = size * 0.72;
  const lensSize = size * 0.44;

  return (
    <View style={{ width: size, height: size * 0.88, alignItems: 'center', justifyContent: 'flex-end' }}>
      <View
        style={{
          width: notchWidth,
          height: notchHeight,
          backgroundColor: color,
          borderTopLeftRadius: 2.5,
          borderTopRightRadius: 2.5,
          position: 'absolute',
          top: 0,
        }}
      />
      <View
        style={{
          width: size,
          height: bodyHeight,
          backgroundColor: color,
          borderRadius: 4,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <View
          style={{
            width: lensSize,
            height: lensSize,
            borderRadius: lensSize / 2,
            borderWidth: 2,
            borderColor: colors.primary,
          }}
        />
        <View
          style={{
            position: 'absolute',
            top: 2.5,
            right: 3,
            width: 2.5,
            height: 2.5,
            borderRadius: 1.25,
            backgroundColor: colors.primary,
          }}
        />
      </View>
    </View>
  );
};

// Real Color Swatches with Hex Codes
const COLOR_SWATCHES = [
  { name: 'White', hex: '#FFFFFF', border: '#CBD5E1', checkColor: '#0F172A' },
  { name: 'Black', hex: '#0F172A', border: '#000000', checkColor: '#FFFFFF' },
  { name: 'Silver', hex: '#E2E8F0', border: '#94A3B8', checkColor: '#0F172A' },
  { name: 'Grey', hex: '#64748B', border: '#475569', checkColor: '#FFFFFF' },
  { name: 'Red', hex: '#EF4444', border: '#DC2626', checkColor: '#FFFFFF' },
  { name: 'Blue', hex: '#2563EB', border: '#1D4ED8', checkColor: '#FFFFFF' },
  { name: 'Brown', hex: '#78350F', border: '#451A03', checkColor: '#FFFFFF' },
  { name: 'Green', hex: '#16A34A', border: '#15803D', checkColor: '#FFFFFF' },
  { name: 'Yellow', hex: '#FACC15', border: '#CA8A04', checkColor: '#0F172A' },
  { name: 'Orange', hex: '#F97316', border: '#C2410C', checkColor: '#FFFFFF' },
  { name: 'Other', hex: '#8B5CF6', border: '#6D28D9', checkColor: '#FFFFFF' },
];

export default function AddVehicleScreen({ vehicle, onBack, onVehicleAdded }: AddVehicleScreenProps) {
  const insets = useSafeAreaInsets();
  const [vehicleNumber, setVehicleNumber] = useState(vehicle?.vehicle_number || '');
  const [chassisNumber, setChassisNumber] = useState(vehicle?.chassis_number || '');
  const [engineNumber, setEngineNumber] = useState(vehicle?.engine_number || '');
  const [vehicleMake, setVehicleMake] = useState(vehicle?.vehicle_make || '');
  const [vehicleBrand, setVehicleBrand] = useState(vehicle?.vehicle_brand || '');
  const [vehicleModel, setVehicleModel] = useState(vehicle?.vehicle_model || '');
  const [vehicleColor, setVehicleColor] = useState(vehicle?.vehicle_color || '');

  const [selectedType, setSelectedType] = useState<any | null>(
    vehicle ? { vehicle_type_id: vehicle.vehicle_type_id, vehicle_type_name: vehicle.vehicle_type_name } : null
  );
  const [vehicleTypes, setVehicleTypes] = useState<any[]>([]);

  useEffect(() => {
    citizenService.getVehicleTypes().then(types => setVehicleTypes(types || []));
  }, []);

  const getTypeIcon = (typeId: number) => {
    if (typeId === 1) return require('../../assets/icons/icon_bike.png');
    return require('../../assets/icons/icon_car.png');
  };

  const [showTypeModal, setShowTypeModal] = useState(false);
  const [showColorModal, setShowColorModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showImagePickerModal, setShowImagePickerModal] = useState(false);
  const [showVisionCamera, setShowVisionCamera] = useState(false);
  const [vehicleImage, setVehicleImage] = useState<string>(
    vehicle?.vehicle_image && vehicle.vehicle_image !== DEFAULT_VEHICLE_IMAGE_BASE64
      ? vehicle.vehicle_image
      : ''
  );
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const requestCameraPermission = async () => {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
        {
          title: 'Camera Permission',
          message: 'App needs camera permission to capture vehicle photo.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        },
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      console.warn(err);
      return false;
    }
  };

  const handleTakePhoto = () => {
    setShowImagePickerModal(false);
    setTimeout(() => {
      setShowVisionCamera(true);
    }, 400); // Wait for action sheet to close
  };

  const handlePickFromGallery = async () => {
    try {
      const image = await ImageCropPicker.openPicker({
        mediaType: 'photo',
        includeBase64: true,
        compressImageQuality: 0.3,
        compressImageMaxWidth: 400,
        compressImageMaxHeight: 400,
      });

      if (image.data) {
        setVehicleImage(image.data);
      }
    } catch (e: any) {
      if (e.message !== 'User cancelled image selection') {
        Alert.alert('Gallery Error', 'Failed to pick image from gallery.');
      }
    }
  };

  const handlePickPhoto = () => {
    setShowImagePickerModal(true);
  };

  const handleSaveVehicle = async () => {
    if (!vehicleNumber.trim()) {
      Alert.alert('Vehicle Number Required', 'Please enter your vehicle registration number (e.g. WB12AB1234).');
      return;
    }
    if (!selectedType) {
      Alert.alert('Vehicle Type Required', 'Please select a vehicle category.');
      return;
    }
    if (!vehicleBrand.trim()) {
      Alert.alert('Vehicle Brand Required', 'Please enter your vehicle brand (e.g. Nexus, Swift).');
      return;
    }
    if (!vehicleColor.trim()) {
      Alert.alert('Vehicle Color Required', 'Please enter your vehicle color (e.g. Red, White).');
      return;
    }

    if (!engineNumber.trim()) {
      Alert.alert('Engine Number Required', 'Please enter your vehicle engine number.');
      return;
    }
    if (!chassisNumber.trim()) {
      Alert.alert('Chassis Number Required', 'Please enter your vehicle chassis number.');
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        vehicle_number: vehicleNumber.trim().toUpperCase(),
        vehicle_type_id: selectedType.vehicle_type_id,
        vehicle_make: vehicleMake.trim(),
        vehicle_brand: vehicleBrand.trim(),
        vehicle_model: vehicleModel.trim(),
        chassis_number: chassisNumber.trim(),
        engine_number: engineNumber.trim(),
        vehicle_color: vehicleColor.trim(),
        vehicle_image: vehicleImage && vehicleImage !== DEFAULT_VEHICLE_IMAGE_BASE64 ? vehicleImage : '',
      };

      console.log('🚗 [VehicleUpdate] Image length:', payload.vehicle_image.length, 'Prefix:', payload.vehicle_image.substring(0, 30));

      if (vehicle) {
        await citizenService.updateCitizenVehicle({
          ...payload,
          vehicle_id: vehicle.vehicle_id,
        });
      } else {
        await citizenService.addCitizenVehicle(payload);
      }

      setIsLoading(false);
      setShowSuccessModal(true);
    } catch (err: any) {
      setIsLoading(false);
      const message = getErrorMessage(err, `Failed to ${vehicle ? 'update' : 'add'} vehicle. Please try again.`);
      setApiError(message);
    }
  };

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      {/* ================= 1. HEADER BAR ================= */}
      <CivicNavbar
        title={vehicle ? 'Edit Vehicle' : 'Add Vehicle'}
        onBack={onBack}
        rightContent={
          <View style={s.logoContainer}>
            <Image
              source={require('../../assets/SmartParkingLogo_circle.png')}
              style={s.logoImage}
              resizeMode="contain"
            />
          </View>
        }
      />

      <ScrollView
        style={s.scroll}
        contentContainerStyle={[
          s.scrollContent,
          { paddingBottom: 20 + Math.max(insets.bottom, 14) },
        ]}
        showsVerticalScrollIndicator={false}>

        {/* ================= 2. VEHICLE PHOTO AVATAR ================= */}
        <View style={s.avatarSection}>
          <Pressable onPress={handlePickPhoto} style={s.avatarContainer}>
            <Image
              source={getVehicleImageSource(vehicleImage, vehicle?.modified_on)}
              style={s.avatarImage}
              resizeMode="cover"
            />
            <View style={s.cameraBadge}>
              <RealCameraIcon size={20} color="#FFFFFF" />
            </View>
          </Pressable>

          <Text style={s.photoTitle}>Add Vehicle Photo</Text>
          <Text style={s.photoSubtitle}>Take a photo or upload from gallery</Text>
        </View>

        {/* ================= 3. INPUT FIELDS ================= */}
        <View style={s.formContainer}>
          {/* Input 1: Vehicle Number */}
          <View style={s.inputCard}>
            <View style={s.inputIconBox}>
              <Image
                source={require('../../assets/icons/icon_car.png')}
                style={s.fieldIcon}
                resizeMode="contain"
              />
            </View>
            <View style={s.fieldBody}>
              <Text style={s.fieldLabel}>Vehicle Number</Text>
              <TextInput
                style={s.fieldInput}
                placeholder="e.g. WB12AB1234"
                placeholderTextColor="#94A3B8"
                value={vehicleNumber}
                onChangeText={t => setVehicleNumber(t.toUpperCase())}
                autoCapitalize="characters"
              />
            </View>
          </View>

          {/* Input 2: Chassis Number */}
          <View style={s.inputCard}>
            <View style={s.inputIconBox}>
              <Image
                source={require('../../assets/icons/icon_file_text.png')}
                style={s.fieldIcon}
                resizeMode="contain"
              />
            </View>
            <View style={s.fieldBody}>
              <Text style={s.fieldLabel}>Chassis Number *</Text>
              <TextInput
                style={s.fieldInput}
                placeholder="Enter chassis number"
                placeholderTextColor="#94A3B8"
                value={chassisNumber}
                onChangeText={setChassisNumber}
              />
            </View>
          </View>

          {/* Input 2.5: Engine Number */}
          <View style={s.inputCard}>
            <View style={s.inputIconBox}>
              <Image
                source={require('../../assets/icons/icon_file_text.png')}
                style={s.fieldIcon}
                resizeMode="contain"
              />
            </View>
            <View style={s.fieldBody}>
              <Text style={s.fieldLabel}>Engine Number *</Text>
              <TextInput
                style={s.fieldInput}
                placeholder="Enter engine number"
                placeholderTextColor="#94A3B8"
                value={engineNumber}
                onChangeText={setEngineNumber}
              />
            </View>
          </View>

          {/* Input: Vehicle Make */}
          <View style={s.inputCard}>
            <View style={s.inputIconBox}>
              <Image
                source={require('../../assets/icons/icon_car.png')}
                style={s.fieldIcon}
                resizeMode="contain"
              />
            </View>
            <View style={s.fieldBody}>
              <Text style={s.fieldLabel}>Vehicle Make (Optional)</Text>
              <TextInput
                style={s.fieldInput}
                placeholder="e.g. Tata, Maruti, Honda"
                placeholderTextColor="#94A3B8"
                value={vehicleMake}
                onChangeText={setVehicleMake}
              />
            </View>
          </View>

          {/* Input: Vehicle Brand */}
          <View style={s.inputCard}>
            <View style={s.inputIconBox}>
              <Image
                source={require('../../assets/icons/icon_car.png')}
                style={s.fieldIcon}
                resizeMode="contain"
              />
            </View>
            <View style={s.fieldBody}>
              <Text style={s.fieldLabel}>Vehicle Brand *</Text>
              <TextInput
                style={s.fieldInput}
                placeholder="e.g. Nexus, Swift, City"
                placeholderTextColor="#94A3B8"
                value={vehicleBrand}
                onChangeText={setVehicleBrand}
              />
            </View>
          </View>

          {/* Input: Vehicle Model */}
          <View style={s.inputCard}>
            <View style={s.inputIconBox}>
              <Image
                source={require('../../assets/icons/icon_car.png')}
                style={s.fieldIcon}
                resizeMode="contain"
              />
            </View>
            <View style={s.fieldBody}>
              <Text style={s.fieldLabel}>Vehicle Model (Optional)</Text>
              <TextInput
                style={s.fieldInput}
                placeholder="e.g. V19, VXi, 2023"
                placeholderTextColor="#94A3B8"
                value={vehicleModel}
                onChangeText={setVehicleModel}
              />
            </View>
          </View>

          {/* Input: Vehicle Color Selector */}
          <Pressable
            onPress={() => setShowColorModal(true)}
            style={s.inputCard}>
            <View style={s.inputIconBox}>
              <Image
                source={require('../../assets/icons/icon_car.png')}
                style={s.fieldIcon}
                resizeMode="contain"
              />
            </View>
            <View style={s.fieldBody}>
              <Text style={s.fieldLabel}>Vehicle Color *</Text>
              <Text
                style={[
                  s.fieldPickerVal,
                  !vehicleColor && s.fieldPickerPlaceholder,
                ]}>
                {vehicleColor ? vehicleColor : 'Select vehicle color'}
              </Text>
            </View>
            <Text style={s.chevronIcon}>⌵</Text>
          </Pressable>

          {/* Input: Vehicle Type Selector */}
          <Pressable
            onPress={() => setShowTypeModal(true)}
            style={s.inputCard}>
            <View style={s.inputIconBox}>
              <Image
                source={require('../../assets/icons/icon_bike.png')}
                style={s.fieldIcon}
                resizeMode="contain"
              />
            </View>
            <View style={s.fieldBody}>
              <Text style={s.fieldLabel}>Vehicle Type *</Text>
              <Text
                style={[
                  s.fieldPickerVal,
                  !selectedType && s.fieldPickerPlaceholder,
                ]}>
                {selectedType ? selectedType.vehicle_type_name : 'Select vehicle type'}
              </Text>
            </View>
            <Text style={s.chevronIcon}>⌵</Text>
          </Pressable>
        </View>

        {/* ================= 4. SAVE BUTTON ================= */}
        <Pressable
          onPress={handleSaveVehicle}
          disabled={isLoading}
          style={({ pressed }) => [
            s.saveBtn,
            pressed && s.saveBtnPressed,
            isLoading && { opacity: 0.7 },
          ]}>
          {isLoading ? (
            <Text style={s.saveBtnText}>{vehicle ? 'Updating...' : 'Saving...'}</Text>
          ) : (
            <>
              <Text style={s.saveBtnText}>{vehicle ? 'Update Vehicle' : 'Save Vehicle'}</Text>
              <Text style={s.saveBtnArrow}>→</Text>
            </>
          )}
        </Pressable>

        {/* ================= 5. TRUST BADGE ================= */}
        <View style={s.trustRow}>
          <Image
            source={require('../../assets/icons/icon_shield_check.png')}
            style={s.trustShieldIcon}
            resizeMode="contain"
          />
          <Text style={s.trustText}>
            Your vehicle details are safe and secure with S-Parking
          </Text>
        </View>

        {/* ================= 6. BOTTOM SKYLINE FOOTER ================= */}
        <View style={s.footerWrapper}>
          <UmangSkylineFooter />
        </View>
      </ScrollView>

      {/* ================= 🔥 1. LUXURY CENTERED VEHICLE TYPE POPUP ================= */}
      <Modal visible={showTypeModal} transparent animationType="fade" onRequestClose={() => setShowTypeModal(false)}>
        <View style={s.popupBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowTypeModal(false)} />

          <View style={s.popupCard}>

            {/* Popup Header */}
            <View style={s.popupHeaderRow}>
              <View>
                <View style={s.popupBadgeRow}>
                  <View style={s.popupThemeTag}>
                    <Text style={s.popupThemeTagText}>CLASSIFICATION</Text>
                  </View>
                </View>
                <Text style={s.popupTitle}>Select Vehicle Type</Text>
                <Text style={s.popupSubtitle}>Choose category for smart parking</Text>
              </View>

              <Pressable
                onPress={() => setShowTypeModal(false)}
                style={s.popupCloseCircle}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={s.popupCloseText}>✕</Text>
              </Pressable>
            </View>

            {/* 2-Column Luxury Tiles Grid */}
            <View style={s.typeGridPopup}>
              {vehicleTypes.map(vt => {
                const isSelected = selectedType?.vehicle_type_id === vt.vehicle_type_id;
                return (
                  <Pressable
                    key={vt.vehicle_type_id}
                    onPress={() => {
                      setSelectedType(vt);
                      setShowTypeModal(false);
                    }}
                    style={[
                      s.typeCardPopup,
                      isSelected && s.typeCardPopupSelected,
                    ]}>
                    <View style={[s.typeBubblePopup, isSelected && s.typeBubblePopupSelected]}>
                      <Image
                        source={getTypeIcon(vt.vehicle_type_id)}
                        style={[s.typeIconPopup, isSelected && { tintColor: colors.primary }]}
                        resizeMode="contain"
                      />
                    </View>

                    <Text
                      style={[
                        s.typeNamePopup,
                        isSelected && s.typeNamePopupSelected,
                      ]}
                      numberOfLines={1}>
                      {vt.vehicle_type_name}
                    </Text>

                    {isSelected && (
                      <View style={s.typeCheckBadge}>
                        <Text style={s.typeCheckText}>✓</Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>

            {/* Bottom Cancel Button */}
            <Pressable
              onPress={() => setShowTypeModal(false)}
              style={s.popupCancelBtn}>
              <Text style={s.popupCancelText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* ================= 🔥 2. LUXURY CENTERED VEHICLE COLOR POPUP (REAL SWATCHES) ================= */}
      <Modal visible={showColorModal} transparent animationType="fade" onRequestClose={() => setShowColorModal(false)}>
        <View style={s.popupBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowColorModal(false)} />

          <View style={s.popupCard}>

            {/* Popup Header */}
            <View style={s.popupHeaderRow}>
              <View>
                <View style={s.popupBadgeRow}>
                  <View style={s.popupThemeTag}>
                    <Text style={s.popupThemeTagText}>EXTERIOR PAINT</Text>
                  </View>
                </View>
                <Text style={s.popupTitle}>Select Vehicle Color</Text>
                <Text style={s.popupSubtitle}>Choose exterior shade as per vehicle RC</Text>
              </View>

              <Pressable
                onPress={() => setShowColorModal(false)}
                style={s.popupCloseCircle}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={s.popupCloseText}>✕</Text>
              </Pressable>
            </View>

            {/* 3-Column Swatch Tiles */}
            <ScrollView style={{ maxHeight: 310 }} showsVerticalScrollIndicator={false}>
              <View style={s.colorGridPopup}>
                {COLOR_SWATCHES.map(color => {
                  const isSelected = vehicleColor === color.name;
                  return (
                    <Pressable
                      key={color.name}
                      onPress={() => {
                        setVehicleColor(color.name);
                        setShowColorModal(false);
                      }}
                      style={[
                        s.colorCardPopup,
                        isSelected && s.colorCardPopupSelected,
                      ]}>

                      {/* Realistic Paint Swatch Circle */}
                      <View
                        style={[
                          s.colorCirclePopup,
                          {
                            backgroundColor: color.hex,
                            borderColor: color.border,
                          },
                        ]}>
                        {isSelected && (
                          <Text style={[s.colorCheckmarkPopup, { color: color.checkColor }]}>✓</Text>
                        )}
                      </View>

                      <Text
                        style={[
                          s.colorNamePopup,
                          isSelected && s.colorNamePopupSelected,
                        ]}
                        numberOfLines={1}>
                        {color.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>

            {/* Bottom Cancel Button */}
            <Pressable
              onPress={() => setShowColorModal(false)}
              style={s.popupCancelBtn}>
              <Text style={s.popupCancelText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* ================= SUCCESS MODAL ================= */}
      <Modal visible={showSuccessModal} transparent animationType="fade">
        <View style={s.popupBackdrop}>
          <View style={[s.popupCard, { alignItems: 'center', paddingVertical: 26 }]}>
            <View style={s.successCircle}>
              <Text style={s.successCheck}>✓</Text>
            </View>
            <Text style={[s.popupTitle, { marginTop: 14, marginBottom: 6, fontSize: 19 }]}>
              Vehicle {vehicle ? 'Updated' : 'Added'}!
            </Text>
            <Text style={{ fontSize: 13, color: '#64748B', textAlign: 'center', marginBottom: 20, paddingHorizontal: 8, lineHeight: 18 }}>
              Vehicle <Text style={{ fontWeight: '800', color: '#0F172A' }}>{vehicleNumber.toUpperCase()}</Text> has been successfully saved to your profile.
            </Text>

            <Pressable
              onPress={() => {
                setShowSuccessModal(false);
                if (onVehicleAdded) onVehicleAdded();
                else onBack();
              }}
              style={s.successBtn}>
              <Text style={s.successBtnText}>Done — Go Back</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* ================= IMAGE PICKER ACTION SHEET ================= */}
      <ImagePickerActionSheet
        visible={showImagePickerModal}
        onClose={() => setShowImagePickerModal(false)}
        onTakePhoto={handleTakePhoto}
        onPickGallery={handlePickFromGallery}
        title="Add Vehicle Photo"
        subtitle="Choose a source to add your vehicle image"
      />

      {/* ================= IN-APP VISION CAMERA ================= */}
      <VisionCamera
        visible={showVisionCamera}
        onClose={() => setShowVisionCamera(false)}
        onCapture={(base64) => {
          setVehicleImage(base64);
          setShowVisionCamera(false);
        }}
      />

      {/* ================= CAR LOADER ================= */}
      <CarLoader visible={isLoading} message={vehicle ? "Updating vehicle..." : "Saving vehicle..."} />

      <ErrorModal
        visible={!!apiError}
        message={apiError || ''}
        onClose={() => setApiError(null)}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  logoContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    width: 48,
    height: 48,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 12,
  },

  /* Avatar */
  avatarSection: {
    alignItems: 'center',
    marginVertical: 12,
  },
  avatarContainer: {
    width: 126,
    height: 126,
    borderRadius: 63,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarImage: {
    width: 126,
    height: 126,
    borderRadius: 63,
  },
  cameraBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  photoTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 10,
  },
  photoSubtitle: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
  },

  /* Form */
  formContainer: {
    marginTop: 10,
    gap: 9,
  },
  inputCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 7,
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  inputIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
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
  fieldLabel: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 1,
  },
  fieldInput: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    paddingVertical: 0,
    height: 20,
  },
  fieldPickerVal: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 1,
  },
  fieldPickerPlaceholder: {
    color: '#94A3B8',
    fontWeight: '500',
  },
  chevronIcon: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '800',
    marginRight: 4,
  },

  /* Save Button */
  saveBtn: {
    backgroundColor: colors.primary,
    height: 50,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 18,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  saveBtnPressed: {
    backgroundColor: colors.primaryDark,
    transform: [{ scale: 0.98 }],
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  saveBtnArrow: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  /* Trust */
  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 16,
  },
  trustShieldIcon: {
    width: 14,
    height: 14,
    tintColor: colors.primary,
  },
  trustText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },

  /* Skyline Footer */
  footerWrapper: {
    marginHorizontal: -20,
    marginTop: 8,
    alignItems: 'center',
  },

  /* ================= 🔥 LUXURY CENTERED POPUP STYLES ================= */
  popupBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.68)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  popupCard: {
    width: '100%',
    maxWidth: 350,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 12,
  },
  popupHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  popupBadgeRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  popupThemeTag: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  popupThemeTagText: {
    fontSize: 8.5,
    fontWeight: '900',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  popupTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  popupSubtitle: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 1,
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

  /* 2-Column Vehicle Type Popup Tiles */
  typeGridPopup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  typeCardPopup: {
    width: '48%',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingVertical: 16,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  typeCardPopupSelected: {
    backgroundColor: '#FFF7ED',
    borderColor: colors.primary,
  },
  typeBubblePopup: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  typeBubblePopupSelected: {
    borderColor: '#FED7AA',
  },
  typeIconPopup: {
    width: 22,
    height: 22,
    tintColor: '#64748B',
  },
  typeNamePopup: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#334155',
    textAlign: 'center',
  },
  typeNamePopupSelected: {
    color: colors.primary,
    fontWeight: '900',
  },
  typeCheckBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeCheckText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },

  /* 3-Column Vehicle Color Popup Grid */
  colorGridPopup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
    paddingBottom: 6,
  },
  colorCardPopup: {
    width: '31%',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    paddingVertical: 10,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  colorCardPopupSelected: {
    backgroundColor: '#FFF7ED',
    borderColor: colors.primary,
    borderWidth: 1.5,
  },
  colorCirclePopup: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 5,
  },
  colorCheckmarkPopup: {
    fontSize: 11,
    fontWeight: '900',
  },
  colorNamePopup: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    textAlign: 'center',
  },
  colorNamePopupSelected: {
    color: colors.primary,
    fontWeight: '900',
  },

  /* Popup Cancel Button */
  popupCancelBtn: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  popupCancelText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#64748B',
  },

  /* Success Modal */
  successCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#BBF7D0',
  },
  successCheck: {
    fontSize: 26,
    fontWeight: '900',
    color: '#16A34A',
  },
  successBtn: {
    width: '100%',
    backgroundColor: colors.primary,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  successBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
});