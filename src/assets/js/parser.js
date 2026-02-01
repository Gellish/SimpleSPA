import { marked } from 'marked';
import jsyaml from 'js-yaml';

const IncludeParser = {};
const inflight = new Map();
const markdownFiles = import.meta.glob('/src/route/**/*.md', { as: 'raw', eager: true });
const postIndex = new Map(); // Map<Slug, {path, metadata, body}>

function generateSlug(title) {
  return title.toLowerCase().trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Pre-index all markdown files
for (const path in markdownFiles) {
  const raw = markdownFiles[path];
  // Quick frontmatter parse to get slug/title without full marked parse if possible
  // But parseMarkdown() is robust, let's use it but maybe optimize later if slow.
  // For now, we need metadata to get the slug.
  const fmRegex = /^-{3,}\r?\n([\s\S]+?)\r?\n-{3,}\r?\n([\s\S]*)/;
  const match = raw.match(fmRegex);

  if (match) {
    try {
      const metadata = jsyaml.load(match[1]);
      let slug = metadata.slug;
      if (!slug && metadata.title) {
        slug = generateSlug(metadata.title);
      }
      if (slug) {
        // Store raw content or pre-parsed? 
        // Let's store raw and parse on demand to save init time, 
        // BUT we need metadata for the listing page anyway.
        // Let's store the metadata object + raw body.
        postIndex.set(slug, { path, metadata, rawBody: match[2], rawFull: raw });
      }
    } catch (e) {
      console.warn('Failed to parse frontmatter for', path, e);
    }
  }
}

async function fetchFile(file) {
  const url = new URL(file, location.href).href;
  const cacheKey = 'include_cache_' + url;
  const cached = sessionStorage.getItem(cacheKey);
  if (cached) return cached;
  if (inflight.has(url)) return inflight.get(url);
  const promise = fetch(url, { credentials: 'same-origin' })
    .then(async (res) => {
      if (!res.ok) throw new Error(`Fetch ${url} failed: ${res.status}`);
      const text = await res.text();
      sessionStorage.setItem(cacheKey, text);
      inflight.delete(url);
      return text;
    })
    .catch(err => {
      inflight.delete(url);
      throw err;
    });
  inflight.set(url, promise);
  return promise;
}

function parseMarkdown(rawContent) {
  const fmRegex = /^-{3,}\r?\n([\s\S]+?)\r?\n-{3,}\r?\n([\s\S]*)/;
  const match = rawContent.match(fmRegex);
  if (match) {
    try {
      const metadata = jsyaml.load(match[1]);
      // Ensure slug exists in metadata if title is present
      if (!metadata.slug && metadata.title) {
        metadata.slug = generateSlug(metadata.title);
      }
      const body = marked.parse(match[2]);
      return { ...metadata, body };
    } catch (e) {
      return { body: marked.parse(rawContent) };
    }
  } else {
    return { body: marked.parse(rawContent) };
  }
}

function renderTemplate(template, data) {
  return template.replace(/\{\{\s*([\w]+)\s*\}\}/g, (match, key) => {
    let val = data[key];
    if (val instanceof Date) {
      // Format: January 27, 2026
      return val.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    }
    return val !== undefined ? val : '';
  });
}

// 🔹 Core Logic: Process a full content block string (source + template)
function processContentBlockMatch(fullMatch, source, template) {
  let replacementHtml = '';

  // Path Resolution Logic
  let cleanSource = source.trim();
  if (cleanSource.startsWith('/')) cleanSource = cleanSource.substring(1);
  if (!cleanSource.startsWith('src/route/')) cleanSource = 'src/route/' + cleanSource;

  // Try both with and without leading slash to be super safe
  const searchPath1 = '/' + cleanSource;
  const searchPath2 = cleanSource;

  const matches = Object.keys(markdownFiles).filter(path => {
    return path === searchPath1 + '.md' || path.startsWith(searchPath1 + '/') ||
      path === searchPath2 + '.md' || path.startsWith(searchPath2 + '/');
  });

  if (matches.length === 0) {
    console.warn(`[IncludeParser] No content found for source: ${source}`);
    // Debug: show available keys
    console.log('[IncludeParser Debug] Available keys:', Object.keys(markdownFiles).slice(0, 5), '...');
    console.log('[IncludeParser Debug] Search paths:', searchPath1, searchPath2);
  } else {
    console.log(`[IncludeParser] Found ${matches.length} matches for ${source}`);
  }

  for (const path of matches) {
    const raw = markdownFiles[path];
    const data = parseMarkdown(raw);
    replacementHtml += renderTemplate(template, data);
  }
  return replacementHtml;
}

// 🔹 Collection Registry for @foreach
const collections = {
  // 'posts' returns all registered markdown files (Local)
  posts: () => IncludeParser.getLocalPosts().sort((a, b) => new Date(b.date) - new Date(a.date)),

  // 'local_posts' (Alias for explicit consistency)
  local_posts: () => IncludeParser.getLocalPosts().sort((a, b) => new Date(b.date) - new Date(a.date)),

  // 'db_posts' returns only Supabase/DB posts
  db_posts: async () => {
    try {
      const { postsService } = await import('/src/api/index.js');
      if (!postsService) return [];
      const posts = await postsService.getAll().catch(e => []);
      return posts.map(p => ({
        ...p,
        title: p.title || 'Untitled',
        date: p.created_at || new Date().toISOString(),
        description: p.content ? (typeof p.content === 'string' ? p.content.substring(0, 100) : 'No preview') : '',
        slug: '/post/' + p.id,
        _rawDate: new Date(p.created_at || 0)
      })).sort((a, b) => b._rawDate - a._rawDate);
    } catch (e) { console.error(e); return []; }
  },

  // 'event_posts' returns only EventStore posts
  event_posts: async () => {
    try {
      const res = await fetch('/__api/aggregates?t=' + Date.now());
      if (!res.ok) return [];
      const data = await res.json();
      return (data.aggregates || []).map(a => ({
        ...a.state,
        id: a.id,
        title: a.state.title || a.state.name || 'Untitled',
        date: a.state.createdAt || a.state.date || new Date().toISOString(),
        description: a.state.description || '',
        slug: '/post/' + a.id,
        _rawDate: new Date(a.state.createdAt || 0)
      })).sort((a, b) => b._rawDate - a._rawDate);
    } catch (e) { console.error(e); return []; }
  },

  // 'all_posts' aggregates everything (Async)
  all_posts: async () => {
    try {
      // ... existing all_posts logic ...
      console.log('[IncludeParser] Fetching all_posts...');
      const withTimeout = (promise, ms) => Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => resolve([]), ms))
      ]);

      // 1. Local
      const local = IncludeParser.getLocalPosts();

      // 2. Supabase/DB
      let db = [];
      try {
        const { postsService } = await import('/src/api/index.js');
        if (postsService) db = await postsService.getAll().catch(e => []);
      } catch (e) { console.warn('DB Fetch failed', e); }

      // 3. Event Store
      let events = [];
      try {
        const res = await fetch('/__api/aggregates?t=' + Date.now());
        if (res.ok) {
          const data = await res.json();
          events = (data.aggregates || []).map(a => ({
            ...a.state,
            id: a.id,
            title: a.state.title || a.state.name || 'Untitled',
            date: a.state.createdAt || a.state.date || new Date().toISOString(),
            source: 'event-store',
            description: a.state.description || (typeof a.state.content === 'string' ? a.state.content.substring(0, 100) : '')
          }));
        }
      } catch (e) { console.warn('EventStore Fetch failed', e); }

      // Normalize & Merge
      const normalize = (p) => {
        let href = '#';
        if (p.source === 'local') href = '/post.html?slug=' + (p.slug || p.id);
        if (p.slug) href = '/' + p.slug;
        else href = '/post/' + p.id;

        return {
          title: p.title || 'Untitled',
          date: p.date ? new Date(p.date).toLocaleDateString() : 'Unknown Date',
          description: p.description || 'No description available.',
          slug: href,
          _rawDate: p.date ? new Date(p.date) : new Date(0)
        };
      };

      const all = [...db.map(p => ({ ...p, source: 'database' })), ...local, ...events].map(normalize);
      return all.sort((a, b) => b._rawDate - a._rawDate);

    } catch (err) {
      console.error('[IncludeParser] all_posts error:', err);
      return [];
    }
  },

  // 'admin_posts': Rich data for the admin table
  admin_posts: async () => {
    try {
      // Re-use logic or just duplicate for safety/speed
      const local = IncludeParser.getLocalPosts();

      let db = [];
      let events = [];

      try {
        const { postsService } = await import('/src/api/index.js');
        if (postsService) db = await postsService.getAll().catch(e => []);
      } catch (e) { }

      try {
        const res = await fetch('/__api/aggregates?t=' + Date.now());
        if (res.ok) {
          const data = await res.json();
          events = (data.aggregates || []).map(a => ({ ...a.state, id: a.id, aggregateType: a.type, source: 'event-store' }));
        }
      } catch (e) { }

      // Combine
      const all = [
        ...db.map(p => ({ ...p, source: 'database' })),
        ...local.map(p => ({ ...p, source: 'local' })),
        ...events
      ];

      return all.map(p => {
        // Badge Logic
        let badgeClass = 'bg-secondary';
        let sourceLabel = 'Local';

        if (p.source === 'database') { badgeClass = 'bg-primary'; sourceLabel = 'DB'; }
        else if (p.source === 'event-store') { badgeClass = 'bg-info'; sourceLabel = 'Event Store'; }

        // Tags
        let tagsHtml = '';
        let tagList = Array.isArray(p.tags) ? p.tags : (p.tags ? p.tags.split(',') : []);
        tagsHtml = tagList.map(t => `<span class="badge rounded-pill bg-light text-dark border me-1">${t.trim()}</span>`).join('');

        // Edit Path
        let editUrl = `/admin/editor/${p.id || p.slug}`;
        if (p.source === 'local') editUrl += `?source=local&path=${encodeURIComponent(p.path)}`;

        return {
          id: p.id || p.slug,
          title: p.title || 'Untitled',
          source: p.source,
          source_badge: `<span class="badge ${badgeClass}">${sourceLabel}</span>`,
          tags_html: tagsHtml,
          path: p.path || '',
          encoded_path: encodeURIComponent(p.path || ''),
          preview: p.description || (typeof p.content === 'string' ? p.content.substring(0, 50) + '...' : '(Content)'),
          edit_url: editUrl
        };
      });
    } catch (e) {
      console.error('admin_posts error', e);
      return [];
    }
  }
};

