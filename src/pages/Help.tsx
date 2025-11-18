import { useState } from "react";
import { PageLayout } from "@/components/PageLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Mail, MessageCircle, Search, HelpCircle, FileText, Send, CheckCircle2, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/auth/AuthProvider";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SEO } from "@/components/SEO";
import { format } from "date-fns";

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  helpful?: number;
}

const FAQ_CATEGORIES = [
  { value: "all", label: "All Questions" },
  { value: "getting-started", label: "Getting Started" },
  { value: "buying", label: "Buying" },
  { value: "selling", label: "Selling" },
  { value: "payments", label: "Payments & Payouts" },
  { value: "shipping", label: "Shipping & Delivery" },
  { value: "account", label: "Account & Security" },
  { value: "technical", label: "Technical Support" },
];

const FAQ_DATA: FAQItem[] = [
  // Getting Started
  {
    id: "1",
    question: "How do I create an account?",
    answer: "Click the 'Sign Up' button in the top right corner. Enter your email address, create a password, and provide your full name. You'll receive a verification email - click the link to verify your account.",
    category: "getting-started",
  },
  {
    id: "2",
    question: "Do I need to verify my email?",
    answer: "Yes, email verification is required to create listings and make purchases. This helps us maintain a secure marketplace and protect all users.",
    category: "getting-started",
  },
  {
    id: "3",
    question: "How do I start selling?",
    answer: "After creating an account and verifying your email, click 'Sell' in the navigation. Upload photos of your item, fill in the details, set your price, and publish your listing. You'll also need to complete seller onboarding to receive payments.",
    category: "getting-started",
  },
  // Buying
  {
    id: "4",
    question: "How do I buy an item?",
    answer: "Browse items or search for what you're looking for. Click on an item to view details, then click 'Buy Now' to proceed to checkout. Enter your shipping address and payment details to complete your purchase.",
    category: "buying",
  },
  {
    id: "5",
    question: "Can I make an offer on an item?",
    answer: "Yes! If a seller has enabled offers, you can click 'Make Offer' on the listing page. Enter your offer amount and message. The seller can accept, reject, or counter your offer.",
    category: "buying",
  },
  {
    id: "6",
    question: "What payment methods do you accept?",
    answer: "We accept all major credit and debit cards through our secure payment processor. All payments are processed securely and your payment information is never stored on our servers.",
    category: "buying",
  },
  {
    id: "7",
    question: "What is buyer protection?",
    answer: "Buyer protection is a small fee that covers you in case of issues with your order. If an item doesn't arrive, is significantly different from the description, or has other problems, we'll help resolve the issue or provide a refund.",
    category: "buying",
  },
  // Selling
  {
    id: "8",
    question: "How do I list an item for sale?",
    answer: "Go to the 'Sell' page, upload high-quality photos of your item, fill in all the details (title, description, category, condition, size, etc.), set your price, configure shipping options, and publish your listing.",
    category: "selling",
  },
  {
    id: "9",
    question: "What fees do sellers pay?",
    answer: "We charge a small commission on each sale to cover payment processing and platform costs. The exact fee depends on your seller tier and is clearly displayed before you publish a listing.",
    category: "selling",
  },
  {
    id: "10",
    question: "How do I receive payments?",
    answer: "Complete the seller onboarding process to set up your payment account. Once a buyer confirms delivery, your payout will be processed. Funds typically appear in your bank account within 1-3 business days.",
    category: "selling",
  },
  {
    id: "11",
    question: "Can I edit or delete my listing?",
    answer: "Yes, you can edit your listing at any time from your seller dashboard. You can also mark it as sold or delete it if it's no longer available.",
    category: "selling",
  },
  // Payments & Payouts
  {
    id: "12",
    question: "When will I receive my payout?",
    answer: "Payouts are processed after the buyer confirms delivery. Once confirmed, your funds move from 'Pending' to 'Available' balance. You can then withdraw funds, which typically arrive in 1-3 business days.",
    category: "payments",
  },
  {
    id: "13",
    question: "How do I set up payouts?",
    answer: "Go to your Seller Dashboard and click 'Start Onboarding' or navigate to Seller Account. Complete the Stripe Connect onboarding process by providing your business details and bank account information.",
    category: "payments",
  },
  {
    id: "14",
    question: "What payment information do I need?",
    answer: "You'll need to provide your business type (individual or company), personal details, address, and bank account information. All information is securely processed through Stripe Connect.",
    category: "payments",
  },
  // Shipping
  {
    id: "15",
    question: "How do I ship an item?",
    answer: "When you receive an order, you'll get a notification. Go to your Orders page, click on the order, and use the 'Ship Order' button. Enter the tracking number and carrier information.",
    category: "shipping",
  },
  {
    id: "16",
    question: "What shipping options are available?",
    answer: "Sellers can set shipping costs for UK, Europe, and International delivery. You can also offer free shipping. Estimated delivery times are displayed on each listing.",
    category: "shipping",
  },
  {
    id: "17",
    question: "What if my item doesn't arrive?",
    answer: "If your item hasn't arrived within the estimated delivery time, contact the seller first. If that doesn't resolve the issue, you can open a dispute through the Orders page. Our support team will help resolve the matter.",
    category: "shipping",
  },
  // Account & Security
  {
    id: "18",
    question: "How do I change my password?",
    answer: "Go to your account settings (click your profile icon in the top right). You can update your password, email address, and other account information there.",
    category: "account",
  },
  {
    id: "19",
    question: "How do I verify my identity?",
    answer: "Go to Seller Verification in your dashboard. You can request verification for email, phone, ID, and business. Complete verification helps build trust and unlock seller features.",
    category: "account",
  },
  {
    id: "20",
    question: "What are seller badges?",
    answer: "Seller badges are earned based on performance and verification. Badges like 'Verified Seller', 'Top Seller', and 'Fast Shipper' help buyers identify trusted sellers.",
    category: "account",
  },
  // Technical
  {
    id: "21",
    question: "The site isn't loading properly",
    answer: "Try refreshing the page, clearing your browser cache, or using a different browser. If the problem persists, contact our technical support team with details about what you're experiencing.",
    category: "technical",
  },
  {
    id: "22",
    question: "I can't upload photos",
    answer: "Make sure your photos are in JPG or PNG format and under 10MB each. Try using a different browser or device. If issues continue, contact support with details about the error message you're seeing.",
    category: "technical",
  },
  {
    id: "23",
    question: "How do I report a problem?",
    answer: "You can report issues through the Help Center contact form, or use the 'Report' button on listings or messages. For urgent issues, contact support directly through your account.",
    category: "technical",
  },
];

