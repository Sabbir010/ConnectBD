<?php
// api/features/statistics.php

if (!$current_user_id) {
    $response['message'] = 'You must be logged in to view statistics.';
    echo json_encode($response);
    exit;
}

switch ($action) {
    case 'get_general_stats':
        $total_members = $conn->query("SELECT COUNT(id) as count FROM users")->fetch_assoc()['count'];
        $male_members = $conn->query("SELECT COUNT(id) as count FROM users WHERE gender = 'Male'")->fetch_assoc()['count'];
        $female_members = $conn->query("SELECT COUNT(id) as count FROM users WHERE gender = 'Female'")->fetch_assoc()['count'];
        $response = ['status' => 'success', 'stats' => ['total' => $total_members, 'male' => $male_members, 'female' => $female_members]];
        break;

    case 'get_statistics_list':
        $type = $_GET['type'] ?? '';
        $page = (int)($_GET['page'] ?? 1);
        $limit = 10;
        $offset = ($page - 1) * $limit;
        
        $query = "";
        $count_query = "";
        $unit = '';
        $base_select = "SELECT u.id, u.display_name, u.photo_url, u.role, u.display_role, T.stat_value ";

        switch ($type) {
            // General Member Lists (ORDER BY display_name ASC করা হয়েছে)
            case 'total_members':
                $count_query = "SELECT COUNT(id) as total FROM users";
                $query = "SELECT id, display_name, photo_url, role, display_role FROM users ORDER BY display_name ASC LIMIT ? OFFSET ?";
                break;
            case 'male_members':
                $count_query = "SELECT COUNT(id) as total FROM users WHERE gender = 'Male'";
                $query = "SELECT id, display_name, photo_url, role, display_role FROM users WHERE gender = 'Male' ORDER BY display_name ASC LIMIT ? OFFSET ?";
                break;
            case 'female_members':
                $count_query = "SELECT COUNT(id) as total FROM users WHERE gender = 'Female'";
                $query = "SELECT id, display_name, photo_url, role, display_role FROM users WHERE gender = 'Female' ORDER BY display_name ASC LIMIT ? OFFSET ?";
                break;

            // Top Lists
            case 'top_shouters':
                $unit = 'shouts';
                $query = $base_select . "FROM users u JOIN (SELECT user_id, COUNT(id) as stat_value FROM shouts GROUP BY user_id) AS T ON u.id = T.user_id ORDER BY T.stat_value DESC LIMIT 20";
                break;
            case 'top_chatters':
                $unit = 'messages';
                $query = $base_select . "FROM users u JOIN (SELECT sender_id as user_id, COUNT(id) as stat_value FROM private_messages WHERE sender_id != 2 GROUP BY sender_id) AS T ON u.id = T.user_id ORDER BY T.stat_value DESC LIMIT 20";
                break;
            case 'top_gold_coin':
                $unit = 'gold';
                $query = "SELECT id, display_name, photo_url, role, display_role, gold_coins as stat_value FROM users ORDER BY gold_coins DESC LIMIT 20";
                break;
            case 'top_gifter':
                $unit = 'gifts sent';
                $query = $base_select . "FROM users u JOIN (SELECT sender_id as user_id, COUNT(id) as stat_value FROM user_gifts WHERE sender_id != 2 GROUP BY sender_id) AS T ON u.id = T.user_id ORDER BY T.stat_value DESC LIMIT 20";
                break;
            case 'top_profile_view':
                $unit = 'views';
                $query = $base_select . "FROM users u JOIN (SELECT profile_id as user_id, COUNT(DISTINCT viewer_id) as stat_value FROM profile_views GROUP BY profile_id) AS T ON u.id = T.user_id ORDER BY T.stat_value DESC LIMIT 20";
                break;
            case 'top_archive_posters':
                $unit = 'archives';
                $query = $base_select . "FROM users u JOIN (SELECT user_id, COUNT(id) as stat_value FROM archives WHERE status = 'approved' GROUP BY user_id) AS T ON u.id = T.user_id ORDER BY T.stat_value DESC LIMIT 20";
                break;
            case 'top_topic_creator':
                $unit = 'topics';
                $query = $base_select . "FROM users u JOIN (SELECT user_id, COUNT(id) as stat_value FROM topics GROUP BY user_id) AS T ON u.id = T.user_id ORDER BY T.stat_value DESC LIMIT 20";
                break;
            case 'top_posters':
                $unit = 'replies';
                $query = $base_select . "FROM users u JOIN (SELECT user_id, COUNT(id) as stat_value FROM topic_replies GROUP BY user_id) AS T ON u.id = T.user_id ORDER BY T.stat_value DESC LIMIT 20";
                break;
            case 'top_balance':
                $unit = 'balance';
                $query = "SELECT id, display_name, photo_url, role, display_role, balance as stat_value FROM users ORDER BY balance DESC LIMIT 20";
                break;
            case 'longest_online':
                $unit = 'seconds';
                $query = "SELECT id, display_name, photo_url, role, display_role, total_online_seconds as stat_value FROM users ORDER BY total_online_seconds DESC LIMIT 20";
                break;
            case 'top_gamers':
                $unit = 'levels';
                $query = $base_select . "FROM users u JOIN (SELECT user_id, MAX(highest_level_completed) as stat_value FROM user_game_progress GROUP BY user_id) AS T ON u.id = T.user_id ORDER BY T.stat_value DESC LIMIT 20";
                break;
            case 'top_gift_receiver':
                $unit = 'gifts received';
                $query = $base_select . "FROM users u JOIN (SELECT owner_id as user_id, COUNT(id) as stat_value FROM user_gifts GROUP BY owner_id) AS T ON u.id = T.user_id ORDER BY T.stat_value DESC LIMIT 20";
                break;
            
            // Special & Ban Lists
            case 'staff_list':
                $query = "SELECT id, display_name, photo_url, role, display_role FROM users WHERE role IN ('Admin', 'Senior Moderator', 'Moderator') AND (display_role IS NULL OR display_role != 'Member') ORDER BY FIELD(role, 'Admin', 'Senior Moderator', 'Moderator')";
                break;
            case 'premium_user_list':
                $query = "SELECT id, display_name, photo_url, role, display_role FROM users WHERE is_premium = 1 AND premium_expires_at > NOW() ORDER BY display_name ASC";
                break;
            case 'banned_list':
                $query = "SELECT id, display_name, photo_url, role, display_role FROM users WHERE is_banned = 1 ORDER BY display_name ASC";
                break;
            default:
                $response['message'] = 'This statistics list is not yet implemented.';
                echo json_encode($response);
                exit;
        }

        $total_pages = 1;
        if (!empty($count_query)) {
            $total_res = $conn->query($count_query);
            $total_items = $total_res->fetch_assoc()['total'];
            $total_pages = ceil($total_items / $limit);
        }

        $stmt = $conn->prepare($query);
        if (strpos($query, 'LIMIT ? OFFSET ?')) {
            $stmt->bind_param("ii", $limit, $offset);
        }
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result) {
            $users = $result->fetch_all(MYSQLI_ASSOC);
            $response = ['status' => 'success', 'users' => $users, 'unit' => $unit, 'pagination' => ['currentPage' => $page, 'totalPages' => $total_pages]];
        } else {
            $response['message'] = 'Error fetching statistics.';
        }
        break;
}
?>
