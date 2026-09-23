import { API_CONFIG } from '../config/api.config';
import { apiClient } from './apiClient';
import { storageService, UserSession } from './storageService';
import { getCleanBase64 } from '../constants/defaultAvatar';

export interface CitizenProfile {
  address: string;
  user_id: number;
  email_id: string;
  latitude: string;
  full_name: string;
  longitude: string;
  mobile_no: string;
  user_role: string;
  identity_id?: number;
  profile_pic?: string;
  user_type_id?: number;
  login_type_id?: number;
  login_user_id: number;
  referral_code?: string;
  vehicle_count: number;
  wallet_amount: number;
  referral_bonus?: number;
  profile_complete: boolean;
  vehicle_owner_id: number;
  default_payment_mode_id?: number;
}

export interface RegisterProfileParams {
  login_user_id?: number;
  full_name: string;
  email_id: string;
  address: string;
  latitude?: string;
  longitude?: string;
  profile_pic?: string;
}

export interface BookingItem {
  booking_id: number;
  booking_no: string;
  parking_area_name: string;
  parking_area_address: string;
  vehicle_no: string;
  vehicle_type: string;
  booking_start_time: string;
  booking_end_time?: string;
  total_amount: number;
  payment_status: string;
  booking_status: string;
  overstay_amount?: number;
}

export interface GrievanceType {
  code: string;
  name: string;
  description: string;
  grievance_type_id: number;
}

export interface GrievanceSeverity {
  code: string;
  name: string;
  priority: number;
  description: string;
  severity_id: number;
}

export interface GrievanceMasterData {
  grievance_types: GrievanceType[];
  severities: GrievanceSeverity[];
}

export interface PostGrievanceParams {
  login_user_id?: number;
  grievance_type_id: number;
  severity_id: number;
  grievance_text: string;
  latitude?: number;
  longitude?: number;
  location_address?: string;
  landmark?: string;
  parking_area_id?: number;
  image_file_name?: string | null;
  image_mime_type?: string | null;
  grievance_image?: string | null; // base64
}

export interface GetGrievancesParams {
  login_user_id?: number;
  status_id?: number | null;
  limit?: number;
  offset?: number;
}

export interface AddVehicleParams {
  login_user_id?: number;
  vehicle_number: string;
  vehicle_type_id: number;
  vehicle_make?: string;
  vehicle_brand?: string;
  vehicle_model?: string;
  chassis_number?: string;
  engine_number?: string;
  vehicle_color?: string;
  remarks?: string;
  vehicle_image?: string;
}

export interface UpdateVehicleParams extends AddVehicleParams {
  vehicle_id: number;
}

/**
 * Calculates the percentage of profile completion based on user fields
 */
export function calculateProfileCompletion(profile: Partial<CitizenProfile> | null): number {
  if (!profile) return 0;
  if (profile.profile_complete === true) return 100;

  let score = 0;
  // 1. Mobile verified (always verified via OTP flow)
  if (profile.mobile_no && profile.mobile_no.trim().length >= 10) {
    score += 25;
  }
  // 2. Full Name
  if (profile.full_name && profile.full_name.trim().length > 0) {
    score += 25;
  }
  // 3. Email ID
  if (profile.email_id && profile.email_id.trim().includes('@')) {
    score += 25;
  }
  // 4. Address / Locality
  if (profile.address && profile.address.trim().length > 0) {
    score += 25;
  }

  return score;
}

class CitizenService {
  private static instance: CitizenService;
  private cachedProfile: CitizenProfile | null = null;
  private selectedParkingDetails: any = null;
  private userLocation: { latitude: number, longitude: number } | null = null;

  private constructor() { }

  public static getInstance(): CitizenService {
    if (!CitizenService.instance) {
      CitizenService.instance = new CitizenService();
    }
    return CitizenService.instance;
  }

  public setSelectedParkingDetails(details: any) {
    this.selectedParkingDetails = details;
  }

  public getSelectedParkingDetails() {
    return this.selectedParkingDetails;
  }

  public setUserLocation(loc: { latitude: number, longitude: number }) {
    this.userLocation = loc;
  }

