import { IncludeParser } from './parser.js';

/**
 * SPAFrame - Advanced Single Page Application framework
 * Features: Stale-While-Revalidate, Snapshot Injection, and State Protection.
 */
const SPAFrame = {};

// --- Debugging System ---
const debugLogs = [];
const MAX_LOGS = 50;

function log(msg, type = 'info') {
  const timestamp = new Date().toLocaleTimeString();
  const entry = { timestamp, msg, type };
  debugLogs.unshift(entry);
  if (debugLogs.length > MAX_LOGS) debugLogs.pop();
  console[type === 'error' ? 'error' : 'log'](`[SPAFrame] ${msg}`);
  updateDebugOverlay();
}

function updateDebugOverlay() {
  let overlay = document.getElementById('spa-debug-overlay');
  if (!window.SPA_DEBUG) {
    if (overlay) overlay.style.display = 'none';
    return;
  }
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'spa-debug-overlay';
    overlay.style.cssText = 'position:fixed;bottom:10px;right:10px;width:350px;max-height:300px;background:rgba(0,0,0,0.9);color:#0f0;font-family:monospace;font-size:10px;padding:10px;z-index:99999;overflow-y:auto;border-radius:5px;border:1px solid #333;box-shadow: 0 0 10px rgba(0,0,0,0.5);display:block;';
    document.body.appendChild(overlay);

    const controls = document.createElement('div');
    controls.style.cssText = 'position:sticky;top:-10px;background:#222;padding:5px;margin:-10px -10px 10px -10px;border-bottom:1px solid #444;display:flex;justify-content:space-between;pointer-events:auto;';
    controls.innerHTML = `
      <span style="font-weight:bold;color:#aaa;">SPA DEBUG</span>
      <div>
        <button onclick="SPAFrame.flushLogs()" style="background:#050;color:#fff;border:none;padding:2px 5px;font-size:9px;cursor:pointer;border-radius:3px;">Flush</button>
        <button onclick="SPAFrame.toggleDebug(false)" style="background:#444;color:#fff;border:none;padding:2px 5px;font-size:9px;cursor:pointer;border-radius:3px;margin-left:5px;">Hide</button>
        <button onclick="SPAFrame.clearCache(); location.reload()" style="background:#500;color:#fff;border:none;padding:2px 5px;font-size:9px;cursor:pointer;border-radius:3px;margin-left:5px;">Reset</button>
      </div>
    `;
    overlay.prepend(controls);
  } else {
    overlay.style.display = 'block';
  }
}

SPAFrame.flushLogs = async function () {
  log("Flushing logs to server...");
  try {
    const res = await fetch('/__api/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: 'app/spa-debug.json', content: JSON.stringify(debugLogs, null, 2) })
    });
    if (res.ok) log("Logs saved to /app/spa-debug.json");
    else log("Log flush failed: " + res.status, 'error');
  } catch (e) { log("Log flush error: " + e.message, 'error'); }
};

SPAFrame.toggleDebug = function (enabled) {
  window.SPA_DEBUG = enabled;
  localStorage.setItem('spa_debug_enabled', enabled);
  if (enabled) log("Debug mode enabled");
  updateDebugOverlay();
};

window.SPA_DEBUG = localStorage.getItem('spa_debug_enabled') !== 'false';

// --- Versioning System ---
const getAppVersion = () => localStorage.getItem('SPA_APP_VERSION') || 'initial';
const bumpAppVersion = () => {
  const newV = Date.now().toString();
  localStorage.setItem('SPA_APP_VERSION', newV);
  log(`App version bumped to: ${newV}`);
  return newV;
};

// In-memory cache for page HTML (Persistent fallback in navigate)
const pageCache = new Map();
const prefetchQueue = new Set();

function sameOrigin(url) {
  try {
    const u = new URL(url, location.href);
    return u.origin === location.origin;
  } catch { return false; }
}

async function prefetch(url) {
  if (!url || !sameOrigin(url) || pageCache.has(url) || prefetchQueue.has(url)) return;
  prefetchQueue.add(url);
  try {
    const res = await fetch(url, { credentials: "same-origin" });
    if (res.ok) {
      const html = await res.text();
      pageCache.set(url, html);
    }
  } catch (e) { log(`Prefetch failed: ${url}`, 'warn'); }
  finally { prefetchQueue.delete(url); }
}

