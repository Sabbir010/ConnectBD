// js/handlers/archiveHandlers.js
import { apiRequest, API_URL } from '../api.js';
import { 
    showView, renderArchiveList, renderArchiveDetails,
    renderArchiveEditForm, renderActionStatus 
} from '../ui.js';

export const fetchData_archives = {
    allArchives: async () => {
        const data = await apiRequest(`${API_URL}?action=get_all_archives`);
        if (data.status === 'success') {
            renderArchiveList(data.archives);
        }
    },
    archiveDetails: async (archiveId) => {
        const data = await apiRequest(`${API_URL}?action=get_archive_details&archive_id=${archiveId}`);
        if (data.status === 'success') {
            return data;
        } else {
            await renderActionStatus({ status: 'error', message: data.message || 'Could not load archive.', backView: 'archives' });
            return null;
        }
    },
};

export async function handleArchiveClicks(target, currentUser) {
    if (target.id === 'archives-btn' || target.classList.contains('back-to-archives')) {
        await showView('archives');
        fetchData_archives.allArchives();
        return true;
    }

    if (target.id === 'create-archive-btn') {
        await showView('archive_create');
        return true;
    }
    
    // --- এই অংশটি আপডেট করা হয়েছে ---
    const viewArchiveBtn = target.closest('.view-archive-btn');
    if (viewArchiveBtn) {
        const archiveId = viewArchiveBtn.dataset.archiveId;
        if (archiveId) { // আইডি পাওয়া গেলে তবেই কাজ করবে
            await showView('archive_view');
            const data = await fetchData_archives.archiveDetails(archiveId);
            if(data) renderArchiveDetails(data, currentUser);
        }
        return true;
    }

    const editArchiveBtn = target.closest('.edit-archive-btn');
    if (editArchiveBtn) {
        const archiveId = editArchiveBtn.dataset.archiveId;
        await showView('archive_edit');
        const data = await fetchData_archives.archiveDetails(archiveId);
        if(data && data.status === 'success'){
            renderArchiveEditForm(data.archive);
        }
        return true;
    }
    
    const likeArchiveBtn = target.closest('.like-archive-btn');
    if(likeArchiveBtn) {
        const archiveId = likeArchiveBtn.dataset.archiveId;
        const type = likeArchiveBtn.dataset.type;
        const formData = new FormData();
        formData.append('action', 'like_archive');
        formData.append('archive_id', archiveId);
        formData.append('type', type);
        await apiRequest(API_URL, { method: 'POST', body: formData });
        const data = await fetchData_archives.archiveDetails(archiveId);
        if(data) renderArchiveDetails(data, currentUser);
        return true;
    }

    const deleteArchiveReplyBtn = target.closest('.delete-archive-reply-btn');
    if(deleteArchiveReplyBtn){
        const replyId = deleteArchiveReplyBtn.dataset.replyId;
        const archiveId = document.getElementById('reply-archive-id').value;
        const formData = new FormData();
        formData.append('action', 'delete_archive_reply');
        formData.append('reply_id', replyId);
        const data = await apiRequest(API_URL, { method: 'POST', body: formData });
        if (data.status === 'success') {
            const archiveData = await fetchData_archives.archiveDetails(archiveId);
            if(archiveData) renderArchiveDetails(archiveData, currentUser);
        }
        return true;
    }
    
    const deleteArchiveBtn = target.closest('.delete-archive-btn');
    if(deleteArchiveBtn){
        const archiveId = deleteArchiveBtn.dataset.archiveId;
        if (confirm('Are you sure you want to delete this archive?')) {
            const formData = new FormData();
            formData.append('action', 'delete_archive');
            formData.append('archive_id', archiveId);
            const data = await apiRequest(API_URL, { method: 'POST', body: formData });
            await renderActionStatus({
                status: data.status,
                message: data.message || 'Action completed.',
                backView: 'archives'
            });
        }
        return true;
    }
    return false;
}

export async function handleArchiveSubmits(form, formData, currentUser) {
    if (form.id === 'archive-create-form') {
        formData.append('action', 'create_archive');
        const data = await apiRequest(API_URL, { method: 'POST', body: formData });
        await renderActionStatus({ status: data.status, message: data.message, backView: 'archives' });
        return true;
    }
    
    if (form.id === 'archive-edit-form') {
        formData.append('action', 'edit_archive');
        const archiveId = form.elements.archive_id.value;
        const data = await apiRequest(API_URL, { method: 'POST', body: formData });
        await renderActionStatus({ status: data.status, message: data.message, backView: 'archive_view', backViewId: archiveId });
        return true;
    }

    if (form.id === 'archive-reply-form') {
        formData.append('action', 'post_archive_reply');
        const archiveId = form.elements.archive_id.value;
        const data = await apiRequest(API_URL, { method: 'POST', body: formData });
        if (data.status === 'success') {
            form.reset();
            document.getElementById('reply-archive-id').value = archiveId;
            const archiveData = await fetchData_archives.archiveDetails(archiveId);
            return { needsRender: true, archiveData };
        } else {
             await renderActionStatus({ status: 'error', message: data.message, backView: 'archive_view', backViewId: archiveId });
        }
        return true;
    }
    return false;
}