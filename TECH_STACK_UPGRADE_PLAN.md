# 🔧 Tech Stack Upgrade Plan
## Modernizing 6Seven for Enterprise Scale

**Current Stack**: React 18 + Vite + TypeScript + Supabase + Stripe  
**Target Stack**: Enterprise-grade, highly scalable, bleeding-edge technology

---

## Phase 1: Frontend Modernization (Week 1-4)

### 1.1 Immediate Upgrades (Week 1-2)

#### Install React 19 RC
```bash
# Upgrade to React 19 (with new compiler)
npm install react@rc react-dom@rc

# Benefits:
# - Automatic memoization (no more useMemo/useCallback needed)
# - Better Suspense and streaming SSR
# - New use() hook for promises
# - Server Components ready
```

#### Add Zustand for State Management
```bash
npm install zustand

# Why Zustand over Redux/Context?
# - 10x smaller bundle size
# - Zero boilerplate
# - Works perfectly with React 19
# - TypeScript-first
```

```typescript
// Example: Gamification Store
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface GamificationState {
  level: number;
  xp: number;
  streak: number;
  credits: number;
  
  // Actions
  addXP: (amount: number) => void;
  incrementStreak: () => void;
  resetStreak: () => void;
  addCredits: (amount: number) => void;
}

export const useGamification = create<GamificationState>()(
  persist(
    (set) => ({
      level: 1,
      xp: 0,
      streak: 0,
      credits: 0,
      
      addXP: (amount) => set((state) => {
        const newXP = state.xp + amount;
        const newLevel = Math.floor(newXP / 1000) + 1;
        return { xp: newXP, level: newLevel };
      }),
      
      incrementStreak: () => set((state) => ({ 
        streak: state.streak + 1 
      })),
      
      resetStreak: () => set({ streak: 0 }),
      
      addCredits: (amount) => set((state) => ({ 
        credits: state.credits + amount 
      })),
    }),
    {
      name: 'gamification-storage',
    }
  )
);
```

#### Upgrade TanStack Query to v5 (Already Done! ✅)
```typescript
// Enhanced query configuration for gamification
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 min
      gcTime: 10 * 60 * 1000,   // 10 min
      retry: (failureCount, error: any) => {
        // Don't retry on 404s or auth errors
        if (error?.status === 404 || error?.status === 401) {
          return false;
        }
        return failureCount < 2;
      },
    },
    mutations: {
      retry: 1,
      onError: (error) => {
        // Global error handling
        console.error('Mutation error:', error);
        toast.error('Something went wrong. Please try again.');
      },
    },
  },
});
```

#### Add Framer Motion for Animations
```bash
npm install framer-motion

# Already in dependencies! Just need to implement
```

```typescript
// Gamification animation components
import { motion, AnimatePresence } from 'framer-motion';

// Level up animation
export const LevelUpNotification = ({ level }: { level: number }) => (
  <AnimatePresence>
    <motion.div
      initial={{ scale: 0, rotate: -180, opacity: 0 }}
      animate={{ 
        scale: [0, 1.2, 1], 
        rotate: [- 180, 10, 0],
        opacity: 1 
      }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ 
        duration: 0.8,
        type: "spring",
        stiffness: 200 
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    >
      <motion.div
        animate={{
          boxShadow: [
            "0 0 20px rgba(255, 215, 0, 0.5)",
            "0 0 60px rgba(255, 215, 0, 0.8)",
            "0 0 20px rgba(255, 215, 0, 0.5)",
          ],
        }}
        transition={{ duration: 1.5, repeat: Infinity }}
        className="bg-gradient-to-br from-yellow-400 to-yellow-600 p-8 rounded-2xl text-white text-center"
      >
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 0.5, repeat: Infinity }}
          className="text-6xl mb-4"
        >
          ⭐
        </motion.div>
        <h2 className="text-4xl font-bold mb-2">LEVEL UP!</h2>
        <p className="text-2xl">You're now level {level}</p>
      </motion.div>
    </motion.div>
  </AnimatePresence>
);

// XP gain animation
export const XPGain = ({ amount }: { amount: number }) => (
  <motion.div
    initial={{ y: 0, opacity: 1, scale: 1 }}
    animate={{ y: -100, opacity: 0, scale: 1.5 }}
    transition={{ duration: 1, ease: "easeOut" }}
    className="fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-full font-bold"
  >
    +{amount} XP
  </motion.div>
);

// Streak counter with fire animation
export const StreakDisplay = ({ streak }: { streak: number }) => (
  <motion.div
    animate={{
      scale: streak > 0 ? [1, 1.1, 1] : 1,
    }}
    transition={{ duration: 0.5, repeat: streak > 0 ? Infinity : 0, repeatDelay: 1 }}
    className="flex items-center gap-2"
  >
    <motion.span
      animate={{
        rotate: streak > 0 ? [0, -10, 10, -10, 0] : 0,
      }}
      transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 1 }}
      className="text-2xl"
    >
      🔥
    </motion.span>
    <span className="text-xl font-bold">{streak} Day Streak</span>
  </motion.div>
);
```

