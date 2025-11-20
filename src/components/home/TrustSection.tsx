import { ShieldCheck, Lock, UserCheck } from "lucide-react";

export const TrustSection = () => {
    return (
        <section className="py-24 bg-zinc-50 border-t border-zinc-200">
            <div className="container mx-auto px-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center">

                    <div className="space-y-4">
                        <div className="mx-auto w-16 h-16 bg-white border border-zinc-200 flex items-center justify-center text-zinc-900 shadow-sm">
                            <UserCheck className="w-8 h-8" />
                        </div>
                        <h3 className="text-xl font-bold text-zinc-900">Verified Sellers</h3>
                        <p className="text-zinc-500 max-w-xs mx-auto">
                            Every seller undergoes rigorous identity verification. Know exactly who you're trading with.
                        </p>
                    </div>

                    <div className="space-y-4">
                        <div className="mx-auto w-16 h-16 bg-white border border-zinc-200 flex items-center justify-center text-zinc-900 shadow-sm">
                            <ShieldCheck className="w-8 h-8" />
                        </div>
                        <h3 className="text-xl font-bold text-zinc-900">Authenticity Guarantee</h3>
                        <p className="text-zinc-500 max-w-xs mx-auto">
                            AI-powered counterfeit detection plus human verification for high-value items.
                        </p>
                    </div>

                    <div className="space-y-4">
                        <div className="mx-auto w-16 h-16 bg-white border border-zinc-200 flex items-center justify-center text-zinc-900 shadow-sm">
                            <Lock className="w-8 h-8" />
                        </div>
                        <h3 className="text-xl font-bold text-zinc-900">Secure Payments</h3>
                        <p className="text-zinc-500 max-w-xs mx-auto">
                            Funds are held in escrow until the item is delivered and verified as described.
                        </p>
                    </div>

                </div>
            </div>
        </section>
    );
};
