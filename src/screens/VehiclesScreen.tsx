import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  RefreshControl,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { citizenService } from '../services/citizenService';
import CivicNavbar from '../components/CivicNavbar';
import CarLoader from '../components/CarLoader';
import { getVehicleImageSource } from '../constants/defaultVehicleImage';
import { getErrorMessage } from '../utils/errorUtils';
import ErrorModal from '../components/ErrorModal';

/* ================= CUSTOM ICONS ================= */
const EditIcon = ({ size = 18, color = '#3B82F6' }: { size?: number, color?: string }) => {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '45deg' }] }}>
      {/* Pencil tip */}
      <View style={{
        width: 0, height: 0,
        backgroundColor: 'transparent',
        borderStyle: 'solid',
        borderLeftWidth: size * 0.15,
        borderRightWidth: size * 0.15,
        borderBottomWidth: size * 0.2,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderBottomColor: color,
        marginBottom: -1,
      }} />
      {/* Pencil body */}
      <View style={{
        width: size * 0.3,
        height: size * 0.45,
        borderWidth: 1.5,
        borderColor: color,
        backgroundColor: 'transparent',
        borderBottomWidth: 0,
      }} />
      {/* Pencil Eraser */}
      <View style={{
        width: size * 0.3,
        height: size * 0.15,
        backgroundColor: color,
        borderBottomLeftRadius: size * 0.1,
        borderBottomRightRadius: size * 0.1,
      }} />
    </View>
  );
};

const DeleteIcon = ({ size = 18, color = '#EF4444' }: { size?: number, color?: string }) => {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* Lid handle */}
      <View style={{
        width: size * 0.3,
        height: size * 0.12,
        borderWidth: 1.5,
        borderColor: color,
        borderBottomWidth: 0,
        borderTopLeftRadius: 3,
        borderTopRightRadius: 3,
      }} />
      {/* Lid cover */}
      <View style={{
        width: size * 0.8,
        height: 1.5,
        backgroundColor: color,
        borderRadius: 1,
      }} />
      {/* Bin body */}
      <View style={{
        width: size * 0.55,
        height: size * 0.65,
        borderWidth: 1.5,
        borderColor: color,
        borderTopWidth: 0,
        borderBottomLeftRadius: 3,
        borderBottomRightRadius: 3,
        marginTop: 1.5,
        flexDirection: 'row',
        justifyContent: 'space-evenly',
        alignItems: 'center',
      }}>
        <View style={{ width: 1.5, height: '70%', backgroundColor: color, borderRadius: 1 }} />
        <View style={{ width: 1.5, height: '70%', backgroundColor: color, borderRadius: 1 }} />
      </View>
    </View>
  );
};

interface VehiclesScreenProps {
  onBack: () => void;
  onAdd: () => void;
  onEdit?: (vehicle: any) => void;
}

