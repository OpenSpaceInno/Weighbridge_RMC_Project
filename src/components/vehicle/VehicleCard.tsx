import { Vehicle } from '@/types/vehicle';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Truck, 
  Fuel, 
  User, 
  Calendar, 
  Gauge,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  AlertTriangle,
  UserPlus
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface VehicleCardProps {
  vehicle: Vehicle;
  onView: (vehicle: Vehicle) => void;
  onEdit: (vehicle: Vehicle) => void;
  onDelete: (id: string) => void;
  onAssignDriver?: (vehicle: Vehicle) => void;
  onStatusChange?: (vehicleId: string, status: Vehicle['status']) => void;
}

const statusColors: Record<Vehicle['status'], string> = {
  available: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  in_transit: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  maintenance: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  inactive: 'bg-muted text-muted-foreground border-border',
};

const typeIcons: Record<Vehicle['type'], string> = {
  truck: '🚛',
  tanker: '⛽',
  trailer: '🚚',
  pickup: '🛻',
};

export const VehicleCard = ({ vehicle, onView, onEdit, onDelete, onAssignDriver, onStatusChange }: VehicleCardProps) => {
  const getExpiringDocs = () => {
    const now = new Date();
    const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const expiring: { label: string; days: number; expired: boolean }[] = [];
    
    const checkDoc = (name: string, dateStr?: string) => {
      if (!dateStr) return;
      try {
        const d = new Date(dateStr);
        if (!isNaN(d.getTime()) && d <= thirtyDays) {
          const days = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          expiring.push({ label: name, days, expired: days <= 0 });
        }
      } catch (e) {}
    };

    checkDoc('Insurance', vehicle.insuranceExpiry);
    checkDoc('Fitness', vehicle.fitnessExpiry);
    checkDoc('Permit', vehicle.permitExpiry);
    return expiring;
  };

  const expiringDocs = getExpiringDocs();

  return (
    <Card className="hover:shadow-lg transition-shadow border-border/50 bg-card">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="text-3xl">{typeIcons[vehicle.type] || '🚛'}</div>
            <div>
              <h3 className="font-bold text-lg text-foreground">{vehicle.registrationNo}</h3>
              <p className="text-sm text-muted-foreground">
                {vehicle.make} {vehicle.model}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {expiringDocs.length > 0 && (
              <AlertTriangle className="h-4 w-4 text-amber-500 animate-pulse" title={`${expiringDocs.length} expiring document(s)`} />
            )}
            <Badge className={statusColors[vehicle.status] || statusColors.available}>
              {vehicle.status.replace('_', ' ')}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onView(vehicle)}>
                  <Eye className="h-4 w-4 mr-2" />
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onEdit(vehicle)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Details
                </DropdownMenuItem>
                {onAssignDriver && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onAssignDriver(vehicle)}>
                      <UserPlus className="h-4 w-4 mr-2" />
                      {vehicle.currentDriver ? 'Change Driver' : 'Assign Driver'}
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => onDelete(vehicle.id)}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Expiring Documents Banner */}
        {expiringDocs.length > 0 && (
          <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-200/50 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
              Expiring Documents ({expiringDocs.length}):
            </div>
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {expiringDocs.map((doc, idx) => (
                <Badge 
                  key={idx} 
                  variant="outline" 
                  className={`text-[11px] py-0 px-2 font-medium ${
                    doc.expired 
                      ? 'bg-red-500/15 text-red-600 border-red-300' 
                      : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-300'
                  }`}
                >
                  {doc.label}: {doc.expired ? 'Expired' : `${doc.days}d left`}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Truck className="h-4 w-4" />
            <span>{vehicle.capacity} {vehicle.capacityUnit}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Fuel className="h-4 w-4" />
            <span>{vehicle.fuelType}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Gauge className="h-4 w-4" />
            <span>{(vehicle.odometer || 0).toLocaleString()} km</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>{vehicle.year}</span>
          </div>
        </div>

        {vehicle.currentDriver && (
          <div className="flex items-center gap-2 pt-2 border-t border-border">
            <User className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">{vehicle.currentDriver}</span>
          </div>
        )}

        {/* Quick Status Dropdown */}
        {onStatusChange && (
          <div className="pt-2 border-t border-border flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground font-medium whitespace-nowrap">Status:</span>
            <Select
              value={vehicle.status}
              onValueChange={(val: Vehicle['status']) => onStatusChange(vehicle.id, val)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Update Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="in_transit">In Transit</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-1">
          <Button 
            variant="outline" 
            size="sm"
            className="flex-1"
            onClick={() => onView(vehicle)}
          >
            <Eye className="h-4 w-4 mr-1.5" />
            View
          </Button>
          <Button 
            variant="secondary" 
            size="sm"
            className="flex-1"
            onClick={() => onEdit(vehicle)}
          >
            <Edit className="h-4 w-4 mr-1.5" />
            Edit
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
