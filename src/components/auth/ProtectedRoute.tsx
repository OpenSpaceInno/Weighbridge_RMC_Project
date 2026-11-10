import React from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { ShieldAlert, ArrowLeft, KeyRound, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ProtectedRouteProps {
  children?: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading, user, role, canAccessRoute } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm font-medium text-muted-foreground animate-pulse">
            Verifying Plant Security Clearance...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const hasAccess = canAccessRoute(location.pathname);

  if (!hasAccess) {
    return (
      <div className="flex min-h-[70vh] w-full items-center justify-center p-4">
        <Card className="max-w-xl border-destructive/30 shadow-lg">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <ShieldAlert className="h-8 w-8" />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
              Module Access Restricted
            </CardTitle>
            <CardDescription className="text-base text-muted-foreground">
              Your security clearance level does not grant access to this operational terminal.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-4">
            <div className="rounded-lg bg-muted/60 p-4 border border-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs uppercase font-semibold text-muted-foreground tracking-wider">Current User</span>
                <Badge variant="outline" className="font-mono text-xs">{user?.username}</Badge>
              </div>
              <div className="text-sm font-medium text-foreground">{user?.name}</div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs uppercase font-semibold text-muted-foreground tracking-wider">Assigned Role</span>
                <Badge className="bg-primary/20 text-primary border-primary/30">
                  {role?.name || user?.roleName}
                </Badge>
              </div>
            </div>

            <div>
              <h4 className="text-xs uppercase font-semibold text-muted-foreground mb-3 tracking-wider">
                Authorized Modules for Your Role
              </h4>
              <div className="flex flex-wrap gap-2">
                {role?.modules.map((mod) => (
                  <Link key={mod} to={mod}>
                    <Badge variant="secondary" className="hover:bg-accent transition-colors flex items-center gap-1 cursor-pointer py-1 px-2.5">
                      <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                      <span>{mod === '/' ? 'Dashboard' : mod.replace('/', '').replace('-', ' ').toUpperCase()}</span>
                    </Badge>
                  </Link>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button asChild variant="default" className="flex-1">
                <Link to="/">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Return to Dashboard
                </Link>
              </Button>
              <Button asChild variant="outline" className="flex-1">
                <Link to="/login">
                  <KeyRound className="mr-2 h-4 w-4" />
                  Switch Active Persona
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};

