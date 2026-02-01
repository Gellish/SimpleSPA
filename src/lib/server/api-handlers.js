import fs from 'fs';
import path from 'path';
import { resolve } from 'path';
import { loadEnv } from 'vite';
import { writeEvent, readEvents, getAllAggregates, deleteAggregate } from '../cqrs/event-store.js';
import { projectState, pageReducer, userReducer } from '../cqrs/projection.js';

const __dirname = path.resolve();

export function registerApiHandlers(server) {
    // 2. Load Env for Service Key (Dev Mode Only)
    const env = loadEnv('development', process.cwd(), '');
    const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL;

    // Use unshift to ensure API handlers run BEFORE Vite's HTML middleware
    server.middlewares.stack.unshift({
        route: '/__api',
        handle: async (req, res, next) => {
            const url = new URL(req.url, `http://${req.headers.host}`);
            const pathReq = url.pathname;

            // Helper to get body
            const getBody = () => new Promise((resolve, reject) => {
                let body = '';
                req.on('data', chunk => body += chunk.toString());
                req.on('end', () => resolve(body));
                req.on('error', reject);
            });

            try {
                // --- AUTH HANDLERS ---
                if (req.method === 'POST' && pathReq === '/auth/login') {
                    const body = await getBody();
                    const { email, password } = JSON.parse(body);
                    const adminEmail = process.env.ADMIN_EMAIL || 'admin@email.com';
                    const adminPassword = process.env.ADMIN_PASSWORD || 'test1234';

                    if (email === adminEmail && password === adminPassword) {
                        res.statusCode = 200;
                        res.setHeader('Content-Type', 'application/json');
                        return res.end(JSON.stringify({
                            token: 'mock-jwt-token-' + Date.now(),
                            user: { email: adminEmail, name: 'Initial Admin', role: 'admin' }
                        }));
                    } else {
                        res.statusCode = 401;
                        res.setHeader('Content-Type', 'application/json');
                        return res.end(JSON.stringify({ message: 'Invalid credentials' }));
                    }
                }

                // --- ADMIN HANDLERS ---
                if (req.method === 'POST' && pathReq === '/admin/create-user') {
                    const body = await getBody();
                    if (!serviceKey) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');
                    const { createClient } = await import('@supabase/supabase-js');
                    const supabaseAdmin = createClient(supabaseUrl, serviceKey);
                    const { email, password, metadata } = JSON.parse(body);
                    const { data, error } = await supabaseAdmin.auth.admin.createUser({
                        email, password, email_confirm: true, user_metadata: metadata
                    });
                    if (error) throw error;
                    res.statusCode = 200;
                    return res.end(JSON.stringify({ user: data.user }));
                }

                if (req.method === 'POST' && pathReq === '/admin/update-user') {
                    const body = await getBody();
                    if (!serviceKey) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');
                    const { createClient } = await import('@supabase/supabase-js');
                    const supabaseAdmin = createClient(supabaseUrl, serviceKey);
                    const { id, updates } = JSON.parse(body);
                    const { data: profile, error } = await supabaseAdmin.from('profiles').upsert({ id, ...updates }).select().single();
                    if (error) throw error;
                    if (updates.username) {
                        await supabaseAdmin.auth.admin.updateUserById(id, { user_metadata: { username: updates.username } });
                    }
                    res.statusCode = 200;
                    return res.end(JSON.stringify({ success: true, profile }));
                }

                // --- EVENT STORE HANDLERS ---
                if (pathReq === '/events' || pathReq === '/events/') {
                    if (req.method === 'GET') {
                        const type = url.searchParams.get('type');
                        const id = url.searchParams.get('id');
                        const events = await readEvents(type, id);
                        res.statusCode = 200;
                        res.setHeader('Content-Type', 'application/json');
                        return res.end(JSON.stringify({ events }));
                    }
                    if (req.method === 'POST') {
                        const body = await getBody();
                        const eventData = JSON.parse(body);
                        const event = await writeEvent(eventData);
                        res.statusCode = 200;
                        return res.end(JSON.stringify({ success: true, event }));
                    }
                }

                if (req.method === 'POST' && pathReq === '/events/delete') {
                    const body = await getBody();
                    const { type, id } = JSON.parse(body);
                    await deleteAggregate(type, id);
                    res.statusCode = 200;
                    return res.end(JSON.stringify({ success: true }));
                }

                if (req.method === 'GET' && (pathReq === '/aggregates' || pathReq === '/aggregates/')) {
                    const typeFilter = url.searchParams.get('type');
                    const aggregates = await getAllAggregates();
                    const filtered = typeFilter ? aggregates.filter(a => a.type === typeFilter) : aggregates;
                    const results = await Promise.all(filtered.map(async (a) => {
                        const events = await readEvents(a.type, a.id);
                        const reducer = a.type === 'user' ? userReducer : pageReducer;
                        const state = projectState(events, reducer);
                        return { id: a.id, type: a.type, state, eventsCount: events.length };
                    }));
                    res.statusCode = 200;
                    res.setHeader('Content-Type', 'application/json');
                    return res.end(JSON.stringify({ aggregates: results }));
                }

                // --- LOCAL FILE HANDLERS ---
                if (req.method === 'POST' && pathReq === '/save') {
                    const body = await getBody();
                    const { path: filePath, content } = JSON.parse(body);
                    const relPath = filePath.startsWith('/') ? filePath.slice(1) : filePath;
                    const fullPath = resolve(__dirname, relPath);
                    if (!fullPath.toLowerCase().includes('src')) throw new Error('Access Denied');
                    const dir = path.dirname(fullPath);
                    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
                    fs.writeFileSync(fullPath, content, 'utf-8');
                    res.statusCode = 200;
                    return res.end(JSON.stringify({ success: true }));
                }

                if (req.method === 'POST' && pathReq === '/delete') {
                    const body = await getBody();
                    const { path: filePath } = JSON.parse(body);
                    const relPath = filePath.startsWith('/') ? filePath.slice(1) : filePath;
                    const fullPath = resolve(__dirname, relPath);
                    if (!fullPath.toLowerCase().includes('src')) throw new Error('Access Denied');
                    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
                    res.statusCode = 200;
                    return res.end(JSON.stringify({ success: true }));
                }

                // If no match in /__api, but it was matched by the 'route' mount, 
                // we should probably 404 here rather than passing it on.
                if (pathReq !== '/' && pathReq !== '') {
                    res.statusCode = 404;
                    return res.end(JSON.stringify({ error: 'API Endpoint Not Found' }));
                }

            } catch (err) {
                console.error('[API Error]:', err);
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                return res.end(JSON.stringify({ error: err.message }));
            }

            next();
        }
    });
}