async function navigate(url, push = true) {
  if (!url) return;
  const targetUrl = new URL(url, location.origin);

  // --- SAME PAGE GUARD ---
  if (push && targetUrl.pathname === location.pathname && targetUrl.search === location.search) {
    log("Already on this page, skipping DOM swap.");
    window.dispatchEvent(new CustomEvent('spa-refresh', { detail: { url } }));
    return;
  }

  if (!sameOrigin(url) || url.startsWith("mailto:") || url.startsWith("tel:") || url.startsWith("#")) {
    if (!url.startsWith("#")) location.href = url;
    return;
  }

  const executeUpdate = async (html, isFresh = false) => {
    const doc = new DOMParser().parseFromString(html, "text/html");
    // Prioritize #spa-content, fallback to generic for backward compatibility if needed
    const currentContainer = document.querySelector('#spa-content') || document.querySelector('.container, #app, main, .container-fluid');
    const nextContainer = doc.querySelector('#spa-content') || doc.querySelector('.container, #app, main, .container-fluid');

    if (!nextContainer) {
      console.error("[SPAFrame Debug] Target container NOT found in fetched HTML.");
      log("Target container missing in restart", "error");
      return;
    } else {
      console.log("[SPAFrame Debug] Target container FOUND:", nextContainer.tagName, nextContainer.id, nextContainer.className);
    }

    // --- GENERIC SNAPSHOT INJECTION ---
    nextContainer.querySelectorAll('[data-spa-snapshot-key]').forEach(el => {
      const key = el.getAttribute('data-spa-snapshot-key');
      const data = localStorage.getItem(key);
      if (data) {
        try {
          const parsed = JSON.parse(data);
          if (Array.isArray(parsed)) {
            // Only render if the helper is available globally
            if (typeof window.createPostRowHTML === 'function') {
              el.innerHTML = parsed.map(window.createPostRowHTML).join('');
            } else {
              console.log(`[SPAFrame] Renderer missing for snapshot ${key}, waiting for scripts...`);
            }
          } else {
            el.innerHTML = typeof parsed === 'string' ? parsed : JSON.stringify(parsed);
          }
        } catch (e) { el.innerHTML = data; }
      }
    });

    const isCurrentAdmin = location.pathname.startsWith('/admin');
    const isNextAdmin = targetUrl.pathname.startsWith('/admin');
    const canPartialUpdate = isCurrentAdmin === isNextAdmin && currentContainer && nextContainer;
    console.log(`[SPAFrame Debug] Partial Update? ${canPartialUpdate} (Current: ${isCurrentAdmin}, Next: ${isNextAdmin})`);

    const performSwap = () => {
      // 1. Update URL only if we are about to swap successfully
      if (push && !isFresh) history.pushState(null, "", url);

      const title = doc.querySelector('title');
      if (title) document.title = title.textContent;

      if (canPartialUpdate) {
        if (currentContainer.innerHTML === nextContainer.innerHTML) {
          log("Content identical, checking for navigation stuck...");
          // Fallback: If URL changed but content didn't, we might be stuck on a fallback page.
          if (location.pathname !== targetUrl.pathname) {
            console.warn("[SPAFrame] Content identical but URL mismatch. Forcing Hard Reload.");
            location.href = url;
            return false;
          }
        } else {
          currentContainer.innerHTML = nextContainer.innerHTML;
          log(isFresh ? "Sync (Partial)" : "Swap (Partial)");
        }
        return true;
      } else {
        log(isFresh ? "Sync (Full)" : "Swap (Full)");
        document.body.innerHTML = doc.body.innerHTML;
        document.body.className = doc.body.className;
        return true;
      }
    };

    if (document.startViewTransition && !isFresh) {
      document.startViewTransition(async () => {
        if (performSwap()) await processPage(doc, url);
      });
    } else {
      if (performSwap()) await processPage(doc, url);
    }

    // --- GENERIC SNAPSHOT INJECTION (POST-SWAP) ---
    // We do this after swap and after scripts start to ensure helpers might be available
    setTimeout(() => {
      const container = document.querySelector('.container, #app, main, .container-fluid');
      if (!container) return;
      container.querySelectorAll('[data-spa-snapshot-key]').forEach(el => {
        const key = el.getAttribute('data-spa-snapshot-key');
        const data = localStorage.getItem(key);
        // Robust restoration: If empty OR still has raw @content tags, restore from cache
        if (data && (el.innerHTML.trim() === '' || el.innerHTML.includes('@content'))) {
          try {
            const parsed = JSON.parse(data);
            if (Array.isArray(parsed)) {
              if (typeof window.createPostRowHTML === 'function') {
                el.innerHTML = parsed.map(window.createPostRowHTML).join('');
                log(`Snapshot [${key}] rendered via helper (delayed)`);
              }
            } else { el.innerHTML = typeof parsed === 'string' ? parsed : JSON.stringify(parsed); }
          } catch (e) { el.innerHTML = data; }
        }
      });
    }, 50);
  };

  try {
    log(`Navigating: ${url}`);
    const appVersion = getAppVersion();
    let servedFromCache = false;

    // 1. Try Memory/Persistent Cache
    const cachedItem = pageCache.get(url) || JSON.parse(localStorage.getItem(`spa_html_cache:${url}`) || 'null');
    if (cachedItem && (typeof cachedItem === 'string' || cachedItem.version === appVersion)) {
      const html = typeof cachedItem === 'string' ? cachedItem : cachedItem.html;
      log(`Serving INSTANT from Cache: ${url}`);
      pageCache.set(url, html);
      await executeUpdate(html);
      servedFromCache = true;
    }

    if (servedFromCache) return;

    // 2. Network Fetch (Revalidate)
    log(`Fetching: ${url}`);
    const fetchUrl = url + (url.includes('?') ? '&' : '?') + `spa_v=${getAppVersion()}`;
    const res = await fetch(fetchUrl, { credentials: 'same-origin' });
    if (res.ok) {
      log(`Fetch OK: ${res.status}`);
      const freshHtml = await res.text();
      pageCache.set(url, freshHtml);
      try {
        localStorage.setItem(`spa_html_cache:${url}`, JSON.stringify({
          html: freshHtml, version: appVersion, ts: Date.now()
        }));
      } catch (e) { }

      // VISUAL DEBUG: Flash yellow to indicate successful fetch & upcoming swap
      document.body.style.transition = 'opacity 0.2s';
      document.body.style.opacity = '0.5';
      setTimeout(() => document.body.style.opacity = '1', 200);

      await executeUpdate(freshHtml, servedFromCache);
    } else if (!servedFromCache) {
      log(`Fetch Failed: ${res.status}`);
      location.href = url;
    }
  } catch (err) {
    console.error("SPA navigate error:", err);
    log(`Navigate Fatal Error: ${err.message}`, 'error');
    if (!pageCache.has(url)) location.href = url;
  }
}

