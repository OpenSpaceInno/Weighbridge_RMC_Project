import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { CompanyProvider } from "@/contexts/CompanyContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Layout } from "@/components/Layout";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import GateMonitor from "./pages/GateMonitor";
import Weighbridge from "./pages/Weighbridge";
import LoadingConsole from "./pages/LoadingConsole";
import DispatchApproval from "./pages/DispatchApproval";
import TripManagement from "./pages/TripManagement";
import TripTracking from "./pages/TripTracking";
import ExitVerification from "./pages/ExitVerification";
import IncidentManagement from "./pages/IncidentManagement";
import CustomerPortal from "./pages/CustomerPortal";
import DeviceConfig from "./pages/DeviceConfig";
import DatabaseSetup from "./pages/DatabaseSetup";
import VehicleManagement from "./pages/VehicleManagement";
import DriverManagement from "./pages/DriverManagement";
import TripAnalytics from "./pages/TripAnalytics";
import FuelManagement from "./pages/FuelManagement";
import MaintenanceScheduler from "./pages/MaintenanceScheduler";
import Billing from "./pages/Billing";
import InventoryManagement from "./pages/InventoryManagement";
import Reports from "./pages/Reports";
import AuditLogs from "./pages/AuditLogs";
import UserManagement from "./pages/UserManagement";
import CompanySettings from "./pages/CompanySettings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <CompanyProvider>
            <Routes>
              {/* Public Auth Route */}
              <Route path="/login" element={<Login />} />

              {/* Protected Plant Operational Routes */}
              <Route
                path="/*"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/gate-monitor" element={<GateMonitor />} />
                        <Route path="/weighbridge" element={<Weighbridge />} />
                        <Route path="/loading" element={<LoadingConsole />} />
                        <Route path="/dispatch" element={<DispatchApproval />} />
                        <Route path="/trips" element={<TripManagement />} />
                        <Route path="/trip-tracking" element={<TripTracking />} />
                        <Route path="/exit-verification" element={<ExitVerification />} />
                        <Route path="/incidents" element={<IncidentManagement />} />
                        <Route path="/audit-logs" element={<AuditLogs />} />
                        <Route path="/customer-portal" element={<CustomerPortal />} />
                        <Route path="/database-setup" element={<DatabaseSetup />} />
                        <Route path="/device-config" element={<DeviceConfig />} />
                        <Route path="/vehicles" element={<VehicleManagement />} />
                        <Route path="/drivers" element={<DriverManagement />} />
                        <Route path="/trip-analytics" element={<TripAnalytics />} />
                        <Route path="/fuel" element={<FuelManagement />} />
                        <Route path="/maintenance" element={<MaintenanceScheduler />} />
                        <Route path="/billing" element={<Billing />} />
                        <Route path="/inventory" element={<InventoryManagement />} />
                        <Route path="/reports" element={<Reports />} />
                        <Route path="/users" element={<UserManagement />} />
                        <Route path="/settings" element={<CompanySettings />} />
                        <Route path="/company-settings" element={<CompanySettings />} />
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </Layout>
                  </ProtectedRoute>
                }
              />
            </Routes>
          </CompanyProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
