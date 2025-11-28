<?php
// api/features/users.php

switch ($action) {
    case 'update_profile':
        if (!$current_user_id) {
            $response['message'] = 'Log in to update your profile.';
            break;
        }

        $full_name = trim($_POST['full_name'] ?? '');
        $phone_number = trim($_POST['phone_number'] ?? '');
        $country = trim($_POST['country'] ?? '');
        $city = trim($_POST['city'] ?? '');
        $religion = trim($_POST['religion'] ?? '');
        $relationship_status = trim($_POST['relationship_status'] ?? '');
        $gender = $_POST['gender'] ?? 'Other';
        $birthday = $_POST['birthday'] ?? null;
        $bio = trim($_POST['bio'] ?? '');

        $stmt = $conn->prepare("UPDATE users SET
            full_name = ?, phone_number = ?, country = ?, city = ?,
            religion = ?, relationship_status = ?, gender = ?, birthday = ?, bio = ?
            WHERE id = ?");
        $stmt->bind_param("sssssssssi",
            $full_name, $phone_number, $country, $city,
            $religion, $relationship_status, $gender, $birthday, $bio,
            $current_user_id);

        if ($stmt->execute()) {
            $response = ['status' => 'success', 'message' => 'Profile updated successfully.'];
        } else {
            $response = ['message' => 'Failed to update profile.'];
        }
        break;

    case 'upload_avatar':
        if (!$current_user_id) {
            $response['message'] = 'You must be logged in to upload an avatar.';
            break;
        }

        if (isset($_FILES['avatarFile']) && $_FILES['avatarFile']['error'] === UPLOAD_ERR_OK) {
            $file = $_FILES['avatarFile'];
            $allowed_types = ['image/jpeg', 'image/png', 'image/gif'];
            $max_size = 5 * 1024 * 1024; // 5MB

            if (!in_array($file['type'], $allowed_types)) {
                $response['message'] = 'Invalid file type. Only JPG, PNG, and GIF are allowed.';
                break;
            }

            if ($file['size'] > $max_size) {
                $response['message'] = 'File is too large. Maximum size is 5MB.';
                break;
            }

            $file_extension = pathinfo($file['name'], PATHINFO_EXTENSION);
            $new_filename = 'avatar_' . $current_user_id . '_' . time() . '.' . $file_extension;

            $upload_dir = __DIR__ . '/../../uploads/avatars/';
            if (!is_dir($upload_dir)) {
                mkdir($upload_dir, 0777, true);
            }
            $upload_path = $upload_dir . $new_filename;

            if (move_uploaded_file($file['tmp_name'], $upload_path)) {
                $file_url = 'https://' . $_SERVER['HTTP_HOST'] . '/uploads/avatars/' . $new_filename;

                $stmt = $conn->prepare("UPDATE users SET photo_url = ? WHERE id = ?");
                $stmt->bind_param("si", $file_url, $current_user_id);
                if($stmt->execute()){
                    $response = ['status' => 'success', 'message' => 'Avatar uploaded successfully.'];
                } else {
                    $response['message'] = 'Failed to update database.';
                }
            } else {
                $response['message'] = 'Failed to move uploaded file.';
            }
        } else {
            $response['message'] = 'No file was uploaded or an error occurred.';
        }
        break;

    case 'get_site_stats':
        $stats = [];
        $stats['total_members'] = $conn->query("SELECT COUNT(id) as count FROM users")->fetch_assoc()['count'];

        // *** আপডেটেড: username_color, is_verified, is_special যোগ করা হয়েছে ***
        $newest_user_data = $conn->query("SELECT id, display_name, capitalized_username, username_color, is_premium, premium_expires_at, is_verified, is_special FROM users ORDER BY id DESC LIMIT 1")->fetch_assoc();
        if ($newest_user_data) {
            $stats['newest_member_data'] = $newest_user_data;
        } else {
            $stats['newest_member_data'] = null;
        }

        $stats['active_today'] = $conn->query("SELECT COUNT(id) as count FROM users WHERE last_seen > NOW() - INTERVAL 24 HOUR")->fetch_assoc()['count'];

        $online_query = "SELECT
            COUNT(id) as total_online,
            SUM(CASE WHEN gender = 'Male' THEN 1 ELSE 0 END) as male_online,
            SUM(CASE WHEN gender = 'Female' THEN 1 ELSE 0 END) as female_online,
            SUM(CASE WHEN is_premium = 1 AND premium_expires_at > NOW() THEN 1 ELSE 0 END) as premium_online,
            SUM(CASE WHEN role IN ('Admin', 'Senior Moderator', 'Moderator') AND (display_role IS NULL OR display_role != 'Member') THEN 1 ELSE 0 END) as staff_online
            FROM users WHERE last_activity > NOW() - INTERVAL 60 MINUTE";
        $online_stats = $conn->query($online_query)->fetch_assoc();
        $stats = array_merge($stats, $online_stats);

        $response = ['status' => 'success', 'stats' => $stats];
        break;

    case 'get_user_list':
        $list_type = $_GET['type'] ?? '';
        $query_condition = "";
        switch($list_type) {
            case 'total_online': $query_condition = "last_activity > NOW() - INTERVAL 60 MINUTE"; break;
            case 'male_online': $query_condition = "gender = 'Male' AND last_activity > NOW() - INTERVAL 60 MINUTE"; break;
            case 'female_online': $query_condition = "gender = 'Female' AND last_activity > NOW() - INTERVAL 60 MINUTE"; break;
            case 'premium_online': $query_condition = "is_premium = 1 AND premium_expires_at > NOW() AND last_activity > NOW() - INTERVAL 60 MINUTE"; break;
            case 'staff_online': $query_condition = "role IN ('Admin', 'Senior Moderator', 'Moderator') AND (display_role IS NULL OR display_role != 'Member') AND last_activity > NOW() - INTERVAL 60 MINUTE"; break;
            case 'active_today': $query_condition = "last_seen > NOW() - INTERVAL 24 HOUR"; break;
            default: $response['message'] = 'Invalid list type.'; echo json_encode($response); exit;
        }
        
        // *** আপডেটেড: is_verified, is_special, username_color ফেচ করা হচ্ছে ***
        $stmt = $conn->prepare("SELECT id, display_name, capitalized_username, username_color, photo_url, role, display_role, level, member_status, is_premium, premium_expires_at, last_seen, last_activity, NOW() as server_time, is_verified, is_special, xp FROM users WHERE $query_condition ORDER BY last_activity DESC");
        $stmt->execute();
        $users = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        $response = ['status' => 'success', 'users' => $users];
        break;

    case 'update_activity':
        if (!$current_user_id) { break; }
        $page_name = $_POST['page_name'] ?? 'Unknown Page';

        $stmt = $conn->prepare("UPDATE users SET last_activity = NOW(), current_page = ? WHERE id = ?");
        $stmt->bind_param("si", $page_name, $current_user_id);
        if ($stmt->execute()) {
            $response = ['status' => 'success'];
        } else {
            $response = ['status' => 'error', 'message' => 'Failed to update activity.'];
        }
        break;

    case 'get_user_profile':
        $user_id_to_check = isset($_GET['user_id']) ? (int)$_GET['user_id'] : $current_user_id;

        if ($user_id_to_check > 0) {
            if ($current_user_id > 0 && $current_user_id != $user_id_to_check) {
                $view_stmt = $conn->prepare("INSERT INTO profile_views (profile_id, viewer_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE viewed_at = NOW()");
                $view_stmt->bind_param("ii", $user_id_to_check, $current_user_id);
                $view_stmt->execute();
            }

            $is_admin_viewing = (isset($is_admin) && $is_admin && $current_user_id != $user_id_to_check);

            // *** আপডেটেড: সব কলাম ফেচ করা হচ্ছে ***
            $query = "SELECT *, NOW() as server_time, TIMESTAMPDIFF(SECOND, last_activity, NOW()) as idle_seconds FROM users WHERE id = ?";
            $stmt = $conn->prepare($query);
            $stmt->bind_param("i", $user_id_to_check);
            $stmt->execute();
            $user_data = $stmt->get_result()->fetch_assoc();

            if ($user_data) {
                unset($user_data['password_hash']);

                if (!$is_admin_viewing && $current_user_id != $user_id_to_check) {
                    unset($user_data['phone_number']);
                    unset($user_data['email']);
                }

                // ডিফল্ট ভ্যালু সেট করা (যদি NULL থাকে)
                $user_data['level'] = $user_data['level'] ?? 1;
                $user_data['xp'] = $user_data['xp'] ?? 0;
                $user_data['is_special'] = $user_data['is_special'] ?? 0;
                $user_data['is_verified'] = $user_data['is_verified'] ?? 0;
                $user_data['username_color'] = $user_data['username_color'] ?? null;

                if (function_exists('getLevelStatus')) {
                    $user_data['level_title'] = getLevelStatus($user_data['level']);
                }

                $views_stmt = $conn->prepare("SELECT COUNT(DISTINCT viewer_id) as count FROM profile_views WHERE profile_id = ?");
                $views_stmt->bind_param("i", $user_id_to_check);
                $views_stmt->execute();
                $user_data['profile_views'] = $views_stmt->get_result()->fetch_assoc()['count'];

                $pm_in = $conn->query("SELECT COUNT(id) as count FROM private_messages WHERE receiver_id = $user_id_to_check")->fetch_assoc()['count'];
                $pm_out = $conn->query("SELECT COUNT(id) as count FROM private_messages WHERE sender_id = $user_id_to_check")->fetch_assoc()['count'];
                $pm_unread = $conn->query("SELECT COUNT(id) as count FROM private_messages WHERE receiver_id = $user_id_to_check AND is_read = 0")->fetch_assoc()['count'];
                $user_data['pm_stats'] = ['in' => $pm_in, 'out' => $pm_out, 'unread' => $pm_unread];

                $shouts_visible = $conn->query("SELECT COUNT(id) FROM shouts WHERE user_id = $user_id_to_check")->fetch_assoc()['COUNT(id)'];
                $topics_visible = $conn->query("SELECT COUNT(id) FROM topics WHERE user_id = $user_id_to_check")->fetch_assoc()['COUNT(id)'];
                $archives_visible = $conn->query("SELECT COUNT(id) FROM archives WHERE user_id = $user_id_to_check AND status = 'approved'")->fetch_assoc()['COUNT(id)'];

                $user_data['content_stats'] = [
                    'shouts' => ['visible' => $shouts_visible, 'total' => $user_data['total_shouts']],
                    'topics' => ['visible' => $topics_visible, 'total' => $user_data['total_topics']],
                    'archives' => ['visible' => $archives_visible, 'total' => $user_data['total_archives']]
                ];

                $user_data['is_online'] = $user_data['idle_seconds'] < 3600;

                if ($current_user_id != $user_id_to_check) {
                    $user1 = min($current_user_id, $user_id_to_check);
                    $user2 = max($current_user_id, $user_id_to_check);
                    $friend_stmt = $conn->prepare("SELECT status, action_user_id FROM friends WHERE user_one_id = ? AND user_two_id = ?");
                    $friend_stmt->bind_param("ii", $user1, $user2);
                    $friend_stmt->execute();
                    $user_data['friend_status'] = $friend_stmt->get_result()->fetch_assoc();
                }

                if ($user_data['pinned_shout_id']) {
                    $pinned_shout_stmt = $conn->prepare("SELECT id, text, created_at FROM shouts WHERE id = ?");
                    $pinned_shout_stmt->bind_param("i", $user_data['pinned_shout_id']);
                    $pinned_shout_stmt->execute();
                    $pinned_shout = $pinned_shout_stmt->get_result()->fetch_assoc();

                    if($pinned_shout) {
                        $reactions_result = $conn->query("SELECT reaction, COUNT(id) as count FROM shout_reactions WHERE shout_id = {$pinned_shout['id']} GROUP BY reaction");
                        $pinned_shout['reactions'] = [];
                         if($reactions_result){
                             while($row = $reactions_result->fetch_assoc()){
                                 $pinned_shout['reactions'][$row['reaction']] = $row['count'];
                             }
                         }
                         // Pinned Shout এর সাথেও ইউজারের স্পেশাল স্ট্যাটাস এবং ব্লু টিক দরকার হতে পারে
                         $pinned_shout['is_special'] = $user_data['is_special'];
                         $pinned_shout['is_verified'] = $user_data['is_verified'];
                         
                         $user_data['pinned_shout'] = $pinned_shout;
                    }
                }

                array_walk_recursive($user_data, function(&$item, $key){
                    if(is_string($item) && !mb_detect_encoding($item, 'UTF-8', true)){
                        $item = utf8_encode($item);
                    }
                });

                $response = ['status' => 'success', 'user' => $user_data];
            } else {
                $response['message'] = 'User not found.';
            }
        } else {
            $response['message'] = 'Invalid user request.';
        }
        break;

    case 'delete_user':
        if (!isset($is_admin) || !$is_admin) { $response['message'] = 'You do not have permission to delete users.'; break; }
        $user_id_to_delete = (int)($_POST['user_id'] ?? 0);
        if ($user_id_to_delete > 0 && $user_id_to_delete != $current_user_id) {
            $conn->query("DELETE FROM shout_reactions WHERE user_id = $user_id_to_delete");
            $conn->query("DELETE FROM shouts WHERE user_id = $user_id_to_delete");
            $stmt = $conn->prepare("DELETE FROM users WHERE id = ?");
            $stmt->bind_param("i", $user_id_to_delete);
            $response = $stmt->execute() ? ['status' => 'success'] : ['message' => 'Failed to delete user.'];
        } else {
            $response['message'] = 'Invalid request. You cannot delete yourself.';
        }
        break;
}
?>