// js/main.js
import { apiRequest, API_URL } from './api.js';
import {
    showAuthView, showAppView as baseShowAppView, elements, renderUserProfile, showView,
    renderTopicDetails, renderArchiveDetails, renderInbox, renderHomePermissions,
    renderActionStatus, renderTopicOptions, renderArchiveEditForm, renderShoutEditForm,
    renderAdminTools, renderNotifications, renderUserContent, renderAdvanceProfile,
    renderUserList, renderUserGiftList, renderQuizForm, applySiteTheme, renderHiddenStaffPage
} from './ui.js';
import { initHandlers, dataIntervals } from './handlers.js';
import { fetchData_shouts } from './handlers/shoutHandlers.js';
import { fetchData_topics } from './handlers/topicHandlers.js';
import { fetchData_archives } from './handlers/archiveHandlers.js';
import { fetchData_user } from './handlers/userHandlers.js';
import { initGoldCoinPage } from './handlers/goldCoinHandlers.js';
import { fetchData_friends } from './handlers/friendsHandlers.js';
import { fetchData_premium } from './handlers/premiumHandlers.js';
import { fetchData_staff } from './handlers/staffHandlers.js';
import { fetchData_premium_tools } from './handlers/premiumToolsHandlers.js';
import { fetchData_gifts } from './handlers/giftHandlers.js';
import { fetchData_lottery } from './handlers/lotteryHandlers.js';
import { fetchData_lottery_admin } from './handlers/lotteryAdminHandlers.js';
import { fetchData_statistics } from './handlers/statisticsHandlers.js';
import { initBallSortGame } from './games/ball_sort.js';
import { fetchData_dashboard } from './handlers/dashboardHandlers.js';
import { fetchData_reports } from './handlers/reportHandlers.js';
import { fetchData_quizzes } from './handlers/quizHandlers.js';
import { fetchData_themes } from './handlers/themeHandlers.js';
import { fetchData_home } from './handlers/homeHandlers.js'; 
// Username Shop ইমপোর্ট
import { fetchData_usernameShop } from './handlers/usernameShopHandlers.js';

let currentUser = null;

function showAppView(user) {
    baseShowAppView(user);
    const stopImpersonationBtn = document.getElementById('stop-impersonation-btn');
    if (stopImpersonationBtn) {
        if (user.impersonating) {
            stopImpersonationBtn.classList.remove('hidden');
        } else {
            stopImpersonationBtn.classList.add('hidden');
        }
    }
}

