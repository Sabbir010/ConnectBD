// js/handlers/reportHandlers.js
import { apiRequest, API_URL } from '../api.js';
import { renderReportsList, renderReportLogs, showView, renderTopicDetails, renderArchiveDetails } from '../ui.js';
import { fetchData_shouts } from './shoutHandlers.js';
import { fetchData_topics } from './topicHandlers.js';
import { fetchData_archives } from './archiveHandlers.js';

export const fetchData_reports = {
    list: async () => {
        const data = await apiRequest(`${API_URL}?action=get_reports`);
        if (data.status === 'success') {
            renderReportsList(data.reports);
        }
    },
    logs: async () => {
        const data = await apiRequest(`${API_URL}?action=get_report_logs`);
        if (data.status === 'success') {
            renderReportLogs(data.logs);
        }
    }
};

export async function handleReportClicks(target, currentUser) {
    if (target.id === 'submit-report-btn') {
        const form = document.getElementById('report-submission-form');
        if (form) {
            const formData = new FormData(form);
            formData.append('action', 'submit_report');
            const data = await apiRequest(API_URL, { method: 'POST', body: formData });
            
            alert(data.message || 'Action completed.');
            const modal = document.getElementById('report-modal');
            if (modal) {
                modal.remove();
            }
        }
        return true;
    }

    const updateBtn = target.closest('.update-report-btn');
    if (updateBtn) {
        const reportId = updateBtn.dataset.reportId;
        const newStatus = updateBtn.dataset.status;

        const formData = new FormData();
        formData.append('action', 'update_report_status');
        formData.append('report_id', reportId);
        formData.append('new_status', newStatus);

        const data = await apiRequest(API_URL, { method: 'POST', body: formData });
        if (data.status === 'success') {
            const isLogsView = document.getElementById('report-logs-list');
            if (isLogsView) {
                fetchData_reports.logs();
            } else {
                fetchData_reports.list();
            }
        } else {
            alert(data.message || 'Failed to update report.');
        }
        return true;
    }

    const viewContentLink = target.closest('.view-reported-content');
    if (viewContentLink) {
        const type = viewContentLink.dataset.type;
        const id = viewContentLink.dataset.id;
        
        switch (type) {
            case 'shout':
                await showView('single_shout_view');
                fetchData_shouts.singleShout(id, currentUser);
                
                setTimeout(() => {
                    const backBtn = document.getElementById('single-shout-back-btn');
                    if (backBtn) {
                        backBtn.innerHTML = '&larr; Back to Reports';
                        backBtn.classList.add('back-to-reports');
                    }
                }, 100);
                break;
            case 'topic_reply':
                await showView('topic_view');
                const topicData = await fetchData_topics.topicDetails(null, 1, id);
                if(topicData) renderTopicDetails(topicData, currentUser);
                break;
            case 'topic':
                await showView('topic_view');
                const topicData2 = await fetchData_topics.topicDetails(id);
                if(topicData2) renderTopicDetails(topicData2, currentUser);
                break;
            case 'archive_reply':
                const archiveDataForReply = await apiRequest(`${API_URL}?action=get_archive_details_by_reply&reply_id=${id}`);
                if (archiveDataForReply.status === 'success') {
                    await showView('archive_view');
                    const archiveData = await fetchData_archives.archiveDetails(archiveDataForReply.archive_id);
                    if(archiveData) renderArchiveDetails(archiveData, currentUser);
                } else {
                    alert(archiveDataForReply.message || 'Could not find the parent archive.');
                }
                break;
            case 'archive':
                await showView('archive_view');
                const archiveData = await fetchData_archives.archiveDetails(id);
                if(archiveData) renderArchiveDetails(archiveData, currentUser);
                break;
        }
        return true;
    }

    if (target.matches('.back-to-reports')) {
        await showView('reports');
        fetchData_reports.list();
        return true;
    }

    return false;
}

// এই ফাংশনটি আর কোনো কাজ করবে না, তাই এটিকে খালি রাখা হয়েছে।
export async function handleReportSubmits(form, formData) {
    return false;
}