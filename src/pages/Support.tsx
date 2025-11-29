import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { HeadphonesIcon, MessageCircle, Phone, Mail, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const faqs = [
  {
    question: "How do I book a metro ticket?",
    answer: "You can book metro tickets through our app by selecting Metro as your transport mode, choosing your route, and completing the payment through your wallet or UPI.",
  },
  {
    question: "What payment methods are accepted?",
    answer: "We accept UPI, Credit/Debit Cards, Net Banking, and Wallet payments. You can also add money to your Chennai Transit Wallet for faster checkouts.",
  },
  {
    question: "How do I get a refund?",
    answer: "Refunds are processed within 5-7 business days. You can request a refund from the 'My Trips' section by selecting the trip and clicking 'Request Refund'.",
  },
  {
    question: "Can I save my favorite routes?",
    answer: "Yes! Use the 'Saved Places' feature to save your home, work, and frequently visited locations for quick route planning.",
  },
];

const Support = () => {
  const [session, setSession] = useState(null);
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Message Sent!",
      description: "Our support team will get back to you within 24 hours.",
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
                    <HeadphonesIcon className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-foreground">Help & Support</h1>
                    <p className="text-sm text-muted-foreground">We're here to help you</p>
                  </div>
                </div>
              </div>
            </div>
          </header>

          <main className="container mx-auto px-4 py-8">
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Quick Actions */}
              <div className="grid md:grid-cols-3 gap-4">
                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardContent className="flex flex-col items-center justify-center p-6 text-center">
                    <MessageCircle className="w-10 h-10 mb-3 text-primary" />
                    <h3 className="font-semibold mb-1">Live Chat</h3>
                    <p className="text-xs text-muted-foreground">Chat with our support team</p>
                  </CardContent>
                </Card>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardContent className="flex flex-col items-center justify-center p-6 text-center">
                    <Phone className="w-10 h-10 mb-3 text-primary" />
                    <h3 className="font-semibold mb-1">Call Us</h3>
                    <p className="text-xs text-muted-foreground">1800-123-4567</p>
                  </CardContent>
                </Card>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardContent className="flex flex-col items-center justify-center p-6 text-center">
                    <Mail className="w-10 h-10 mb-3 text-primary" />
                    <h3 className="font-semibold mb-1">Email</h3>
                    <p className="text-xs text-muted-foreground">support@chennaittransit.com</p>
                  </CardContent>
                </Card>
              </div>

              {/* FAQs */}
              <Card>
                <CardHeader>
                  <CardTitle>Frequently Asked Questions</CardTitle>
                  <CardDescription>Quick answers to common questions</CardDescription>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible>
                    {faqs.map((faq, index) => (
                      <AccordionItem key={index} value={`item-${index}`}>
                        <AccordionTrigger>{faq.question}</AccordionTrigger>
                        <AccordionContent>{faq.answer}</AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>

              {/* Contact Form */}
              <Card>
                <CardHeader>
                  <CardTitle>Send us a message</CardTitle>
                  <CardDescription>We'll get back to you within 24 hours</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="subject">Subject</Label>
                      <Input id="subject" placeholder="What do you need help with?" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="message">Message</Label>
                      <Textarea
                        id="message"
                        placeholder="Describe your issue in detail..."
                        rows={5}
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full">Send Message</Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default Support;
