import React, { useState, useRef, useEffect } from 'react';
import { StatusBar, View, Animated, StyleSheet, BackHandler, Alert } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { ScreenName } from './src/types/navigation';
import { colors } from './src/theme/colors';

import BottomNav from './src/components/BottomNav';
import SplashScreen from './src/screens/SplashScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import LoginScreen from './src/screens/LoginScreen';
import OtpScreen from './src/screens/OtpScreen';
import SetupProfileScreen from './src/screens/SetupProfileScreen';
import PermissionScreen from './src/screens/PermissionScreen';
import HomeScreen from './src/screens/HomeScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import ParkingDetailsScreen from './src/screens/ParkingDetailsScreen';
import ReserveParkingScreen from './src/screens/ReserveParkingScreen';
import BookingScreen from './src/screens/BookingScreen';
import VehiclesScreen from './src/screens/VehiclesScreen';
import AddVehicleScreen from './src/screens/AddVehicleScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import PostGrievanceScreen from './src/screens/PostGrievanceScreen';
import MyGrievancesScreen from './src/screens/MyGrievancesScreen';
import { authService, GenerateOtpResult } from './src/services/authService';
import { UserSession } from './src/services/storageService';
import { citizenService } from './src/services/citizenService';

export default function App() {
  const [screen, setScreen] = useState<ScreenName | null>(null);
  const [showSplash, setShowSplash] = useState(true);
  const splashOpacity = useRef(new Animated.Value(1)).current;

  const [authMobile, setAuthMobile] = useState('');
  const [gatewayOtp, setGatewayOtp] = useState<string | undefined>(undefined);
  const [editingVehicle, setEditingVehicle] = useState<any>(null);

  const handleOtpSent = (mobile: string, result?: GenerateOtpResult) => {
    setAuthMobile(mobile);
    setGatewayOtp(result?.otp_for_gateway);
    setScreen('otp');
  };

  const handleOtpVerified = (session: UserSession) => {
    setScreen('home');
  };

  useEffect(() => {
    const onBackPress = () => {
      if (showSplash) return true; // block back button during splash
      
      if (!screen || ['login', 'home', 'guide1', 'guide2', 'guide3'].includes(screen)) {
        Alert.alert('Exit App', 'Are you sure you want to exit S-Parking?', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Exit', style: 'destructive', onPress: () => BackHandler.exitApp() }
        ]);
        return true;
      }
      
      const backMap: Partial<Record<ScreenName, ScreenName>> = {
        'otp': 'login',
        'dashboard': 'home',
        'parkingDetails': 'home',
        'reserveSlot': 'parkingDetails',
        'booking': 'home',
        'vehicles': 'profile',
        'addVehicle': 'vehicles',
        'profile': 'home',
        'postGrievance': 'profile',
        'myGrievances': 'profile',
        'setup': 'home',
        'permission': 'home'
      };
      
      const prevScreen = backMap[screen];
      if (prevScreen) {
        setScreen(prevScreen);
        return true;
      }
      
      return false;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [screen, showSplash]);

  const handleSplashNext = async () => {
    let nextScreen: ScreenName = 'guide1';
    try {
      const stored = await authService.getStoredSession();
      if (stored && stored.mobile_no) {
        console.log('✅ Stored citizen session found for', stored.mobile_no, '-> Opening Home');
        nextScreen = 'home';
      }
    } catch (e) {
      console.warn('Splash session check notice:', e);
    }

    // Set the underlying screen so it mounts behind the splash
    setScreen(nextScreen);

    // Slowly fade out the splash screen
    Animated.timing(splashOpacity, {
      toValue: 0,
      duration: 1000, // 1 second slow fade
      useNativeDriver: true,
    }).start(() => {
      setShowSplash(false);
    });
  };

  const handleNavigate = async (target: ScreenName) => {
    if (target === 'profile') {
      try {
        const hasProfile = await citizenService.hasCompleteProfile();
        if (!hasProfile) {
          console.log('👤 Profile not complete/registered -> Navigating to SetupProfileScreen');
          setScreen('setup');
          return;
        }
      } catch (err) {
        console.warn('Profile tab check notice:', err);
        setScreen('setup');
        return;
      }
    }
    setScreen(target);
  };

  const content =
    !screen ? null : screen === 'guide1' ? (
      <OnboardingScreen
        index={0}
        onNext={() => setScreen('login')}
        onSkip={() => setScreen('login')}
      />
    ) : screen === 'login' ? (
      <LoginScreen onNext={handleOtpSent} />
    ) : screen === 'otp' ? (
      <OtpScreen
        mobileNumber={authMobile}
        initialOtpForGateway={gatewayOtp}
        onBack={() => setScreen('login')}
        onNext={handleOtpVerified}
      />
    ) : screen === 'setup' ? (
      <SetupProfileScreen
        onBack={() => setScreen('home')}
        onSuccess={() => setScreen('profile')}
      />
    ) : screen === 'permission' ? (
      <PermissionScreen onNext={() => setScreen('home')} />
    ) : screen === 'home' ? (
      <HomeScreen go={handleNavigate} onLogout={() => setScreen('login')} />
    ) : screen === 'dashboard' ? (
      <DashboardScreen go={handleNavigate} />
    ) : screen === 'parkingDetails' ? (
      <ParkingDetailsScreen
        onBack={() => setScreen('home')}
        onReserveSlot={() => setScreen('reserveSlot')}
      />
    ) : screen === 'reserveSlot' ? (
      <ReserveParkingScreen
        onBack={() => setScreen('parkingDetails')}
        onBookSuccess={() => setScreen('booking')}
      />
    ) : screen === 'booking' ? (
      <BookingScreen
        onBack={() => setScreen('home')}
        onBookNew={() => setScreen('home')}
      />
    ) : screen === 'vehicles' ? (
      <VehiclesScreen
        onBack={() => setScreen('profile')}
        onAdd={() => {
          setEditingVehicle(null);
          setScreen('addVehicle');
        }}
        onEdit={(vehicle) => {
          setEditingVehicle(vehicle);
          setScreen('addVehicle');
        }}
      />
    ) : screen === 'addVehicle' ? (
      <AddVehicleScreen
        vehicle={editingVehicle}
        onBack={() => setScreen('vehicles')}
        onVehicleAdded={() => setScreen('vehicles')}
      />
    ) : screen === 'profile' ? (
      <ProfileScreen
        onVehicles={() => setScreen('vehicles')}
        onGrievance={() => setScreen('postGrievance')}
        onMyGrievances={() => setScreen('myGrievances')}
        onLogout={() => setScreen('login')}
        onBooking={() => setScreen('booking')}
        onSetupProfile={() => setScreen('setup')}
      />
    ) : screen === 'postGrievance' ? (
      <PostGrievanceScreen
        onBack={() => setScreen('profile')}
        onSubmitted={() => setScreen('myGrievances')}
      />
    ) : (
      <MyGrievancesScreen 
        onBack={() => setScreen('profile')} 
        onPostGrievance={() => setScreen('postGrievance')}
      />
    );

  const showBottomNav = screen ? ['home', 'booking', 'profile', 'setup', 'myGrievances', 'postGrievance'].includes(screen) : false;

  const isSaffronHeader = screen ? ['home', 'profile', 'setup'].includes(screen) : false;
  const isLightScreen = screen ? ['guide1', 'guide2', 'guide3', 'login', 'otp'].includes(screen) : false;

  return (
    <SafeAreaProvider>
      <SafeAreaView
        style={{ flex: 1, backgroundColor: isSaffronHeader ? colors.primary : '#FFFFFF' }}
        edges={[]}>
        <StatusBar
          translucent={true}
          backgroundColor="transparent"
          barStyle={isSaffronHeader ? 'light-content' : 'dark-content'}
        />
        <View style={{ flex: 1, backgroundColor: isLightScreen ? '#FFFFFF' : colors.background }}>
          {content}
          {showBottomNav && <BottomNav active={screen!} go={handleNavigate} />}
        </View>

        {showSplash && (
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: splashOpacity, zIndex: 9999 }]}>
            <SplashScreen onNext={handleSplashNext} />
          </Animated.View>
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