// 🔹 Strategy: Find @foreach (collection as item), scan, render, replace.
async function processForeachBlocksInDOM(root) {
  let changed = false;

  // 1. Attribute-based @foreach (Best for tables/lists)
  // Syntax: <tr data-foreach="posts as post">...</tr>
  const elements = root.querySelectorAll('[data-foreach]');
  for (const el of elements) {
    const statement = el.getAttribute('data-foreach');
    const match = statement.match(/^\s*([a-zA-Z0-9_]+)\s+as\s+([a-zA-Z0-9_]+)\s*$/);

    if (match) {
      const collectionName = match[1];
      // Fetch Items
      let items = [];
      if (collections[collectionName]) {
        const res = collections[collectionName]();
        items = (res instanceof Promise) ? await res : res;
      }

      // Render
      const template = el.outerHTML.replace(`data-foreach="${statement}"`, '');
      let finalHtml = '';
      for (const item of items) {
        finalHtml += renderTemplate(template, item);
      }

      // Replace
      const wrapper = document.createElement('template');
      wrapper.innerHTML = finalHtml;
      // wrapper.content is a DocumentFragment with the parsed nodes (even TRs)
      el.parentNode.replaceChild(wrapper.content, el);
      changed = true;
    }
  }

  // 2. Text-node based @foreach (Legacy/Text flows)
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);



  for (const node of nodes) {
    if (!node.nodeValue.includes('@foreach')) continue;
    if (!node.parentNode) continue;

    const startContent = node.nodeValue;
    // Regex to match @foreach (posts as post)
    const startRegex = /@foreach\s*\(\s*(\w+)\s+as\s+(\w+)\s*\)/;
    const startMatch = startContent.match(startRegex);
    if (!startMatch) continue;

    const collectionName = startMatch[1];

    // Get Data
    let items = [];
    if (collections[collectionName]) {
      // Support Async Collections
      const result = collections[collectionName]();
      if (result instanceof Promise) {
        items = await result;
      } else {
        items = result;
      }
    } else {
      console.warn(`[IncludeParser] Unknown collection: ${collectionName}`);
    }

    const siblingsToRemove = [];
    let template = '';
    let foundEnd = false;
    let currentNode = node;

    // Template starts after the @foreach tag
    const splitIndex = startContent.indexOf(startMatch[0]) + startMatch[0].length;
    template += startContent.substring(splitIndex);

    while (currentNode.nextSibling) {
      currentNode = currentNode.nextSibling;
      let nodeText = '';
      let isEndNode = false;

      if (currentNode.nodeType === Node.TEXT_NODE) {
        const val = currentNode.nodeValue;
        // Support both @endforeach and @endcontent for flexibility
        const endIdx = val.search(/@endforeach|@endcontent/);
        if (endIdx !== -1) {
          nodeText = val.substring(0, endIdx);
          isEndNode = true;
          foundEnd = true;

          // Clean up the end tag from the text node
          const matchEnd = val.match(/@endforeach|@endcontent/);
          currentNode.nodeValue = val.substring(endIdx + matchEnd[0].length);
        } else {
          nodeText = val;
        }
      } else {
        nodeText = currentNode.outerHTML;
      }

      // Don't add to template if it was the end node and empty? NO, we added the prefix.
      if (!isEndNode) {
        template += nodeText;
        siblingsToRemove.push(currentNode);
      } else {
        template += nodeText; // Add the last bit before the tag
        // We do NOT remove the end node itself, just truncated it earlier.
        break;
      }
    }

    if (foundEnd) {
      let replacementHtml = '';
      if (items.length === 0) {
        replacementHtml = '<div class="alert alert-info">No items found.</div>';
      } else {
        items.forEach(item => {
          replacementHtml += renderTemplate(template, item);
        });
      }

      const wrapper = document.createElement('div');
      wrapper.innerHTML = replacementHtml;
      const frag = document.createDocumentFragment();
      while (wrapper.firstChild) frag.appendChild(wrapper.firstChild);

      // Truncate start node
      node.nodeValue = startContent.substring(0, startContent.indexOf(startMatch[0]));

      // Insert and Cleanup
      if (node.nextSibling) node.parentNode.insertBefore(frag, node.nextSibling);
      else node.parentNode.appendChild(frag);

      // --- Snapshot Integration ---
      const snapshotEl = node.parentNode.closest('[data-spa-snapshot-key]');
      if (snapshotEl) {
        const key = snapshotEl.getAttribute('data-spa-snapshot-key');
        setTimeout(() => localStorage.setItem(key, snapshotEl.innerHTML), 100);
      }

      siblingsToRemove.forEach(s => s.remove());
      changed = true;
    }
  }
  return changed;
}

