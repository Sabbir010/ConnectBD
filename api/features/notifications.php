<?php
// api/features/notifications.php

if (!$current_user_id) {
    $response['message'] = 'You must be logged in.';
    echo json_encode($response);
    exit;
}

switch ($action) {
    case 'get_notifications':
        $page = (int)($_GET['page'] ?? 1);
        $limit = 15;
        $offset = ($page - 1) * $limit;

        // Count total notifications
        $count_stmt = $conn->prepare("SELECT COUNT(id) as total FROM notifications WHERE user_id = ?");
        $count_stmt->bind_param("i", $current_user_id);
        $count_stmt->execute();
        $total_notifications = $count_stmt->get_result()->fetch_assoc()['total'];
        $total_pages = ceil($total_notifications / $limit);

        // Fetch paginated notifications
        $stmt = $conn->prepare("SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?");
        $stmt->bind_param("iii", $current_user_id, $limit, $offset);
        $stmt->execute();
        $notifications = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

        $pagination_data = ['currentPage' => $page, 'totalPages' => $total_pages];
        $response = ['status' => 'success', 'notifications' => $notifications, 'pagination' => $pagination_data];
        break;

    case 'mark_notifications_read':
        $stmt = $conn->prepare("UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0");
        $stmt->bind_param("i", $current_user_id);
        if ($stmt->execute()) {
            $response = ['status' => 'success'];
        } else {
            $response['message'] = 'Failed to mark notifications as read.';
        }
        break;
    
    case 'get_unread_notification_count':
        $stmt = $conn->prepare("SELECT COUNT(id) as unread_count FROM notifications WHERE user_id = ? AND is_read = 0");
        $stmt->bind_param("i", $current_user_id);
        $stmt->execute();
        $result = $stmt->get_result()->fetch_assoc();
        $response = ['status' => 'success', 'unread_count' => $result['unread_count']];
        break;
}
?>