// js/ui/userUI.js
import { escapeHTML, DEFAULT_AVATAR_URL, generateUserDisplay } from './coreUI.js';
import { formatSeconds, formatSessionTime, calculateAge, linkify, formatIdleTime } from './helpers.js';
import { renderShout } from './shoutUI.js';
import { applyProfileTheme } from './themeUI.js';

let idleTimeInterval = null;
let userListIdleTimers = [];

function clearUserListTimers() {
    userListIdleTimers.forEach(timer => clearInterval(timer));
    userListIdleTimers = [];
}

export function clearUserProfileTimers() {
    if (idleTimeInterval) clearInterval(idleTimeInterval);
    idleTimeInterval = null;
    clearUserListTimers();
}

function formatTimeSince(lastActivity, serverTime) {
    const lastActivityDate = new Date(lastActivity);
    const serverNowDate = new Date(serverTime);
    const seconds = Math.floor((serverNowDate - lastActivityDate) / 1000);
    
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ago`;
}

export function renderUserList(users) {
    const userListContainer = document.getElementById('user-list-container');
    if (!userListContainer) return;

    clearUserListTimers();
    userListContainer.innerHTML = '';
    if (!users || users.length === 0) {
        userListContainer.innerHTML = `<p class="text-center col-span-full">No members found in this list.</p>`;
        return;
    }

    users.forEach(user => {
        const card = document.createElement('div');
        card.className = 'flex items-center space-x-3 p-3 bg-gray-50 rounded-lg border';
        const avatar = user.photo_url || DEFAULT_AVATAR_URL;
        const displayRole = user.display_role || user.role;
        const roleClass = `role-${displayRole.toLowerCase().replace(' ', '')}`;

        const userDisplay = generateUserDisplay(user, false);

        let onlineStatusHTML = '';
        const isOnline = (new Date(user.server_time) - new Date(user.last_seen)) / 1000 < 300;

        if (isOnline) {
            const idleTimeId = `user-list-idle-${user.id}`;
            const initialIdleTime = formatTimeSince(user.last_activity, user.server_time);
            onlineStatusHTML = `
                <div class="text-xs text-green-600 font-semibold flex items-center">
                    <span class="h-2 w-2 bg-green-500 rounded-full mr-1"></span>
                    Online (<span id="${idleTimeId}">${initialIdleTime}</span>)
                </div>`;

            const initialSeconds = Math.floor((new Date(user.server_time) - new Date(user.last_activity)) / 1000);
            const renderTime = Date.now();
            
            const timer = setInterval(() => {
                const idleElement = document.getElementById(idleTimeId);
                if (idleElement) {
                    const elapsedSeconds = Math.floor((Date.now() - renderTime) / 1000);
                    const newTotalSeconds = initialSeconds + elapsedSeconds;
                    idleElement.textContent = newTotalSeconds < 60 ? `${newTotalSeconds}s ago` : `${Math.floor(newTotalSeconds/60)}m ago`;
                } else {
                    clearInterval(timer);
                }
            }, 5000);
            userListIdleTimers.push(timer);

        } else {
            onlineStatusHTML = `<div class="text-xs text-gray-500 flex items-center"><span class="h-2 w-2 bg-gray-400 rounded-full mr-1"></span>Offline</div>`;
        }

        card.innerHTML = `
            <img class="h-12 w-12 rounded-full object-cover" src="${escapeHTML(avatar)}" alt="avatar">
            <div class="flex-grow">
                <div class="font-bold text-sm">${userDisplay}</div>
                <p class="text-xs font-semibold ${roleClass}">${escapeHTML(displayRole)}</p>
                ${onlineStatusHTML}
            </div>`;
        userListContainer.appendChild(card);
    });
}


export function renderUserProfile(user, currentUser) {
    const userProfileContent = document.getElementById('user-profile-content');
    if (!userProfileContent) return;

    clearUserProfileTimers();

    const avatar = user.photo_url || DEFAULT_AVATAR_URL;
    const cover = user.cover_photo_url || 'https://placehold.co/800x250/A4B3F7/FFFFFF?text=ConnectBD';
    const isOwnProfile = user.id === currentUser.id;
    const isStaffViewing = ['Admin', 'Senior Moderator', 'Moderator'].includes(currentUser.role);
    const isPremiumActive = user.is_premium && user.premium_expires_at && new Date(user.premium_expires_at) > new Date();

    const getStatus = (user) => {
        const displayRole = user.display_role || user.role;
        if (['Admin', 'Senior Moderator', 'Moderator', 'Special'].includes(displayRole)) {
            return displayRole;
        }
        if (isPremiumActive) return 'Premium User';
        if (displayRole === 'Member') {
            return user.level_title || user.member_status || 'Member';
        }
        return displayRole;
    };

    const status = getStatus(user);
    const statusBase = status.split(' ')[0].toLowerCase();
    
    let userNameClass = `role-${statusBase}`;
    let userNameStyle = '';

    if (user.is_special == 1) {
        userNameClass = 'special-user-name';
    } else if (user.username_color) {
        userNameStyle = `color: ${escapeHTML(user.username_color)};`;
    } else if (status === 'Premium User') {
        userNameClass = 'premium-username';
    }

    const verifiedBadge = user.is_verified == 1 ? '<i class="fas fa-check-circle text-blue-500 ml-1" title="Verified"></i>' : '';
    const displayName = user.capitalized_username || user.display_name;

    const level = parseInt(user.level) || 1;
    const xp = parseFloat(user.xp) || 0;
    
    const currentLevelStartXp = (level - 1) * 100;
    const nextLevelStartXp = level * 100;
    const xpNeeded = nextLevelStartXp - xp;
    
    let progressPercent = 0;
    if (level < 100) {
        progressPercent = ((xp - currentLevelStartXp) / (nextLevelStartXp - currentLevelStartXp)) * 100;
        if (progressPercent < 0) progressPercent = 0;
        if (progressPercent > 100) progressPercent = 100;
    } else {
        progressPercent = 100;
    }

    const levelProgressHTML = `
        <div class="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div class="flex justify-between items-end mb-2">
                <div>
                    <span class="text-xl font-bold text-blue-800">Level ${level}</span>
                    <span class="text-sm text-blue-600 ml-2">(${status})</span>
                </div>
                <div class="text-right">
                    <span class="text-sm font-semibold text-gray-700">${xp.toFixed(2)} XP</span>
                    ${level < 100 ? `<span class="text-xs text-gray-500 block">Next Level in: ${xpNeeded.toFixed(2)} XP</span>` : '<span class="text-xs text-green-600 block">Max Level Reached!</span>'}
                </div>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-3">
                <div class="bg-blue-600 h-3 rounded-full transition-all duration-500" style="width: ${progressPercent}%"></div>
            </div>
        </div>
    `;

    let onlineStatusHTML = '';
    let locationAndIdleHTML = '';

    if (user.is_online) {
        onlineStatusHTML = `<h3 class="text-2xl sm:text-3xl font-bold">
            <span class="${userNameClass}" style="${userNameStyle}">${escapeHTML(displayName)}</span>
            ${verifiedBadge}
        </h3>
        <p class="text-green-600 font-semibold mt-1">Online!</p>`;
        
        locationAndIdleHTML = `
            <p><strong>Where:</strong> <span class="font-semibold">${escapeHTML(user.current_page || 'Exploring...')}</span></p>
            <p><strong>Idle For:</strong> <span id="live-idle-time">${formatIdleTime(user.idle_seconds)}</span></p>
        `;
    } else {
        onlineStatusHTML = `<h3 class="text-2xl sm:text-3xl font-bold">
            <span class="${userNameClass}" style="${userNameStyle}">${escapeHTML(displayName)}</span>
            ${verifiedBadge}
        </h3>
        <p class="text-gray-500 font-semibold mt-1">Offline!</p>`;
        
        locationAndIdleHTML = `
            <p><strong>Where:</strong></p>
            <p><strong>Idle For:</strong> ${formatIdleTime(user.idle_seconds)}</p>
        `;
    }
    
    let sendPmHTML = '';
    if (!isOwnProfile) {
        sendPmHTML = `
            <div class="mt-6">
                <h4 class="text-xl font-semibold mb-2">Send Private Message</h4>
                <form id="send-pm-form">
                    <input type="hidden" name="receiver_id" value="${user.id}">
                    <textarea name="message" class="w-full p-3 border rounded-lg shadow-sm input-field" rows="3" placeholder="Send a message to ${escapeHTML(user.display_name)}..."></textarea>
                    <button type="submit" class="w-full mt-2 py-2 font-semibold text-white bg-green-600 rounded-lg shadow-md hover:bg-green-700">Send</button>
                </form>
            </div>`;
    }

    let premiumStatusHTML = '';
    if (isPremiumActive) {
        const expiryDate = new Date(user.premium_expires_at).toLocaleString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        premiumStatusHTML = `
            <div class="mt-4 p-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 rounded-md">
                <p class="font-bold"><i class="fas fa-star"></i> Premium User!</p>
                <p class="text-sm">Will Expire On: ${expiryDate}</p>
            </div>`;
    }

    let friendButtonHTML = '';
    if (!isOwnProfile) {
        let btn_text = '';
        let btn_action = '';
        let btn_class = 'bg-blue-500 hover:bg-blue-600';
        const friendStatus = user.friend_status;

        if (!friendStatus) {
            btn_text = '<i class="fas fa-user-plus mr-2"></i> Send Friend Request';
            btn_action = 'send_friend_request';
        } else if (friendStatus.status == 0) {
            if (friendStatus.action_user_id == currentUser.id) {
                btn_text = '<i class="fas fa-times mr-2"></i> Cancel Request';
                btn_action = 'cancel_or_unfriend';
                btn_class = 'bg-gray-500 hover:bg-gray-600';
            } else {
                friendButtonHTML = `
                    <button class="friend-action-btn w-full md:w-auto flex-1 px-4 py-2 font-bold text-white bg-green-500 hover:bg-green-600 rounded-md" data-user-id="${user.id}" data-action="accept_friend_request"><i class="fas fa-check mr-2"></i> Accept Request</button>
                    <button class="friend-action-btn w-full md:w-auto flex-1 mt-2 md:mt-0 md:ml-2 px-4 py-2 font-bold text-white bg-red-500 hover:bg-red-600 rounded-md" data-user-id="${user.id}" data-action="cancel_or_unfriend"><i class="fas fa-times mr-2"></i> Decline</button>`;
            }
        } else if (friendStatus.status == 1) {
            btn_text = '<i class="fas fa-user-minus mr-2"></i> Unfriend';
            btn_action = 'cancel_or_unfriend';
            btn_class = 'bg-red-500 hover:bg-red-600';
        }
        if (friendButtonHTML === '') {
            friendButtonHTML = `<button class="friend-action-btn w-full flex-1 px-4 py-2 font-bold text-white ${btn_class} rounded-md" data-user-id="${user.id}" data-action="${btn_action}">${btn_text}</button>`;
        }
        friendButtonHTML += `<button class="report-btn w-full md:w-auto flex-1 mt-2 md:mt-0 md:ml-2 px-4 py-2 font-bold text-white bg-gray-500 hover:bg-gray-600 rounded-md" data-type="user" data-id="${user.id}" data-preview="User Profile of ${escapeHTML(user.display_name)}"><i class="fas fa-flag mr-2"></i> Report User</button>`;
    }
    
    let pinnedShoutHTML = '';
    if(user.pinned_shout) {
        const pinnedShoutContainer = document.createElement('div');
        const fullShoutObject = { 
            ...user.pinned_shout, 
            user_id: user.id, 
            display_name: user.display_name, 
            capitalized_username: user.capitalized_username,
            username_color: user.username_color,
            photo_url: user.photo_url, 
            role: user.role, 
            display_role: user.display_role,
            is_premium: user.is_premium,
            premium_expires_at: user.premium_expires_at,
            is_verified: user.is_verified,
            is_special: user.is_special
        };
        pinnedShoutContainer.appendChild(renderShout(fullShoutObject, currentUser));
        pinnedShoutHTML = `<div class="mt-6"><h4 class="text-xl font-semibold mb-2"><i class="fas fa-thumbtack text-gray-500"></i> Pinned Shout</h4>${pinnedShoutContainer.innerHTML}</div>`;
    }

    let adminToolsButtonHTML = '';
    if ((isStaffViewing && !isOwnProfile) || (currentUser.role === 'Admin' && isOwnProfile)) {
        adminToolsButtonHTML = `<div class="mt-4"><button id="show-admin-tools-btn" data-user-id="${user.id}" class="w-full px-4 py-2 font-bold text-white bg-red-600 rounded-md hover:bg-red-700"><i class="fas fa-user-shield mr-2"></i> Admin Tools</button></div>`;
    }

    userProfileContent.innerHTML = `
        <div class="relative">
            <img class="w-full h-48 object-cover rounded-t-lg" src="${escapeHTML(cover)}" alt="Cover Photo">
            <div class="absolute -bottom-14 left-6">
                <img class="w-28 h-28 rounded-full object-cover border-4 border-white shadow-lg" src="${escapeHTML(avatar)}" alt="Profile Picture">
            </div>
        </div>

        <div class="bg-white p-6 rounded-b-lg shadow-md">
            <div class="flex justify-between items-start mt-14">
                <div>
                    ${onlineStatusHTML}
                    <p class="text-lg text-gray-600">${escapeHTML(user.full_name || 'Full Name Not Set')}</p>
                    <div class="mt-2">
                        <span class="px-3 py-1 text-sm font-semibold rounded-full ${status === 'Premium User' ? 'bg-yellow-200 text-yellow-800' : (status === 'Admin' ? 'bg-red-200 text-red-800' : 'bg-blue-200 text-blue-800')}">${status === 'Premium User' ? '<i class="fas fa-star"></i> ' + status : status}</span>
                    </div>
                </div>
                <div id="user-activity-status" class="text-sm text-gray-700 text-right flex-shrink-0">
                    <div class="mt-2 text-gray-500">
                        ${locationAndIdleHTML}
                        <p><strong>Online Time:</strong> <span>${formatSessionTime(user.total_online_seconds)}</span></p>
                    </div>
                </div>
            </div>
            
            ${levelProgressHTML}

            ${adminToolsButtonHTML}
            
            ${user.is_banned ? '<p class="text-red-500 font-bold mt-2">-- This user is Banned --</p>' : ''}
            
            <div class="border-b my-6"></div>

            ${premiumStatusHTML}
            ${pinnedShoutHTML}
            ${sendPmHTML}

            <h4 class="text-xl font-semibold my-4">User Information</h4>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                <div class="bg-gray-50 p-3 rounded-md"><strong>ID:</strong> ${user.id}</div>
                <div class="bg-gray-50 p-3 rounded-md"><strong>Balance:</strong> ${parseFloat(user.balance || 0).toFixed(3)}
                    ${isOwnProfile ? `<button id="recharge-btn" class="ml-2 text-xs bg-green-500 text-white px-2 py-1 rounded">Recharge</button> <button id="withdrawal-btn" class="ml-1 text-xs bg-yellow-500 text-white px-2 py-1 rounded">Withdraw</button>` : ''}
                </div>
                <div class="bg-yellow-100 p-3 rounded-md"><strong>Gold Coins:</strong> ${user.gold_coins || 0}</div>
                <div class="bg-gray-50 p-3 rounded-md"><strong>Country:</strong> ${escapeHTML(user.country || 'N/A')}</div>
                <div class="bg-gray-50 p-3 rounded-md"><strong>City:</strong> ${escapeHTML(user.city || 'N/A')}</div>
                <div class="bg-gray-50 p-3 rounded-md"><strong>Gender:</strong> ${escapeHTML(user.gender || 'N/A')}</div>
                <div class="bg-gray-50 p-3 rounded-md"><strong>Age:</strong> ${calculateAge(user.birthday)}</div>
                <div class="bg-gray-50 p-3 rounded-md"><strong>Birthday:</strong> ${user.birthday ? new Date(user.birthday).toLocaleDateString('en-GB') : 'N/A'}</div>
                <div class="bg-gray-50 p-3 rounded-md"><strong>Relationship:</strong> ${escapeHTML(user.relationship_status || 'N/A')}</div>
                <div class="bg-gray-50 p-3 rounded-md"><strong>Profile Views:</strong> ${user.profile_views || 0}</div>
                <div class="bg-gray-50 p-3 rounded-md"><strong>PMs:</strong> IN: ${user.pm_stats.in} - OUT: ${user.pm_stats.out}</div>
                <div class="bg-gray-50 p-3 rounded-md"><strong>Unread PMs:</strong> ${user.pm_stats.unread}</div>
            </div>

            <div class="mt-6">
                <h4 class="text-xl font-semibold mb-2">Bio</h4>
                <div class="bg-gray-50 p-4 rounded-md text-sm whitespace-pre-wrap">${escapeHTML(user.bio || 'No bio provided.')}</div>
            </div>

            <div class="mt-8 flex flex-col md:flex-row md:space-x-4 space-y-4 md:space-y-0">
                <button id="view-gifts-btn" data-user-id="${user.id}" class="w-full md:w-auto flex-1 bg-pink-600 text-white font-semibold py-2 px-6 rounded-md hover:bg-pink-700"><i class="fas fa-gift mr-2"></i> View Gifts</button>
                ${isOwnProfile ? `<button id="go-to-edit-profile" class="w-full md:w-auto flex-1 bg-indigo-600 text-white font-semibold py-2 px-6 rounded-md hover:bg-indigo-700">Edit Profile</button>` : ''}
                <button id="go-to-advance-profile" data-user-id="${user.id}" class="w-full md:w-auto flex-1 bg-gray-700 text-white font-semibold py-2 px-6 rounded-md hover:bg-gray-800">Advance Profile</button>
            </div>

            ${!isOwnProfile ? `<div class="mt-8 flex flex-col md:flex-row md:space-x-4 space-y-4 md:space-y-0">${friendButtonHTML}</div>` : ''}
        </div>
    `;

    applyProfileTheme(currentUser);

    const idleTimeElement = document.getElementById('live-idle-time');

    if (idleTimeElement && user.is_online) {
        let idleSeconds = parseInt(user.idle_seconds, 10) || 0;
        idleTimeInterval = setInterval(() => {
            idleSeconds++;
            if (document.getElementById('live-idle-time')) {
                 document.getElementById('live-idle-time').textContent = formatIdleTime(idleSeconds);
            }
        }, 1000);
    }
}

export function renderAdvanceProfile(user) {
    const container = document.getElementById('advance-profile-content');
    if (!container) return;
    
    const backButton = document.getElementById('back-to-profile');
    if (backButton) {
        backButton.dataset.userId = user.id;
    }

    const { content_stats, total_online_seconds, created_at, last_seen } = user;

    container.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="bg-blue-50 p-4 rounded-md text-center">
                <p class="text-sm font-medium text-blue-800">SHOUTS</p>
                <p class="text-2xl font-bold text-blue-600">
                    <a href="#" class="user-content-link" data-user-id="${user.id}" data-content-type="shouts">${content_stats.shouts.visible}</a> / ${content_stats.shouts.total}
                </p>
            </div>
            <div class="bg-purple-50 p-4 rounded-md text-center">
                <p class="text-sm font-medium text-purple-800">TOPICS</p>
                <p class="text-2xl font-bold text-purple-600">
                     <a href="#" class="user-content-link" data-user-id="${user.id}" data-content-type="topics">${content_stats.topics.visible}</a> / ${content_stats.topics.total}
                </p>
            </div>
            <div class="bg-indigo-50 p-4 rounded-md text-center">
                <p class="text-sm font-medium text-indigo-800">ARCHIVES</p>
                <p class="text-2xl font-bold text-indigo-600">
                     <a href="#" class="user-content-link" data-user-id="${user.id}" data-content-type="archives">${content_stats.archives.visible}</a> / ${content_stats.archives.total}
                </p>
            </div>
        </div>
        <div class="bg-gray-50 p-4 rounded-md mt-6 space-y-2 text-sm">
            <p><strong>Total Online Time:</strong> ${formatSeconds(total_online_seconds)}</p>
            <p><strong>Joined Date:</strong> ${new Date(created_at).toLocaleString()}</p>
            <p><strong>Last Seen:</strong> ${new Date(last_seen).toLocaleString()}</p>
        </div>
    `;
}

