// API client for MySQL backend
const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  // In browser environments (both local Vite dev proxy and production Nginx/Traefik reverse proxy)
  if (typeof window !== 'undefined' && window.location) {
    return '/api';
  }
  return 'http://localhost:3001/api';
};

const API_BASE_URL = getApiBaseUrl();

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const token = typeof window !== 'undefined' ? localStorage.getItem('rmc_auth_token') : null;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }


  // Authentication & RBAC (MySQL API)
  async login(credentials: { username: string; password: string }) {
    return this.request<{ success: boolean; token: string; user: any; role: any; message?: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async getMe() {
    return this.request<{ user: any; role: any }>('/auth/me');
  }

  async logout() {
    return this.request<{ success: boolean; message: string }>('/auth/logout', {
      method: 'POST',
    });
  }

  async getUsers() {
    return this.request<any[]>('/auth/users');
  }

  async createUser(data: any) {
    return this.request<{ success: boolean; id: string; message: string }>('/auth/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateUser(id: string, data: any) {
    return this.request<{ success: boolean; message: string }>('/auth/users/' + id, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async getRoles() {
    return this.request<any[]>('/auth/roles');
  }

  async updateRole(id: string, data: any) {
    return this.request<{ success: boolean; message: string }>('/auth/roles/' + id, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Health check
  async healthCheck() {
    return this.request<{ status: string; message: string }>('/health');
  }

  // Database initialization
  async initDatabase() {
    return this.request<{ success: boolean; message: string }>('/init-db', {
      method: 'POST',
    });
  }

  async checkDatabaseStatus() {
    return this.request<{ initialized: boolean; tables: string[]; message: string }>('/db-status');
  }

  // Camera devices
  async getCameras() {
    return this.request<any[]>('/cameras');
  }

  async getCamera(deviceId: string) {
    return this.request<any>(`/cameras/${deviceId}`);
  }

  async createCamera(data: any) {
    return this.request<{ success: boolean; device_id: string }>('/cameras', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCamera(deviceId: string, data: any) {
    return this.request<{ success: boolean }>(`/cameras/${deviceId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteCamera(deviceId: string) {
    return this.request<{ success: boolean }>(`/cameras/${deviceId}`, {
      method: 'DELETE',
    });
  }

  async checkCameraDiagnostic(ip: string) {
    return this.request<{
      ip: string;
      reachable: boolean;
      ports: { '554': boolean; '80': boolean; '8000': boolean };
      status: string;
      message: string;
    }>(`/cameras/diagnostic/${ip}`);
  }

  // RTSP configuration
  async getRTSPConfig(deviceId: string) {
    return this.request<any>(`/rtsp-config/${deviceId}`);
  }

  async saveRTSPConfig(data: any) {
    return this.request<{ success: boolean }>('/rtsp-config', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Network configuration
  async getNetworkConfig(deviceId: string) {
    return this.request<any>(`/network-config/${deviceId}`);
  }

  async saveNetworkConfig(data: any) {
    return this.request<{ success: boolean }>('/network-config', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ANPR endpoints
  async getANPREvents(params?: { status?: string; limit?: number; offset?: number }) {
    const queryString = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return this.request<any[]>(`/anpr/events${queryString}`);
  }

  async getANPREvent(eventId: string) {
    return this.request<any>(`/anpr/events/${eventId}`);
  }

  async createANPREvent(event: any) {
    return this.request<{ success: boolean; event_id: string }>('/anpr/events', {
      method: 'POST',
      body: JSON.stringify(event),
    });
  }

  async updateANPREvent(eventId: string, updates: any) {
    return this.request<{ success: boolean }>(`/anpr/events/${eventId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async detectPlate(formData: FormData) {
    const url = `${this.baseUrl}/anpr/detect`;
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Detection failed' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  async getANPRConfig(cameraId: string) {
    return this.request<any>(`/anpr/config/${cameraId}`);
  }

  async updateANPRConfig(cameraId: string, config: any) {
    return this.request<{ success: boolean }>(`/anpr/config/${cameraId}`, {
      method: 'PUT',
      body: JSON.stringify(config),
    });
  }
  // Vehicles (MySQL API)
  async getVehicles(status?: string) {
    const query = status && status !== 'all' ? '?status=' + encodeURIComponent(status) : '';
    return this.request<any[]>('/vehicles' + query);
  }

  async getVehicle(id: string) {
    return this.request<any>('/vehicles/' + id);
  }

  async createVehicle(data: any) {
    return this.request<{ success: boolean; id: string; message: string }>('/vehicles', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateVehicle(id: string, data: any) {
    return this.request<{ success: boolean; message: string }>('/vehicles/' + id, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteVehicle(id: string) {
    return this.request<{ success: boolean; message: string }>('/vehicles/' + id, {
      method: 'DELETE',
    });
  }

  // Drivers (MySQL API)
  async getDrivers(status?: string) {
    const query = status && status !== 'all' ? '?status=' + encodeURIComponent(status) : '';
    return this.request<any[]>('/drivers' + query);
  }

  async getDriver(id: string) {
    return this.request<any>('/drivers/' + id);
  }

  async createDriver(data: any) {
    return this.request<{ success: boolean; id: string; message: string }>('/drivers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateDriver(id: string, data: any) {
    return this.request<{ success: boolean; message: string }>('/drivers/' + id, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteDriver(id: string) {
    return this.request<{ success: boolean; message: string }>('/drivers/' + id, {
      method: 'DELETE',
    });
  }


  // Weighbridge (Phase 2 MySQL API)
  async getWeighbridgeSessions(status?: string) {
    const query = status && status !== 'all' ? '?status=' + encodeURIComponent(status) : '';
    return this.request<any[]>('/weighbridge/sessions' + query);
  }

  async getWeighbridgeSession(id: string) {
    return this.request<any>('/weighbridge/sessions/' + id);
  }

  async createWeighbridgeSession(data: any) {
    return this.request<{ success: boolean; sessionId: string; message: string }>('/weighbridge/sessions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateWeighbridgeSession(id: string, data: any) {
    return this.request<{ success: boolean; message: string }>('/weighbridge/sessions/' + id, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async getWeighSlips() {
    return this.request<any[]>('/weighbridge/slips');
  }

  async createWeighSlip(data: any) {
    return this.request<{ success: boolean; slipNumber: string; message: string }>('/weighbridge/slips', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getNextTransactionNo() {
    return this.request<{ nextTransactionNo: number }>('/weighbridge/next-transaction-no');
  }

  async getPendingVehicles() {
    return this.request<any[]>('/weighbridge/pending-vehicles');
  }

  async uploadWeighbridgeSnapshots(data: {
    transactionNo?: number;
    vehicleRegNo?: string;
    weight?: number;
    images: Array<{
      camId: string;
      camName?: string;
      angle?: 'front' | 'side' | 'rear' | 'top' | 'load';
      dataUrl: string;
    }>;
  }) {
    return this.request<{
      success: boolean;
      message: string;
      snapshots: Array<{
        id: string;
        type: 'image';
        url: string;
        angle: 'front' | 'side' | 'rear';
        camId: string;
        camName: string;
        timestamp: string;
        fileName: string;
        ftpStatus?: any;
      }>;
      ftpSummary?: any;
    }>('/weighbridge/snapshots/upload', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Third-Party Weighbridge Software Integration
  async getLiveScaleWeight() {
    return this.request<{
      weight: number;
      unit: 'kg' | 'ton';
      stable: boolean;
      zero: boolean;
      timestamp: string;
      source: string;
      connected: boolean;
    }>('/weighbridge/live-weight');
  }

  async pushThirdPartyWeight(data: { weight: number; unit?: 'kg' | 'ton'; stable?: boolean; source?: string }) {
    return this.request<{ success: boolean; message: string; reading: any }>('/weighbridge/third-party/push', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async zeroScale() {
    return this.request<{ success: boolean; message: string; reading: any }>('/weighbridge/third-party/zero', {
      method: 'POST',
    });
  }

  async simulateScaleWeight(data: { weight: number; stable?: boolean }) {
    return this.request<{ success: boolean; message: string; reading: any }>('/weighbridge/third-party/simulate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async testScaleSource(data: { mode: string; filePath?: string; tcpHost?: string; tcpPort?: number }) {
    return this.request<{ success: boolean; message: string; exists?: boolean; sampleContent?: string; error?: string }>('/weighbridge/third-party/test-source', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Trips & Tracking (Phase 2 MySQL API)
  async getTrips(status?: string) {
    const query = status && status !== 'all' ? '?status=' + encodeURIComponent(status) : '';
    return this.request<any[]>('/trips' + query);
  }

  async getTrip(id: string) {
    return this.request<any>('/trips/' + id);
  }

  async createTrip(data: any) {
    return this.request<{ success: boolean; id: string; tripNumber: string; message: string }>('/trips', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTrip(id: string, data: any) {
    return this.request<{ success: boolean; message: string }>('/trips/' + id, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async updateTripStatus(id: string, status: string, description?: string, location?: any) {
    return this.request<{ success: boolean; status: string; message: string }>('/trips/' + id + '/status', {
      method: 'PUT',
      body: JSON.stringify({ status, description, location }),
    });
  }

  async getTripEvents(tripId: string) {
    return this.request<any[]>('/trips/' + tripId + '/events');
  }

  async createTripEvent(tripId: string, data: any) {
    return this.request<{ success: boolean; id: string; message: string }>('/trips/' + tripId + '/events', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }


  // Loading Bays & Sessions (Phase 3 MySQL API)
  async getLoadingBays() {
    return this.request<any[]>('/loading-bays');
  }

  async getLoadingBay(id: string) {
    return this.request<any>('/loading-bays/' + id);
  }

  async updateLoadingBay(id: string, data: any) {
    return this.request<{ success: boolean; message: string }>('/loading-bays/' + id, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async createLoadingSession(data: any) {
    return this.request<{ success: boolean; sessionId: string; message: string }>('/loading-sessions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Dispatches (Phase 3 MySQL API)
  async getDispatches(status?: string) {
    const query = status && status !== 'all' ? '?status=' + encodeURIComponent(status) : '';
    return this.request<any[]>('/dispatches' + query);
  }

  async createDispatch(data: any) {
    return this.request<{ success: boolean; id: string; message: string }>('/dispatches', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async approveDispatch(id: string, approvedBy?: string, route?: any) {
    return this.request<{ success: boolean; message: string }>('/dispatches/' + id + '/approve', {
      method: 'PUT',
      body: JSON.stringify({ approvedBy, route }),
    });
  }

  async rejectDispatch(id: string, reason?: string) {
    return this.request<{ success: boolean; message: string }>('/dispatches/' + id + '/reject', {
      method: 'PUT',
      body: JSON.stringify({ reason }),
    });
  }

  // Exit Verifications (Phase 3 MySQL API)
  async getExitVerifications() {
    return this.request<any[]>('/exit-verifications');
  }

  async createExitVerification(data: any) {
    return this.request<{ success: boolean; id: string; verificationId: string; message: string }>('/exit-verifications', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Incidents (Phase 3 MySQL API)
  async getIncidents(params?: { status?: string; severity?: string }) {
    const q = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return this.request<any[]>('/incidents' + q);
  }

  async createIncident(data: any) {
    return this.request<{ success: boolean; id: string; incidentNumber: string; message: string }>('/incidents', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateIncident(id: string, data: any) {
    return this.request<{ success: boolean; message: string }>('/incidents/' + id, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }


  // Fuel Records (Phase 4 MySQL API)
  async getFuelRecords(vehicleId?: string) {
    const q = vehicleId ? '?vehicleId=' + encodeURIComponent(vehicleId) : '';
    return this.request<any[]>('/fuel-records' + q);
  }

  async createFuelRecord(data: any) {
    return this.request<{ success: boolean; id: string; message: string }>('/fuel-records', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  
  async updateFuelRecord(id: string, data: any) {
    return this.request<{ success: boolean; message: string }>('/fuel-records/' + id, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteFuelRecord(id: string) {
    return this.request<{ success: boolean; message: string }>('/fuel-records/' + id, {
      method: 'DELETE',
    });
  }

  // Maintenance Tasks (Phase 4 MySQL API)
  async getMaintenanceTasks(params?: { status?: string; vehicleId?: string }) {
    const q = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return this.request<any[]>('/maintenance-tasks' + q);
  }

  async createMaintenanceTask(data: any) {
    return this.request<{ success: boolean; id: string; message: string }>('/maintenance-tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateMaintenanceTask(id: string, data: any) {
    return this.request<{ success: boolean; message: string }>('/maintenance-tasks/' + id, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  
  async deleteMaintenanceTask(id: string) {
    return this.request<{ success: boolean; message: string }>('/maintenance-tasks/' + id, {
      method: 'DELETE',
    });
  }

  // Inventory (Phase 4 MySQL API)
  async getInventory(category?: string) {
    const q = category && category !== 'all' ? '?category=' + encodeURIComponent(category) : '';
    return this.request<any[]>('/inventory' + q);
  }

  async createInventoryItem(data: any) {
    return this.request<{ success: boolean; id: string; message: string }>('/inventory', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateInventoryItem(id: string, data: any) {
    return this.request<{ success: boolean; message: string }>('/inventory/' + id, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  
  async deleteInventoryItem(id: string) {
    return this.request<{ success: boolean; message: string }>('/inventory/' + id, {
      method: 'DELETE',
    });
  }

  async getStockMovements(itemId?: string) {
    const q = itemId ? '?itemId=' + encodeURIComponent(itemId) : '';
    return this.request<any[]>('/stock-movements' + q);
  }

  async createStockMovement(data: any) {
    return this.request<{ success: boolean; id: string; message: string }>('/stock-movements', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Invoices & Payments (Phase 4 MySQL API)
  async getInvoices(params?: { status?: string; customerId?: string }) {
    const q = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return this.request<any[]>('/invoices' + q);
  }

  async createInvoice(data: any) {
    return this.request<{ success: boolean; id: string; invoiceNumber: string; message: string }>('/invoices', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async recordPayment(data: any) {
    return this.request<{ success: boolean; id: string; message: string }>('/payments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  
  async getPayments(invoiceId?: string) {
    const q = invoiceId ? '?invoiceId=' + encodeURIComponent(invoiceId) : '';
    return this.request<any[]>('/payments' + q);
  }

  async updateInvoice(id: string, data: any) {
    return this.request<{ success: boolean; message: string }>('/invoices/' + id, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteInvoice(id: string) {
    return this.request<{ success: boolean; message: string }>('/invoices/' + id, {
      method: 'DELETE',
    });
  }

  // Audit Logs (Phase 4 MySQL API)
  async getAuditLogs(params?: { module?: string; severity?: string; limit?: number }) {
    const q = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return this.request<any[]>('/audit-logs' + q);
  }

  async createAuditLog(data: any) {
    return this.request<{ success: boolean; id: string; message: string }>('/audit-logs', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Company Settings & Branding API
  async getCompanySettings() {
    return this.request<any>('/company-settings');
  }

  async updateCompanySettings(data: any) {
    return this.request<{ success: boolean; settings: any; message: string }>('/company-settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async uploadCompanyLogo(logoUrl: string) {
    return this.request<{ success: boolean; logoUrl: string; message: string }>('/company-settings/logo', {
      method: 'POST',
      body: JSON.stringify({ logoUrl }),
    });
  }

  async changePassword(data: { userId?: string; currentPassword: string; newPassword: string }) {
    return this.request<{ success: boolean; message: string }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async testFtpConnection(data: {
    host: string;
    port?: number;
    user?: string;
    password?: string;
    secure?: boolean;
    remoteDir?: string;
  }) {
    return this.request<{ success: boolean; message: string; error?: string }>('/company-settings/test-ftp', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

}

export const api = new ApiClient(API_BASE_URL);

export const apiClient = api;
