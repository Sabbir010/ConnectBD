<?php
// api/features/shouts.php

switch ($action) {
    case 'post_shout':
        if (!$current_user_id) { $response['message'] = 'You must be logged in to post a shout.'; break; }

        $user_perm_stmt = $conn->prepare("SELECT can_shout FROM users WHERE id = ?");
        $user_perm_stmt->bind_param("i", $current_user_id);
        $user_perm_stmt->execute();
        $user_perm = $user_perm_stmt->get_result()->fetch_assoc();
        if (!$user_perm || $user_perm['can_shout'] == 0) {
            $response['message'] = 'You do not have permission to post in the shoutbox.';
            break;
        }
        
        $message = trim($_POST['message'] ?? '');
        if (empty($message)) { $response['message'] = 'Shout message cannot be empty.'; break; }

        $stmt = $conn->prepare("INSERT INTO shouts (user_id, text) VALUES (?, ?)");
        $stmt->bind_param("is", $current_user_id, $message);
        
        if ($stmt->execute()) {
            $shout_id = $conn->insert_id;
            $conn->query("UPDATE users SET total_shouts = total_shouts + 1 WHERE id = $current_user_id");

            parseTagsAndNotify($conn, $message, 'shout', $shout_id, $current_user_id);
            addXP($conn, $current_user_id, 0.25);

            $response = ['status' => 'success'];

            $bot_res = $conn->query("SELECT display_name FROM users WHERE id = " . SYSTEM_USER_ID);
            $bot_name = $bot_res->fetch_assoc()['display_name'];
            
            $shouter_res = $conn->query("SELECT display_name FROM users WHERE id = $current_user_id");
            $shouter_name = $shouter_res->fetch_assoc()['display_name'];

            if (stripos($message, '@' . $bot_name) !== false) {
                $question = str_ireplace('@' . $bot_name, '', $message);
                $ai_response = callGeminiAPI($question);
                
                $shout_reply = "@" . $shouter_name . " " . $ai_response;
                postSystemShout($conn, $shout_reply);
            }

        } else {
            $response['message'] = 'Failed to post shout.';
        }
        break;
        
    case 'edit_shout':
        if (!$current_user_id) { $response['message'] = 'You must be logged in.'; break; }
        $shout_id = (int)($_POST['shout_id'] ?? 0);
        $message = trim($_POST['message'] ?? '');

        if ($shout_id > 0 && !empty($message)) {
            $stmt = $conn->prepare("SELECT user_id FROM shouts WHERE id = ?");
            $stmt->bind_param("i", $shout_id);
            $stmt->execute();
            $result = $stmt->get_result();
            $shout = $result->fetch_assoc();

            $user_is_premium_res = $conn->query("SELECT is_premium FROM users WHERE id = $current_user_id");
            $user_is_premium = $user_is_premium_res ? $user_is_premium_res->fetch_assoc()['is_premium'] : 0;
            
            if ($shout && (($shout['user_id'] == $current_user_id && $user_is_premium) || $is_staff)) {
                $update_stmt = $conn->prepare("UPDATE shouts SET text = ? WHERE id = ?");
                $update_stmt->bind_param("si", $message, $shout_id);
                if ($update_stmt->execute()) {
                    parseTagsAndNotify($conn, $message, 'shout', $shout_id, $current_user_id);
                    $response = ['status' => 'success', 'message' => 'Shout updated successfully.'];
                } else {
                    $response['message'] = 'Failed to update shout.';
                }
            } else {
                $response['message'] = 'You do not have permission to edit this shout.';
            }
        } else {
            $response['message'] = 'Invalid shout data.';
        }
        break;

    case 'get_single_shout':
        if (!$current_user_id) { $response['message'] = 'You must be logged in.'; break; }
        $shout_id = (int)($_GET['shout_id'] ?? 0);
        if ($shout_id > 0) {
            // *** Updated SELECT ***
            $query = "SELECT s.id, s.text, s.created_at, u.id as user_id, u.display_name, u.capitalized_username, u.username_color, u.photo_url, u.role, u.display_role, u.is_premium, u.premium_expires_at, u.is_verified, u.is_special, u.member_status
                      FROM shouts s
                      LEFT JOIN users u ON s.user_id = u.id
                      WHERE s.id = ?";
            $stmt = $conn->prepare($query);
            $stmt->bind_param("i", $shout_id);
            $stmt->execute();
            $shout = $stmt->get_result()->fetch_assoc();
            if ($shout) {
                $shout['reactions'] = [];
                 $reactions_result = $conn->query("SELECT reaction, COUNT(id) as count FROM shout_reactions WHERE shout_id = {$shout['id']} GROUP BY reaction");
                 if($reactions_result){
                     while($row = $reactions_result->fetch_assoc()){
                         $shout['reactions'][$row['reaction']] = $row['count'];
                     }
                 }
                $response = ['status' => 'success', 'shout' => $shout];
            } else {
                $response['message'] = 'Shout not found.';
            }
        } else {
            $response['message'] = 'Invalid Shout ID.';
        }
        break;

    case 'get_shout_details':
        if (!$current_user_id) { $response['message'] = 'You must be logged in.'; break; }
        $shout_id = (int)($_GET['shout_id'] ?? 0);

        if ($shout_id > 0) {
            $stmt = $conn->prepare("SELECT id, text, user_id FROM shouts WHERE id = ?");
            $stmt->bind_param("i", $shout_id);
            $stmt->execute();
            $result = $stmt->get_result();
            $shout = $result->fetch_assoc();

            $user_is_premium_res = $conn->query("SELECT is_premium FROM users WHERE id = {$shout['user_id']}");
            $user_is_premium = $user_is_premium_res ? $user_is_premium_res->fetch_assoc()['is_premium'] : 0;

            if ($shout && (($shout['user_id'] == $current_user_id && $user_is_premium) || $is_staff)) {
                $response = ['status' => 'success', 'shout' => $shout];
            } else {
                $response['message'] = 'Shout not found or you do not have permission.';
            }
        } else {
            $response['message'] = 'Invalid Shout ID.';
        }
        break;

    case 'get_shouts':
        $shouts_per_page = 10;
        $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
        if ($page < 1) $page = 1;
        $offset = ($page - 1) * $shouts_per_page;

        $total_shouts_result = $conn->query("SELECT COUNT(id) as total FROM shouts");
        $total_shouts = $total_shouts_result->fetch_assoc()['total'];
        $total_pages = ceil($total_shouts / $shouts_per_page);

        // *** Updated SELECT ***
        $query = "SELECT s.id, s.text, s.created_at, u.id as user_id, u.display_name, u.capitalized_username, u.username_color, u.photo_url, u.role, u.display_role, u.is_premium, u.premium_expires_at, u.is_verified, u.is_special, u.member_status
                  FROM shouts s 
                  LEFT JOIN users u ON s.user_id = u.id 
                  ORDER BY s.created_at DESC 
                  LIMIT ?, ?";
        
        $stmt = $conn->prepare($query);
        $stmt->bind_param("ii", $offset, $shouts_per_page);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result === false) {
            $response['message'] = 'Could not load shouts from the database.';
            break;
        }
        
        $shouts = $result->fetch_all(MYSQLI_ASSOC);
        
        foreach ($shouts as $index => $shout) {
            $shouts[$index]['reactions'] = [];
        }

        $shout_ids = array_column($shouts, 'id');

        if (!empty($shout_ids)) {
            $ids_placeholder = implode(',', $shout_ids);
            $reaction_query = "SELECT shout_id, reaction, COUNT(id) as count 
                               FROM shout_reactions 
                               WHERE shout_id IN ($ids_placeholder) 
                               GROUP BY shout_id, reaction";
            
            $reactions_result = $conn->query($reaction_query);

            if ($reactions_result && $reactions_result->num_rows > 0) {
                $reactions_map = [];
                while($reaction_data = $reactions_result->fetch_assoc()){
                    $reactions_map[$reaction_data['shout_id']][$reaction_data['reaction']] = $reaction_data['count'];
                }

                foreach ($shouts as $index => $shout) {
                    if (isset($reactions_map[$shout['id']])) {
                        $shouts[$index]['reactions'] = $reactions_map[$shout['id']];
                    }
                }
            }
        }
        
        $response = ['status' => 'success', 'shouts' => $shouts, 'pagination' => ['currentPage' => $page, 'totalPages' => $total_pages]];
        break;

    case 'get_latest_shout':
        // *** Updated SELECT ***
        $query = "SELECT s.id, s.text, s.created_at, u.id as user_id, u.display_name, u.capitalized_username, u.username_color, u.photo_url, u.role, u.display_role, u.is_premium, u.premium_expires_at, u.is_verified, u.is_special, u.member_status
                  FROM shouts s 
                  LEFT JOIN users u ON s.user_id = u.id 
                  ORDER BY s.created_at DESC 
                  LIMIT 1";
        $shout = $conn->query($query)->fetch_assoc();
        if($shout){
             $shout['reactions'] = [];
             $reactions_result = $conn->query("SELECT reaction, COUNT(id) as count FROM shout_reactions WHERE shout_id = {$shout['id']} GROUP BY reaction");
             if($reactions_result){
                 while($row = $reactions_result->fetch_assoc()){
                     $shout['reactions'][$row['reaction']] = $row['count'];
                 }
             }
        }
        $response = ['status' => 'success', 'shout' => $shout];
        break;

    case 'add_reaction':
        if (!$current_user_id) { $response['message'] = 'You must be logged in to react.'; break; }
        
        $shout_id = (int)($_POST['shout_id'] ?? 0);
        $reaction = trim($_POST['reaction'] ?? '');
        $allowed_reactions = ['like', 'love', 'haha', 'sad', 'angry'];

        if ($shout_id > 0 && in_array($reaction, $allowed_reactions)) {
            $stmt = $conn->prepare("INSERT INTO shout_reactions (shout_id, user_id, reaction) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE reaction = ?");
            $stmt->bind_param("iiss", $shout_id, $current_user_id, $reaction, $reaction);
            
            if ($stmt->execute()) {
                $response = ['status' => 'success'];
                
                $shout_owner_res = $conn->query("SELECT user_id, LEFT(text, 30) as shout_text FROM shouts WHERE id = $shout_id");
                if ($shout_owner_res->num_rows > 0) {
                    $shout_data = $shout_owner_res->fetch_assoc();
                    $shout_owner_id = $shout_data['user_id'];
                    $shout_text_snippet = htmlspecialchars($shout_data['shout_text']);

                    if ($shout_owner_id != $current_user_id) {
                        $reactor_res = $conn->query("SELECT display_name FROM users WHERE id = $current_user_id");
                        $reactor_name = $reactor_res->fetch_assoc()['display_name'];

                        $notification_message = "<b>{$reactor_name}</b> reacted to your shout: \"<i>{$shout_text_snippet}...</i>\"";
                        $link = "single_shout_view:{$shout_id}";
                        sendNotification($conn, $shout_owner_id, $notification_message, $link);
                    }
                }
            } else {
                $response = ['status' => 'error', 'message' => 'Failed to add reaction. Error: ' . $stmt->error];
            }
        } else {
            $response['message'] = 'Invalid request.';
        }
        break;

    case 'get_shout_reactors':
        if (!$current_user_id) { $response['message'] = 'You must be logged in.'; break; }
        $shout_id = (int)($_GET['shout_id'] ?? 0);
        $reaction_type = $_GET['reaction'] ?? '';
        $allowed_reactions = ['like', 'love', 'haha', 'sad', 'angry'];

        if ($shout_id > 0 && in_array($reaction_type, $allowed_reactions)) {
            // *** Updated SELECT ***
            $query = "SELECT u.id, u.display_name, u.capitalized_username, u.username_color, u.photo_url, u.role, u.display_role, u.is_premium, u.premium_expires_at, u.is_verified, u.is_special, u.member_status
                      FROM shout_reactions sr
                      JOIN users u ON sr.user_id = u.id
                      WHERE sr.shout_id = ? AND sr.reaction = ?";
            $stmt = $conn->prepare($query);
            $stmt->bind_param("is", $shout_id, $reaction_type);
            $stmt->execute();
            $reactors = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
            $response = ['status' => 'success', 'reactors' => $reactors];
        } else {
            $response['message'] = 'Invalid request.';
        }
        break;

    case 'delete_shout':
        if (!$current_user_id) { $response['message'] = 'You must be logged in.'; break; }
        $shout_id = (int)($_POST['shout_id'] ?? 0);
        
        if ($shout_id > 0) {
            $stmt = $conn->prepare("SELECT user_id FROM shouts WHERE id = ?");
            $stmt->bind_param("i", $shout_id);
            $stmt->execute();
            $result = $stmt->get_result();
            $shout = $result->fetch_assoc();

            if ($shout && ($shout['user_id'] == $current_user_id || $is_staff)) {
                $conn->query("DELETE FROM shout_reactions WHERE shout_id = $shout_id");
                $conn->query("DELETE FROM shouts WHERE id = $shout_id");
                $response = ['status' => 'success', 'message' => 'Shout has been deleted.'];
            } else {
                $response['message'] = 'You do not have permission to delete this shout.';
            }
        } else {
            $response['message'] = 'Invalid shout ID.';
        }
        break;

    case 'pin_shout':
        if (!$current_user_id) { $response['message'] = 'You must be logged in.'; break; }
        $shout_id = (int)($_POST['shout_id'] ?? 0);

        $user_res = $conn->query("SELECT is_premium, pinned_shout_id FROM users WHERE id = $current_user_id");
        $user_data = $user_res->fetch_assoc();

        if ($user_data && $user_data['is_premium']) {
            if ($user_data['pinned_shout_id'] == $shout_id) {
                $stmt = $conn->prepare("UPDATE users SET pinned_shout_id = NULL WHERE id = ?");
                $stmt->bind_param("i", $current_user_id);
                if ($stmt->execute()) {
                    $response = ['status' => 'success', 'message' => 'Shout unpinned from your profile.'];
                } else {
                    $response['message'] = 'Failed to unpin shout.';
                }
            } else {
                $shout_owner_res = $conn->query("SELECT user_id FROM shouts WHERE id = $shout_id");
                if ($shout_owner_res->num_rows > 0 && $shout_owner_res->fetch_assoc()['user_id'] == $current_user_id) {
                    $stmt = $conn->prepare("UPDATE users SET pinned_shout_id = ? WHERE id = ?");
                    $stmt->bind_param("ii", $shout_id, $current_user_id);
                    if ($stmt->execute()) {
                        $response = ['status' => 'success', 'message' => 'Shout pinned to your profile successfully.'];
                    } else {
                        $response['message'] = 'Failed to pin shout.';
                    }
                } else {
                     $response['message'] = 'You can only pin your own shouts.';
                }
            }
        } else {
            $response['message'] = 'Only premium members can pin shouts.';
        }
        break;
}
?>