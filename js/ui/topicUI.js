// js/ui/topicUI.js
import { escapeHTML, DEFAULT_AVATAR_URL } from './coreUI.js';
import { timeAgo, linkify } from './helpers.js';

export function renderTopicList(data) {
    const container = document.getElementById('topic-list');
    const paginationContainer = document.getElementById('topic-list-pagination');
    if (!container || !paginationContainer) return;

    container.innerHTML = '';
    const { pinned_topics, topics, pagination } = data;

    if (pinned_topics.length === 0 && topics.length === 0) {
        container.innerHTML = '<p class="text-center text-gray-500">No topics found in this category.</p>';
        return;
    }

    if (pinned_topics.length > 0) {
        const pinnedHeader = document.createElement('h3');
        pinnedHeader.className = 'text-lg font-bold text-yellow-600 mb-2';
        pinnedHeader.innerHTML = '<i class="fas fa-thumbtack"></i> Pinned Topics';
        container.appendChild(pinnedHeader);
        pinned_topics.forEach(topic => container.appendChild(createTopicElement(topic, true)));
    }

    if (topics.length > 0) {
        const regularHeader = document.createElement('h3');
        regularHeader.className = 'text-lg font-bold text-gray-700 mt-4 mb-2';
        regularHeader.textContent = 'Regular Topics';
        container.appendChild(regularHeader);
        topics.forEach(topic => container.appendChild(createTopicElement(topic, false)));
    }

    renderTopicListPagination(pagination.currentPage, pagination.totalPages, pagination.category);
}

function renderTopicListPagination(currentPage, totalPages, category) {
    const container = document.getElementById('topic-list-pagination');
    if (!container) return;
    container.innerHTML = '';
    if (totalPages <= 1) return;

    for (let i = 1; i <= totalPages; i++) {
        const button = document.createElement('button');
        button.className = `px-3 py-1 rounded-md text-sm font-semibold topic-page-link ${i === currentPage ? 'bg-violet-600 text-white' : 'bg-white text-gray-700'}`;
        button.textContent = i;
        button.dataset.page = i;
        button.dataset.category = category;
        container.appendChild(button);
    }
}


function createTopicElement(topic, isPinned) {
    const topicEl = document.createElement('div');
    topicEl.className = 'p-3 bg-white rounded-md shadow-sm border hover:bg-gray-50 cursor-pointer view-topic-btn flex justify-between items-center';
    topicEl.dataset.topicId = topic.id;
    
    let pinIcon = isPinned ? '<i class="fas fa-thumbtack text-yellow-500 mr-2"></i>' : '';
    let closedIcon = topic.is_closed == 1 ? '<i class="fas fa-lock text-red-500 ml-2"></i>' : '';

    topicEl.innerHTML = `
        <div>
            <p class="font-bold text-blue-700">${pinIcon}${escapeHTML(topic.title)}${closedIcon}</p>
            <p class="text-sm text-gray-500">In [${escapeHTML(topic.category)}] by ${escapeHTML(topic.display_name)} on ${new Date(topic.created_at).toLocaleDateString()}</p>
        </div>
        <i class="fas fa-chevron-right text-gray-400"></i>
    `;
    return topicEl;
}

