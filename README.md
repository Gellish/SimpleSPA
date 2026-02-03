# MicroFramework 🚀

A high-performance, standalone Single Page Application (SPA) engine designed for modern web exploration and instant content delivery.

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

## 📦 Installation

```bash
npm install @gellish/micro-framework
```

## 🚀 Key Features

- **⚡ Instant Navigation**: Zero-reload content swapping using the Fetch-Parse-Swap lifecycle.
- **📊 Performance Dashboard**: Built-in support for real-time navigation logging and system monitoring.
- **🛡️ Multi-Stage Status**: Integrated status badge with distinct states (`SYNCED`, `FETCHING`, `ONLINE`).
- **🔗 Custom Events**: Dispatches `spa:navigated` events for total UI synchronization.
- **🍱 Clean SEO**: Automatic synchronization of `document.title`, `body.className`, and container state.

## 🛠️ Usage

### 1. Initialize
Import the ESM-ready core and initialize the lifecycle.

```javascript
import SPA from '@gellish/micro-framework';
SPA.init();
```

### 2. Monitor Events
Listen to the technical pulse of your application.

```javascript
window.addEventListener('spa:navigated', (e) => {
    const { url, time } = e.detail;
    console.log(`System Online: ${url} at ${time}`);
});
```

## 📜 Documentation
Check out the full [Technical Documentation Portal](https://github.com/Gellish/MicroFramework/blob/main/docs.html) for Architecture details and API Reference.

## ⚖️ License
Licensed under the **Apache License, Version 2.0**.
