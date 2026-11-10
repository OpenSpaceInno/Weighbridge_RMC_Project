import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth, DEMO_USERS } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ShieldCheck, 
  Lock, 
  User as UserIcon, 
  Eye, 
  EyeOff, 
  Truck, 
  Scale, 
  Package, 
  ArrowRight,
  Radio,
  CheckCircle2
} from 'lucide-react';

export default function Login() {
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from?.pathname || '/';

  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const res = await login({ username, password });
    if (res.success) {
      navigate(from, { replace: true });
    } else {
      setError(res.error || 'Authentication failed');
    }
  };

  const handleQuickLogin = async (demoUser: typeof DEMO_USERS[0]) => {
    setUsername(demoUser.username);
    setPassword(demoUser.defaultPass);
    setError(null);
    const res = await login({ username: demoUser.username, password: demoUser.defaultPass });
    if (res.success) {
      navigate(from, { replace: true });
    } else {
      setError(res.error || 'Authentication failed');
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-background">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 border-r border-slate-800 flex-col justify-between p-12 text-white relative overflow-hidden">
        {/* Background gradient decorative effect */}
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
              <span className="text-white font-extrabold text-lg">RMC</span>
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">RMC-SAAS</h2>
              <p className="text-xs text-slate-400">Gate-to-Exit Operations Platform</p>
            </div>
          </div>

          <div className="space-y-4 max-w-lg mt-12">
            <Badge className="bg-primary/20 text-primary-foreground border-primary/30 px-3 py-1">
              Industrial IoT · Ready-Mix Concrete Automation
            </Badge>
            <h1 className="text-4xl font-extrabold tracking-tight leading-tight">
              Unified Plant Gate, Scale & Dispatch Control System
            </h1>
            <p className="text-slate-300 text-base leading-relaxed">
              End-to-end industrial software orchestrating automated ANPR gate access, dual-axle weighbridge gross/tare capture, slump retention validation, and encrypted audit trails.
            </p>
          </div>
        </div>

        <div className="relative z-10 space-y-4 pt-10 border-t border-slate-800">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2.5 text-slate-300">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>Camera OCR ANPR (98.4%)</span>
            </div>
            <div className="flex items-center gap-2.5 text-slate-300">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>Strict Mode MySQL 8.0</span>
            </div>
            <div className="flex items-center gap-2.5 text-slate-300">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>Weighbridge Tolerance ±5%</span>
            </div>
            <div className="flex items-center gap-2.5 text-slate-300">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>SHA-256 Non-Repudiation</span>
            </div>
          </div>
          <div className="text-xs text-slate-500 pt-2">
            Connected to Database: <span className="font-mono text-slate-400">RMC-SAAS (Localhost:3306)</span>
          </div>
        </div>
      </div>

      {/* Right Login Form Panel */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-12 overflow-y-auto">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center lg:text-left">
            <div className="inline-flex lg:hidden items-center gap-2 mb-4">
              <div className="h-8 w-8 rounded bg-primary flex items-center justify-center text-white font-bold text-sm">
                RMC
              </div>
              <span className="font-bold text-lg">RMC-SAAS</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Sign in to Terminal</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Authenticate with your plant credentials or select a demo role below.
            </p>
          </div>

          <Card className="border border-border shadow-sm">
            <form onSubmit={handleSubmit}>
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-semibold">User Authentication</CardTitle>
                <CardDescription>Enter your assigned plant username or email</CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                {error && (
                  <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium">
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="username">Username or Email</Label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="username"
                      type="text"
                      placeholder="e.g. admin or gate.security"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="pl-9"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <span className="text-xs text-muted-foreground">Default: [role]123</span>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-9 pr-9"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="flex flex-col gap-3">
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Authenticating...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      Access System <ArrowRight className="h-4 w-4" />
                    </span>
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>

          {/* Quick Demo Persona Switcher */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-semibold text-muted-foreground tracking-wider">
                Quick Login as Role Persona
              </span>
              <Badge variant="outline" className="text-[10px]">8 Operational Roles</Badge>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {DEMO_USERS.map((demo) => (
                <button
                  key={demo.username}
                  type="button"
                  onClick={() => handleQuickLogin(demo)}
                  disabled={isLoading}
                  className="flex flex-col text-left p-2.5 rounded-lg border border-border bg-card hover:bg-accent/60 hover:border-primary/40 transition-colors"
                >
                  <span className="text-xs font-semibold text-foreground truncate">{demo.roleName.split('/')[0]}</span>
                  <span className="text-[11px] text-muted-foreground truncate">{demo.username}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

