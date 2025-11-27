// js/handlers/shoutHandlers.js
import { apiRequest, API_URL } from '../api.js';
import { showView, renderShout, renderShoutPagination, renderShoutEditForm, renderActionStatus, renderSingleShoutPage, renderShoutReactorsList } from '../ui.js';

export const fetchData_shouts = {
    latestShout: async (currentUser) => {
        const latestShoutContainer = document.getElementById('latest-shout-container');
        if (!latestShoutContainer) return;

        const data = await apiRequest(`${API_URL}?action=get_latest_shout`);

        if (document.getElementById('latest-shout-container')) {
            if (data.status === 'success' && data.shout) {
                const newShoutElement = await renderShout(data.shout, currentUser);
                const existingShout = latestShoutContainer.querySelector('[data-shout-id]');

                if (existingShout && existingShout.dataset.shoutId == data.shout.id && existingShout.innerHTML === newShoutElement.innerHTML) {
                    return;
                }
                
                if (existingShout) {
                    existingShout.replaceWith(newShoutElement);
                } else {
                    latestShoutContainer.innerHTML = ''; 
                    latestShoutContainer.appendChild(newShoutElement);
                }
            } else {
                latestShoutContainer.innerHTML = '<p class="text-center text-gray-500">No shouts have been posted yet.</p>';
            }
        }
    },
    allShouts: async (currentUser, page = 1) => {
        const shoutHistoryList = document.getElementById('shout-history-list');
        if(!shoutHistoryList) return;
        
        const data = await apiRequest(`${API_URL}?action=get_shouts&page=${page}`);
        shoutHistoryList.innerHTML = '';

        if (data.status === 'success' && data.shouts) {
            const shoutElements = await Promise.all(
                data.shouts.map(shout => renderShout(shout, currentUser))
            );
            shoutElements.forEach(element => shoutHistoryList.appendChild(element));

            if (data.pagination) {
                renderShoutPagination(data.pagination.currentPage, data.pagination.totalPages);
            }
        }
    },
    singleShout: async (shoutId, currentUser) => {
        const data = await apiRequest(`${API_URL}?action=get_single_shout&shout_id=${shoutId}`);
        if (data.status === 'success') {
            await renderSingleShoutPage(data.shout, currentUser);
        } else {
            await renderSingleShoutPage(null, currentUser);
        }
    }
};

