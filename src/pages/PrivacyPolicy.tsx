import { PageLayout } from "@/components/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SEO } from "@/components/SEO";

const PrivacyPolicy = () => {
  const lastUpdated = "January 2025";

  return (
    <PageLayout>
      <SEO
        title="Privacy Policy - 6Seven"
        description="Learn how 6Seven collects, uses, and protects your personal information. Your privacy is important to us."
        keywords="privacy policy, data protection, GDPR, privacy rights, 6Seven privacy"
      />
      <div className="max-w-4xl mx-auto py-12 px-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-light tracking-tight">Privacy Policy</CardTitle>
            <p className="text-sm text-muted-foreground mt-2">
              Last updated: {lastUpdated}
            </p>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none space-y-6">
            <section>
              <h2 className="text-xl font-semibold mt-6 mb-4">1. Introduction</h2>
              <p className="text-muted-foreground leading-relaxed">
                At 6Seven ("we", "us", or "our"), we are committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our online marketplace platform ("Platform"). Please read this policy carefully to understand our practices regarding your personal data.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-6 mb-4">2. Information We Collect</h2>
              
              <h3 className="text-lg font-semibold mt-4 mb-3">2.1 Information You Provide</h3>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li><strong className="text-foreground">Account Information:</strong> Name, email address, phone number, date of birth, and password</li>
                <li><strong className="text-foreground">Profile Information:</strong> Avatar, bio, location, and preferences</li>
                <li><strong className="text-foreground">Payment Information:</strong> Bank account details, payment method information (processed securely through Stripe)</li>
                <li><strong className="text-foreground">Listing Information:</strong> Item descriptions, photos, prices, and shipping details</li>
                <li><strong className="text-foreground">Communication:</strong> Messages sent through the Platform, support requests</li>
                <li><strong className="text-foreground">Reviews and Ratings:</strong> Feedback and ratings you provide</li>
              </ul>

              <h3 className="text-lg font-semibold mt-4 mb-3">2.2 Information Automatically Collected</h3>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li><strong className="text-foreground">Usage Data:</strong> Pages visited, time spent, clicks, search queries</li>
                <li><strong className="text-foreground">Device Information:</strong> IP address, browser type, operating system, device identifiers</li>
                <li><strong className="text-foreground">Location Data:</strong> General location based on IP address (with your consent)</li>
                <li><strong className="text-foreground">Cookies and Tracking:</strong> See our Cookie Policy for details</li>
              </ul>

              <h3 className="text-lg font-semibold mt-4 mb-3">2.3 Information from Third Parties</h3>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>Payment processing information from Stripe</li>
                <li>Social media information if you connect social accounts</li>
                <li>Verification information from identity verification services</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-6 mb-4">3. How We Use Your Information</h2>
              <p className="text-muted-foreground leading-relaxed mb-3">We use your information to:</p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>Provide, maintain, and improve our Platform services</li>
                <li>Process transactions and facilitate payments</li>
                <li>Verify your identity and prevent fraud</li>
                <li>Communicate with you about your account, transactions, and Platform updates</li>
                <li>Send you marketing communications (with your consent)</li>
                <li>Personalize your experience and provide recommendations</li>
                <li>Monitor and analyze Platform usage and trends</li>
                <li>Detect, prevent, and address technical issues and security threats</li>
                <li>Comply with legal obligations and enforce our Terms of Service</li>
                <li>Facilitate dispute resolution between buyers and sellers</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-6 mb-4">4. How We Share Your Information</h2>
              
              <h3 className="text-lg font-semibold mt-4 mb-3">4.1 With Other Users</h3>
              <p className="text-muted-foreground leading-relaxed">
                When you create a listing or make a purchase, certain information (name, profile picture, location) may be visible to other users. Your contact information is not shared directly; communication happens through our Platform.
              </p>

              <h3 className="text-lg font-semibold mt-4 mb-3">4.2 With Service Providers</h3>
              <p className="text-muted-foreground leading-relaxed">
                We share information with third-party service providers who perform services on our behalf, including:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li><strong className="text-foreground">Stripe:</strong> Payment processing and seller payouts</li>
                <li><strong className="text-foreground">Supabase:</strong> Database and authentication services</li>
                <li><strong className="text-foreground">Hosting Providers:</strong> Cloud infrastructure services</li>
                <li><strong className="text-foreground">Analytics Services:</strong> Platform usage analytics (with anonymized data)</li>
                <li><strong className="text-foreground">Email Services:</strong> Transactional and marketing emails</li>
              </ul>

              <h3 className="text-lg font-semibold mt-4 mb-3">4.3 Legal Requirements</h3>
              <p className="text-muted-foreground leading-relaxed">
                We may disclose your information if required by law, court order, or government regulation, or to:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>Comply with legal processes or government requests</li>
                <li>Enforce our Terms of Service</li>
                <li>Protect the rights, property, or safety of 6Seven, our users, or others</li>
                <li>Prevent fraud or security threats</li>
              </ul>

              <h3 className="text-lg font-semibold mt-4 mb-3">4.4 Business Transfers</h3>
              <p className="text-muted-foreground leading-relaxed">
                In the event of a merger, acquisition, or sale of assets, your information may be transferred to the acquiring entity.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-6 mb-4">5. Data Security</h2>
              <p className="text-muted-foreground leading-relaxed">
                We implement appropriate technical and organizational measures to protect your personal information, including:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>Encryption of data in transit (SSL/TLS) and at rest</li>
                <li>Secure authentication and access controls</li>
                <li>Regular security assessments and updates</li>
                <li>Limited access to personal data on a need-to-know basis</li>
                <li>Secure payment processing through Stripe (we do not store full payment card details)</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-3">
                However, no method of transmission over the Internet or electronic storage is 100% secure. While we strive to protect your information, we cannot guarantee absolute security.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-6 mb-4">6. Your Rights and Choices</h2>
              
              <h3 className="text-lg font-semibold mt-4 mb-3">6.1 Access and Correction</h3>
              <p className="text-muted-foreground leading-relaxed">
                You can access and update your account information at any time through your account settings. You may also request a copy of your personal data.
              </p>

              <h3 className="text-lg font-semibold mt-4 mb-3">6.2 Data Deletion</h3>
              <p className="text-muted-foreground leading-relaxed">
                You may request deletion of your account and personal data. We will delete your data subject to legal retention requirements (e.g., transaction records for tax purposes).
              </p>

              <h3 className="text-lg font-semibold mt-4 mb-3">6.3 Marketing Communications</h3>
              <p className="text-muted-foreground leading-relaxed">
                You can opt-out of marketing emails by clicking the unsubscribe link in any marketing email or adjusting your notification preferences in account settings. Transactional emails (order confirmations, etc.) cannot be opted out of.
              </p>

              <h3 className="text-lg font-semibold mt-4 mb-3">6.4 Cookies</h3>
              <p className="text-muted-foreground leading-relaxed">
                You can control cookies through your browser settings. See our Cookie Policy for more information.
              </p>

              <h3 className="text-lg font-semibold mt-4 mb-3">6.5 GDPR Rights (EU Users)</h3>
              <p className="text-muted-foreground leading-relaxed">
                If you are located in the European Economic Area (EEA), you have additional rights under GDPR:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>Right to access your personal data</li>
                <li>Right to rectification of inaccurate data</li>
                <li>Right to erasure ("right to be forgotten")</li>
                <li>Right to restrict processing</li>
                <li>Right to data portability</li>
                <li>Right to object to processing</li>
                <li>Right to withdraw consent</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-3">
                To exercise these rights, please contact us at privacy@6seven.ai.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-6 mb-4">7. Data Retention</h2>
              <p className="text-muted-foreground leading-relaxed">
                We retain your personal information for as long as necessary to:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>Provide services to you</li>
                <li>Comply with legal obligations (e.g., tax records, transaction history)</li>
                <li>Resolve disputes and enforce agreements</li>
                <li>Maintain security and prevent fraud</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-3">
                When you delete your account, we will delete or anonymize your personal data within 30 days, except where we are required to retain it for legal purposes.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-6 mb-4">8. Children's Privacy</h2>
              <p className="text-muted-foreground leading-relaxed">
                Our Platform is not intended for users under 18 years of age. We do not knowingly collect personal information from children. If we become aware that we have collected information from a child under 18, we will delete that information immediately.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-6 mb-4">9. International Data Transfers</h2>
              <p className="text-muted-foreground leading-relaxed">
                Your information may be transferred to and processed in countries other than your country of residence. These countries may have data protection laws that differ from those in your country. We ensure appropriate safeguards are in place for such transfers in accordance with applicable data protection laws.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-6 mb-4">10. Third-Party Links</h2>
              <p className="text-muted-foreground leading-relaxed">
                Our Platform may contain links to third-party websites or services. We are not responsible for the privacy practices of these third parties. We encourage you to read their privacy policies.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-6 mb-4">11. Changes to This Policy</h2>
              <p className="text-muted-foreground leading-relaxed">
                We may update this Privacy Policy from time to time. We will notify you of material changes by email or through a notice on the Platform. Your continued use of the Platform after such changes constitutes acceptance of the updated policy.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-6 mb-4">12. Contact Us</h2>
              <p className="text-muted-foreground leading-relaxed">
                If you have questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:
              </p>
              <p className="text-muted-foreground leading-relaxed mt-3">
                <strong className="text-foreground">Email:</strong> privacy@6seven.ai<br />
                <strong className="text-foreground">Support:</strong> support@6seven.ai<br />
                <strong className="text-foreground">Data Protection Officer:</strong> dpo@6seven.ai
              </p>
            </section>

            <section className="mt-8 pt-6 border-t">
              <p className="text-sm text-muted-foreground">
                By using 6Seven, you acknowledge that you have read and understood this Privacy Policy and consent to the collection and use of your information as described herein.
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
};

export default PrivacyPolicy;
