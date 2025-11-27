<?php
// api/api.php

// --- STEP 1: SETUP ERROR HANDLING ---
ini_set('display_errors', 1);
error_reporting(E_ALL);

function jsonErrorHandler($errno, $errstr, $errfile, $errline) {
    if (!(error_reporting() & $errno)) { return false; }
    http_response_code(500);
    if (!headers_sent()) { header('Content-Type: application/json'); }
    echo json_encode([
        'status' => 'error',
        'message' => 'A server-side error occurred.',
        'error_details' => [
            'type' => 'PHP Error',
            'message' => $errstr,
            'file' => $errfile,
            'line' => $errline
        ]
    ]);
    exit;
}
set_error_handler("jsonErrorHandler");

// --- STEP 2: INITIAL SETUP ---
header('Content-Type: application/json');
require_once 'db_connect.php';
session_start();
require_once 'features/bot_functions.php';

// --- STEP 2.5: POOR MAN'S CRON JOB TRIGGER ---
ignore_user_abort(true);
set_time_limit(0);
include_once 'image_processor.php';


// --- STEP 3: GET ACTION & CURRENT USER ---
$action = $_POST['action'] ?? $_GET['action'] ?? null;
$original_user_id = isset($_SESSION['original_user_id']) ? (int)$_SESSION['original_user_id'] : 0;
$current_user_id = isset($_SESSION['user_id']) ? (int)$_SESSION['user_id'] : 0;
if (!$action) {
    echo json_encode(['status' => 'error', 'message' => 'Action parameter not provided.']);
    exit;
}

// --- STEP 4: HELPER FUNCTION FOR USER ROLE ---
function getUserRole($conn, $user_id) {
    if (!$user_id) return null;
    $stmt = $conn->prepare("SELECT role FROM users WHERE id = ?");
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $result = $stmt->get_result();
    return ($result->num_rows > 0) ? $result->fetch_assoc()['role'] : null;
}
$current_user_role = getUserRole($conn, $original_user_id ?: $current_user_id);
$is_staff = in_array($current_user_role, ['Admin', 'Senior Moderator', 'Moderator']);
$is_admin = ($current_user_role === 'Admin');

// --- STEP 5: MAIN ACTION ROUTING ---
$response = ['status' => 'error', 'message' => 'Invalid request'];