### 1.2 Build Tool Upgrade (Week 2-3)

#### Consider Migrating to Bun
```bash
# Bun is 3x faster than Node.js
curl -fsSL https://bun.sh/install | bash

# Install dependencies with Bun
bun install

# Run dev server
bun run dev

# Build
bun run build

# Benefits:
# - 3x faster npm install
# - Built-in TypeScript support
# - Drop-in Node.js replacement
# - Native bundler (faster than Vite?)
```

#### Or Stick with Vite but Optimize
```typescript
// vite.config.ts - Optimized for performance
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { compression } from 'vite-plugin-compression2';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    react({
      // Use React Fast Refresh
      fastRefresh: true,
    }),
    
    // Gzip compression
    compression({
      algorithm: 'gzip',
      threshold: 10240, // Only compress files > 10KB
    }),
    
    // Brotli compression (even better than gzip)
    compression({
      algorithm: 'brotliCompress',
      threshold: 10240,
    }),
    
    // Bundle analyzer
    visualizer({
      filename: './dist/stats.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
    }),
  ],
  
  build: {
    // Target modern browsers for smaller bundles
    target: 'es2020',
    
    // Optimize chunk splitting
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
          'query-vendor': ['@tanstack/react-query'],
          'stripe-vendor': ['@stripe/stripe-js', '@stripe/react-stripe-js'],
          
          // Route-based code splitting handled automatically
        },
      },
    },
    
    // Minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.log in production
        drop_debugger: true,
      },
    },
    
    // Source maps only for errors
    sourcemap: 'hidden',
  },
  
  // Optimize deps
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@tanstack/react-query',
    ],
  },
  
  // Server config
  server: {
    port: 3000,
    strictPort: false,
    hmr: {
      overlay: true,
    },
  },
  
  // Preview config
  preview: {
    port: 3000,
  },
});
```

### 1.3 Monorepo Setup (Week 3-4)

```bash
# Install Turborepo for monorepo management
npm install -g turbo

# Project structure
6Seven/
├── apps/
│   ├── web/                 # Main web app (current app)
│   ├── mobile/              # React Native app
│   ├── admin/               # Admin dashboard (separate deployment)
│   └── landing/             # Marketing site (Astro/Next.js)
├── packages/
│   ├── ui/                  # Shared UI components
│   ├── gamification/        # Gamification logic
│   ├── api-client/          # API client library
│   ├── config/              # Shared configs (ESLint, TypeScript)
│   └── types/               # Shared TypeScript types
├── services/
│   ├── api-gateway/         # Kong or custom gateway
│   ├── listings-service/    # Go microservice
│   ├── gamification-engine/ # Python service
│   └── ml-service/          # Python ML inference
└── infrastructure/
    ├── terraform/           # IaC
    └── kubernetes/          # K8s configs
```

```json
// turbo.json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "outputs": []
    },
    "type-check": {
      "outputs": []
    }
  }
}
```

---

## Phase 2: Backend Architecture (Week 5-8)

### 2.1 Microservices Strategy

#### Service 1: Listings Service (Go)
```go
// Why Go?
// - 10x faster than Node.js
// - Low memory footprint
// - Perfect for high-throughput services
// - Excellent for microservices

package main

import (
    "github.com/gofiber/fiber/v2"
    "github.com/gofiber/fiber/v2/middleware/cache"
    "github.com/gofiber/fiber/v2/middleware/limiter"
)

func main() {
    app := fiber.New(fiber.Config{
        Prefork: true, // Multi-process for performance
    })
    
    // Rate limiting
    app.Use(limiter.New(limiter.Config{
        Max: 100,
        Duration: time.Minute,
    }))
    
    // Response caching
    app.Use(cache.New(cache.Config{
        Expiration: 5 * time.Minute,
        CacheControl: true,
    }))
    
    // Routes
    app.Get("/api/listings", getListings)
    app.Get("/api/listings/:id", getListing)
    app.Post("/api/listings", createListing)
    
    app.Listen(":8080")
}

func getListings(c *fiber.Ctx) error {
    // Fetch from Supabase
    // Apply filters
    // Return JSON
    return c.JSON(listings)
}
```

