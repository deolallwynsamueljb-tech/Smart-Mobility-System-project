import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { IndianRupee, CreditCard, Wallet } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface FareBreakdownItem {
  mode: string;
  amount: number;
  description: string;
}

interface FareBreakdownProps {
  breakdown: FareBreakdownItem[];
  total: number;
  currency: string;
}

export const FareBreakdown = ({ breakdown, total, currency }: FareBreakdownProps) => {
  const { toast } = useToast();

  const handlePayment = () => {
    toast({
      title: "Payment Coming Soon",
      description: "Integrated payment gateway will be available soon for seamless ticket booking.",
    });
  };

  const getModeColor = (mode: string) => {
    switch (mode.toLowerCase()) {
      case 'metro': return 'bg-metro/10 text-metro border-metro/20';
      case 'train': return 'bg-train/10 text-train border-train/20';
      case 'bus': return 'bg-bus/10 text-bus border-bus/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Card className="p-6 backdrop-blur-sm bg-card/95 border-border/50">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <IndianRupee className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-bold text-foreground">Fare Breakdown</h3>
        </div>

        <div className="space-y-3">
          {breakdown.map((item, index) => (
            <div key={index} className="space-y-2">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className={getModeColor(item.mode)}>
                      {item.mode}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
                <div className="flex items-center gap-1 font-semibold text-foreground">
                  <IndianRupee className="w-4 h-4" />
                  <span>{item.amount}</span>
                </div>
              </div>
              {index < breakdown.length - 1 && <Separator />}
            </div>
          ))}
        </div>

        <Separator className="my-4" />

        <div className="flex items-center justify-between text-lg font-bold">
          <span className="text-foreground">Total Fare</span>
          <div className="flex items-center gap-1 text-primary">
            <IndianRupee className="w-5 h-5" />
            <span>{total}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-4">
          <Button
            variant="outline"
            className="gap-2"
            onClick={handlePayment}
          >
            <Wallet className="w-4 h-4" />
            Wallet
          </Button>
          <Button
            className="gap-2"
            onClick={handlePayment}
          >
            <CreditCard className="w-4 h-4" />
            Pay Now
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-3">
          Fares are approximate and may vary based on actual route and time of travel
        </p>
      </div>
    </Card>
  );
};