$auth_actions = ['register', 'login', 'check_status', 'logout', 'stop_impersonation'];
$shout_actions = ['post_shout', 'get_shouts', 'get_latest_shout', 'add_reaction', 'delete_shout', 'edit_shout', 'get_shout_details', 'pin_shout', 'get_single_shout', 'get_shout_reactors'];
$user_actions = ['update_profile', 'get_site_stats', 'get_user_list', 'get_user_profile', 'update_user_role', 'delete_user', 'upload_avatar', 'update_activity'];
$pm_actions = ['send_pm', 'get_inbox', 'get_conversation', 'get_latest_pm'];
$staff_actions = ['get_pending_transactions', 'update_transaction_status', 'get_pending_archives', 'update_archive_status', 'get_all_users_for_staff', 'get_all_shouts', 'delete_shout_staff', 'get_user_content', 'get_all_topics_staff', 'get_all_archives_staff', 'get_all_transactions', 'get_hidden_staff'];
$admin_actions = ['toggle_ban_status', 'update_user_role_admin', 'adjust_balance', 'issue_warning', 'get_user_warnings', 'clear_avatar', 'grant_premium_admin', 'remove_premium_admin', 'add_user_note', 'get_user_notes', 'get_login_history', 'get_transaction_history', 'impersonate_user', 'get_premium_settings', 'update_premium_settings', 'generate_coupon', 'adjust_gold_coins', 'reset_password', 'get_user_restrictions', 'toggle_restriction', 'get_themes_for_promo', 'generate_theme_promo_code'];
$transaction_actions = ['request_recharge', 'request_withdrawal'];
$topic_actions = ['create_topic', 'get_all_topics', 'get_topic_details', 'post_topic_reply', 'edit_topic', 'delete_topic', 'toggle_pin_topic', 'toggle_close_topic', 'move_topic', 'shout_topic', 'get_topic_stats', 'toggle_replies_visibility', 'search_topics'];
$archive_actions = ['create_archive', 'get_all_archives', 'get_archive_details', 'like_archive', 'post_archive_reply', 'delete_archive', 'edit_archive', 'delete_archive_reply', 'get_archive_details_by_reply'];
$notification_actions = ['get_notifications', 'mark_notifications_read', 'get_unread_notification_count'];
$gold_coin_actions = ['get_coin_status', 'grab_coin'];
$friend_actions = ['send_friend_request', 'accept_friend_request', 'cancel_or_unfriend', 'get_friends_list'];
$premium_actions = ['get_premium_packages', 'buy_premium'];
$premium_tools_actions = ['get_premium_tools_data', 'upload_cover_photo', 'claim_monthly_bonus'];
$report_actions = ['submit_report', 'get_reports', 'update_report_status', 'get_report_logs'];
$game_actions = [
    'get_ball_sort_level', 'get_ball_sort_progress', 'complete_ball_sort_level', 'use_ball_sort_feature'
];
$gift_actions = ['get_gift_shop_items', 'send_gift', 'get_user_gifts', 'initiate_gift_trade', 'respond_to_gift_trade'];
$lottery_actions = ['get_lottery_games', 'get_lottery_game_details', 'buy_lottery_token', 'get_lottery_admin_data', 'lottery_draw_admin', 'lottery_reset_admin'];
$statistics_actions = ['get_statistics_list', 'get_general_stats'];
$site_settings_actions = ['get_site_settings', 'update_site_settings'];
$quiz_actions = ['get_quiz_counts', 'get_open_quizzes_announcement', 'get_all_quizzes', 'add_quiz', 'edit_quiz', 'get_quiz_details', 'toggle_quiz_status', 'toggle_quiz_pin', 'delete_quiz'];
$theme_actions = ['get_themes', 'set_theme', 'redeem_theme_promo_code'];
$home_actions = ['get_home_details'];
$bbcode_actions = ['parse_bbcode'];

if (in_array($action, $auth_actions)) { require_once 'features/auth.php'; }
elseif (in_array($action, $shout_actions)) { require_once 'features/shouts.php'; }
elseif (in_array($action, $user_actions)) { require_once 'features/users.php'; }
elseif (in_array($action, $pm_actions)) { require_once 'features/pm.php'; }
elseif (in_array($action, $transaction_actions)) { require_once 'features/transactions.php'; }
elseif (in_array($action, $staff_actions)) { require_once 'features/staff_tools.php'; }
elseif (in_array($action, $admin_actions)) { require_once 'features/admin_tools.php'; }
elseif (in_array($action, $topic_actions)) { require_once 'features/topics.php'; }
elseif (in_array($action, $archive_actions)) { require_once 'features/archives.php'; }
elseif (in_array($action, $notification_actions)) { require_once 'features/notifications.php'; }
elseif (in_array($action, $gold_coin_actions)) { require_once 'features/gold_coin.php'; }
elseif (in_array($action, $friend_actions)) { require_once 'features/friends.php'; }
elseif (in_array($action, $premium_actions)) { require_once 'features/premium.php'; }
elseif (in_array($action, $premium_tools_actions)) { require_once 'features/premium_tools.php'; }
elseif (in_array($action, $report_actions)) { require_once 'features/reports.php'; }
elseif (in_array($action, $game_actions)) { require_once 'features/games.php'; }
elseif (in_array($action, $gift_actions)) { require_once 'features/gifts.php'; }
elseif (in_array($action, $lottery_actions)) { require_once 'features/lottery.php'; }
elseif (in_array($action, $statistics_actions)) { require_once 'features/statistics.php'; }
elseif (in_array($action, $site_settings_actions)) { require_once 'features/site_settings.php'; }
elseif (in_array($action, $quiz_actions)) { require_once 'features/quizzes.php'; }
elseif (in_array($action, $theme_actions)) { require_once 'features/themes.php'; }
elseif (in_array($action, $home_actions)) { require_once 'features/home.php'; }
elseif (in_array($action, $bbcode_actions)) { require_once 'features/bbcode.php'; }
else { $response['message'] = "Unknown action: {$action}"; }

// --- STEP 6: FINAL OUTPUT ---
echo json_encode($response);
$conn->close();
?>