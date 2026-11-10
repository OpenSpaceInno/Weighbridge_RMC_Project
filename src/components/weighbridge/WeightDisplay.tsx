import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Scale, TrendingUp } from "lucide-react";
import { WeightReading } from "@/types/weighbridge";

interface WeightDisplayProps {
  reading: WeightReading;
  label?: string;
}

const WeightDisplay = ({ reading, label = "Current Weight" }: WeightDisplayProps) => {
  const displayWeight = (reading.weight / 1000).toFixed(2); // Convert to tons
  
  return (
    <Card className="border-2">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Scale className="h-5 w-5 text-primary" />
            {label}
          </CardTitle>
          <Badge 
            variant={reading.stable ? "default" : "secondary"}
            className="gap-1"
          >
            {reading.stable ? (
              "Stable"
            ) : (
              <>
                <TrendingUp className="h-3 w-3" />
                Stabilizing
              </>
            )}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="text-center">
            <div className="text-5xl font-bold text-primary tabular-nums">
              {displayWeight}
            </div>
            <div className="text-xl text-muted-foreground mt-1">
              tons
            </div>
          </div>
          <div className="text-center text-sm text-muted-foreground">
            ({reading.weight.toLocaleString()} kg)
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default WeightDisplay;
