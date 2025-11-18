import { PageLayout } from "@/components/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SEO } from "@/components/SEO";

const CookiePolicy = () => {
  const lastUpdated = "January 2025";

  return (
    <PageLayout>
      <SEO
        title="Cookie Policy - 6Seven"
        description="Learn about how 6Seven uses cookies and how you can manage your cookie preferences."
        keywords="cookie policy, cookies, tracking, analytics cookies, 6Seven cookies"
      />
      <div className="max-w-4xl mx-auto py-12 px-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-light tracking-tight">Cookie Policy</CardTitle>
            <p className="text-sm text-muted-foreground mt-2">
              Last updated: {lastUpdated}
            </p>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none space-y-6">
            <section>
              <h2 className="text-xl font-semibold mt-6 mb-4">1. What Are Cookies?</h2>
              <p className="text-muted-foreground leading-relaxed">
                Cookies are small text files that are placed on your device (computer, tablet, or mobile) when you visit a website. They are widely used to make websites work more efficiently and provide information to website owners.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-6 mb-4">2. How We Use Cookies</h2>
              <p className="text-muted-foreground leading-relaxed">
                We use cookies on 6Seven to enhance your experience, analyze site usage, and assist in our marketing efforts. Cookies help us:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>Remember your preferences and settings</li>
                <li>Keep you signed in to your account</li>
                <li>Understand how you use our Platform</li>
                <li>Improve our services and user experience</li>
                <li>Provide personalized content and recommendations</li>
                <li>Measure the effectiveness of our marketing campaigns</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-6 mb-4">3. Types of Cookies We Use</h2>
              
              <h3 className="text-lg font-semibold mt-4 mb-3">3.1 Necessary Cookies</h3>
              <p className="text-muted-foreground leading-relaxed mb-3">
                These cookies are essential for the Platform to function properly. They enable core functionality such as:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>User authentication and session management</li>
                <li>Security and fraud prevention</li>
                <li>Remembering your cookie preferences</li>
                <li>Load balancing and site performance</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-3">
                <strong className="text-foreground">Duration:</strong> Session cookies (deleted when you close your browser) and persistent cookies (stored for up to 1 year)
              </p>
              <p className="text-muted-foreground leading-relaxed mt-2">
                <strong className="text-foreground">Can you opt-out?</strong> No, these cookies are necessary and cannot be disabled.
              </p>

              <h3 className="text-lg font-semibold mt-4 mb-3">3.2 Analytics Cookies</h3>
              <p className="text-muted-foreground leading-relaxed mb-3">
                These cookies help us understand how visitors interact with our Platform by collecting and reporting information anonymously. They help us:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>Count visitors and track page views</li>
                <li>Understand user navigation patterns</li>
                <li>Identify popular features and areas for improvement</li>
                <li>Measure the effectiveness of our content</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-3">
                <strong className="text-foreground">Duration:</strong> Up to 2 years
              </p>
              <p className="text-muted-foreground leading-relaxed mt-2">
                <strong className="text-foreground">Can you opt-out?</strong> Yes, you can disable analytics cookies in your cookie preferences.
              </p>

              <h3 className="text-lg font-semibold mt-4 mb-3">3.3 Marketing Cookies</h3>
              <p className="text-muted-foreground leading-relaxed mb-3">
                These cookies are used to deliver personalized advertisements and track campaign performance. They help us:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>Show you relevant advertisements</li>
                <li>Track the effectiveness of our marketing campaigns</li>
                <li>Limit the number of times you see an ad</li>
                <li>Measure conversions from marketing efforts</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-3">
                <strong className="text-foreground">Duration:</strong> Up to 1 year
              </p>
              <p className="text-muted-foreground leading-relaxed mt-2">
                <strong className="text-foreground">Can you opt-out?</strong> Yes, you can disable marketing cookies in your cookie preferences.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-6 mb-4">4. Third-Party Cookies</h2>
              <p className="text-muted-foreground leading-relaxed mb-3">
                We may also use third-party services that set cookies on your device. These include:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li><strong className="text-foreground">Stripe:</strong> Payment processing and fraud prevention</li>
                <li><strong className="text-foreground">Analytics Services:</strong> Google Analytics or similar (if enabled)</li>
                <li><strong className="text-foreground">Social Media:</strong> If you share content on social media platforms</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-3">
                These third parties have their own privacy policies and cookie practices. We encourage you to review their policies.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-6 mb-4">5. Managing Your Cookie Preferences</h2>
              
              <h3 className="text-lg font-semibold mt-4 mb-3">5.1 Cookie Consent Banner</h3>
              <p className="text-muted-foreground leading-relaxed">
                When you first visit our Platform, you will see a cookie consent banner. You can choose to:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>Accept all cookies</li>
                <li>Reject non-essential cookies</li>
                <li>Customize your preferences</li>
              </ul>

              <h3 className="text-lg font-semibold mt-4 mb-3">5.2 Changing Your Preferences</h3>
              <p className="text-muted-foreground leading-relaxed">
                You can change your cookie preferences at any time by:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>Clicking the "Cookie Preferences" link in our footer</li>
                <li>Clearing your browser cookies (this will reset your preferences)</li>
                <li>Using your browser's cookie settings</li>
              </ul>

              <h3 className="text-lg font-semibold mt-4 mb-3">5.3 Browser Settings</h3>
              <p className="text-muted-foreground leading-relaxed">
                Most web browsers allow you to control cookies through their settings. You can:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>Block all cookies</li>
                <li>Block third-party cookies</li>
                <li>Delete cookies when you close your browser</li>
                <li>Delete specific cookies</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-3">
                <strong className="text-foreground">Note:</strong> Blocking necessary cookies may affect the functionality of our Platform.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-6 mb-4">6. Cookie Duration</h2>
              <div className="space-y-3 text-muted-foreground">
                <p className="leading-relaxed">
                  <strong className="text-foreground">Session Cookies:</strong> These are temporary cookies that are deleted when you close your browser. They are used to maintain your session while browsing.
                </p>
                <p className="leading-relaxed">
                  <strong className="text-foreground">Persistent Cookies:</strong> These remain on your device for a set period (ranging from days to years) or until you delete them. They remember your preferences and settings.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-6 mb-4">7. Do Not Track Signals</h2>
              <p className="text-muted-foreground leading-relaxed">
                Some browsers include a "Do Not Track" (DNT) feature that signals to websites you visit that you do not want to have your online activity tracked. Currently, there is no standard for how DNT signals should be interpreted. We do not currently respond to DNT browser signals, but we respect your cookie preferences as set through our cookie consent banner.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-6 mb-4">8. Updates to This Policy</h2>
              <p className="text-muted-foreground leading-relaxed">
                We may update this Cookie Policy from time to time to reflect changes in our practices or for other operational, legal, or regulatory reasons. We will notify you of any material changes by posting the new policy on this page and updating the "Last updated" date.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-6 mb-4">9. Contact Us</h2>
              <p className="text-muted-foreground leading-relaxed">
                If you have questions about our use of cookies, please contact us:
              </p>
              <p className="text-muted-foreground leading-relaxed mt-3">
                <strong className="text-foreground">Email:</strong> privacy@6seven.ai<br />
                <strong className="text-foreground">Support:</strong> support@6seven.ai
              </p>
            </section>

            <section className="mt-8 pt-6 border-t">
              <p className="text-sm text-muted-foreground">
                This Cookie Policy is part of our Privacy Policy. By using 6Seven, you consent to our use of cookies as described in this policy.
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
};

export default CookiePolicy;
