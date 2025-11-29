<?php
// api/features/stories.php

if (!$current_user_id) {
    $response['message'] = 'You must be logged in.';
    echo json_encode($response);
    exit;
}

switch ($action) {
    case 'post_story':
        $type = $_POST['type'] ?? 'text';
        $bg_color = $_POST['background_color'] ?? '#000000';
        $content = '';
        
        // 24 Hours Expiry
        $expires_at = date('Y-m-d H:i:s', strtotime('+24 hours'));

        if ($type === 'image') {
            if (isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
                $upload_dir = '../uploads/stories/';
                if (!file_exists($upload_dir)) mkdir($upload_dir, 0777, true);
                
                $ext = pathinfo($_FILES['image']['name'], PATHINFO_EXTENSION);
                $filename = 'story_' . $current_user_id . '_' . time() . '.' . $ext;
                $target_file = $upload_dir . $filename;
                
                if (move_uploaded_file($_FILES['image']['tmp_name'], $target_file)) {
                    $content = 'uploads/stories/' . $filename;
                } else {
                    $response['message'] = 'Failed to upload image.';
                    break;
                }
            } else {
                $response['message'] = 'No image selected.';
                break;
            }
        } else {
            $content = trim($_POST['text_content'] ?? '');
            if (empty($content)) {
                $response['message'] = 'Story content cannot be empty.';
                break;
            }
        }

        $stmt = $conn->prepare("INSERT INTO stories (user_id, type, content, background_color, expires_at) VALUES (?, ?, ?, ?, ?)");
        $stmt->bind_param("issss", $current_user_id, $type, $content, $bg_color, $expires_at);

        if ($stmt->execute()) {
            $response = ['status' => 'success', 'message' => 'Story posted successfully!'];
        } else {
            $response['message'] = 'Database error.';
        }
        break;

    case 'get_stories':
        $query = "
            SELECT s.id, s.user_id, s.type, s.content, s.background_color, s.created_at,
                   u.display_name, u.photo_url,
                   (SELECT COUNT(*) FROM story_likes sl WHERE sl.story_id = s.id) as like_count,
                   (SELECT COUNT(*) FROM story_comments sc WHERE sc.story_id = s.id) as comment_count,
                   (SELECT COUNT(*) FROM story_views sv WHERE sv.story_id = s.id) as view_count,
                   (SELECT COUNT(*) FROM story_likes sl2 WHERE sl2.story_id = s.id AND sl2.user_id = $current_user_id) as has_liked
            FROM stories s
            JOIN users u ON s.user_id = u.id
            WHERE s.expires_at > NOW()
            ORDER BY s.user_id, s.created_at ASC
        ";
        
        $result = $conn->query($query);
        $raw_stories = $result->fetch_all(MYSQLI_ASSOC);
        
        $grouped_stories = [];
        foreach ($raw_stories as $story) {
            $uid = $story['user_id'];
            if (!isset($grouped_stories[$uid])) {
                $grouped_stories[$uid] = [
                    'user_id' => $uid,
                    'display_name' => $story['display_name'],
                    'photo_url' => $story['photo_url'],
                    'items' => []
                ];
            }
            
            // Fetch comments (Limit 5)
            $comments_res = $conn->query("SELECT sc.comment, u.display_name FROM story_comments sc JOIN users u ON sc.user_id = u.id WHERE sc.story_id = {$story['id']} ORDER BY sc.created_at DESC LIMIT 5");
            $comments = $comments_res->fetch_all(MYSQLI_ASSOC);

            // Permission Check
            $can_delete = ($story['user_id'] == $current_user_id || $is_staff);

            $grouped_stories[$uid]['items'][] = [
                'id' => $story['id'],
                'type' => $story['type'],
                'content' => $story['content'],
                'bg_color' => $story['background_color'],
                'time' => date('h:i A', strtotime($story['created_at'])),
                'like_count' => $story['like_count'],
                'comment_count' => $story['comment_count'],
                'view_count' => $story['view_count'],
                'has_liked' => $story['has_liked'] > 0,
                'can_delete' => $can_delete,
                'comments' => $comments
            ];
        }

        $response = ['status' => 'success', 'stories' => array_values($grouped_stories)];
        break;

    case 'view_story':
        $story_id = (int)($_POST['story_id'] ?? 0);
        if($story_id > 0) {
            $conn->query("INSERT IGNORE INTO story_views (story_id, user_id) VALUES ($story_id, $current_user_id)");
            $response = ['status' => 'success'];
        }
        break;

    case 'like_story':
        $story_id = (int)($_POST['story_id'] ?? 0);
        if($story_id > 0) {
            $check = $conn->query("SELECT id FROM story_likes WHERE story_id = $story_id AND user_id = $current_user_id");
            if ($check->num_rows > 0) {
                $conn->query("DELETE FROM story_likes WHERE story_id = $story_id AND user_id = $current_user_id");
                $action_type = 'unliked';
            } else {
                $conn->query("INSERT INTO story_likes (story_id, user_id) VALUES ($story_id, $current_user_id)");
                $action_type = 'liked';
            }
            $new_count = $conn->query("SELECT COUNT(*) as c FROM story_likes WHERE story_id = $story_id")->fetch_assoc()['c'];
            $response = ['status' => 'success', 'action' => $action_type, 'count' => $new_count];
        }
        break;

    case 'comment_story':
        $story_id = (int)($_POST['story_id'] ?? 0);
        $comment = trim($_POST['comment'] ?? '');
        if ($story_id > 0 && !empty($comment)) {
            $stmt = $conn->prepare("INSERT INTO story_comments (story_id, user_id, comment) VALUES (?, ?, ?)");
            $stmt->bind_param("iis", $story_id, $current_user_id, $comment);
            $stmt->execute();
            $response = ['status' => 'success'];
        } else {
            $response['message'] = 'Invalid comment data.';
        }
        break;

    case 'share_story':
        $story_id = (int)($_POST['story_id'] ?? 0);
        $story_res = $conn->query("SELECT * FROM stories WHERE id = $story_id");
        if ($story_res->num_rows > 0) {
            $story = $story_res->fetch_assoc();
            
            // Shout Format for parsing later
            $shout_text = "Shared a story! [story:{$story_id}]";
            
            $stmt = $conn->prepare("INSERT INTO shouts (user_id, text) VALUES (?, ?)");
            $stmt->bind_param("is", $current_user_id, $shout_text);
            
            if($stmt->execute()) {
                $response = ['status' => 'success', 'message' => 'Story shared to Shoutbox!'];
            } else {
                $response['message'] = 'Failed to share.';
            }
        } else {
            $response['message'] = 'Story not found.';
        }
        break;
        
    case 'delete_story':
        $story_id = (int)($_POST['story_id'] ?? 0);
        $check = $conn->query("SELECT user_id FROM stories WHERE id = $story_id")->fetch_assoc();
        
        if ($check && ($check['user_id'] == $current_user_id || $is_staff)) {
            $conn->query("DELETE FROM stories WHERE id = $story_id");
            $response = ['status' => 'success', 'message' => 'Story deleted.'];
        } else {
            $response['message'] = 'Permission denied.';
        }
        break;
}
?>