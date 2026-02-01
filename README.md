# 🚀 Vanilla SPA Framework: Offline-First Edition
> **Latest: v1.2.0 "Adonis Alignment"** | **Origin: v1.0.0 "Experimental"**
> *A technical exploration into high-performance, zero-dependency SPA architecture.*

---

## 🏛️ Vision & Journey
This project was born out of a desire to understand the "magic" behind modern web frameworks by building one from the ground up using **Vanilla JavaScript**. 

It represents a journey from **pure DOM manipulation** to a sophisticated **Local-First / CQRS-driven** architecture, specifically designed to be the "on-ramp" for migrating to professional full-stack frameworks like **AdonisJS**.

### 🌟 Developer's Reflection
*"By building my own SPA routing and hydration engine, I've gained a fundamental understanding of how data flows between the server and client. Aligning this project with AdonisJS conventions wasn't just about folder names; it was about adopting the 'Convention over Configuration' mindset that defines world-class engineering."*

---

## 🛠️ The Three Core Engines

### 1. `spa-frame.js` (The Navigator)
Unlike heavy frameworks that use complex virtual DOMs, `spa-frame.js` provides a **lightweight interception layer**. It captures navigation events and updates the content area without a full page reload, maintaining a "smooth as silk" user experience with full browser history support.

### 2. `parser.js` (The Hydrator)
A custom-built **DOM-based Template Engine**. It scans the page for declarative data attributes (like `data-foreach`, `data-action`, and `data-count`) and hydrates them with live data. This allows for clean, logic-less HTML that feels dynamic but remains SEO-friendly.

### 3. `eventstore` (The Local-First brain)
Implementing **CQRS (Command Query Responsibility Segregation)**, this engine prioritizes local availability.
- **Offline-First**: User actions are captured as events locally.
- **Optimistic UI**: The dashboard updates instantly, syncing with the backend (Supabase/REST) in the background.
- **Audit Trail**: Every change is a discrete event, enabling "Time Travel" debugging and perfect data integrity.

---

## 📂 Project Architecture (Adonis-Ready)
The folder structure is strictly aligned with **AdonisJS v6** conventions to ensure a seamless migration path:

```
├── app/
│   ├── Collections/    # Data-fetching layer (The "Rules")
│   ├── Controllers/    # API Request Handlers
│   ├── Services/       # External Adapters (Supabase, Auth)
│   └── Lib/            # CQRS Core & Utilities
├── resources/
│   ├── assets/         # Unified CSS & SPA Engines
│   └── views/          # HTML Context Fragments & Layouts
├── start/              # App Bootstrapping & Kernel
└── vite.config.js      # Custom "Include" Transform Plugin
```

---

## 🚀 Why This Matters to Employers
- **Deep Technical Understanding**: No libraries were used for routing or state management. Every line is hand-coded.
- **Architecture over Code**: Demonstrates mastery of complex design patterns (Local-First, CQRS, Registry).
- **Tooling Mastery**: Features a custom **Vite Transform Plugin** that enables Laravel/Adonis-style `@include` directives during build time.
- **Framework Readiness**: The code is structured to be "AdonisJS compatible," proving readiness for professional enterprise-grade environments.

---

## � Release History

### **v1.2.0 — The "Adonis Alignment" (Current)**
- **Vision**: Full structural alignment with AdonisJS v6.
- **Features**: Dedicated Admin layouts, smart source auto-detection, and unified CLI-ready folder structure.

### **v1.0.0 — The "Experimental Origin"**
- **Vision**: "Experimental Open Source. Built for learning and fun."
- **Features**: The birth of the `parser.js` engine and the first successful `SPAFrame` navigation. A pure exploration of "What makes a framework tick?"

---

## �🛠 Quick Start

1. **Install Dependencies**: `npm install`
2. **Launch Dev Server**: `npm run dev`
3. **Build for Production**: `npm run build`

---

## 📜 Roadmap & Vision
- [x] Implement Vanilla SPA Navigation
- [x] Create DOM-based Hydration Engine
- [x] Integrate Offline-First Event Store
- [x] Align with AdonisJS 6 Structure
- [ ] Implement Service Worker for PWA Offline mode
- [ ] Migrate to Full AdonisJS Backend

---

## 📜 License
Experimental Open Source. Built for learning, optimized for speed.
