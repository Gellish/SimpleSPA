# micro.js - Ultra-lightweight SPA Framework

`micro.js` is a minimalist Single Page Application (SPA) library designed for speed, simplicity, and zero dependencies. It provides seamless page transitions by intercepting link clicks and dynamically swapping content without a full browser reload.

## Core Features

- **🚀 Instant Navigation**: Intercepts `<a>` tags to fetch and swap content without reloading the page.
- **📦 Smart Caching**: Automatically caches fetched pages to ensure near-instant back/forward navigation.
- **🔍 Auto-Content Detection**: Intelligently finds the main content area (prioritizes `<main>`, then `[role="main"]`, `#spa-content`, etc.) to perform the swap.
- **🎨 State Synchronization**: Syncs `document.title` and `body.className` between pages to maintain page-specific styles and SEO.
- **🔗 Active Link Tracking**: Automatically updates the `.active` class on navigation links based on the current URL.
- **🛑 Security First**: Built-in protection against the `file://` protocol to prevent CORS issues in local development.

## How It Works

1.  **Intercept**: The framework listens for clicks on internal links.
2.  **Fetch**: When a link is clicked, it fetches the target HTML in the background.
3.  **Parse**: It uses the browser's `DOMParser` to extract the new content.
4.  **Swap**: It replaces the content of the current `<main>` element with the new content.
5.  **History**: It updates the browser history using the `history.pushState` API.

## Usage

### 1. Structure your HTML
Ensure your pages have a `<main>` tag or a div with `id="content"` where the dynamic content will reside.

```html
<body>
    <nav>
        <a href="index.html">Home</a>
        <a href="about.html">About</a>
    </nav>
    <main>
        <!-- Dynamic content goes here -->
    </main>
    <script type="module" src="assets/js/main.js"></script>
</body>
```

### 2. Initialize the Framework
In your `main.js`, simply import and call `init()`.

```javascript
import SPA from './micro.js';

SPA.init();
```

## Security Considerations

> [!IMPORTANT]
> Because `micro.js` uses the `fetch` API, it **requires a web server** to run. Opening `index.html` directly from your file system (`file:///`) will be blocked by the browser's security policy.

## Technical Details

The framework uses an "Auto-Swap" logic to find the best container for content replacement. It searches in the following order:
1. `<main>`
2. `[role="main"]`
3. `#spa-content`
4. `#content`
5. The first large `<div>` that is not a `<nav>` or `<header>`.
