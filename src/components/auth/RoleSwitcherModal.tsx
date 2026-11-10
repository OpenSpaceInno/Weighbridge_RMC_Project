import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuth, DEMO_USERS } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { Shield, Check, ArrowRight } from 'lucide-react';

interface RoleSwitcherModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const RoleSwitcherModal: React.FC<RoleSwitcherModalProps> = ({ open, onOpenChange }) => {
  const { user, switchUser, isLoading } = useAuth();

  const handleSelect = async (username: string) => {
    await switchUser(username);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary">
            <Shield className="h-5 w-5" />
            <DialogTitle className="text-xl">Plant Persona & RBAC Switcher</DialogTitle>
          </div>
          <DialogDescription>
            Select any operational role below to immediately test the system under that persona's permission profile and route access rules.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 py-2">
          {DEMO_USERS.map((demo) => {
            const isCurrent = user?.username === demo.username;
            return (
              <div
                key={demo.username}
                onClick={() => !isCurrent && !isLoading && handleSelect(demo.username)}
                className={`p-3.5 rounded-lg border transition-all cursor-pointer flex flex-col justify-between ${
                  isCurrent
                    ? 'border-primary bg-primary/10 shadow-sm'
                    : 'border-border hover:border-primary/50 hover:bg-muted/50'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-semibold text-sm text-foreground">{demo.name}</span>
                    {isCurrent ? (
                      <Badge className="bg-primary text-primary-foreground text-[10px] h-5 px-1.5 flex items-center gap-1">
                        <Check className="h-3 w-3" /> Active
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground flex items-center gap-1 group-hover:text-primary">
                        Switch <ArrowRight className="h-3 w-3" />
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-medium text-primary mb-1">
                    {demo.roleName}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {demo.department}
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-border/50 flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                  <span>Username: {demo.username}</span>
                  <Badge variant="outline" className="text-[10px] py-0">
                    Role: {demo.roleId}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
};