#### Service 2: Gamification Engine (Python + Redis)
```python
# Why Python?
# - Best for ML/AI integration
# - Great libraries for game mechanics
# - Easy to prototype and iterate

from fastapi import FastAPI, BackgroundTasks
from redis import Redis
from typing import Dict, List
import asyncio

app = FastAPI()
redis = Redis(host='redis', port=6379, decode_responses=True)

class GamificationEngine:
    """
    Central engine for all gamification logic
    """
    
    async def add_xp(self, user_id: str, amount: int, reason: str):
        """Add XP and check for level ups"""
        
        # Get current XP
        current_xp = int(redis.get(f"user:{user_id}:xp") or 0)
        new_xp = current_xp + amount
        
        # Update XP
        redis.set(f"user:{user_id}:xp", new_xp)
        
        # Check for level up
        current_level = self.calculate_level(current_xp)
        new_level = self.calculate_level(new_xp)
        
        events = []
        
        if new_level > current_level:
            events.append({
                'type': 'level_up',
                'old_level': current_level,
                'new_level': new_level,
                'rewards': self.get_level_rewards(new_level)
            })
            
            # Check for milestone levels (6, 7, 13, etc.)
            if new_level in [6, 7, 13, 67]:
                events.append({
                    'type': 'milestone',
                    'level': new_level,
                    'special_rewards': self.get_milestone_rewards(new_level)
                })
        
        # Log XP event
        await self.log_event(user_id, 'xp_gained', {
            'amount': amount,
            'reason': reason,
            'events': events
        })
        
        return {
            'xp': new_xp,
            'level': new_level,
            'events': events
        }
    
    async def check_prediction(
        self, 
        user_id: str, 
        listing_id: str, 
        predicted: int, 
        actual: int
    ):
        """Check if prediction was correct and award rewards"""
        
        correct = (predicted == actual)
        
        if correct:
            # Get current streak
            streak = int(redis.get(f"user:{user_id}:streak") or 0)
            new_streak = streak + 1
            redis.set(f"user:{user_id}:streak", new_streak)
            
            # Calculate rewards with streak multiplier
            base_credits = 1.0
            multiplier = self.get_streak_multiplier(new_streak)
            credits = base_credits * multiplier
            
            # Award credits and XP
            await self.add_credits(user_id, credits)
            await self.add_xp(user_id, 150, f"Correct prediction (streak: {new_streak})")
            
            return {
                'correct': True,
                'streak': new_streak,
                'credits_earned': credits,
                'multiplier': multiplier
            }
        else:
            # Reset streak
            redis.set(f"user:{user_id}:streak", 0)
            
            # Consolation XP
            await self.add_xp(user_id, 10, "Prediction attempt")
            
            return {
                'correct': False,
                'streak': 0,
                'credits_earned': 0
            }
    
    def get_streak_multiplier(self, streak: int) -> float:
        """Calculate reward multiplier based on streak"""
        if streak >= 20:
            return 6.0
        elif streak >= 10:
            return 4.0
        elif streak >= 7:
            return 3.0
        elif streak >= 5:
            return 2.0
        elif streak >= 3:
            return 1.5
        else:
            return 1.0
    
    async def trigger_lucky_seven(self, user_id: str):
        """Random lucky 7 event"""
        
        # 1 in 77 chance
        import random
        if random.randint(1, 77) == 7:
            rewards = random.choice([
                {'type': 'credits', 'amount': 7.77},
                {'type': 'free_shipping', 'valid_days': 7},
                {'type': 'listing_boost', 'count': 1},
                {'type': 'xp', 'amount': 777},
            ])
            
            # Store reward for user to claim
            redis.lpush(f"user:{user_id}:rewards", json.dumps(rewards))
            redis.expire(f"user:{user_id}:rewards", 86400 * 7)  # 7 days
            
            # Notify user
            await self.send_notification(user_id, {
                'title': '🎰 LUCKY 7!',
                'message': f'You triggered a mystery reward: {rewards["type"]}!',
                'action': 'claim_reward'
            })
            
            return True
        
        return False

@app.post("/api/gamification/xp")
async def add_xp_endpoint(
    user_id: str,
    amount: int,
    reason: str,
    background_tasks: BackgroundTasks
):
    engine = GamificationEngine()
    result = await engine.add_xp(user_id, amount, reason)
    
    # Check for lucky 7 in background
    background_tasks.add_task(engine.trigger_lucky_seven, user_id)
    
    return result
```

