import { ThirdPartyScaleConfig } from './weighbridge';

export interface FtpSettings {
  enabled: boolean;
  host: string;
  port: number;
  user: string;
  password?: string;
  secure: boolean;
  remoteDir: string;
}

export interface WeighbridgeDefaults {
  defaultRate: number;
  defaultMoisture: number;
  defaultDeduction: number;
  defaultCharges: number;
  printDuplicate: boolean;
  printQrCode: boolean;
  printImages: boolean;
  autoWeighInterval?: number;
  minTareWeight?: number;
  maxGrossWeight?: number;
  ftp?: FtpSettings;
  thirdPartyScale?: ThirdPartyScaleConfig;
}

export interface CompanySettings {
  id: string;
  companyName: string;
  firmName: string;
  plantName: string;
  plantCode: string;
  tagline: string;
  logoUrl: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  email: string;
  website: string;
  gstin: string;
  weighbridgeLicense: string;
  scaleModel: string;
  scaleCapacity: string;
  scaleDivision: string;
  currency: string;
  weighbridgeDefaults: WeighbridgeDefaults;
  invoiceTerms: string;
  weighSlipNotes: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ChangePasswordPayload {
  userId?: string;
  currentPassword: string;
  newPassword: string;
}