  public getUserLocation() {
    return this.userLocation;
  }

  /**
   * Fetch citizen profile from backend using login_user_id
   */
  public async getCitizenProfile(loginUserId?: number): Promise<CitizenProfile> {
    let resolvedUserId = loginUserId;

    if (!resolvedUserId) {
      const session = await storageService.getUserSession();
      resolvedUserId = session?.login_user_id;
    }

    if (!resolvedUserId) {
      throw new Error('User session not found. Please log in again.');
    }

    const payload = {
      enc_data: JSON.stringify({
        login_user_id: resolvedUserId,
      }),
    };

    console.log(`📋 [CitizenService] Fetching profile for login_user_id: ${resolvedUserId}`);

    try {
      const response = await apiClient.post(API_CONFIG.ENDPOINTS.GET_CITIZEN_PROFILE, payload);

      let profileData: CitizenProfile;
      if (typeof response.data === 'string') {
        profileData = JSON.parse(response.data);
      } else {
        profileData = response.data;
      }

      this.cachedProfile = profileData;
      console.log('✅ [CitizenService] Profile fetched successfully:', {
        name: profileData.full_name,
        complete: profileData.profile_complete,
        score: calculateProfileCompletion(profileData),
        imagePrefix: profileData.profile_pic ? profileData.profile_pic.substring(0, 30) : 'NO_IMAGE'
      });

      return profileData;
    } catch (error: any) {
      console.error('❌ [CitizenService] Error fetching profile:', error?.message || error);
      throw error;
    }
  }

  /**
   * Register or update citizen profile details
   */
  public async registerCitizenProfile(params: RegisterProfileParams): Promise<CitizenProfile> {
    let resolvedUserId = params.login_user_id;

    if (!resolvedUserId) {
      const session = await storageService.getUserSession();
      resolvedUserId = session?.login_user_id;
    }

    if (!resolvedUserId) {
      throw new Error('User session not found. Please log in again.');
    }

    const payloadData = {
      login_user_id: resolvedUserId,
      full_name: params.full_name.trim(),
      email_id: params.email_id.trim(),
      address: params.address.trim(),
      latitude: params.latitude || '22.5726',
      longitude: params.longitude || '88.3639',
      profile_pic: getCleanBase64(params.profile_pic),
    };

    const payload = {
      enc_data: JSON.stringify(payloadData),
    };

    console.log(`📝 [CitizenService] Registering profile for login_user_id: ${resolvedUserId}`);

    try {
      const response = await apiClient.post(API_CONFIG.ENDPOINTS.REGISTER_CITIZEN_PROFILE, payload);

      let registeredData: CitizenProfile;
      if (typeof response.data === 'string') {
        registeredData = JSON.parse(response.data);
      } else {
        registeredData = response.data;
      }

      this.cachedProfile = registeredData;

      // Also update local UserSession so screens reflecting user_name are instantly synced
      const session = await storageService.getUserSession();
      if (session) {
        const updatedSession: UserSession = {
          ...session,
          user_name: registeredData.full_name || session.user_name,
          vehicle_owner_id: registeredData.vehicle_owner_id || session.vehicle_owner_id,
          vehicle_count: registeredData.vehicle_count ?? session.vehicle_count,
        };
        await storageService.saveUserSession(updatedSession);
      }

      console.log('🎉 [CitizenService] Profile registered successfully:', registeredData);
      return registeredData;
    } catch (error: any) {
      console.error('❌ [CitizenService] Error registering profile:', error?.message || error);
      throw error;
    }
  }

