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

/**
 * Shows a confirmation modal
 * @param {string} message 
 * @returns {Promise<boolean>}
 */
export function showConfirm(message) {
    return new Promise((resolve) => {
        const modalId = 'confirm_modal_' + Date.now();
        const modalHtml = `
            <div class="modal fade" id="${modalId}" tabindex="-1" aria-hidden="true" style="z-index: 10000;">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content shadow-lg border-0">
                        <div class="modal-body p-4 text-center">
                            <i class="bi bi-exclamation-circle text-warning display-4 mb-3 d-block"></i>
                            <h5 class="mb-3">Are you sure?</h5>
                            <p class="text-muted mb-4">${message}</p>
                            <div class="d-flex justify-content-center gap-2">
                                <button type="button" class="btn btn-secondary px-4 bg-transparent text-muted border-0" data-bs-dismiss="modal">Cancel</button>
                                <button type="button" class="btn btn-danger px-4" id="${modalId}_confirm">Yes, Delete</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
        const modalEl = document.getElementById(modalId);
        const modal = new bootstrap.Modal(modalEl);

        let confirmed = false;

        const confirmBtn = document.getElementById(`${modalId}_confirm`);
        confirmBtn.onclick = () => {
            confirmed = true;
            modal.hide();
        };

        modalEl.addEventListener('hidden.bs.modal', () => {
            resolve(confirmed);
            modalEl.remove();
        });

        modal.show();
    });
}
