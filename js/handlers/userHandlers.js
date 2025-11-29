// js/handlers/userHandlers.js
import { apiRequest, API_URL } from '/js/api.js';
import {
    showView, renderUserProfile, renderAdvanceProfile, renderUserContent,
    renderLatestPmNotification, renderInbox, renderConversation, renderActionStatus,
    renderNotifications,
    renderTopicDetails, renderArchiveDetails,
    renderHomePermissions,
    generateUserDisplay,
    renderUserList
} from '/js/ui.js';
import { fetchData_shouts } from '/js/handlers/shoutHandlers.js';
import { fetchData_topics } from '/js/handlers/topicHandlers.js';
import { fetchData_archives } from '/js/handlers/archiveHandlers.js';
// Username Shop এর ডাটা ফেচ করার জন্য ইমপোর্ট
import { fetchData_usernameShop } from '/js/handlers/usernameShopHandlers.js';

const DEFAULT_AVATAR_URL = 'https://www.pngfind.com/pngs/m/610-6104451_image-placeholder-png-user-profile-placeholder-image-png.png';

export const fetchData_user = {
    siteStats: async () => {
        const statsContainer = document.getElementById('site-stats-container');
        if (!statsContainer) return;

        const data = await apiRequest(`${API_URL}?action=get_site_stats`);

        if (data.status === 'success' && data.stats) {
            if (!document.getElementById('site-stats-container')) return;

            const updateElementText = (id, value) => {
                const element = document.getElementById(id);
                if (element) element.textContent = value;
            };

            updateElementText('stats-total-online', data.stats.total_online || 0);
            updateElementText('stats-male-online', data.stats.male_online || 0);
            updateElementText('stats-female-online', data.stats.female_online || 0);
            updateElementText('stats-premium-online', data.stats.premium_online || 0);
            updateElementText('stats-staff-online', data.stats.staff_online || 0);

            const newestMemberEl = document.getElementById('stats-newest-member');
            if (newestMemberEl && data.stats.newest_member_data) {
                const newestUser = {
                    id: data.stats.newest_member_data.id,
                    display_name: data.stats.newest_member_data.display_name,
                    is_premium: data.stats.newest_member_data.is_premium,
                    premium_expires_at: data.stats.newest_member_data.premium_expires_at,
                    is_verified: data.stats.newest_member_data.is_verified,
                    role: 'Member'
                };
                 newestMemberEl.innerHTML = generateUserDisplay(newestUser, false);
            } else if (newestMemberEl) {
                newestMemberEl.textContent = 'N/A';
            }
            updateElementText('stats-active-today', data.stats.active_today || 0);
        }
    },
    latestPm: async () => {
        const data = await apiRequest(`${API_URL}?action=get_latest_pm`);
        if (data.status === 'success') {
            renderLatestPmNotification(data.latest_pm);
        }
    },
    profileData: async (userId) => {
        const data = await apiRequest(`${API_URL}?action=get_user_profile&user_id=${userId}`);
        if (data.status === 'success') {
            return data.user;
        }
        return null;
    },
    updateStatus: async () => {
        await apiRequest(`${API_URL}?action=check_status`);
    },
};