export function renderUserContent(data, currentUser) {
    const { title, content, user } = data;
    const titleEl = document.getElementById('user-content-title');
    const listEl = document.getElementById('user-content-list');
    const backBtn = document.getElementById('back-to-advance-profile');

    if (!titleEl || !listEl || !backBtn) return;

    titleEl.textContent = title;
    backBtn.dataset.userId = user.id;
    listEl.innerHTML = '';

    if (content.length === 0) {
        listEl.innerHTML = `<p class="text-center text-gray-500">No content found.</p>`;
        return;
    }

    if (data.type === 'shouts') {
        content.forEach(item => {
            const fullShoutObject = { 
                ...item, 
                user_id: user.id, 
                display_name: user.display_name, 
                capitalized_username: user.capitalized_username,
                username_color: user.username_color,
                photo_url: user.photo_url, 
                role: user.role, 
                display_role: user.display_role,
                is_premium: user.is_premium,
                premium_expires_at: user.premium_expires_at,
                is_verified: user.is_verified,
                is_special: user.is_special
            };
            listEl.appendChild(renderShout(fullShoutObject, currentUser));
        });
    } else {
        content.forEach(item => {
            const itemEl = document.createElement('div');

            if (data.type === 'topics') {
                itemEl.className = 'p-3 bg-white rounded-md shadow-sm border hover:bg-gray-50 cursor-pointer view-topic-btn';
                itemEl.dataset.topicId = item.id;
            } else if (data.type === 'archives') {
                itemEl.className = 'p-3 bg-white rounded-md shadow-sm border hover:bg-gray-50 cursor-pointer view-archive-btn';
                itemEl.dataset.archiveId = item.id;
            } else {
                 itemEl.className = 'p-3 bg-white rounded-md shadow-sm border';
            }

            itemEl.innerHTML = `
                <p class="font-bold">${escapeHTML(item.title || item.text)}</p>
                <p class="text-sm text-gray-500">Created on ${new Date(item.created_at).toLocaleDateString()}</p>
            `;
            listEl.appendChild(itemEl);
        });
    }
}

