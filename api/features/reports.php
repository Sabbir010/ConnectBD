<?php
// api/features/reports.php

if (!$current_user_id) {
    $response['message'] = 'You must be logged in.';
    echo json_encode($response);
    exit;
}

switch($action) {
    case 'submit_report':
        $type = $_POST['type'] ?? null;
        $id = (int)($_POST['id'] ?? 0);
        $reason = trim($_POST['reason'] ?? '');
        $allowed_types = ['shout', 'user', 'topic', 'archive', 'topic_reply', 'archive_reply'];

        if (!in_array($type, $allowed_types)) {
            $response['message'] = "Invalid report type provided: '{$type}'";
        } elseif ($id <= 0) {
            $response['message'] = "Invalid content ID provided: '{$id}'";
        } elseif (empty($reason)) {
            $response['message'] = "Reason for reporting cannot be empty.";
        } else {
            $stmt = $conn->prepare("INSERT INTO reports (reporter_id, content_type, content_id, reason) VALUES (?, ?, ?, ?)");
            $stmt->bind_param("isis", $current_user_id, $type, $id, $reason);
            if ($stmt->execute()) {
                $response = ['status' => 'success', 'message' => 'Report submitted successfully. Our staff will review it shortly.'];
            } else {
                $response['message'] = 'Failed to submit report. It\'s possible you have already reported this content.';
            }
        }
        break;

    case 'get_reports':
        if (!$is_staff) { $response['message'] = 'You do not have permission.'; break; }
        
        $query = "
            SELECT 
                r.id, r.content_type, r.content_id, r.reason, r.created_at, 
                reporter.display_name as reporter_name,
                reporter.capitalized_username as reporter_capitalized_username,
                reporter.capitalization_expires_at as reporter_expires_at,
                r.reporter_id,
                CASE
                    WHEN r.content_type = 'shout' THEN s.text
                    WHEN r.content_type = 'user' THEN reported_user.display_name
                    WHEN r.content_type = 'topic' THEN t.title
                    WHEN r.content_type = 'archive' THEN a.title
                    WHEN r.content_type = 'topic_reply' THEN tr.content
                    WHEN r.content_type = 'archive_reply' THEN ar.content
                    ELSE ''
                END as content_preview,
                CASE
                    WHEN r.content_type = 'shout' THEN s.user_id
                    WHEN r.content_type = 'user' THEN reported_user.id
                    WHEN r.content_type = 'topic' THEN t.user_id
                    WHEN r.content_type = 'archive' THEN a.user_id
                    WHEN r.content_type = 'topic_reply' THEN tr.user_id
                    WHEN r.content_type = 'archive_reply' THEN ar.user_id
                    ELSE NULL
                END as content_owner_id
            FROM reports r
            JOIN users reporter ON r.reporter_id = reporter.id
            LEFT JOIN shouts s ON r.content_type = 'shout' AND r.content_id = s.id
            LEFT JOIN users reported_user ON r.content_type = 'user' AND r.content_id = reported_user.id
            LEFT JOIN topics t ON r.content_type = 'topic' AND r.content_id = t.id
            LEFT JOIN archives a ON r.content_type = 'archive' AND r.content_id = a.id
            LEFT JOIN topic_replies tr ON r.content_type = 'topic_reply' AND r.content_id = tr.id
            LEFT JOIN archive_replies ar ON r.content_type = 'archive_reply' AND r.content_id = ar.id
            WHERE r.status = 'pending'
            ORDER BY r.created_at DESC
        ";
        $reports = $conn->query($query)->fetch_all(MYSQLI_ASSOC);

        foreach($reports as &$report) {
            if (isset($report['reporter_capitalized_username']) && (!isset($report['reporter_expires_at']) || new DateTime() < new DateTime($report['reporter_expires_at']))) {
                $report['reporter_name'] = $report['reporter_capitalized_username'];
            }
        }

        $response = ['status' => 'success', 'reports' => $reports];
        break;

    case 'update_report_status':
        if (!$is_staff) { $response['message'] = 'You do not have permission.'; break; }
        
        $report_id = (int)($_POST['report_id'] ?? 0);
        $new_status = $_POST['new_status'] ?? '';
        
        if ($report_id > 0 && in_array($new_status, ['resolved', 'dismissed'])) {
            $stmt = $conn->prepare("UPDATE reports SET status = ?, resolved_by = ? WHERE id = ?");
            $stmt->bind_param("sii", $new_status, $current_user_id, $report_id);
            if ($stmt->execute()) {
                $response = ['status' => 'success', 'message' => 'Report status updated.'];
            } else {
                $response['message'] = 'Failed to update status.';
            }
        } else {
            $response['message'] = 'Invalid data.';
        }
        break;

    case 'get_report_logs':
        if (!$is_staff) { $response['message'] = 'You do not have permission.'; break; }

        $query = "
            SELECT 
                r.id, r.content_type, r.content_id, r.reason, r.status, r.created_at, 
                reporter.display_name as reporter_name,
                reporter.capitalized_username as reporter_capitalized_username,
                reporter.capitalization_expires_at as reporter_expires_at,
                resolver.display_name as resolver_name,
                resolver.capitalized_username as resolver_capitalized_username,
                resolver.capitalization_expires_at as resolver_expires_at,
                CASE
                    WHEN r.content_type = 'shout' THEN s.text
                    WHEN r.content_type = 'user' THEN reported_user.display_name
                    WHEN r.content_type = 'topic' THEN t.title
                    WHEN r.content_type = 'archive' THEN a.title
                    WHEN r.content_type = 'topic_reply' THEN tr.content
                    WHEN r.content_type = 'archive_reply' THEN ar.content
                    ELSE ''
                END as content_preview
            FROM reports r
            JOIN users reporter ON r.reporter_id = reporter.id
            LEFT JOIN users resolver ON r.resolved_by = resolver.id
            LEFT JOIN shouts s ON r.content_type = 'shout' AND r.content_id = s.id
            LEFT JOIN users reported_user ON r.content_type = 'user' AND r.content_id = reported_user.id
            LEFT JOIN topics t ON r.content_type = 'topic' AND r.content_id = t.id
            LEFT JOIN archives a ON r.content_type = 'archive' AND r.content_id = a.id
            LEFT JOIN topic_replies tr ON r.content_type = 'topic_reply' AND r.content_id = tr.id
            LEFT JOIN archive_replies ar ON r.content_type = 'archive_reply' AND r.content_id = ar.id
            WHERE r.status != 'pending'
            ORDER BY r.created_at DESC
            LIMIT 100
        ";
        $logs = $conn->query($query)->fetch_all(MYSQLI_ASSOC);

        foreach($logs as &$log) {
            if (isset($log['reporter_capitalized_username']) && (!isset($log['reporter_expires_at']) || new DateTime() < new DateTime($log['reporter_expires_at']))) {
                $log['reporter_name'] = $log['reporter_capitalized_username'];
            }
            if (isset($log['resolver_capitalized_username']) && (!isset($log['resolver_expires_at']) || new DateTime() < new DateTime($log['resolver_expires_at']))) {
                $log['resolver_name'] = $log['resolver_capitalized_username'];
            }
        }

        $response = ['status' => 'success', 'logs' => $logs];
        break;
}
?>