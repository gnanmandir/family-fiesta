# Family Fiesta 2026 — Food RSVP & Ordering Portal

<div align="center">

![Family Fiesta Banner](src/assets/images/family_fiesta_logo_new.png)

**Official Food RSVP, Coupon Allocation & Event Management Platform for Gnan Mandir**

[![React](https://img.shields.io/badge/React-19.0.1-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8.2-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.2.3-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.1.14-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Turso](https://img.shields.io/badge/Turso-libSQL-00E599?logo=turso&logoColor=black)](https://turso.tech/)
[![License](https://img.shields.io/badge/License-Proprietary-red)](#)

</div>

---

## 📌 Overview

**Family Fiesta 2026** is a high-throughput, real-time food RSVP and digital coupon distribution system built for Gnan Mandir's annual community gathering. It handles attendee registration, guest-tier meal allowance calculations, 100% Satvik pure-veg food ordering, live kitchen preparation tracking, and multi-tier administrative governance.

The platform is designed with an **offline-resilient, real-time sync architecture**, combining **Turso (libSQL)** for cloud-edge persistence with client-side caching and **BroadcastChannel** inter-tab synchronization.

---

## ✨ Core Features

### 👨‍👩‍👧‍👦 1. Attendee Portal (Parents & Students)
- **Fast Autocomplete Sign-In**: Instant lookup by Student Name and Gurukul GM Number with built-in input sanitation.
- **Dynamic Tier-Based Meal Allowance**:
  - Automatically calculates total authorized dining allowance based on guest count (1 to 4 attendees).
  - Enforces budget caps with real-time cart validation.
- **Satvik Food Menu**:
  - Browse food stalls (e.g., Live Chaat, Punjabi, Chinese, Desserts, Beverages).
  - Dietary certification flags: 100% Satvik Pure Veg, Jain preparation options, No Onion/Garlic.
- **Digital Meal Pass & Receipts**:
  - Unique QR/Order token generation (`FLM-2026-XXXX`).
  - Printable and downloadable PDF coupon slips and thermal receipt formats.
  - Infinite order editing window until intake phase conclusion or manual freeze.

### 🧑‍🏫 2. Dedicated Staff Portal (`/staff`)
- **Independent Entrypoint**: Completely separated route and interface for faculty and volunteers (`#staff-login`).
- **Staff Dining Allowance**: Custom meal allowance allocations tailored for event staff.
- **Schedule Auto-Halt Banners**: Real-time alerts when the ordering window has concluded.

### 🛡️ 3. Administrative Control Center
Multi-tiered role hierarchy with granular privilege boundaries:

| Role | Access Level | Responsibilities |
| :--- | :--- | :--- |
| **Normal Admin** | Kitchen / Stall View | View live incoming orders, update preparation status (`Pending` → `Preparing` → `Ready` → `Delivered`), and print kitchen tokens. |
| **Super Admin** | Operations Level | Manage student & staff rosters, edit menu items & pricing, export reports, and perform authorized order register wipes. |
| **Supreme Boss** | Full Governance | All Super Admin privileges + exclusive **System Controls Switchboard** and **Login History & Audit Trail**. |

#### 📊 Live Orders & Analytics
- Real-time order monitoring with sub-second status updating.
- Filter by category (Parent, Student, Staff), food stall, order status, or payment state.
- One-click export to Excel (`.xlsx`) and CSV.
- Interactive charts showing revenue, guest distribution, peak ordering times, and stall-wise sales breakdown.

#### ⚙️ Operations & Register Wipe
- Master authorization password protection for destructive actions.
- Granular register wiping:
  - Wipe Parent orders only.
  - Wipe Student orders only.
  - Wipe Staff orders only.
  - Full system reset / wipe all orders simultaneously.

#### 🎛️ System Control Switchboard (Boss Exclusive)
Master toggles to govern platform operations on the fly:
- **Food Ordering Portal & Schedule**: Global kill switch for attendee ordering and automated schedules.
- **Intake Phase Switching**: Restrict or permit switching active intake phases (`Parent`, `Student`, `Staff`, `Closed`).
- **Order Wipe Controls**: Restrict or permit Super Admins from executing order register wipes.
- **Roster Management**: Restrict or permit additions, updates, or removals of student/staff accounts.

#### 📜 Login History & Audit Trail (Boss Exclusive)
- Real-time logging of all administrative sign-ins and system modifications.
- Tracks admin role, username, device/browser fingerprint, user-agent, and exact action details.
- All timestamps formatted in **Indian Standard Time (IST)** with relative elapsed timers (`2 mins ago`, etc.).
- Live presence indicator showing active online admins across devices via heartbeat ping.

### ⏰ 4. Automated Intake Scheduler
- Configure automated order opening and closing windows.
- Automatically transitions the ordering portal from open to halted when the deadline is reached.
- Complete timezone awareness locked to **Indian Standard Time (Asia/Kolkata)**.

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend Framework** | [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) |
| **Build Tool** | [Vite 6](https://vitejs.dev/) |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com/) |
| **Icons** | [Lucide React](https://lucide.dev/) |
| **Animations** | [Motion (Framer Motion)](https://motion.dev/) |
| **Charts** | [Recharts](https://recharts.org/) |
| **Database** | [Turso libSQL](https://turso.tech/) (Edge SQLite) |
| **Document Generation** | [jsPDF](https://github.com/parallax/jsPDF) + HTML5 Canvas |
| **Spreadsheets** | [SheetJS (xlsx)](https://sheetjs.com/) |

---

## 📁 Project Structure

```text
src/
├── assets/                  # Brand logos, stamp assets, and dish photography
├── components/              # UI components
│   ├── admin/               # Admin dashboard views & controllers
│   │   ├── AdminDashboard.tsx      # Main admin console & navigation
│   │   ├── AdminLoginModal.tsx     # Admin authentication dialog
│   │   ├── AnalyticsCharts.tsx     # KPI metrics & visual chart analytics
│   │   ├── FoodManager.tsx         # Menu catalog & stall management
│   │   ├── GuestManager.tsx        # Staff & guest management
│   │   ├── LoginHistoryManager.tsx # Boss audit trail & login logs
│   │   ├── OrderTable.tsx          # Real-time order table & kitchen slips
│   │   ├── PricingManager.tsx      # Pricing tiers & attendee budget configuration
│   │   └── StudentManager.tsx      # Student roster & GM number management
│   ├── AlreadySubmittedView.tsx    # Submitted order view with receipt download
│   ├── CartDrawer.tsx              # Slide-over cart and budget calculator
│   ├── Header.tsx                  # Top navigation & session header
│   ├── HomePage.tsx                # Attendee count selection & tier preview
│   ├── LoginPage.tsx               # Student/parent authentication screen
│   ├── MenuPage.tsx                # Food catalog, stall tabs & dish cards
│   ├── OrderConfirmation.tsx       # Order placed screen with coupon tokens
│   └── StaffLoginPage.tsx          # Dedicated staff authentication screen
├── data/                    # Seed data (students, staff, menu items)
├── services/                # API and database persistence layer
│   ├── api.ts               # Unified API client with offline fallback
│   ├── storage.ts           # LocalStorage caching & device lock storage
│   ├── supabase.ts          # Supabase backup/migration service
│   └── turso.ts             # Turso libSQL client & remote queries
├── utils/                   # Business logic helpers
│   ├── budget.ts            # Attendee allowance calculation logic
│   ├── pdfGenerator.ts      # Digital meal coupon & PDF receipt generator
│   └── schedule.ts          # IST schedule evaluator & time formatters
├── App.tsx                  # Root application orchestrator
├── main.tsx                 # Entrypoint
└── types.ts                 # TypeScript data contracts & interfaces
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm** or **pnpm** or **yarn**

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/gnanmandir/family-fiesta.git
   cd family-fiesta/RSVP-Food-Frontend-main
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` or `.env.local` file in the root directory:
   ```env
   # Turso Database Configuration (libSQL)
   VITE_TURSO_DATABASE_URL=libsql://your-database-name.turso.io
   VITE_TURSO_AUTH_TOKEN=your-turso-auth-token
   ```
   > **Note:** If Turso credentials are not configured, the application automatically falls back to offline LocalStorage mode with full functional support.

4. **Start the development server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

5. **Build for Production**:
   ```bash
   npm run build
   ```
   The compiled assets will be output to the `dist/` directory.

---

## 🔑 Administrative Access

- **Admin Access Point**: Click the "Admin Access" shortcut on the login page or press the admin trigger.
- **Dedicated Staff Route**: Navigate directly to `#staff-login` or click the Staff Portal link.
- **Authorization Password**: Order wipe actions and system overrides require the master authorization password (`niruma0212` by default, configurable in the admin dashboard).

---

## 📄 License

This software is developed exclusively for **Gnan Mandir Family Fiesta 2026**. All rights reserved.
