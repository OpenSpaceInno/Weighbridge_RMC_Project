import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { User, Role } from '@/types/auth';
import { 
  Users, 
  ShieldCheck, 
  UserPlus, 
  Search, 
  CheckCircle, 
  Lock, 
  Building, 
  Clock, 
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

export default function UserManagement() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newUserData, setNewUserData] = useState({
    username: '',
    name: '',
    email: '',
    password: '',
    roleId: 'weighbridge_operator',
    department: 'Operations',
    shift: 'General Shift (08:00 - 18:00)',
    phone: '',
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [u, r] = await Promise.all([
        api.getUsers(),
        api.getRoles(),
      ]);
      setUsers(u);
      setRoles(r);
    } catch (err: any) {
      toast.error('Failed to load user and role datasets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserData.username || !newUserData.name || !newUserData.email) {
      toast.error('Please fill in all required fields');
      return;
    }

    const selectedRole = roles.find(r => r.id === newUserData.roleId);
    try {
      await api.createUser({
        ...newUserData,
        roleName: selectedRole?.name || 'Operator',
      });
      toast.success(`User ${newUserData.name} created successfully`);
      setCreateDialogOpen(false);
      setNewUserData({
        username: '',
        name: '',
        email: '',
        password: '',
        roleId: 'weighbridge_operator',
        department: 'Operations',
        shift: 'General Shift (08:00 - 18:00)',
        phone: '',
      });
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create user');
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.department && u.department.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesRole = roleFilter === 'all' || u.roleId === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            User & Role Security Access (RBAC)
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage authenticated plant personnel, operational privileges, and route permissions across MySQL <span className="font-mono text-xs font-semibold">RMC-SAAS</span>.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Add Plant Operator
          </Button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-medium">Total Registered Users</CardDescription>
            <CardTitle className="text-2xl font-bold text-foreground">{users.length}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground flex items-center gap-1">
            <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
            <span>{users.filter(u => u.status === 'active').length} Active in Plant</span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-medium">Security Roles</CardDescription>
            <CardTitle className="text-2xl font-bold text-foreground">{roles.length}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground flex items-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            <span>8 Default RBAC Personas</span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-medium">Active Session</CardDescription>
            <CardTitle className="text-lg font-bold truncate text-primary">{currentUser?.name?.split('(')[0]}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Role: <span className="font-semibold">{currentUser?.roleName}</span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-medium">Database Persistence</CardDescription>
            <CardTitle className="text-lg font-bold text-emerald-500">MySQL Live</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Tables: <span className="font-mono">users, roles, audit_logs</span>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span>Plant Personnel ({users.length})</span>
          </TabsTrigger>
          <TabsTrigger value="roles" className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            <span>RBAC Security Matrix ({roles.length})</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Users */}
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-semibold">Authorized Operators & Staff</CardTitle>
                  <CardDescription>All personnel provisioned in MySQL database</CardDescription>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search users..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8 text-sm"
                    />
                  </div>
                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="w-full sm:w-44 text-sm">
                      <SelectValue placeholder="Filter by Role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      {roles.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-semibold">
                    <tr>
                      <th className="px-4 py-3">User & Contact</th>
                      <th className="px-4 py-3">Security Role</th>
                      <th className="px-4 py-3">Department</th>
                      <th className="px-4 py-3">Assigned Shift</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Last Login</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                          No users matched your query.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((u) => (
                        <tr key={u.id} className="hover:bg-muted/40 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-semibold text-foreground">{u.name}</div>
                            <div className="text-xs text-muted-foreground font-mono">@{u.username} · {u.email}</div>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="outline" className="font-medium bg-primary/5 text-primary border-primary/20">
                              {u.roleName}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {u.department || 'Operations'}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground text-xs">
                            {u.shift || 'General Shift'}
                          </td>
                          <td className="px-4 py-3">
                            <Badge
                              className={
                                u.status === 'active'
                                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                                  : 'bg-muted text-muted-foreground'
                              }
                            >
                              {u.status.toUpperCase()}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {u.lastLogin ? new Date(u.lastLogin).toLocaleString() : 'Never'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Roles */}
        <TabsContent value="roles" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {roles.map((r) => {
              const assignedCount = users.filter((u) => u.roleId === r.id).length;
              return (
                <Card key={r.id} className="border-border hover:border-primary/50 transition-colors flex flex-col justify-between">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between mb-1">
                      <Badge className="bg-primary/20 text-primary border-primary/30 text-xs">
                        {r.id}
                      </Badge>
                      <span className="text-xs font-semibold text-muted-foreground">
                        {assignedCount} {assignedCount === 1 ? 'user' : 'users'}
                      </span>
                    </div>
                    <CardTitle className="text-base font-bold text-foreground">{r.name}</CardTitle>
                    <CardDescription className="text-xs line-clamp-2 mt-1">{r.description}</CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-3 pt-0">
                    <div>
                      <div className="text-[11px] uppercase font-semibold text-muted-foreground mb-1.5 tracking-wider">
                        Permitted Modules ({r.modules.length})
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {r.modules.slice(0, 6).map((m) => (
                          <span key={m} className="px-2 py-0.5 rounded text-[11px] bg-muted text-muted-foreground font-mono">
                            {m === '/' ? '/dashboard' : m}
                          </span>
                        ))}
                        {r.modules.length > 6 && (
                          <span className="px-2 py-0.5 rounded text-[11px] bg-muted/50 text-muted-foreground font-mono">
                            +{r.modules.length - 6} more
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="text-[11px] uppercase font-semibold text-muted-foreground mb-1.5 tracking-wider">
                        Functional Privileges
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {r.permissions.map((p) => (
                          <Badge key={p} variant="secondary" className="text-[10px] font-mono py-0">
                            {p}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* Create User Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleCreateUser}>
            <DialogHeader>
              <DialogTitle>Add Plant Operator</DialogTitle>
              <DialogDescription>
                Provision a new operator profile with designated RBAC security role.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-4 text-sm">
              <div className="space-y-1">
                <Label htmlFor="fullname">Full Name *</Label>
                <Input
                  id="fullname"
                  placeholder="e.g. Anand Shinde"
                  value={newUserData.name}
                  onChange={(e) => setNewUserData({ ...newUserData, name: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="username">Username *</Label>
                  <Input
                    id="username"
                    placeholder="e.g. anand.wb"
                    value={newUserData.username}
                    onChange={(e) => setNewUserData({ ...newUserData, username: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="password">Password *</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="e.g. scale123"
                    value={newUserData.password}
                    onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="e.g. anand@aparnarmc.com"
                  value={newUserData.email}
                  onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="role">Security Role</Label>
                <Select
                  value={newUserData.roleId}
                  onValueChange={(val) => setNewUserData({ ...newUserData, roleId: val })}
                >
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="dept">Department</Label>
                  <Input
                    id="dept"
                    placeholder="e.g. Weighbridge"
                    value={newUserData.department}
                    onChange={(e) => setNewUserData({ ...newUserData, department: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    placeholder="+91 98200..."
                    value={newUserData.phone}
                    onChange={(e) => setNewUserData({ ...newUserData, phone: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Create Operator</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

