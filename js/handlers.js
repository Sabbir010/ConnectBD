// js/handlers.js
import { handleShoutClicks, handleShoutSubmits } from './handlers/shoutHandlers.js';
import { handleUserClicks, handleUserSubmits } from './handlers/userHandlers.js';
import { handleTopicClicks, handleTopicSubmits } from './handlers/topicHandlers.js';
import { handleArchiveClicks, handleArchiveSubmits } from './handlers/archiveHandlers.js';
import { handleStaffClicks, handleStaffSubmits } from './handlers/staffHandlers.js';
import { handleGoldCoinClicks, stopGoldCoinInterval } from './handlers/goldCoinHandlers.js';
import { handleFriendsClicks } from './handlers/friendsHandlers.js';
import { handlePremiumClicks, handlePremiumSubmits } from './handlers/premiumHandlers.js';
import { handlePremiumToolsClicks, handlePremiumToolsSubmits } from './handlers/premiumToolsHandlers.js';
import { handleGameClicks } from './handlers/gameHandlers.js';
import { handleGiftClicks } from './handlers/giftHandlers.js';
import { handleLotteryClicks } from './handlers/lotteryHandlers.js';
import { handleLotteryAdminClicks } from './handlers/lotteryAdminHandlers.js';
import { handleReportClicks, handleReportSubmits } from './handlers/reportHandlers.js';
import { handleStatisticsClicks } from './handlers/statisticsHandlers.js';
import { handleQuizClicks, handleQuizSubmits } from './handlers/quizHandlers.js';
import { handleThemeClicks, handleThemeSubmits } from './handlers/themeHandlers.js';
import { handleHomeClicks } from './handlers/homeHandlers.js';
import { handleCricketClicks, handleCricketSubmits } from './handlers/cricketHandlers.js';
import { handleUsernameShopClicks, handleUsernameShopInputs } from './handlers/usernameShopHandlers.js';
import { showView, clearUserProfileTimers, showReportModal } from './ui.js';
import { clearFriendTimers } from './ui/friendsUI.js';
import { apiRequest, API_URL } from './api.js';

let currentUser = null;
let routeApp = null;

export function initHandlers(user, routerFunc) {
    currentUser = user;
    routeApp = routerFunc;
    document.body.removeEventListener('click', globalClickHandler);
    document.body.removeEventListener('submit', globalSubmitHandler);
    document.body.removeEventListener('input', globalInputHandler);
    document.body.addEventListener('click', globalClickHandler);
    document.body.addEventListener('submit', globalSubmitHandler);
    document.body.addEventListener('input', globalInputHandler);
}

function navigate(view, id = null) {
    const params = new URLSearchParams();
    if (id) params.set('id', id);
    const queryString = params.toString();
    const newPath = `/${view}${queryString ? `?${queryString}` : ''}`;
    
    if (window.location.pathname + window.location.search !== newPath) {
        history.pushState({ view, id }, '', newPath);
    }
    
    if (routeApp) routeApp();
}

