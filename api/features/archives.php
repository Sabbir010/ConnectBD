<?php
// api/features/archives.php

if (!$current_user_id) {
    $response['message'] = 'You must be logged in.';
    echo json_encode($response);
    exit;
}

switch ($action) {
    case 'create_archive':
        $title = trim($_POST['title'] ?? '');
        $category = trim($_POST['category'] ?? '');
        $content = trim($_POST['content'] ?? '');
        $allowed_categories = ['Fun', 'Story', 'Tech', 'Movie', 'Sports', 'Lifestyle', 'Gaming'];

        if (!empty($title) && !empty($content) && in_array($category, $allowed_categories)) {
            $stmt = $conn->prepare("INSERT INTO archives (user_id, title, category, content) VALUES (?, ?, ?, ?)");
            $stmt->bind_param("isss", $current_user_id, $title, $category, $content);
            if ($stmt->execute()) {
                $archive_id = $conn->insert_id;
                $conn->query("UPDATE users SET total_archives = total_archives + 1 WHERE id = $current_user_id");
                
                parseTagsAndNotify($conn, $content, 'archive', $archive_id, $current_user_id);
                
                $response = ['status' => 'success', 'message' => 'Archive submitted for review.'];
            } else {
                $response['message'] = 'Failed to submit archive.';
            }
        } else {
            $response['message'] = 'Please fill all fields correctly.';
        }
        break;

    case 'get_all_archives':
        $category_filter = $_GET['category'] ?? 'all';
        $query = "SELECT a.id, a.title, a.category, a.views, u.display_name 
                  FROM archives a JOIN users u ON a.user_id = u.id 
                  WHERE a.status = 'approved'";
        if ($category_filter !== 'all') {
            $query .= " AND a.category = '" . $conn->real_escape_string($category_filter) . "'";
        }
        $query .= " ORDER BY a.id DESC";
        $archives = $conn->query($query)->fetch_all(MYSQLI_ASSOC);
        $response = ['status' => 'success', 'archives' => $archives];
        break;

    case 'get_archive_details':
        $archive_id = (int)($_GET['archive_id'] ?? 0);
        if ($archive_id > 0) {
            $owner_stmt = $conn->prepare("SELECT user_id FROM archives WHERE id = ?");
            $owner_stmt->bind_param("i", $archive_id);
            $owner_stmt->execute();
            $owner_id_res = $owner_stmt->get_result();
            if ($owner_id_res->num_rows > 0) {
                $owner_id = $owner_id_res->fetch_assoc()['user_id'];
                if ($current_user_id != $owner_id) {
                    $conn->query("UPDATE archives SET views = views + 1 WHERE id = $archive_id");
                }
            }

            $stmt_archive = $conn->prepare("SELECT a.*, u.display_name FROM archives a JOIN users u ON a.user_id = u.id WHERE a.id = ? AND (a.status = 'approved' OR a.user_id = ? OR ?)");
            $stmt_archive->bind_param("iii", $archive_id, $current_user_id, $is_staff);
            $stmt_archive->execute();
            $archive = $stmt_archive->get_result()->fetch_assoc();

            if ($archive) {
                $likes = $conn->query("SELECT COUNT(id) as count FROM archive_likes WHERE archive_id = $archive_id AND like_type = 'like'")->fetch_assoc()['count'];
                $dislikes = $conn->query("SELECT COUNT(id) as count FROM archive_likes WHERE archive_id = $archive_id AND like_type = 'dislike'")->fetch_assoc()['count'];
                
                $replies = $conn->query("SELECT ar.*, u.display_name, u.photo_url, u.role, u.display_role FROM archive_replies ar JOIN users u ON ar.user_id = u.id WHERE ar.archive_id = $archive_id ORDER BY ar.created_at ASC")->fetch_all(MYSQLI_ASSOC);

                $response = ['status' => 'success', 'archive' => $archive, 'likes' => $likes, 'dislikes' => $dislikes, 'replies' => $replies];
            } else {
                $response['message'] = 'Archive not found or not approved.';
            }
        } else {
            $response['message'] = 'Invalid ID.';
        }
        break;
        
    case 'get_archive_details_by_reply':
        $reply_id = (int)($_GET['reply_id'] ?? 0);
        if ($reply_id > 0) {
            $stmt = $conn->prepare("SELECT archive_id FROM archive_replies WHERE id = ?");
            $stmt->bind_param("i", $reply_id);
            $stmt->execute();
            $result = $stmt->get_result()->fetch_assoc();
            if ($result) {
                $response = ['status' => 'success', 'archive_id' => $result['archive_id']];
            } else {
                $response['message'] = 'Could not find the parent archive for this reply.';
            }
        } else {
            $response['message'] = 'Invalid Reply ID.';
        }
        break;

    case 'like_archive':
        $archive_id = (int)($_POST['archive_id'] ?? 0);
        $like_type = ($_POST['type'] === 'dislike') ? 'dislike' : 'like';

        if ($archive_id > 0) {
            $stmt = $conn->prepare("INSERT INTO archive_likes (archive_id, user_id, like_type) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE like_type = ?");
            $stmt->bind_param("iiss", $archive_id, $current_user_id, $like_type, $like_type);
            $stmt->execute();
            $response = ['status' => 'success'];
        } else {
            $response['message'] = 'Invalid ID.';
        }
        break;
        
    case 'post_archive_reply':
        $archive_id = (int)($_POST['archive_id'] ?? 0);
        $content = trim($_POST['content'] ?? '');

        if ($archive_id > 0 && !empty($content)) {
            $stmt = $conn->prepare("INSERT INTO archive_replies (archive_id, user_id, content) VALUES (?, ?, ?)");
            $stmt->bind_param("iis", $archive_id, $current_user_id, $content);
            if ($stmt->execute()) {
                $reply_id = $conn->insert_id;
                parseTagsAndNotify($conn, $content, 'archive_reply', $reply_id, $current_user_id);
                $response = ['status' => 'success', 'message' => 'Reply posted.'];

                $owner_res = $conn->query("SELECT user_id, title FROM archives WHERE id = $archive_id");
                $archive_data = $owner_res->fetch_assoc();
                $archive_owner_id = $archive_data['user_id'];
                $archive_title = $archive_data['title'];
                
                $replier_res = $conn->query("SELECT display_name FROM users WHERE id = $current_user_id");
                $replier_name = $replier_res->fetch_assoc()['display_name'];

                if ($archive_owner_id != $current_user_id) {
                    $reply_notification_msg = "<b>{$replier_name}</b> replied to your archive: \"<b>{$archive_title}</b>\"";
                    $link = "archive_view:{$archive_id}";
                    sendNotification($conn, $archive_owner_id, $reply_notification_msg, $link);
                }
            } else {
                $response['message'] = 'Failed to post reply.';
            }
        } else {
            $response['message'] = 'Invalid data.';
        }
        break;
        
    case 'delete_archive':
        $archive_id = (int)($_POST['archive_id'] ?? 0);
        $stmt = $conn->prepare("SELECT user_id FROM archives WHERE id = ?");
        $stmt->bind_param("i", $archive_id);
        $stmt->execute();
        $owner_res = $stmt->get_result();

        if ($owner_res->num_rows > 0) {
            $owner_id = $owner_res->fetch_assoc()['user_id'];
            if ($archive_id > 0 && ($current_user_id == $owner_id || $is_staff)) {
                $conn->query("DELETE FROM archive_replies WHERE archive_id = $archive_id");
                $conn->query("DELETE FROM archive_likes WHERE archive_id = $archive_id");
                $conn->query("DELETE FROM archives WHERE id = $archive_id");
                $response = ['status' => 'success', 'message' => 'Archive deleted.'];
            } else {
                $response['message'] = 'You do not have permission.';
            }
        } else {
            $response['message'] = 'Archive not found.';
        }
        break;

    case 'edit_archive':
        $archive_id = (int)($_POST['archive_id'] ?? 0);
        $title = trim($_POST['title'] ?? '');
        $category = trim($_POST['category'] ?? '');
        $content = trim($_POST['content'] ?? '');

        $stmt = $conn->prepare("SELECT user_id FROM archives WHERE id = ?");
        $stmt->bind_param("i", $archive_id);
        $stmt->execute();
        $owner_res = $stmt->get_result();

        if ($owner_res->num_rows > 0) {
            $owner_id = $owner_res->fetch_assoc()['user_id'];
            if ($archive_id > 0 && !empty($title) && !empty($content) && ($current_user_id == $owner_id || $is_staff)) {
                $update_stmt = $conn->prepare("UPDATE archives SET title = ?, category = ?, content = ? WHERE id = ?");
                $update_stmt->bind_param("sssi", $title, $category, $content, $archive_id);
                if ($update_stmt->execute()) {
                    parseTagsAndNotify($conn, $content, 'archive', $archive_id, $current_user_id);
                    $response = ['status' => 'success', 'message' => 'Archive updated successfully.'];
                } else {
                    $response['message'] = 'Failed to update archive.';
                }
            } else {
                $response['message'] = 'You do not have permission or data is invalid.';
            }
        } else {
            $response['message'] = 'Archive not found.';
        }
        break;
        
    case 'delete_archive_reply':
        $reply_id = (int)($_POST['reply_id'] ?? 0);

        $stmt = $conn->prepare("SELECT user_id FROM archive_replies WHERE id = ?");
        $stmt->bind_param("i", $reply_id);
        $stmt->execute();
        $owner_res = $stmt->get_result();

        if ($owner_res->num_rows > 0) {
            $owner_id = $owner_res->fetch_assoc()['user_id'];
            $archive_id_stmt = $conn->prepare("SELECT a.user_id as archive_owner_id FROM archives a JOIN archive_replies ar ON a.id = ar.archive_id WHERE ar.id = ?");
            $archive_id_stmt->bind_param("i", $reply_id);
            $archive_id_stmt->execute();
            $archive_owner_id = $archive_id_stmt->get_result()->fetch_assoc()['archive_owner_id'];

            if ($reply_id > 0 && ($current_user_id == $owner_id || $current_user_id == $archive_owner_id || $is_staff)) {
                $delete_stmt = $conn->prepare("DELETE FROM archive_replies WHERE id = ?");
                $delete_stmt->bind_param("i", $reply_id);
                if ($delete_stmt->execute()) {
                    $response = ['status' => 'success', 'message' => 'Reply deleted.'];
                } else {
                    $response['message'] = 'Failed to delete reply.';
                }
            } else {
                $response['message'] = 'You do not have permission.';
            }
        } else {
            $response['message'] = 'Reply not found.';
        }
        break;
}
?>