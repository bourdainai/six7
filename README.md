# 6Seven - AI Native Trading Marketplace

<div align="center">

**The first UK marketplace bringing real card show trading dynamics online**

Cash + Trade Offers | AI Valuation | Agent-Ready | Wallet Payments

[Features](#features) • [Tech Stack](#tech-stack) • [Quick Start](#quick-start) • [Documentation](#documentation) • [Contributing](#contributing)

</div>

---

## 🎯 What is 6Seven?

6Seven is an **AI-native trading card marketplace** built for modern trading behaviour. Unlike traditional marketplaces that only support cash transactions, 6Seven enables:

- 💰 **Hybrid Trading** - Make offers with cash + your cards
- 🤖 **AI-Powered Listing** - Upload photos, AI creates the listing
- 🔮 **Smart Pricing** - Real-time pricing based on actual sold comps
- 💳 **Internal Wallet** - Reduce fees, instant settlements
- 🤝 **Agent Trading** - AI agents can buy/sell via ACP & MCP protocols
- 📹 **Video Listings** - Prove condition with video
- 🚀 **Mobile Apps** - iOS & Android from day one

---

## ✨ Features

### Core Trading Features

- **Dual Offer System** - Propose cash, cards, or a combination
- **AI Valuation Engine** - Automatic pricing for every card
- **Fairness Scoring** - AI evaluates trade equity
- **Bundle Builder** - Sell multiple cards together
- **Video Support** - Show card condition dynamically

### AI & Automation

- **Auto-Listing from Photos** - Upload images → AI creates listing in seconds
- **Fake Card Detection** - Computer vision + human review
- **Smart Descriptions** - AI-generated product descriptions
- **Price Suggestions** - Based on historical comps
- **TikTok-Style Feed** - AI-curated vertical swipe feed

### Payment & Settlement

- **6Seven Wallet** - Internal balance system (1% fee vs 3% Stripe)
- **Instant Settlements** - No waiting for payouts
- **Split Payments** - Wallet + card in single transaction
- **Seller Earnings Pool** - Track pending and available funds

### Shipping

- **4 UK Carriers** - Royal Mail, Evri, DPD, ParcelForce
- **Print-at-Home Labels** - No trips to post office
- **Real-Time Tracking** - Automatic updates via webhooks
- **Shipping Calculator** - Live rates at checkout

### For AI Agents

- **ACP Support** - Full Agentic Commerce Protocol implementation
- **MCP Tools** - 10+ tools for programmatic trading
- **Agent Checkout** - AI agents can purchase autonomously
- **Wallet Integration** - Agent-driven wallet operations

### Admin & Support

- **Customer Service Dashboard** - Order, dispute, refund management
- **Fake Card Review Queue** - Video verification workflow
- **Risk Scoring** - Automated fraud detection
- **User Moderation** - Ban, suspend, warn tools

---

## 🛠️ Tech Stack

### Frontend
- **Framework:** React 18 + TypeScript
- **Build:** Vite
- **UI Library:** Radix UI + Tailwind CSS
- **State:** React Query
- **Mobile:** Capacitor (iOS + Android)

### Backend
- **Database:** Supabase (PostgreSQL)
- **Functions:** Supabase Edge Functions (Deno)
- **Storage:** Supabase Storage (images/video)
- **Auth:** Supabase Auth

### Payments
- **Processor:** Stripe Connect
- **Wallet:** Internal balance system
- **Payouts:** Stripe Connect transfers

### Infrastructure
- **Hosting:** Lovable Cloud
- **CDN:** Cloudflare
- **Security:** Cloudflare WAF + DDoS protection

### Integrations
- **Cards Data:** Pokémon TCG API
- **Shipping:** Royal Mail, Evri, DPD, ParcelForce APIs
- **AI:** OpenAI (via Supabase)

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Supabase account
- Stripe account

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/6seven.git
cd 6seven

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your keys

# Run database migrations
npm run db:migrate

# Start development server
npm run dev
```

### Environment Variables

```bash
# Supabase
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Stripe
VITE_STRIPE_PUBLIC_KEY=your_stripe_public_key

# Optional: Pokemon TCG API
VITE_POKEMON_TCG_API_KEY=your_tcg_api_key
```

### Supabase Setup

```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref your-project-ref

# Run migrations
supabase db push

# Deploy edge functions
supabase functions deploy
```

---

## 📚 Documentation

Comprehensive documentation is available in the `/docs` folder:

### Planning Documents
- **[6SEVEN_PROJECT_OVERVIEW.md](6SEVEN_PROJECT_OVERVIEW.md)** - Project vision and objectives
- **[6SEVEN_FEATURE_SPECS.md](6SEVEN_FEATURE_SPECS.md)** - Detailed feature requirements
- **[6SEVEN_TECHNICAL_BLUEPRINT.md](6SEVEN_TECHNICAL_BLUEPRINT.md)** - Implementation architecture
- **[6SEVEN_IMPLEMENTATION_ROADMAP.md](6SEVEN_IMPLEMENTATION_ROADMAP.md)** - 16-week delivery plan
- **[6SEVEN_PLANNING_INDEX.md](6SEVEN_PLANNING_INDEX.md)** - Documentation navigation guide

### Implementation Guides
- **[6SEVEN_ACP_GUIDE.md](6SEVEN_ACP_GUIDE.md)** - Agentic Commerce Protocol implementation
- **[6SEVEN_MCP_GUIDE.md](6SEVEN_MCP_GUIDE.md)** - Model Context Protocol setup
- **[6SEVEN_QUICK_START.md](6SEVEN_QUICK_START.md)** - Developer onboarding

### Reference Documents
- **[STRIPE_SETUP_GUIDE.md](STRIPE_SETUP_GUIDE.md)** - Payment configuration
- **[DATABASE_MIGRATION_GUIDE.md](DATABASE_MIGRATION_GUIDE.md)** - Schema management

---

## 🏗️ Project Status

### Current Phase: **Planning Complete ✅**

We've completed comprehensive planning and are ready to begin implementation.

### Completed
- ✅ Project architecture designed
- ✅ Database schema defined (16 new tables)
- ✅ 45+ edge functions specified
- ✅ 16-week implementation roadmap created
- ✅ All feature requirements documented

### Next Steps
1. **Phase 1 (Weeks 1-2):** Foundation & Data
   - Database migration
   - Pokémon TCG API integration
   - Pricing comps system
2. **Phase 2 (Weeks 3-4):** Wallet System
3. **Phase 3 (Weeks 5-6):** Trade System

See [6SEVEN_IMPLEMENTATION_ROADMAP.md](6SEVEN_IMPLEMENTATION_ROADMAP.md) for full timeline.

---

## 🤝 Contributing

We welcome contributions! Please see our contributing guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Write tests for new features
- Update documentation
- Ensure Lighthouse score > 90
- Mobile-first responsive design

---

## 📊 Metrics & Goals

### Launch Targets (Week 16)
- 1,000 registered users
- 500 listings
- 100 transactions
- £10,000 GMV
- 20% wallet adoption

### Long-Term Vision (12 months)
- 50,000+ users
- £5M annual GMV
- 60% wallet adoption
- 30% of transactions include trade offers
- 500+ daily agent transactions

---

## 🔐 Security

6Seven takes security seriously:

- 🔒 End-to-end encryption for sensitive data
- 🛡️ Cloudflare WAF and DDoS protection
- 🔑 Secure API key management
- 🎯 Role-based access control
- 📊 Comprehensive audit logging
- 🚨 Real-time fraud detection

Found a security vulnerability? Please email security@sixseven.com (do not open public issues).

---

## 📱 Mobile Apps

iOS and Android apps are built using Capacitor from the same React codebase.

**Features:**
- Native push notifications
- Biometric authentication
- Deep linking
- Offline support
- Camera integration

**Status:** In development (Week 14 of roadmap)

---

## 🌍 Roadmap

### Phase 1: UK Launch (Q1 2025)
- Pokémon TCG marketplace
- 4 UK shipping carriers
- GBP payments only

### Phase 2: Feature Expansion (Q2 2025)
- Sports cards vertical
- Grading service integration
- Advanced seller analytics

### Phase 3: International (Q3 2025)
- US market launch
- USD payments
- USPS shipping integration

### Phase 4: Enterprise (Q4 2025)
- Card shop bulk tools
- API for card databases
- White-label platform

---

## 📞 Support

- **Documentation:** See `/docs` folder
- **Community:** [Discord](https://discord.gg/sixseven)
- **Email:** support@sixseven.com
- **Twitter:** [@6SevenMarket](https://twitter.com/6SevenMarket)

---

## 📄 License

Copyright © 2025 6Seven. All rights reserved.

This software is proprietary and confidential. Unauthorized copying, distribution, or use is strictly prohibited.

---

## 🙏 Acknowledgments

Built with:
- [React](https://reactjs.org/)
- [Supabase](https://supabase.com/)
- [Stripe](https://stripe.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Radix UI](https://www.radix-ui.com/)
- [Pokémon TCG API](https://pokemontcg.io/)

Special thanks to the trading card community for inspiration and feedback.

---

<div align="center">

**Made with ❤️ for collectors and traders**

[Website](https://sixseven.com) • [Twitter](https://twitter.com/6SevenMarket) • [Discord](https://discord.gg/sixseven)

</div>