async function globalClickHandler(e) {
    const target = e.target;
    
    const bbcodeLink = target.closest('.bbcode-link');
    if (bbcodeLink) {
        e.preventDefault();
        const href = bbcodeLink.getAttribute('href');
        const url = new URL(href, window.location.origin);
        const path = url.pathname.substring(1);
        const id = url.searchParams.get('id');
        navigate(path, id);
        return;
    }

    const isNavLink = target.closest('a, .nav-link, .user-name-link, .stats-link, .open-conversation, .notification-item, .view-topic-btn, .view-archive-btn, .staff-tool-card, .admin-tool-card, .admin-tool-card-nav, #show-admin-tools-btn, #view-gifts-btn, .lottery-game-card, #go-to-site-themes, #go-to-profile-themes, #go-to-premium-themes, #go-to-redeem-code, #go-to-bbcode-list, #cricket-btn');
    if (isNavLink && !target.closest('.friend-action-pm')) {
        e.preventDefault();
    }

    stopGoldCoinInterval();
    clearUserProfileTimers();
    clearFriendTimers();

    if (target.id === 'status-back-btn') {
        const backView = target.dataset.backView;
        const backViewId = target.dataset.backViewId;
        if (backView) navigate(backView, backViewId);
        return;
    }

    if (target.closest('.nav-link')) { navigate(target.closest('.nav-link').dataset.view); return; }
    if (target.closest('.back-to-home')) { navigate('home'); return; }
    if (target.id === 'show-profile-btn' && currentUser) { navigate('user_profile', currentUser.id); return; }
    if (target.closest('.user-name-link')) { const id = target.closest('.user-name-link').dataset.userId; if (id && id !== '0') navigate('user_profile', id); return; }
    if (target.id === 'back-to-profile-from-gifts') { navigate('user_profile', target.dataset.userId); return; }
    if (target.closest('.back-to-profile')) { navigate('user_profile', target.closest('.back-to-profile').dataset.userId || currentUser.id); return; }
    if (target.id === 'go-to-advance-profile' || target.id === 'back-to-advance-profile') { navigate('advance_profile', target.dataset.userId); return; }
    if (target.id === 'go-to-edit-profile' || target.id === 'go-to-edit-profile-from-premium') { navigate('edit_profile'); return; }
    if (target.closest('#topics-btn') || target.closest('.back-to-topics')) { navigate('topics'); return; }
    if (target.closest('.view-topic-btn')) { navigate('topic_view', target.closest('.view-topic-btn').dataset.topicId); return; }
    if (target.id === 'topic-options-link') { navigate('topic_options', target.dataset.topicId); return; }
    if (target.closest('#back-to-topic-view')) { navigate('topic_view', target.closest('#back-to-topic-view').dataset.topicId); return; }
    if (target.closest('#archives-btn') || target.closest('.back-to-archives')) { navigate('archives'); return; }
    if (target.closest('.view-archive-btn')) { navigate('archive_view', target.closest('.view-archive-btn').dataset.archiveId); return; }
    if (target.closest('.edit-archive-btn')) { navigate('archive_edit', target.closest('.edit-archive-btn').dataset.archiveId); return; }
    if (target.id === 'shout-history-btn' || target.classList.contains('back-to-shout-history') || target.id === 'back-to-shout-history-from-reactors') { navigate('shout_history'); return; }
    if (target.closest('.edit-shout-btn')) { navigate('shout_edit', target.closest('.edit-shout-btn').dataset.shoutId); return; }
    if (target.id === 'inbox-btn') { navigate('inbox'); return; }
    if (target.closest('.open-conversation')) { navigate('conversation', target.closest('.open-conversation').dataset.userId); return; }
    if (target.id === 'notifications-btn') { navigate('notifications'); return; }
    if (target.id === 'friends-btn') { navigate('friends'); return; }
    if (target.id === 'gold-coin-btn') { navigate('gold_coin'); return; }
    if (target.id === 'buy-premium-btn') { navigate('buy_premium'); return; }
    if (target.id === 'premium-tools-btn') { navigate('premium_tools'); return; }
    if (target.id === 'go-to-bbcode-list') { navigate('special_bbcode'); return; }
    if (target.closest('.back-to-premium-tools')) { navigate('premium_tools'); return; }
    if (target.id === 'gifts-btn') { navigate('gifts'); return; }
    if (target.id === 'win-money-btn' || target.classList.contains('back-to-lottery')) { navigate('lottery'); return; }
    if (target.closest('.lottery-game-card')) { navigate('lottery_game', target.closest('.lottery-game-card').dataset.gameId); return; }
    if (target.id === 'games-btn' || target.closest('.back-to-games')) { navigate('games'); return; }
    if (target.id === 'recharge-btn') { navigate('recharge'); return; }
    if (target.id === 'withdrawal-btn') { navigate('withdrawal'); return; }
    if (target.id === 'view-gifts-btn') { navigate('user_gifts', target.dataset.userId); return; }
    if (target.closest('.back-to-statistics')) { navigate('statistics'); return; }
    if (target.id === 'statistics-btn') { navigate('statistics'); return; }
    if (target.id === 'quiz-contests-btn' || target.id === 'go-to-quizzes-from-announcement' || target.classList.contains('back-to-quizzes')) { navigate('quizzes'); return; }
    if (target.id === 'themes-btn' || target.closest('.back-to-themes')) { navigate('theme_shop'); return; }
    if (target.closest('#go-to-site-themes')) { navigate('site_themes'); return; }
    if (target.closest('#go-to-profile-themes')) { navigate('profile_themes'); return; }
    if (target.closest('#go-to-premium-themes')) { navigate('premium_themes'); return; }
    if (target.closest('#go-to-redeem-code')) { navigate('redeem_code'); return; }
    if (target.closest('.staff-tool-card')) { navigate(target.closest('.staff-tool-card').dataset.view); return; }
    if (target.id === 'staff-panel-btn-home' || target.classList.contains('back-to-staff-panel')) { navigate('staff_panel'); return; }
    if (target.id === 'show-admin-tools-btn') { navigate('admin_tools', target.dataset.userId); return; }
    if (target.id === 'back-to-user-profile-from-admin-tools') { navigate('user_profile', target.dataset.userId); return; }
    if (target.id === 'back-to-admin-tools') { navigate('admin_tools', target.dataset.userId); return; }
    if (target.closest('.admin-tool-card-nav')) { navigate(target.closest('.admin-tool-card-nav').dataset.view, target.closest('.admin-tool-card-nav').dataset.userId); return; }
    if (target.closest('#cricket-btn')) { navigate('cricket'); return; }
    if (target.closest('#live-matches-btn')) { navigate('cricket_live_matches'); return; }
    if (target.id === 'go-to-username-shop') { navigate('username_shop'); return; }
    if (target.id === 'back-to-profile-from-shop') { navigate('user_profile', currentUser.id); return; }


    if (await handleHomeClicks(target, currentUser)) return;
    if (await handleShoutClicks(target, currentUser)) return;
    if (await handleUserClicks(target, currentUser)) return;
    if (await handleTopicClicks(target, currentUser)) return;
    if (await handleArchiveClicks(target, currentUser)) return;
    if (await handleStaffClicks(target, currentUser)) return;
    if (await handleGoldCoinClicks(target, currentUser)) return;
    if (await handleFriendsClicks(target, currentUser)) return;
    if (await handlePremiumClicks(target, currentUser)) return;
    if (await handlePremiumToolsClicks(target, currentUser)) return;
    if (await handleGiftClicks(target, currentUser)) return;
    if (await handleLotteryClicks(target, currentUser)) return;
    if (await handleLotteryAdminClicks(target)) return;
    if (await handleGameClicks(target)) return;
    if (await handleReportClicks(target, currentUser)) return;
    if (await handleStatisticsClicks(target)) return;
    if (await handleQuizClicks(target, currentUser)) return;
    if (await handleCricketClicks(target, currentUser)) return;
    if (await handleThemeClicks(target)) return;
    if (await handleUsernameShopClicks(target)) return;

    const reportBtn = target.closest('.report-btn');
    if (reportBtn) { showReportModal(reportBtn.dataset.type, reportBtn.dataset.id, reportBtn.dataset.preview); return; }
    const cancelReportBtn = target.closest('#cancel-report-btn');
    if (cancelReportBtn) { const modal = document.getElementById('report-modal'); if (modal) modal.remove(); return; }
}