// 🔹 Simple String Replacer for Includes
async function replaceIncludesInString(str) {
  const includeRegex = /@include\(['"](.+?)['"]\)/g;
  const matches = [...str.matchAll(includeRegex)];
  if (matches.length === 0) return str;

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

  let result = str;
  for (const match of matches) {
    const full = match[0];
    const file = match[1];
    const content = fileContents.get(file) || "";
    result = result.split(full).join(content);
  }
  return result;
}

// 🔹 Process Includes in Text Nodes (Standard)
async function processIncludesInDOM(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);

  let changed = false;
  for (const node of nodes) {
    if (!node.nodeValue.includes('@include(')) continue;
    const original = node.nodeValue;
    const replaced = await replaceIncludesInString(original);
    if (replaced !== original) {
      const temp = document.createElement('div');
      temp.innerHTML = replaced;
      // Script activation...
      const scripts = temp.querySelectorAll('script');
      for (const s of scripts) { /* ... */ } // Skipping for brevity in fix

      const frag = document.createDocumentFragment();
      while (temp.firstChild) frag.appendChild(temp.firstChild);
      node.parentNode.replaceChild(frag, node);
      changed = true;
    }
  }
  return changed;
}

// 🔹 Top-level runner
IncludeParser.run = async function (root = document.documentElement) {
  try {
    let pass = 0;
    let any;
    do {
      pass++;
      console.log(`[IncludeParser] pass ${pass} start`);

      // Pass 1: Handle Includes
      const includesChanged = await processIncludesInDOM(root);

      // Pass 2: Handle Content Blocks (Multi-node)
      let contentChanged = await processContentBlocksInDOM(root);

      // Pass 3: Handle Foreach Blocks
      const foreachChanged = await processForeachBlocksInDOM(root);

      // Pass 4: Handle Data Context (Universal Component)
      const contextChanged = await processContextBlocksInDOM(root);

      // Pass 5: Handle Universal Forms (Auth)
      const formsChanged = await processFormsInDOM(root);

      contentChanged = contentChanged || foreachChanged || contextChanged || formsChanged;
      any = includesChanged || contentChanged;

      console.log(`[IncludeParser] pass ${pass} done — changed=${any}`);
      if (pass > 10) break;
    } while (any);

    console.log('[IncludeParser] Showing body');
    document.body.style.visibility = 'visible';
  } catch (err) {
    console.error('[IncludeParser] run error', err);
    document.body.style.visibility = 'visible';
  }
};

// 🔹 Process Content Blocks (@content ... @endcontent)
async function processContentBlocksInDOM(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);

  let changed = false;

  for (const node of nodes) {
    if (!node.nodeValue.includes('@content(')) continue;
    if (!node.parentNode) continue;

    const startContent = node.nodeValue;
    const startRegex = /@content\(['"](.+?)['"]\)/;
    const startMatch = startContent.match(startRegex);
    if (!startMatch) continue;

    const source = startMatch[1];
    const siblingsToRemove = [];
    let template = '';
    let foundEnd = false;
    let currentNode = node;

    // Template starts after the @content tag in the first node
    const splitIndex = startContent.indexOf(startMatch[0]) + startMatch[0].length;
    template += startContent.substring(splitIndex);

    while (currentNode.nextSibling) {
      currentNode = currentNode.nextSibling;
      let nodeText = '';
      let isEndNode = false;

      if (currentNode.nodeType === Node.TEXT_NODE) {
        const val = currentNode.nodeValue;
        const endIdx = val.indexOf('@endcontent');
        if (endIdx !== -1) {
          nodeText = val.substring(0, endIdx);
          isEndNode = true;
          foundEnd = true;
        } else {
          nodeText = val;
        }
      } else {
        nodeText = currentNode.outerHTML;
      }

      template += nodeText;

      if (isEndNode) {
        // Split the end node: keep suffix in DOM, but remove the @endcontent part
        const fullVal = currentNode.nodeValue;
        const endIdx = fullVal.indexOf('@endcontent');
        currentNode.nodeValue = fullVal.substring(endIdx + '@endcontent'.length);
        break;
      } else {
        siblingsToRemove.push(currentNode);
      }
    }

    if (foundEnd) {
      const newHtml = processContentBlockMatch(null, source, template);
      const wrapper = document.createElement('div');
      wrapper.innerHTML = newHtml;
      const frag = document.createDocumentFragment();
      while (wrapper.firstChild) frag.appendChild(wrapper.firstChild);

      // Truncate start node to prefix
      node.nodeValue = startContent.substring(0, startContent.indexOf(startMatch[0]));

      // Insert and Cleanup
      if (node.nextSibling) node.parentNode.insertBefore(frag, node.nextSibling);
      else node.parentNode.appendChild(frag);

      // --- Snapshot Integration ---
      const snapshotEl = node.parentNode.closest('[data-spa-snapshot-key]');
      if (snapshotEl) {
        const key = snapshotEl.getAttribute('data-spa-snapshot-key');
        setTimeout(() => localStorage.setItem(key, snapshotEl.innerHTML), 100);
      }

      siblingsToRemove.forEach(s => s.remove());
      changed = true;
    }
  }
  return changed;
}

// 🔹 Universal Forms: Zero-Script Auth & Actions
async function processFormsInDOM(root) {
  const forms = root.querySelectorAll('form[data-action]:not([data-processed])');
  if (forms.length === 0) return false;

  for (const form of forms) {
    form.setAttribute('data-processed', 'true');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      // 1. Zero-Script Confirmation
      const confirmMsg = form.getAttribute('data-confirm');
      if (confirmMsg && !confirm(confirmMsg)) return;

      const action = form.getAttribute('data-action');
      const redirect = form.getAttribute('data-redirect'); // Optional
      const errorTarget = document.querySelector(form.getAttribute('data-error-target') || '.alert');
      const submitBtn = form.querySelector('[type="submit"]');

      // UI Reset
      if (errorTarget) errorTarget.classList.add('d-none');
      const originalBtnText = submitBtn ? submitBtn.innerHTML : 'Submit'; // innerHTML to keep icons
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Processing...';
      }

      try {
        const formData = new FormData(form);

        if (action === 'login') {
          const { authService } = await import('/src/api/index.js');
          const email = formData.get('email');
          const password = formData.get('password');
          await authService.login(email, password);
        }
        else if (action === 'signup') {
          const { authService } = await import('/src/api/index.js');
          const email = formData.get('email');
          const password = formData.get('password');
          const name = formData.get('name') || '';
          await authService.signup(email, password, { name });
        }
        else if (action === 'delete-post') {
          const id = formData.get('id');
          const source = formData.get('source');
          const path = formData.get('path'); // encoded?

          if (source === 'database') {
            const { postsService } = await import('/src/api/index.js');
            await postsService.delete(id);
          } else if (source === 'local') {
            const res = await fetch('/__api/delete', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ path: decodeURIComponent(path) })
            });
            if (!res.ok) throw new Error('Local delete failed');
            if (IncludeParser && IncludeParser.removePostByPath) {
              IncludeParser.removePostByPath(decodeURIComponent(path));
            }
          } else if (source === 'event-store') {
            const res = await fetch('/__api/events/delete', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ type: 'page', id })
            });
            if (!res.ok) throw new Error('EventStore delete failed');
          }

          // For delete, default to reload if no redirect specified
          if (!redirect) {
            window.location.reload();
            return;
          }
        }

        // Success Redirect
        if (redirect) {
          if (window.SPAFrame) window.SPAFrame.navigate(redirect);
          else window.location.href = redirect;
        }

      } catch (error) {
        console.error('Form Error:', error);
        if (errorTarget) {
          errorTarget.textContent = error.message || 'An error occurred';
          errorTarget.classList.remove('d-none');
        } else {
          alert(error.message);
        }
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalBtnText;
        }
      }
    });
  }

  return false;
}