  /**
   * Add a new vehicle to the citizen's profile
   */
  public async addCitizenVehicle(params: AddVehicleParams): Promise<any> {
    let resolvedUserId = params.login_user_id;

    if (!resolvedUserId) {
      const session = await storageService.getUserSession();
      resolvedUserId = session?.login_user_id;
    }

    if (!resolvedUserId) {
      throw new Error('User session not found. Please log in again.');
    }

    const payloadData = {
      login_user_id: resolvedUserId,
      vehicle_number: params.vehicle_number,
      vehicle_type_id: params.vehicle_type_id,
      vehicle_make: params.vehicle_make || '',
      vehicle_brand: params.vehicle_brand || '',
      vehicle_model: params.vehicle_model || '',
      chassis_number: params.chassis_number || '',
      engine_number: params.engine_number || '',
      vehicle_color: params.vehicle_color || '',
      remarks: params.remarks || '',
      vehicle_image: getCleanBase64(params.vehicle_image),
    };

    const payload = {
      enc_data: JSON.stringify(payloadData),
    };

    console.log(`🚗 [CitizenService] Adding vehicle for login_user_id: ${resolvedUserId}, type: ${params.vehicle_type_id}`);

    try {
      const response = await apiClient.post(API_CONFIG.ENDPOINTS.ADD_CITIZEN_VEHICLE, payload);

      console.log('✅ [CitizenService] Vehicle added successfully:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ [CitizenService] Error adding vehicle:', error?.message || error);
      throw error;
    }
  }

  /**
   * Update an existing vehicle
   */
  public async updateCitizenVehicle(params: UpdateVehicleParams): Promise<any> {
    let resolvedUserId = params.login_user_id;

    if (!resolvedUserId) {
      const session = await storageService.getUserSession();
      resolvedUserId = session?.login_user_id;
    }

    if (!resolvedUserId) {
      throw new Error('User session not found. Please log in again.');
    }

    const payloadData = {
      login_user_id: resolvedUserId,
      vehicle_id: params.vehicle_id,
      vehicle_number: params.vehicle_number,
      vehicle_type_id: params.vehicle_type_id,
      vehicle_make: params.vehicle_make || '',
      vehicle_brand: params.vehicle_brand || '',
      vehicle_model: params.vehicle_model || '',
      chassis_number: params.chassis_number || '',
      engine_number: params.engine_number || '',
      vehicle_color: params.vehicle_color || '',
      remarks: params.remarks || '',
      vehicle_image: getCleanBase64(params.vehicle_image),
    };

    const payload = {
      enc_data: JSON.stringify(payloadData),
    };

    console.log(`🚗 [CitizenService] Updating vehicle for login_user_id: ${resolvedUserId}, vehicle_id: ${params.vehicle_id}`);

    try {
      const response = await apiClient.post(API_CONFIG.ENDPOINTS.UPDATE_CITIZEN_VEHICLE, payload);
      console.log('✅ [CitizenService] Vehicle updated successfully:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ [CitizenService] Error updating vehicle:', error?.message || error);
      throw error;
    }
  }

  /**
   * Delete a vehicle
   */
  public async deleteCitizenVehicle(vehicleId: number, loginUserId?: number): Promise<any> {
    let resolvedUserId = loginUserId;

    if (!resolvedUserId) {
      const session = await storageService.getUserSession();
      resolvedUserId = session?.login_user_id;
    }

    if (!resolvedUserId) {
      throw new Error('User session not found. Please log in again.');
    }

    const payloadData = {
      login_user_id: resolvedUserId,
      vehicle_id: vehicleId,
    };

    const payload = {
      enc_data: JSON.stringify(payloadData),
    };

    console.log(`🚗 [CitizenService] Deleting vehicle for login_user_id: ${resolvedUserId}, vehicle_id: ${vehicleId}`);

    try {
      const response = await apiClient.post(API_CONFIG.ENDPOINTS.DELETE_CITIZEN_VEHICLE, payload);
      console.log('✅ [CitizenService] Vehicle deleted successfully:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ [CitizenService] Error deleting vehicle:', error?.message || error);
      throw error;
    }
  }

