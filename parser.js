(function (global) {
  const IncludeParser = {};

  // 🔹 In-flight promise cache to prevent duplicate network requests
  const inflight = new Map();

  // 🔹 Fetch a file relative to current page (with Caching & Deduping)
  async function fetchFile(file) {
    const url = new URL(file, location.href).href;
    const cacheKey = 'include_cache_' + url;

    // 1. Try Memory/Session Cache
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      // Background revalidate (optional, keeping simple for now)
      return cached;
    }

    // 2. Check In-flight requests
    if (inflight.has(url)) {
      return inflight.get(url);
    }

    // 3. Network Fetch
    console.log('[IncludeParser] fetching network', url);
    const promise = fetch(url, { credentials: 'same-origin' })
      .then(async (res) => {
        if (!res.ok) throw new Error(`Fetch ${url} failed: ${res.status}`);
        const text = await res.text();
        sessionStorage.setItem(cacheKey, text);
        inflight.delete(url); // Cleanup
        return text;
      })
      .catch(err => {
        inflight.delete(url);
        throw err;
      });

    inflight.set(url, promise);
    return promise;
  }

  // 🔹 Pre-scan the entire document to start fetches early (Automatic Preload)
  function preloadAll() {
    const html = document.documentElement.innerHTML;
    const includeRegex = /@include\(['"](.+?)['"]\)/g;
    let m;
    while ((m = includeRegex.exec(html)) !== null) {
      fetchFile(m[1]).catch(() => { }); // Start fetching immediately
    }
  }

  // 🔹 Replace all @include() directives in a string (single pass)
  async function replaceIncludesInString(str) {
    const includeRegex = /@include\(['"](.+?)['"]\)/g;
    let m;
    const matches = [];
    while ((m = includeRegex.exec(str)) !== null) matches.push(m);
    if (matches.length === 0) return str;

    // Prefetch all UNIQUE files in parallel
    const uniqueFiles = [...new Set(matches.map(m => m[1]))];
    const fileContents = new Map();

    await Promise.all(uniqueFiles.map(async file => {
      try {
        const content = await fetchFile(file);
        fileContents.set(file, content);
      } catch (err) {
        console.error(err);
      }
    }));

    // Replace
    let result = str;
    for (const match of matches) {
      const full = match[0];
      const file = match[1];
      const content = fileContents.get(file) || "";
      result = result.split(full).join(content);
    }
    return result;
  }

  // 🔹 Walk through all text nodes in DOM and replace includes
  async function processRoot(root = document.documentElement) {
    console.log('[IncludeParser] start processing root', root);
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
    const textNodes = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode);

    let changed = false;
    for (const node of textNodes) {
      if (!node.nodeValue.includes('@include(')) continue;
      const original = node.nodeValue;
      try {
        const replaced = await replaceIncludesInString(original);
        if (replaced !== original) {
          // 🔹 Convert replaced HTML string into DOM nodes
          const temp = document.createElement('div');
          temp.innerHTML = replaced;

          // Activate scripts inside the included content
          const scripts = temp.querySelectorAll('script');
          for (const s of scripts) {
            const ns = document.createElement('script');
            Array.from(s.attributes).forEach(attr => ns.setAttribute(attr.name, attr.value));
            if (s.src) {
              ns.src = s.src;
            } else {
              ns.textContent = s.textContent;
            }
            s.parentNode.replaceChild(ns, s);
          }

          const frag = document.createDocumentFragment();
          while (temp.firstChild) frag.appendChild(temp.firstChild);
          node.parentNode.replaceChild(frag, node);
          changed = true;
          console.log('[IncludeParser] replaced include in text node');
        }
      } catch (err) {
        console.error('[IncludeParser] failure processing node', err);
      }
    }

    return changed; // tells runner if any replacements were made
  }

  // 🔹 Top-level runner — repeat passes to handle nested includes
  IncludeParser.run = async function (root = document.documentElement) {
    try {
      let pass = 0;
      let any;
      do {
        pass++;
        console.log(`[IncludeParser] pass ${pass} start`);
        any = await processRoot(root);
        console.log(`[IncludeParser] pass ${pass} done — changed=${any}`);
        if (pass > 10) {
          console.warn('[IncludeParser] reached max passes (10), stopping');
          break;
        }
      } while (any);

      // 🔹 Rebind SPAFrame links after new HTML inserted
      if (global.SPAFrame && typeof SPAFrame.start === 'function') {
        try {
          SPAFrame.start();
          console.log('[IncludeParser] SPAFrame.start() called');
        } catch (e) {
          console.warn('[IncludeParser] SPAFrame.start() error', e);
        }
      }

      console.log('[IncludeParser] finished');
      document.body.style.visibility = 'visible';
    } catch (err) {
      console.error('[IncludeParser] run error', err);
      document.body.style.visibility = 'visible';
    }
  };

  // 🔹 Auto-run IncludeParser when DOM ready
  if (document.readyState === 'loading') {
    preloadAll(); // Start pre-fetching IMMEDIATELY while parsing
    document.addEventListener('DOMContentLoaded', () => IncludeParser.run());
  } else {
    preloadAll();
    IncludeParser.run();
  }

  global.IncludeParser = IncludeParser;
})(window);