export async function renderTopicDetails(data, currentUser) {
    const { topic, replies, pagination } = data;
    const titleEl = document.getElementById('topic-title');
    const metaEl = document.getElementById('topic-meta');
    const mainPostEl = document.getElementById('topic-main-post');
    const repliesContainer = document.getElementById('topic-replies');
    const replyForm = document.getElementById('topic-reply-form');
    const replyTopicIdInput = document.getElementById('reply-topic-id');
    
    if (!titleEl || !metaEl || !mainPostEl || !repliesContainer || !replyForm) return;

    const isOwner = currentUser && currentUser.id == topic.user_id;

    let reportTopicBtnHTML = '';
    if (currentUser && !isOwner) {
        reportTopicBtnHTML = ` || <a href="#" class="report-btn font-semibold text-red-500 hover:underline" data-type="topic" data-id="${topic.id}" data-preview="Topic: ${escapeHTML(topic.title)}">Report</a>`;
    }

    titleEl.textContent = topic.title;
    metaEl.innerHTML = `Topic Id: ${topic.id} || Replies: ${topic.replies_count} || Views: ${topic.views}`;
    if(replyTopicIdInput) replyTopicIdInput.value = topic.id;
    
    const actionLinksContainer = document.querySelector('#topic-header .text-sm > div');
    if (actionLinksContainer) {
        actionLinksContainer.innerHTML = `
            <a href="#" id="topic-options-link" data-topic-id="${topic.id}" class="font-semibold text-violet-600 hover:underline">Options</a> ||
            <a href="#" id="shout-topic-link" data-topic-id="${topic.id}" class="font-semibold text-green-600 hover:underline">Shout</a>
            ${reportTopicBtnHTML}
        `;
    }

    let lastEditedHTML = '';
    if (topic.last_edited_by && topic.editor_name) {
        lastEditedHTML = `<p class="text-xs text-gray-500 italic mt-2">Last Edited: ${new Date(topic.last_edited_at).toLocaleString()} By: ${escapeHTML(topic.editor_name)} (${timeAgo(topic.last_edited_at)})</p>`;
    }

    const mainPostAvatar = topic.photo_url || DEFAULT_AVATAR_URL;
    const displayRole = topic.display_role || topic.role;
    const roleClass = `role-${displayRole.toLowerCase().replace(' ', '')}`;
    const mainPostContent = await linkify(topic.content, currentUser, { type: 'topic', id: topic.id });

    mainPostEl.innerHTML = `
        <div class="flex space-x-4 p-4 bg-gray-50 rounded-lg">
            <img src="${escapeHTML(mainPostAvatar)}" class="w-16 h-16 rounded-full object-cover">
            <div class="min-w-0 flex-1">
                <p><strong class="user-name-link ${roleClass}" data-user-id="${topic.user_id}">${escapeHTML(topic.display_name)}</strong> <span class="text-sm text-gray-500">(${displayRole})</span></p>
                <p class="text-xs text-gray-400 mb-2">Posted on: ${new Date(topic.created_at).toLocaleString()}</p>
                <div class="whitespace-pre-wrap break-words">${mainPostContent}</div>
                ${lastEditedHTML}
            </div>
        </div>`;

    repliesContainer.innerHTML = '';
    if (replies.length > 0) {
        for (const reply of replies) {
            const replyAvatar = reply.photo_url || DEFAULT_AVATAR_URL;
            const replyDisplayRole = reply.display_role || reply.role;
            const replyRoleClass = `role-${replyDisplayRole.toLowerCase().replace(' ', '')}`;
            const isReplyOwner = currentUser && currentUser.id == reply.user_id;
            const replyContent = await linkify(reply.content, currentUser, { type: 'topic_reply', id: reply.id });
            
            let reportReplyBtn = '';
            if (currentUser && !isReplyOwner) {
                reportReplyBtn = `<button class="report-btn text-xs text-gray-400 hover:text-red-500" data-type="topic_reply" data-id="${reply.id}" data-preview="Reply by ${escapeHTML(reply.display_name)}"><i class="fas fa-flag"></i> Report</button>`;
            }
            
            const replyEl = document.createElement('div');
            replyEl.className = 'flex space-x-4 p-3 border-t';
            replyEl.innerHTML = `
                <img src="${escapeHTML(replyAvatar)}" class="w-12 h-12 rounded-full object-cover">
                <div class="flex-grow">
                     <div class="flex justify-between items-start">
                        <div>
                            <p><strong class="user-name-link ${replyRoleClass}" data-user-id="${reply.user_id}">${escapeHTML(reply.display_name)}</strong> <span class="text-sm text-gray-500">(${replyDisplayRole})</span></p>
                            <p class="text-xs text-gray-400 mb-2">Replied on: ${new Date(reply.created_at).toLocaleString()}</p>
                        </div>
                        ${reportReplyBtn}
                    </div>
                    <div class="text-sm">${replyContent}</div>
                </div>`;
            repliesContainer.appendChild(replyEl);
        }
    }

    renderTopicReplyPagination(pagination.currentPage, pagination.totalPages, topic.id);

    if (topic.is_closed == 1) {
        replyForm.innerHTML = '<div class="text-center p-4 bg-red-100 text-red-700 rounded-lg">This topic is closed for new replies.</div>';
    } else {
        replyForm.innerHTML = `
            <input type="hidden" name="topic_id" id="reply-topic-id" value="${topic.id}">
            <h4 class="font-semibold mb-2">Post Your Reply:</h4>
            <textarea name="content" class="w-full p-3 border rounded-lg shadow-sm input-field" rows="4" placeholder="Write a reply..."></textarea>
            <div class="flex justify-between items-center mt-2">
                <button type="submit" class="px-6 py-2 font-semibold text-white bg-violet-600 rounded-lg shadow-md hover:bg-violet-700">Post Your Reply</button>
                <button type="button" class="back-to-topics text-violet-600 font-semibold hover:underline">&larr; Back to Topics</button>
            </div>`;
    }
}

