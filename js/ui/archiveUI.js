// js/ui/archiveUI.js
import { escapeHTML } from './coreUI.js';
import { linkify } from './helpers.js';

export function renderArchiveList(archives) {
    const container = document.getElementById('archive-list');
    if (!container) return;
    container.innerHTML = '';
    if (archives.length === 0) {
        container.innerHTML = '<p class="text-center text-gray-500">No archives found.</p>';
        return;
    }
    archives.forEach(archive => {
        const archiveEl = document.createElement('div');
        archiveEl.className = 'p-4 bg-white rounded-lg shadow-sm border flex justify-between items-center hover:bg-gray-50 cursor-pointer view-archive-btn';
        archiveEl.dataset.archiveId = archive.id;
        archiveEl.innerHTML = `
            <div>
                <span class="text-xs font-semibold uppercase px-2 py-1 bg-indigo-100 text-indigo-800 rounded-full">${escapeHTML(archive.category)}</span>
                <p class="font-bold text-lg text-gray-800 mt-2">#${archive.id} - ${escapeHTML(archive.title)}</p>
                <p class="text-sm text-gray-500">By ${escapeHTML(archive.display_name)} | Views: ${archive.views}</p>
            </div>
            <i class="fas fa-chevron-right text-gray-400"></i>
        `;
        container.appendChild(archiveEl);
    });
}

export async function renderArchiveDetails(data, currentUser) {
    const { archive, likes, dislikes, replies } = data;
    document.getElementById('archive-title').textContent = `#${archive.id} - ${archive.title}`;
    const detailsContainer = document.getElementById('archive-details');
    const interactionsContainer = document.getElementById('archive-interactions');
    const repliesContainer = document.getElementById('archive-replies');
    document.getElementById('reply-archive-id').value = archive.id;

    const isOwner = currentUser && currentUser.id == archive.user_id;
    const isStaff = currentUser && ['Admin', 'Senior Moderator', 'Moderator'].includes(currentUser.role);
    
    let ownerControls = '';
    if (isOwner || isStaff) {
        ownerControls += `<button class="edit-archive-btn text-sm bg-blue-500 text-white px-3 py-1 rounded-md" data-archive-id="${archive.id}">Edit</button>`;
        ownerControls += `<button class="delete-archive-btn text-sm bg-red-600 text-white px-3 py-1 rounded-md ml-2" data-archive-id="${archive.id}">Delete</button>`;
    }
    
    let reportButton = '';
    if (currentUser && !isOwner) {
        reportButton = `<button class="report-btn text-xs text-gray-400 hover:text-red-500" data-type="archive" data-id="${archive.id}" data-preview="Archive: ${escapeHTML(archive.title)}"><i class="fas fa-flag"></i> Report</button>`;
    }

    const archiveContent = await linkify(archive.content, currentUser, { type: 'archive', id: archive.id });

    detailsContainer.innerHTML = `
        <div class="flex justify-between items-center">
            <p class="text-sm text-gray-600">By <strong>${escapeHTML(archive.display_name)}</strong> in <strong>${archive.category}</strong> | ${archive.views} views</p>
            <div class="flex items-center space-x-2">
                ${reportButton}
                ${ownerControls}
            </div>
        </div>
        ${archive.status === 'pending' ? '<p class="text-sm text-yellow-600 italic mt-2">This archive is pending approval and is only visible to you and the staff.</p>' : ''}
        <p class="mt-4 whitespace-pre-wrap text-base">${archiveContent}</p>
    `;
    
    interactionsContainer.innerHTML = `
        <button class="like-archive-btn text-green-600" data-type="like" data-archive-id="${archive.id}"><i class="fas fa-thumbs-up"></i> Like (${likes})</button>
        <button class="like-archive-btn text-red-600" data-type="dislike" data-archive-id="${archive.id}"><i class="fas fa-thumbs-down"></i> Dislike (${dislikes})</button>
    `;

    repliesContainer.innerHTML = '';
    for (const reply of replies) {
        const replyEl = document.createElement('div');
        replyEl.className = 'p-3 border-t';
        const isReplyOwner = currentUser && currentUser.id == reply.user_id;
        const canDelete = isOwner || isStaff || isReplyOwner;
        const replyContent = await linkify(reply.content, currentUser, { type: 'archive_reply', id: reply.id });
        const replyDisplayRole = reply.display_role || reply.role;
        
        let replyReportButton = '';
        if (currentUser && !isReplyOwner) {
            replyReportButton = `<button class="report-btn text-xs text-gray-400 hover:text-red-500" data-type="archive_reply" data-id="${reply.id}" data-preview="Archive Reply by ${escapeHTML(reply.display_name)}"><i class="fas fa-flag"></i> Report</button>`;
        }

        replyEl.innerHTML = `
            <div class="flex justify-between items-center">
                <p class="text-sm font-semibold">${escapeHTML(reply.display_name)} (${replyDisplayRole})</p>
                <div class="flex items-center space-x-2">
                     ${canDelete ? `<button class="delete-archive-reply-btn text-xs text-red-500" data-reply-id="${reply.id}">Delete</button>`: ''}
                     ${replyReportButton}
                </div>
            </div>
            <p class="mt-1 text-sm">${replyContent}</p>
        `;
        repliesContainer.appendChild(replyEl);
    }
}

export function renderArchiveEditForm(archive) {
    document.getElementById('edit-archive-id').value = archive.id;
    document.getElementById('edit-archive-title').value = archive.title;
    document.getElementById('edit-archive-category').value = archive.category;
    document.getElementById('edit-archive-content').value = archive.content;
}