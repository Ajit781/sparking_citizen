import React, { useEffect, useState, useMemo } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  Pressable,
  Image,
  Modal,
  StatusBar,
} from 'react-native';
import CivicNavbar from '../components/CivicNavbar';
import { colors } from '../theme/colors';
import { citizenService } from '../services/citizenService';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CarLoader from '../components/CarLoader';

export default function MyGrievancesScreen({ onBack, onPostGrievance }: { onBack: () => void, onPostGrievance?: () => void }) {
  const insets = useSafeAreaInsets();
  const [grievances, setGrievances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'OPEN' | 'RESOLVED'>('ALL');

  // Full-screen Image Modal State
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  const fetchGrievances = async () => {
    try {
      const result = await citizenService.getCitizenGrievancesByLogin();
      let list = [];
      if (Array.isArray(result)) {
        list = result;
      } else if (result && Array.isArray(result.data)) {
        list = result.data;
      } else if (result && Array.isArray(result.list)) {
        list = result.list;
      } else if (result && Array.isArray(result.grievances)) {
        list = result.grievances;
      } else if (result && Array.isArray(result.grievance_list)) {
        list = result.grievance_list;
      }
      setGrievances(list);
    } catch (error) {
      console.log('Error fetching grievances:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchGrievances();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchGrievances();
  };

  const getSeverityTheme = (severityName: string) => {
    const s = (severityName || '').toUpperCase();
    if (s.includes('HIGH') || s.includes('CRITICAL')) {
      return { text: '#DC2626', bg: '#FEF2F2', border: '#FECACA' };
    }
    if (s.includes('MEDIUM')) {
      return { text: '#D97706', bg: '#FFFBEB', border: '#FDE68A' };
    }
    return { text: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0' };
  };

  const getStatusTheme = (statusName: string) => {
    const s = (statusName || '').toUpperCase();
    if (s.includes('RESOLVED') || s.includes('CLOSED')) {
      return { text: '#16A34A', bg: '#DCFCE7', border: '#BBF7D0', dot: '#16A34A' };
    }
    if (s.includes('PROGRESS') || s.includes('ASSIGNED')) {
      return { text: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE', dot: '#2563EB' };
    }
    return { text: colors.primary, bg: '#FFF7ED', border: '#FED7AA', dot: colors.primary };
  };

  // Filtered grievances list
  const filteredGrievances = useMemo(() => {
    if (activeFilter === 'ALL') return grievances;
    if (activeFilter === 'OPEN') {
      return grievances.filter(g => {
        const s = (g?.status?.name || g.status_name || '').toUpperCase();
        return !s.includes('RESOLVED') && !s.includes('CLOSED');
      });
    }
    if (activeFilter === 'RESOLVED') {
      return grievances.filter(g => {
        const s = (g?.status?.name || g.status_name || '').toUpperCase();
        return s.includes('RESOLVED') || s.includes('CLOSED');
      });
    }
    return grievances;
  }, [grievances, activeFilter]);

  // Counts
  const openCount = useMemo(() => {
    return grievances.filter(g => {
      const s = (g?.status?.name || g.status_name || '').toUpperCase();
      return !s.includes('RESOLVED') && !s.includes('CLOSED');
    }).length;
  }, [grievances]);

  const resolvedCount = useMemo(() => {
    return grievances.filter(g => {
      const s = (g?.status?.name || g.status_name || '').toUpperCase();
      return s.includes('RESOLVED') || s.includes('CLOSED');
    }).length;
  }, [grievances]);

  const renderItem = ({ item }: { item: any }) => {
    const typeName = item?.grievance_type?.name || item.grievance_type_name || 'Grievance';
    const severityName = item?.severity?.name || item.severity_name || 'Medium';
    const statusName = item?.status?.name || item.status_name || 'Submitted';
    const ticketNo = item.grievance_no || item.ticket_no || item.id || 'N/A';
    const dateStr = item.submitted_on || item.created_at || item.created_date || item.lodged_on || '';
    const imageUrl = item.image?.file_path || null;
    const adminRemarks = item.admin_remarks || item.resolution_remarks;

    // Address compilation
    const locationAddr = item.location_address;
    const landmark = item.landmark;
    const parkingArea = item.parking_area?.address || item.parking_area?.code;

    let formattedDate = dateStr;
    try {
      if (dateStr) {
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) {
          formattedDate = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        }
      }
    } catch (e) { }

    const statusTheme = getStatusTheme(statusName);
    const severityTheme = getSeverityTheme(severityName);

    return (
      <View style={s.card}>

        {/* 1. Header Ribbon (Ticket ID Badge + Live Status Pill) */}
        <View style={s.cardHeader}>
          <View style={s.ticketPill}>
            <Image
              source={require('../../assets/icons/icon_file_text.png')}
              style={s.ticketMiniIcon}
              resizeMode="contain"
            />
            <Text style={s.ticketText}>#{ticketNo}</Text>
          </View>

          <View style={[s.statusBadge, { backgroundColor: statusTheme.bg, borderColor: statusTheme.border }]}>
            <View style={[s.statusDot, { backgroundColor: statusTheme.dot }]} />
            <Text style={[s.statusText, { color: statusTheme.text }]}>{statusName}</Text>
          </View>
        </View>

        {/* 2. Main Content Row (Title, Description & Photo) */}
        <View style={s.contentRow}>
          <View style={s.textColumn}>
            <Text style={s.title}>{typeName}</Text>

            {item.grievance_text ? (
              <View style={s.descBox}>
                <Text style={s.description} numberOfLines={3}>
                  "{item.grievance_text}"
                </Text>
              </View>
            ) : null}

            {/* Location & Slot Information */}
            <View style={s.locationBlock}>
              {parkingArea ? (
                <View style={s.infoRow}>
                  <Image
                    source={require('../../assets/icons/nav_parking.png')}
                    style={s.infoIconImg}
                    resizeMode="contain"
                  />
                  <Text style={s.infoText} numberOfLines={1}>{parkingArea}</Text>
                </View>
              ) : null}

              {locationAddr ? (
                <View style={s.infoRow}>
                  <Image
                    source={require('../../assets/icons/booking_history_location_pin.png')}
                    style={s.infoIconImg}
                    resizeMode="contain"
                  />
                  <Text style={s.infoText} numberOfLines={1}>{locationAddr}</Text>
                </View>
              ) : null}

              {landmark ? (
                <View style={s.infoRow}>
                  <Image
                    source={require('../../assets/icons/booking_history_location_pin.png')}
                    style={[s.infoIconImg, { tintColor: colors.primary }]}
                    resizeMode="contain"
                  />
                  <Text style={s.infoText} numberOfLines={1}>Near {landmark}</Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* Photo Thumbnail */}
          {imageUrl ? (
            <Pressable
              style={s.thumbWrapper}
              onPress={() => setFullscreenImage(imageUrl)}>
              <Image source={{ uri: imageUrl }} style={s.thumbImage} resizeMode="cover" />
              <View style={s.zoomOverlay}>
                <Image
                  source={require('../../assets/icons/icon_camera_real.png')}
                  style={s.cameraIconMini}
                  resizeMode="contain"
                />
              </View>
            </Pressable>
          ) : null}
        </View>

        {/* 3. Official Municipal Remarks Section */}
        {adminRemarks ? (
          <View style={s.remarksCard}>
            <View style={s.remarksHeader}>
              <Image
                source={require('../../assets/icons/icon_shield_check.png')}
                style={s.shieldIconMini}
                resizeMode="contain"
              />
              <Text style={s.remarksLabel}>OFFICIAL RESOLUTION REMARKS</Text>
            </View>
            <Text style={s.remarksText}>{adminRemarks}</Text>
          </View>
        ) : null}

        {/* 4. Footer (Severity & Lodged Date) */}
        <View style={s.footer}>
          <View style={s.footerItem}>
            <Text style={s.footerLabel}>SEVERITY LEVEL</Text>
            <View style={[s.severityPill, { backgroundColor: severityTheme.bg, borderColor: severityTheme.border }]}>
              <View style={[s.severityDot, { backgroundColor: severityTheme.text }]} />
              <Text style={[s.severityValue, { color: severityTheme.text }]}>{severityName}</Text>
            </View>
          </View>

          <View style={[s.footerItem, { alignItems: 'flex-end' }]}>
            <Text style={s.footerLabel}>LODGED ON</Text>
            <Text style={s.footerDateValue}>{formattedDate || 'Recent'}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      {/* ================= 1. REUSABLE CIVIC NAVBAR ================= */}
      <CivicNavbar
        title="My Grievances"


        onBack={onBack}
        rightContent={
          onPostGrievance ? (
            <Pressable
              onPress={onPostGrievance}
              style={({ pressed }) => [s.newGrievanceBtn, pressed && s.newGrievanceBtnPressed]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={s.newGrievanceIcon}>+</Text>
              <Text style={s.newGrievanceText}>New</Text>
            </Pressable>
          ) : undefined
        }
      />

      {/* ================= 2. SEGMENTED FILTER PILLS ================= */}
      <View style={s.tabsWrapper}>
        <View style={s.tabsPillBox}>
          {[
            { id: 'ALL', label: 'All', count: grievances.length },
            { id: 'OPEN', label: 'Pending / Active', count: openCount },
            { id: 'RESOLVED', label: 'Resolved', count: resolvedCount },
          ].map(tab => {
            const isActive = activeFilter === tab.id;
            return (
              <Pressable
                key={tab.id}
                onPress={() => setActiveFilter(tab.id as any)}
                style={[s.tabPill, isActive && s.tabPillActive]}>
                <Text style={[s.tabPillText, isActive && s.tabPillTextActive]}>
                  {tab.label}
                </Text>
                <View style={[s.tabCountBadge, isActive && s.tabCountBadgeActive]}>
                  <Text style={[s.tabCountText, isActive && s.tabCountTextActive]}>
                    {tab.count}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* ================= 3. GRIEVANCES LIST ================= */}
      {filteredGrievances.length === 0 && !loading ? (
        <View style={s.center}>
          <View style={s.emptyIconCircle}>
            <Image
              source={require('../../assets/icons/icon_file_text.png')}
              style={s.emptyIconImg}
              resizeMode="contain"
            />
          </View>
          <Text style={s.emptyTitle}>
            {activeFilter === 'ALL' ? 'No Grievances Lodged' : `No ${activeFilter.toLowerCase()} grievances`}
          </Text>
          <Text style={s.emptySubtitle}>
            {activeFilter === 'ALL'
              ? "You haven't reported any parking or slot issues yet."
              : `You have no grievances under '${activeFilter.toLowerCase()}' status.`}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredGrievances}
          keyExtractor={(_, index) => index.toString()}
          renderItem={renderItem}
          contentContainerStyle={[
            s.listContent,
            { paddingBottom: 30 + Math.max(insets.bottom, 16) },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
            />
          }
        />
      )}

      {/* ================= 4. FULLSCREEN IMAGE MODAL ================= */}
      <Modal visible={!!fullscreenImage} transparent={true} animationType="fade">
        <View style={s.fullscreenModal}>
          <Pressable
            style={[s.closeModalBtn, { top: Math.max(insets.top, 16) + 10 }]}
            onPress={() => setFullscreenImage(null)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={s.closeModalText}>✕</Text>
          </Pressable>
          {fullscreenImage ? (
            <Image
              source={{ uri: fullscreenImage }}
              style={s.fullscreenImage}
              resizeMode="contain"
            />
          ) : null}
        </View>
      </Modal>

      {/* ================= 5. CUSTOM CAR LOADER ================= */}
      <CarLoader visible={loading && !refreshing} message="Fetching your grievances..." />
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F8FAFD',
  },

  /* Segmented Filter Pills */
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
    padding: 3.5,
    gap: 4,
  },
  tabPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 9,
    gap: 5,
  },
  tabPillActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  tabPillText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#64748B',
  },
  tabPillTextActive: {
    color: '#0F172A',
    fontWeight: '900',
  },
  tabCountBadge: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
  },
  tabCountBadgeActive: {
    backgroundColor: colors.primary,
  },
  tabCountText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#64748B',
  },
  tabCountTextActive: {
    color: '#FFFFFF',
    fontWeight: '900',
  },

  /* Empty State */
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFF7ED',
    borderWidth: 1.5,
    borderColor: '#FED7AA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyIconImg: {
    width: 32,
    height: 32,
    tintColor: colors.primary,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 270,
  },

  listContent: {
    padding: 16,
    paddingTop: 14,
  },

  /* Card */
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  ticketPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 6,
  },
  ticketMiniIcon: {
    width: 13,
    height: 13,
    tintColor: '#64748B',
  },
  ticketText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
    letterSpacing: 0.3,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: 10,
    borderWidth: 1,
    gap: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 10.5,
    fontWeight: '900',
    letterSpacing: 0.4,
  },

  /* Content */
  contentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  textColumn: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 8,
    lineHeight: 22,
    letterSpacing: 0.2,
  },
  descBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 10,
  },
  description: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 17,
    fontStyle: 'italic',
  },
  locationBlock: {
    gap: 5,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  infoIconImg: {
    width: 13,
    height: 13,
    tintColor: '#64748B',
  },
  infoText: {
    fontSize: 11.5,
    color: '#475569',
    fontWeight: '600',
    flexShrink: 1,
  },

  /* Thumbnail */
  thumbWrapper: {
    width: 72,
    height: 72,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    position: 'relative',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  zoomOverlay: {
    position: 'absolute',
    bottom: 3,
    right: 3,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraIconMini: {
    width: 12,
    height: 12,
    tintColor: '#FFFFFF',
  },

  /* Official Remarks Card */
  remarksCard: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1.2,
    borderColor: '#FEF3C7',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  remarksHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  shieldIconMini: {
    width: 13,
    height: 13,
    tintColor: '#D97706',
  },
  remarksLabel: {
    fontSize: 9.5,
    fontWeight: '900',
    color: '#B45309',
    letterSpacing: 0.5,
  },
  remarksText: {
    fontSize: 12,
    color: '#78350F',
    fontWeight: '600',
    lineHeight: 17,
  },

  /* Footer */
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
    paddingTop: 12,
  },
  footerItem: {
    flex: 1,
  },
  footerLabel: {
    fontSize: 9,
    color: '#94A3B8',
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  severityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: 'flex-start',
    gap: 4,
  },
  severityDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  severityValue: {
    fontSize: 10.5,
    fontWeight: '800',
  },
  footerDateValue: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '700',
  },

  /* Fullscreen Modal */
  fullscreenModal: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenImage: {
    width: '100%',
    height: '80%',
  },
  closeModalBtn: {
    position: 'absolute',
    right: 20,
    zIndex: 100,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  closeModalText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },
  newGrievanceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  newGrievanceBtnPressed: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  newGrievanceIcon: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 4,
    marginTop: -2,
  },
  newGrievanceText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
});