### 2.2 API Gateway (Kong)

```yaml
# kong.yml - API Gateway configuration
_format_version: "3.0"

services:
  - name: listings-service
    url: http://listings:8080
    routes:
      - name: listings-route
        paths:
          - /api/listings
        methods:
          - GET
          - POST
        plugins:
          - name: rate-limiting
            config:
              minute: 100
              hour: 1000
          - name: response-caching
            config:
              ttl: 300
              
  - name: gamification-service
    url: http://gamification:8000
    routes:
      - name: gamification-route
        paths:
          - /api/gamification
        plugins:
          - name: jwt
            config:
              secret_is_base64: false
          - name: rate-limiting
            config:
              minute: 200
              
  - name: supabase-functions
    url: https://your-project.supabase.co/functions/v1
    routes:
      - name: edge-functions-route
        paths:
          - /api/functions
```

### 2.3 Redis Cluster Setup

```yaml
# docker-compose.yml for Redis Cluster
version: '3.8'

services:
  redis-master-1:
    image: redis:7-alpine
    command: redis-server --appendonly yes --cluster-enabled yes
    ports:
      - "6379:6379"
    volumes:
      - redis-data-1:/data
      
  redis-master-2:
    image: redis:7-alpine
    command: redis-server --appendonly yes --cluster-enabled yes
    ports:
      - "6380:6379"
    volumes:
      - redis-data-2:/data
      
  redis-master-3:
    image: redis:7-alpine
    command: redis-server --appendonly yes --cluster-enabled yes
    ports:
      - "6381:6379"
    volumes:
      - redis-data-3:/data
      
  redis-replica-1:
    image: redis:7-alpine
    command: redis-server --appendonly yes --cluster-enabled yes --slaveof redis-master-1 6379
    volumes:
      - redis-replica-data-1:/data
      
  redis-replica-2:
    image: redis:7-alpine
    command: redis-server --appendonly yes --cluster-enabled yes --slaveof redis-master-2 6379
    volumes:
      - redis-replica-data-2:/data
      
  redis-replica-3:
    image: redis:7-alpine
    command: redis-server --appendonly yes --cluster-enabled yes --slaveof redis-master-3 6379
    volumes:
      - redis-replica-data-3:/data

volumes:
  redis-data-1:
  redis-data-2:
  redis-data-3:
  redis-replica-data-1:
  redis-replica-data-2:
  redis-replica-data-3:
```

---

## Phase 3: Database Optimization

### 3.1 Connection Pooling

```typescript
// Supabase with connection pooling
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey, {
  db: {
    schema: 'public',
  },
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  global: {
    headers: {
      'x-application-name': '6seven-web',
    },
  },
  // Connection pooling via Supavisor
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// For server-side/admin operations, use service role
export const supabaseAdmin = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
```

### 3.2 Query Optimization

```sql
-- Create materialized view for leaderboards
CREATE MATERIALIZED VIEW leaderboard_snapshot AS
SELECT 
  u.id,
  u.username,
  u.avatar_url,
  gp.level,
  gp.xp_points,
  gp.prediction_streak,
  gp.tier,
  ROW_NUMBER() OVER (ORDER BY gp.xp_points DESC) as rank
FROM 
  profiles u
  JOIN gamification_profiles gp ON u.id = gp.user_id
WHERE 
  u.deleted_at IS NULL
ORDER BY 
  gp.xp_points DESC
LIMIT 1000;

-- Refresh materialized view every 5 minutes
CREATE OR REPLACE FUNCTION refresh_leaderboard()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY leaderboard_snapshot;
END;
$$ LANGUAGE plpgsql;

-- Schedule refresh (using pg_cron extension)
SELECT cron.schedule('refresh-leaderboard', '*/5 * * * *', 'SELECT refresh_leaderboard()');

-- Create indexes for common queries
CREATE INDEX CONCURRENTLY idx_listings_six_seven ON listings(six_seven_rating) 
  WHERE six_seven_rating IS NOT NULL;
  
CREATE INDEX CONCURRENTLY idx_listings_boost_active ON listings(boost_expires_at) 
  WHERE boost_active = true;
  
CREATE INDEX CONCURRENTLY idx_prediction_games_user_recent ON prediction_games(user_id, prediction_time DESC);

CREATE INDEX CONCURRENTLY idx_gamification_profiles_tier_xp ON gamification_profiles(tier, xp_points DESC);
```

