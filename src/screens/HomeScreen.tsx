import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Image,
    Pressable,
    ScrollView,
    FlatList,
    Alert,
    Modal,
    StatusBar,
    Linking,
    TextInput,
    PermissionsAndroid,
    Platform,
    Animated,
    Dimensions,
    requireNativeComponent,
    RefreshControl,
    NativeModules,
} from 'react-native';

const NativeMultiMap = requireNativeComponent('NativeMultiMap');
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { ScreenName } from '../types/navigation';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { authService } from '../services/authService';
import { UserSession } from '../services/storageService';
import { citizenService, CitizenProfile, calculateProfileCompletion } from '../services/citizenService';
import Geolocation from '@react-native-community/geolocation';
import Voice, { SpeechResultsEvent, SpeechErrorEvent } from '@react-native-voice/voice';
import CarLoader from '../components/CarLoader';

interface HomeScreenProps {
    go: (s: ScreenName) => void;
    onLogout?: () => void;
}

let cachedParkingLots: any[] = [];
let cachedMapRegion: any = null;
let lastFetchTime: number = 0;

export default function HomeScreen({ go, onLogout }: HomeScreenProps) {
    const insets = useSafeAreaInsets();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedAddress, setSelectedAddress] = useState('');
    const [activeCategory, setActiveCategory] = useState<number | null>(null);
    const [vehicleTypes, setVehicleTypes] = useState<any[]>([]);
    const [viewMode, setViewMode] = useState<'both' | 'map' | 'list'>('both');
    const [selectedLotId, setSelectedLotId] = useState('jadavpur_gate');
    const [showNotifModal, setShowNotifModal] = useState(false);
    const [userSession, setUserSession] = useState<UserSession | null>(null);
    const [citizenProfile, setCitizenProfile] = useState<CitizenProfile | null>(null);
    const [profileCompletionPercent, setProfileCompletionPercent] = useState<number>(0);
    const [showProfilePromptModal, setShowProfilePromptModal] = useState<boolean>(false);

    // Voice Search State
    const [isListening, setIsListening] = useState<boolean>(false);
    const [listeningText, setListeningText] = useState<string>('Listening...');
    const [voiceError, setVoiceError] = useState<string>('');

    // Google Places Search State
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearchingPlaces, setIsSearchingPlaces] = useState<boolean>(false);
    const GOOGLE_API_KEY = 'AIzaSyAcBZVUBHhKE_HU7t0JGFq6mQV-p-mBVXQ';

    // Map Touch & Scroll Control
    const [mapScrollEnabled, setMapScrollEnabled] = useState<boolean>(true);

    const [isProfileLoaded, setIsProfileLoaded] = useState<boolean>(false);
    const [isFetchingDetails, setIsFetchingDetails] = useState<boolean>(false);
    const [isBooking, setIsBooking] = useState<boolean>(false);
    const [visibleCount, setVisibleCount] = useState<number>(10);
    const [showScrollToTop, setShowScrollToTop] = useState<boolean>(false);

    // Map Reference
    const flatListRef = useRef<FlatList>(null);
    const mapRef = useRef<any>(null);

    // Dynamic Parking Lots State
    const [parkingLots, setParkingLots] = useState<any[]>(cachedParkingLots);
    const [bookingDisabledModal, setBookingDisabledModal] = useState({ visible: false, lotName: '' });
    const [selectedParkingForModal, setSelectedParkingForModal] = useState<any>(null);
    const [markersReady, setMarkersReady] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [mapRegion, setMapRegion] = useState<{
        latitude: number;
        longitude: number;
        latitudeDelta: number;
        longitudeDelta: number;
    } | null>(cachedMapRegion);
    const [searchCenter, setSearchCenter] = useState<{ lat: number, lng: number } | null>(
        cachedMapRegion ? { lat: cachedMapRegion.latitude, lng: cachedMapRegion.longitude } : null
    );

    const fetchNearbyParking = async (lat: number, lng: number, force = false, vType: number | null = null) => {
        setSearchCenter({ lat, lng });
        if (!force && cachedParkingLots.length > 0 && Date.now() - lastFetchTime < 300000) {
            return;
        }
        try {
            const data = await citizenService.getCitizenNearbyParkingAreas(lat, lng, 2, vType);
            if (data && data.length > 0) {
                console.log('PARKING LOT DATA:', JSON.stringify(data[0]));
            }
            setMarkersReady(false);
            cachedParkingLots = data || [];
            lastFetchTime = Date.now();
            setParkingLots(data || []);
        } catch (error) {
            console.log('Failed to fetch nearby parking areas:', error);
        }
    };

    const handleCategorySelect = (id: number | null) => {
        setActiveCategory(id);
        if (searchCenter) {
            fetchNearbyParking(searchCenter.lat, searchCenter.lng, true, id);
        } else if (mapRegion) {
            fetchNearbyParking(mapRegion.latitude, mapRegion.longitude, true, id);
        }
    };

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        if (searchCenter) {
            fetchNearbyParking(searchCenter.lat, searchCenter.lng, true, activeCategory).finally(() => setRefreshing(false));
        } else if (mapRegion) {
            fetchNearbyParking(mapRegion.latitude, mapRegion.longitude, true, activeCategory).finally(() => setRefreshing(false));
        } else {
            setRefreshing(false);
        }
    }, [mapRegion, searchCenter, activeCategory]);

    useEffect(() => {
        citizenService.getCitizenVehicleTypes().then(types => {
            if (types && types.length > 0) {
                setVehicleTypes(types);
            }
        });

        authService.initToken().catch(err => {
            console.warn('[HomeScreen] Token init notice:', err?.message || err);
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
                            setTimeout(() => {
                                setShowProfilePromptModal(true);
                            }, 800);
                        }
                    }
                } catch (err) {
                    console.log('[HomeScreen] Initial profile check notice:', err);
                    setProfileCompletionPercent(25);
                    setTimeout(() => {
                        setShowProfilePromptModal(true);
                    }, 800);
                } finally {
                    setIsProfileLoaded(true);
                }
            } else {
                setIsProfileLoaded(true);
            }
        }).catch(err => {
            console.warn('[HomeScreen] Load session notice:', err);
            setIsProfileLoaded(true);
        });

        // Voice Listeners
        Voice.onSpeechStart = onSpeechStart;
        Voice.onSpeechRecognized = onSpeechRecognized;
        Voice.onSpeechResults = onSpeechResults;
        Voice.onSpeechError = onSpeechError;

        const getUserLocation = async () => {
            let hasPermission = false;
            if (Platform.OS === 'android') {
                try {
                    const granted = await PermissionsAndroid.request(
                        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                        {
                            title: 'Location Permission',
                            message: 'S-Parking needs access to your location to show nearby parking slots.',
                            buttonNeutral: 'Ask Me Later',
                            buttonNegative: 'Cancel',
                            buttonPositive: 'OK',
                        },
                    );
                    hasPermission = granted === PermissionsAndroid.RESULTS.GRANTED;
                } catch (err) {
                    console.warn(err);
                }
            } else {
                hasPermission = true;
            }

            if (hasPermission) {
                Geolocation.getCurrentPosition(
                    position => {
                        const { latitude, longitude } = position.coords;
                        citizenService.setUserLocation({ latitude, longitude });
                        const newRegion = {
                            latitude,
                            longitude,
                            latitudeDelta: 0.0922,
                            longitudeDelta: 0.0421,
                        };
                        setMapRegion(newRegion);
                        cachedMapRegion = newRegion;
                        fetchNearbyParking(latitude, longitude);
                    },
                    error => {
                        console.warn('[HomeScreen] GPS unavailable:', error.message);
                    },
                    { enableHighAccuracy: false, timeout: 20000, maximumAge: 10000 }
                );
            }
        };

        getUserLocation();
    }, []);

    useEffect(() => {
        if (parkingLots.length > 0) {
            const coords = parkingLots
                .map(lot => ({
                    latitude: parseFloat(String(lot.latitude ?? lot.lat)),
                    longitude: parseFloat(String(lot.longitude ?? lot.lng)),
                }))
                .filter(c => !isNaN(c.latitude) && !isNaN(c.longitude) && c.latitude !== 0 && c.longitude !== 0);

            if (coords.length > 0) {
                // Calculate center
                const minLat = Math.min(...coords.map(c => c.latitude));
                const maxLat = Math.max(...coords.map(c => c.latitude));
                const minLng = Math.min(...coords.map(c => c.longitude));
                const maxLng = Math.max(...coords.map(c => c.longitude));

                const centerLat = (minLat + maxLat) / 2;
                const centerLng = (minLng + maxLng) / 2;

                setTimeout(() => {
                    setMapRegion({
                        latitude: centerLat,
                        longitude: centerLng,
                        latitudeDelta: 0.05 + Math.random() * 0.000001, // Jitter to force native update
                        longitudeDelta: 0.05,
                        zoom: 12.0
                    } as any);
                    setMarkersReady(true);
                }, 800);
            }
        }
    }, [parkingLots]);

    // Debounced OpenStreetMap (Nominatim) Search
    useEffect(() => {
        const query = searchQuery.trim();
        if (query.length > 2 && query.toLowerCase() !== selectedAddress.toLowerCase()) {
            const timerId = setTimeout(async () => {
                try {
                    // Append 'Kolkata' to ensure results are restricted to the city
                    const query = searchQuery.toLowerCase().includes('kolkata') ? searchQuery : `${searchQuery}, Kolkata`;
                    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&countrycodes=in&limit=5`;
                    const res = await fetch(url, {
                        headers: {
                            'User-Agent': 'sParking Citizen App / 1.0' // Required by OSM policies
                        }
                    });
                    const json = await res.json();

                    if (json && json.length > 0) {
                        console.log('--- OSM SEARCH RESULTS ---', json.length);
                        // Map OSM results to our existing dropdown structure
                        const mappedResults = json.map((item: any) => ({
                            place_id: item.place_id.toString(),
                            description: item.display_name,
                            lat: parseFloat(item.lat),
                            lng: parseFloat(item.lon)
                        }));
                        setSearchResults(mappedResults);
                    } else {
                        console.log('--- OSM NO RESULTS ---');
                        setSearchResults([]);
                    }
                } catch (error) {
                    console.log('OSM API Error', error);
                    setSearchResults([]);
                }
            }, 600);
            return () => clearTimeout(timerId);
        } else {
            setSearchResults([]);
        }
    }, [searchQuery, selectedAddress]);

    const handlePlaceSelect = async (placeId: string, description: string, lat?: number, lng?: number) => {
        setSearchQuery(description);
        setSelectedAddress(description.toLowerCase().trim());
        setSearchResults([]);
        setIsSearchingPlaces(true);

        if (lat && lng) {
            console.log('--- OSM SELECTED LOCATION ---');
            console.log(`Address: ${description}`);
            console.log(`Coordinates: Lat ${lat}, Lng ${lng}`);

            setMapRegion({
                latitude: lat,
                longitude: lng,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
            } as any);

            await fetchNearbyParking(lat, lng, true, activeCategory);
        } else {
            console.warn('Coordinates missing for selected place');
        }

        setIsSearchingPlaces(false);
    };

    const filteredLots = useMemo(() => {
        return parkingLots.filter(lot => {
            const sq = searchQuery.toLowerCase().trim();
            const isLocationSelected = sq !== '' && sq === selectedAddress;

            if (!isLocationSelected) {
                const name = (lot.location || lot.name || '').toLowerCase();
                const area = (lot.address || '').toLowerCase();
                const code = (lot.parking_area_code || lot.code || '').toLowerCase();

                const matchesSearch = sq === '' || name.includes(sq) || area.includes(sq) || code.includes(sq);
                if (!matchesSearch) return false;
            }

            return true;
        });
    }, [parkingLots, searchQuery, selectedAddress]);

    const handleSelectMapPin = async (id: string) => {
        console.log(`\n📍 [HomeScreen] === PIN CLICKED ===`);
        console.log(`ID:`, id);

        setSelectedLotId(id);

        const lotIndex = filteredLots.findIndex(
            l => String(l.parking_area_id || l.id) === id
        );

        if (lotIndex < 0) {
            console.log(`❌ [HomeScreen] Could not find lot with ID ${id} in filteredLots!`);
            return;
        }

        const lot = filteredLots[lotIndex];
        console.log(`📋 [HomeScreen] Selected Lot Data (from list):`, JSON.stringify(lot, null, 2));

        // Smooth map camera focus
        const rawLat = lot.latitude ?? lot.lat;
        const rawLng = lot.longitude ?? lot.lng;
        const lat = parseFloat(String(rawLat));
        const lng = parseFloat(String(rawLng));
        if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
            // Subtracting 0.0035 from latitude moves the camera center SOUTH,
            // pushing the marker UP on the screen so it's not hidden by the bottom sheet popup.
            const offsetLat = lat - 0.0035;

            // Add microscopic jitter to latitudeDelta to FORCE React Native to pass the updated region to Java
            setMapRegion({
                latitude: offsetLat,
                longitude: lng,
                latitudeDelta: 0.012 + Math.random() * 0.000001,
                longitudeDelta: 0.012,
                zoom: 14.5
            } as any);
        }

        // Fetch details & open popup sheet above bottom tabs
        setIsFetchingDetails(true);
        const lotIdNum = parseInt(lot.parking_area_id || lot.id, 10);
        let finalDetails = lot;
        if (!isNaN(lotIdNum)) {
            const details = await citizenService.getCitizenParkingAreaDetails(lotIdNum, null);
            finalDetails = details || lot;
            setSelectedParkingForModal(finalDetails);
        } else {
            setSelectedParkingForModal(lot);
        }
        setIsFetchingDetails(false);
    };

    const floatAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(floatAnim, { toValue: -6, duration: 1000, useNativeDriver: true }),
                Animated.timing(floatAnim, { toValue: 0, duration: 1000, useNativeDriver: true })
            ])
        ).start();
    }, []);

    const scrollToTop = () => {
        flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    };

    const handleGoToDetails = async (lot: any) => {
        const lotIdNum = parseInt(lot.parking_area_id || lot.id, 10);
        if (!isNaN(lotIdNum)) {
            const details = await citizenService.getCitizenParkingAreaDetails(lotIdNum, null);
            citizenService.setSelectedParkingDetails(details);
            go('parkingDetails');
        } else {
            go('parkingDetails');
        }
    };

    const handleOpenDirections = (lot: any) => {
        const lat = lot.latitude || lot.lat;
        const lng = lot.longitude || lot.lng;
        const name = lot.location || lot.name;
        const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
        Linking.canOpenURL(url)
            .then(supported => {
                if (supported) Linking.openURL(url);
                else Alert.alert('Directions', `Navigating to ${name}`);
            })
            .catch(() => {
                Alert.alert('Directions', `Navigating to ${name}`);
            });
    };

    useEffect(() => {
        return () => {
            Voice.destroy().then(Voice.removeAllListeners);
        };
    }, []);

    const onSpeechStart = (e: any) => {
        setListeningText('Listening...');
        setVoiceError('');
    };

    const onSpeechRecognized = (e: any) => {
        setListeningText('Recognizing...');
    };

    const onSpeechError = (e: SpeechErrorEvent) => {
        setVoiceError(e.error?.message || 'Could not recognize speech');
        setTimeout(() => setIsListening(false), 2000);
    };

    const onSpeechResults = (e: SpeechResultsEvent) => {
        if (e.value && e.value.length > 0) {
            setSearchQuery(e.value[0]);
            setIsListening(false);
        }
    };

    const handleBookPress = (lot: any) => {
        const isBookingDisabled = lot.advance_booking?.enabled === false;
        if (isBookingDisabled) {
            setBookingDisabledModal({ visible: true, lotName: lot.location || lot.name || 'this parking slot' });
            return;
        }
        handleGoToDetails(lot);
    };

    const handleVoiceSearch = async () => {
        if (Platform.OS === 'android') {
            const granted = await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
                {
                    title: 'Microphone Permission',
                    message: 'App needs access to your microphone to search by voice.',
                    buttonNeutral: 'Ask Me Later',
                    buttonNegative: 'Cancel',
                    buttonPositive: 'OK',
                },
            );
            if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
                Alert.alert('Permission Denied', 'Microphone permission is required for voice search.');
                return;
            }
        }

        setIsListening(true);
        setListeningText('Listening...');
        setVoiceError('');
        try {
            await Voice.start('en-US');
        } catch (e) {
            console.error(e);
            setIsListening(false);
        }
    };

    const stopVoiceSearch = async () => {
        setIsListening(false);
        try {
            await Voice.stop();
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <View style={s.container}>
            <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
            <CarLoader
                visible={isBooking || isSearchingPlaces}
                message={isSearchingPlaces ? "Searching Locations..." : "Processing Booking..."}
            />

            <ScrollView
                ref={flatListRef as any}
                scrollEnabled={mapScrollEnabled} // ✅ Automatically locks when touching map
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
                }
                style={s.scroll}
                contentContainerStyle={[
                    s.scrollContent,
                    { paddingBottom: 110 + Math.max(insets.bottom, 16) },
                ]}
                stickyHeaderIndices={[1]}
                onScroll={(e) => {
                    const offsetY = e.nativeEvent.contentOffset.y;
                    if (offsetY > 300 && !showScrollToTop) {
                        setShowScrollToTop(true);
                    } else if (offsetY <= 300 && showScrollToTop) {
                        setShowScrollToTop(false);
                    }
                }}
                scrollEventThrottle={16}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
            >
                {/* ================= 1. BRAND HERO HEADER ================= */}
                <View style={[s.headerContainer, { 
                    paddingTop: Math.max(insets.top + 6, 38), 
                    paddingBottom: 88, 
                    marginBottom: -(88 + insets.top) 
                }]}>
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
                                            source={require('../../assets/splash_badge_saffron.png')}
                                            style={s.logoImage}
                                            resizeMode="contain"
                                        />
                                    </View>
                                    <View>
                                        <View style={s.brandNameRow}>
                                            <Text style={s.brandTitle}>S-Parking</Text>
                                            <View style={s.govBadge}>
                                                <Text style={s.govBadgeText}>KMC</Text>
                                            </View>
                                        </View>
                                        <Text style={s.brandSubtitle}>Kolkata Municipal Corporation</Text>
                                    </View>
                                </View>

                                <Pressable
                                    onPress={() => setShowNotifModal(true)}
                                    style={({ pressed }) => [s.bellWrapper, pressed && s.bellWrapperPressed]}
                                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                                    <Image
                                        source={require('../../assets/icons/icon_bell.png')}
                                        style={s.bellIcon}
                                        resizeMode="contain"
                                    />
                                    <View style={s.badge}>
                                        <Text style={s.badgeText}>3</Text>
                                    </View>
                                </Pressable>
                            </View>

                            <View style={s.greetingWrap}>
                                <Text style={s.greetingTitle}>
                                    Welcome, {userSession?.user_name || (userSession?.mobile_no ? `Citizen (${userSession.mobile_no})` : 'Citizen')} 👋
                                </Text>
                                <Text style={s.greetingSub}>
                                    Find, navigate & reserve verified smart slots across Kolkata
                                </Text>
                            </View>
                        </View>

                        <View style={{ 
                            paddingHorizontal: 16, 
                            paddingTop: insets.top, 
                            paddingBottom: 40, 
                            zIndex: 10, 
                            backgroundColor: 'transparent' 
                        }}>
                            {/* Search Bar */}
                            <View style={s.searchBarOuter}>
                                <View style={s.searchIconBadge}>
                                    <Image
                                        source={require('../../assets/icons/icon_search.png')}
                                        style={s.searchIconImg}
                                        resizeMode="contain"
                                    />
                                </View>

                                <TextInput
                                    style={s.searchInput}
                                    placeholder="Search area, landmark or slot code…"
                                    placeholderTextColor="#94A3B8"
                                    value={searchQuery}
                                    onChangeText={setSearchQuery}
                                    returnKeyType="search"
                                />

                                {searchQuery.length > 0 ? (
                                    <Pressable
                                        onPress={() => {
                                            setSearchQuery('');
                                            setSearchResults([]);
                                            setSelectedAddress('');

                                            // Refetch using user's current GPS location if available
                                            const userLoc = citizenService.getUserLocation();
                                            if (userLoc) {
                                                setMapRegion({
                                                    latitude: userLoc.latitude,
                                                    longitude: userLoc.longitude,
                                                    latitudeDelta: 0.0922,
                                                    longitudeDelta: 0.0421,
                                                } as any);
                                                fetchNearbyParking(userLoc.latitude, userLoc.longitude, true);
                                            }
                                        }}
                                        style={s.searchClearBtn}
                                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                        <View style={s.searchClearCircle}>
                                            <Text style={s.searchClearText}>✕</Text>
                                        </View>
                                    </Pressable>
                                ) : (
                                    <Pressable
                                        onPress={handleVoiceSearch}
                                        style={s.searchMicBtn}
                                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                        <Image
                                            source={require('../../assets/icons/icon_mic.png')}
                                            style={s.searchMicImg}
                                            resizeMode="contain"
                                        />
                                    </Pressable>
                                )}

                                <View style={s.searchDivider} />

                                <Pressable
                                    onPress={() => Alert.alert('Filters', 'Distance, Price, EV, Accessible filters')}
                                    style={({ pressed }) => [s.searchFilterBtn, pressed && s.searchFilterBtnPressed]}
                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                    <Image
                                        source={require('../../assets/icons/icon_filter.png')}
                                        style={s.searchFilterImg}
                                        resizeMode="contain"
                                    />
                                </Pressable>
                            </View>
                        </View>

                        {/* ================= 2. MAIN PARKING CONTENT ================= */}
                        <View style={s.sheet}>
                            {/* Category Selector */}
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={s.catCardsRow}>
                                {[
                                    { id: null, label: 'All Types', icon: require('../../assets/icons/nav_dashboard.png') },
                                    ...vehicleTypes.map(v => {
                                        let icon = require('../../assets/icons/icon_car.png');
                                        const name = v.vehicle_type_name.toLowerCase();
                                        if (name.includes('two')) icon = require('../../assets/icons/icon_bike.png');
                                        else if (name.includes('heavy')) icon = require('../../assets/icons/icon_ev_charge.png');
                                        return {
                                            id: v.vehicle_type_id,
                                            label: v.vehicle_type_name,
                                            icon: icon
                                        };
                                    })
                                ].map(cat => {
                                    const isActive = activeCategory === cat.id;
                                    return (
                                        <Pressable
                                            key={cat.id || 'all'}
                                            onPress={() => handleCategorySelect(cat.id)}
                                            style={[s.catCard, isActive && s.catCardActive]}>
                                            <View style={[s.catIconBadge, isActive && s.catIconBadgeActive]}>
                                                <Image
                                                    source={cat.icon}
                                                    style={[s.catIconImg, { tintColor: isActive ? '#FFFFFF' : colors.primary }]}
                                                    resizeMode="contain"
                                                />
                                            </View>
                                            <View>
                                                <Text style={[s.catCardLabel, isActive && s.catCardLabelActive]}>
                                                    {cat.label}
                                                </Text>
                                            </View>
                                        </Pressable>
                                    );
                                })}
                            </ScrollView>

                            {/* Section Header & View Segment Switcher */}
                            <View style={s.viewToggleRow}>
                                <View style={s.sectionHeaderCol}>
                                    <View style={s.sectionTitleRow}>
                                        <Text style={s.sectionHeaderTitle}>Verified Smart Slots</Text>
                                        <View style={s.liveSlotsBadge}>
                                            <View style={s.liveSlotsDot} />
                                            <Text style={s.liveSlotsBadgeText}>LIVE</Text>
                                        </View>
                                    </View>
                                    <View style={s.sectionSubRow}>
                                        <Image
                                            source={require('../../assets/icons/booking_history_location_pin.png')}
                                            style={s.subPinIcon}
                                            resizeMode="contain"
                                        />
                                        <Text style={s.sectionHeaderSub}>
                                            <Text style={s.countBoldHighlight}>{filteredLots.length}</Text> active locations around you
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            {/* Interactive Radar Map View */}
                            <View style={s.mapWrapper}>
                                <View style={s.mapLiveHeader}>
                                    <View style={s.mapLiveBadge}>
                                        <View style={s.mapLiveDot} />
                                        <Text style={s.mapLiveText}>Live GPS Radar</Text>
                                    </View>
                                    <Text style={s.mapLiveCount}>{filteredLots.length} Pins</Text>
                                </View>

                                {/* ✅ FIXED GESTURES: When touching inside Map, ONLY Map moves! */}
                                {mapRegion ? (
                                    <View
                                        style={{ width: '100%', height: 580, borderRadius: 16, overflow: 'hidden' }}
                                        pointerEvents="box-none"
                                        onTouchStart={() => setMapScrollEnabled(false)}
                                        onTouchEnd={() => setMapScrollEnabled(true)}
                                        onTouchCancel={() => setMapScrollEnabled(true)}
                                    >
                                        <NativeMultiMap
                                            style={{ width: '100%', height: '100%' }}
                                            region={mapRegion}
                                            onMarkerPress={(e: any) => handleSelectMapPin(e.nativeEvent.id)}
                                            markers={filteredLots.map((lot, index) => {
                                                const rawLat = lot.latitude ?? lot.lat;
                                                const rawLng = lot.longitude ?? lot.lng;
                                                const lat = parseFloat(String(rawLat));
                                                const lng = parseFloat(String(rawLng));
                                                if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) return null;
                                                const id = String(lot.parking_area_id || lot.id || `pin_${index}`);
                                                return {
                                                    id,
                                                    latitude: lat,
                                                    longitude: lng,
                                                    title: lot.location || lot.name || 'Parking Slot',
                                                    color: selectedLotId === id ? 'blue' : 'red'
                                                };
                                            }).filter(Boolean)}
                                        />
                                    </View>
                                ) : (
                                    <View style={{ width: '100%', height: 580, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' }}>
                                        <Text style={{ fontSize: 13, color: '#94A3B8', fontWeight: '600' }}>📍 Please turn on GPS to view parking map</Text>
                                    </View>
                                )}
                            </View>

                            {/* Search Results Dropdown */}
                            {searchResults.length > 0 && (
                                <View style={s.searchResultsDropdown}>
                                    <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 200 }}>
                                        {searchResults.map((item) => (
                                            <Pressable
                                                key={item.place_id}
                                                style={s.searchResultItem}
                                                onPress={() => handlePlaceSelect(item.place_id, item.description, item.lat, item.lng)}
                                            >
                                                <Image
                                                    source={require('../../assets/icons/nav_parking.png')}
                                                    style={s.searchResultIcon}
                                                    resizeMode="contain"
                                                />
                                                <Text style={s.searchResultText} numberOfLines={2}>
                                                    {item.description}
                                                </Text>
                                            </Pressable>
                                        ))}
                                    </ScrollView>
                                </View>
                            )}
                        </View>

                        {/* List View Rendering */}
                        {viewMode === 'list' && filteredLots.map((lot, lotIdx) => {
                    const id = String(lot.parking_area_id || lot.id || `lot_${lotIdx}`);
                    const isSelected = id === selectedLotId;

                    const totalSlots = lot.capacity?.four_wheeler || lot.totalSlots || 200;
                    const availSlots = lot.free_physical_slot_count ?? (lot.capacity?.four_wheeler || lot.availableSlots || 0);
                    const freePercent = totalSlots > 0 ? Math.min(100, Math.max(0, Math.round((availSlots / totalSlots) * 100))) : 0;

                    const name = lot.location || lot.name || 'Parking Slot';
                    const area = lot.address || 'Kolkata Grid';
                    const distance = lot.distance_km ? `${lot.distance_km.toFixed(1)} km` : '1.2 km';
                    const rate = lot.rates?.four_wheeler ? `₹${lot.rates.four_wheeler}` : (lot.rate4W || '₹20');

                    return (
                        <View style={s.cardWrapper}>
                            <Pressable
                                onPress={() => handleSelectMapPin(id)}
                                style={[s.compactCard, isSelected && s.compactCardSelected]}>

                                <View style={s.cardTopBar}>
                                    <View style={s.verifiedRow}>
                                        <Image
                                            source={require('../../assets/icons/icon_shield_check.png')}
                                            style={s.shieldMiniIcon}
                                            resizeMode="contain"
                                        />
                                        <Text style={s.verifiedTagText}>KMC VERIFIED</Text>
                                    </View>

                                    <View style={s.themeSlotsPill}>
                                        <View style={s.themeDot} />
                                        <Text style={s.themeSlotsText}>
                                            {availSlots} / {totalSlots} FREE
                                        </Text>
                                    </View>
                                </View>

                                <View style={s.cardCenterRow}>
                                    <Pressable onPress={() => handleGoToDetails(lot)}>
                                        {lot.image ? (
                                            <Image source={lot.image} style={s.compactThumb} resizeMode="cover" />
                                        ) : (
                                            <View style={s.compactThumbFallback}>
                                                <Image
                                                    source={require('../../assets/icons/nav_parking.png')}
                                                    style={s.thumbFallbackIcon}
                                                    resizeMode="contain"
                                                />
                                            </View>
                                        )}
                                    </Pressable>

                                    <View style={s.centerMetaCol}>
                                        <Text style={s.lotNameText} numberOfLines={1}>{name}</Text>

                                        <View style={s.addressRow}>
                                            <Image
                                                source={require('../../assets/icons/booking_history_location_pin.png')}
                                                style={s.pinIcon}
                                                resizeMode="contain"
                                            />
                                            <Text style={s.addressText} numberOfLines={1}>{area}</Text>
                                        </View>

                                        <View style={s.progressRow}>
                                            <View style={s.progressTrack}>
                                                <View
                                                    style={[
                                                        s.progressFill,
                                                        { width: `${Math.max(freePercent, 6)}%` }
                                                    ]}
                                                />
                                            </View>
                                            <Text style={s.progressRatioText}>
                                                {freePercent}% Avail
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={s.rateContainer}>
                                        <Text style={s.rateValueText}>{rate}</Text>
                                        <Text style={s.rateUnitText}>/hr</Text>
                                        <View style={s.distSubBadge}>
                                            <Text style={s.distSubText}>{distance}</Text>
                                        </View>
                                    </View>
                                </View>

                                <View style={s.cardBottomRow}>
                                    <View style={s.tagGroup}>
                                        <View style={s.infoTag}>
                                            <Image
                                                source={require('../../assets/icons/icon_car.png')}
                                                style={s.tagMicroIcon}
                                                resizeMode="contain"
                                            />
                                            <Text style={s.tagText}>4W Slot</Text>
                                        </View>
                                        {lot.valet_available && (
                                            <View style={[s.infoTag, s.valetTag]}>
                                                <Text style={s.valetTagText}>Valet</Text>
                                            </View>
                                        )}
                                    </View>

                                    <View style={s.actionBtnGroup}>
                                        <Pressable
                                            onPress={() => handleOpenDirections(lot)}
                                            style={({ pressed }) => [s.navBtn, pressed && s.navBtnPressed]}>
                                            <View style={s.navIconCircle}>
                                                <Image
                                                    source={require('../../assets/icons/booking_history_location_pin.png')}
                                                    style={s.navIconStyle}
                                                    resizeMode="contain"
                                                />
                                            </View>
                                            <Text style={s.navBtnText}>Directions</Text>
                                        </Pressable>

                                        <Pressable
                                            onPress={() => handleBookPress(lot)}
                                            style={({ pressed }) => [
                                                s.bookBtn,
                                                pressed && s.bookBtnPressed,
                                                lot.advance_booking?.enabled === false && s.bookBtnDisabled
                                            ]}>
                                            <Text style={s.bookBtnText}>Book Slot</Text>
                                            <Image
                                                source={require('../../assets/icons/icon_chevron.png')}
                                                style={[s.chevronIcon, { tintColor: '#FFFFFF', marginLeft: 3 }]}
                                                resizeMode="contain"
                                            />
                                        </Pressable>
                                    </View>
                                </View>
                            </Pressable>
                        </View>
                        );
                    })}

                    <View style={{ paddingBottom: 20, paddingHorizontal: 16 }}>
                        <View style={[s.footerTrustNotice, { marginTop: 16, backgroundColor: '#FFFFFF', padding: 16, borderRadius: 16, elevation: 2, borderWidth: 1, borderColor: '#F1F5F9' }]}>
                            <View style={s.trustBadgeRow}>
                                <Image
                                    source={require('../../assets/icons/icon_shield_check.png')}
                                    style={[s.footerShieldIcon, { tintColor: '#16A34A', width: 20, height: 20 }]}
                                    resizeMode="contain"
                                />
                                <Text style={[s.footerTrustText, { fontSize: 13, fontWeight: '700', color: '#334155' }]}>
                                    Official Smart Slot Network{'\n'}
                                    <Text style={{ fontSize: 11, fontWeight: '500', color: '#64748B' }}>Kolkata Municipal Corporation</Text>
                                </Text>
                            </View>
                        </View>
                    </View>
            </ScrollView>

            {/* Scroll to Top */}
            {filteredLots.length > 5 && viewMode !== 'map' && showScrollToTop && (
                <Animated.View style={[s.floatingTopBtn, { transform: [{ translateY: floatAnim }] }]}>
                    <Pressable onPress={scrollToTop} style={s.floatingTopBtnPress}>
                        <Image source={require('../../assets/icons/icon_chevron.png')} style={s.floatingTopIcon} resizeMode="contain" />
                    </Pressable>
                </Animated.View>
            )}

            {/* ================= NOTIFICATIONS MODAL ================= */}
            <Modal visible={showNotifModal} transparent animationType="slide">
                <View style={s.modalBottomBackdrop}>
                    <View style={s.modalCard}>
                        <View style={s.modalHandle} />
                        <View style={s.notifHeaderRow}>
                            <Text style={s.modalTitle}>Notifications</Text>
                            <Pressable
                                onPress={() => setShowNotifModal(false)}
                                style={s.notifModalCloseBtn}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                                <Text style={s.notifClose}>✕</Text>
                            </Pressable>
                        </View>

                        <View style={s.notifItem}>
                            <View style={[s.notifIconCircle, { backgroundColor: '#DCFCE7' }]}>
                                <Text style={s.notifIcon}>✓</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={s.notifItemTitle}>Slot Reserved Successfully</Text>
                                <Text style={s.notifItemDesc}>Slot Slot 4W - #12 at Jadavpur University Main Gate confirmed.</Text>
                                <Text style={s.notifItemTime}>10 mins ago</Text>
                            </View>
                        </View>

                        <View style={s.notifItem}>
                            <View style={[s.notifIconCircle, { backgroundColor: '#EFF6FF' }]}>
                                <Image source={require('../../assets/icons/icon_car.png')} style={s.notifRealIcon} resizeMode="contain" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={s.notifItemTitle}>Vehicle WB02AK1234 Verified</Text>
                                <Text style={s.notifItemDesc}>Digital RC verification completed with Kolkata FASTag slot.</Text>
                                <Text style={s.notifItemTime}>2 hours ago</Text>
                            </View>
                        </View>

                        <View style={s.notifItem}>
                            <View style={[s.notifIconCircle, { backgroundColor: '#FFF7ED' }]}>
                                <Image source={require('../../assets/icons/icon_ev_charge.png')} style={s.notifRealIcon} resizeMode="contain" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={s.notifItemTitle}>Municipal Tariff Cashback</Text>
                                <Text style={s.notifItemDesc}>Get 20% wallet cashback when parking at EV charging slots.</Text>
                                <Text style={s.notifItemTime}>Yesterday</Text>
                            </View>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* ================= PROFILE COMPLETION POPUP MODAL ================= */}
            <Modal
                visible={showProfilePromptModal}
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

                        <Text style={s.promptTitle}>Profile {profileCompletionPercent}% Complete</Text>
                        <Text style={s.promptDesc}>
                            Complete your Citizen Profile to activate automatic FASTag barrier deduction and digital parking receipts.
                        </Text>

                        <View style={s.promptProgressWrap}>
                            <View style={s.promptProgressBar}>
                                <View
                                    style={[
                                        s.promptProgressFill,
                                        { width: `${Math.max(profileCompletionPercent, 25)}%` },
                                    ]}
                                />
                            </View>
                            <Text style={s.promptProgressText}>{profileCompletionPercent}% Completed</Text>
                        </View>

                        <View style={s.promptChecklist}>
                            <View style={s.checkRow}>
                                <Text style={s.checkGreen}>✓</Text>
                                <Text style={s.checkText}>Mobile Verified (+91)</Text>
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
                                    Email {citizenProfile?.email_id ? '(Added)' : '(For digital receipts)'}
                                </Text>
                            </View>
                        </View>

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

            {/* ================= 🔥 FIXED: IN-SCREEN MODAL SITTING SAFELY ABOVE BOTTOM TABS ================= */}
            {!!selectedParkingForModal && (
                <View
                    style={[
                        StyleSheet.absoluteFill,
                        {
                            zIndex: 9999,
                            justifyContent: 'flex-end',
                            // ✅ Bottom tabs visible rahenge aur modal unke theek upar aayega
                            bottom: 60 + Math.max(insets.bottom, 6),
                        },
                    ]}
                    pointerEvents="box-none"
                >
                    {/* Background overlay click to dismiss */}
                    <Pressable
                        style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(15, 23, 42, 0.45)' }]}
                        onPress={() => setSelectedParkingForModal(null)}
                    />

                    <View style={s.sheetCardWrapper}>
                        {/* Drag Handle */}
                        <View style={s.sheetHandleBar} />

                        {/* Top Ribbon */}
                        <View style={s.sheetRibbonRow}>
                            <View style={s.sheetCivicTag}>
                                <Image
                                    source={require('../../assets/icons/icon_shield_check.png')}
                                    style={s.sheetShieldIcon}
                                    resizeMode="contain"
                                />
                                <Text style={s.sheetCivicTagText}>KMC VERIFIED SMART</Text>
                            </View>

                            <Pressable
                                onPress={() => setSelectedParkingForModal(null)}
                                style={s.sheetCloseBtnCircle}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                                <Text style={s.sheetCloseBtnText}>✕</Text>
                            </Pressable>
                        </View>

                        {/* Scrollable Container so user can scroll down easily if needed */}
                        <ScrollView
                            bounces={false}
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={s.sheetScrollableContent}>

                            {/* Title & Free Slots */}
                            <View style={s.sheetTitleRow}>
                                <View style={{ flex: 1, paddingRight: 10 }}>
                                    <Text style={s.sheetBayTitle} numberOfLines={2}>
                                        {selectedParkingForModal?.location || selectedParkingForModal?.name || 'Parking Area'}
                                    </Text>

                                    <View style={s.sheetAddressRow}>
                                        <Image
                                            source={require('../../assets/icons/booking_history_location_pin.png')}
                                            style={s.sheetPinIcon}
                                            resizeMode="contain"
                                        />
                                        <Text style={s.sheetAddressText} numberOfLines={2}>
                                            {selectedParkingForModal?.address || 'Kolkata Grid'}
                                        </Text>
                                    </View>

                                    <View style={s.sheetDistanceRow}>
                                        <Text style={s.sheetDistanceText}>
                                            📍 {selectedParkingForModal?.distance_km ? `${selectedParkingForModal.distance_km.toFixed(1)} km away` : 'Near you'} • 5 min
                                        </Text>
                                    </View>
                                </View>

                                {(() => {
                                    const fwFree = selectedParkingForModal?.physical_slots?.four_wheeler?.free ?? selectedParkingForModal?.capacity?.four_wheeler ?? 0;
                                    const twFree = selectedParkingForModal?.physical_slots?.two_wheeler?.free ?? selectedParkingForModal?.capacity?.two_wheeler ?? 0;
                                    return (
                                        <View style={{flexDirection: 'row', gap: 6}}>
                                            {fwFree > 0 && (
                                                <View style={[s.sheetSlotsBox, { paddingHorizontal: 6, paddingVertical: 4, minWidth: 50 }]}>
                                                    <View style={s.sheetSlotsInner}>
                                                        <Text style={[s.sheetSlotsCount, { fontSize: 14 }]}>{fwFree}</Text>
                                                        <Text style={[s.sheetSlotsSub, { fontSize: 8 }]}>4W FREE</Text>
                                                    </View>
                                                </View>
                                            )}
                                            {twFree > 0 && (
                                                <View style={[s.sheetSlotsBox, { paddingHorizontal: 6, paddingVertical: 4, minWidth: 50, backgroundColor: '#EFF6FF' }]}>
                                                    <View style={s.sheetSlotsInner}>
                                                        <Text style={[s.sheetSlotsCount, { fontSize: 14, color: '#2563EB' }]}>{twFree}</Text>
                                                        <Text style={[s.sheetSlotsSub, { fontSize: 8, color: '#3B82F6' }]}>2W FREE</Text>
                                                    </View>
                                                </View>
                                            )}
                                        </View>
                                    );
                                })()}
                            </View>

                            {/* 4W & 2W Tariff Pods */}
                            <View style={s.sheetTariffGrid}>
                                <View style={s.tariffPod}>
                                    <View style={s.tariffIconBox}>
                                        <Image
                                            source={require('../../assets/icons/icon_car.png')}
                                            style={s.tariffVehIcon}
                                            resizeMode="contain"
                                        />
                                    </View>
                                    <View>
                                        <Text style={s.tariffTypeLabel}>4W Car / SUV</Text>
                                        <Text style={s.tariffPriceVal}>
                                            ₹{selectedParkingForModal?.rates?.four_wheeler || '20'}<Text style={s.tariffPerHr}>/hr</Text>
                                        </Text>
                                    </View>
                                </View>

                                <View style={s.tariffDivider} />

                                <View style={s.tariffPod}>
                                    <View style={s.tariffIconBox}>
                                        <Image
                                            source={require('../../assets/icons/icon_bike.png')}
                                            style={s.tariffVehIcon}
                                            resizeMode="contain"
                                        />
                                    </View>
                                    <View>
                                        <Text style={s.tariffTypeLabel}>2W Bike / Scooter</Text>
                                        <Text style={s.tariffPriceVal}>
                                            ₹{selectedParkingForModal?.rates?.two_wheeler || '10'}<Text style={s.tariffPerHr}>/hr</Text>
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            {/* Advance Booking Notice */}
                            {selectedParkingForModal?.advance_booking?.enabled === false ? (
                                <View style={s.bookingNoticeBarDisabled}>
                                    <Text style={s.bookingNoticeTextDisabled}>
                                        ℹ️ On-Spot Entry Only • Advance Booking is disabled for this parking
                                    </Text>
                                </View>
                            ) : (
                                <View style={s.bookingNoticeBarActive}>
                                    <View style={s.pulseGreenDot} />
                                    <Text style={s.bookingNoticeTextActive}>
                                        1-Tap Fastag barrier clearance active for this parking
                                    </Text>
                                </View>
                            )}

                        </ScrollView>

                        {/* Directions & Book Slot Buttons (MOVED OUTSIDE SCROLLVIEW TO STAY VISIBLE) */}
                        <View style={[s.sheetActionsRow, { paddingBottom: 16, paddingTop: 8, backgroundColor: '#FFFFFF' }]}>
                            <Pressable
                                onPress={() => {
                                    const lot = selectedParkingForModal;
                                    setSelectedParkingForModal(null);
                                    handleOpenDirections(lot);
                                }}
                                style={({ pressed }) => [s.sheetNavBtn, pressed && s.sheetNavBtnPressed]}>
                                <Image
                                    source={require('../../assets/icons/booking_history_location_pin.png')}
                                    style={s.sheetNavBtnIcon}
                                    resizeMode="contain"
                                />
                                <Text style={s.sheetNavBtnText}>Directions</Text>
                            </Pressable>

                            <Pressable
                                onPress={() => {
                                    const lot = selectedParkingForModal;
                                    if (lot?.advance_booking?.enabled === false) {
                                        setSelectedParkingForModal(null);
                                        setBookingDisabledModal({
                                            visible: true,
                                            lotName: lot?.location || lot?.name || 'this parking',
                                        });
                                    } else {
                                        citizenService.setSelectedParkingDetails(lot);
                                        setSelectedParkingForModal(null);
                                        setIsBooking(true);
                                        setTimeout(() => {
                                            setIsBooking(false);
                                            go('parkingDetails');
                                        }, 1200);
                                    }
                                }}
                                style={({ pressed }) => [
                                    s.sheetBookBtn,
                                    pressed && s.sheetBookBtnPressed,
                                    selectedParkingForModal?.advance_booking?.enabled === false && s.sheetBookBtnDisabled,
                                ]}>
                                <Text style={s.sheetBookBtnText}>
                                    {selectedParkingForModal?.advance_booking?.enabled === false ? 'Booking Closed' : 'Book Slot'}
                                </Text>
                                {selectedParkingForModal?.advance_booking?.enabled !== false && (
                                    <Image
                                        source={require('../../assets/icons/icon_chevron.png')}
                                        style={s.sheetBookChevron}
                                        resizeMode="contain"
                                    />
                                )}
                            </Pressable>
                        </View>
                    </View>
                </View>
            )}

            <Modal visible={bookingDisabledModal.visible} transparent animationType="fade" onRequestClose={() => setBookingDisabledModal({ visible: false, lotName: '' })}>
                <View style={s.modalBackdrop}>
                    <View style={s.modalBox}>
                        <View style={[s.modalIconCircle, { backgroundColor: '#FEE2E2' }]}>
                            <Text style={s.modalIconEmoji}>🚫</Text>
                        </View>
                        <Text style={s.modalTitle}>Booking Unavailable</Text>
                        <Text style={s.modalMessage}>
                            Advance booking is not enabled for {bookingDisabledModal.lotName}. This parking area operates on a first-come, first-served basis only.
                        </Text>
                        <Pressable
                            onPress={() => setBookingDisabledModal({ visible: false, lotName: '' })}
                            style={s.modalCloseBtn}>
                            <Text style={s.modalCloseBtnText}>Understood</Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>

            {/* ================= VOICE SEARCH SIMULATION MODAL ================= */}
            <Modal visible={isListening} transparent animationType="fade" onRequestClose={() => setIsListening(false)}>
                <View style={s.voiceModalBackdrop}>
                    <View style={s.voiceModalBox}>
                        <View style={s.voicePulseCircleOuter}>
                            <View style={s.voicePulseCircleInner}>
                                <Image source={require('../../assets/icons/icon_mic.png')} style={s.voiceMicIcon} resizeMode="contain" />
                            </View>
                        </View>
                        <Text style={s.voiceModalText}>{voiceError ? voiceError : listeningText}</Text>
                        <Pressable onPress={stopVoiceSearch} style={s.voiceCancelBtn}>
                            <Text style={s.voiceCancelText}>Cancel</Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>

            <CarLoader visible={isFetchingDetails} message="Fetching slot details..." />
        </View>
    );
}

const s = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F1F5F9',
    },

    /* Voice Search Modal */
    voiceModalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.8)',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 20,
    },
    voiceModalBox: {
        backgroundColor: '#FFFFFF',
        width: '100%',
        borderRadius: 24,
        paddingVertical: 32,
        alignItems: 'center',
        elevation: 10,
    },
    voicePulseCircleOuter: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#FFEDD5',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    voicePulseCircleInner: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 6,
    },
    voiceMicIcon: {
        width: 32,
        height: 32,
        tintColor: '#FFFFFF',
    },
    voiceModalText: {
        fontSize: 18,
        fontWeight: '800',
        color: '#0F172A',
        marginBottom: 24,
    },
    voiceCancelBtn: {
        paddingVertical: 10,
        paddingHorizontal: 24,
        borderRadius: 20,
        backgroundColor: '#F1F5F9',
    },
    voiceCancelText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#64748B',
    },
    scroll: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 90,
    },

    /* Header Container */
    headerContainer: {
        backgroundColor: colors.primary,
        paddingBottom: 40,
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
        marginBottom: 12,
    },
    brandGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    brandNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    govBadge: {
        backgroundColor: 'rgba(255, 255, 255, 0.25)',
        paddingHorizontal: 5,
        paddingVertical: 1,
        borderRadius: 4,
    },
    govBadgeText: {
        fontSize: 9,
        fontWeight: '900',
        color: '#FFFFFF',
        letterSpacing: 0.5,
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
        shadowOpacity: 0.2,
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
        letterSpacing: -0.2,
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
    greetingWrap: {
        zIndex: 2,
        marginBottom: 12,
    },
    greetingTitle: {
        color: '#FFFFFF',
        fontSize: 20,
        fontWeight: '700',
        letterSpacing: -0.3,
    },
    greetingSub: {
        color: 'rgba(255, 255, 255, 0.9)',
        fontSize: 12,
        fontWeight: '400',
        marginTop: 2,
    },

    /* Search Bar */
    searchBarOuter: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        height: 48,
        paddingHorizontal: 8,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
        elevation: 5,
        borderWidth: 1.5,
        borderColor: 'rgba(255, 255, 255, 0.95)',
        zIndex: 2,
    },
    searchIconBadge: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: '#FFF7ED',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8,
    },
    searchIconImg: {
        width: 16,
        height: 16,
        tintColor: colors.primary,
    },
    searchInput: {
        flex: 1,
        fontSize: 13.5,
        color: '#0F172A',
        fontWeight: '600',
        padding: 0,
    },
    searchClearBtn: {
        padding: 4,
    },
    searchClearCircle: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#E2E8F0',
        alignItems: 'center',
        justifyContent: 'center',
    },
    searchClearText: {
        fontSize: 10,
        color: '#475569',
        fontWeight: '800',
    },
    searchMicBtn: {
        width: 30,
        height: 30,
        alignItems: 'center',
        justifyContent: 'center',
    },
    searchMicImg: {
        width: 17,
        height: 17,
        tintColor: '#64748B',
    },
    searchDivider: {
        width: 1,
        height: 20,
        backgroundColor: '#E2E8F0',
        marginHorizontal: 6,
    },
    searchFilterBtn: {
        width: 34,
        height: 34,
        borderRadius: 10,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    searchFilterBtnPressed: {
        backgroundColor: colors.primaryDark,
    },
    searchFilterImg: {
        width: 16,
        height: 16,
        tintColor: '#FFFFFF',
    },
    searchResultsDropdown: {
        position: 'absolute',
        top: 56, // pushed down slightly
        left: 0,
        right: 0,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 12, // stronger shadow for popup
        borderWidth: 1,
        borderColor: '#E2E8F0',
        zIndex: 999, // very high zIndex to cover map
        overflow: 'hidden',
    },
    searchResultItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
        backgroundColor: '#FFFFFF', // solid background
    },
    searchResultIcon: {
        width: 18,
        height: 18,
        tintColor: colors.primary, // highlighted icon
        marginRight: 12,
        opacity: 0.8,
    },
    searchResultText: {
        fontSize: 13.5,
        color: '#1E293B',
        fontWeight: '500',
        flex: 1,
    },

    /* Sheet */
    sheet: {
        backgroundColor: '#F8FAFD',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        marginTop: -30,
        paddingTop: 16,
        paddingHorizontal: 16,
    },

    /* Category Selector */
    catCardsRow: {
        flexDirection: 'row',
        gap: 10,
        paddingBottom: 14,
    },
    catCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 16,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#F1F5F9',
        shadowColor: '#94A3B8',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 2,
    },
    catCardActive: {
        borderColor: colors.primary,
        borderWidth: 1.5,
        backgroundColor: '#FFF7ED',
        shadowColor: colors.primary,
        shadowOpacity: 0.2,
        elevation: 4,
    },
    catIconBadge: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: '#F8FAFC',
        alignItems: 'center',
        justifyContent: 'center',
    },
    catIconBadgeActive: {
        backgroundColor: colors.primary,
    },
    catIconImg: {
        width: 18,
        height: 18,
    },
    catCardLabel: {
        fontSize: 13,
        fontWeight: '800',
        color: '#334155',
    },
    catCardLabelActive: {
        color: colors.primaryDark,
    },
    catCardCount: {
        fontSize: 10,
        color: '#64748B',
        fontWeight: '600',
        marginTop: 2,
    },
    catCardCountActive: {
        color: colors.primary,
    },

    /* Header Row & Count */
    viewToggleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 14,
    },
    sectionHeaderCol: {
        flex: 1,
        paddingRight: 10,
    },
    sectionTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    sectionHeaderTitle: {
        fontSize: 16.5,
        fontWeight: '900',
        color: '#0F172A',
        letterSpacing: -0.3,
    },
    liveSlotsBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#DCFCE7',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
        gap: 4,
    },
    liveSlotsDot: {
        width: 5,
        height: 5,
        borderRadius: 2.5,
        backgroundColor: '#16A34A',
    },
    liveSlotsBadgeText: {
        fontSize: 8.5,
        fontWeight: '900',
        color: '#16A34A',
        letterSpacing: 0.5,
    },
    sectionSubRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 3,
        gap: 3,
    },
    subPinIcon: {
        width: 12,
        height: 12,
        tintColor: colors.primary,
    },
    sectionHeaderSub: {
        fontSize: 11.5,
        color: '#64748B',
        fontWeight: '500',
    },
    countBoldHighlight: {
        fontWeight: '900',
        color: colors.primary,
    },

    /* Segment Pill */
    togglePill: {
        flexDirection: 'row',
        backgroundColor: '#EDEBF0',
        borderRadius: 12,
        padding: 2.5,
    },
    toggleBtn: {
        paddingHorizontal: 11,
        paddingVertical: 5,
        borderRadius: 9,
    },
    toggleBtnActive: {
        backgroundColor: '#FFFFFF',
        elevation: 2,
    },
    toggleBtnText: {
        fontSize: 11.5,
        fontWeight: '700',
        color: '#64748B',
    },
    toggleBtnTextActive: {
        color: colors.primary,
        fontWeight: '900',
    },

    /* Map Container */
    mapWrapper: {
        marginBottom: 14,
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        position: 'relative',
    },
    mapLiveHeader: {
        position: 'absolute',
        top: 10,
        left: 10,
        right: 10,
        zIndex: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    mapLiveBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
        paddingHorizontal: 10,
        paddingVertical: 4.5,
        borderRadius: 14,
    },
    mapLiveDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#22C55E',
    },
    mapLiveText: {
        color: '#FFFFFF',
        fontSize: 10.5,
        fontWeight: '800',
    },
    mapLiveCount: {
        color: '#0F172A',
        fontSize: 10.5,
        fontWeight: '900',
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        elevation: 2,
    },

    /* List Item Cards */
    cardWrapper: {
        paddingHorizontal: 16,
        paddingBottom: 11,
    },
    compactCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        borderWidth: 0.5,
        borderColor: '#E2E8F0',
        borderLeftWidth: 3.5,
        borderLeftColor: colors.primary,
        padding: 8,
        shadowColor: '#334155',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
    },
    compactCardSelected: {
        borderColor: colors.primary,
        borderWidth: 2,
        borderLeftWidth: 5,
        backgroundColor: '#FFF7ED',
        elevation: 6,
        shadowColor: colors.primary,
        shadowOpacity: 0.2,
        shadowRadius: 6,
    },
    cardTopBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: 6,
        marginBottom: 6,
        borderBottomWidth: 1,
        borderBottomColor: '#F8FAFC',
    },
    verifiedRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    shieldMiniIcon: {
        width: 14,
        height: 14,
        tintColor: colors.primary,
    },
    verifiedTagText: {
        fontSize: 9.5,
        fontWeight: '600',
        color: '#64748B',
        letterSpacing: 0.3,
    },
    themeSlotsPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: '#FFF7ED',
        borderWidth: 1,
        borderColor: '#FED7AA',
        paddingHorizontal: 8,
        paddingVertical: 2.5,
        borderRadius: 8,
    },
    themeDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: colors.primary,
    },
    themeSlotsText: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.primary,
        letterSpacing: 0.3,
    },
    cardCenterRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    compactThumb: {
        width: 44,
        height: 44,
        borderRadius: 10,
    },
    compactThumbFallback: {
        width: 44,
        height: 44,
        borderRadius: 10,
        backgroundColor: '#FFF7ED',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#FFEDD5',
    },
    thumbFallbackIcon: {
        width: 16,
        height: 16,
        tintColor: colors.primary,
    },
    centerMetaCol: {
        flex: 1,
        marginLeft: 11,
        marginRight: 8,
    },
    lotNameText: {
        fontSize: 13.5,
        fontWeight: '600',
        color: '#0F172A',
        lineHeight: 18,
    },
    addressRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
        gap: 3,
    },
    pinIcon: {
        width: 11,
        height: 11,
        tintColor: '#64748B',
    },
    addressText: {
        fontSize: 11,
        color: '#64748B',
        fontWeight: '400',
        flex: 1,
    },
    progressRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
        marginTop: 5,
    },
    progressTrack: {
        flex: 1,
        height: 4.5,
        borderRadius: 3,
        backgroundColor: '#F1F5F9',
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: colors.primary,
        borderRadius: 3,
    },
    progressRatioText: {
        fontSize: 9.5,
        fontWeight: '800',
        color: colors.primary,
    },
    rateContainer: {
        alignItems: 'flex-end',
        justifyContent: 'center',
        paddingLeft: 6,
    },
    rateValueText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#0F172A',
    },
    rateUnitText: {
        fontSize: 8.5,
        fontWeight: '500',
        color: '#64748B',
        marginTop: -1,
    },
    distSubBadge: {
        backgroundColor: '#F1F5F9',
        borderRadius: 6,
        paddingHorizontal: 5,
        paddingVertical: 2,
        marginTop: 3,
    },
    distSubText: {
        fontSize: 9.5,
        fontWeight: '700',
        color: '#475569',
    },
    cardBottomRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 6,
        paddingTop: 6,
        borderTopWidth: 1,
        borderTopColor: '#F8FAFC',
    },
    tagGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    infoTag: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        paddingHorizontal: 6,
        paddingVertical: 2.5,
        borderRadius: 6,
    },
    tagMicroIcon: {
        width: 10,
        height: 10,
        tintColor: '#64748B',
    },
    tagText: {
        fontSize: 9.5,
        fontWeight: '700',
        color: '#475569',
    },
    valetTag: {
        backgroundColor: '#EFF6FF',
        borderColor: '#DBEAFE',
    },
    valetTagText: {
        fontSize: 9.5,
        fontWeight: '800',
        color: '#2563EB',
    },
    actionBtnGroup: {
        flexDirection: 'row',
        gap: 6,
    },
    navBtn: {
        height: 28,
        paddingHorizontal: 8,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#CBD5E1',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F8FAFC',
        flexDirection: 'row',
        gap: 4,
    },
    navIconCircle: {
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: '#E2E8F0',
        alignItems: 'center',
        justifyContent: 'center',
    },
    navIconStyle: {
        width: 9,
        height: 9,
        tintColor: '#3B82F6',
    },
    navBtnPressed: {
        backgroundColor: '#E2E8F0',
    },
    navBtnText: {
        fontSize: 10.5,
        fontWeight: '700',
        color: '#3B82F6',
    },
    bookBtn: {
        height: 28,
        paddingHorizontal: 10,
        borderRadius: 6,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        elevation: 1,
    },
    bookBtnDisabled: {
        backgroundColor: '#94A3B8',
        elevation: 0,
    },
    bookBtnPressed: {
        backgroundColor: colors.primaryDark,
    },
    bookBtnText: {
        fontSize: 10.5,
        fontWeight: '800',
        color: '#FFFFFF',
    },
    chevronIcon: {
        width: 9,
        height: 9,
    },

    /* Trust Footer */
    footerTrustNotice: {
        marginTop: 6,
        alignItems: 'center',
        paddingVertical: 6,
    },
    trustBadgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    footerShieldIcon: {
        width: 14,
        height: 14,
        tintColor: colors.primary,
    },
    footerTrustText: {
        fontSize: 10.5,
        color: '#64748B',
        fontWeight: '600',
        textAlign: 'center',
    },

    /* Floating Top Button */
    floatingTopBtn: {
        position: 'absolute',
        bottom: 115,
        right: 18,
        zIndex: 999,
    },
    floatingTopBtnPress: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 5,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    floatingTopIcon: {
        width: 18,
        height: 18,
        tintColor: colors.primary,
        transform: [{ rotate: '-90deg' }],
    },

    /* Notification & Prompt Modals */
    modalBottomBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        justifyContent: 'flex-end',
    },
    modalCard: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 20,
        maxHeight: '75%',
    },
    modalHandle: {
        width: 40,
        height: 4,
        backgroundColor: '#CBD5E1',
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 14,
    },
    notifHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '900',
        color: '#0F172A',
    },
    notifModalCloseBtn: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#F1F5F9',
        alignItems: 'center',
        justifyContent: 'center',
    },
    notifClose: {
        fontSize: 13,
        color: '#64748B',
        fontWeight: '700',
    },
    notifItem: {
        flexDirection: 'row',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
        gap: 12,
    },
    notifIconCircle: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 2,
    },
    notifIcon: {
        fontSize: 13,
        fontWeight: '900',
    },
    notifRealIcon: {
        width: 18,
        height: 18,
        tintColor: colors.primary,
    },
    notifItemTitle: {
        fontSize: 13.5,
        fontWeight: '800',
        color: '#0F172A',
    },
    notifItemDesc: {
        fontSize: 12,
        color: '#64748B',
        marginTop: 2,
        lineHeight: 16,
    },
    notifItemTime: {
        fontSize: 10.5,
        color: '#94A3B8',
        marginTop: 4,
        fontWeight: '600',
    },
    modalCenterBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    profilePromptCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 22,
        padding: 22,
        width: '100%',
        maxWidth: 340,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 10,
    },
    promptBadge: {
        width: 54,
        height: 54,
        borderRadius: 27,
        backgroundColor: '#FFF7ED',
        borderWidth: 2,
        borderColor: '#FED7AA',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    promptBadgeIcon: {
        width: 28,
        height: 28,
        tintColor: colors.primary,
    },
    promptTitle: {
        fontSize: 18,
        fontWeight: '900',
        color: '#0F172A',
        textAlign: 'center',
    },
    promptDesc: {
        fontSize: 12,
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 17,
        marginTop: 5,
        paddingHorizontal: 4,
    },
    promptProgressWrap: {
        width: '100%',
        marginTop: 14,
        marginBottom: 12,
    },
    promptProgressBar: {
        height: 7,
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
        fontSize: 10.5,
        fontWeight: '800',
        color: colors.primary,
        textAlign: 'right',
        marginTop: 4,
    },
    promptChecklist: {
        width: '100%',
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        padding: 10,
        gap: 6,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    checkRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    checkGreen: {
        fontSize: 12,
        fontWeight: '900',
        color: '#10B981',
        width: 14,
    },
    checkPending: {
        fontSize: 12,
        fontWeight: '900',
        color: '#94A3B8',
        width: 14,
    },
    checkText: {
        fontSize: 11.5,
        color: '#334155',
        fontWeight: '600',
        flex: 1,
    },
    promptBtnRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginTop: 18,
        width: '100%',
    },
    promptLaterBtn: {
        flex: 1,
        height: 42,
        borderRadius: 11,
        borderWidth: 1.5,
        borderColor: '#CBD5E1',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
    },
    promptLaterText: {
        fontSize: 13.5,
        fontWeight: '700',
        color: '#64748B',
    },
    promptCompleteBtn: {
        flex: 1.5,
        height: 42,
        borderRadius: 11,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 3,
    },
    promptCompleteText: {
        fontSize: 13.5,
        fontWeight: '800',
        color: '#FFFFFF',
    },

    /* ================= 🔥 PIN DETAILS CARD (BOTTOM TABS VISIBLE) ================= */
    sheetCardWrapper: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 16,
        paddingTop: 10,
        maxHeight: 340, // Compact height so screen is visible
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 20,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
    },
    sheetHandleBar: {
        width: 38,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#CBD5E1',
        alignSelf: 'center',
        marginBottom: 8,
    },
    sheetRibbonRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    sheetCivicTag: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#FFF7ED',
        borderWidth: 1,
        borderColor: '#FED7AA',
        paddingHorizontal: 7,
        paddingVertical: 2.5,
        borderRadius: 5,
    },
    sheetShieldIcon: {
        width: 11,
        height: 11,
        tintColor: colors.primary,
    },
    sheetCivicTagText: {
        fontSize: 9,
        fontWeight: '900',
        color: colors.primary,
        letterSpacing: 0.3,
    },
    sheetCloseBtnCircle: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#F1F5F9',
        alignItems: 'center',
        justifyContent: 'center',
    },
    sheetCloseBtnText: {
        fontSize: 11,
        fontWeight: '800',
        color: '#64748B',
    },
    sheetScrollableContent: {
        paddingBottom: 6,
    },

    /* Title & Free Slots */
    sheetTitleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 10,
    },
    sheetBayTitle: {
        fontSize: 15,
        fontWeight: '900',
        color: '#0F172A',
        lineHeight: 19,
    },
    sheetAddressRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
        gap: 3,
    },
    sheetPinIcon: {
        width: 11,
        height: 11,
        tintColor: '#64748B',
    },
    sheetAddressText: {
        fontSize: 11,
        color: '#64748B',
        fontWeight: '500',
        flex: 1,
    },
    sheetDistanceRow: {
        marginTop: 2,
    },
    sheetDistanceText: {
        fontSize: 10.5,
        fontWeight: '700',
        color: colors.primary,
    },

    /* Slots Pill */
    sheetSlotsBox: {
        backgroundColor: '#F0FDF4',
        borderWidth: 1.2,
        borderColor: '#DCFCE7',
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 5,
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 64,
    },
    sheetSlotsInner: {
        alignItems: 'center',
    },
    sheetSlotsCount: {
        fontSize: 16,
        fontWeight: '900',
        color: '#16A34A',
        lineHeight: 18,
    },
    sheetSlotsSub: {
        fontSize: 7.5,
        fontWeight: '800',
        color: '#15803D',
        letterSpacing: 0.3,
        marginTop: 1,
    },

    /* 4W & 2W Tariff Pods */
    sheetTariffGrid: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        paddingHorizontal: 10,
        paddingVertical: 6,
        marginBottom: 8,
    },
    tariffPod: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    tariffIconBox: {
        width: 26,
        height: 26,
        borderRadius: 6,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    tariffVehIcon: {
        width: 14,
        height: 14,
        tintColor: colors.primary,
    },
    tariffTypeLabel: {
        fontSize: 8.5,
        color: '#64748B',
        fontWeight: '700',
    },
    tariffPriceVal: {
        fontSize: 12.5,
        fontWeight: '900',
        color: '#0F172A',
        marginTop: 0.5,
    },
    tariffPerHr: {
        fontSize: 8.5,
        fontWeight: '600',
        color: '#64748B',
    },
    tariffDivider: {
        width: 1,
        height: 20,
        backgroundColor: '#E2E8F0',
        marginHorizontal: 6,
    },

    /* Advance Booking Notice */
    bookingNoticeBarActive: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: '#F0FDF4',
        borderWidth: 1,
        borderColor: '#DCFCE7',
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 5,
        marginBottom: 10,
    },
    pulseGreenDot: {
        width: 5,
        height: 5,
        borderRadius: 2.5,
        backgroundColor: '#16A34A',
    },
    bookingNoticeTextActive: {
        fontSize: 10,
        fontWeight: '700',
        color: '#15803D',
    },
    bookingNoticeBarDisabled: {
        backgroundColor: '#FFFBEB',
        borderWidth: 1,
        borderColor: '#FEF3C7',
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 5,
        marginBottom: 10,
    },
    bookingNoticeTextDisabled: {
        fontSize: 10,
        fontWeight: '700',
        color: '#B45309',
    },

    /* Action Buttons Row */
    sheetActionsRow: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 2,
    },
    sheetNavBtn: {
        height: 40,
        paddingHorizontal: 12,
        borderRadius: 10,
        borderWidth: 1.2,
        borderColor: colors.primary,
        backgroundColor: '#FFFFFF',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
    },
    sheetNavBtnPressed: {
        backgroundColor: '#FFF7ED',
    },
    sheetNavBtnIcon: {
        width: 13,
        height: 13,
        tintColor: colors.primary,
    },
    sheetNavBtnText: {
        fontSize: 12,
        fontWeight: '800',
        color: colors.primary,
    },
    sheetBookBtn: {
        flex: 1,
        height: 40,
        borderRadius: 10,
        backgroundColor: colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 5,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 2,
    },
    sheetBookBtnPressed: {
        backgroundColor: colors.primaryDark,
        transform: [{ scale: 0.98 }],
    },
    sheetBookBtnDisabled: {
        backgroundColor: '#CBD5E1',
        shadowOpacity: 0,
        elevation: 0,
    },
    sheetBookBtnText: {
        fontSize: 13,
        fontWeight: '900',
        color: '#FFFFFF',
    },
    sheetBookChevron: {
        width: 10,
        height: 10,
        tintColor: '#FFFFFF',
    },

    /* Custom Booking Unavailable Popup */
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    modalBox: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 24,
        width: '100%',
        maxWidth: 340,
        alignItems: 'center',
        elevation: 10,
    },
    modalIconCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    modalIconEmoji: {
        fontSize: 26,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#0F172A',
        marginBottom: 8,
        textAlign: 'center',
    },
    modalMessage: {
        fontSize: 13,
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 24,
    },
    modalCloseBtn: {
        width: '100%',
        height: 46,
        borderRadius: 14,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 3,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },
    modalCloseBtnText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '800',
    },
});