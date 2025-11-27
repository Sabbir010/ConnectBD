<?php
// api/features/quizzes.php

if (!$current_user_id) {
    $response['message'] = 'You must be logged in.';
    echo json_encode($response);
    exit;
}

switch ($action) {
    case 'get_quiz_counts':
        $total_quizzes = $conn->query("SELECT COUNT(id) as count FROM quizzes")->fetch_assoc()['count'];
        $open_quizzes = $conn->query("SELECT COUNT(id) as count FROM quizzes WHERE status = 'open'")->fetch_assoc()['count'];
        $response = ['status' => 'success', 'counts' => ['open' => $open_quizzes, 'total' => $total_quizzes]];
        break;

    case 'get_open_quizzes_announcement':
        $query = "SELECT id, quiz_title FROM quizzes WHERE status = 'open' ORDER BY is_pinned DESC, updated_at DESC";
        $open_quizzes = $conn->query($query)->fetch_all(MYSQLI_ASSOC);
        $response = ['status' => 'success', 'open_quizzes' => $open_quizzes];
        break;

    case 'get_all_quizzes':
        $query = "SELECT q.*, t.title as topic_title FROM quizzes q LEFT JOIN topics t ON q.topic_id = t.id ORDER BY q.is_pinned DESC, q.status ASC, q.updated_at DESC";
        $quizzes = $conn->query($query)->fetch_all(MYSQLI_ASSOC);
        $response = ['status' => 'success', 'quizzes' => $quizzes];
        break;

    case 'get_quiz_details':
        if (!$is_staff) { $response['message'] = 'Permission denied.'; break; }
        $quiz_id = (int)($_GET['id'] ?? 0);
        if ($quiz_id > 0) {
            $stmt = $conn->prepare("SELECT * FROM quizzes WHERE id = ?");
            $stmt->bind_param("i", $quiz_id);
            $stmt->execute();
            $quiz = $stmt->get_result()->fetch_assoc();
            $response = $quiz ? ['status' => 'success', 'quiz' => $quiz] : ['message' => 'Quiz not found.'];
        } else {
            $response['message'] = 'Invalid Quiz ID.';
        }
        break;

    case 'add_quiz':
        if (!$is_staff) { $response['message'] = 'Permission denied.'; break; }
        $topic_id = (int)($_POST['topic_id'] ?? 0);
        $quiz_title = trim($_POST['quiz_title'] ?? '');
        $host = trim($_POST['host'] ?? '');
        $description = trim($_POST['description'] ?? '');
        $status = $_POST['status'] ?? 'open';

        if ($topic_id > 0 && !empty($quiz_title) && !empty($host)) {
            $stmt = $conn->prepare("INSERT INTO quizzes (topic_id, quiz_title, host, description, status, created_by) VALUES (?, ?, ?, ?, ?, ?)");
            $stmt->bind_param("issssi", $topic_id, $quiz_title, $host, $description, $status, $current_user_id);
            if ($stmt->execute()) {
                $response = ['status' => 'success', 'message' => 'Quiz added successfully.'];
            } else {
                $response['message'] = 'Failed to add quiz.';
            }
        } else {
            $response['message'] = 'Please fill all required fields.';
        }
        break;

    case 'edit_quiz':
        if (!$is_staff) { $response['message'] = 'Permission denied.'; break; }
        $quiz_id = (int)($_POST['id'] ?? 0);
        $topic_id = (int)($_POST['topic_id'] ?? 0);
        $quiz_title = trim($_POST['quiz_title'] ?? '');
        $host = trim($_POST['host'] ?? '');
        $description = trim($_POST['description'] ?? '');
        $status = $_POST['status'] ?? 'open';

        if ($quiz_id > 0 && $topic_id > 0 && !empty($quiz_title) && !empty($host)) {
            $stmt = $conn->prepare("UPDATE quizzes SET topic_id = ?, quiz_title = ?, host = ?, description = ?, status = ? WHERE id = ?");
            $stmt->bind_param("issssi", $topic_id, $quiz_title, $host, $description, $status, $quiz_id);
            if ($stmt->execute()) {
                $response = ['status' => 'success', 'message' => 'Quiz updated successfully.'];
            } else {
                $response['message'] = 'Failed to update quiz.';
            }
        } else {
            $response['message'] = 'Please fill all required fields.';
        }
        break;
        
    case 'toggle_quiz_status':
        if (!$is_staff) { $response['message'] = 'Permission denied.'; break; }
        $quiz_id = (int)($_POST['id'] ?? 0);
        if ($quiz_id > 0) {
            $conn->query("UPDATE quizzes SET status = IF(status='open', 'closed', 'open') WHERE id = $quiz_id");
            $response = ['status' => 'success'];
        }
        break;

    case 'toggle_quiz_pin':
        if (!$is_staff) { $response['message'] = 'Permission denied.'; break; }
        $quiz_id = (int)($_POST['id'] ?? 0);
        if ($quiz_id > 0) {
            $conn->query("UPDATE quizzes SET is_pinned = !is_pinned WHERE id = $quiz_id");
            $response = ['status' => 'success'];
        }
        break;
        
    case 'delete_quiz':
        if (!$is_staff) { $response['message'] = 'Permission denied.'; break; }
        $quiz_id = (int)($_POST['id'] ?? 0);
        if ($quiz_id > 0) {
            $conn->query("DELETE FROM quizzes WHERE id = $quiz_id");
            $response = ['status' => 'success'];
        }
        break;
}
?>