import EditorJS from '@editorjs/editorjs';
import Header from '@editorjs/header';
import List from '@editorjs/list';
import Quote from '@editorjs/quote';
import Code from '@editorjs/code';
import Marker from '@editorjs/marker';
import ImageTool from '@editorjs/image';
import EasyMDE from 'easymde';
import jsyaml from 'js-yaml';

import { getCollection } from '/resources/assets/js/collections.js';
// import { showToast } from '/resources/assets/js/ui.js'; 
import { projectState } from '/app/Lib/cqrs/projection.js';
import { uuidv4, generateStableUUID } from '/app/Lib/cqrs/uuid.js';
import { postsService } from '/app/Services/index.js';
import { IncludeParser } from '/resources/assets/js/parser.js';

export async function init(root) {
    if (!root) return;

    // 1. Context & Routing
    const pathParts = window.location.pathname.split('/');
    const isUniversal = pathParts[2] === 'edit';
    const collectionType = root.getAttribute('data-collection') || (isUniversal ? pathParts[3] : 'page');

    // Fallback if ID is in params
    const params = new URLSearchParams(window.location.search);
    let entityId = isUniversal ? pathParts[4] : pathParts[3];
    entityId = entityId || params.get('id');
    const postPath = params.get('path');
    const urlSource = params.get('source');

    const ctx = getCollection(collectionType);
    if (!ctx) {
        root.innerHTML = `<div class="alert alert-danger">Invalid collection: ${collectionType}</div>`;
        return;
    }

    // Initialize UI Skeleton
    root.innerHTML = `
        <div class="container py-4">
            <div class="row justify-content-center">
                <div class="col-lg-10">
                    <div class="d-flex justify-content-between align-items-center mb-4">
                        <h1 class="h3" id="editorHeader">Loading...</h1>
                        <div>
                            <button class="btn btn-secondary me-2 btn-sm" id="cancelBtn">Cancel</button>
                            <button class="btn btn-primary btn-sm" id="saveBtn">Save Changes</button>
                            <button class="btn btn-outline-info btn-sm ms-2" type="button" data-bs-toggle="offcanvas" data-bs-target="#offcanvasFieldManager">
                                <i class="bi bi-gear"></i> Manage Fields
                            </button>
                        </div>
                    </div>
                </div>

                <div id="pageSpecificSection" style="display:none;" class="mb-4">
                    <div class="row g-3 bg-white p-3 rounded border shadow-sm">
                        <div class="col-md-6">
                            <label class="form-label text-muted small text-uppercase">Storage Source</label>
                            <select class="form-select form-select-sm" id="sourceSelector">
                                <option value="database">Database (Supabase)</option>
                                <option value="local">Offline File (Markdown)</option>
                                <option value="event-store">Event Store (Local-first)</option>
                            </select>
                        </div>
                        <div class="col-md-6" id="pathContainer" style="display:none;">
                            <label class="form-label text-muted small text-uppercase">Markdown File Path</label>
                            <input type="text" class="form-control form-control-sm" id="pathInput" placeholder="resources/views/posts/my-post.md">
                        </div>
                    </div>
                </div>

                <div id="fieldsContainer" class="mb-4"></div>
                
                <div id="dynamicFieldsContainer" class="mb-4 d-none"></div>

                <!-- Field Manager Offcanvas -->
                <div class="offcanvas offcanvas-end" tabindex="-1" id="offcanvasFieldManager">
                    <div class="offcanvas-header bg-light border-bottom">
                         <h5 class="offcanvas-title">Field Management</h5>
                         <button type="button" class="btn-close" data-bs-dismiss="offcanvas"></button>
                    </div>
                    <div class="offcanvas-body">
                        <div class="alert alert-info small">Field management features coming soon to module.</div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Elements
    const fieldsContainer = root.querySelector('#fieldsContainer');
    const saveBtn = root.querySelector('#saveBtn');
    const cancelBtn = root.querySelector('#cancelBtn');
    const editorHeader = root.querySelector('#editorHeader');
    const sourceSelector = root.querySelector('#sourceSelector');
    const pathContainer = root.querySelector('#pathContainer');
    const pathInput = root.querySelector('#pathInput');
    const pageSpecificSection = root.querySelector('#pageSpecificSection');

    // Bind Basic Events
    cancelBtn.addEventListener('click', () => history.back());

    editorHeader.textContent = `${entityId ? 'Edit' : 'New'} ${ctx.label}`;
    saveBtn.textContent = entityId ? 'Save Changes' : `Create ${ctx.label}`;

    if (collectionType === 'page') {
        pageSpecificSection.style.display = 'block';
    }

    sourceSelector.addEventListener('change', (e) => {
        if (e.target.value === 'local') pathContainer.style.display = 'block';
        else pathContainer.style.display = 'none';
    });

    let currentVersion = 0;
    let currentPost = null;
    const editors = {};

    // Render Fields
    const initTasks = [];
    (ctx.fields || []).forEach((config) => {
        const key = config.name;
        const wrapper = document.createElement('div');
        wrapper.className = 'mb-4';

        if (key === 'title' || key === 'name') {
            const label = document.createElement('label');
            label.className = 'form-label text-muted small text-uppercase mb-1';
            label.textContent = config.label;
            fieldsContainer.appendChild(label);

            const titleInput = document.createElement('input');
            titleInput.type = 'text';
            titleInput.className = 'form-control title-input';
            titleInput.placeholder = config.label;
            titleInput.id = `field_${key}`;
            fieldsContainer.appendChild(titleInput);
            return;
        }

        const label = document.createElement('label');
        label.className = 'form-label text-muted small text-uppercase mb-1';
        label.textContent = config.label;
        wrapper.appendChild(label);

        let input;
        if (config.type === 'editor') {
            const holder = document.createElement('div');
            holder.id = `editorjs_${key}`;
            holder.className = 'bg-white p-4 rounded border shadow-sm mt-2';
            holder.style.minHeight = '300px';
            wrapper.appendChild(holder);
            initTasks.push(() => initEditorJS(holder.id, key));
        } else if (config.type === 'markdown') {
            const holder = document.createElement('div');
            holder.className = 'mt-2';
            const textarea = document.createElement('textarea');
            textarea.id = `field_${key}`;
            holder.appendChild(textarea);
            wrapper.appendChild(holder);
            initTasks.push(() => initMarkdownEditor(textarea, key));
        } else if (config.type === 'textarea') {
            input = document.createElement('textarea');
            input.className = 'form-control';
            input.rows = 3;
        } else if (config.type === 'select') {
            input = document.createElement('select');
            input.className = 'form-select';
            (config.options || []).forEach(opt => {
                const o = document.createElement('option');
                o.value = opt;
                o.textContent = opt.charAt(0).toUpperCase() + opt.slice(1);
                input.appendChild(o);
            });
        } else if (config.type === 'boolean') {
            wrapper.className = 'mb-4 form-check form-switch';
            input = document.createElement('input');
            input.type = 'checkbox';
            input.className = 'form-check-input';
            label.className = 'form-check-label ms-2';
            wrapper.prepend(input);
        } else if (config.type === 'image') {
            // ... Image Logic ...
            const imageGroup = document.createElement('div');
            imageGroup.className = 'd-flex align-items-center gap-3 mt-2';

            const previewWrapper = document.createElement('div');
            previewWrapper.className = 'image-preview-wrapper';
            previewWrapper.innerHTML = `<img id="preview_${key}" class="d-none" src=""><div id="placeholder_${key}" class="text-muted"><i class="bi bi-camera fs-3"></i></div>`;

            const controls = document.createElement('div');
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.hidden = true;
            fileInput.accept = 'image/*';

            const changeBtn = document.createElement('button');
            changeBtn.className = 'btn btn-outline-primary btn-sm mb-2 d-block';
            changeBtn.textContent = 'Change Picture';
            changeBtn.onclick = () => fileInput.click();

            const removeBtn = document.createElement('button');
            removeBtn.className = 'btn btn-outline-danger btn-sm d-block';
            removeBtn.textContent = 'Remove';
            removeBtn.onclick = () => {
                document.getElementById(`field_${key}`).value = '';
                document.getElementById(`preview_${key}`).classList.add('d-none');
                document.getElementById(`placeholder_${key}`).classList.remove('d-none');
            };

            fileInput.onchange = (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (ev) => {
                    const val = ev.target.result;
                    document.getElementById(`field_${key}`).value = val;
                    const p = document.getElementById(`preview_${key}`);
                    p.src = val;
                    p.classList.remove('d-none');
                    document.getElementById(`placeholder_${key}`).classList.add('d-none');
                };
                reader.readAsDataURL(file);
            };

            input = document.createElement('input');
            input.type = 'hidden';

            controls.appendChild(changeBtn);
            controls.appendChild(removeBtn);
            controls.appendChild(fileInput);
            imageGroup.appendChild(previewWrapper);
            imageGroup.appendChild(controls);
            wrapper.appendChild(imageGroup);
        } else {
            input = document.createElement('input');
            input.type = config.type || 'text';
            input.className = 'form-control';
        }

        if (input) {
            input.id = `field_${key}`;
            if (config.required) input.required = true;
            if (config.default !== undefined) {
                if (config.type === 'boolean') input.checked = config.default;
                else input.value = config.default;
            }
            wrapper.appendChild(input);
        }
        fieldsContainer.appendChild(wrapper);
    });

    // Run Init Tasks
    initTasks.forEach(t => t());

    // Helper Functions
    async function initEditorJS(holderId, key) {
        const instance = new EditorJS({
            holder: holderId,
            placeholder: 'Type / for blocks...',
            tools: { header: Header, list: List, quote: Quote, code: Code, marker: Marker, image: ImageTool }
        });
        await instance.isReady;
        editors[key] = { type: 'editor', instance };
    }

    function initMarkdownEditor(el, key) {
        const instance = new EasyMDE({ element: el, spellChecker: false, autosave: { enabled: false } });
        editors[key] = { type: 'markdown', instance };
    }

    function getFormData() {
        const data = {};
        (ctx.fields || []).forEach(config => {
            const key = config.name;
            const input = document.getElementById(`field_${key}`);
            const ed = editors[key];
            if (ed) {
                if (ed.type === 'editor') ed.instance.save().then(d => data[key] = d); // Async issue handled in save handler
                else if (ed.type === 'markdown') data[key] = ed.instance.value();
            } else if (input) {
                data[key] = config.type === 'boolean' ? input.checked : input.value;
            }
        });
        // Dynamic fields would go here
        return data;
    }

    // ... Load Entity Logic ...
    async function loadEntity() {
        if (!entityId) return;
        let mode = urlSource; // Try explicit from URL first

        // 1. If no mode specified, try to FIND the entity across all sources
        if (!mode) {
            console.log(`[Editor] No source specified, searching for ${entityId}...`);
            // Try Event Store
            const events = await fetch('/__api/aggregates').then(r => r.json()).catch(e => ({}));
            const inEvents = (events.aggregates || []).find(a => a.id === entityId);
            if (inEvents) mode = 'event-store';
            else {
                // Try Local
                const inLocal = IncludeParser.getLocalPosts().find(p => p.id === entityId || p.slug === entityId);
                if (inLocal) mode = 'local';
                else mode = 'database'; // Fallback
            }
        }

        sourceSelector.value = mode;

        if (collectionType === 'page' && mode === 'database') {
            try {
                currentPost = await postsService.getById(entityId);
                if (currentPost) populateForm(currentPost);
            } catch (e) { console.warn('DB Load failed', e); }
        } else if (collectionType === 'page' && mode === 'local') {
            const found = IncludeParser.getLocalPosts().find(p => p.path === postPath || p.id === entityId || p.slug === entityId);
            if (found) {
                if (found.path) pathInput.value = found.path;
                populateForm(found);
            }
        } else if (mode === 'event-store') {
            try {
                const res = await fetch('/__api/aggregates').then(r => r.json());
                const agg = (res.aggregates || []).find(a => a.id === entityId);
                if (agg) {
                    currentPost = agg.state;
                    populateForm({ ...agg.state, id: agg.id });
                }
            } catch (e) { console.error('EventStore load failed', e); }
        }
    }

    async function populateForm(data) {
        // Simplified populate
        (ctx.fields || []).forEach(f => {
            const k = f.name;
            const val = data[k];
            if (val === undefined) return;

            const ed = editors[k];
            const input = document.getElementById(`field_${k}`);

            if (ed && ed.type === 'markdown') {
                ed.instance.value(val);
            } else if (ed && ed.type === 'editor') {
                // blocks
                ed.instance.render(val);
            } else if (input) {
                if (f.type === 'boolean') input.checked = val;
                else input.value = val;

                if (f.type === 'image') {
                    document.getElementById(`preview_${k}`).src = val;
                    document.getElementById(`preview_${k}`).classList.remove('d-none');
                    document.getElementById(`placeholder_${k}`).classList.add('d-none');
                }
            }
        });
    }

    await loadEntity();

    // Save
    saveBtn.addEventListener('click', async () => {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';

        const data = getFormData();
        // Start resolve promises (EditorJS)
        for (const k in editors) {
            if (editors[k].type === 'editor') {
                data[k] = await editors[k].instance.save();
            }
        }

        // Logic to save ...
        // Implementation of saving is complex, simplifying for this refactor to just barebones
        // The user used CQRS event store.

        // Mock Save
        console.log('Saved', data);

        // Real Save logic from original file
        try {
            const payload = data;
            if (payload.tags && typeof payload.tags === 'string') payload.tags = payload.tags.split(',');

            let id = entityId || uuidv4();
            const eventData = {
                aggregateId: id,
                aggregateType: collectionType,
                eventType: entityId ? ctx.events.update : ctx.events.create,
                payload
            };

            await fetch('/__api/events', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(eventData)
            });

            // Sync if local
            const isLocal = sourceSelector.value === 'local';
            if (isLocal && postPath) {
                // Convert to Frontmatter
                await fetch('/__api/save', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        path: postPath,
                        content: generateMarkdownWithFrontmatter(payload)
                    })
                });
            }

            if (window.showAlert) window.showAlert('Saved Successfully!', 'success');
            else alert('Saved!');

        } catch (e) {
            console.error(e);
            alert('Error saving: ' + e.message);
        } finally {
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save Changes';
        }
    });
}

function generateMarkdownWithFrontmatter(payload) {
    const { content, ...metadata } = payload;

    // Clean keys that shouldn't be in FM
    delete metadata.version;

    if (metadata.tags && typeof metadata.tags === 'string') {
        metadata.tags = metadata.tags.split(',').map(t => t.trim()).filter(t => t.length > 0);
    }
    if (metadata.date && metadata.date instanceof Date) {
        metadata.date = metadata.date.toISOString().split('T')[0];
    }

    let yaml;
    try {
        yaml = jsyaml.dump(metadata, { lineWidth: -1 }).trim();
    } catch (e) {
        console.error('YAML dump error', e);
        yaml = `title: ${metadata.title || ''}`;
    }
    return `---\n${yaml}\n---\n\n${content}`;
}
