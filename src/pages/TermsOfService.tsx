import { PageLayout } from "@/components/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const TermsOfService = () => {
  const lastUpdated = "January 2025";

  return (
    <PageLayout>
      <div className="max-w-4xl mx-auto py-12 px-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-light tracking-tight">Terms of Service</CardTitle>
            <p className="text-sm text-muted-foreground mt-2">
              Last updated: {lastUpdated}
            </p>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none space-y-6">
            <section>
              <h2 className="text-xl font-semibold mt-6 mb-4">1. Acceptance of Terms</h2>
              <p className="text-muted-foreground leading-relaxed">
                By accessing and using 6Seven ("the Platform", "we", "us", or "our"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to these Terms of Service, please do not use our Platform.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-6 mb-4">2. Description of Service</h2>
              <p className="text-muted-foreground leading-relaxed">
                6Seven is an online marketplace that connects buyers and sellers of second-hand and collectible items. We provide a platform for users to list, browse, and purchase items. We are not a party to any transaction between buyers and sellers, and we do not take ownership of items listed on the Platform.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-6 mb-4">3. User Accounts</h2>
              <div className="space-y-3 text-muted-foreground">
                <p className="leading-relaxed">
                  <strong className="text-foreground">3.1 Account Creation:</strong> To use certain features of the Platform, you must create an account. You agree to provide accurate, current, and complete information during registration.
                </p>
                <p className="leading-relaxed">
                  <strong className="text-foreground">3.2 Account Security:</strong> You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.
                </p>
                <p className="leading-relaxed">
                  <strong className="text-foreground">3.3 Age Requirement:</strong> You must be at least 18 years old to use this Platform. By using the Platform, you represent and warrant that you are at least 18 years of age.
                </p>
                <p className="leading-relaxed">
                  <strong className="text-foreground">3.4 Account Termination:</strong> We reserve the right to suspend or terminate your account at any time for violations of these Terms or for any other reason we deem necessary.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-6 mb-4">4. Seller Obligations</h2>
              <div className="space-y-3 text-muted-foreground">
                <p className="leading-relaxed">
                  <strong className="text-foreground">4.1 Accurate Listings:</strong> Sellers must provide accurate, complete, and truthful information about items listed for sale, including condition, description, and photographs.
                </p>
                <p className="leading-relaxed">
                  <strong className="text-foreground">4.2 Item Ownership:</strong> Sellers warrant that they have the legal right to sell all items listed and that items are not stolen, counterfeit, or illegal.
                </p>
                <p className="leading-relaxed">
                  <strong className="text-foreground">4.3 Prohibited Items:</strong> Sellers may not list prohibited items including but not limited to: illegal goods, weapons, drugs, stolen items, or items that infringe on intellectual property rights.
                </p>
                <p className="leading-relaxed">
                  <strong className="text-foreground">4.4 Shipping:</strong> Sellers must ship items within the timeframe specified in the listing or as agreed with the buyer, and must provide accurate tracking information.
                </p>
                <p className="leading-relaxed">
                  <strong className="text-foreground">4.5 Payment Processing:</strong> Sellers must complete Stripe Connect onboarding to receive payments. We facilitate payments but are not responsible for payment processing delays or issues.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-6 mb-4">5. Buyer Obligations</h2>
              <div className="space-y-3 text-muted-foreground">
                <p className="leading-relaxed">
                  <strong className="text-foreground">5.1 Payment:</strong> Buyers must pay for items in full at the time of purchase. Payment is processed securely through Stripe.
                </p>
                <p className="leading-relaxed">
                  <strong className="text-foreground">5.2 Delivery Confirmation:</strong> Buyers must confirm delivery of items when received. Failure to confirm delivery may delay seller payouts.
                </p>
                <p className="leading-relaxed">
                  <strong className="text-foreground">5.3 Reviews:</strong> Buyers are encouraged to leave honest reviews of their purchase experience. Reviews must be truthful and not defamatory.
                </p>
                <p className="leading-relaxed">
                  <strong className="text-foreground">5.4 Disputes:</strong> If issues arise with a purchase, buyers should first contact the seller. If unresolved, buyers may open a dispute through the Platform's dispute resolution system.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-6 mb-4">6. Fees and Payments</h2>
              <div className="space-y-3 text-muted-foreground">
                <p className="leading-relaxed">
                  <strong className="text-foreground">6.1 Transaction Fees:</strong> We charge a transaction fee on completed sales. Fees are calculated based on seller risk tier and are disclosed before listing creation.
                </p>
                <p className="leading-relaxed">
                  <strong className="text-foreground">6.2 Payment Processing:</strong> Payments are processed through Stripe. We are not responsible for Stripe's fees or payment processing issues.
                </p>
                <p className="leading-relaxed">
                  <strong className="text-foreground">6.3 Payouts:</strong> Seller payouts are processed automatically upon delivery confirmation. Payout timing may vary based on payment processing.
                </p>
                <p className="leading-relaxed">
                  <strong className="text-foreground">6.4 Refunds:</strong> Refund policies are outlined in our Return Policy. Refunds are processed according to our dispute resolution process.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-6 mb-4">7. Prohibited Conduct</h2>
              <p className="text-muted-foreground leading-relaxed mb-3">Users agree not to:</p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>Violate any applicable laws or regulations</li>
                <li>Infringe on intellectual property rights</li>
                <li>Post false, misleading, or fraudulent information</li>
                <li>Harass, abuse, or harm other users</li>
                <li>Use automated systems to access the Platform without permission</li>
                <li>Interfere with or disrupt the Platform's operation</li>
                <li>Attempt to gain unauthorized access to any part of the Platform</li>
                <li>Circumvent payment processing or fees</li>
                <li>Create multiple accounts to avoid restrictions or fees</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-6 mb-4">8. Intellectual Property</h2>
              <div className="space-y-3 text-muted-foreground">
                <p className="leading-relaxed">
                  <strong className="text-foreground">8.1 Platform Content:</strong> All content on the Platform, including text, graphics, logos, and software, is the property of 6Seven or its licensors and is protected by copyright and other intellectual property laws.
                </p>
                <p className="leading-relaxed">
                  <strong className="text-foreground">8.2 User Content:</strong> By posting content on the Platform, you grant us a non-exclusive, worldwide, royalty-free license to use, display, and distribute your content in connection with the Platform.
                </p>
                <p className="leading-relaxed">
                  <strong className="text-foreground">8.3 Trademarks:</strong> 6Seven and related marks are trademarks of 6Seven. You may not use our trademarks without our prior written consent.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-6 mb-4">9. Disclaimers and Limitation of Liability</h2>
              <div className="space-y-3 text-muted-foreground">
                <p className="leading-relaxed">
                  <strong className="text-foreground">9.1 Platform "As Is":</strong> The Platform is provided "as is" and "as available" without warranties of any kind, either express or implied.
                </p>
                <p className="leading-relaxed">
                  <strong className="text-foreground">9.2 No Warranty:</strong> We do not warrant that the Platform will be uninterrupted, secure, or error-free. We do not guarantee the accuracy, completeness, or usefulness of any information on the Platform.
                </p>
                <p className="leading-relaxed">
                  <strong className="text-foreground">9.3 Transaction Risk:</strong> We are not responsible for the quality, safety, or legality of items listed, the accuracy of listings, or the ability of sellers to sell items or buyers to pay for items.
                </p>
                <p className="leading-relaxed">
                  <strong className="text-foreground">9.4 Limitation of Liability:</strong> To the maximum extent permitted by law, 6Seven shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising out of your use of the Platform.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-6 mb-4">10. Indemnification</h2>
              <p className="text-muted-foreground leading-relaxed">
                You agree to indemnify and hold harmless 6Seven, its officers, directors, employees, and agents from any claims, damages, losses, liabilities, and expenses (including legal fees) arising out of your use of the Platform, violation of these Terms, or infringement of any rights of another party.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-6 mb-4">11. Dispute Resolution</h2>
              <div className="space-y-3 text-muted-foreground">
                <p className="leading-relaxed">
                  <strong className="text-foreground">11.1 Internal Resolution:</strong> We provide a dispute resolution system for resolving conflicts between buyers and sellers. Users agree to use this system before pursuing other remedies.
                </p>
                <p className="leading-relaxed">
                  <strong className="text-foreground">11.2 Governing Law:</strong> These Terms shall be governed by and construed in accordance with the laws of the United Kingdom, without regard to its conflict of law provisions.
                </p>
                <p className="leading-relaxed">
                  <strong className="text-foreground">11.3 Jurisdiction:</strong> Any disputes arising from these Terms or your use of the Platform shall be subject to the exclusive jurisdiction of the courts of the United Kingdom.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-6 mb-4">12. Changes to Terms</h2>
              <p className="text-muted-foreground leading-relaxed">
                We reserve the right to modify these Terms at any time. We will notify users of material changes via email or through the Platform. Your continued use of the Platform after changes become effective constitutes acceptance of the modified Terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-6 mb-4">13. Contact Information</h2>
              <p className="text-muted-foreground leading-relaxed">
                If you have questions about these Terms of Service, please contact us at:
              </p>
              <p className="text-muted-foreground leading-relaxed mt-2">
                <strong className="text-foreground">Email:</strong> legal@6seven.ai<br />
                <strong className="text-foreground">Support:</strong> support@6seven.ai
              </p>
            </section>

            <section className="mt-8 pt-6 border-t">
              <p className="text-sm text-muted-foreground">
                By using 6Seven, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
};

export default TermsOfService;