function renderTopicReplyPagination(currentPage, totalPages, topicId) {
    const container = document.getElementById('reply-pagination-container');
    if (!container) return;

    container.innerHTML = '';
    if (totalPages <= 1) return;
    
    for (let i = 1; i <= totalPages; i++) {
        const button = document.createElement('button');
        button.className = `px-3 py-1 rounded-md text-sm font-semibold reply-page-link ${i === currentPage ? 'bg-violet-600 text-white' : 'bg-white text-gray-700'}`;
        button.textContent = i;
        button.dataset.page = i;
        button.dataset.topicId = topicId;
        container.appendChild(button);
    }
}

export function renderTopicOptions(topic, currentUser) {
    const container = document.getElementById('topic-options-content');
    const backBtn = document.getElementById('back-to-topic-view');
    if (!container || !backBtn) return;
    
    backBtn.dataset.topicId = topic.id;
    const isOwner = currentUser && currentUser.id == topic.user_id;
    const isStaff = currentUser && ['Admin', 'Senior Moderator', 'Moderator'].includes(currentUser.role);
    const isPremium = currentUser && currentUser.is_premium == 1;
    
    let optionsHTML = `
        <p><strong>Topic ID:</strong> ${topic.id}</p>
        <p><strong>Owner:</strong> <span class="user-name-link font-semibold" data-user-id="${topic.user_id}">${escapeHTML(topic.display_name)}</span></p>
        <hr class="my-4">`;

    if (currentUser && !isOwner) {
        optionsHTML += `
            <div class="mb-4">
                <button class="report-btn w-full p-2 rounded text-white bg-red-500 hover:bg-red-600" data-type="topic" data-id="${topic.id}" data-preview="Topic: ${escapeHTML(topic.title)}">
                    <i class="fas fa-flag"></i> Report This Topic
                </button>
            </div>
            <hr class="my-4">
        `;
    }

    if ((isOwner && isPremium) || isStaff) {
        optionsHTML += `
            <div class="mt-4">
                <h3 class="font-bold text-lg mb-2">Edit Topic</h3>
                <form id="topic-edit-form-options">
                    <input type="hidden" name="topic_id" value="${topic.id}">
                    <div class="space-y-2">
                        <label>Title:</label>
                        <input type="text" name="title" class="w-full p-2 border rounded" value="${escapeHTML(topic.title)}">
                        <label>Topic Text:</label>
                        <textarea name="content" rows="5" class="w-full p-2 border rounded">${escapeHTML(topic.content)}</textarea>
                        <button type="submit" class="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600">Save Changes</button>
                    </div>
                </form>
            </div>
            <hr class="my-4">
            <div class="mt-4">
                 <button class="w-full p-2 rounded text-white bg-red-600 hover:bg-red-700" id="delete-topic-btn" data-topic-id="${topic.id}">DELETE TOPIC</button>
            </div>
        `;
        const visibilityText = topic.replies_hidden_by !== null ? 'Show Replies' : 'Hide Replies';
        const closeText = topic.is_closed == 1 ? 'Open Topic' : 'Close Topic';
        optionsHTML += `<hr class="my-4">
            <button class="w-full p-2 mt-4 rounded text-white bg-gray-500 hover:bg-gray-600" id="toggle-replies-visibility-btn" data-topic-id="${topic.id}">${visibilityText}</button>
            <button class="w-full p-2 mt-2 rounded text-white bg-yellow-500 hover:bg-yellow-600" id="toggle-close-topic-btn" data-topic-id="${topic.id}">${closeText}</button>
        `;
    }

    if (isStaff) {
        const pinText = topic.is_pinned == 1 ? 'Unpin Topic' : 'Pin Topic';
        const categories = ['General Forum', 'Site Official', 'Entertainment Forum', 'Tech Forum', 'Culture n People', 'ConnectBD Rules', 'ConnectBD All Quiz', 'ConnectBD Game', 'Facebook Page'];
        const categoryOptions = categories.map(cat => `<option value="${cat}" ${topic.category === cat ? 'selected' : ''}>${cat}</option>`).join('');

        optionsHTML += `
            <hr class="my-4">
            <h3 class="font-bold text-lg mb-2 mt-4">Staff Tools</h3>
            <button class="w-full p-2 rounded text-white bg-green-500 hover:bg-green-600" id="toggle-pin-topic-btn" data-topic-id="${topic.id}">${pinText}</button>
            <form id="move-topic-form" class="mt-4">
                <label>Move to:</label>
                <input type="hidden" name="topic_id" value="${topic.id}">
                <select name="category" class="w-full p-2 border rounded">${categoryOptions}</select>
                <button type="submit" class="w-full p-2 mt-2 bg-purple-500 text-white rounded hover:bg-purple-600">Move Topic</button>
            </form>
        `;
    }
    
    container.innerHTML = optionsHTML;
}

