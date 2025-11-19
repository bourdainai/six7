import { Check, Smartphone, CreditCard, Package } from "lucide-react";

export const STEPS = [
  {
    id: "signup",
    title: "Create Account",
    description: "Sign up with your email and create a secure password.",
    icon: Smartphone,
  },
  {
    id: "verify",
    title: "Verify Identity",
    description: "Quick identity verification to ensure a safe marketplace.",
    icon: Check,
  },
  {
    id: "connect",
    title: "Connect Payouts",
    description: "Link your bank account securely via Stripe to get paid.",
    icon: CreditCard,
  },
  {
    id: "list",
    title: "List Your First Card",
    description: "Upload photos and let AI handle the details.",
    icon: Package,
  },
];

