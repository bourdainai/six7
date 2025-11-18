import { PageLayout } from "@/components/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const ReturnPolicy = () => {
  const lastUpdated = "January 2025";

  return (
    <PageLayout>
      <div className="max-w-4xl mx-auto py-12 px-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-light tracking-tight">Return & Refund Policy</CardTitle>
            <p className="text-sm text-muted-foreground mt-2">
              Last updated: {lastUpdated}
            </p>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none space-y-6">
            <section>
              <h2 className="text-xl font-semibold mt-6 mb-4">1. Overview</h2>
              <p className="text-muted-foreground leading-relaxed">
                At 6Seven, we want you to be completely satisfied with your purchase. This Return & Refund Policy explains your rights and our process for returns, refunds, and exchanges. Please read this policy carefully before making a purchase.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-6 mb-4">2. Return Eligibility</h2>
              
              <h3 className="text-lg font-semibold mt-4 mb-3">2.1 Return Window</h3>
              <p className="text-muted-foreground leading-relaxed">
                You have <strong className="text-foreground">14 days</strong> from the date of delivery to request a return for eligible items. The return period begins on the day you receive the item.
              </p>

              <h3 className="text-lg font-semibold mt-4 mb-3">2.2 Eligible Items</h3>
              <p className="text-muted-foreground leading-relaxed mb-3">Items may be returned if:</p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>The item is not as described in the listing</li>
                <li>The item is damaged or defective</li>
                <li>The wrong item was received</li>
                <li>The item is significantly different from the listing description or photos</li>
              </ul>

              <h3 className="text-lg font-semibold mt-4 mb-3">2.3 Non-Returnable Items</h3>
              <p className="text-muted-foreground leading-relaxed mb-3">The following items are generally not eligible for return:</p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>Items damaged by the buyer after delivery</li>
                <li>Items that have been used, worn, or altered</li>
                <li>Items returned after the 14-day return window</li>
                <li>Digital items or downloadable content</li>
                <li>Items marked as "Final Sale" or "No Returns" in the listing</li>
                <li>Custom or personalized items (unless defective)</li>
                <li>Perishable goods</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-6 mb-4">3. Return Process</h2>
              
              <h3 className="text-lg font-semibold mt-4 mb-3">3.1 Initiating a Return</h3>
              <div className="space-y-3 text-muted-foreground">
                <p className="leading-relaxed">
                  <strong className="text-foreground">Step 1:</strong> Contact the seller through the Platform's messaging system within 14 days of delivery to discuss the issue.
                </p>
                <p className="leading-relaxed">
                  <strong className="text-foreground">Step 2:</strong> If the seller agrees to the return, or if you cannot reach an agreement, you may open a dispute through the Platform's dispute resolution system.
                </p>
                <p className="leading-relaxed">
                  <strong className="text-foreground">Step 3:</strong> Provide photos and a detailed description of the issue. Our dispute resolution team will review your case.
                </p>
              </div>

              <h3 className="text-lg font-semibold mt-4 mb-3">3.2 Return Authorization</h3>
              <p className="text-muted-foreground leading-relaxed">
                Once your return is approved, you will receive a return authorization and shipping instructions. Do not return items without authorization, as we cannot guarantee processing of unauthorized returns.
              </p>

              <h3 className="text-lg font-semibold mt-4 mb-3">3.3 Return Shipping</h3>
              <div className="space-y-3 text-muted-foreground">
                <p className="leading-relaxed">
                  <strong className="text-foreground">Buyer's Responsibility:</strong> Unless the item was damaged, defective, or not as described, the buyer is responsible for return shipping costs.
                </p>
                <p className="leading-relaxed">
                  <strong className="text-foreground">Seller's Responsibility:</strong> If the item was not as described, damaged, or defective, the seller is responsible for return shipping costs.
                </p>
                <p className="leading-relaxed">
                  <strong className="text-foreground">Packaging:</strong> Items must be returned in their original packaging when possible, with all accessories and documentation included.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-6 mb-4">4. Refund Process</h2>
              
              <h3 className="text-lg font-semibold mt-4 mb-3">4.1 Refund Eligibility</h3>
              <p className="text-muted-foreground leading-relaxed">
                Refunds will be processed once we receive and inspect the returned item. Refunds are issued to the original payment method used for the purchase.
              </p>

              <h3 className="text-lg font-semibold mt-4 mb-3">4.2 Refund Timeline</h3>
              <div className="space-y-3 text-muted-foreground">
                <p className="leading-relaxed">
                  <strong className="text-foreground">Processing Time:</strong> Once we receive your return, we will inspect it within 3-5 business days.
                </p>
                <p className="leading-relaxed">
                  <strong className="text-foreground">Refund Issuance:</strong> Approved refunds will be processed within 5-10 business days after inspection.
                </p>
                <p className="leading-relaxed">
                  <strong className="text-foreground">Payment Processing:</strong> It may take an additional 3-5 business days for the refund to appear in your account, depending on your payment provider.
                </p>
              </div>

              <h3 className="text-lg font-semibold mt-4 mb-3">4.3 Refund Amount</h3>
              <p className="text-muted-foreground leading-relaxed mb-3">Refunds include:</p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>The item purchase price</li>
                <li>Original shipping costs (if item was defective or not as described)</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-3 mb-3">Refunds do not include:</p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>Return shipping costs (unless seller is at fault)</li>
                <li>Original transaction fees (non-refundable)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-6 mb-4">5. Exchanges</h2>
              <p className="text-muted-foreground leading-relaxed">
                We do not offer direct exchanges. If you wish to exchange an item, you must return the original item for a refund and purchase the desired item separately. This ensures proper processing and protects both buyers and sellers.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-6 mb-4">6. Dispute Resolution</h2>
              <div className="space-y-3 text-muted-foreground">
                <p className="leading-relaxed">
                  <strong className="text-foreground">6.1 Internal Resolution:</strong> If you and the seller cannot agree on a return or refund, you may open a dispute through our Platform. Our dispute resolution team will review all evidence and make a fair decision.
                </p>
                <p className="leading-relaxed">
                  <strong className="text-foreground">6.2 Evidence Required:</strong> When opening a dispute, please provide:
                </p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                  <li>Clear photos of the item showing the issue</li>
                  <li>Photos of the original packaging</li>
                  <li>Description of how the item differs from the listing</li>
                  <li>Any relevant communication with the seller</li>
                </ul>
                <p className="leading-relaxed">
                  <strong className="text-foreground">6.3 Resolution Timeline:</strong> Disputes are typically resolved within 5-7 business days. Complex cases may take longer.
                </p>
                <p className="leading-relaxed">
                  <strong className="text-foreground">6.4 Appeal Process:</strong> If you disagree with a dispute resolution decision, you may request a review within 7 days of the decision.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-6 mb-4">7. Seller Responsibilities</h2>
              <div className="space-y-3 text-muted-foreground">
                <p className="leading-relaxed">
                  <strong className="text-foreground">7.1 Accurate Listings:</strong> Sellers must provide accurate descriptions and photos of items. Items that are not as described are eligible for return at the seller's expense.
                </p>
                <p className="leading-relaxed">
                  <strong className="text-foreground">7.2 Accepting Returns:</strong> Sellers are expected to accept returns for items that are not as described, damaged, or defective. Refusing valid returns may result in account restrictions.
                </p>
                <p className="leading-relaxed">
                  <strong className="text-foreground">7.3 Return Shipping:</strong> Sellers are responsible for return shipping costs when items are not as described or defective.
                </p>
                <p className="leading-relaxed">
                  <strong className="text-foreground">7.4 Refund Processing:</strong> Sellers must process approved refunds promptly. Delayed refunds may result in automatic processing by 6Seven.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-6 mb-4">8. Buyer Responsibilities</h2>
              <div className="space-y-3 text-muted-foreground">
                <p className="leading-relaxed">
                  <strong className="text-foreground">8.1 Inspection:</strong> Buyers should inspect items promptly upon delivery and report any issues within the return window.
                </p>
                <p className="leading-relaxed">
                  <strong className="text-foreground">8.2 Care of Items:</strong> Buyers must return items in the same condition as received. Items damaged by the buyer are not eligible for return.
                </p>
                <p className="leading-relaxed">
                  <strong className="text-foreground">8.3 Return Shipping:</strong> Buyers are responsible for return shipping costs unless the seller is at fault.
                </p>
                <p className="leading-relaxed">
                  <strong className="text-foreground">8.4 Timely Returns:</strong> Returns must be shipped within 7 days of return authorization. Delayed returns may not be accepted.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-6 mb-4">9. Special Circumstances</h2>
              
              <h3 className="text-lg font-semibold mt-4 mb-3">9.1 Damaged in Transit</h3>
              <p className="text-muted-foreground leading-relaxed">
                If an item arrives damaged due to shipping, contact the seller immediately and take photos. The seller is responsible for filing a shipping claim and providing a refund or replacement.
              </p>

              <h3 className="text-lg font-semibold mt-4 mb-3">9.2 Lost in Transit</h3>
              <p className="text-muted-foreground leading-relaxed">
                If an item is lost during shipping, the seller is responsible for filing a claim with the shipping carrier. Buyers will receive a full refund if the item cannot be located.
              </p>

              <h3 className="text-lg font-semibold mt-4 mb-3">9.3 Counterfeit Items</h3>
              <p className="text-muted-foreground leading-relaxed">
                If you receive a counterfeit item, you are entitled to a full refund including shipping costs. Report counterfeit items immediately, and the seller's account may be suspended.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-6 mb-4">10. Cancellations</h2>
              <div className="space-y-3 text-muted-foreground">
                <p className="leading-relaxed">
                  <strong className="text-foreground">10.1 Before Shipping:</strong> Orders can be cancelled before the seller ships the item. Full refunds will be issued for cancelled orders.
                </p>
                <p className="leading-relaxed">
                  <strong className="text-foreground">10.2 After Shipping:</strong> Once an item has shipped, it cannot be cancelled. You must wait for delivery and follow the return process if needed.
                </p>
                <p className="leading-relaxed">
                  <strong className="text-foreground">10.3 Seller Cancellations:</strong> If a seller cancels an order, the buyer will receive a full refund automatically.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-6 mb-4">11. Contact Information</h2>
              <p className="text-muted-foreground leading-relaxed">
                For questions about returns or refunds, please contact us:
              </p>
              <p className="text-muted-foreground leading-relaxed mt-3">
                <strong className="text-foreground">Email:</strong> support@6seven.ai<br />
                <strong className="text-foreground">Disputes:</strong> disputes@6seven.ai<br />
                <strong className="text-foreground">Response Time:</strong> We aim to respond within 24-48 hours
              </p>
            </section>

            <section className="mt-8 pt-6 border-t">
              <p className="text-sm text-muted-foreground">
                This Return & Refund Policy is part of our Terms of Service. By making a purchase on 6Seven, you agree to this policy.
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
};

export default ReturnPolicy;
