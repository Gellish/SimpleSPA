/**
 * Shared UI Utilities
 */

/**
 * Shows a toast notification
 * @param {string} message 
 * @param {string} type 'success' | 'error'
 */
export function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast-box ${type}`;
    toast.innerHTML = `<span>${message}</span><button class="btn-close btn-close-white ms-3" style="font-size: 0.7rem;"></button>`;

    container.appendChild(toast);

    const timer = setTimeout(() => {
        toast.style.animation = 'fadeOut 0.5s forwards';
        setTimeout(() => toast.remove(), 500);
    }, 3000);

    const closeBtn = toast.querySelector('.btn-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            clearTimeout(timer);
            toast.remove();
        });
    }
}