export async function handleUserClicks(target, currentUser) {
    const navLink = target.closest('.nav-link');
    if (navLink) {
        const viewName = navLink.dataset.view;
        await showView(viewName);
        if (viewName === 'home') {
            fetchData_shouts.latestShout(currentUser);
            fetchData_user.siteStats();
            renderHomePermissions(currentUser);
        }
        return true;
    }

    const backToHomeBtn = target.closest('.back-to-home');
    if(backToHomeBtn) {
        await showView('home');
        fetchData_shouts.latestShout(currentUser);
        fetchData_user.siteStats();
        renderHomePermissions(currentUser);
        return true;
    }

    const userLink = target.closest('.user-name-link');
    if (userLink) {
        const userId = userLink.dataset.userId;
        if (!userId || userId === '0') return true;

        await showView('user_profile');
        const user = await fetchData_user.profileData(userId);
        if (user) {
            renderUserProfile(user, currentUser);
        } else {
            await renderActionStatus({status: 'error', message: 'Could not load user profile.', backView: 'home'});
        }
        return true;
    }

    const statsLink = target.closest('.stats-link');
    if(statsLink){
        const listType = statsLink.dataset.listType;
        if (listType) {
            const title = statsLink.parentElement.textContent.split(':')[0].trim();
            await showView('user_list');

            const userListTitle = document.getElementById('user-list-title');
            const userListContainer = document.getElementById('user-list-container');

            if (userListTitle) userListTitle.textContent = `Member List: ${title}`;
            if (userListContainer) userListContainer.innerHTML = '<p>Loading...</p>';

            const data = await apiRequest(`${API_URL}?action=get_user_list&type=${listType}`);

            if (userListContainer) {
                userListContainer.innerHTML = '';
                if (data.status === 'success' && data.users.length > 0) {
                     renderUserList(data.users);
                } else {
                    userListContainer.innerHTML = `<p class="text-center col-span-full">No members found in this list.</p>`;
                }
            }
            return true;
        }
    }

    if (target.closest('#inbox-btn')) {
        await showView('inbox');
        const data = await apiRequest(`${API_URL}?action=get_inbox`);
        if (data.status === 'success') renderInbox(data, currentUser);
        return true;
    }

    const convoLink = target.closest('.open-conversation');
    if (convoLink) {
        const otherUserId = convoLink.dataset.userId;
        const otherUserName = convoLink.dataset.userName;
        await showView('conversation');
        document.getElementById('conversation-with-name').textContent = otherUserName;
        document.getElementById('reply-receiver-id').value = otherUserId;
        const data = await apiRequest(`${API_URL}?action=get_conversation&with_user_id=${otherUserId}`);
        if (data.status === 'success') renderConversation(data, currentUser);
        return true;
    }

    const editProfileButton = target.closest('#go-to-edit-profile');
    if (editProfileButton) {
        await showView('edit_profile');
        const user = await fetchData_user.profileData(currentUser.id);
        if(user){
            document.getElementById('edit-full-name').value = user.full_name || '';
            document.getElementById('edit-phone').value = user.phone_number || '';
            document.getElementById('edit-country').value = user.country || '';
            document.getElementById('edit-city').value = user.city || '';
            document.getElementById('edit-religion').value = user.religion || '';
            document.getElementById('edit-relationship').value = user.relationship_status || 'Single';
            document.getElementById('edit-gender').value = user.gender || 'Other';
            document.getElementById('edit-birthday').value = user.birthday || '';
            document.getElementById('edit-bio').value = user.bio || '';
            document.getElementById('edit-profile-avatar-preview').src = user.photo_url || DEFAULT_AVATAR_URL;
        }
        return true;
    }

    // --- Username Shop বাটন হ্যান্ডলার (নতুন যোগ করা হয়েছে) ---
    if (target.id === 'username-shop-btn') {
        await showView('username_shop');
        await fetchData_usernameShop.info();
        return true;
    }
    // -----------------------------------------------------

    const backToProfileBtn = target.closest('.back-to-profile');
    if(backToProfileBtn){
        const userId = backToProfileBtn.dataset.userId || currentUser.id;
        await showView('user_profile');
        const user = await fetchData_user.profileData(userId);
        if(user) renderUserProfile(user, currentUser);
        return true;
    }

    if (target.id === 'go-to-advance-profile' || target.id === 'back-to-advance-profile') {
        const userId = target.dataset.userId;
        await showView('advance_profile');
        const user = await fetchData_user.profileData(userId);
        if (user) {
            renderAdvanceProfile(user);
        }
        return true;
    }

    const userContentLink = target.closest('.user-content-link');
    if (userContentLink) {
        const userId = userContentLink.dataset.userId;
        const contentType = userContentLink.dataset.contentType;
        await showView('user_content');

        const data = await apiRequest(`${API_URL}?action=get_user_content&user_id=${userId}&type=${contentType}`);
        const userData = await fetchData_user.profileData(userId);

        if (data.status === 'success' && userData) {
            const title = `${userData.display_name}'s ${contentType.charAt(0).toUpperCase() + contentType.slice(1)}`;
            renderUserContent({ title: title, content: data.content, user: userData, type: contentType }, currentUser);
        }
        return true;
    }

    if (target.id === 'recharge-btn') {
        await showView('recharge');
        return true;
    }
    if (target.id === 'withdrawal-btn') {
        await showView('withdrawal');
        return true;
    }

    const inboxPageLink = target.closest('.inbox-page-link');
    if (inboxPageLink) {
        const page = inboxPageLink.dataset.page;
        const data = await apiRequest(`${API_URL}?action=get_inbox&page=${page}`);
        if (data.status === 'success') renderInbox(data, currentUser);
        return true;
    }

    const conversationPageLink = target.closest('.conversation-page-link');
    if (conversationPageLink) {
        const page = conversationPageLink.dataset.page;
        const withUserId = conversationPageLink.dataset.withUserId;
        const data = await apiRequest(`${API_URL}?action=get_conversation&with_user_id=${withUserId}&page=${page}`);
        if (data.status === 'success') renderConversation(data, currentUser);
        return true;
    }

    if (target.closest('#notifications-btn, .back-to-notifications')) {
        await showView('notifications');
        const data = await apiRequest(`${API_URL}?action=get_notifications`);
        if (data.status === 'success') {
            renderNotifications(data);
        }
        return true;
    }

    if (target.id === 'mark-all-read-btn') {
        const data = await apiRequest(`${API_URL}?action=mark_notifications_read`);
        if (data.status === 'success') {
            const badge = document.getElementById('notification-count-badge');
            if(badge) badge.classList.add('hidden');
            const newData = await apiRequest(`${API_URL}?action=get_notifications`);
            if (newData.status === 'success') renderNotifications(newData);
        }
        return true;
    }

    const notificationPageLink = target.closest('.notification-page-link');
    if (notificationPageLink) {
        const page = notificationPageLink.dataset.page;
        const data = await apiRequest(`${API_URL}?action=get_notifications&page=${page}`);
        if (data.status === 'success') renderNotifications(data);
        return true;
    }

    const notificationItem = target.closest('.notification-item');
    if (notificationItem && notificationItem.dataset.view) {
        const view = notificationItem.dataset.view;
        const id = notificationItem.dataset.id;

        await showView(view);
        if (view === 'topic_view') {
            const data = await fetchData_topics.topicDetails(id);
            if(data) renderTopicDetails(data, currentUser);
        } else if (view === 'archive_view') {
            const data = await fetchData_archives.archiveDetails(id);
            if(data) renderArchiveDetails(data, currentUser);
        } else if (view === 'shout_history') {
            fetchData_shouts.allShouts(currentUser, 1);
        } else if (view === 'single_shout_view') {
            fetchData_shouts.singleShout(id, currentUser);
            setTimeout(() => {
                const backBtn = document.getElementById('single-shout-back-btn');
                if (backBtn) {
                    backBtn.innerHTML = '&larr; Back to Notifications';
                    backBtn.classList.add('back-to-notifications');
                }
            }, 100);
        }
        return true;
    }

    return false;
}