export function renderTopicStats(stats) {
    const lastPostEl = document.getElementById('last-post-stat');
    const randomTopicEl = document.getElementById('random-topic-stat');
    const totalCountsEl = document.getElementById('total-counts-stat');
    const categoriesEl = document.getElementById('topic-categories');

    if (lastPostEl && stats.last_post) {
        lastPostEl.innerHTML = `
            <strong>Last Post:</strong>
            <p><a href="#" class="view-topic-btn text-blue-600" data-topic-id="${stats.last_post.id}">${escapeHTML(stats.last_post.title)}</a></p>
            <p>By: <a href="#" class="user-name-link text-blue-600" data-user-id="${stats.last_post.user_id}">${escapeHTML(stats.last_post.display_name)}</a></p>`;
    } else if(lastPostEl) {
        lastPostEl.innerHTML = `<strong>Last Post:</strong><p>No topics posted yet.</p>`;
    }

    if (randomTopicEl && stats.random_topic) {
        randomTopicEl.innerHTML = `
            <strong>Random Topic:</strong>
            <p><a href="#" class="view-topic-btn text-blue-600" data-topic-id="${stats.random_topic.id}">${escapeHTML(stats.random_topic.title)}</a></p>`;
    } else if(randomTopicEl) {
        randomTopicEl.innerHTML = `<strong>Random Topic:</strong><p>No topics to select from.</p>`;
    }

    if (totalCountsEl) {
        totalCountsEl.innerHTML = `
            <strong>Total Counts:</strong>
            <p>${stats.total_users} users have made a total of ${stats.total_posts} posts.</p>`;
    }
    if(categoriesEl){
         const categories = ['General Forum', 'Site Official', 'Entertainment Forum', 'Tech Forum', 'Culture n People', 'ConnectBD Rules', 'ConnectBD All Quiz', 'ConnectBD Game', 'Facebook Page'];
         categoriesEl.innerHTML = '';
         categories.forEach(cat => {
            const li = document.createElement('li');
            li.innerHTML = `» <a href="#" class="topic-category-link text-blue-600" data-category="${cat}">${cat}</a>`;
            categoriesEl.appendChild(li);
         });
    }
}