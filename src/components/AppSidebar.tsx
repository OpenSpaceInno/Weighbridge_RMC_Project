import { 
  LayoutDashboard, 
  LogIn, 
  Scale, 
  Package, 
  CheckCircle, 
  Route, 
  LogOut, 
  AlertTriangle,
  Users,
  Settings,
  Truck,
  UserCircle,
  Navigation,
  Fuel,
  Wrench,
  Receipt,
  Warehouse,
  FileText,
  BarChart3,
  ShieldCheck,
  Database,
  Building2
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useCompany } from "@/contexts/CompanyContext";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const operationsItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Gate Monitor", url: "/gate-monitor", icon: LogIn },
  { title: "Weighbridge", url: "/weighbridge", icon: Scale },
  { title: "Loading Console", url: "/loading", icon: Package },
  { title: "Dispatch Approval", url: "/dispatch", icon: CheckCircle },
];

const trackingItems = [
  { title: "Trip Management", url: "/trips", icon: Navigation },
  { title: "Trip Tracking", url: "/trip-tracking", icon: Route },
  { title: "Trip Analytics", url: "/trip-analytics", icon: BarChart3 },
  { title: "Exit Verification", url: "/exit-verification", icon: LogOut },
  { title: "Incidents", url: "/incidents", icon: AlertTriangle },
  { title: "Audit Trail", url: "/audit-logs", icon: ShieldCheck },
];

const fleetItems = [
  { title: "Vehicle Management", url: "/vehicles", icon: Truck },
  { title: "Driver Management", url: "/drivers", icon: UserCircle },
  { title: "Fuel Management", url: "/fuel", icon: Fuel },
  { title: "Maintenance", url: "/maintenance", icon: Wrench },
];

const externalItems = [
  { title: "Customer Portal", url: "/customer-portal", icon: Users },
  { title: "Billing", url: "/billing", icon: Receipt },
  { title: "Inventory", url: "/inventory", icon: Warehouse },
  { title: "Reports", url: "/reports", icon: FileText },
  { title: "Device Config", url: "/device-config", icon: Settings },
];

const adminItems = [
  { title: "Company & Settings", url: "/settings", icon: Building2 },
  { title: "User & Role Security", url: "/users", icon: Users },
  { title: "Database Setup", url: "/database-setup", icon: Database },
];

export function AppSidebar() {
  const { open } = useSidebar();
  const location = useLocation();
  const { canAccessRoute, role, hasPermission } = useAuth();
  const { company } = useCompany();
  const currentPath = location.pathname;

  // Filter items dynamically based on current user role
  const visibleOperations = operationsItems.filter(item => canAccessRoute(item.url));
  const visibleTracking = trackingItems.filter(item => canAccessRoute(item.url));
  const visibleFleet = fleetItems.filter(item => canAccessRoute(item.url));
  const visibleExternal = externalItems.filter(item => canAccessRoute(item.url));
  const visibleAdmin = adminItems.filter(item => canAccessRoute(item.url) || hasPermission('users:manage'));

  return (
    <Sidebar className={open ? "w-64" : "w-16"} collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border px-4 py-4">
        {open ? (
          <div className="flex items-center gap-2.5">
            {company.logoUrl ? (
              <img
                src={company.logoUrl}
                alt={company.firmName}
                className="h-8 w-auto max-w-[42px] object-contain rounded"
              />
            ) : (
              <div className="h-8 w-8 rounded bg-sidebar-primary flex items-center justify-center">
                <span className="text-sidebar-primary-foreground font-bold text-sm">RMC</span>
              </div>
            )}
            <div className="overflow-hidden">
              <h2 className="text-xs font-bold text-sidebar-foreground truncate" title={company.firmName}>
                {company.firmName || "RMC Plant"}
              </h2>
              <p className="text-[10px] text-sidebar-foreground/70 truncate" title={company.plantName}>
                {company.plantCode || 'PLANT_001'} · {role ? role.name.split('/')[0] : 'Operations'}
              </p>
            </div>
          </div>
        ) : (
          <div className="h-8 w-8 rounded bg-sidebar-primary flex items-center justify-center mx-auto overflow-hidden">
            {company.logoUrl ? (
              <img src={company.logoUrl} alt="Logo" className="h-full w-full object-contain p-0.5" />
            ) : (
              <span className="text-sidebar-primary-foreground font-bold text-sm">R</span>
            )}
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        {visibleOperations.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className={!open ? "sr-only" : ""}>Operations</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {visibleOperations.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink 
                        to={item.url} 
                        end={item.url === "/"}
                        className="hover:bg-sidebar-accent transition-colors" 
                        activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                      >
                        <item.icon className="h-4 w-4" />
                        {open && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {visibleTracking.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className={!open ? "sr-only" : ""}>Tracking & Audit</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {visibleTracking.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink 
                        to={item.url} 
                        className="hover:bg-sidebar-accent transition-colors" 
                        activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                      >
                        <item.icon className="h-4 w-4" />
                        {open && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {visibleFleet.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className={!open ? "sr-only" : ""}>Fleet</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {visibleFleet.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink 
                        to={item.url} 
                        className="hover:bg-sidebar-accent transition-colors" 
                        activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                      >
                        <item.icon className="h-4 w-4" />
                        {open && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {visibleExternal.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className={!open ? "sr-only" : ""}>External & Commercial</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {visibleExternal.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink 
                        to={item.url} 
                        className="hover:bg-sidebar-accent transition-colors" 
                        activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                      >
                        <item.icon className="h-4 w-4" />
                        {open && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {visibleAdmin.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className={!open ? "sr-only" : ""}>Security & Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {visibleAdmin.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink 
                        to={item.url} 
                        className="hover:bg-sidebar-accent transition-colors" 
                        activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                      >
                        <item.icon className="h-4 w-4" />
                        {open && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