---

## Phase 4: Monitoring & Observability

### 4.1 Setup Datadog

```typescript
// datadog-config.ts
import { datadogRum } from '@datadog/browser-rum';
import { datadogLogs } from '@datadog/browser-logs';

// Initialize Real User Monitoring
datadogRum.init({
  applicationId: process.env.VITE_DATADOG_APP_ID!,
  clientToken: process.env.VITE_DATADOG_CLIENT_TOKEN!,
  site: 'datadoghq.com',
  service: '6seven-web',
  env: process.env.MODE,
  version: process.env.VITE_APP_VERSION || '1.0.0',
  sessionSampleRate: 100,
  sessionReplaySampleRate: 20,
  trackUserInteractions: true,
  trackResources: true,
  trackLongTasks: true,
  defaultPrivacyLevel: 'mask-user-input',
});

// Initialize Logs
datadogLogs.init({
  clientToken: process.env.VITE_DATADOG_CLIENT_TOKEN!,
  site: 'datadoghq.com',
  forwardErrorsToLogs: true,
  sessionSampleRate: 100,
});

// Custom logging helper
export const logger = {
  info: (message: string, context?: object) => {
    datadogLogs.logger.info(message, context);
  },
  error: (message: string, error?: Error, context?: object) => {
    datadogLogs.logger.error(message, { ...context, error: error?.stack });
  },
  gamification: (event: string, data: object) => {
    datadogLogs.logger.info(`gamification.${event}`, data);
    datadogRum.addAction(event, data);
  },
};

// Track custom business metrics
export const trackMetric = (name: string, value: number, tags?: object) => {
  datadogRum.addAction(name, { value, ...tags });
};
```

### 4.2 Setup Sentry for Error Tracking

```typescript
// sentry-config.ts
import * as Sentry from "@sentry/react";
import { BrowserTracing } from "@sentry/tracing";

Sentry.init({
  dsn: process.env.VITE_SENTRY_DSN,
  integrations: [
    new BrowserTracing({
      routingInstrumentation: Sentry.reactRouterV6Instrumentation(
        React.useEffect,
        useLocation,
        useNavigationType,
        createRoutesFromChildren,
        matchRoutes
      ),
    }),
  ],
  
  // Performance monitoring
  tracesSampleRate: 0.1, // 10% of transactions
  
  // Session replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  
  // Release tracking
  release: process.env.VITE_APP_VERSION,
  environment: process.env.MODE,
  
  // Filter out sensitive data
  beforeSend(event, hint) {
    // Remove auth tokens from breadcrumbs
    if (event.breadcrumbs) {
      event.breadcrumbs = event.breadcrumbs.map(breadcrumb => {
        if (breadcrumb.data?.headers) {
          delete breadcrumb.data.headers.authorization;
        }
        return breadcrumb;
      });
    }
    return event;
  },
});
```

---

## Phase 5: Deployment & CI/CD

### 5.1 GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run linter
        run: npm run lint
      
      - name: Type check
        run: npm run type-check
      
      - name: Run tests
        run: npm test
  
  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        run: npm run build
        env:
          VITE_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
      
      - name: Upload build artifacts
        uses: actions/upload-artifact@v3
        with:
          name: dist
          path: dist/
  
  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Download build artifacts
        uses: actions/download-artifact@v3
        with:
          name: dist
          path: dist/
      
      - name: Deploy to Cloudflare Pages
        uses: cloudflare/pages-action@v1
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          projectName: 6seven
          directory: dist
          gitHubToken: ${{ secrets.GITHUB_TOKEN }}
```

---

## Summary: Upgrade Priority

### Week 1-2: Quick Wins
- ✅ Upgrade to React 19 RC
- ✅ Add Zustand for state management
- ✅ Implement Framer Motion animations
- ✅ Setup Sentry & Datadog

### Week 3-4: Architecture
- ✅ Setup monorepo with Turborepo
- ✅ Create shared packages
- ✅ Optimize Vite config

### Week 5-6: Backend
- ✅ Create Go listings microservice
- ✅ Create Python gamification service
- ✅ Setup Redis cluster
- ✅ Setup Kong API gateway

### Week 7-8: Database
- ✅ Add gamification tables
- ✅ Create materialized views
- ✅ Optimize indexes
- ✅ Setup connection pooling

### Week 9+: Scale
- ✅ Kubernetes deployment
- ✅ Auto-scaling configuration
- ✅ Load testing
- ✅ Performance tuning

