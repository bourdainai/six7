# 6Seven - Quick Start Guide

**Get 6Seven running locally in under 15 minutes**

This guide will help you set up your development environment and make your first contribution to 6Seven.

---

## Prerequisites

Before you begin, ensure you have:

- **Node.js** 18+ installed ([Download](https://nodejs.org/))
- **npm** 9+ (comes with Node.js)
- **Git** installed
- **Supabase account** ([Sign up free](https://supabase.com))
- **Stripe account** ([Sign up](https://stripe.com))
- **Code editor** (VS Code recommended)

### Recommended VS Code Extensions
- ESLint
- Prettier
- Tailwind CSS IntelliSense
- TypeScript and JavaScript Language Features

---

## Step 1: Clone the Repository

```bash
git clone https://github.com/yourusername/6seven.git
cd 6seven
```

---

## Step 2: Install Dependencies

```bash
npm install
```

This will install all required packages including:
- React 18
- TypeScript
- Vite
- Tailwind CSS
- Supabase client
- Stripe client
- Radix UI components

---

## Step 3: Set Up Environment Variables

Create a `.env.local` file in the project root:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your credentials:

```bash
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Stripe
VITE_STRIPE_PUBLIC_KEY=pk_test_your_stripe_public_key

# Optional: Pokémon TCG API
VITE_POKEMON_TCG_API_KEY=your_tcg_api_key
```

### Getting Supabase Credentials

1. Go to [supabase.com](https://supabase.com)
2. Create a new project (or use existing)
3. Go to Settings → API
4. Copy `URL` and `anon/public` key

### Getting Stripe Credentials

1. Go to [dashboard.stripe.com](https://dashboard.stripe.com)
2. Enable Test Mode (toggle in top right)
3. Go to Developers → API keys
4. Copy the `Publishable key` (starts with `pk_test_`)

---

## Step 4: Set Up Supabase

### Install Supabase CLI

```bash
npm install -g supabase
```

### Link to Your Project

```bash
supabase link --project-ref your-project-ref
```

Your project ref is in your Supabase URL:  
`https://YOUR-PROJECT-REF.supabase.co`

### Run Database Migrations

```bash
supabase db push
```

This creates all necessary tables, indexes, and RLS policies.

### Verify Database Setup

```bash
supabase db status
```

You should see all migrations applied successfully.

---

## Step 5: Deploy Edge Functions (Optional for Local Dev)

If you want to test edge functions locally:

```bash
# Start Supabase local development
supabase start

# Deploy functions locally
supabase functions serve
```

For production deployment:

```bash
# Deploy all functions
supabase functions deploy

# Or deploy specific function
supabase functions deploy function-name
```

---

## Step 6: Start Development Server

```bash
npm run dev
```

This starts the Vite development server. Open your browser to:

**http://localhost:5173**

You should see the 6Seven homepage!

---

## Step 7: Create Your First Account

1. Click "Sign Up" in the navigation
2. Enter email and password
3. Check your email for verification link
4. Click the link to verify
5. Log in to 6Seven

---

## Common Development Tasks

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run E2E tests
npm run test:e2e
```

### Linting & Formatting

```bash
# Run ESLint
npm run lint

# Fix ESLint errors
npm run lint:fix

# Format with Prettier
npm run format
```

### Building for Production

```bash
# Create production build
npm run build

# Preview production build
npm run preview
```

### Database Commands

```bash
# Create a new migration
supabase migration new migration_name

# Apply migrations
supabase db push

# Reset database (⚠️ deletes all data)
supabase db reset

# Generate TypeScript types from database
npm run generate-types
```

### Edge Function Commands

```bash
# Create new edge function
supabase functions new function-name

# Test function locally
supabase functions serve function-name

# Deploy function
supabase functions deploy function-name

# View function logs
supabase functions logs function-name
```

---

## Project Structure Overview

```
6seven/
├── src/
│   ├── components/        # React components
│   │   ├── ui/            # Reusable UI components
│   │   ├── listings/      # Listing-related components
│   │   ├── wallet/        # Wallet components
│   │   └── trade/         # Trade offer components
│   ├── pages/             # Page components
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # Utility functions
│   ├── integrations/      # External service integrations
│   │   └── supabase/      # Supabase client & queries
│   ├── App.tsx            # Main app component
│   └── main.tsx           # Entry point
├── supabase/
│   ├── functions/         # Edge functions
│   └── migrations/        # Database migrations
├── public/                # Static assets
├── package.json           # Dependencies
└── vite.config.ts         # Vite configuration
```

---

## Making Your First Contribution

### 1. Create a Feature Branch

```bash
git checkout -b feature/your-feature-name
```

### 2. Make Your Changes

Edit files, add features, fix bugs, etc.

### 3. Test Your Changes

```bash
# Run tests
npm test

# Test locally
npm run dev

# Check linting
npm run lint
```

### 4. Commit Your Changes

```bash
git add .
git commit -m "Add: brief description of your changes"
```

**Commit Message Format:**
- `Add:` for new features
- `Fix:` for bug fixes
- `Update:` for improvements
- `Refactor:` for code refactoring
- `Docs:` for documentation changes

### 5. Push to GitHub

```bash
git push origin feature/your-feature-name
```

### 6. Create Pull Request

1. Go to GitHub repository
2. Click "New Pull Request"
3. Select your feature branch
4. Fill in PR template
5. Submit for review

---

## Troubleshooting

### Port Already in Use

If port 5173 is already in use:

```bash
# Kill process on port 5173
# macOS/Linux:
lsof -ti:5173 | xargs kill -9

# Windows:
netstat -ano | findstr :5173
taskkill /PID <PID> /F
```

Or change the port in `vite.config.ts`:

```typescript
export default defineConfig({
  server: {
    port: 3000  // Use different port
  }
})
```

### Supabase Connection Error

**Problem:** Can't connect to Supabase

**Solutions:**
1. Check your `.env.local` file has correct credentials
2. Verify Supabase project is running (not paused)
3. Check internet connection
4. Verify API key permissions in Supabase dashboard

### TypeScript Errors

**Problem:** TypeScript shows errors for Supabase types

**Solution:** Generate types from your database:

```bash
npm run generate-types
```

This creates `src/integrations/supabase/types.ts` with up-to-date types.

### Build Errors

**Problem:** Build fails with dependency errors

**Solution:**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear cache
npm cache clean --force
```

### Database Migration Errors

**Problem:** Migration fails to apply

**Solution:**
```bash
# Check migration status
supabase db status

# If stuck, reset (⚠️ deletes data)
supabase db reset

# Then reapply
supabase db push
```

---

## Development Workflow Tips

### Hot Reload

Vite provides instant hot reload. Save any file and see changes immediately in browser.

### Component Development

Use React Dev Tools browser extension to inspect component state and props.

### Database Queries

Test queries in Supabase Dashboard → SQL Editor before implementing in code.

### Edge Function Testing

Use `supabase functions serve` with `curl` or Postman to test functions locally.

### Styling

- Use Tailwind utility classes for styling
- Check `tailwind.config.ts` for custom theme values
- Use Radix UI components for complex UI patterns

---

## Next Steps

Now that you have 6Seven running locally:

1. **Explore the codebase**
   - Read through component files in `src/components/`
   - Review database schema in `supabase/migrations/`
   - Check edge functions in `supabase/functions/`

2. **Read the documentation**
   - [6SEVEN_PROJECT_OVERVIEW.md](6SEVEN_PROJECT_OVERVIEW.md) - Understand the vision
   - [6SEVEN_FEATURE_SPECS.md](6SEVEN_FEATURE_SPECS.md) - Learn feature requirements
   - [6SEVEN_TECHNICAL_BLUEPRINT.md](6SEVEN_TECHNICAL_BLUEPRINT.md) - Dive into architecture

3. **Pick up a task**
   - Check GitHub Issues for "good first issue" label
   - Review [6SEVEN_IMPLEMENTATION_ROADMAP.md](6SEVEN_IMPLEMENTATION_ROADMAP.md)
   - Ask in Discord #development channel

4. **Join the community**
   - Discord: #development channel
   - Weekly dev sync: Mondays 2pm GMT
   - Code review: PRs reviewed daily

---

## Useful Resources

### Documentation
- [React Docs](https://react.dev)
- [TypeScript Docs](https://www.typescriptlang.org/docs/)
- [Supabase Docs](https://supabase.com/docs)
- [Stripe Docs](https://stripe.com/docs)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Radix UI Docs](https://www.radix-ui.com/docs/primitives/overview/introduction)

### Tools
- [Supabase Studio](https://supabase.com/docs/guides/platform/studio) - Database GUI
- [Stripe Dashboard](https://dashboard.stripe.com) - Payment testing
- [React Dev Tools](https://react.dev/learn/react-developer-tools)

### Community
- Discord: #development
- GitHub Discussions
- Weekly dev meetings

---

## Getting Help

**Stuck? Need help?**

1. Check this guide's Troubleshooting section
2. Search existing GitHub Issues
3. Ask in Discord #development channel
4. Create a GitHub Issue with:
   - Clear description of problem
   - Steps to reproduce
   - Error messages
   - Your environment (OS, Node version, etc.)

**Response Time:**
- Discord: Usually < 1 hour during work hours
- GitHub Issues: Usually < 24 hours

---

## Development Best Practices

### Code Quality
- Write TypeScript, not JavaScript
- Use meaningful variable and function names
- Add comments for complex logic
- Keep functions small and focused

### Testing
- Write tests for new features
- Run tests before committing
- Aim for >80% code coverage

### Git Workflow
- Create feature branches from `main`
- Keep commits atomic and well-described
- Pull latest `main` before pushing
- Resolve conflicts locally

### Performance
- Use React Query for data fetching
- Implement proper loading states
- Optimize images before uploading
- Lazy load routes and heavy components

---

## Congratulations! 🎉

You now have 6Seven running locally and know how to contribute!

**Next recommended read:** [6SEVEN_PROJECT_OVERVIEW.md](6SEVEN_PROJECT_OVERVIEW.md)

---

**Guide Version:** 1.0  
**Last Updated:** 2025-11-19  
**Maintained by:** Development Team

**Questions?** development@sixseven.com