export function renderLatestPmNotification(pm) {
    const container = document.getElementById('latest-pm-notification');
    if (pm && container) {
        container.innerHTML = `
        <div class="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded-md shadow-sm cursor-pointer open-conversation" data-user-id="${pm.sender_id}" data-user-name="${escapeHTML(pm.display_name)}">
            <p><i class="fas fa-envelope mr-2"></i><strong>New PM From:</strong> <span class="font-bold">${escapeHTML(pm.display_name)}</span></p>
        </div>`;
        container.classList.remove('hidden');
    } else if (container) {
        container.classList.add('hidden');
    }
}

function renderPagination(container, { currentPage, totalPages }, pageLinkClass, extraDataAttrs = {}) {
    container.innerHTML = '';
    if (totalPages <= 1) return;

    for (let i = 1; i <= totalPages; i++) {
        const button = document.createElement('button');
        button.className = `px-3 py-1 rounded-md text-sm font-semibold ${pageLinkClass} ${i === currentPage ? 'bg-violet-600 text-white' : 'bg-white text-gray-700'}`;
        button.textContent = i;
        button.dataset.page = i;
        for (const attr in extraDataAttrs) {
            button.dataset[attr] = extraDataAttrs[attr];
        }
        container.appendChild(button);
    }
}

export function renderInbox(data, currentUser) {
    const inboxList = document.getElementById('inbox-list');
    const paginationContainer = document.getElementById('inbox-pagination-container');
    if(!inboxList || !paginationContainer) return;

    const { conversations, pagination } = data;
    inboxList.innerHTML = '';

    if (conversations.length === 0) {
        inboxList.innerHTML = '<p class="text-center text-gray-500">Your inbox is empty.</p>';
        paginationContainer.innerHTML = '';
        return;
    }
    conversations.forEach(convo => {
        const otherUserId = convo.sender_id === currentUser.id ? convo.receiver_id : convo.sender_id;
        const convoElement = document.createElement('div');
        convoElement.className = 'flex items-center space-x-3 p-3 hover:bg-gray-100 rounded-md cursor-pointer open-conversation';
        convoElement.dataset.userId = otherUserId;
        convoElement.dataset.userName = convo.display_name;
        const avatar = convo.photo_url || DEFAULT_AVATAR_URL;
        convoElement.innerHTML = `
            <img class="h-12 w-12 rounded-full object-cover flex-shrink-0" src="${escapeHTML(avatar)}">
            <div class="min-w-0 flex-1">
                <p class="font-bold">${escapeHTML(convo.display_name)}</p>
                <p class="text-sm text-gray-600 break-words">${convo.sender_id === currentUser.id ? 'You: ' : ''}${escapeHTML(convo.message)}</p>
            </div>`;
        inboxList.appendChild(convoElement);
    });

    renderPagination(paginationContainer, pagination, 'inbox-page-link');
}