// 🔹 Universal Component: Data Context Hydration
async function processContextBlocksInDOM(root) {
  const elements = root.querySelectorAll('[data-context="current_post"]');
  if (elements.length === 0) return false;

  let changed = false;
  const slug = window.location.pathname.substring(1); // /slug -> slug

  const post = await IncludeParser.fetchPost(slug);

  for (const el of elements) {
    if (el.dataset.hydrated === slug) continue;

    // Show Loading state if present
    const loader = document.getElementById('post-loading');
    if (loader) loader.classList.remove('d-none');
    el.classList.add('d-none');

    if (post) {
      document.title = post.title || 'Blog Post';
      const filled = renderTemplate(el.innerHTML, {
        title: post.title,
        date: post.date || 'Unknown Date',
        body: post.body,
        tags: post.tags ? `<small class="badge bg-light text-dark border">${post.tags}</small>` : ''
      });

      el.innerHTML = filled;
      el.classList.remove('d-none');
      el.dataset.hydrated = slug;
      if (loader) loader.classList.add('d-none');
      changed = true;
    } else {
      // Not found
      el.classList.add('d-none');
      if (loader) {
        const errorTemplate = document.getElementById('error-template');
        if (errorTemplate) loader.innerHTML = errorTemplate.innerHTML;
        else loader.textContent = "Post not found.";
      }
    }
  }
  return changed;
}