  /**
   * Fetch all vehicles registered by the citizen
   */
  public async getCitizenVehicles(loginUserId?: number): Promise<any[]> {
    let resolvedUserId = loginUserId;

    if (!resolvedUserId) {
      const session = await storageService.getUserSession();
      resolvedUserId = session?.login_user_id;
    }

    if (!resolvedUserId) {
      throw new Error('User session not found. Please log in again.');
    }

    const payload = {
      enc_data: JSON.stringify({
        login_user_id: resolvedUserId,
      }),
    };

    console.log(`🚗 [CitizenService] Fetching vehicles for login_user_id: ${resolvedUserId}`);

    try {
      const response = await apiClient.post(API_CONFIG.ENDPOINTS.GET_CITIZEN_VEHICLES, payload);
      let vehicleData = response.data;
      if (typeof vehicleData === 'string') {
        vehicleData = JSON.parse(vehicleData);
      }
      console.log('✅ [CitizenService] Vehicles fetched successfully:', vehicleData);
      return Array.isArray(vehicleData?.vehicles) ? vehicleData.vehicles : [];
    } catch (error: any) {
      console.error('❌ [CitizenService] Error fetching vehicles:', error?.message || error);
      return [];
    }
  }

  /**
   * Fetch all master vehicle types
   */
  public async getVehicleTypes(): Promise<any[]> {
    try {
      // The API requires an empty POST body or minimal data, sending empty object
      const response = await apiClient.post(API_CONFIG.ENDPOINTS.GET_CITIZEN_VEHICLE_TYPES, {});
      let data = response.data;
      if (typeof data === 'string') {
        data = JSON.parse(data);
      }
      return Array.isArray(data?.vehicle_types) ? data.vehicle_types : [];
    } catch (error: any) {
      console.error('❌ [CitizenService] Error fetching vehicle types:', error?.message || error);
      return [];
    }
  }

  public getCachedProfile(): CitizenProfile | null {
    return this.cachedProfile;
  }

  /**
   * Checks if user already has an active, completed profile
   */
  public async hasCompleteProfile(loginUserId?: number): Promise<boolean> {
    try {
      if (this.cachedProfile) {
        const isComplete =
          this.cachedProfile.profile_complete === true ||
          (Boolean(this.cachedProfile.full_name) &&
            this.cachedProfile.full_name.trim().length > 0 &&
            calculateProfileCompletion(this.cachedProfile) >= 50);
        return Boolean(isComplete);
      }

      const profile = await this.getCitizenProfile(loginUserId);
      if (!profile) return false;

      const isComplete =
        profile.profile_complete === true ||
        (Boolean(profile.full_name) &&
          profile.full_name.trim().length > 0 &&
          calculateProfileCompletion(profile) >= 50);

      return Boolean(isComplete);
    } catch (error) {
      console.log('ℹ️ [CitizenService] Profile not registered yet or check failed:', error);
      return false;
    }
  }

  /**
   * Fetch master list of vehicle types
   */
  public async getCitizenVehicleTypes(): Promise<any[]> {
    try {
      const response = await apiClient.post(API_CONFIG.ENDPOINTS.GET_CITIZEN_VEHICLE_TYPES, { enc_data: "" });

      if (response.status === 'success' || response.status === 'GEN_000') {
        let data = response.data;
        if (typeof data === 'string') {
          try {
            data = JSON.parse(data);
          } catch (e) {
            console.warn('Failed to parse vehicle types data string');
          }
        }
        
        if (data && Array.isArray(data.vehicle_types)) {
          return data.vehicle_types;
        }
        return [];
      } else {
        throw new Error(response.message || 'Failed to fetch vehicle types');
      }
    } catch (error: any) {
      console.error('❌ [CitizenService] Failed to fetch vehicle types:', error?.message || error);
      return [];
    }
  }

