export interface WeightReading {
  timestamp: string;
  weight: number;
  unit: 'kg' | 'ton';
  stable: boolean;
  zero?: boolean;
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
  partyName?: string;
  firmName?: string;
  product?: string;
  material?: string;
  timestamp: string;
  
  // Dual-weighment
  firstWeight: number | null;
  firstWeightTime?: string | null;
  secondWeight: number | null;
  secondWeightTime?: string | null;
  
  // Legacy compatibility
  tareWeight: number | null;
  grossWeight: number | null;
  netWeight: number | null;
  
  // Commercial parameters
  rate?: number;
  moisture?: number;
  deduction?: number;
  charges?: number;
  vehicleType?: string;
  bagsBales?: string;
  agent?: string;
  village?: string;
  chessNo?: string;
  chessAmount?: number;
  chessName?: string;
  finalRate?: number;
  totalAmount?: number;
  printOptions?: PrintOptions;
  
  driverName?: string;
  destination?: string;
  evidence: Evidence[];
  status: 'tare' | 'gross' | 'completed' | 'pending_2nd_weight' | '1st_weight_complete';
  operatorId: string;
  operatorName: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface WeighSlip {
  slipNumber: string;
  sessionId: string;
  transactionNo: number;
  vehicleRegNo: string;
  partyName?: string;
  firmName?: string;
  product?: string;
  material: string;
  dateTime: string;
  
  firstWeight: number;
  firstWeightTime?: string | null;
  secondWeight: number;
  secondWeightTime?: string | null;
  
  tareWeight: number;
  grossWeight: number;
  netWeight: number;
  
  rate?: number;
  moisture?: number;
  deduction?: number;
  charges?: number;
  vehicleType?: string;
  bagsBales?: string;
  agent?: string;
  village?: string;
  chessNo?: string;
  chessAmount?: number;
  chessName?: string;
  finalRate?: number;
  totalAmount?: number;
  printOptions?: PrintOptions;
  
  driverName: string;
  destination: string;
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

export type ThirdPartyScaleMode = 'web_serial' | 'file_monitor' | 'tcp_socket' | 'http_push' | 'simulated';

export type ScaleProtocol = 'standard_ascii' | 'avery_e1205' | 'essae' | 'toledo' | 'eagle' | 'custom';

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
  lastReading?: WeightReading;
  rawSample?: string;
}

