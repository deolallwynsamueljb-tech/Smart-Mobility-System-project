import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, DollarSign, Shuffle, Check, TrendingUp } from "lucide-react";
import { useState } from "react";

interface RouteOption {
  type: 'fastest' | 'cheapest' | 'fewest-transfers';
  route: any[];
  totalDuration: number;
  totalDistance: number;
  originCoords?: [number, number];
  destCoords?: [number, number];
  fare: {
    breakdown: any[];
    total: number;
    currency: string;
  };
  transferCount: number;
}

interface RouteAlternativesProps {
  alternatives: RouteOption[];
  onSelectRoute: (route: RouteOption) => void;
}

export const RouteAlternatives = ({ alternatives, onSelectRoute }: RouteAlternativesProps) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const getOptionIcon = (type: string) => {
    switch (type) {
      case 'fastest':
        return <Clock className="w-5 h-5" />;
      case 'cheapest':
        return <DollarSign className="w-5 h-5" />;
      case 'fewest-transfers':
        return <Shuffle className="w-5 h-5" />;
      default:
        return <TrendingUp className="w-5 h-5" />;
    }
  };

  const getOptionTitle = (type: string) => {
    switch (type) {
      case 'fastest':
        return 'Fastest Route';
      case 'cheapest':
        return 'Cheapest Route';
      case 'fewest-transfers':
        return 'Fewest Transfers';
      default:
        return 'Route';
    }
  };

  const getOptionDescription = (type: string) => {
    switch (type) {
      case 'fastest':
        return 'Optimized for minimum travel time';
      case 'cheapest':
        return 'Optimized for lowest fare';
      case 'fewest-transfers':
        return 'Optimized for fewer changes';
      default:
        return '';
    }
  };

  const handleSelectRoute = (index: number) => {
    setSelectedIndex(index);
    onSelectRoute(alternatives[index]);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Compare Routes</h3>
        <Badge variant="outline">{alternatives.length} Options</Badge>
      </div>

      <div className="grid gap-3">
        {alternatives.map((option, index) => (
          <Card
            key={index}
            className={`p-4 cursor-pointer transition-all duration-200 hover:shadow-md ${
              selectedIndex === index
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50'
            }`}
            onClick={() => handleSelectRoute(index)}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 flex-1">
                <div className={`p-2 rounded-lg ${
                  selectedIndex === index ? 'bg-primary/20' : 'bg-muted'
                }`}>
                  {getOptionIcon(option.type)}
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-foreground">{getOptionTitle(option.type)}</h4>
                    {selectedIndex === index && (
                      <Badge variant="default" className="text-xs">
                        <Check className="w-3 h-3 mr-1" />
                        Selected
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{getOptionDescription(option.type)}</p>
                  
                  {/* Key Metrics */}
                  <div className="flex flex-wrap gap-4 mt-3">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-foreground">{option.totalDuration} min</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-foreground">₹{option.fare.total}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Shuffle className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-foreground">
                        {option.transferCount} {option.transferCount === 1 ? 'transfer' : 'transfers'}
                      </span>
                    </div>
                  </div>

                  {/* Mode badges */}
                  <div className="flex flex-wrap gap-2 mt-2">
                    {Array.from(new Set(option.route.map(seg => seg.mode)))
                      .filter(mode => mode !== 'walk')
                      .map(mode => (
                        <Badge
                          key={mode}
                          variant="secondary"
                          className="text-xs capitalize"
                        >
                          {mode}
                        </Badge>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Button
        onClick={() => onSelectRoute(alternatives[selectedIndex])}
        className="w-full"
        size="lg"
      >
        Continue with {getOptionTitle(alternatives[selectedIndex].type)}
      </Button>
    </div>
  );
};