async function processPage(doc, pageUrlForScripts) {
  if (IncludeParser && IncludeParser.run) {
    try { await IncludeParser.run(); } catch (e) { log(`IncludeParser error: ${e.message}`, 'error'); }
  }

  const oldScripts = document.querySelectorAll('script[data-spa="true"]');
  oldScripts.forEach(s => s.remove());

  const scripts = doc.querySelectorAll("script");
  for (const s of scripts) {
    const ns = document.createElement("script");
    ns.setAttribute('data-spa', 'true');
    if (s.type) ns.type = s.type;

    if (s.src) {
      const srcAttr = s.getAttribute('src');
      const isGlobal = srcAttr.includes('@vite/client') || srcAttr.includes('main.js') || srcAttr.includes('bootstrap');
      if (isGlobal && document.querySelector(`script[src*="${srcAttr.split('?')[0]}"]`)) continue;

      const pageBaseUrl = new URL(pageUrlForScripts, location.origin);
      const resolvedUrl = new URL(srcAttr, pageBaseUrl);

      if (srcAttr.includes('html-proxy')) {
        try {
          const res = await fetch(resolvedUrl.toString());
          if (res.ok) {
            const code = await res.text();
            ns.textContent = code + `\n//# sourceURL=${srcAttr.split('?')[0]}.js`;
          }
        } catch (e) { log(`Proxy script error: ${e.message}`, 'error'); }
      } else {
        ns.src = resolvedUrl.toString();
      }
    } else {
      ns.textContent = s.textContent + `\n//# sourceURL=spa-eval-${Date.now()}.js`;
    }
    document.head.appendChild(ns);
  }
  window.dispatchEvent(new CustomEvent('spa-navigated', { detail: { url: pageUrlForScripts } }));
}

SPAFrame.start = function () {
  document.addEventListener("click", (e) => {
    // --- ONE-TIME POISON CACHE FIX ---
    // If we click a link and the target is likely to be corrupted by a previous bad snapshot, clear it.
    if (!window._spaCacheCleaned) {
      localStorage.removeItem('public_blog_posts');
      console.log('[SPAFrame] Cleared potentially poisoned blog snapshot');
      window._spaCacheCleaned = true;
    }
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const el = e.target.closest("a[href], button[href], [data-href]");
    if (!el) return;
    const href = el.getAttribute("href") || el.dataset.href;
    if (!href || href.startsWith("#")) return;
    if (!sameOrigin(href)) return;
    e.preventDefault();
    navigate(href, true);
  }, true);

  document.addEventListener("mouseover", (e) => {
    const el = e.target.closest("a[href]");
    if (el) {
      const href = el.getAttribute("href");
      if (href && sameOrigin(href) && !href.startsWith("#")) prefetch(href);
    }
  }, { passive: true });

  window.addEventListener("popstate", () => navigate(location.pathname + location.search, false));
  console.log("[SPAFrame] Started");
};

SPAFrame.navigate = navigate;

SPAFrame.clearCache = function () {
  pageCache.clear();
  Object.keys(sessionStorage).forEach(key => {
    if (key.includes('_cache')) sessionStorage.removeItem(key);
  });
  Object.keys(localStorage).forEach(key => {
    if (key.includes('_cache') || key.includes('_snapshot') || key.includes('spa_html_cache:')) {
      localStorage.removeItem(key);
    }
  });
  log("Cache cleared");
};

(function () {
  const originalFetch = window.fetch;
  window.fetch = async function (...args) {
    const url = args[0];
    const options = args[1] || {};
    const method = (options.method || 'GET').toUpperCase();
    const response = await originalFetch(...args);

    if (method !== 'GET' && response.ok) {
      if (typeof url === 'string' && (url.startsWith('/') || url.includes(location.origin) || url.includes('supabase.co'))) {
        log(`Mutation detected at ${url}. Bumping app version.`);
        bumpAppVersion();
        SPAFrame.clearCache();
      }
    }
    return response;
  };
})();

window.SPAFrame = SPAFrame;
export { SPAFrame };
