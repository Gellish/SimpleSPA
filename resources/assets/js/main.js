// Import our custom CSS
import '../css/main.css'

// Import all of Bootstrap's JS
import * as bootstrap from 'bootstrap'
window.bootstrap = bootstrap;

// Import Bootstrap's CSS
import 'bootstrap/dist/css/bootstrap.min.css'

import { IncludeParser } from './parser.js';
import { SPAFrame } from './spa-frame.js';

// Initialize App
const init = async () => {
    // Safety Force-Show
    setTimeout(() => document.body.style.visibility = 'visible', 3000);

    console.log('[Main] App initialization started');
    try {
        // Start SPA listener
        console.log('[Main] Starting SPAFrame...');
        SPAFrame.start();

        // Process includes
        console.log('[Main] Running IncludeParser...');
        await IncludeParser.run();
        console.log('[Main] IncludeParser completed');
    } catch (e) {
        console.error('[Main] Initialization failed:', e);
    } finally {
        console.log('[Main] Initialization finished - Reveal UI');
        document.body.style.visibility = 'visible';
    }
};

// Global error handler for diagnostic
window.addEventListener('error', (e) => {
    console.error('[Global Error]', e.message, 'at', e.filename, ':', e.lineno);
});

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Global Alert Helper
window.showAlert = (message, type = 'success') => {
    const toastEl = document.getElementById('statusToast');
    const toastMsg = document.getElementById('toastMessage');
    if (!toastEl || !toastMsg) return;

    // Set color based on type
    toastEl.className = `toast align-items-center text-white border-0 bg-${type === 'success' ? 'success' : 'danger'}`;
    toastMsg.textContent = message;

    // Ensure bootstrap is available
    if (window.bootstrap) {
        const toast = new window.bootstrap.Toast(toastEl, { delay: 3000 });
        toast.show();
    } else {
        toastEl.classList.add('show');
        setTimeout(() => toastEl.classList.remove('show'), 3000);
    }
};

window.SPAFrame = SPAFrame;
export { SPAFrame };