export async function renderConversation(data, currentUser) {
    const container = document.getElementById('conversation-messages');
    const paginationContainer = document.getElementById('conversation-pagination-container');
    const otherUserId = document.getElementById('reply-receiver-id').value;
    if(!container || !paginationContainer) return;

    const { messages, pagination } = data;
    container.innerHTML = '';

    for (const msg of messages) {
        const isMyMessage = msg.sender_id === currentUser.id;
        const msgElement = document.createElement('div');
        msgElement.className = `flex items-start gap-3 ${isMyMessage ? 'flex-row-reverse' : ''}`;
        const avatar = msg.photo_url || DEFAULT_AVATAR_URL;

        let messageContent = msg.message;
        if (msg.sender_id !== 2) {
             messageContent = await linkify(msg.message, currentUser);
        }
        
        if (msg.sender_id === 2) {
            messageContent = messageContent.replace(/class='pm-button/g, "style='display: inline-block; padding: 5px 10px; border-radius: 5px; color: white; text-decoration: none; margin: 2px;' class='pm-button");
            messageContent = messageContent.replace(/pm-button-view/g, "background-color: #3B82F6;");
            messageContent = messageContent.replace(/pm-button-accept/g, "background-color: #10B981;");
            messageContent = messageContent.replace(/pm-button-reject/g, "background-color: #EF4444;");
        }

        msgElement.innerHTML = `
            <img src="${escapeHTML(avatar)}" class="w-8 h-8 rounded-full object-cover">
            <div class="flex flex-col min-w-0">
                 <div class="p-3 rounded-lg ${isMyMessage ? 'bg-blue-500 text-white' : 'bg-gray-200'}">
                    <p class="whitespace-pre-wrap break-words">${messageContent}</p>
                </div>
                <span class="text-xs text-gray-500 mt-1 px-1">${new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>`;
        container.appendChild(msgElement);
    }

    renderPagination(paginationContainer, pagination, 'conversation-page-link', { withUserId: otherUserId });

    if (pagination.currentPage === pagination.totalPages) {
        container.scrollTop = container.scrollHeight;
    }
}

export function renderNotifications(data) {
    const listContainer = document.getElementById('notification-list');
    const paginationContainer = document.getElementById('notification-pagination-container');
    if (!listContainer || !paginationContainer) return;

    const { notifications, pagination } = data;
    listContainer.innerHTML = '';

    if (notifications.length === 0) {
        listContainer.innerHTML = '<p class="text-center text-gray-500">You have no notifications.</p>';
        paginationContainer.innerHTML = '';
        return;
    }

    notifications.forEach(noti => {
        const notiElement = document.createElement('div');
        const isUnread = noti.is_read == 0;
        notiElement.className = `p-3 rounded-md flex items-center space-x-3 notification-item ${isUnread ? 'bg-blue-50' : 'bg-gray-50'}`;

        if (noti.link) {
            const [view, id] = noti.link.split(':');
            notiElement.dataset.view = view;
            notiElement.dataset.id = id;
            notiElement.classList.add('cursor-pointer', 'hover:bg-blue-100');
        }

        notiElement.innerHTML = `
            <div><i class="fas fa-bell ${isUnread ? 'text-blue-500' : 'text-gray-400'}"></i></div>
            <div class="flex-grow">
                <p class="text-sm">${noti.message}</p>
                <p class="text-xs text-gray-500">${new Date(noti.created_at).toLocaleString()}</p>
            </div>
        `;
        listContainer.appendChild(notiElement);
    });

    renderPagination(paginationContainer, pagination, 'notification-page-link');
}