  /**
   * Fetch nearby parking areas based on citizen's latitude and longitude
   */
  public async getCitizenNearbyParkingAreas(
    latitude: number,
    longitude: number,
    radiusKm: number = 2,
    vehicleTypeId: number | null = null
  ): Promise<any[]> {
    try {
      const encDataObj = {
        latitude,
        longitude,
        radius_km: radiusKm,
        vehicle_type_id: vehicleTypeId,
      };

      const payload = {
        enc_data: JSON.stringify(encDataObj)
      };

      console.log('--- GET NEARBY PARKING PAYLOAD ---');
      console.log(JSON.stringify(encDataObj, null, 2));
      console.log('----------------------------------');

      const response = await apiClient.post(API_CONFIG.ENDPOINTS.GET_NEARBY_PARKING_AREAS, payload);

      // apiClient returns the payload directly
      if (response.status === 'success' || response.status === 'GEN_000') {
        let data = response.data;
        if (typeof data === 'string') {
          try {
            data = JSON.parse(data);
          } catch (e) {
            console.warn('Failed to parse parking areas data string');
          }
        }

        if (data && Array.isArray(data.parking_areas)) {
          return data.parking_areas;
        }
        return Array.isArray(data) ? data : [];
      } else {
        throw new Error(response.message || 'Failed to fetch nearby parking areas');
      }
    } catch (error: any) {
      console.error('❌ [CitizenService] Failed to fetch nearby parking areas:', error?.message || error);
      return [];
    }
  }

  /**
   * Fetch specific parking area details
   */
  public async getCitizenParkingAreaDetails(parkingAreaId: number, vehicleTypeId: number | null = null): Promise<any> {
    const payloadData = {
      parking_area_id: parkingAreaId,
      vehicle_type_id: vehicleTypeId,
    };

    const payload = {
      enc_data: JSON.stringify(payloadData),
    };

    console.log(`🅿️ [CitizenService] Fetching details for parking area ID: ${parkingAreaId}`);

    try {
      const response = await apiClient.post(API_CONFIG.ENDPOINTS.GET_CITIZEN_PARKING_AREA_DETAILS, payload);

      if (response.status === 'GEN_000' || response.status === true || response.status === 'success') {
        let data = response.data;
        if (typeof data === 'string') {
          try {
            data = JSON.parse(data);
          } catch (e) {
            console.warn('Failed to parse parking area details data string');
          }
        }
        console.log(`📋 [CitizenService] getCitizenParkingAreaDetails Response Data:`, JSON.stringify(data, null, 2));
        return data;
      } else {
        throw new Error(response.message || 'Failed to fetch parking area details');
      }
    } catch (error: any) {
      console.error('❌ [CitizenService] Failed to fetch parking area details:', error?.message || error);
      return null;
    }
  }

  /**
   * Create a new booking
   */
  public async createCitizenBooking(params: {
    login_user_id?: number;
    vehicle_id: number;
    parking_area_id: number;
    booking_start_time: string;
    booking_end_time: string;
    payment_mode_id?: number | null;
  }): Promise<any> {
    let resolvedUserId = params.login_user_id;

    if (!resolvedUserId) {
      const session = await storageService.getUserSession();
      resolvedUserId = session?.login_user_id;
    }

    if (!resolvedUserId) {
      throw new Error('User session not found. Please log in again.');
    }

    const payloadData = {
      login_user_id: resolvedUserId,
      vehicle_id: params.vehicle_id,
      parking_area_id: params.parking_area_id,
      booking_start_time: params.booking_start_time,
      booking_end_time: params.booking_end_time,
      payment_mode_id: params.payment_mode_id || null,
    };

    const payload = {
      enc_data: JSON.stringify(payloadData),
    };

    console.log(`🅿️ [CitizenService] Creating booking for user: ${resolvedUserId}, parking_area: ${params.parking_area_id}`);
    console.log(`📦 [CitizenService] Booking Payload:`, JSON.stringify(payloadData, null, 2));

    try {
      const response = await apiClient.post(API_CONFIG.ENDPOINTS.CREATE_CITIZEN_BOOKING, payload);

      let data = response.data;
      if (typeof data === 'string') {
        try {
          data = JSON.parse(data);
        } catch (e) {
          console.warn('Failed to parse booking data string');
        }
      }

      console.log('✅ [CitizenService] Booking created successfully:', data);
      return data;
    } catch (error: any) {
      console.error('❌ [CitizenService] Error creating booking:', error?.message || error);
      throw error;
    }
  }