// *** আপডেট করা ফাংশন ***
async function updateUserActivity(pageName) {
    if (!currentUser) return;
    const formData = new FormData();
    formData.append('action', 'update_activity');
    formData.append('page_name', pageName);
    
    // রিকোয়েস্টের রেসপন্স চেক করা হচ্ছে
    const response = await apiRequest(API_URL, { method: 'POST', body: formData });
    
    // যদি সফল হয়, তবে userUpdated ইভেন্ট ফায়ার করুন যাতে স্ট্যাটাস রিফ্রেশ হয়
    if (response && response.status === 'success') {
        document.dispatchEvent(new Event('userUpdated'));
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // --- লেআউট টগল ফাংশনালিটি ---
    const layoutToggleBtn = document.getElementById('layout-toggle-btn');

    const updateButtonUI = (isGridView) => {
        if (!layoutToggleBtn) return;
        const iconGrid = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>';
        const iconList = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>';

        if (isGridView) {
            layoutToggleBtn.innerHTML = iconList;
            layoutToggleBtn.title = "Switch to List View";
        } else {
            layoutToggleBtn.innerHTML = iconGrid;
            layoutToggleBtn.title = "Switch to Grid View";
        }
    };

    const applyLayout = (layout) => {
        const layoutContainer = document.getElementById('home-layout-container');
        const isHomeView = !!layoutContainer;

        if (isHomeView) {
            if (layout === 'list-view') {
                layoutContainer.classList.remove('grid-view');
                layoutContainer.classList.add('list-view');
                updateButtonUI(false);
            } else {
                layoutContainer.classList.remove('list-view');
                layoutContainer.classList.add('grid-view');
                updateButtonUI(true);
            }
            if (layoutToggleBtn) layoutToggleBtn.style.display = 'flex';
        } else {
            if (layoutToggleBtn) layoutToggleBtn.style.display = 'none';
        }
    };

    if (layoutToggleBtn) {
        layoutToggleBtn.addEventListener('click', () => {
            const layoutContainer = document.getElementById('home-layout-container');
            if (!layoutContainer) return;

            const isGridView = layoutContainer.classList.contains('grid-view');
            const newLayout = isGridView ? 'list-view' : 'grid-view';

            applyLayout(newLayout);
            localStorage.setItem('homepageLayout', newLayout);
        });
    }

    async function routeApp() {
        if (!currentUser) {
            const statusData = await apiRequest(`${API_URL}?action=check_status`);
            if (statusData.status === 'success' && statusData.user) {
                currentUser = statusData.user;
                showAppView(currentUser);
                applySiteTheme(currentUser);
                initHandlers(currentUser, routeApp);
            } else {
                showAuthView();
                if (!window.location.pathname.includes('login') && !window.location.pathname.includes('register')) {
                    return;
                }
            }
        }

        if(currentUser) {
            applySiteTheme(currentUser);
        }

        dataIntervals.stop();
        if (currentUser) {
            dataIntervals.start(currentUser);
        }

        const path = window.location.pathname.replace('/', '');
        const params = new URLSearchParams(window.location.search);
        const viewName = path || 'home';
        const id = params.get('id');

        await updateUserActivity(viewName);

        const userRole = currentUser ? currentUser.role : null;
        const isStaff = ['Admin', 'Senior Moderator', 'Moderator'].includes(userRole);
        const isPremium = currentUser ? (currentUser.is_premium && new Date(currentUser.premium_expires_at) > new Date()) : false;

        const protectedStaffViews = [
            'staff_panel', 'admin_tools', 'premium_settings', 'site_settings', 'all_transactions',
            'pending_transactions', 'pending_archives', 'admin_dashboard',
            'reports', 'report_logs', 'moderate_shouts',
            'moderate_topics', 'moderate_archives', 'user_search', 'lottery_admin', 
            'theme_promo_generator', 'hidden_staff'
        ];

        const protectedPremiumViews = ['premium_tools', 'special_bbcode'];

        if (protectedStaffViews.includes(viewName) && !isStaff) {
            await showView('action_status');
            renderActionStatus({
                status: 'error',
                message: 'আপনার এই পৃষ্ঠাটি দেখার অনুমতি নেই। (Access Denied for Staff Only)',
                backView: 'home'
            });
            return;
        }

        if (protectedPremiumViews.includes(viewName) && !isPremium) {
            await showView('action_status');
            renderActionStatus({
                status: 'error',
                message: 'এই পৃষ্ঠাটি শুধুমাত্র প্রিমিয়াম সদস্যদের জন্য। (Access Denied for Premium Members Only)',
                backView: 'home'
            });
            return;
        }

        await showView(viewName);

        const currentLayout = localStorage.getItem('homepageLayout') || 'grid-view';
        applyLayout(currentLayout);

        if(currentUser) {
            applySiteTheme(currentUser);
        }

        const publicViews = ['login', 'register'];
        if (!currentUser && !publicViews.includes(viewName)) {
            return;
        }

        switch(viewName) {
            case 'home':
                fetchData_home.details(currentUser);
                fetchData_shouts.latestShout(currentUser);
                fetchData_user.siteStats();
                fetchData_quizzes.counts();
                fetchData_quizzes.announcement();
                renderHomePermissions(currentUser);
                break;
            case 'theme_shop':
                break;
            case 'site_themes':
                fetchData_themes.shop('site');
                break;
            case 'profile_themes':
                fetchData_themes.shop('profile');
                break;
            // --- Username Shop Route ---
            case 'username_shop':
                fetchData_usernameShop.info();
                break;
            // ---------------------------
            case 'redeem_code':
                break;
            case 'theme_promo_generator':
                if (isStaff) {
                    fetchData_staff.themesForPromo();
                }
                break;
            case 'gold_coin':
                initGoldCoinPage();
                break;
            case 'buy_premium':
                fetchData_premium.packages();
                break;
            case 'user_profile':
                if (id) {
                    const user = await fetchData_user.profileData(id);
                    if (user) renderUserProfile(user, currentUser);
                }
                break;
            case 'user_gifts':
                if (id) {
                    const data = await apiRequest(`${API_URL}?action=get_user_gifts&user_id=${id}`);
                    const userData = await fetchData_user.profileData(id);
                    if (data.status === 'success' && userData) {
                        document.getElementById('user-gifts-title').textContent = `${userData.display_name}'s Gifts`;
                        const backBtn = document.getElementById('back-to-profile-from-gifts');
                        if(backBtn) backBtn.dataset.userId = id;
                        renderUserGiftList(data.gifts, currentUser.id == id);
                    } else {
                        const container = document.getElementById('user-gifts-container');
                        if(container) container.innerHTML = `<p class="col-span-full text-center text-red-500">Could not load gifts for this user.</p>`;
                    }
                }
                break;
            case 'advance_profile':
                 if (id) {
                    const user = await fetchData_user.profileData(id);
                    if (user) renderAdvanceProfile(user);
                }
                break;
            case 'edit_profile':
                 if (currentUser) {
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
                        document.getElementById('edit-profile-avatar-preview').src = user.photo_url || 'https://www.pngfind.com/pngs/m/610-6104451_image-placeholder-png-user-profile-placeholder-image-png.png';
                    }
                }
                break;
            case 'topics':
                fetchData_topics.topicStats();
                fetchData_topics.allTopics();
                break;
            case 'topic_view':
                if (id) {
                    const data = await fetchData_topics.topicDetails(id);
                    if(data) renderTopicDetails(data, currentUser);
                }
                break;
             case 'topic_options':
                if (id) {
                    const data = await fetchData_topics.topicDetails(id);
                    if(data) renderTopicOptions(data.topic, currentUser);
                }
                break;
            case 'shout_edit':
                if(id){
                    const data = await apiRequest(`${API_URL}?action=get_shout_details&shout_id=${id}`);
                    if (data.status === 'success') renderShoutEditForm(data.shout);
                }
                break;
            case 'shout_reactors':
                break;
            case 'single_shout_view':
                if (id) {
                    fetchData_shouts.singleShout(id, currentUser);
                }
                break;
            case 'archives':
                fetchData_archives.allArchives();
                break;
            case 'archive_view':
                if(id) {
                    const data = await fetchData_archives.archiveDetails(id);
                    if(data) renderArchiveDetails(data, currentUser);
                }
                break;
            case 'archive_edit':
                if(id){
                     const data = await fetchData_archives.archiveDetails(id);
                     if(data && data.status === 'success') renderArchiveEditForm(data.archive);
                }
                break;
            case 'inbox':
                const inboxData = await apiRequest(`${API_URL}?action=get_inbox`);
                if (inboxData.status === 'success') renderInbox(inboxData, currentUser);
                break;
            case 'conversation':
                 if(id) {
                    const otherUser = await fetchData_user.profileData(id);
                    if (otherUser) {
                        const { renderConversation } = await import('./ui.js');
                        document.getElementById('conversation-with-name').textContent = otherUser.display_name;
                        document.getElementById('reply-receiver-id').value = otherUser.id;
                        const convoData = await apiRequest(`${API_URL}?action=get_conversation&with_user_id=${id}`);
                        if(convoData.status === 'success') {
                            renderConversation(convoData, currentUser);
                        }
                    } else {
                        await renderActionStatus({ status: 'error', message: 'User not found.', backView: 'inbox' });
                    }
                 }
                break;
            case 'notifications':
                const data = await apiRequest(`${API_URL}?action=get_notifications`);
                if (data.status === 'success') {
                    renderNotifications(data);
                }
                break;
             case 'user_list':
                 const userListTitle = document.getElementById('user-list-title');
                 if(userListTitle) userListTitle.textContent = "Members Online";
                 const listData = await apiRequest(`${API_URL}?action=get_user_list&type=total_online`);
                 if(listData.status === 'success') renderUserList(listData.users);
                 break;
            case 'shout_history':
                fetchData_shouts.allShouts(currentUser, 1);
                break;
            case 'friends':
                fetchData_friends.list();
                break;
            case 'admin_tools':
                 if (id) {
                    const data = await apiRequest(`${API_URL}?action=get_user_profile&user_id=${id}`);
                    if(data.status === 'success') renderAdminTools(data.user);
                }
                break;
            case 'premium_tools':
                fetchData_premium_tools.data(currentUser);
                break;
            case 'special_bbcode':
                break;
            case 'gifts':
                fetchData_gifts.shopItems();
                break;
            case 'lottery':
                fetchData_lottery.games();
                break;
            case 'lottery_game':
                if (id) {
                    fetchData_lottery.gameDetails(id, currentUser);
                }
                break;
            case 'lottery_admin':
                fetchData_lottery_admin.data();
                break;
            case 'statistics':
                fetchData_statistics.generalStats();
                break;
            case 'quizzes':
                fetchData_quizzes.list(currentUser);
                break;
            case 'quiz_form':
                const quizId = params.get('id');
                if (quizId) {
                    fetchData_quizzes.detailsForEdit(quizId);
                } else {
                    renderQuizForm(null);
                }
                break;
            case 'site_settings':
                fetchData_staff.siteSettings();
                break;
            case 'all_transactions':
                fetchData_staff.allTransactions();
                break;
            case 'pending_transactions':
                fetchData_staff.pendingTransactions();
                break;
            case 'pending_archives':
                fetchData_staff.pendingArchives();
                break;
            case 'granular_restrictions':
                if (id) fetchData_staff.userRestrictions(id);
                break;
            case 'moderate_shouts':
                fetchData_staff.allShouts();
                break;
            case 'moderate_topics':
                fetchData_staff.allTopics();
                break;
            case 'moderate_archives':
                fetchData_staff.allArchives();
                break;
            case 'user_search':
                break;
            case 'reports':
                fetchData_reports.list();
                break;
            case 'report_logs':
                fetchData_reports.logs();
                break;
            case 'admin_dashboard':
                fetchData_dashboard.stats();
                break;
            case 'hidden_staff':
                if (isStaff) {
                    renderHiddenStaffPage();
                }
                break;
        }
    }

    async function initialize() {
        initHandlers(currentUser, routeApp);
        await routeApp();
    }

    if (elements.userMenuButton) {
        elements.userMenuButton.addEventListener('click', () => elements.userMenuDropdown.classList.toggle('hidden'));
    }
    document.addEventListener('click', (e) => {
        if (elements.userMenuButton && !elements.userMenuButton.contains(e.target) && elements.userMenuDropdown && !elements.userMenuDropdown.contains(e.target)) {
            elements.userMenuDropdown.classList.add('hidden');
        }
    });

    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    if (loginForm) {
        document.getElementById('show-register').addEventListener('click', (e) => { e.preventDefault(); loginForm.classList.add('hidden'); registerForm.classList.remove('hidden'); });
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(loginForm);
            formData.append('action', 'login');
            const data = await apiRequest(API_URL, { method: 'POST', body: formData });
            if (data.status === 'success') {
                window.location.href = '/home';
            } else {
                document.getElementById('login-error').textContent = data.message || 'Login failed.';
                document.getElementById('login-error').classList.remove('hidden');
            }
        });
    }
    if (registerForm) {
        document.getElementById('show-login').addEventListener('click', (e) => { e.preventDefault(); registerForm.classList.add('hidden'); loginForm.classList.remove('hidden'); });
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(registerForm);
            formData.append('action', 'register');
            const data = await apiRequest(API_URL, { method: 'POST', body: formData });
            if (data.status === 'success') {
                alert(data.message);
                registerForm.reset();
                document.getElementById('show-login').click();
            } else {
                document.getElementById('register-error').textContent = data.message || 'Registration failed.';
                document.getElementById('register-error').classList.remove('hidden');
            }
        });
    }

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            dataIntervals.stop();
            await apiRequest(API_URL, { method: 'POST', body: new URLSearchParams('action=logout') });
            window.location.href = '/';
        });
    }

    const stopImpersonationBtn = document.getElementById('stop-impersonation-btn');
    if (stopImpersonationBtn) {
        stopImpersonationBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            const data = await apiRequest(API_URL, { method: 'POST', body: new URLSearchParams('action=stop_impersonation') });
            if (data.status === 'success') {
                location.reload();
            } else {
                alert(data.message || 'Could not return to admin account.');
            }
        });
    }

    window.addEventListener('popstate', routeApp);

    document.addEventListener('userUpdated', async () => {
        const data = await apiRequest(`${API_URL}?action=check_status`);
        if (data.status === 'success' && data.user) {
            currentUser = data.user;
            showAppView(data.user);
            applySiteTheme(data.user);
        }
    });

    initialize();
});