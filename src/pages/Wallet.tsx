import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Wallet as WalletIcon, Plus, ArrowUpRight, ArrowDownLeft, CreditCard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";

interface Transaction {
  id: string;
  type: "credit" | "debit";
  amount: number;
  description: string;
  date: string;
}

const Wallet = () => {
  const [session, setSession] = useState(null);
  const [balance, setBalance] = useState(450);
  const [transactions, setTransactions] = useState<Transaction[]>([
    {
      id: "1",
      type: "debit",
      amount: 60,
      description: "Metro - Central to Airport",
      date: "2025-11-28",
    },
    {
      id: "2",
      type: "credit",
      amount: 500,
      description: "Wallet Recharge",
      date: "2025-11-27",
    },
    {
      id: "3",
      type: "debit",
      amount: 20,
      description: "Bus - T.Nagar to Guindy",
      date: "2025-11-27",
    },
  ]);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (!session) navigate("/auth");
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) navigate("/auth");
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleAddMoney = () => {
    toast({
      title: "Add Money",
      description: "Payment gateway integration coming soon!",
    });
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
          <header className="border-b border-border/50 backdrop-blur-sm bg-card/80 sticky top-0 z-10">
            <div className="container mx-auto px-4 py-4">
              <div className="flex items-center gap-3">
                <SidebarTrigger />
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <WalletIcon className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-foreground">Wallet</h1>
                    <p className="text-sm text-muted-foreground">Manage your transit wallet</p>
                  </div>
                </div>
              </div>
            </div>
          </header>

          <main className="container mx-auto px-4 py-8">
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Balance Card */}
              <Card className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground">
                <CardHeader>
                  <CardDescription className="text-primary-foreground/80">
                    Available Balance
                  </CardDescription>
                  <CardTitle className="text-4xl font-bold">₹{balance}</CardTitle>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={handleAddMoney}
                    variant="secondary"
                    className="w-full"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Money
                  </Button>
                </CardContent>
              </Card>

              {/* Payment Methods */}
              <Card>
                <CardHeader>
                  <CardTitle>Payment Methods</CardTitle>
                  <CardDescription>Manage your saved payment options</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <CreditCard className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">•••• 4242</p>
                        <p className="text-xs text-muted-foreground">Expires 12/26</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">Remove</Button>
                  </div>
                  <Button variant="outline" className="w-full">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Payment Method
                  </Button>
                </CardContent>
              </Card>

              {/* Transactions */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Transactions</CardTitle>
                  <CardDescription>Your wallet activity</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {transactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-full ${
                            transaction.type === "credit"
                              ? "bg-green-100 dark:bg-green-900"
                              : "bg-red-100 dark:bg-red-900"
                          }`}
                        >
                          {transaction.type === "credit" ? (
                            <ArrowDownLeft className="w-4 h-4 text-green-600 dark:text-green-400" />
                          ) : (
                            <ArrowUpRight className="w-4 h-4 text-red-600 dark:text-red-400" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{transaction.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(transaction.date).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </p>
                        </div>
                      </div>
                      <p
                        className={`font-semibold ${
                          transaction.type === "credit"
                            ? "text-green-600 dark:text-green-400"
                            : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        {transaction.type === "credit" ? "+" : "-"}₹{transaction.amount}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default Wallet;
