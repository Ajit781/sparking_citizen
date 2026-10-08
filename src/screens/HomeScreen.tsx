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
    Keyboard,
    AppState,
    PanResponder,
} from 'react-native';

export const NativeMultiMap = requireNativeComponent('NativeMultiMap');
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
import AsyncStorage from '@react-native-async-storage/async-storage';

interface HomeScreenProps {
    go: (s: ScreenName) => void;
    onLogout?: () => void;
    isActive?: boolean;
}

let cachedParkingLots: any[] = [];
let cachedMapRegion: any = null;
let lastFetchTime: number = 0;

export default function HomeScreen({ go, onLogout, isActive = true }: HomeScreenProps) {
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
    const [isMapFullScreen, setIsMapFullScreen] = useState(false);

    // Voice Search State
    const [isListening, setIsListening] = useState<boolean>(false);
    const [listeningText, setListeningText] = useState<string>('Listening...');
    const [voiceError, setVoiceError] = useState<string>('');

    // Google Places Search State
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [allAdminParkingAreas, setAllAdminParkingAreas] = useState<any[]>([]);
    const [isSearchingPlaces, setIsSearchingPlaces] = useState<boolean>(false);
    const [displayCount, setDisplayCount] = useState<number>(10); // Prevents UI freeze by rendering only 10 items initially
    const GOOGLE_API_KEY = 'AIzaSyAcBZVUBHhKE_HU7t0JGFq6mQV-p-mBVXQ';

    // Map Touch & Scroll Control — ref-based for instant synchronous locking
    const scrollViewRef = useRef<ScrollView>(null);

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
    const [showLots, setShowLots] = useState<boolean>(false);
    const [bookingDisabledModal, setBookingDisabledModal] = useState({ visible: false, lotName: '' });
    const [mapPopup, setMapPopup] = useState<{ visible: boolean; title: string; message: string; isError: boolean } | null>(null);
    const [selectedParkingForModal, setSelectedParkingForModal] = useState<any>(null);
    const [markersReady, setMarkersReady] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [isFetchingMapClick, setIsFetchingMapClick] = useState(false);
    const [tapMarker, setTapMarker] = useState<{ latitude: number; longitude: number, title?: string } | null>(null);
    const [mapRegion, setMapRegion] = useState<{
        latitude: number;
        longitude: number;
        latitudeDelta: number;
        longitudeDelta: number;
    } | null>(cachedMapRegion);
    const [searchCenter, setSearchCenter] = useState<{ lat: number, lng: number } | null>(
        cachedMapRegion ? { lat: cachedMapRegion.latitude, lng: cachedMapRegion.longitude } : null
    );
    const [isTabSwitching, setIsTabSwitching] = useState(false);

    useEffect(() => {
        if (!isActive) {
            setSearchQuery('');
            setSearchResults([]);
            setIsSearchingPlaces(false);
        }
    }, [isActive]);

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
        } catch (error: any) {
            console.log('Failed to fetch nearby parking areas:', error);
            const errorMsg = error?.message?.toLowerCase() || '';
            const isNetworkError = errorMsg.includes('network') || errorMsg.includes('fetch') || errorMsg.includes('connect') || errorMsg.includes('timeout');

            setMapPopup({
                visible: true,
                title: isNetworkError ? 'Connection Offline 📶' : 'Oops! Server Hiccup 🚗',
                message: isNetworkError
                    ? "It looks like you're offline or your network is weak. Please check your internet connection and try again."
                    : "We couldn't fetch parking areas right now. Our servers might be taking a quick nap. Please try again in a moment!",
                isError: true
            });
            setParkingLots([]);
        }
    };
    const handleMapPress = async (e: any) => {
        const lat = e.nativeEvent?.latitude || e.nativeEvent?.coordinate?.latitude;
        const lng = e.nativeEvent?.longitude || e.nativeEvent?.coordinate?.longitude;
        if (lat && lng) {
            // Instantly show tap marker at pressed location
            setTapMarker({ latitude: lat, longitude: lng, title: 'Map Selection' });

            setMapRegion({
                latitude: lat,
                longitude: lng,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
            } as any);

            // Show loader while fetching
            setIsFetchingMapClick(true);
            try {
                console.log(`[MAP CLICK] Requesting parking areas for Lat: ${lat}, Lng: ${lng}`);
                const data = await citizenService.getCitizenNearbyParkingAreas(lat, lng, 2, activeCategory);
                console.log("[MAP CLICK API RESPONSE]:", JSON.stringify(data, null, 2));

                if (data && data.length > 0) {
                    cachedParkingLots = data;
                    lastFetchTime = Date.now();
                    setParkingLots(data);
                    setShowLots(true);
                } else {
                    cachedParkingLots = [];
                    lastFetchTime = Date.now();
                    setParkingLots([]);
                }
            } catch (error: any) {
                console.error("[MAP CLICK API ERROR]:", error);
                setMapPopup({
                    visible: true,
                    title: 'Error Fetching Parking',
                    message: error?.message || 'Server error. Please try again later.',
                    isError: true
                });
                cachedParkingLots = [];
                lastFetchTime = Date.now();
                setParkingLots([]);
            } finally {
                setIsFetchingMapClick(false);
                // Tap marker stays visible until user taps a new location
            }
        }
    };


    const handleCategorySelect = (id: number | null) => {
        setActiveCategory(id);
        setDisplayCount(10); // Reset list display count when filtering
        // Priority: 1. Map Tap location → tapMarker
        //           2. User searched a location → searchCenter
        //           3. Default → GPS location (cachedMapRegion)
        // DO NOT use mapRegion state — it goes stale after manual map pan!
        const filterLat = tapMarker?.latitude ?? searchCenter?.lat ?? cachedMapRegion?.latitude;
        const filterLng = tapMarker?.longitude ?? searchCenter?.lng ?? cachedMapRegion?.longitude;

        if (filterLat && filterLng) {
            citizenService.getCitizenNearbyParkingAreas(filterLat, filterLng, 2, id)
                .then(data => {
                    cachedParkingLots = data || [];
                    lastFetchTime = Date.now();
                    setParkingLots(data || []);
                })
                .catch((error: any) => {
                    console.log('Filter fetch error:', error);
                    setMapPopup({
                        visible: true,
                        title: 'Filter Error',
                        message: error?.message || 'Server error. Please try again later.',
                        isError: true
                    });
                });
        }
    };

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        setShowLots(true);
        if (searchCenter) {
            fetchNearbyParking(searchCenter.lat, searchCenter.lng, true, activeCategory).finally(() => setRefreshing(false));
        } else if (mapRegion) {
            fetchNearbyParking(mapRegion.latitude, mapRegion.longitude, true, activeCategory).finally(() => setRefreshing(false));
        } else {
            setRefreshing(false);
        }
    }, [mapRegion, searchCenter, activeCategory]);

    // Refs to control when camera should follow user vs stay panned
    const hasInitialLocationRef = useRef(false);
    const shouldCenterOnUserRef = useRef(false);

    const fetchFreshUserLocation = useCallback(async () => {
        let hasPermission = false;
        if (Platform.OS === 'android') {
            try {
                const check = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
                if (check) {
                    hasPermission = true;
                } else {
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
                }
            } catch (err) {
                console.warn(err);
            }
        } else {
            hasPermission = true;
        }

        if (hasPermission) {
            // Stage 1: Network/WiFi se turant location lo (< 1 second)
            Geolocation.getCurrentPosition(
                position => {
                    const { latitude, longitude } = position.coords;
                    console.log(`[HomeScreen] FAST location: Lat=${latitude}, Lng=${longitude}`);
                    citizenService.setUserLocation({ latitude, longitude });
                    const newRegion = { latitude, longitude, latitudeDelta: 0.008, longitudeDelta: 0.008, zoom: 17.0 };
                    setMapRegion(newRegion);
                    cachedMapRegion = newRegion;
                    setSearchQuery(''); // Clear previous search text
                    setTapMarker(null); // Clear previous blue tap marker
                    fetchNearbyParking(latitude, longitude, true); // Force fetch API for new GPS location

                    // Stage 2: GPS se accurate location (background mein refine)
                    Geolocation.getCurrentPosition(
                        pos2 => {
                            const { latitude: lat2, longitude: lng2 } = pos2.coords;
                            console.log(`[HomeScreen] GPS accurate: Lat=${lat2}, Lng=${lng2}`);
                            citizenService.setUserLocation({ latitude: lat2, longitude: lng2 });
                            const region2 = { latitude: lat2, longitude: lng2, latitudeDelta: 0.008, longitudeDelta: 0.008, zoom: 17.0 };
                            setMapRegion(region2);
                            cachedMapRegion = region2;
                        },
                        () => { /* GPS refine failed — Stage 1 location already shown */ },
                        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
                    );
                },
                error => {
                    console.log('[HomeScreen] Location Fetch ERROR:', error.code, error.message);
                    if (error.code === 2) {
                        Alert.alert(
                            "Turn on Location",
                            "Please enable Location Services (GPS) to see nearby parking slots.",
                            [
                                { text: "Cancel", style: "cancel" },
                                {
                                    text: "Settings",
                                    onPress: () => {
                                        if (Platform.OS === 'android') {
                                            Linking.sendIntent('android.settings.LOCATION_SOURCE_SETTINGS');
                                        } else {
                                            Linking.openSettings();
                                        }
                                    }
                                }
                            ]
                        );
                    }
                    if (!cachedMapRegion) {
                        const defaultRegion = {
                            latitude: 22.5726,
                            longitude: 88.3639,
                            latitudeDelta: 0.008,
                            longitudeDelta: 0.008,
                        };
                        setMapRegion(defaultRegion);
                        cachedMapRegion = defaultRegion;
                        fetchNearbyParking(22.5726, 88.3639);
                    }
                },
                { enableHighAccuracy: false, timeout: 5000, maximumAge: 30000 }
            );
        }
    }, []);

    // Jab bhi tab wapas HomeScreen pe aaye, instantly current GPS location pe camera move karo!
    useEffect(() => {
        if (isActive && cachedMapRegion) {
            console.log('[HomeScreen] Tab active again -> instant camera snap to current GPS location');
            setIsTabSwitching(true); // Loader start

            // Clear any old tap marker when returning home — show fresh GPS state
            setTapMarker(null);

            // Force React Native to re-send the GPS mapRegion to Java
            setMapRegion({
                ...cachedMapRegion,
                latitudeDelta: cachedMapRegion.latitudeDelta + (Math.random() * 0.0000001)
            });

            // Ensure P icons are loaded for the current GPS location
            fetchNearbyParking(cachedMapRegion.latitude, cachedMapRegion.longitude, true);

            // Map snap hone ke baad smoothly hide kar do
            setTimeout(() => {
                setIsTabSwitching(false);
            }, 600); // 600ms loader to cover map rendering delay
        }
    }, [isActive]);

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
                console.log("[API RESPONSE - userSession]:", JSON.stringify(session, null, 2));
                setUserSession(session);
                try {
                    const profile = await citizenService.getCitizenProfile(session.login_user_id);
                    console.log("[API RESPONSE - citizenProfile]:", JSON.stringify(profile, null, 2));
                    if (profile) {
                        setCitizenProfile(profile);
                        const percent = calculateProfileCompletion(profile);
                        setProfileCompletionPercent(percent);
                        if (!profile.profile_complete || percent < 100) {
                            // Sirf pehli baar dikhao — AsyncStorage se check karo
                            const storageKey = `profile_prompt_shown_${session.login_user_id}`;
                            const alreadyShown = await AsyncStorage.getItem(storageKey);
                            if (!alreadyShown) {
                                setTimeout(() => {
                                    setShowProfilePromptModal(true);
                                    AsyncStorage.setItem(storageKey, 'true');
                                }, 800);
                            }
                        }
                    }
                } catch (err) {
                    console.log('[HomeScreen] Initial profile check notice:', err);
                    setProfileCompletionPercent(25);
                    // Don't show popup on catch — only on first load with confirmed profile
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

        // Initial one-time fetch
        fetchFreshUserLocation();

        // Fetch all admin parking areas for search suggestions
        citizenService.getAdminParkingAreas().then(areas => {
            if (areas && areas.length > 0) {
                setAllAdminParkingAreas(areas);
            }
        }).catch(err => console.log('Failed to fetch admin parking areas:', err));

        // watchPosition: continuously track GPS
        const watchId = Geolocation.watchPosition(
            position => {
                const { latitude, longitude } = position.coords;
                console.log(`[HomeScreen] watchPosition UPDATE: Lat=${latitude}, Lng=${longitude}`);
                citizenService.setUserLocation({ latitude, longitude });

                const newRegion = {
                    latitude,
                    longitude,
                    latitudeDelta: 0.008,
                    longitudeDelta: 0.008,
                };

                if (!hasInitialLocationRef.current) {
                    // First GPS fix ever — center map on user
                    hasInitialLocationRef.current = true;
                    setMapRegion(newRegion);
                    cachedMapRegion = newRegion;
                    fetchNearbyParking(latitude, longitude, true);
                } else if (shouldCenterOnUserRef.current) {
                    // User came back from Settings with GPS ON
                    shouldCenterOnUserRef.current = false;
                    setMapRegion(newRegion);
                    cachedMapRegion = newRegion;
                    fetchNearbyParking(latitude, longitude, true);
                } else {
                    // Just store GPS coords silently, don't move camera
                    cachedMapRegion = newRegion;
                }
            },
            error => {
                console.log('[HomeScreen] watchPosition error:', error.code, error.message);
            },
            { enableHighAccuracy: true, distanceFilter: 30, interval: 5000, fastestInterval: 2000 }
        );

        // AppState: jab user Settings se wapas aaye, seedha getCurrentPosition call karo
        const appStateSub = AppState.addEventListener('change', nextAppState => {
            if (nextAppState === 'active') {
                // Stage 1: Network/WiFi se instant location lo (~500ms)
                Geolocation.getCurrentPosition(
                    position => {
                        const { latitude, longitude } = position.coords;
                        console.log(`[HomeScreen] Resume FAST location: Lat=${latitude}, Lng=${longitude}`);
                        citizenService.setUserLocation({ latitude, longitude });
                        const newRegion = { latitude, longitude, latitudeDelta: 0.008, longitudeDelta: 0.008 };
                        setMapRegion(newRegion);
                        cachedMapRegion = newRegion;
                        fetchNearbyParking(latitude, longitude, true);

                        // Stage 2: GPS se accurate location lo (background mein)
                        Geolocation.getCurrentPosition(
                            pos2 => {
                                const { latitude: lat2, longitude: lng2 } = pos2.coords;
                                console.log(`[HomeScreen] Resume GPS location: Lat=${lat2}, Lng=${lng2}`);
                                citizenService.setUserLocation({ latitude: lat2, longitude: lng2 });
                                const region2 = { latitude: lat2, longitude: lng2, latitudeDelta: 0.008, longitudeDelta: 0.008 };
                                setMapRegion(region2);
                                cachedMapRegion = region2;
                            },
                            () => { /* GPS refine failed silently */ },
                            { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
                        );
                    },
                    error => {
                        console.log('[HomeScreen] AppState resume location error:', error.code);
                    },
                    { enableHighAccuracy: false, timeout: 5000, maximumAge: 30000 }
                );
            }
        });

        return () => {
            Geolocation.clearWatch(watchId);
            appStateSub.remove();
        };
    }, [fetchFreshUserLocation]);



    // Debounced OpenStreetMap (Nominatim) Search & Admin Parking Areas Search
    useEffect(() => {
        const query = searchQuery.trim();
        if (query.length > 0 && query.toLowerCase() !== selectedAddress.toLowerCase()) {
            const timerId = setTimeout(async () => {
                let combinedResults: any[] = [];

                // 1. Search in local admin parking areas
                if (allAdminParkingAreas.length > 0) {
                    const lowerQ = query.toLowerCase();
                    const matchedAreas = allAdminParkingAreas.filter((item: any) => {
                        const name = (item.location || item.name || '').toLowerCase();
                        const address = (item.address || '').toLowerCase();
                        const code = (item.parking_area_code || item.code || '').toLowerCase();
                        return name.includes(lowerQ) || address.includes(lowerQ) || code.includes(lowerQ);
                    }).slice(0, 5); // Limit to 5 parking results

                    if (matchedAreas.length > 0) {
                        const parkingResults = matchedAreas.map((item: any) => ({
                            place_id: `parking_${item.parking_area_id || item.id}`,
                            description: `🅿️ ${item.location || item.name} (${item.address || 'Kolkata'})`,
                            lat: parseFloat(item.latitude || item.lat),
                            lng: parseFloat(item.longitude || item.lng),
                            isParking: true,
                        }));
                        combinedResults = [...parkingResults];
                    }
                }

                // 2. Fetch OSM Results if query > 2 chars
                if (query.length > 2) {
                    try {
                        // Append 'Kolkata' to ensure results are restricted to the city
                        const osmQuery = query.toLowerCase().includes('kolkata') ? query : `${query}, Kolkata`;
                        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(osmQuery)}&format=json&countrycodes=in&limit=5`;
                        const res = await fetch(url, {
                            headers: {
                                'User-Agent': 'sParking Citizen App / 1.0' // Required by OSM policies
                            }
                        });
                        const json = await res.json();

                        if (json && json.length > 0) {
                            console.log('--- OSM SEARCH RESULTS ---', json.length);
                            const osmResults = json.map((item: any) => ({
                                place_id: item.place_id.toString(),
                                description: item.display_name,
                                lat: parseFloat(item.lat),
                                lng: parseFloat(item.lon)
                            }));
                            combinedResults = [...combinedResults, ...osmResults].slice(0, 10);
                        }
                    } catch (error) {
                        console.log('OSM API Error', error);
                    }
                }

                setSearchResults(combinedResults);
            }, 600);
            return () => clearTimeout(timerId);
        } else {
            setSearchResults([]);
        }
    }, [searchQuery, selectedAddress, allAdminParkingAreas]);

    const handlePlaceSelect = async (placeId: string, description: string, lat?: number, lng?: number) => {
        Keyboard.dismiss();
        setSearchQuery(description);
        setSelectedAddress(description.toLowerCase().trim());
        setSearchResults([]);
        setIsSearchingPlaces(true);
        setShowLots(true);
        setDisplayCount(10); // Reset list display count when searching

        if (lat && lng) {
            console.log('--- OSM SELECTED LOCATION ---');
            console.log(`Address: ${description}`);
            console.log(`Coordinates: Lat ${lat}, Lng ${lng}`);

            setMapRegion({
                latitude: lat,
                longitude: lng,
                latitudeDelta: 0.002 + (Math.random() * 0.0000001), // Close zoom with jitter to force re-render
                longitudeDelta: 0.002,
                zoom: 18.0
            } as any);

            setTapMarker({ latitude: lat, longitude: lng, title: description });

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

    useEffect(() => {
        if (filteredLots.length > 0) {
            console.log('\n=== PARKING LIST DATA START ===');
            console.log(JSON.stringify(filteredLots, null, 2));
            console.log('=== PARKING LIST DATA END ===\n');
        }
    }, [filteredLots]);

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
            // Camera movement is now handled 100% natively in Java (NativeMultiMapManager)
            // on the exact moment the marker is tapped. This guarantees it never gets dropped!
            console.log(`[MAP CLICK] Natively moving camera to Lat: ${lat}, Lng: ${lng}`);
        }

        // Just open popup sheet immediately with list data to save API calls
        setSelectedParkingForModal(lot);
    };

    const floatAnim = useRef(new Animated.Value(0)).current;
    
    const screenHeight = Dimensions.get('window').height;
    const sheetHeightAnim = useRef(new Animated.Value(85)).current;
    const lastHeightRef = useRef(85);

    const panResponder = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (_, gestureState) => {
                return Math.abs(gestureState.dy) > 5;
            },
            onPanResponderMove: (_, gestureState) => {
                let newHeight = lastHeightRef.current - gestureState.dy;
                if (newHeight > screenHeight * 0.75) newHeight = screenHeight * 0.75;
                if (newHeight < 85) newHeight = 85;
                sheetHeightAnim.setValue(newHeight);
            },
            onPanResponderRelease: (_, gestureState) => {
                if (gestureState.dy < -50) {
                    lastHeightRef.current = screenHeight * 0.75;
                    Animated.spring(sheetHeightAnim, {
                        toValue: screenHeight * 0.75,
                        useNativeDriver: false
                    }).start();
                } else if (gestureState.dy > 50) {
                    lastHeightRef.current = 85;
                    Animated.spring(sheetHeightAnim, {
                        toValue: 85,
                        useNativeDriver: false
                    }).start();
                } else {
                    // snap back to previous state
                    Animated.spring(sheetHeightAnim, {
                        toValue: lastHeightRef.current,
                        useNativeDriver: false
                    }).start();
                }
            }
        })
    ).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(floatAnim, { toValue: -6, duration: 1000, useNativeDriver: true }),
                Animated.timing(floatAnim, { toValue: 0, duration: 1000, useNativeDriver: true })
            ])
        ).start();
    }, []);

    const scrollToTop = () => {
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
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

    const renderMapContent = () => (
        <>
            <NativeMultiMap
                style={{ width: '100%', height: '100%' }}
                region={mapRegion}
                onMarkerPress={(e: any) => handleSelectMapPin(e.nativeEvent.id)}
                onMapPress={handleMapPress}
                markers={[
                    ...filteredLots.map((lot, index) => {
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
                    }).filter(Boolean),
                    // Tap marker: shows instantly where user tapped on map
                    tapMarker ? {
                        id: '__tap_marker__',
                        latitude: tapMarker.latitude,
                        longitude: tapMarker.longitude,
                        title: tapMarker.title || 'Selected Location',
                        color: 'blue'
                    } : null
                ].filter(Boolean)}
            />
            {/* Custom Overlay Controls */}
            <View style={{ position: 'absolute', top: isMapFullScreen ? Math.max(insets.top, 16) : 16, right: 16, zIndex: 100000, gap: 12 }}>
                {/* Full Screen Toggle Button */}
                <Pressable
                    style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84 }}
                    onPress={() => {
                        const nextState = !isMapFullScreen;
                        setIsMapFullScreen(nextState);
                        if (nextState) {
                            if (filteredLots.length > 0) {
                                // Move camera towards the P icon side
                                const lot = filteredLots[0];
                                const rawLat = lot.latitude ?? lot.lat;
                                const rawLng = lot.longitude ?? lot.lng;
                                const pLat = parseFloat(String(rawLat));
                                const pLng = parseFloat(String(rawLng));
                                if (!isNaN(pLat) && !isNaN(pLng)) {
                                    setMapRegion({
                                        latitude: pLat,
                                        longitude: pLng,
                                        latitudeDelta: 0.02 + (Math.random() * 0.0000001), // close zoom, jittered
                                        longitudeDelta: 0.02,
                                        zoom: 14.5
                                    } as any);
                                }
                            } else if (cachedMapRegion) {
                                setMapRegion({
                                    ...cachedMapRegion,
                                    latitudeDelta: cachedMapRegion.latitudeDelta + (Math.random() * 0.0000001)
                                });
                                fetchFreshUserLocation();
                            }
                        }
                    }}
                >
                    <Text style={{ fontSize: 22, color: '#334155', fontWeight: 'bold' }}>{isMapFullScreen ? '✖' : '⛶'}</Text>
                </Pressable>

                {/* My Location Button */}
                <Pressable
                    style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84 }}
                    onPress={() => {
                        if (cachedMapRegion) {
                            setMapRegion({
                                ...cachedMapRegion,
                                latitudeDelta: cachedMapRegion.latitudeDelta + (Math.random() * 0.0000001)
                            });
                        }
                        fetchFreshUserLocation();
                    }}
                >
                    <Text style={{ fontSize: 18, color: '#334155', fontWeight: 'bold' }}>📍</Text>
                </Pressable>
            </View>
        </>
    );

    return (
        <View style={s.container}>
            <StatusBar hidden={isMapFullScreen} barStyle="light-content" backgroundColor={colors.primary} />
            <CarLoader
                visible={isBooking || isSearchingPlaces || !mapRegion || isTabSwitching || isFetchingMapClick}
                message={isTabSwitching ? "Re-Loading Map..." : (!mapRegion ? "Loading Map..." : (isSearchingPlaces ? "Searching Locations..." : (isFetchingMapClick ? "Finding Nearby Parking..." : "Processing Booking...")))}
            />

            <ScrollView
                ref={scrollViewRef}
                scrollEnabled={true}
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
                                    source={require('../../assets/SmartParkingLogo.png')}
                                    style={s.logoImage}
                                    resizeMode="contain"
                                />
                            </View>
                            <View>
                                <View style={s.brandNameRow}>
                                    <Text style={s.brandTitle}>Smart Parking</Text>
                                </View>
                            </View>
                        </View>


                    </View>

                    <View style={s.greetingWrap}>
                        <Text style={s.greetingTitle}>
                            Welcome, {citizenProfile?.full_name || userSession?.user_name || 'Citizen'}
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
                                    setShowLots(true);

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
                                <Text style={s.sectionHeaderTitle}>{filteredLots.length} Available Parking{filteredLots.length !== 1 ? 's' : ''}</Text>
                                <View style={s.liveSlotsBadge}>
                                    <View style={s.liveSlotsDot} />
                                    <Text style={s.liveSlotsBadgeText}>LIVE</Text>
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* Interactive Radar Map View */}
                    <View style={s.mapWrapper}>

                        {/* When touching inside Map, ONLY Map moves! Scroll with single finger */}
                        {mapRegion ? (
                            <View
                                style={{ width: '100%', borderRadius: 16, overflow: 'hidden', height: 580 }}
                                onTouchStart={() => {
                                    scrollViewRef.current?.setNativeProps({ scrollEnabled: false });
                                }}
                                onTouchEnd={() => {
                                    scrollViewRef.current?.setNativeProps({ scrollEnabled: true });
                                }}
                                onTouchCancel={() => {
                                    scrollViewRef.current?.setNativeProps({ scrollEnabled: true });
                                }}
                            >
                                {!isMapFullScreen && renderMapContent()}
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
                            <ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled={true} style={{ maxHeight: 350 }}>
                                {searchResults.map((item, index) => (
                                    <Pressable
                                        key={item.place_id}
                                        style={({ pressed }) => [
                                            s.searchResultItem,
                                            pressed && { backgroundColor: '#F8FAFC' },
                                            index === searchResults.length - 1 && { borderBottomWidth: 0 }
                                        ]}
                                        onPress={() => handlePlaceSelect(item.place_id, item.description, item.lat, item.lng)}
                                    >
                                        <View style={{
                                            width: 32, height: 32, borderRadius: 16, backgroundColor: item.isParking ? '#EFF6FF' : '#F1F5F9',
                                            alignItems: 'center', justifyContent: 'center', marginRight: 12
                                        }}>
                                            <Image
                                                source={require('../../assets/icons/nav_parking.png')}
                                                style={[s.searchResultIcon, { marginRight: 0, width: 16, height: 16, tintColor: item.isParking ? '#3B82F6' : '#64748B' }]}
                                                resizeMode="contain"
                                            />
                                        </View>
                                        <Text style={s.searchResultText} numberOfLines={2}>
                                            {item.description}
                                        </Text>
                                    </Pressable>
                                ))}
                            </ScrollView>
                        </View>
                    )}
                </View>



            </ScrollView>

            {/* List View Overlay */}
            {true && (
                <Animated.View 
                    style={{ 
                        position: 'absolute', 
                        bottom: 48 + Math.max(insets.bottom, 16),
                        left: 0, 
                        right: 0, 
                        height: sheetHeightAnim,
                        backgroundColor: 'white',
                        borderTopLeftRadius: 24,
                        borderTopRightRadius: 24,
                        paddingHorizontal: 16,
                        paddingTop: 16,
                        elevation: 10,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: -3 },
                        shadowOpacity: 0.15,
                        shadowRadius: 8,
                        zIndex: 10
                    }}
                >
                    <View {...panResponder.panHandlers} style={{ backgroundColor: 'transparent' }}>
                        <View style={{width: 40, height: 4, backgroundColor: '#E2E8F0', borderRadius: 2, alignSelf: 'center', marginBottom: 12}} />
                        <View style={[s.sectionTitleRow, {marginBottom: 8}]}>
                            <Text style={s.sectionHeaderTitle}>Nearby Parking Areas (Drag Up)</Text>
                        </View>
                    </View>
                    <ScrollView 
                        style={{ flex: 1 }}
                        showsVerticalScrollIndicator={true} 
                        contentContainerStyle={{ paddingBottom: 20 }}
                        nestedScrollEnabled={true}
                        pointerEvents="auto"
                    >
                        {filteredLots.length > 0 ? (
                            filteredLots.slice(0, displayCount).map((lot, idx) => {
                                const name = lot.location || lot.name || 'Parking Area';
                            const address = lot.address || 'Kolkata';
                            const distance = lot.distance_km ? `${lot.distance_km.toFixed(1)} km away` : 'Near you';

                            const fwFree = lot.physical_slots?.four_wheeler?.free ?? lot.capacity?.four_wheeler ?? 0;
                            const twFree = lot.physical_slots?.two_wheeler?.free ?? lot.capacity?.two_wheeler ?? 0;

                            return (
                                <Pressable
                                    key={String(lot.parking_area_id || lot.id || idx)}
                                    style={{
                                        backgroundColor: '#FFFFFF',
                                        borderRadius: 16,
                                        padding: 16,
                                        marginBottom: 12,
                                        borderWidth: 1,
                                        borderColor: '#F1F5F9',
                                        elevation: 2,
                                        shadowColor: '#000',
                                        shadowOffset: { width: 0, height: 2 },
                                        shadowOpacity: 0.05,
                                        shadowRadius: 4
                                    }}
                                    onPress={() => handleSelectMapPin(String(lot.parking_area_id || lot.id))}
                                >
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <View style={{ flex: 1, paddingRight: 10 }}>
                                            <Text style={{ fontSize: 16, fontWeight: '700', color: '#1E293B', marginBottom: 4 }}>{name}</Text>
                                            <Text style={{ fontSize: 13, color: '#64748B', marginBottom: 6 }}>{address}</Text>
                                            <Text style={{ fontSize: 12, fontWeight: '600', color: '#10B981' }}>{distance}</Text>
                                        </View>

                                        <View style={{ flexDirection: 'row', gap: 6 }}>
                                            {fwFree >= 0 && (
                                                <View style={{ backgroundColor: '#F8FAFC', borderRadius: 8, padding: 6, minWidth: 45, alignItems: 'center', borderWidth: 1, borderColor: '#F1F5F9' }}>
                                                    <Text style={{ fontSize: 10, fontWeight: '700', color: '#64748B' }}>4W</Text>
                                                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#1E293B', marginVertical: 2 }}>{fwFree}</Text>
                                                </View>
                                            )}
                                            {twFree >= 0 && (
                                                <View style={{ backgroundColor: '#EFF6FF', borderRadius: 8, padding: 6, minWidth: 45, alignItems: 'center', borderWidth: 1, borderColor: '#DBEAFE' }}>
                                                    <Text style={{ fontSize: 10, fontWeight: '700', color: '#3B82F6' }}>2W</Text>
                                                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#2563EB', marginVertical: 2 }}>{twFree}</Text>
                                                </View>
                                            )}
                                        </View>
                                    </View>
                                </Pressable>
                            );
                        })
                        ) : (
                            <View style={{ alignItems: 'center', marginTop: 40, paddingHorizontal: 20 }}>
                                <Text style={{ textAlign: 'center', color: '#475569', fontSize: 16, fontWeight: '700' }}>No Nearby Parking</Text>
                                <Text style={{ textAlign: 'center', color: '#94A3B8', fontSize: 13, marginTop: 6, lineHeight: 18 }}>We couldn't find any parking areas near this location. Try searching for a different spot.</Text>
                            </View>
                        )}
                    </ScrollView>
                </Animated.View>
            )}

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
                            <Text style={s.notifModalTitle}>Notifications</Text>
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
                                <Text style={s.notifItemDesc}>Digital RC verification completed with smart slot.</Text>
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
                            Complete your Citizen Profile to activate automatic barrier deduction and digital parking receipts.
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
                            // ✅ Thoda sa niche kiya, par bottom tabs ya phone ki screen se buttons chhupe nahi
                            bottom: 25 + Math.max(insets.bottom, 0),
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
                                            {selectedParkingForModal?.address || 'Kolkata'}
                                        </Text>
                                    </View>

                                    <View style={s.sheetDistanceRow}>
                                        <Text style={s.sheetDistanceText}>
                                            {selectedParkingForModal?.distance_km ? `${selectedParkingForModal.distance_km.toFixed(1)} km away` : ''}
                                        </Text>
                                    </View>
                                </View>

                                {(() => {
                                    const fwFree = selectedParkingForModal?.physical_slots?.four_wheeler?.free ?? selectedParkingForModal?.capacity?.four_wheeler ?? 0;
                                    const twFree = selectedParkingForModal?.physical_slots?.two_wheeler?.free ?? selectedParkingForModal?.capacity?.two_wheeler ?? 0;
                                    return (
                                        <View style={{ flexDirection: 'row', gap: 6 }}>
                                            {fwFree >= 0 && (
                                                <View style={[s.sheetSlotsBox, { paddingHorizontal: 6, paddingVertical: 4, minWidth: 60 }]}>
                                                    <View style={[s.sheetSlotsInner, { alignItems: 'center' }]}>
                                                        <Text style={{ fontSize: 10, fontWeight: '700', color: '#64748B' }}>4W</Text>
                                                        <Text style={[s.sheetSlotsCount, { fontSize: 14, marginVertical: 2 }]}>{fwFree}</Text>
                                                        <Text style={[s.sheetSlotsSub, { fontSize: 8 }]}>AVAILABLE</Text>
                                                    </View>
                                                </View>
                                            )}
                                            {twFree >= 0 && (
                                                <View style={[s.sheetSlotsBox, { paddingHorizontal: 6, paddingVertical: 4, minWidth: 60, backgroundColor: '#EFF6FF' }]}>
                                                    <View style={[s.sheetSlotsInner, { alignItems: 'center' }]}>
                                                        <Text style={{ fontSize: 10, fontWeight: '700', color: '#3B82F6' }}>2W</Text>
                                                        <Text style={[s.sheetSlotsCount, { fontSize: 14, color: '#2563EB', marginVertical: 2 }]}>{twFree}</Text>
                                                        <Text style={[s.sheetSlotsSub, { fontSize: 8, color: '#3B82F6' }]}>AVAILABLE</Text>
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
                            {selectedParkingForModal?.advance_booking?.enabled !== true ? (
                                <View style={s.bookingNoticeBarDisabled}>
                                    <Text style={s.bookingNoticeTextDisabled}>
                                        ℹ️ Advance Booking: Unavailable
                                    </Text>
                                </View>
                            ) : (
                                <View style={s.bookingNoticeBarActive}>
                                    <View style={s.pulseGreenDot} />
                                    <Text style={s.bookingNoticeTextActive}>
                                        Advance Booking: Available
                                    </Text>
                                </View>
                            )}

                        </ScrollView>

                        {/* Directions & Book Slot Buttons (MOVED OUTSIDE SCROLLVIEW TO STAY VISIBLE) */}
                        <View style={[s.sheetActionsRow, { paddingBottom: 48, paddingTop: 8, backgroundColor: '#FFFFFF' }]}>
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
                                onPress={async () => {
                                    const lot = selectedParkingForModal;
                                    if (lot?.advance_booking?.enabled !== true) {
                                        setSelectedParkingForModal(null);
                                        setBookingDisabledModal({
                                            visible: true,
                                            lotName: lot?.location || lot?.name || 'this parking',
                                        });
                                    } else {
                                        setIsBooking(true);
                                        
                                        // Fetch details ONLY when user clicks Book Slot
                                        const lotIdNum = parseInt(lot?.parking_area_id || lot?.id, 10);
                                        let finalDetails = lot;
                                        if (!isNaN(lotIdNum)) {
                                            try {
                                                const details = await citizenService.getCitizenParkingAreaDetails(lotIdNum, null);
                                                finalDetails = details || lot;
                                            } catch (err) {
                                                console.error('Error fetching parking area details before booking:', err);
                                            }
                                        }

                                        citizenService.setSelectedParkingDetails(finalDetails);
                                        setSelectedParkingForModal(null);
                                        
                                        setTimeout(() => {
                                            setIsBooking(false);
                                            go('parkingDetails');
                                        }, 400); // reduced timeout slightly since we already waited for API
                                    }
                                }}
                                style={({ pressed }) => [
                                    s.sheetBookBtn,
                                    pressed && s.sheetBookBtnPressed,
                                    selectedParkingForModal?.advance_booking?.enabled !== true && s.sheetBookBtnDisabled,
                                ]}>
                                <Text style={s.sheetBookBtnText}>
                                    {selectedParkingForModal?.advance_booking?.enabled !== true ? 'Booking Unavailable' : 'Book Slot'}
                                </Text>
                                {selectedParkingForModal?.advance_booking?.enabled === true && (
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

            <Modal visible={!!mapPopup?.visible} transparent animationType="fade" onRequestClose={() => setMapPopup(null)}>
                <View style={s.modalBackdrop}>
                    <View style={s.modalBox}>
                        <View style={[s.modalIconCircle, { backgroundColor: mapPopup?.isError ? '#FEE2E2' : '#DCFCE7' }]}>
                            <Text style={s.modalIconEmoji}>{mapPopup?.isError ? '🚫' : '✅'}</Text>
                        </View>
                        <Text style={s.modalTitle}>{mapPopup?.title}</Text>
                        <Text style={s.modalMessage}>
                            {mapPopup?.message}
                        </Text>
                        <Pressable
                            onPress={() => setMapPopup(null)}
                            style={s.modalCloseBtn}>
                            <Text style={s.modalCloseBtnText}>Okay</Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>

            {/* FULL SCREEN MAP MODAL */}
            <Modal visible={isMapFullScreen} animationType="fade" transparent={false} onRequestClose={() => setIsMapFullScreen(false)}>
                <View style={{ flex: 1, backgroundColor: '#F1F5F9' }}>
                    {renderMapContent()}
                </View>
            </Modal>

            <CarLoader visible={isFetchingDetails} message="Loading slot details..." />
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
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
        elevation: 16, // stronger shadow for popup
        borderWidth: 1,
        borderColor: '#E2E8F0',
        zIndex: 9999, // very high zIndex to cover map
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
    notifModalTitle: {
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
