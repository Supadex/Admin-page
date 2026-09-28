# SupaDex Admin & Governance Architecture (`/admin`)

## 1. Executive Summary
The **SupaDex Admin Portal** is the operational console for protocol guardians, DAO operators, and market makers to initialize pools, configure multi-curve parameters, calibrate Dynamic LVR decay rates, monitor emergency circuit breakers, and collect protocol fees.

---

## 2. Directory Structure & Module Breakdown

```
admin/src/
├── assets/                  # Administrative icons, system badges
├── components/
│   ├── ui/                  # Shared Apple-minimalist UI Primitives (Button, Modal, Card, Table, etc.)
│   ├── admin/               # Domain-specific Admin Components
│   │   ├── CircuitBreaker/  # 4-tier emergency trigger toggles and status indicators
│   │   ├── PoolWizard/      # Multi-step pool creation & curve parameter configurator
│   │   ├── LVRCalibrator/   # Volatility decay half-life and spread tuning curves
│   │   ├── FeeCollector/    # Protocol fee claims withdrawal console
│   │   └── HookInspector/   # Gas limit, whitelist status & hook byte code explorer
│   └── layout/              # Admin Shell (Collapsible Sidebar, Header, Breadcrumbs)
├── config/                  # Admin app configuration, guardian multisigs, RPC endpoints
├── constants/               # Contract ABIs, CircuitBreaker addresses, Timelock addresses
├── context/                 # AdminAuthContext, ThemeContext, AlertContext
├── hooks/
│   ├── useTheme.ts          # Light / Dark theme controller
│   ├── useCircuitBreaker.ts # Emergency pause state reading and trigger dispatch
│   ├── usePoolFactory.ts    # Pool initialization with CLAMM, BinAMM, and Stable curves
│   ├── useLVRConfig.ts      # Read/write dynamic fee decay parameters
│   └── useProtocolFees.ts   # Treasury claim balances and withdrawal actions
├── pages/                   # Lazy-Loaded Admin Routes
│   ├── Dashboard/           # Protocol health overview, active pools, emergency status
│   ├── Pools/               # Pool directory, parameter editor, liquidity depth
│   ├── CreatePool/          # Pool Initialization Wizard
│   ├── CircuitBreaker/      # 4-Tier Emergency Pause Controls & Guardian Management
│   ├── LVRSettings/         # Dynamic LVR Engine & Volatility Oracle Parameters
│   ├── Fees/                # Protocol Fee Treasury Claim Console
│   └── Hooks/               # Hook & Plugin Dispatcher Registry
├── providers/               # Web3, Auth, Theme, QueryClient Providers
├── routes/                  # Admin routes with RBAC guards & Suspense boundaries
├── types/                   # TypeScript interfaces for Admin, Governance, and Pool Keys
└── utils/                   # Formatting, BigInt calculations, permission checks
```

---

## 3. Emergency Circuit Breaker Architecture

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              4-TIER CIRCUIT BREAKER SYSTEM                             │
├─────────────────┬──────────────────────────────────┬───────────────────────────────────┤
│ Tier Level      │ Target Scope                     │ Allowed Actions When Triggered    │
├─────────────────┼──────────────────────────────────┼───────────────────────────────────┤
│ Tier 0 (Normal) │ Protocol Operates Normally       │ All Swaps, Liquidity, Plugins OK  │
│ Tier 1 (Hook)   │ External Hooks Isolated          │ Native Swaps OK, Hooks Bypassed   │
│ Tier 2 (Curve)  │ Specific Curve Engine Paused     │ Other Curves OK, Withdrawals OK   │
│ Tier 3 (Global) │ Full Protocol Lock (Emergency)   │ Withdrawals Only, Swaps Frozen    │
└─────────────────┴──────────────────────────────────┴───────────────────────────────────┘
```