export default function VehiclesScreen({ onBack, onAdd, onEdit }: VehiclesScreenProps) {
  const insets = useSafeAreaInsets();
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [vehicleToDelete, setVehicleToDelete] = useState<any>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      const data = await citizenService.getCitizenVehicles();
      // Ensure we only set array
      setVehicles(Array.isArray(data) ? data : []);
    } catch (error) {
      console.log('Failed to fetch vehicles', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (vehicle: any) => {
    setVehicleToDelete(vehicle);
  };

  const confirmDelete = async () => {
    if (!vehicleToDelete) return;

    try {
      const vid = vehicleToDelete.vehicle_id;
      setVehicleToDelete(null); // close modal immediately
      setLoading(true);
      await citizenService.deleteCitizenVehicle(vid);
      await fetchVehicles();
    } catch (err: any) {
      setLoading(false);
      setApiError(getErrorMessage(err, 'Failed to delete vehicle.'));
    }
  };

  const getVehicleIcon = (typeId: number) => {
    if (typeId === 2) return require('../../assets/icons/icon_bike.png');
    return require('../../assets/icons/icon_car.png');
  };

  return (
    <View style={s.container}>
      {/* Status Bar */}
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      {/* ================= HEADER / NAVBAR ================= */}
      <CivicNavbar
        title="My Vehicles"
        onBack={onBack}
        rightContent={
          <Pressable
            onPress={onAdd}
            style={({ pressed }) => [s.addNavBtn, pressed && s.addNavBtnPressed]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={s.addNavBtnText}>+ Add</Text>
          </Pressable>
        }
      />

      <ScrollView
        style={s.scroll}
        contentContainerStyle={[
          s.scrollContent,
          { paddingBottom: 40 + Math.max(insets.bottom, 14) },
        ]}
        showsVerticalScrollIndicator={false}>

        {/* Header Subtitle */}
        <Text style={s.sectionSubtitle}>
          Manage your saved vehicles for automatic barrier entry & contactless FASTag deduction.
        </Text>

        {/* ================= ADD MORE BUTTON (NOW ON TOP) ================= */}
        <Pressable
          onPress={onAdd}
          style={({ pressed }) => [s.addTopBtn, pressed && s.addTopBtnPressed]}>
          <View style={s.plusCircle}>
            <Text style={s.plusIcon}>+</Text>
          </View>
          <View style={s.addTopTextCol}>
            <Text style={s.addTopTitle}>Add New Vehicle</Text>
            <Text style={s.addTopSub}>Register a car, bike or commercial vehicle</Text>
          </View>
          <Text style={s.arrowRight}>→</Text>
        </Pressable>

        {/* Section Header */}
        <View style={s.listHeaderRow}>
          <Text style={s.listHeaderText}>YOUR SAVED VEHICLES ({vehicles.length})</Text>
        </View>

        {/* ================= IMPROVED VEHICLE LIST CARDS ================= */}
        {!loading && vehicles.length === 0 ? (
          <View style={s.emptyState}>
            <Text style={s.emptyStateText}>No vehicles found. Add your first vehicle above.</Text>
          </View>
        ) : (
          vehicles.map((v, i) => (
            <View key={i} style={[s.vehicleCard, i === 0 && s.vehicleCardDefault]}>
              {/* Card Header Info */}
              <View style={s.cardTop}>
                <Pressable
                  onPress={() => {
                    if (v.vehicle_image) {
                      setSelectedImage(v.vehicle_image);
                    }
                  }}
                  style={[s.iconBox, v.vehicle_image ? s.photoBox : null]}>
                  {v.vehicle_image ? (
                    <Image source={getVehicleImageSource(v.vehicle_image)} style={s.vehPhoto} />
                  ) : (
                    <Image source={getVehicleIcon(v.vehicle_type_id)} style={s.vehIcon} resizeMode="contain" />
                  )}
                </Pressable>

                <View style={{ flex: 1 }}>
                  <View style={s.plateRow}>
                    <View style={s.numberPlateContainer}>
                      <View style={s.numberPlate}>
                        <Text style={s.indTag}>IND</Text>
                        <Text style={s.vehNumber}>{v.vehicle_number}</Text>
                      </View>
                      {i === 0 && (
                        <View style={[s.defaultBadge, { marginTop: 4, alignSelf: 'flex-start' }]}>
                          <Text style={s.defaultBadgeText}>★ DEFAULT</Text>
                        </View>
                      )}
                    </View>
                    <View style={s.actionsRow}>
                      <Pressable onPress={() => onEdit?.(v)} style={[s.actionBtn, { backgroundColor: '#EFF6FF' }]}>
                        <EditIcon size={16} color="#3B82F6" />
                      </Pressable>
                      <Pressable onPress={() => handleDelete(v)} style={[s.actionBtn, { backgroundColor: '#FEF2F2' }]}>
                        <DeleteIcon size={16} color="#EF4444" />
                      </Pressable>
                    </View>
                  </View>

                  <Text style={s.vehModel}>
                    {v.vehicle_brand || v.vehicle_make || 'Unknown'} {v.vehicle_model || ''}
                    <Text style={s.vehCategory}> • {v.vehicle_type_name}</Text>
                  </Text>
                </View>
              </View>

              <View style={s.divider} />

              {/* Card Footer Details */}
              <View style={s.cardBottom}>
                <View style={s.fastagCol}>
                  <View style={s.fastagStatusRow}>
                    <View
                      style={[
                        s.statusDot,
                        { backgroundColor: '#16A34A' },
                      ]}
                    />
                    <Text style={s.metaVal}>Active</Text>
                  </View>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* ================= FULL SCREEN IMAGE MODAL ================= */}
      <Modal visible={!!selectedImage} transparent animationType="fade" statusBarTranslucent>
        <View style={s.fullScreenContainer}>
          <Pressable
            style={[s.closeBtn, { top: Math.max(insets.top, 20) + 10 }]}
            onPress={() => setSelectedImage(null)}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
            <Text style={s.closeIcon}>✕</Text>
          </Pressable>
          {selectedImage && (
            <Image source={getVehicleImageSource(selectedImage)} style={s.fullScreenImage} resizeMode="contain" />
          )}
        </View>
      </Modal>

      {/* ================= DELETE CONFIRMATION MODAL ================= */}
      <Modal visible={!!vehicleToDelete} transparent animationType="fade">
        <View style={s.modalBackdrop}>
          <View style={s.deleteModalCard}>
            <View style={s.deleteIconWrapper}>
              <DeleteIcon size={32} color="#EF4444" />
            </View>
            <Text style={s.deleteModalTitle}>Delete Vehicle?</Text>
            <Text style={s.deleteModalText}>
              Are you sure you want to delete <Text style={{ fontWeight: '700', color: '#0F172A' }}>{vehicleToDelete?.vehicle_number}</Text>? This action cannot be undone.
            </Text>
            <View style={s.deleteModalActions}>
              <Pressable style={s.deleteCancelBtn} onPress={() => setVehicleToDelete(null)}>
                <Text style={s.deleteCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={s.deleteConfirmBtn} onPress={confirmDelete}>
                <Text style={s.deleteConfirmText}>Delete</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ================= CUSTOM CAR LOADER ================= */}
      <CarLoader visible={loading} message="Loading vehicles..." />

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
  addNavBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
  },
  addNavBtnPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
  },
  addNavBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  sectionSubtitle: {
    fontSize: 12.5,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 16,
  },

  /* Top Add Button */
  addTopBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  addTopBtnPressed: {
    backgroundColor: '#FFF7ED',
  },
  plusCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  plusIcon: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.primary,
    marginTop: -1,
  },
  addTopTextCol: {
    flex: 1,
    marginLeft: 12,
  },
  addTopTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: colors.primary,
  },
  addTopSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
    fontWeight: '500',
  },
  arrowRight: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary,
    paddingRight: 4,
  },

  /* List Header */
  listHeaderRow: {
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  listHeaderText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.6,
  },

  /* Vehicle Card */
  vehicleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginBottom: 14,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },
  vehicleCardDefault: {
    borderColor: '#FED7AA',
    borderWidth: 1.5,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FFEDD5',
  },
  vehIcon: {
    width: 26,
    height: 26,
    tintColor: colors.primary,
  },
  plateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  numberPlate: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  indTag: {
    fontSize: 8,
    fontWeight: '900',
    color: '#0284C7',
    marginRight: 4,
  },
  vehNumber: {
    fontSize: 14.5,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 0.5,
  },
  defaultBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: '#86EFAC',
  },
  defaultBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#15803D',
  },
  vehModel: {
    fontSize: 13,
    color: '#0F172A',
    marginTop: 6,
    fontWeight: '700',
  },
  vehCategory: {
    color: '#64748B',
    fontWeight: '500',
    fontSize: 12,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fastagCol: {
    justifyContent: 'center',
  },
  metaLabel: {
    fontSize: 9.5,
    color: '#94A3B8',
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  fastagStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  metaVal: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '700',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: '#BBF7D0',
  },
  verifiedCheck: {
    fontSize: 12,
    color: '#16A34A',
    fontWeight: '900',
  },
  verifiedText: {
    fontSize: 11,
    color: '#16A34A',
    fontWeight: '800',
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 20,
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyStateText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },

  /* Image Additions */
  photoBox: {
    padding: 0,
    overflow: 'hidden',
    backgroundColor: '#0F172A',
    borderColor: '#E2E8F0',
  },
  vehPhoto: {
    width: '100%',
    height: '100%',
  },

  /* Full Screen Image Modal */
  fullScreenContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtn: {
    position: 'absolute',
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  closeIcon: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
    marginTop: -2,
  },
  fullScreenImage: {
    width: '100%',
    height: '80%',
  },

  /* Edit / Delete actions */
  numberPlateContainer: {
    flex: 1,
    alignItems: 'flex-start',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIconText: {
    fontSize: 14,
  },

  /* Delete Modal Styles */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  deleteModalCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  deleteIconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  deleteModalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
  },
  deleteModalText: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  deleteModalActions: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    gap: 12,
  },
  deleteCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  deleteCancelText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#475569',
  },
  deleteConfirmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#EF4444',
    alignItems: 'center',
  },
  deleteConfirmText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});