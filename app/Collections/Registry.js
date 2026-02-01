export const collections = {
    // 'posts' returns all registered markdown files (Local)
    posts: (IncludeParser) => IncludeParser.getLocalPosts().sort((a, b) => new Date(b.date) - new Date(a.date)),

    // 'local_posts' (Alias for explicit consistency)
    local_posts: (IncludeParser) => IncludeParser.getLocalPosts().sort((a, b) => new Date(b.date) - new Date(a.date)),

    // 'db_posts' returns only Supabase/DB posts
    db_posts: async () => {
        try {
            const { postsService } = await import('/app/Services/index.js');
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
    all_posts: async (IncludeParser) => {
        try {
            console.log('[IncludeParser] Fetching all_posts...');
            // 1. Local
            const local = IncludeParser.getLocalPosts();

            // 2. Supabase/DB
            let db = [];
            try {
                const { postsService } = await import('/app/Services/index.js');
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
    admin_posts: async (IncludeParser) => {
        try {
            // 1. Fetch from DB
            let dbPosts = [];
            try {
                const { postsService } = await import('/app/Services/index.js');
                if (postsService) dbPosts = await postsService.getAll();
            } catch (e) {
                console.warn('DB Fetch failed', e);
            }

            // 2. Fetch Local
            const localPosts = IncludeParser.getLocalPosts();

            // 3. Fetch Event Store
            let eventPosts = [];
            try {
                const res = await fetch('/__api/aggregates?type=page');
                if (res.ok) {
                    const data = await res.json();
                    eventPosts = data.aggregates.map(a => ({ ...a.state, id: a.id, source: 'event-store' }));
                }
            } catch (e) { }

            // Merge
            const all = [...dbPosts.map(p => ({ ...p, source: 'database' })), ...localPosts.map(p => ({ ...p, source: 'local' })), ...eventPosts];

            return all.map(p => {
                let badgeClass = 'bg-secondary';
                let sourceLabel = 'Local';
                if (p.source === 'database') { badgeClass = 'bg-primary'; sourceLabel = 'DB'; }
                else if (p.source === 'event-store') { badgeClass = 'bg-info text-dark'; sourceLabel = 'Event Store'; }

                let tagsHtml = '';
                if (p.tags) {
                    const list = Array.isArray(p.tags) ? p.tags : p.tags.split(',');
                    tagsHtml = list.map(t => `<span class="badge rounded-pill bg-light text-dark border me-1">${t.trim()}</span>`).join('');
                }

                let editUrl = `/admin/editor/${p.id || p.slug}?source=${p.source}`;
                if (p.source === 'local') editUrl += `&path=${encodeURIComponent(p.path)}`;

                return {
                    id: p.id || p.slug,
                    title: p.title || 'Untitled',
                    source: p.source,
                    source_badge: `<span class="badge ${badgeClass}">${sourceLabel}</span>`,
                    tags_html: tagsHtml,
                    path: p.path || '',
                    encoded_path: p.path ? encodeURIComponent(p.path) : '',
                    preview: p.description || (typeof p.content === 'string' ? p.content.substring(0, 50) + '...' : '(Content)'),
                    edit_url: editUrl
                };
            });

        } catch (e) {
            console.error('admin_posts error', e);
            return [];
        }
    },

    admin_users: async () => {
        try {
            const res = await fetch('/__api/aggregates?type=user', { cache: 'no-store' });
            if (!res.ok) return [];
            const data = await res.json();

            return (data.aggregates || []).map(a => {
                const u = a.state;
                return {
                    ...u,
                    id: a.id,
                    roleBadge: u.role === 'admin' ? 'bg-danger' : 'bg-primary',
                    statusBadge: u.status === 'active' ? 'bg-success' : 'bg-secondary',
                    roleDisplay: u.role || 'user',
                    statusDisplay: u.status || 'inactive'
                };
            });
        } catch (e) {
            console.error('Failed to load users', e);
            return [];
        }
    }
};
