<?php
// api/features/home.php

switch ($action) {
    case 'get_home_details':
        // Get server time
        $server_time = date('Y-m-d H:i:s');

        // Get latest shout
        $latest_shout_query = "SELECT s.id, s.text, s.created_at, u.id as user_id, u.display_name, u.capitalized_username, u.capitalization_expires_at, u.username_color, u.photo_url, u.role, u.display_role, u.is_premium, u.premium_expires_at, u.is_verified, u.is_special
                               FROM shouts s 
                               LEFT JOIN users u ON s.user_id = u.id 
                               ORDER BY s.created_at DESC 
                               LIMIT 1";
        $latest_shout = $conn->query($latest_shout_query)->fetch_assoc();
        if ($latest_shout) {
            $reactions_result = $conn->query("SELECT reaction, COUNT(id) as count FROM shout_reactions WHERE shout_id = {$latest_shout['id']} GROUP BY reaction");
            $latest_shout['reactions'] = [];
            if ($reactions_result) {
                while($row = $reactions_result->fetch_assoc()){
                    $latest_shout['reactions'][$row['reaction']] = $row['count'];
                }
            }
        }

        // Get site stats (optimized query)
        $stats_query = "
            SELECT
                (SELECT COUNT(id) FROM users) as total_members,
                (SELECT COUNT(id) FROM users WHERE last_seen > NOW() - INTERVAL 24 HOUR) as active_today,
                (SELECT COUNT(id) FROM users WHERE last_activity > NOW() - INTERVAL 60 MINUTE) as total_online,
                SUM(CASE WHEN gender = 'Male' AND last_activity > NOW() - INTERVAL 60 MINUTE THEN 1 ELSE 0 END) as male_online,
                SUM(CASE WHEN gender = 'Female' AND last_activity > NOW() - INTERVAL 60 MINUTE THEN 1 ELSE 0 END) as female_online,
                SUM(CASE WHEN is_premium = 1 AND premium_expires_at > NOW() AND last_activity > NOW() - INTERVAL 60 MINUTE THEN 1 ELSE 0 END) as premium_online,
                SUM(CASE WHEN role IN ('Admin', 'Senior Moderator', 'Moderator') AND (display_role IS NULL OR display_role != 'Member') AND last_activity > NOW() - INTERVAL 60 MINUTE THEN 1 ELSE 0 END) as staff_online
            FROM users;
        ";
        $site_stats = $conn->query($stats_query)->fetch_assoc();
        
        $newest_user_data = $conn->query("SELECT id, display_name, capitalized_username, username_color, is_premium, premium_expires_at, is_verified, is_special FROM users ORDER BY id DESC LIMIT 1")->fetch_assoc();
        $site_stats['newest_member_data'] = $newest_user_data ?: null;

        // Get quiz counts
        $quiz_counts_query = "SELECT 
                                (SELECT COUNT(id) FROM quizzes) as total,
                                (SELECT COUNT(id) FROM quizzes WHERE status = 'open') as open";
        $quiz_counts = $conn->query($quiz_counts_query)->fetch_assoc();

        // Get quiz announcement
        $quiz_announcement_query = "SELECT id, quiz_title FROM quizzes WHERE status = 'open' ORDER BY is_pinned DESC, updated_at DESC";
        $quiz_announcement = $conn->query($quiz_announcement_query)->fetch_all(MYSQLI_ASSOC);

        $response = [
            'status' => 'success',
            'server_time' => $server_time,
            'latest_shout' => $latest_shout,
            'site_stats' => $site_stats,
            'quiz_counts' => $quiz_counts,
            'quiz_announcement' => $quiz_announcement
        ];
        break;
}
?>