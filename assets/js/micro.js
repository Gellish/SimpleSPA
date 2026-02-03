/**
 * Standalone SPA Framework (Portable Version of micro.ts)
 */

const SPA = {
    cache: new Map(),

    async navigate(url, push = true) {
        if (!url) return;

        const targetUrl = new URL(url, location.href);
        if (targetUrl.origin !== location.origin) {
            location.href = url;
            return;
        }

        // Avoid re-loading same page
        if (push && targetUrl.pathname === location.pathname && targetUrl.search === location.search) {
            return;
        }

        document.body.classList.add('spa-loading');

        try {
            let html;
            if (this.cache.has(url)) {
                html = this.cache.get(url);
                console.log('[SPA] Serving from cache:', url);
            } else {
                const res = await fetch(url);
                if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
                html = await res.text();
                this.cache.set(url, html);
            }

            const doc = new DOMParser().parseFromString(html, 'text/html');

            // --- AUTO DETECTION LOGIC ---
            // Prioritize <main>, then [role="main"], then old school IDs, then first large div
            const findContent = (root) => {
                return root.querySelector('main') ||
                    root.querySelector('[role="main"]') ||
                    root.querySelector('#spa-content') ||
                    root.querySelector('#content') ||
                    root.querySelector('body > div:not(nav):not(header)');
            };

            const newContent = findContent(doc);
            const currentContent = findContent(document);

            if (newContent && currentContent) {
                console.log('[SPA] Auto-detected swap area:', newContent.tagName);

                if (push) {
                    history.pushState(null, '', url);
                }

                // Sync Container Classes (Crucial for page-specific layouts)
                currentContent.className = newContent.className;

                // Sync Body Classes (important for page-specific styles)
                document.body.className = doc.body.className;

                // Update Title
                document.title = doc.title;

                // Update content
                currentContent.innerHTML = newContent.innerHTML;

                // Dispatch Custom Event for UI Showcase
                window.dispatchEvent(new CustomEvent('spa:navigated', {
                    detail: { url: url, time: new Date().toLocaleTimeString() }
                }));

                // Update Active Link
                this.updateActiveLinks();

                const ind = document.getElementById('spa-indicator');
                if (ind) {
                    ind.className = 'spa-status-online';
                    ind.textContent = "SYSTEM ONLINE";
                    setTimeout(() => {
                        ind.textContent = "STANDBY";
                    }, 2000);
                }

                window.scrollTo(0, 0);
            } else {
                console.warn('[SPA] Could not find a matching content area (like <main>) to swap. Falling back to reload.');
                location.href = url;
            }
        } catch (err) {
            console.error('[SPA] Navigation failed:', err);
            location.href = url;
        } finally {
            document.body.classList.remove('spa-loading');
        }
    },

    updateActiveLinks() {
        const path = location.pathname.split('/').pop() || 'index.html';
        document.querySelectorAll('nav a').forEach(a => {
            const href = a.getAttribute('href');
            if (href === path) a.classList.add('active');
            else a.classList.remove('active');
        });
    },

    init() {
        console.log('[SPA] Initializing framework...');

        // Universal Security Check: Detect if running via file:// protocol
        if (window.location.protocol === 'file:') {
            const msg = '⚠️ SECURITY BLOCK: SPA frameworks require a Local Server (http://) to fetch pages and load modules. Opening via file:/// is blocked by browser CORS policy.';
            console.error('[SPA Safety] ' + msg);
            const warning = document.createElement('div');
            warning.style = "background:#ff4757; color:white; padding:15px; text-align:center; font-weight:bold; position:fixed; top:0; left:0; right:0; z-index:99999; font-family:sans-serif; box-shadow:0 4px 10px rgba(0,0,0,0.3);";
            warning.innerHTML = warning.textContent = msg;
            document.body.prepend(warning);
        }

        // Add a professional Status Badge
        const badge = document.createElement('div');
        badge.id = 'spa-indicator';
        badge.className = 'spa-status-init';
        badge.textContent = "CORE SYNCED";
        document.body.appendChild(badge);

        document.addEventListener('click', (e) => {
            const link = e.target.closest('a');
            if (!link) return;

            const href = link.getAttribute('href');
            if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;
            if (link.getAttribute('target') === '_blank') return;

            const targetUrl = new URL(href, location.href);
            const isSameSite = targetUrl.host === location.host;

            if (isSameSite) {
                console.log('[SPA] Intercepting:', href);
                const ind = document.getElementById('spa-indicator');
                if (ind) {
                    ind.className = 'spa-status-busy';
                    ind.textContent = "FETCHING...";
                }

                e.preventDefault();
                this.navigate(href);
            }
        });

        window.addEventListener('popstate', () => {
            console.log('[SPA] Popstate detected, navigating to:', location.href);
            this.navigate(location.href, false);
        });

        console.log('[SPA] Setup complete. Ready to intercept clicks.');
    }
};

export default SPA;