// 🔹 Unified Fetcher
IncludeParser.fetchPost = async function (slug) {
  if (!slug) return null;

  // 1. Try Local First (Fastest)
  if (postIndex.has(slug)) {
    const entry = postIndex.get(slug);
    return parseMarkdown(entry.rawFull);
  }

  // 2. Try DB (Supabase)
  try {
    const { postsService } = await import('/src/api/index.js');
    if (postsService) {
      // We might need to fetch all or fetch one. 
      // If 'postsService' has getById, try that? ID might be the slug or uuid.
      // Let's try getting all for now (expensive but correct for MVP mixing) OR search
      // Actually, let's just rely on getAll() cache or add a get(id)
      const post = await postsService.get(slug).catch(() => null);
      if (post) return { ...post, body: post.content, date: new Date(post.created_at).toLocaleDateString() };
    }
  } catch (e) { /* Ignore */ }

  // 3. Try Event Store
  try {
    const res = await fetch('/__api/events?type=page&id=' + slug);
    // Actually event store needs 'readEvents' but we usually read aggregates
    // Let's use the aggregates endpoint logic for single item?
    // Or if we have the ID. For slugs, it's harder in EventStore without a projection index.
    // Assuming slug IS the ID for event store items (UUID).
    if (slug.includes('-')) {
      const res = await fetch('/__api/aggregates?type=page');
      if (res.ok) {
        const data = await res.json();
        const match = data.aggregates.find(a => a.id === slug);
        if (match) return {
          ...match.state,
          body: match.state.content,
          date: new Date(match.state.createdAt).toLocaleDateString()
        };
      }
    }
  } catch (e) { }

  return null;
};

