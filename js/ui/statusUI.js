// js/ui/statusUI.js
import { showView } from './coreUI.js';

export async function renderActionStatus({ status, message, backView, backViewId }) {
    await showView('action_status');
    const titleEl = document.getElementById('status-title');
    const messageEl = document.getElementById('status-message');
    const backBtn = document.getElementById('status-back-btn');

    if (status === 'success') {
        titleEl.textContent = 'Success!';
        titleEl.className = 'text-2xl font-bold text-green-600';
    } else {
        titleEl.textContent = 'Error';
        titleEl.className = 'text-2xl font-bold text-red-600';
    }
    messageEl.textContent = message;
    
    backBtn.dataset.backView = backView;
    if (backViewId) {
        backBtn.dataset.backViewId = backViewId;
    }
}