import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { FeeCalculator } from "@/components/FeeCalculator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Shield,
  CreditCard,
  Percent,
  Check,
  X,
  HelpCircle,
  ArrowRight,
  Zap,
  PiggyBank,
  Users,
  Wallet,
  Sparkles,
  Clock,
  Gift
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function Pricing() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="pt-20 pb-16">
        {/* Hero Section */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-background" />
          <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
            <div className="text-center max-w-3xl mx-auto">
              <Badge variant="secondary" className="mb-4">
                Simple & Transparent
              </Badge>
              <h1 className="text-4xl md:text-5xl font-light tracking-tight text-foreground mb-6">
                Fair Fees for Everyone
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground font-light">
                Sell your cards for less. No hidden fees. No monthly subscriptions.
                <br />
                Both buyers and sellers pay a small fee — that's it.
              </p>
            </div>
          </div>
        </section>
        
        {/* How It Works - Plain English */}
        <section className="py-16 bg-muted/30">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl md:text-3xl font-light text-center mb-12 tracking-tight">
              How Our Fees Work
            </h2>
            
            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {/* Buyer Fees */}
              <Card className="border-blue-200 dark:border-blue-800">
                <CardHeader className="bg-blue-50 dark:bg-blue-950/30">
                  <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                    <Shield className="h-5 w-5" />
                    For Buyers
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  <p className="text-muted-foreground">
                    When you buy an item, you pay a small <strong>Buyer Protection Fee</strong>:
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                        <span className="text-blue-700 dark:text-blue-300 text-sm font-medium">1</span>
                      </div>
                      <div>
                        <p className="font-medium">Items under £20</p>
                        <p className="text-sm text-muted-foreground">Just 40p flat fee</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                        <span className="text-blue-700 dark:text-blue-300 text-sm font-medium">2</span>
                      </div>
                      <div>
                        <p className="font-medium">Items over £20</p>
                        <p className="text-sm text-muted-foreground">40p + 1% of amount over £20</p>
                      </div>
                    </div>
                  </div>
                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground">
                      <strong>This covers:</strong> Secure payments, buyer protection, and platform support.
                    </p>
                  </div>
                </CardContent>
              </Card>
              
              {/* Seller Fees */}
              <Card className="border-green-200 dark:border-green-800">
                <CardHeader className="bg-green-50 dark:bg-green-950/30">
                  <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-300">
                    <CreditCard className="h-5 w-5" />
                    For Sellers
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  <p className="text-muted-foreground">
                    When your item sells, we take a small <strong>Transaction Fee</strong>:
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                        <span className="text-green-700 dark:text-green-300 text-sm font-medium">1</span>
                      </div>
                      <div>
                        <p className="font-medium">Items under £20</p>
                        <p className="text-sm text-muted-foreground">Just 40p flat fee</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                        <span className="text-green-700 dark:text-green-300 text-sm font-medium">2</span>
                      </div>
                      <div>
                        <p className="font-medium">Items over £20</p>
                        <p className="text-sm text-muted-foreground">40p + 1% of amount over £20</p>
                      </div>
                    </div>
                  </div>
                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <strong>Only pay when you sell.</strong> Listing is always free.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Wallet Section */}
        <section className="py-16">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <Badge variant="secondary" className="mb-4 bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                <Sparkles className="h-3 w-3 mr-1" />
                Save Even More
              </Badge>
              <h2 className="text-2xl md:text-3xl font-light tracking-tight mb-4">
                6Seven Wallet
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Add funds to your wallet and enjoy <strong>zero buyer fees</strong> on every purchase.
                It's the smartest way to buy on 6Seven.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mb-12">
              {/* No Buyer Fees */}
              <Card className="border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-50 to-background dark:from-amber-950/20">
                <CardContent className="pt-6">
                  <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center mb-4">
                    <Wallet className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                  </div>
                  <h3 className="font-medium text-lg mb-2">No Buyer Fees</h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    When you pay with wallet balance, you pay <strong>£0 in buyer fees</strong>.
                    The item price is exactly what you pay.
                  </p>
                  <div className="p-3 bg-background rounded-lg border">
                    <p className="text-xs text-muted-foreground">Card: £10 item = <span className="line-through">£10.40</span></p>
                    <p className="text-sm font-medium text-amber-600">Wallet: £10 item = £10.00</p>
                  </div>
                </CardContent>
              </Card>

              {/* Deposit Bonuses */}
              <Card className="border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-50 to-background dark:from-amber-950/20">
                <CardContent className="pt-6">
                  <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center mb-4">
                    <Gift className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                  </div>
                  <h3 className="font-medium text-lg mb-2">Deposit Bonuses</h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    Get extra credit when you add funds to your wallet. The more you deposit, the more you get.
                  </p>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm p-2 bg-background rounded border">
                      <span>Deposit £50</span>
                      <span className="font-medium text-green-600">Get £51 (+2%)</span>
                    </div>
                    <div className="flex justify-between text-sm p-2 bg-background rounded border">
                      <span>Deposit £100</span>
                      <span className="font-medium text-green-600">Get £103 (+3%)</span>
                    </div>
                    <div className="flex justify-between text-sm p-2 bg-background rounded border">
                      <span>Deposit £200</span>
                      <span className="font-medium text-green-600">Get £210 (+5%)</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Instant & Secure */}
              <Card className="border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-50 to-background dark:from-amber-950/20">
                <CardContent className="pt-6">
                  <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center mb-4">
                    <Clock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                  </div>
                  <h3 className="font-medium text-lg mb-2">Instant Checkout</h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    No card details needed at checkout. Just tap and buy instantly with your wallet balance.
                  </p>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span>One-tap purchases</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span>Secure balance storage</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span>Withdraw anytime</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>

            {/* Wallet vs Card Comparison */}
            <Card className="max-w-3xl mx-auto">
              <CardHeader>
                <CardTitle className="text-center">Wallet vs Card Payment</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-2">Item Price</th>
                        <th className="text-center py-3 px-2">Card (Buyer Pays)</th>
                        <th className="text-center py-3 px-2">Wallet (Buyer Pays)</th>
                        <th className="text-center py-3 px-2">You Save</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[5, 10, 20, 50, 100].map((price) => {
                        const cardFee = price <= 20 ? 0.40 : 0.40 + (price - 20) * 0.01;
                        const cardTotal = price + cardFee;
                        const walletTotal = price;
                        const savings = cardFee;
                        return (
                          <tr key={price} className="border-b last:border-0">
                            <td className="py-3 px-2 font-medium">£{price}</td>
                            <td className="py-3 px-2 text-center text-muted-foreground">£{cardTotal.toFixed(2)}</td>
                            <td className="py-3 px-2 text-center font-medium text-amber-600">£{walletTotal.toFixed(2)}</td>
                            <td className="py-3 px-2 text-center">
                              <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                                Save £{savings.toFixed(2)}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="mt-6 text-center">
                  <Button asChild className="bg-amber-600 hover:bg-amber-700">
                    <Link to="/wallet">
                      <Wallet className="mr-2 h-4 w-4" />
                      Add Funds to Wallet
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Interactive Fee Calculator */}
        <section className="py-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl md:text-3xl font-light text-center mb-4 tracking-tight">
              Calculate Your Fees
            </h2>
            <p className="text-center text-muted-foreground mb-8">
              Enter any price to see exactly what you'll pay or receive.
            </p>
            <FeeCalculator initialPrice={10} showComparison={true} />
          </div>
        </section>
        
        {/* Quick Examples */}
        <section className="py-16 bg-muted/30">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl md:text-3xl font-light text-center mb-12 tracking-tight">
              Real Examples
            </h2>
            
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { price: 1, label: "£1 Card" },
                { price: 5, label: "£5 Card" },
                { price: 15, label: "£15 Card" },
                { price: 50, label: "£50 Card" },
              ].map(({ price, label }) => {
                const fee = price <= 20 ? 0.40 : 0.40 + (price - 20) * 0.01;
                const buyerPays = price + fee;
                const sellerReceives = price - fee;
                
                return (
                  <Card key={price}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">{label}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Buyer pays</span>
                        <span className="font-medium">£{buyerPays.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Seller gets</span>
                        <span className="font-medium text-green-600">£{sellerReceives.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm pt-2 border-t">
                        <span className="text-muted-foreground">Total fees</span>
                        <span className="font-medium">£{(fee * 2).toFixed(2)}</span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>
        
        {/* Why We're Different */}
        <section className="py-16">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl md:text-3xl font-light text-center mb-12 tracking-tight">
              Why 6Seven is Different
            </h2>
            
            <div className="grid md:grid-cols-3 gap-8">
              <Card>
                <CardContent className="pt-6">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <PiggyBank className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-medium text-lg mb-2">Lowest Fees</h3>
                  <p className="text-muted-foreground text-sm">
                    Our 40p + 1% structure beats eBay's 12.8% and Vinted's 5% + 70p on almost every transaction.
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <Zap className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-medium text-lg mb-2">Sell £1 Cards</h3>
                  <p className="text-muted-foreground text-sm">
                    Our flat fee model makes selling cheap cards actually worth it. No more losing money on small sales.
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-medium text-lg mb-2">Fair for Everyone</h3>
                  <p className="text-muted-foreground text-sm">
                    Both buyers and sellers contribute equally. No surprise fees on either side.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
        
        {/* FAQ Section */}
        <section className="py-16 bg-muted/30">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl md:text-3xl font-light text-center mb-12 tracking-tight">
              Frequently Asked Questions
            </h2>
            
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger>Why do both buyers and sellers pay?</AccordionTrigger>
                <AccordionContent>
                  By splitting the fee between both parties, we can keep individual fees very low. 
                  This is fairer than platforms that charge sellers 12%+ or hit buyers with surprise fees at checkout.
                  Both parties benefit from the platform, so both contribute a small amount.
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="item-2">
                <AccordionTrigger>When do I pay the seller fee?</AccordionTrigger>
                <AccordionContent>
                  Sellers only pay when their item sells. The fee is automatically deducted from your payout.
                  There are no listing fees, no monthly fees, and no fees for unsold items. 
                  You only pay when you make money.
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="item-3">
                <AccordionTrigger>Are there any listing fees?</AccordionTrigger>
                <AccordionContent>
                  No. Listing items on 6Seven is completely free. You can list as many items as you want 
                  for as long as you want. The only fee is the small transaction fee when your item sells.
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="item-4">
                <AccordionTrigger>What does Buyer Protection include?</AccordionTrigger>
                <AccordionContent>
                  Buyer Protection covers secure payment processing, item authenticity checks, 
                  dispute resolution, and full refunds if items don't arrive or aren't as described.
                  Your purchase is protected from checkout to delivery.
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="item-5">
                <AccordionTrigger>How do fees work for higher-value items?</AccordionTrigger>
                <AccordionContent>
                  For items over £20 (or $25 USD), we add a small 1% fee on the amount above the threshold.
                  For example, a £50 item would have a fee of 40p + 1% of £30 = 40p + 30p = 70p.
                  This keeps fees proportional while still being much cheaper than competitors.
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="item-6">
                <AccordionTrigger>Do you support different currencies?</AccordionTrigger>
                <AccordionContent>
                  Yes! We support GBP (£), USD ($), and EUR (€). The base fee is adjusted for each currency:
                  40p for GBP, 50¢ for USD, and 45¢ for EUR. The threshold for the percentage fee is
                  £20 / $25 / €22 respectively.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-7">
                <AccordionTrigger>How does the 6Seven Wallet work?</AccordionTrigger>
                <AccordionContent>
                  The 6Seven Wallet lets you pre-load funds and shop with zero buyer fees. When you deposit money
                  via card, we process the payment once. Then when you buy items, there's no payment processing
                  needed — so we pass those savings to you. Plus, you get bonus credit on larger deposits
                  (2% on £50, 3% on £100, 5% on £200+). Your balance is always secure and can be withdrawn anytime.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-8">
                <AccordionTrigger>What fees do sellers pay on wallet purchases?</AccordionTrigger>
                <AccordionContent>
                  For wallet purchases, sellers pay a simple 3% fee (or 2% on items over £50). This is often
                  cheaper than the card payment fee structure, especially for lower-priced items. Plus, wallet
                  purchases settle faster since there's no payment processing delay.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </section>
        
        {/* CTA Section */}
        <section className="py-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-2xl md:text-3xl font-light mb-4 tracking-tight">
              Ready to Start Selling?
            </h2>
            <p className="text-muted-foreground mb-8">
              List your first item in under 60 seconds. No setup fees. No monthly costs.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild>
                <Link to="/sell">
                  Start Selling Free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/browse">
                  Browse Cards
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
}

