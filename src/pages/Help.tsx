import { PageLayout } from "@/components/PageLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Mail, MessageCircle, Search } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { SEO } from "@/components/SEO";

const Help = () => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [contactForm, setContactForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const faqCategories = [
    {
      title: "Getting Started",
      items: [
        {
          question: "How do I create an account?",
          answer: "Click the 'Sign Up' button in the top right corner. You can sign up with your email address. After registration, you'll receive a verification email. Once verified, you can start buying and selling on 6Seven."
        },
        {
          question: "Do I need to verify my email?",
          answer: "Yes, email verification is required to ensure account security and prevent fraud. Check your inbox for the verification email after signing up. If you don't receive it, check your spam folder or request a new verification email from your account settings."
        },
        {
          question: "How do I start selling?",
          answer: "Click 'Sell an Item' in the navigation menu or go to /sell. Fill out the listing form with item details, photos, and pricing. Once published, your item will be visible to buyers. Make sure to complete seller onboarding to receive payments."
        },
        {
          question: "What can I sell on 6Seven?",
          answer: "You can sell a wide variety of items including fashion, electronics, collectibles, books, games, and more. However, we prohibit illegal items, weapons, drugs, stolen goods, and items that infringe on intellectual property. See our Terms of Service for the complete list of prohibited items."
        }
      ]
    },
    {
      title: "Buying",
      items: [
        {
          question: "How do I purchase an item?",
          answer: "Browse listings or use our search features to find items you like. Click on a listing to view details, then click 'Buy Now' or make an offer. Complete the checkout process with your payment information. Once payment is confirmed, the seller will ship your item."
        },
        {
          question: "What payment methods do you accept?",
          answer: "We accept all major credit and debit cards through Stripe. Payments are processed securely and your card information is never stored on our servers. We use Stripe's secure payment processing."
        },
        {
          question: "How do I track my order?",
          answer: "Once the seller ships your order, you'll receive a notification with tracking information. You can also view tracking details in your Orders page. When your item arrives, mark it as delivered to complete the transaction."
        },
        {
          question: "What if I receive a damaged or incorrect item?",
          answer: "Contact the seller immediately through the Platform's messaging system. If you cannot resolve the issue, you can open a dispute through our dispute resolution system. We'll review your case and help resolve it. See our Return Policy for more details."
        },
        {
          question: "Can I cancel an order?",
          answer: "You can cancel an order before the seller ships it. Once an item has been shipped, you'll need to wait for delivery and follow the return process if needed. Go to your Orders page to cancel eligible orders."
        }
      ]
    },
    {
      title: "Selling",
      items: [
        {
          question: "How do I receive payments?",
          answer: "Complete the seller onboarding process which includes Stripe Connect setup. Once your account is verified and you've completed onboarding, payments will be automatically processed to your bank account when buyers confirm delivery."
        },
        {
          question: "What fees do you charge?",
          answer: "We charge a transaction fee on completed sales. The fee varies based on your seller risk tier and is calculated before you create a listing. Fees are clearly displayed during the listing process. See our Terms of Service for detailed fee information."
        },
        {
          question: "How long does it take to receive payment?",
          answer: "Payments are processed automatically when the buyer confirms delivery. Once confirmed, funds are transferred to your Stripe Connect account. Processing time may vary, but typically takes 1-3 business days to appear in your bank account."
        },
        {
          question: "What should I include in my listing?",
          answer: "Include clear, high-quality photos from multiple angles, an accurate description including condition, size, brand, and any defects. Be honest about the item's condition - this builds trust and reduces disputes. Use our AI copilot for listing optimization suggestions."
        },
        {
          question: "How do I ship items?",
          answer: "Once an order is placed, you'll receive a notification. Package the item securely and ship it using the buyer's provided address. Update the order status with tracking information. We recommend using tracked shipping for protection."
        }
      ]
    },
    {
      title: "Offers & Negotiations",
      items: [
        {
          question: "How do offers work?",
          answer: "Buyers can make offers on listings. Sellers can accept, reject, or counter the offer. Offers expire after 48 hours if not responded to. Once accepted, the buyer completes payment and the order is processed."
        },
        {
          question: "Can I make multiple offers?",
          answer: "You can make offers on multiple different listings, but only one active offer per listing at a time. If your offer is rejected or expires, you can make a new offer."
        },
        {
          question: "What happens if my offer expires?",
          answer: "If an offer expires without a response, it's automatically cancelled. You can make a new offer if the listing is still available. The seller may also reach out to negotiate."
        }
      ]
    },
    {
      title: "Account & Security",
      items: [
        {
          question: "How do I change my password?",
          answer: "Go to your account settings and click on 'Change Password'. Enter your current password and your new password. Make sure your new password is strong and unique."
        },
        {
          question: "What if I forget my password?",
          answer: "Click 'Forgot Password' on the login page. Enter your email address and you'll receive instructions to reset your password. Check your spam folder if you don't see the email."
        },
        {
          question: "How do I delete my account?",
          answer: "Contact support@6seven.ai to request account deletion. We'll process your request within 30 days. Note that some information may be retained for legal and tax purposes as required by law."
        },
        {
          question: "Is my payment information secure?",
          answer: "Yes, we use Stripe for all payment processing. Your payment card information is never stored on our servers. Stripe is PCI DSS compliant and uses industry-standard encryption."
        }
      ]
    },
    {
      title: "Disputes & Returns",
      items: [
        {
          question: "How do I open a dispute?",
          answer: "Go to your Orders page, find the order in question, and click 'Open Dispute'. Provide photos and a detailed description of the issue. Our dispute resolution team will review your case and make a decision."
        },
        {
          question: "How long does dispute resolution take?",
          answer: "Most disputes are resolved within 5-7 business days. Complex cases may take longer. You'll be notified of the decision via email and in-app notification."
        },
        {
          question: "What is your return policy?",
          answer: "You have 14 days from delivery to request a return for items that are not as described, damaged, or defective. See our Return Policy page for complete details on eligibility, process, and refund timelines."
        },
        {
          question: "Who pays for return shipping?",
          answer: "If the item is not as described, damaged, or defective, the seller pays return shipping. If you're returning for other reasons, you're responsible for return shipping costs."
        }
      ]
    }
  ];

  const filteredFAQs = faqCategories.map(category => ({
    ...category,
    items: category.items.filter(item =>
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(category => category.items.length > 0);

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // In a real implementation, this would send to your support system
    // For now, we'll just show a success message
    setTimeout(() => {
      toast({
        title: "Message Sent",
        description: "We'll get back to you within 24-48 hours.",
      });
      setContactForm({ name: "", email: "", subject: "", message: "" });
      setIsSubmitting(false);
    }, 1000);
  };

  return (
    <PageLayout>
      <SEO
        title="Help Center - 6Seven"
        description="Get help with buying, selling, and using 6Seven. Find answers to frequently asked questions or contact our support team."
        keywords="help center, FAQ, support, customer service, 6Seven help"
      />
      <div className="max-w-6xl mx-auto py-12 px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-light tracking-tight mb-4">Help Center</h1>
          <p className="text-lg text-muted-foreground mb-8">
            Find answers to common questions or contact our support team
          </p>

          {/* Search */}
          <div className="max-w-2xl mx-auto relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search for help..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* FAQ Sections */}
        {filteredFAQs.length > 0 ? (
          <div className="space-y-8 mb-12">
            {filteredFAQs.map((category, categoryIndex) => (
              <Card key={categoryIndex}>
                <CardHeader>
                  <CardTitle>{category.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="w-full">
                    {category.items.map((item, itemIndex) => (
                      <AccordionItem key={itemIndex} value={`item-${categoryIndex}-${itemIndex}`}>
                        <AccordionTrigger className="text-left">
                          {item.question}
                        </AccordionTrigger>
                        <AccordionContent className="text-muted-foreground">
                          {item.answer}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : searchQuery ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No results found for "{searchQuery}"</p>
              <Button
                variant="outline"
                onClick={() => setSearchQuery("")}
                className="mt-4"
              >
                Clear Search
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {/* Contact Support */}
        <Card>
          <CardHeader>
            <CardTitle>Still Need Help?</CardTitle>
            <CardDescription>
              Can't find what you're looking for? Contact our support team and we'll get back to you as soon as possible.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleContactSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    placeholder="Your name"
                    value={contactForm.name}
                    onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={contactForm.email}
                    onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  placeholder="What can we help you with?"
                  value={contactForm.subject}
                  onChange={(e) => setContactForm({ ...contactForm, subject: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  placeholder="Tell us more about your question or issue..."
                  rows={6}
                  value={contactForm.message}
                  onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                  required
                />
              </div>
              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? (
                  <>
                    <MessageCircle className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Send Message
                  </>
                )}
              </Button>
            </form>

            <div className="mt-8 pt-8 border-t grid gap-4 md:grid-cols-2">
              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email Support
                </h3>
                <p className="text-sm text-muted-foreground">
                  <a href="mailto:support@6seven.ai" className="hover:text-foreground">
                    support@6seven.ai
                  </a>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Response time: 24-48 hours
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <MessageCircle className="h-4 w-4" />
                  Quick Links
                </h3>
                <div className="text-sm space-y-1">
                  <a href="/terms" className="block text-muted-foreground hover:text-foreground">
                    Terms of Service
                  </a>
                  <a href="/privacy" className="block text-muted-foreground hover:text-foreground">
                    Privacy Policy
                  </a>
                  <a href="/returns" className="block text-muted-foreground hover:text-foreground">
                    Return Policy
                  </a>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
};

export default Help;
