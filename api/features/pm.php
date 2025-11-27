<?php
// api/features/pm.php

switch ($action) {
    case 'send_pm':
        if (!$current_user_id) { $response['message'] = 'You must be logged in to send messages.'; break; }

        $user_perm_stmt = $conn->prepare("SELECT can_pm FROM users WHERE id = ?");
        $user_perm_stmt->bind_param("i", $current_user_id);
        $user_perm_stmt->execute();
        $user_perm = $user_perm_stmt->get_result()->fetch_assoc();
        if (!$user_perm || $user_perm['can_pm'] == 0) {
            $response['message'] = 'You do not have permission to send private messages.';
            break;
        }
        
        $receiver_id = (int)($_POST['receiver_id'] ?? 0);
        $message = trim($_POST['message'] ?? '');

        if ($receiver_id > 0 && !empty($message) && $receiver_id != $current_user_id) {
            $stmt = $conn->prepare("INSERT INTO private_messages (sender_id, receiver_id, message) VALUES (?, ?, ?)");
            $stmt->bind_param("iis", $current_user_id, $receiver_id, $message);
            
            if ($stmt->execute()) {
                $response = ['status' => 'success', 'message' => 'Message sent successfully.'];

                if ($receiver_id == SYSTEM_USER_ID) {
                    $pattern = '/^(\/imagine|\/create|\/draw)\s+(.+)/i';
                    
                    if (preg_match($pattern, $message, $matches)) {
                        $user_prompt = $matches[2];
                        $queue_stmt = $conn->prepare("INSERT INTO image_generation_queue (user_id, prompt) VALUES (?, ?)");
                        $queue_stmt->bind_param("is", $current_user_id, $user_prompt);
                        $queue_stmt->execute();
                        $confirmation_msg = "আপনার ছবি তৈরির অনুরোধটি গ্রহণ করা হয়েছে। ছবিটি তৈরি হতে ৫-৭ মিনিট সময় লাগতে পারে। তৈরি হয়ে গেলে আপনাকে একটি নতুন বার্তায় ছবিটি পাঠানো হবে।";
                        sendSystemPM($conn, $current_user_id, $confirmation_msg);

                    } else {
                        $ai_response = callGeminiAPI($message);
                        sendSystemPM($conn, $current_user_id, $ai_response);
                    }
                }
            } else {
                $response['message'] = 'Failed to send message. DB Error: ' . $stmt->error;
            }
        } else {
            $error_details = "receiver_id: {$receiver_id}, sender_id: {$current_user_id}, message_empty: " . (empty($message) ? 'Yes' : 'No');
            $response['message'] = "Invalid data provided. Details: [{$error_details}]";
        }
        break;

    case 'get_inbox':
        if (!$current_user_id) { $response['message'] = 'You must be logged in to view your inbox.'; break; }

        $page = (int)($_GET['page'] ?? 1);
        $limit = 10;
        $offset = ($page - 1) * $limit;

        $count_stmt = $conn->prepare("
            SELECT COUNT(*) as total FROM (
                SELECT LEAST(sender_id, receiver_id) as user1, GREATEST(sender_id, receiver_id) as user2
                FROM private_messages
                WHERE sender_id = ? OR receiver_id = ?
                GROUP BY user1, user2
            ) as conversations
        ");
        $count_stmt->bind_param("ii", $current_user_id, $current_user_id);
        $count_stmt->execute();
        $total_conversations = $count_stmt->get_result()->fetch_assoc()['total'];
        $total_pages = ceil($total_conversations / $limit);

        $query = "
            SELECT pm.*, u.display_name, u.photo_url FROM private_messages pm
            JOIN (
                SELECT LEAST(sender_id, receiver_id) as user1, GREATEST(sender_id, receiver_id) as user2, MAX(id) as max_id
                FROM private_messages
                WHERE sender_id = ? OR receiver_id = ?
                GROUP BY user1, user2
            ) max_pm ON pm.id = max_pm.max_id
            JOIN users u ON u.id = IF(pm.sender_id = ?, pm.receiver_id, pm.sender_id)
            ORDER BY pm.created_at DESC
            LIMIT ? OFFSET ?
        ";
        
        $stmt = $conn->prepare($query);
        $stmt->bind_param("iiiii", $current_user_id, $current_user_id, $current_user_id, $limit, $offset);
        $stmt->execute();
        $conversations = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

        $pagination_data = ['currentPage' => $page, 'totalPages' => $total_pages];
        $response = ['status' => 'success', 'conversations' => $conversations, 'pagination' => $pagination_data];
        break;

    case 'get_conversation':
        if (!$current_user_id) { $response['message'] = 'You must be logged in to view a conversation.'; break; }
        $other_user_id = (int)($_GET['with_user_id'] ?? 0);

        if ($other_user_id > 0) {
            $conn->query("UPDATE private_messages SET is_read = 1 WHERE sender_id = $other_user_id AND receiver_id = $current_user_id");

            $limit = 10;
            
            $count_stmt = $conn->prepare("SELECT COUNT(id) as total FROM private_messages WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)");
            $count_stmt->bind_param("iiii", $current_user_id, $other_user_id, $other_user_id, $current_user_id);
            $count_stmt->execute();
            $total_messages = $count_stmt->get_result()->fetch_assoc()['total'];
            $total_pages = ceil($total_messages / $limit);

            $page = (int)($_GET['page'] ?? $total_pages);
            if ($page < 1) $page = 1;
            if ($page > $total_pages) $page = $total_pages;

            $offset = ($page - 1) * $limit;

            $stmt = $conn->prepare("
                SELECT pm.*, u.display_name, u.photo_url 
                FROM private_messages pm
                JOIN users u ON pm.sender_id = u.id
                WHERE (pm.sender_id = ? AND pm.receiver_id = ?) OR (pm.sender_id = ? AND pm.receiver_id = ?)
                ORDER BY pm.created_at ASC
                LIMIT ? OFFSET ?
            ");
            $stmt->bind_param("iiiiii", $current_user_id, $other_user_id, $other_user_id, $current_user_id, $limit, $offset);
            $stmt->execute();
            $messages = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
            
            $pagination_data = ['currentPage' => $page, 'totalPages' => $total_pages];
            $response = ['status' => 'success', 'messages' => $messages, 'pagination' => $pagination_data];
        } else {
             $response['message'] = 'Invalid user.';
        }
        break;
        
    case 'get_latest_pm':
        if (!$current_user_id) { $response = ['status' => 'error']; break; }
        
        $stmt = $conn->prepare("
            SELECT pm.sender_id, u.display_name 
            FROM private_messages pm
            JOIN users u ON pm.sender_id = u.id
            WHERE pm.receiver_id = ? AND pm.is_read = 0
            ORDER BY pm.created_at DESC
            LIMIT 1
        ");
        $stmt->bind_param("i", $current_user_id);
        $stmt->execute();
        $latest_pm = $stmt->get_result()->fetch_assoc();
        
        $response = ['status' => 'success', 'latest_pm' => $latest_pm];
        break;
}
?>