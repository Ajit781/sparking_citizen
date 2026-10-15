/**
 * API Configuration
 * Centralized Base URL and Endpoint management
 */

export const API_CONFIG = {
  // Base URL for S-Parking REST APIs (Dynamically set from SplashScreen)
  BASE_URL: '',

  // API Endpoints
  ENDPOINTS: {
    GENERATE_TOKEN: '/auth/generate_token',
    GENERATE_OTP: '/auth/generate_otp',
    VALIDATE_OTP: '/auth/validate_otp',
    GET_CITIZEN_PROFILE: '/citizen/getCitizenProfileByLogin',
    REGISTER_CITIZEN_PROFILE: '/citizen/registerCitizenProfileByLogin',
    ADD_CITIZEN_VEHICLE: '/citizen/addCitizenVehicleByLogin',
    GET_CITIZEN_VEHICLES: '/citizen/getCitizenVehiclesByLogin',
    GET_CITIZEN_VEHICLE_TYPES: '/master/getCitizenVehicleTypes',
    UPDATE_CITIZEN_VEHICLE: '/citizen/updateCitizenVehicleByLogin',
    DELETE_CITIZEN_VEHICLE: '/citizen/deleteCitizenVehicleByLogin',
    GET_NEARBY_PARKING_AREAS: '/citizen/getCitizenNearbyParkingAreas',
    GET_CITIZEN_PARKING_AREA_DETAILS: '/citizen/getCitizenParkingAreaDetails',
    CREATE_CITIZEN_BOOKING: '/citizen/createCitizenBooking',
    GET_CITIZEN_BOOKINGS: '/citizen/getCitizenBookingByLogin',
    GET_CITIZEN_GRIEVANCE_TYPES: '/master/getCitizenGrievanceTypes',
    POST_CITIZEN_GRIEVANCE: '/citizen/postCitizenGrievance',
    GET_CITIZEN_GRIEVANCES: '/citizen/getCitizenGrievancesByLogin',
    GET_ADMIN_PARKING_AREAS: '/admin/getAdminParkingAreasByLogin',
  },

  DEFAULT_FCM_TOKEN: 'sparking_citizen_fcm_token_default',

  // Auth credentials required for token generation
  AUTH_CREDENTIALS: {
    username: '0020797790',
    password: 'Parking@123',
  },

  // Request timeout in milliseconds
  TIMEOUT_MS: 15000,

  // Environment and Encryption Settings
  ENV: {
    // Set to true for Production (AES-256-GCM enabled), false for Staging (Normal plaintext)
    IS_PRODUCTION: true,
    // Master encryption switch: When true, payload enc_data is AES-256-GCM encrypted
    ENABLE_ENCRYPTION: true,
    // 256-bit AES-GCM Key (64-character hex string)
    GCM_KEY_HEX: '710f5a3bbcb3c168409c47774ba11897be76f08e997085377803271c4d42e961',
  },
};
