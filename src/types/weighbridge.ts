export interface WeightReading {
  timestamp: string;
  weight: number;
  unit: 'kg' | 'ton';
  weightQtl?: number;
  stable: boolean;
  zero?: boolean;
  source?: string;
  deviceCode?: string;
  connected?: boolean;
  serialPort?: string;
}

export interface Evidence {
  id: string;
  type: 'image' | 'video';
  url: string;
  angle: 'front' | 'side' | 'rear' | 'top' | 'load';
  timestamp: string;
  thumbnailUrl?: string;
}

export interface PrintOptions {
  printDuplicate: boolean;
  printQrCode: boolean;
  printImages: boolean;
}

export interface WeighbridgeSession {
  id?: string;
  sessionId: string;
  transactionNo: number;
  vehicleRegNo: string;
  vehicleNo?: string;
  partyName?: string;
  firmName?: string;
  companyName?: string;
  companyAddress?: string;
  phoneNo?: string;
  loadSlipNo?: string;
  cultivatorName?: string;
  fatherName?: string;
  mobileNo?: string;
  product?: string;
  material?: string;
  timestamp: string;
  
  // Dual-weighment
  firstWeight: number | null;
  firstWeightDate?: string | null;
  firstWeightTime?: string | null;
  secondWeight: number | null;
  secondWeightDate?: string | null;
  secondWeightTime?: string | null;
  
  // Legacy compatibility
  tareWeight: number | null;
  grossWeight: number | null;
  netWeight: number | null;
  nettWeight?: number | null;
  
  // Commercial parameters
  rate?: number;
  moisture?: number;
  deduction?: number;
  charges?: number;
  vehicleType?: string;
  bagsBales?: string;
  agent?: string;
  village?: string;
  locationName?: string;
  chessNo?: string;
  chessAmount?: number;
  chessName?: string;
  finalRate?: number;
  totalAmount?: number;
  printOptions?: PrintOptions;
  
  driverName?: string;
  destination?: string;
  evidence: Evidence[];
  status: 'tare' | 'gross' | 'completed' | 'pending_2nd_weight' | '1st_weight_complete' | string;
  operatorId: string;
  operatorName: string;
  adminName?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface WeighSlip {
  slipNumber?: string;
  sessionId: string;
  transactionNo: number;

  // 24 Standard Weighment Slip Fields
  companyName?: string;
  companyAddress?: string;
  phoneNo?: string;
  partyName?: string;
  loadSlipNo?: string;
  vehicleNo?: string;
  vehicleRegNo: string;
  cultivatorName?: string;
  fatherName?: string;
  mobileNo?: string;
  status?: string;
  moisture?: number;
  bagsBales?: string;
  chessAmount?: number;
  firstWeight: number;
  firstWeightDate?: string;
  firstWeightTime?: string | null;
  secondWeight: number;
  secondWeightDate?: string;
  secondWeightTime?: string | null;
  nettWeight?: number;
  netWeight: number;
  village?: string;
  locationName?: string;
  rate?: number;
  adminName?: string;

  // Additional metadata & compatibility
  firmName?: string;
  product?: string;
  material: string;
  dateTime: string;
  tareWeight: number;
  grossWeight: number;
  deduction?: number;
  charges?: number;
  vehicleType?: string;
  agent?: string;
  chessNo?: string;
  chessName?: string;
  finalRate?: number;
  totalAmount?: number;
  printOptions?: PrintOptions;
  driverName?: string;
  destination?: string;
  operatorName: string;
  evidence: Evidence[];
  createdAt?: string;
}

export interface CameraConfig {
  id: string;
  name: string;
  camIp: string;
  port: number;
  username: string;
  password?: string;
  status: 'connected' | 'connecting' | 'disconnected' | 'error';
  streamUrl?: string;
}

export type ThirdPartyScaleMode = 'ventek_vms' | 'web_serial' | 'file_monitor' | 'tcp_socket' | 'http_push' | 'simulated';

export type ScaleProtocol = 'standard_ascii' | 'ventek_vms' | 'avery_e1205' | 'essae' | 'toledo' | 'eagle' | 'custom';

export interface WeighbridgeDeviceConfig {
  id: string;
  deviceCode: string;
  displayName: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  capacityKg: number;
  port: string;
  baudRate: number;
  interfaceType: string;
  dataBits: number;
  stopBits: number;
  parity: 'none' | 'even' | 'odd';
  sampleTimeMs: number;
  byteRange: string;
  unitType: 'Qtl' | 'kg';
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ThirdPartyScaleConfig {
  enabled: boolean;
  mode: ThirdPartyScaleMode;
  protocol: ScaleProtocol;
  baudRate: number;
  dataBits: number;
  stopBits: number;
  parity: 'none' | 'even' | 'odd';
  filePath: string;
  tcpHost: string;
  tcpPort: number;
  pollIntervalMs: number;
  connected?: boolean;
  serialPort?: string;
  lastReading?: WeightReading;
  rawSample?: string;
}

