import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Driver } from "@/types/driver";
import { 
  User, 
  Phone, 
  Star, 
  MapPin, 
  Truck, 
  Eye, 
  Edit, 
  Trash2,
  AlertTriangle,
  Calendar,
  Link
} from "lucide-react";
import { format, differenceInDays } from "date-fns";

interface DriverCardProps {
  driver: Driver;
  onView: (driver: Driver) => void;
  onEdit: (driver: Driver) => void;
  onDelete: (id: string) => void;
  onAssignVehicle?: (driver: Driver) => void;
}

const statusConfig = {
  available: { label: 'Available', variant: 'default' as const, className: 'bg-green-500/10 text-green-600 border-green-200' },
  on_trip: { label: 'On Trip', variant: 'secondary' as const, className: 'bg-blue-500/10 text-blue-600 border-blue-200' },
  on_leave: { label: 'On Leave', variant: 'outline' as const, className: 'bg-amber-500/10 text-amber-600 border-amber-200' },
  suspended: { label: 'Suspended', variant: 'destructive' as const, className: 'bg-red-500/10 text-red-600 border-red-200' },
  inactive: { label: 'Inactive', variant: 'outline' as const, className: 'bg-muted text-muted-foreground' },
};

const licenseStatusConfig = {
  valid: { label: 'Valid', className: 'bg-green-500/10 text-green-600' },
  expiring_soon: { label: 'Expiring Soon', className: 'bg-amber-500/10 text-amber-600' },
  expired: { label: 'Expired', className: 'bg-red-500/10 text-red-600' },
  suspended: { label: 'Suspended', className: 'bg-red-500/10 text-red-600' },
};

const safeFormatDate = (dateVal: any, fmt: string, fallback = '—') => {
  if (!dateVal) return fallback;
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return fallback;
    return format(d, fmt);
  } catch (e) {
    return fallback;
  }
};

export function DriverCard({ driver, onView, onEdit, onDelete, onAssignVehicle }: DriverCardProps) {
  const statusInfo = statusConfig[driver.status] || statusConfig.available;
  const licenseStatus = driver.license?.status || 'valid';
  const licenseStatusInfo = licenseStatusConfig[licenseStatus] || licenseStatusConfig.valid;

  let daysUntilExpiry = 999;
  if (driver.license?.expiryDate) {
    try {
      const expD = new Date(driver.license.expiryDate);
      if (!isNaN(expD.getTime())) {
        daysUntilExpiry = differenceInDays(expD, new Date());
      }
    } catch (e) {}
  }

  const isExpiringSoon = licenseStatus === 'expiring_soon' || (daysUntilExpiry <= 30 && daysUntilExpiry >= 0);

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{driver.name || 'Unnamed Driver'}</h3>
              <p className="text-sm text-muted-foreground">{driver.employeeId || 'ID Pending'}</p>
            </div>
          </div>
          <Badge className={statusInfo.className}>
            {statusInfo.label}
          </Badge>
        </div>

        <div className="space-y-3 mb-4">
          <div className="flex items-center gap-2 text-sm">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span className="text-foreground">{driver.phone || 'No phone'}</span>
          </div>
          
          {driver.assignedVehicle && (
            <div className="flex items-center gap-2 text-sm">
              <Truck className="h-4 w-4 text-muted-foreground" />
              <span className="text-foreground">{driver.assignedVehicle}</span>
            </div>
          )}
          
          <div className="flex items-center gap-2 text-sm">
            <Star className="h-4 w-4 text-amber-500" />
            <span className="text-foreground">{(driver.rating || 5).toFixed(1)}</span>
            <span className="text-muted-foreground">• {driver.totalTrips || 0} trips</span>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">{((driver.totalDistance || 0) / 1000).toFixed(1)}k km covered</span>
          </div>
        </div>

        {/* License Status */}
        <div className="p-3 rounded-lg bg-muted/50 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground">License</span>
            <Badge variant="outline" className={licenseStatusInfo.className}>
              {isExpiringSoon ? 'Expiring Soon' : licenseStatusInfo.label}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">{driver.license?.type || 'HMV'}</span>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span>Exp: {safeFormatDate(driver.license?.expiryDate, 'MMM yyyy')}</span>
            </div>
          </div>
          {isExpiringSoon && (
            <div className="flex items-center gap-1 mt-2 text-xs text-amber-600">
              <AlertTriangle className="h-3 w-3" />
              <span>Expires in {daysUntilExpiry > 0 ? `${daysUntilExpiry} days` : 'today'}</span>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={() => onView(driver)}>
            <Eye className="h-4 w-4 mr-1" />
            View
          </Button>
          <Button variant="outline" size="sm" className="flex-1" onClick={() => onEdit(driver)}>
            <Edit className="h-4 w-4 mr-1" />
            Edit
          </Button>
          {onAssignVehicle && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => onAssignVehicle(driver)}
              disabled={driver.status === 'on_trip'}
              title={driver.assignedVehicle ? 'Change Vehicle' : 'Assign Vehicle'}
            >
              <Link className="h-4 w-4" />
            </Button>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => onDelete(driver.id)}
            disabled={driver.status === 'on_trip'}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
