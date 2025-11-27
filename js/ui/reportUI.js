// js/ui/reportUI.js
import { escapeHTML } from './coreUI.js';

export function showReportModal(type, id, preview) {
    const existingModal = document.getElementById('report-modal');
    if (existingModal) {
        existingModal.remove();
    }

    const modalHTML = `
        <div id="report-modal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div class="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
                <h3 class="font-bold text-xl mb-4">Report Content</h3>
                <div class="mb-4 bg-gray-100 p-2 rounded text-sm text-gray-600">
                    <p><strong>Reporting:</strong> ${escapeHTML(preview)}</p>
                </div>
                <form id="report-submission-form">
                    <input type="hidden" name="type" value="${type}">
                    <input type="hidden" name="id" value="${id}">
                    <label for="report-reason" class="block font-medium mb-2">Reason for reporting:</label>
                    <textarea id="report-reason" name="reason" class="w-full p-2 border rounded" rows="4" required></textarea>
                    <div class="mt-4 flex justify-end space-x-2">
                        <button type="button" id="cancel-report-btn" class="px-4 py-2 bg-gray-200 rounded">Cancel</button>
                        <button type="button" id="submit-report-btn" class="px-4 py-2 bg-red-600 text-white rounded">Submit Report</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

export function renderReportsList(reports) {
    const container = document.getElementById('reports-list');
    if (!container) return;

    container.innerHTML = '';
    if (reports.length === 0) {
        container.innerHTML = '<tr><td colspan="5" class="text-center py-4">No pending reports.</td></tr>';
        return;
    }

    reports.forEach(report => {
        const tr = document.createElement('tr');
        const isClickable = ['shout', 'topic', 'archive', 'topic_reply', 'archive_reply'].includes(report.content_type);
        const reportTitleHTML = isClickable ?
            `<span class="view-reported-content text-blue-600 hover:underline cursor-pointer" data-type="${report.content_type}" data-id="${report.content_id}">${report.content_type.toUpperCase()}: #${report.content_id}</span>` :
            `${report.content_type.toUpperCase()}: #${report.content_id}`;

        tr.innerHTML = `
            <td class="px-4 py-4">
                <p class="font-bold">${reportTitleHTML}</p>
                <p class="text-sm text-gray-500 truncate" style="max-width: 200px;">${escapeHTML(report.content_preview)}</p>
            </td>
            <td class="px-4 py-4">${escapeHTML(report.reporter_name)}</td>
            <td class="px-4 py-4 text-sm">${escapeHTML(report.reason)}</td>
            <td class="px-4 py-4 text-sm">${new Date(report.created_at).toLocaleDateString()}</td>
            <td class="px-4 py-4">
                <button class="update-report-btn text-xs bg-green-500 text-white px-2 py-1 rounded" data-report-id="${report.id}" data-status="resolved">Resolve</button>
                <button class="update-report-btn text-xs bg-gray-500 text-white px-2 py-1 rounded ml-2" data-report-id="${report.id}" data-status="dismissed">Dismiss</button>
            </td>
        `;
        container.appendChild(tr);
    });
}

export function renderReportLogs(logs) {
    const container = document.getElementById('report-logs-list');
    if (!container) return;

    container.innerHTML = '';
    if (logs.length === 0) {
        container.innerHTML = '<tr><td colspan="6" class="text-center py-4">No report logs found.</td></tr>';
        return;
    }

    logs.forEach(log => {
        const tr = document.createElement('tr');
        const statusClass = log.status === 'resolved' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800';
        const isClickable = ['shout', 'topic', 'archive', 'topic_reply', 'archive_reply'].includes(log.content_type);
        const reportTitleHTML = isClickable ?
            `<span class="view-reported-content text-blue-600 hover:underline cursor-pointer" data-type="${log.content_type}" data-id="${log.content_id}">${log.content_type.toUpperCase()}: #${log.content_id}</span>` :
            `${log.content_type.toUpperCase()}: #${log.content_id}`;

        tr.innerHTML = `
            <td class="px-4 py-4">
                <p class="font-bold">${reportTitleHTML}</p>
                <p class="text-sm text-gray-500 truncate" style="max-width: 200px;">${escapeHTML(log.content_preview)}</p>
            </td>
            <td class="px-4 py-4">${escapeHTML(log.reporter_name)}</td>
            <td class="px-4 py-4 text-sm">${escapeHTML(log.reason)}</td>
            <td class="px-4 py-4"><span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClass}">${log.status}</span></td>
            <td class="px-4 py-4">${escapeHTML(log.resolver_name || 'N/A')}</td>
            <td class="px-4 py-4 text-sm">${new Date(log.created_at).toLocaleDateString()}</td>
        `;
        container.appendChild(tr);
    });
}