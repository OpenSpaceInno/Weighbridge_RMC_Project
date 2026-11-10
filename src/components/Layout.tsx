import React, { useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useAuth } from "@/hooks/useAuth";
import { RoleSwitcherModal } from "@/components/auth/RoleSwitcherModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  User as UserIcon, 
  LogOut, 
  Shield, 
  Users, 
  ChevronDown,
  Building,
  KeyRound,
  Building2,
  Lock
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useCompany } from "@/contexts/CompanyContext";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { user, role, logout, hasPermission } = useAuth();
  const { company } = useCompany();
  const [roleSwitcherOpen, setRoleSwitcherOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const canManageUsers = hasPermission('users:manage');

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 border-b border-border bg-card flex items-center px-4 sticky top-0 z-10 justify-between">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <div className="flex items-center gap-2">
                <h1 className="text-base font-semibold text-foreground hidden sm:inline">
                  {company.firmName || "RMC Plant Operations"}
                </h1>
                <Badge variant="outline" className="text-[11px] font-mono text-muted-foreground border-border">
                  {company.plantCode || "PLANT_001"}
                </Badge>
              </div>
            </div>

            {/* Right User & Persona Controls */}
            <div className="flex items-center gap-3">
              {/* Quick Persona Switch Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRoleSwitcherOpen(true)}
                className="hidden md:flex items-center gap-1.5 text-xs h-8 border-dashed"
              >
                <KeyRound className="h-3.5 w-3.5 text-primary" />
                <span>Switch Role</span>
              </Button>

              {/* User Dropdown */}
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-muted/70 transition-colors outline-none text-left">
                      <div className="h-8 w-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary font-bold text-xs">
                        {user.name.charAt(0)}
                      </div>
                      <div className="hidden sm:flex flex-col">
                        <span className="text-xs font-semibold text-foreground leading-none">
                          {user.name.split('(')[0]}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-medium mt-0.5">
                          {role?.name || user.roleName}
                        </span>
                      </div>
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground hidden sm:inline" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-semibold text-foreground leading-none">{user.name}</p>
                        <p className="text-xs text-muted-foreground font-mono leading-none">{user.email}</p>
                        <div className="pt-1.5 flex items-center gap-1.5">
                          <Badge className="bg-primary/15 text-primary border-primary/30 text-[10px] py-0">
                            {role?.name || user.roleName}
                          </Badge>
                        </div>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />

                    <DropdownMenuItem onClick={() => setRoleSwitcherOpen(true)} className="cursor-pointer">
                      <KeyRound className="mr-2 h-4 w-4 text-primary" />
                      <span>Switch Operational Role</span>
                    </DropdownMenuItem>

                    <DropdownMenuItem asChild className="cursor-pointer">
                      <Link to="/settings">
                        <Building2 className="mr-2 h-4 w-4 text-muted-foreground" />
                        <span>Company & System Settings</span>
                      </Link>
                    </DropdownMenuItem>

                    <DropdownMenuItem asChild className="cursor-pointer">
                      <Link to="/settings">
                        <Lock className="mr-2 h-4 w-4 text-muted-foreground" />
                        <span>Change Password</span>
                      </Link>
                    </DropdownMenuItem>

                    {canManageUsers && (
                      <DropdownMenuItem asChild className="cursor-pointer">
                        <Link to="/users">
                          <Users className="mr-2 h-4 w-4 text-muted-foreground" />
                          <span>User & RBAC Security</span>
                        </Link>
                      </DropdownMenuItem>
                    )}

                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:text-destructive">
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Sign Out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button asChild size="sm" variant="default" className="h-8 text-xs">
                  <Link to="/login">Sign In</Link>
                </Button>
              )}
            </div>
          </header>

          <main className="flex-1 p-4 md:p-6 bg-background">
            {children}
          </main>
        </div>
      </div>

      <RoleSwitcherModal open={roleSwitcherOpen} onOpenChange={setRoleSwitcherOpen} />
    </SidebarProvider>
  );
}