async function globalSubmitHandler(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    
    if (await handleReportSubmits(form, formData, currentUser)) return;
    
    if (await handleShoutSubmits(form, formData, currentUser)) return;
    if (await handleUserSubmits(form, formData, currentUser)) return;
    if (await handleTopicSubmits(form, formData, currentUser)) return;
    if (await handleArchiveSubmits(form, formData, currentUser)) return;
    if (await handleStaffSubmits(form, formData, currentUser)) return;
    if (await handlePremiumSubmits(form, formData, currentUser)) return;
    if (await handlePremiumToolsSubmits(form, formData, currentUser)) return;
    if (await handleThemeSubmits(form, formData, currentUser)) return;
    if (await handleQuizSubmits(form, formData, currentUser)) return;
    if (await handleCricketSubmits(form, formData, currentUser)) return;
}

async function globalInputHandler(e) {
    const target = e.target;
    handleUsernameShopInputs(target);
}

export const dataIntervals = {
    id: null,
    start: (currentUser) => {
        if (dataIntervals.id) clearInterval(dataIntervals.id);

        const fetchDataForInterval = async () => {
            if (!currentUser) return;
            const { fetchData_user } = await import('./handlers/userHandlers.js');
            
            const statusData = await apiRequest(`${API_URL}?action=check_status`);
            if (statusData && statusData.status === 'success' && statusData.user) {
                Object.assign(currentUser, statusData.user);
            }
            
            fetchData_user.latestPm();
            
            const notifData = await apiRequest(`${API_URL}?action=get_unread_notification_count`);
            const badge = document.getElementById('notification-count-badge');
            if (badge && notifData.status === 'success' && notifData.unread_count > 0) {
                badge.textContent = notifData.unread_count;
                badge.classList.remove('hidden');
            } else if (badge) {
                badge.classList.add('hidden');
            }
            
            const isHomeViewActive = document.getElementById('center-panel')?.querySelector('#latest-shout-container');
            if(isHomeViewActive){
                const { fetchData_shouts } = await import('./handlers/shoutHandlers.js');
                fetchData_shouts.latestShout(currentUser);
            }
        };
        
        // --- কোড আপডেট করা হয়েছে: এখন প্রথমে একবার ডেটা লোড হবে, তারপর প্রতি ৩০ সেকেন্ড পর পর ---
        fetchDataForInterval();
        dataIntervals.id = setInterval(fetchDataForInterval, 30000);
    },
    stop: () => {
        if (dataIntervals.id) clearInterval(dataIntervals.id);
    }
};