  public async getCitizenBookings(loginUserId?: number, status: string = 'UPCOMING', limit: number = 20, offset: number = 0): Promise<any> {
    let resolvedUserId = loginUserId;

    if (!resolvedUserId) {
      const session = await storageService.getUserSession();
      resolvedUserId = session?.login_user_id;
    }

    if (!resolvedUserId) {
      throw new Error('User session not found. Please log in again.');
    }

    const payload = {
      enc_data: JSON.stringify({
        login_user_id: resolvedUserId,
        status,
        limit,
        offset
      }),
    };

    console.log(`📋 [CitizenService] Fetching bookings for user: ${resolvedUserId}, status: ${status}`);

    try {
      const response = await apiClient.post(API_CONFIG.ENDPOINTS.GET_CITIZEN_BOOKINGS, payload);
      let data = response.data;
      if (typeof data === 'string') {
        try {
          data = JSON.parse(data);
        } catch (e) {
          console.warn('Failed to parse booking data string');
        }
      }
      return data;
    } catch (error: any) {
      console.error('❌ [CitizenService] Error fetching bookings:', error?.message || error);
      throw error;
    }
  }

  /**
   * Get Grievance Categories and Severities
   */
  public async getCitizenGrievanceTypes(): Promise<GrievanceMasterData> {
    const payload = {
      version: '1.0',
      enc_data: '{}',
    };

    console.log(`📋 [CitizenService] Fetching grievance master data...`);

    try {
      const response = await apiClient.post(API_CONFIG.ENDPOINTS.GET_CITIZEN_GRIEVANCE_TYPES, payload);
      let data = response.data;
      if (typeof data === 'string') {
        try {
          data = JSON.parse(data);
        } catch (e) {
          console.warn('Failed to parse grievance data string');
        }
      }
      return data as GrievanceMasterData;
    } catch (error: any) {
      console.error('❌ [CitizenService] Error fetching grievance types:', error?.message || error);
      throw error;
    }
  }

  /**
   * Post a new citizen grievance
   */
  public async postCitizenGrievance(params: PostGrievanceParams): Promise<any> {
    let resolvedUserId = params.login_user_id;
    if (!resolvedUserId) {
      const session = await storageService.getUserSession();
      resolvedUserId = session?.login_user_id;
    }

    if (!resolvedUserId) {
      throw new Error('User session not found. Please log in again.');
    }

    const payloadData = {
      ...params,
      login_user_id: resolvedUserId,
    };

    const payload = {
      enc_data: JSON.stringify(payloadData),
    };

    console.log(`📣 [CitizenService] Posting grievance for login_user_id: ${resolvedUserId}`);

    try {
      const response = await apiClient.post(API_CONFIG.ENDPOINTS.POST_CITIZEN_GRIEVANCE, payload);
      let data = response.data;
      if (typeof data === 'string') {
        data = JSON.parse(data);
      }
      return data;
    } catch (error: any) {
      console.error('❌ [CitizenService] Error posting grievance:', error?.message || error);
      throw error;
    }
  }

  /**
   * Get list of grievances for the logged in user
   */
  public async getCitizenGrievancesByLogin(params?: GetGrievancesParams): Promise<any> {
    let resolvedUserId = params?.login_user_id;
    if (!resolvedUserId) {
      const session = await storageService.getUserSession();
      resolvedUserId = session?.login_user_id;
    }

    if (!resolvedUserId) {
      throw new Error('User session not found. Please log in again.');
    }

    const payloadData = {
      login_user_id: resolvedUserId,
      status_id: params?.status_id ?? null,
      limit: params?.limit ?? 20,
      offset: params?.offset ?? 0,
    };

    const payload = {
      enc_data: JSON.stringify(payloadData),
    };

    console.log(`📋 [CitizenService] Fetching grievances for login_user_id: ${resolvedUserId}`);

    try {
      const response = await apiClient.post(API_CONFIG.ENDPOINTS.GET_CITIZEN_GRIEVANCES, payload);
      let data = response.data;
      if (typeof data === 'string') {
        try {
          data = JSON.parse(data);
        } catch (e) {
          console.warn('Failed to parse grievance list string');
        }
      }
      return data;
    } catch (error: any) {
      console.error('❌ [CitizenService] Error fetching grievances:', error?.message || error);
      throw error;
    }
  }
}

export const citizenService = CitizenService.getInstance();