export async function handleUserSubmits(form, formData, currentUser) {
    if (form.id === 'send-pm-form') {
        formData.append('action', 'send_pm');
        const receiverId = formData.get('receiver_id');
        const data = await apiRequest(API_URL, { method: 'POST', body: formData });
        await renderActionStatus({status: data.status, message: data.message, backView: 'user_profile', backViewId: receiverId});
        return true;
    }

    if (form.id === 'reply-pm-form') {
        const receiverId = formData.get('receiver_id');
        const messageText = formData.get('message');

        if (!receiverId || receiverId == '0') {
             alert('Error: Could not identify the message recipient. Please try opening the conversation again.');
             return true;
        }
        if (!messageText || !messageText.trim()) return true;

        formData.append('action', 'send_pm');

        const data = await apiRequest(API_URL, { method: 'POST', body: formData });

        if (data.status === 'success') {
            form.reset();
            const newData = await apiRequest(`${API_URL}?action=get_conversation&with_user_id=${receiverId}`);
            if (newData.status === 'success') await renderConversation(newData, currentUser);
        } else {
            alert(`Failed to send message: ${data.message || 'Unknown error'}`);
        }
        return true;
    }

    if(form.id === 'edit-profile-form') {
        formData.append('action', 'update_profile');

        const birthdayInput = form.querySelector('#edit-birthday');
        if (birthdayInput && birthdayInput.value) {
            formData.set('birthday', birthdayInput.value);
        } else {
            formData.set('birthday', null);
        }

        const data = await apiRequest(API_URL, { method: 'POST', body: formData });
        await renderActionStatus({status: data.status, message: data.message, backView: 'user_profile', backViewId: currentUser.id});
        if (data.status === 'success') document.dispatchEvent(new Event('userUpdated'));
        return true;
    }

    if (form.id === 'avatar-upload-form') {
        formData.append('action', 'upload_avatar');
        const statusEl = document.getElementById('avatar-upload-status');
        if(statusEl) statusEl.textContent = 'Uploading...';

        const data = await apiRequest(API_URL, { method: 'POST', body: formData });

        if (data.status === 'success') {
            if(statusEl) statusEl.textContent = data.message;
            document.dispatchEvent(new Event('userUpdated'));
        } else {
            if(statusEl) statusEl.textContent = data.message || 'Upload failed.';
        }
        return true;
    }

    if (form.id === 'recharge-form') {
        formData.append('action', 'request_recharge');
        const data = await apiRequest(API_URL, { method: 'POST', body: formData });
        await renderActionStatus({status: data.status, message: data.message, backView: 'user_profile', backViewId: currentUser.id});
        return true;
    }

    if (form.id === 'withdrawal-form') {
        formData.append('action', 'request_withdrawal');
        const data = await apiRequest(API_URL, { method: 'POST', body: formData });
        await renderActionStatus({status: data.status, message: data.message, backView: 'user_profile', backViewId: currentUser.id});
        if (data.status === 'success') document.dispatchEvent(new Event('userUpdated'));
        return true;
    }

    return false;
}