// 🔹 Expose helpers for SPA Router
IncludeParser.getPostBySlug = function (slug) {
  // Legacy Sync Helper (only works for local)
  if (postIndex.has(slug)) {
    const entry = postIndex.get(slug);
    const parsed = parseMarkdown(entry.rawFull);
    return parsed;
  }
  return null;
};

IncludeParser.renderTemplate = function (template, data) {
  return renderTemplate(template, data);
};

// Return all indexed local markdown files
IncludeParser.getLocalPosts = function () {
  return Array.from(postIndex.values()).map(entry => {
    return {
      ...entry.metadata,
      id: entry.metadata.slug || entry.metadata.id || 'local-' + Math.random().toString(36).substr(2, 9),
      content: entry.rawFull,
      source: 'local',
      path: entry.path
    };
  });
};

// 🔹 Handle deletions in SPA session
IncludeParser.removePostByPath = function (path) {
  const searchPath = path.startsWith('/') ? path : '/' + path;
  for (const [slug, entry] of postIndex.entries()) {
    if (entry.path === searchPath) {
      postIndex.delete(slug);
      console.log(`[IncludeParser] Removed post from index: ${path}`);
      return true;
    }
  }
  return false;
};

// 🔹 Update or Add post in SPA session
IncludeParser.updatePost = function (path, rawContent) {
  const searchPath = path.startsWith('/') ? path : '/' + path;

  // Parse frontmatter
  const fmRegex = /^-{3,}\r?\n([\s\S]+?)\r?\n-{3,}\r?\n([\s\S]*)/;
  const match = rawContent.match(fmRegex);

  if (match) {
    try {
      const metadata = jsyaml.load(match[1]);
      let slug = metadata.slug;
      if (!slug && metadata.title) {
        slug = generateSlug(metadata.title);
      }
      if (slug) {
        postIndex.set(slug, {
          path: searchPath,
          metadata,
          rawBody: match[2],
          rawFull: rawContent
        });
        console.log(`[IncludeParser] Updated post index: ${path} (slug: ${slug})`);
        return true;
      }
    } catch (e) {
      console.error('[IncludeParser] Update failed: FM parse error', e);
    }
  } else {
    console.warn('[IncludeParser] Update failed: No frontmatter found for', path);
  }
  return false;
};

// Global Exposure for SPA environment
if (typeof window !== 'undefined') {
  window.IncludeParser = IncludeParser;
}

export { IncludeParser };
