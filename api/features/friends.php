<?php
// api/features/friends.php

if (!$current_user_id) {
    $response['message'] = 'You must be logged in.';
    echo json_encode($response);
    exit;
}

switch ($action) {
    case 'send_friend_request':
        $friend_id = (int)($_POST['user_id'] ?? 0);
        if ($friend_id > 0 && $friend_id != $current_user_id) {
            $user1 = min($current_user_id, $friend_id);
            $user2 = max($current_user_id, $friend_id);

            $stmt = $conn->prepare("INSERT INTO friends (user_one_id, user_two_id, action_user_id, status) VALUES (?, ?, ?, 0) ON DUPLICATE KEY UPDATE status=0, action_user_id=?");
            $stmt->bind_param("iiii", $user1, $user2, $current_user_id, $current_user_id);
            
            if ($stmt->execute()) {
                $response = ['status' => 'success', 'message' => 'Friend request sent.'];

                $sender_res = $conn->query("SELECT display_name FROM users WHERE id = $current_user_id");
                $sender_name = $sender_res->fetch_assoc()['display_name'];
                
                $message = "<b>" . htmlspecialchars($sender_name) . "</b> has sent you a friend request. <br><br>" .
                           "<a href='/user_profile/{$current_user_id}' class='pm-button pm-button-view'>View Profile</a> " .
                           "<a href='#' class='pm-button pm-button-accept friend-action-pm' data-user-id='{$current_user_id}' data-action='accept_friend_request'>Accept</a> " .
                           "<a href='#' class='pm-button pm-button-reject friend-action-pm' data-user-id='{$current_user_id}' data-action='cancel_or_unfriend'>Reject</a>";
                sendSystemPM($conn, $friend_id, $message);

            } else {
                $response['message'] = 'Failed to send request.';
            }
        } else {
            $response['message'] = 'Invalid user.';
        }
        break;

    case 'accept_friend_request':
        $friend_id = (int)($_POST['user_id'] ?? 0);
        if ($friend_id > 0) {
            $user1 = min($current_user_id, $friend_id);
            $user2 = max($current_user_id, $friend_id);
            $stmt = $conn->prepare("UPDATE friends SET status = 1, action_user_id = ? WHERE user_one_id = ? AND user_two_id = ? AND status = 0 AND action_user_id != ?");
            $stmt->bind_param("iiii", $current_user_id, $user1, $user2, $current_user_id);
            if ($stmt->execute()) {
                $response = ['status' => 'success', 'message' => 'Friend request accepted.'];
            } else {
                $response['message'] = 'Failed to accept request.';
            }
        } else {
            $response['message'] = 'Invalid user.';
        }
        break;

    case 'cancel_or_unfriend':
        $friend_id = (int)($_POST['user_id'] ?? 0);
        if ($friend_id > 0) {
            $user1 = min($current_user_id, $friend_id);
            $user2 = max($current_user_id, $friend_id);
            $stmt = $conn->prepare("DELETE FROM friends WHERE user_one_id = ? AND user_two_id = ?");
            $stmt->bind_param("ii", $user1, $user2);
            if ($stmt->execute()) {
                $response = ['status' => 'success', 'message' => 'Action successful.'];
            } else {
                $response['message'] = 'Failed to perform action.';
            }
        } else {
            $response['message'] = 'Invalid user.';
        }
        break;

    case 'get_friends_list':
        $friends_query = "
            SELECT u.id, u.display_name, u.photo_url, u.last_seen, u.last_activity, NOW() as server_time,
                   (TIMESTAMPDIFF(SECOND, u.last_seen, NOW()) < 300) as is_online
            FROM friends f
            JOIN users u ON u.id = IF(f.user_one_id = ?, f.user_two_id, f.user_one_id)
            WHERE (f.user_one_id = ? OR f.user_two_id = ?) AND f.status = 1
            ORDER BY is_online DESC, u.display_name ASC
        ";
        $stmt_friends = $conn->prepare($friends_query);
        $stmt_friends->bind_param("iii", $current_user_id, $current_user_id, $current_user_id);
        $stmt_friends->execute();
        $friends = $stmt_friends->get_result()->fetch_all(MYSQLI_ASSOC);

        $pending_query = "
            SELECT u.id, u.display_name, u.photo_url
            FROM friends f
            JOIN users u ON u.id = f.action_user_id
            WHERE (f.user_one_id = ? OR f.user_two_id = ?) AND f.status = 0 AND f.action_user_id != ?
        ";
        $stmt_pending = $conn->prepare($pending_query);
        $stmt_pending->bind_param("iii", $current_user_id, $current_user_id, $current_user_id);
        $stmt_pending->execute();
        $pending_requests = $stmt_pending->get_result()->fetch_all(MYSQLI_ASSOC);

        $response = ['status' => 'success', 'friends' => $friends, 'pending_requests' => $pending_requests];
        break;
}
?>