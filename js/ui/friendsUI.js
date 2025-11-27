// js/ui/friendsUI.js
import { escapeHTML, DEFAULT_AVATAR_URL } from './coreUI.js';

let idleTimers = [];

export function clearFriendTimers() {
    idleTimers.forEach(timer => clearInterval(timer));
    idleTimers = [];
}

function formatIdleTime(lastActivity, serverTime) {
    const lastActivityDate = new Date(lastActivity);
    const serverNowDate = new Date(serverTime);
    const seconds = Math.floor((serverNowDate - lastActivityDate) / 1000);
    
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ago`;
}

function renderPendingRequests(requests) {
    const section = document.getElementById('pending-requests-section');
    const container = document.getElementById('pending-requests-container');
    if (!container || !section) return;

    if (requests.length === 0) {
        section.classList.add('hidden');
        return;
    }
    
    section.classList.remove('hidden');
    container.innerHTML = '';
    
    requests.forEach(req => {
        const card = document.createElement('div');
        card.className = 'flex flex-col items-center space-y-2 p-3 bg-white/60 rounded-lg border';
        const avatar = req.photo_url || DEFAULT_AVATAR_URL;
        
        card.innerHTML = `
            <img class="h-16 w-16 rounded-full object-cover" src="${escapeHTML(avatar)}" alt="avatar">
            <strong class="user-name-link cursor-pointer text-center" data-user-id="${req.id}">${escapeHTML(req.display_name)}</strong>
            <div class="flex space-x-2 w-full">
                <button class="friend-action-btn flex-1 px-3 py-1 text-xs font-bold text-white bg-green-500 hover:bg-green-600 rounded-md" data-user-id="${req.id}" data-action="accept_friend_request">Accept</button>
                <button class="friend-action-btn flex-1 px-3 py-1 text-xs font-bold text-white bg-red-500 hover:bg-red-600 rounded-md" data-user-id="${req.id}" data-action="cancel_or_unfriend">Decline</button>
            </div>
        `;
        container.appendChild(card);
    });
}

export function renderFriendsList(data) {
    const container = document.getElementById('friends-list-container');
    if (!container) return;
    
    clearFriendTimers();
    container.innerHTML = '';

    const { friends, pending_requests } = data;
    
    renderPendingRequests(pending_requests);

    if (friends.length === 0) {
        container.innerHTML = '<p class="col-span-full text-center text-gray-500">You have no friends yet.</p>';
        return;
    }

    friends.forEach(friend => {
        const card = document.createElement('div');
        card.className = 'flex items-center space-x-3 p-3 bg-white/50 rounded-lg border';
        
        const avatar = friend.photo_url || DEFAULT_AVATAR_URL;
        let onlineStatusHTML = '';

        if (friend.is_online) {
            const idleTimeId = `idle-time-${friend.id}`;
            const initialIdleTime = formatIdleTime(friend.last_activity, friend.server_time);
            onlineStatusHTML = `
                <div class="text-xs text-green-600 font-semibold flex items-center">
                    <span class="h-2 w-2 bg-green-500 rounded-full mr-1"></span>
                    Online (<span id="${idleTimeId}">${initialIdleTime}</span>)
                </div>`;
            
            const initialSeconds = Math.floor((new Date(friend.server_time) - new Date(friend.last_activity)) / 1000);
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
            idleTimers.push(timer);

        } else {
            onlineStatusHTML = `<div class="text-xs text-gray-500 flex items-center"><span class="h-2 w-2 bg-gray-400 rounded-full mr-1"></span>Offline</div>`;
        }

        card.innerHTML = `
            <img class="h-12 w-12 rounded-full object-cover" src="${escapeHTML(avatar)}" alt="avatar">
            <div class="flex-grow">
                <strong class="user-name-link cursor-pointer" data-user-id="${friend.id}">${escapeHTML(friend.display_name)}</strong>
                ${onlineStatusHTML}
            </div>
        `;
        container.appendChild(card);
    });
}