const Help = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [contactForm, setContactForm] = useState({
    subject: "",
    message: "",
    category: "other",
    email: user?.email || "",
  });

  const createTicketMutation = useMutation({
    mutationFn: async (data: {
      email: string;
      subject: string;
      message: string;
      category: string;
    }) => {
      const { data: ticket, error } = await supabase
        .from("support_tickets")
        .insert({
          user_id: user?.id || null,
          email: data.email,
          subject: data.subject,
          message: data.message,
          category: data.category,
          status: "open",
        })
        .select()
        .single();

      if (error) throw error;
      return ticket;
    },
    onSuccess: () => {
      toast({
        title: "Support ticket created",
        description: "We've received your message and will respond within 24 hours.",
      });
      setContactForm({
        subject: "",
        message: "",
        category: "other",
        email: user?.email || "",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create support ticket",
        variant: "destructive",
      });
    },
  });

  const { data: userTickets } = useQuery({
    queryKey: ["support-tickets", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      return data;
    },
  });

  const filteredFAQs = FAQ_DATA.filter((faq) => {
    const matchesCategory = selectedCategory === "all" || faq.category === selectedCategory;
    const matchesSearch =
      searchQuery === "" ||
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleSubmitContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactForm.email || !contactForm.subject || !contactForm.message) {
      toast({
        title: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }
    createTicketMutation.mutate(contactForm);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      open: { label: "Open", className: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
      in_progress: { label: "In Progress", className: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" },
      resolved: { label: "Resolved", className: "bg-green-500/10 text-green-500 border-green-500/20" },
      closed: { label: "Closed", className: "bg-gray-500/10 text-gray-500 border-gray-500/20" },
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.open;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  return (
    <PageLayout>
      <SEO
        title="Help Center - 6Seven"
        description="Get help with buying, selling, and using 6Seven. Find answers to frequently asked questions or contact our support team."
        keywords="help center, FAQ, support, customer service, 6Seven help"
      />
      <div className="max-w-6xl mx-auto py-12 px-4">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-light tracking-tight mb-4">Help Center</h1>
          <p className="text-lg text-muted-foreground">
            Find answers to common questions or contact our support team
          </p>
        </div>

        <Tabs defaultValue="faq" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="faq">FAQ</TabsTrigger>
            <TabsTrigger value="contact">Contact Support</TabsTrigger>
            {user && <TabsTrigger value="tickets">My Tickets</TabsTrigger>}
          </TabsList>

          {/* FAQ Tab */}
          <TabsContent value="faq" className="space-y-6">
            {/* Search */}
            <Card>
              <CardContent className="pt-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    placeholder="Search for answers..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Category Filter */}
            <div className="flex flex-wrap gap-2">
              {FAQ_CATEGORIES.map((cat) => (
                <Button
                  key={cat.value}
                  variant={selectedCategory === cat.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(cat.value)}
                >
                  {cat.label}
                </Button>
              ))}
            </div>

            {/* FAQ Results */}
            <Card>
              <CardHeader>
                <CardTitle>
                  {filteredFAQs.length} {filteredFAQs.length === 1 ? "Question" : "Questions"}
                  {selectedCategory !== "all" && ` in ${FAQ_CATEGORIES.find(c => c.value === selectedCategory)?.label}`}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {filteredFAQs.length > 0 ? (
                  <Accordion type="single" collapsible className="w-full">
                    {filteredFAQs.map((faq) => (
                      <AccordionItem key={faq.id} value={faq.id}>
                        <AccordionTrigger className="text-left">
                          {faq.question}
                        </AccordionTrigger>
                        <AccordionContent className="text-muted-foreground">
                          {faq.answer}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                ) : (
                  <div className="text-center py-12">
                    <HelpCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No questions found. Try a different search or category.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Contact Support Tab */}
          <TabsContent value="contact">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5" />
                  Contact Support
                </CardTitle>
                <CardDescription>
                  Can't find what you're looking for? Send us a message and we'll get back to you within 24 hours.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmitContact} className="space-y-4">
                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={contactForm.email}
                      onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                      required
                      disabled={!!user}
                    />
                    {user && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Using your account email: {user.email}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Select
                      value={contactForm.category}
                      onValueChange={(value) => setContactForm({ ...contactForm, category: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="account">Account Issues</SelectItem>
                        <SelectItem value="payment">Payment & Payouts</SelectItem>
                        <SelectItem value="shipping">Shipping & Delivery</SelectItem>
                        <SelectItem value="listing">Listing Questions</SelectItem>
                        <SelectItem value="technical">Technical Support</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="subject">Subject</Label>
                    <Input
                      id="subject"
                      value={contactForm.subject}
                      onChange={(e) => setContactForm({ ...contactForm, subject: e.target.value })}
                      placeholder="Brief description of your issue"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="message">Message</Label>
                    <Textarea
                      id="message"
                      value={contactForm.message}
                      onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                      placeholder="Please provide as much detail as possible..."
                      rows={6}
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={createTicketMutation.isPending}
                    className="w-full"
                  >
                    {createTicketMutation.isPending ? (
                      <>
                        <Clock className="h-4 w-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Send Message
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* My Tickets Tab */}
          {user && (
            <TabsContent value="tickets">
              <Card>
                <CardHeader>
                  <CardTitle>My Support Tickets</CardTitle>
                  <CardDescription>
                    View and manage your support requests
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {userTickets && userTickets.length > 0 ? (
                    <div className="space-y-4">
                      {userTickets.map((ticket: any) => (
                        <div
                          key={ticket.id}
                          className="border rounded-lg p-4 space-y-2"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-medium">{ticket.subject}</h3>
                                {getStatusBadge(ticket.status)}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {ticket.message.substring(0, 150)}
                                {ticket.message.length > 150 && "..."}
                              </p>
                              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                <span>Category: {ticket.category}</span>
                                <span>
                                  Created: {format(new Date(ticket.created_at), "MMM d, yyyy")}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No support tickets yet</p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Use the Contact Support tab to create a new ticket
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </PageLayout>
  );
};

export default Help;