export async function handleShoutClicks(target, currentUser) {
    if (target.id === 'shout-history-btn' || target.classList.contains('back-to-shout-history') || target.id === 'back-to-shout-history-from-reactors') {
        await showView('shout_history');
        await fetchData_shouts.allShouts(currentUser, 1);
        return true;
    }

    if (target.id === 'single-shout-back-btn') {
        if (target.classList.contains('back-to-notifications')) {
            await showView('notifications');
            const data = await apiRequest(`${API_URL}?action=get_notifications`);
            if (data.status === 'success') {
                const { renderNotifications } = await import('../ui.js');
                renderNotifications(data);
            }
        } else if (target.classList.contains('back-to-reports')) {
            await showView('reports');
            const { fetchData_reports } = await import('./reportHandlers.js');
            fetchData_reports.list();
        } else {
            await showView('shout_history');
            fetchData_shouts.allShouts(currentUser, 1);
        }
        return true;
    }

    const viewReactorsBtn = target.closest('.view-reactors-btn');
    if (viewReactorsBtn) {
        const shoutId = viewReactorsBtn.dataset.shoutId;
        const reaction = viewReactorsBtn.dataset.reaction;
        await showView('shout_reactors');
        const data = await apiRequest(`${API_URL}?action=get_shout_reactors&shout_id=${shoutId}&reaction=${reaction}`);
        if (data.status === 'success') {
            renderShoutReactorsList({ reactors: data.reactors, reaction: reaction });
        }
        return true;
    }

    const paginationButton = target.closest('#shout-pagination-container button');
    if (paginationButton && paginationButton.dataset.page) {
        const page = parseInt(paginationButton.dataset.page, 10);
        await fetchData_shouts.allShouts(currentUser, page);
        return true;
    }

    const reactBtn = target.closest('.react-btn');
    if (reactBtn) {
        const shoutElement = reactBtn.closest('[data-shout-id]');
        const shoutId = shoutElement.dataset.shoutId;
        const reaction = reactBtn.dataset.reaction;

        const formData = new FormData();
        formData.append('action', 'add_reaction');
        formData.append('shout_id', shoutId);
        formData.append('reaction', reaction);

        const result = await apiRequest(API_URL, { method: 'POST', body: formData });
        
        if (result.status === 'success') {
            const isHomeViewActive = document.getElementById('latest-shout-container');
            const isHistoryViewActive = document.getElementById('shout-history-list');

            if (isHomeViewActive) {
                await fetchData_shouts.latestShout(currentUser);
            } else if (isHistoryViewActive) {
                const currentPage = document.querySelector('#shout-pagination-container .bg-violet-600')?.dataset.page || 1;
                await fetchData_shouts.allShouts(currentUser, currentPage);
            }
        }
        return true;
    }

    const deleteBtn = target.closest('.delete-shout-btn');
    if (deleteBtn) {
        const shoutId = deleteBtn.dataset.shoutId;
        if (confirm('Are you sure you want to delete this shout?')) {
            const formData = new FormData();
            formData.append('action', 'delete_shout');
            formData.append('shout_id', shoutId);
            const data = await apiRequest(API_URL, { method: 'POST', body: formData });
            if (data.status === 'success') {
                const currentPage = document.querySelector('#shout-pagination-container .bg-violet-600')?.dataset.page || 1;
                await fetchData_shouts.allShouts(currentUser, currentPage);
            } else {
                alert(data.message || 'Failed to delete shout.');
            }
        }
        return true;
    }

    const editBtn = target.closest('.edit-shout-btn');
    if (editBtn) {
        const shoutId = editBtn.dataset.shoutId;
        await showView('shout_edit');
        
        const data = await apiRequest(`${API_URL}?action=get_shout_details&shout_id=${shoutId}`);
        if (data.status === 'success') {
            renderShoutEditForm(data.shout);
        } else {
            await renderActionStatus({ status: 'error', message: data.message, backView: 'shout_history' });
        }
        return true;
    }

    const pinBtn = target.closest('.pin-shout-btn');
    if (pinBtn) {
        const shoutId = pinBtn.dataset.shoutId;
        const formData = new FormData();
        formData.append('action', 'pin_shout');
        formData.append('shout_id', shoutId);
        const data = await apiRequest(API_URL, { method: 'POST', body: formData });
        if (data.status === 'success') {
            alert(data.message);
            const statusData = await apiRequest(`${API_URL}?action=check_status`);
            if (statusData.status === 'success' && statusData.user) {
                Object.assign(currentUser, statusData.user);
                const isHistoryViewActive = document.getElementById('shout-history-list');
                if (isHistoryViewActive) {
                    const currentPage = document.querySelector('#shout-pagination-container .bg-violet-600')?.dataset.page || 1;
                    await fetchData_shouts.allShouts(currentUser, currentPage);
                } else {
                    await fetchData_shouts.latestShout(currentUser);
                }
            }
        } else {
            alert(data.message || 'Action failed.');
        }
        return true;
    }
    
    return false;
}

export async function handleShoutSubmits(form, formData, currentUser) {
    if (form.id === 'shout-form') {
        const messageInput = document.getElementById('shout-message');
        if (messageInput.value.trim()) {
            formData.append('action', 'post_shout');
            formData.append('message', messageInput.value.trim());
            await apiRequest(API_URL, { method: 'POST', body: formData });
            messageInput.value = '';
            await fetchData_shouts.latestShout(currentUser);
        }
        return true;
    }

    if (form.id === 'shout-history-form') {
        const messageInput = document.getElementById('shout-history-message');
        if (messageInput.value.trim()) {
            const historyFormData = new FormData(form);
            historyFormData.append('action', 'post_shout');
            historyFormData.append('message', messageInput.value.trim());
            
            await apiRequest(API_URL, { method: 'POST', body: historyFormData });
            messageInput.value = '';
            await fetchData_shouts.allShouts(currentUser, 1);
        }
        return true;
    }

    if (form.id === 'shout-edit-form') {
        formData.append('action', 'edit_shout');
        const data = await apiRequest(API_URL, { method: 'POST', body: formData });
        
        await renderActionStatus({
            status: data.status,
            message: data.message || 'Action completed.',
            backView: 'shout_history'
        });
        return true;
    }

    return false;
}