// js/handlers/friendsHandlers.js
import { apiRequest, API_URL } from '../api.js';
import { showView, renderFriendsList, renderUserProfile, renderConversation } from '../ui.js';
import { fetchData_user } from './userHandlers.js';

export const fetchData_friends = {
    list: async () => {
        const data = await apiRequest(`${API_URL}?action=get_friends_list`);
        if (data.status === 'success') {
            renderFriendsList(data);
        }
    }
};

async function handleFriendAction(userId, action, currentUser) {
    const formData = new FormData();
    formData.append('action', action);
    formData.append('user_id', userId);

    const data = await apiRequest(API_URL, { method: 'POST', body: formData });
    
    if (data.status === 'success') {
        // বর্তমানে কোন পেজে আছে তা চেক করে সেই অনুযায়ী UI আপডেট করা হচ্ছে
        const centerPanel = document.getElementById('center-panel');
        if (centerPanel.querySelector('#user-profile-content')) {
            const user = await fetchData_user.profileData(userId);
            if (user) renderUserProfile(user, currentUser);
        } else if (centerPanel.querySelector('#friends-list-container')) {
            fetchData_friends.list();
        } else if (centerPanel.querySelector('#conversation-messages')) {
            // মেসেজের বাটন ক্লিক হলে, মেসেজটি আপডেট এবং একটি অ্যালার্ট দেখানো হচ্ছে
            const otherUserId = document.getElementById('reply-receiver-id').value;
            const convoData = await apiRequest(`${API_URL}?action=get_conversation&with_user_id=${otherUserId}`);
            if (convoData.status === 'success') renderConversation(convoData, currentUser);
            alert('Action successful!');
        }
    } else {
        alert(data.message || 'An error occurred.');
    }
}

export async function handleFriendsClicks(target, currentUser) {
    if (target.id === 'friends-btn') {
        await showView('friends');
        fetchData_friends.list();
        return true;
    }

    // প্রোফাইল, ফ্রেন্ডস পেজ এবং PM থেকে আসা সব বাটন পরিচালনা করবে
    const friendActionBtn = target.closest('.friend-action-btn, .friend-action-pm');
    if (friendActionBtn) {
        friendActionBtn.disabled = true; // ডাবল ক্লিক এড়ানোর জন্য
        friendActionBtn.textContent = 'Processing...';
        
        const userId = friendActionBtn.dataset.userId;
        const action = friendActionBtn.dataset.action;
        await handleFriendAction(userId, action, currentUser);
        return true;
    }

    return false;
}