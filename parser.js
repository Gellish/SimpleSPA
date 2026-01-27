(function (global) {
  const IncludeParser = {};

  // 🔹 Fetch a file relative to current page
  async function fetchFile(file) {
    const url = new URL(file, location.href).href;
    console.log('[IncludeParser] fetching', url);
    const res = await fetch(url, { credentials: 'same-origin' });
    if (!res.ok) throw new Error(`Fetch ${url} failed: ${res.status}`);
    return await res.text();
  }

  // 🔹 Replace all @include() directives in a string (single pass)
  async function replaceIncludesInString(str) {
    const includeRegex = /@include\(['"](.+?)['"]\)/g;
    let m;
    let result = str;
    const matches = [];
    while ((m = includeRegex.exec(str)) !== null) matches.push(m);
    if (matches.length === 0) return result;

    for (const match of matches) {
      const full = match[0]; // the full string: @include('nav.html')
      const file = match[1]; // the file inside quotes: nav.html
      try {
        const content = await fetchFile(file);
        result = result.split(full).join(content); // replace directive with file content
      } catch (err) {
        console.error('[IncludeParser] error loading', file, err);
      }
    }
    return result;
  }

  // 🔹 Walk through all text nodes in DOM and replace includes
  async function processRoot(root = document.body) {
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
  IncludeParser.run = async function (root = document.body) {
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

      // 🔹 Execute any scripts that came from included files
      const scripts = Array.from(root.querySelectorAll('script'));
      for (const s of scripts) {
        const ns = document.createElement('script');
        if (s.src) ns.src = s.src;
        else ns.textContent = s.textContent;
        document.head.appendChild(ns);
        s.remove();
      }

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
    } catch (err) {
      console.error('[IncludeParser] run error', err);
    }
  };

  // 🔹 Auto-run IncludeParser when DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => IncludeParser.run());
  } else {
    IncludeParser.run();
  }

  global.IncludeParser = IncludeParser;
})(window);
