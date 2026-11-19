export type ReportType = 
  | 'trip_summary' 
  | 'fuel_consumption' 
  | 'vehicle_performance' 
  | 'driver_performance'
  | 'maintenance_history'
  | 'inventory_status'
  | 'billing_summary'
  | 'customer_statement'
  | 'incident_log'
  | 'weighbridge_log'
  | 'weighment_report';

export type ReportFormat = 'pdf' | 'excel' | 'csv';
export type ReportFrequency = 'daily' | 'weekly' | 'monthly' | 'quarterly';

export interface ReportConfig {
  id: string;
  name: string;
  type: ReportType;
  description: string;
  parameters: ReportParameter[];
  availableFormats: ReportFormat[];
  createdAt: string;
}

export interface ReportParameter {
  name: string;
  label: string;
  type: 'date' | 'daterange' | 'select' | 'multiselect' | 'text';
  required: boolean;
  options?: { value: string; label: string }[];
  defaultValue?: string | string[];
}

export interface GeneratedReport {
  id: string;
  name: string;
  type: ReportType;
  format: ReportFormat;
  parameters: Record<string, any>;
  generatedAt: string;
  generatedBy: string;
  fileUrl?: string;
  fileSize?: number;
  status: 'generating' | 'completed' | 'failed';
  errorMessage?: string;
  content?: string;
  dataPreview?: any;
}

export interface ScheduledReport {
  id: string;
  name: string;
  type: ReportType;
  format: ReportFormat;
  frequency: ReportFrequency;
  parameters: Record<string, any>;
  recipients: string[];
  isActive: boolean;
  lastRun?: string;
  nextRun?: string;
}

export interface ReportStats {
  totalGenerated: number;
  activeSchedules: number;
  lastGeneratedTime?: string;
}

export interface ReportGenerateRequest {
  type: ReportType;
  format: ReportFormat;
  parameters: Record<string, any>;
}

export interface ScheduleReportRequest {
  name: string;
  type: ReportType;
  format: ReportFormat;
  frequency: ReportFrequency;
  parameters: Record<string, any>;
  recipients: string[];
}

export interface TripSummaryData {
  tripNumber: string;
  date: string;
  truckNo: string;
  driverName: string;
  customerName: string;
  siteLocation: string;
  material: string;
  orderedQty: number;
  deliveredQty: number;
  slumpTarget: number;
  slumpActual: number;
  status: string;
  startTime: string;
  endTime?: string;
}

export interface FuelConsumptionData {
  vehicleRegNo: string;
  vehicleType: string;
  totalDistanceKm: number;
  totalFuelLiters: number;
  mileageKmpl: number;
  engineHours: number;
  totalFuelCost: number;
}

// ==========================================
// 47-FIELD WEIGHMENT REPORT SPECIFICATIONS
// ==========================================

export interface ReportFieldConfig {
  sNo: number;
  fieldKey: string;
  fieldName: string;
  isSelected: boolean;
  displayOrder: number;
}

export interface WeighmentReportTransaction {
  TransactionNo: number;
  FDate: string;
  Charges: number;
  VehicleNo: string;
  PartyName: string;
  Product: string;
  FTime: string;
  FWeight: number;
  SDate: string;
  STime: string;
  SWeight: number;
  Status: string;
  FWUser: string;
  SWUser: string;
  NettWeight: number;
  lesswt: number;
  Finwt: number;
  MoisRate: number;
  Amount: number;
  IMAGE1: string;
  IMAGE2: string;
  IMAGE3: string;
  IMAGE4: string;
  udt: string;
  Deduction: number;
  LocationName: string;
  CultivatorName: string;
  LoadSlipNo: string;
  BagsBales: string;
  Rate: number;
  Moisture: number;
  ChessNo: string;
  ChessName: string;
  ChessAmount: number;
  FatherName: string;
  Mandal: string;
  Village: string;
  BankName: string;
  BranchName: string;
  IFSCODE: string;
  TraderName: string;
  AllotedMil: string;
  AccountNo: string;
  Heap: string;
  FinalRate: number;
  MobileNo: string;
  FinalWeight: number;
  [key: string]: any;
}

export interface ReportFilterParams {
  dateFrom?: string;
  dateTo?: string;
  partyName?: string;
  product?: string;
  status?: string;
  transNoFrom?: string | number;
  transNoTo?: string | number;
  vehicleNo?: string;
  fwUser?: string;
  swUser?: string;
  firstDateWise?: boolean;
}

export interface PartyTotalItem {
  partyName: string;
  totalTransactions: number;
  totalFirstWeight: number;
  totalSecondWeight: number;
  totalNetWeight: number;
  totalDeduction: number;
  totalLessWeight: number;
  totalFinalWeight: number;
  totalCharges: number;
  totalChessAmount: number;
  totalAmount: number;
}

export interface GrandTotalItem {
  totalTransactions: number;
  totalFirstWeight: number;
  totalSecondWeight: number;
  totalNetWeight: number;
  totalDeduction: number;
  totalLessWeight: number;
  totalFinalWeight: number;
  totalCharges: number;
  totalChessAmount: number;
  totalAmount: number;
}

export interface PartyTotalsResponse {
  success: boolean;
  partyTotals: PartyTotalItem[];
  grandTotals: GrandTotalItem;
}

export interface ReportFilterOptionsResponse {
  parties: string[];
  products: string[];
  statuses: string[];
  users: string[];
}
