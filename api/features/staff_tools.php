<?php
// api/features/staff_tools.php

if (!$is_staff) {
    $response['message'] = 'You do not have permission to view this page.';
    echo json_encode($response);
    exit;
}

// পাসওয়ার্ড এখানে সেট করা হয়েছে। আপনি চাইলে এটি পরিবর্তন করতে পারেন।
define('HIDDEN_STAFF_PASSWORD', 'ConnectBD@2024');

switch ($action) {
    case 'get_hidden_staff':
        if (!$is_admin) {
            $response['message'] = 'You do not have permission to view this page.';
            break;
        }
        $password = $_POST['password'] ?? '';
        if ($password !== HIDDEN_STAFF_PASSWORD) {
            $response['message'] = 'Incorrect password.';
            break;
        }
        $query = "SELECT id, display_name, role, last_seen FROM users WHERE display_role = 'Member' AND role != 'Member' ORDER BY FIELD(role, 'Admin', 'Senior Moderator', 'Moderator'), display_name ASC";
        $hidden_staff = $conn->query($query)->fetch_all(MYSQLI_ASSOC);
        $response = ['status' => 'success', 'hidden_staff' => $hidden_staff];
        break;

    case 'get_pending_transactions':
        $query = "
            SELECT t.*, u.display_name 
            FROM transactions t
            JOIN users u ON t.user_id = u.id
            WHERE t.status = 'pending'
            ORDER BY t.created_at ASC
        ";
        $transactions = $conn->query($query)->fetch_all(MYSQLI_ASSOC);
        $response = ['status' => 'success', 'transactions' => $transactions];
        break;

    case 'get_all_transactions':
        $page = (int)($_GET['page'] ?? 1);
        $limit = 15;
        $offset = ($page - 1) * $limit;

        $total_res = $conn->query("SELECT COUNT(id) as total FROM transactions");
        $total_items = $total_res->fetch_assoc()['total'];
        $total_pages = ceil($total_items / $limit);

        $query = "SELECT t.*, u.display_name FROM transactions t JOIN users u ON t.user_id = u.id ORDER BY t.created_at DESC LIMIT ? OFFSET ?";
        $stmt = $conn->prepare($query);
        $stmt->bind_param("ii", $limit, $offset);
        $stmt->execute();
        $transactions = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        
        $response = ['status' => 'success', 'transactions' => $transactions, 'pagination' => ['currentPage' => $page, 'totalPages' => $total_pages]];
        break;

    case 'update_transaction_status':
        if (!$is_admin) {
            $response['message'] = 'You do not have permission to perform this action.';
            break;
        }
        $transaction_id = (int)($_POST['transaction_id'] ?? 0);
        $new_status = $_POST['new_status'] ?? '';
        if ($transaction_id > 0 && in_array($new_status, ['approved', 'rejected'])) {
            $tran_stmt = $conn->prepare("SELECT * FROM transactions WHERE id = ? AND status = 'pending'");
            $tran_stmt->bind_param("i", $transaction_id);
            $tran_stmt->execute();
            $transaction = $tran_stmt->get_result()->fetch_assoc();
            if ($transaction) {
                $conn->begin_transaction();
                try {
                    if ($new_status === 'approved' && $transaction['type'] === 'Recharge') {
                        $conn->query("UPDATE users SET balance = balance + {$transaction['amount']} WHERE id = {$transaction['user_id']}");
                    }
                    if ($new_status === 'rejected' && $transaction['type'] === 'Withdrawal') {
                        $conn->query("UPDATE users SET balance = balance + {$transaction['amount']} WHERE id = {$transaction['user_id']}");
                    }
                    $update_stmt = $conn->prepare("UPDATE transactions SET status = ?, updated_by = ? WHERE id = ?");
                    $update_stmt->bind_param("sii", $new_status, $current_user_id, $transaction_id);
                    $update_stmt->execute();
                    $conn->commit();
                    $response = ['status' => 'success', 'message' => 'Transaction updated successfully.'];
                } catch (Exception $e) {
                    $conn->rollback();
                    $response['message'] = 'Transaction could not be updated due to an error.';
                }
            } else {
                $response['message'] = 'Transaction not found or is no longer pending.';
            }
        } else {
            $response['message'] = 'Invalid data.';
        }
        break;
        
    case 'get_pending_archives':
        $query = "SELECT a.*, u.display_name FROM archives a JOIN users u ON a.user_id = u.id WHERE a.status = 'pending' ORDER BY a.created_at ASC";
        $archives = $conn->query($query)->fetch_all(MYSQLI_ASSOC);
        $response = ['status' => 'success', 'archives' => $archives];
        break;
        
    case 'update_archive_status':
        $archive_id = (int)($_POST['archive_id'] ?? 0);
        $new_status = $_POST['new_status'] ?? '';
        if ($archive_id > 0 && in_array($new_status, ['approved', 'rejected'])) {
            if ($new_status === 'rejected') {
                $conn->query("DELETE FROM archives WHERE id = $archive_id");
                $response = ['status' => 'success', 'message' => 'Archive rejected and deleted.'];
            } else {
                $stmt = $conn->prepare("UPDATE archives SET status = ? WHERE id = ?");
                $stmt->bind_param("si", $new_status, $archive_id);
                $stmt->execute();
                $response = ['status' => 'success', 'message' => 'Archive approved.'];
            }
        } else {
            $response['message'] = 'Invalid data.';
        }
        break;

    case 'get_all_users_for_staff':
        $search_term = $_GET['search'] ?? '';
        $query = "SELECT id, display_name, email, role, created_at, last_seen FROM users";
        if (!empty($search_term)) {
            $query .= " WHERE display_name LIKE ? OR email LIKE ?";
            $search_param = "%" . $search_term . "%";
            $stmt = $conn->prepare($query);
            $stmt->bind_param("ss", $search_param, $search_param);
        } else {
            $query .= " ORDER BY id DESC LIMIT 50";
            $stmt = $conn->prepare($query);
        }
        $stmt->execute();
        $users = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        $response = ['status' => 'success', 'users' => $users];
        break;
        
    case 'get_all_shouts':
        $page = (int)($_GET['page'] ?? 1);
        $limit = 20;
        $offset = ($page - 1) * $limit;
        $total_res = $conn->query("SELECT COUNT(id) as total FROM shouts");
        $total_shouts = $total_res->fetch_assoc()['total'];
        $total_pages = ceil($total_shouts / $limit);
        $query = "SELECT s.id, s.text, s.created_at, u.display_name, u.id as user_id FROM shouts s JOIN users u ON s.user_id = u.id ORDER BY s.id DESC LIMIT ? OFFSET ?";
        $stmt = $conn->prepare($query);
        $stmt->bind_param("ii", $limit, $offset);
        $stmt->execute();
        $shouts = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        $response = ['status' => 'success', 'shouts' => $shouts, 'pagination' => ['currentPage' => $page, 'totalPages' => $total_pages]];
        break;
        
    case 'delete_shout_staff':
        $shout_id = (int)($_POST['shout_id'] ?? 0);
        if ($shout_id > 0) {
            $conn->query("DELETE FROM shout_reactions WHERE shout_id = $shout_id");
            $conn->query("DELETE FROM shouts WHERE id = $shout_id");
            $response = ['status' => 'success', 'message' => 'Shout has been deleted.'];
        } else {
            $response['message'] = 'Invalid shout ID.';
        }
        break;

    case 'get_user_content':
        $user_id = (int)($_GET['user_id'] ?? 0);
        $content_type = $_GET['type'] ?? '';
        if ($user_id > 0) {
            $content = [];
            if ($content_type === 'shouts') {
                $content = $conn->query("SELECT id, text, created_at FROM shouts WHERE user_id = $user_id ORDER BY id DESC")->fetch_all(MYSQLI_ASSOC);
            } elseif ($content_type === 'topics') {
                $content = $conn->query("SELECT id, title, created_at FROM topics WHERE user_id = $user_id ORDER BY id DESC")->fetch_all(MYSQLI_ASSOC);
            } elseif ($content_type === 'archives') {
                $content = $conn->query("SELECT id, title, category, status, created_at FROM archives WHERE user_id = $user_id ORDER BY id DESC")->fetch_all(MYSQLI_ASSOC);
            }
            $response = ['status' => 'success', 'content' => $content];
        } else {
            $response['message'] = 'Invalid user ID.';
        }
        break;
        
    case 'get_all_topics_staff':
        $page = (int)($_GET['page'] ?? 1);
        $limit = 20;
        $offset = ($page - 1) * $limit;
        $total_res = $conn->query("SELECT COUNT(id) as total FROM topics");
        $total_topics = $total_res->fetch_assoc()['total'];
        $total_pages = ceil($total_topics / $limit);
        $query = "SELECT t.id, t.title, u.display_name, u.id as user_id, t.created_at FROM topics t JOIN users u ON t.user_id = u.id ORDER BY t.id DESC LIMIT ? OFFSET ?";
        $stmt = $conn->prepare($query);
        $stmt->bind_param("ii", $limit, $offset);
        $stmt->execute();
        $topics = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        $response = ['status' => 'success', 'topics' => $topics, 'pagination' => ['currentPage' => $page, 'totalPages' => $total_pages]];
        break;

    case 'get_all_archives_staff':
        $page = (int)($_GET['page'] ?? 1);
        $limit = 20;
        $offset = ($page - 1) * $limit;
        $total_res = $conn->query("SELECT COUNT(id) as total FROM archives");
        $total_archives = $total_res->fetch_assoc()['total'];
        $total_pages = ceil($total_archives / $limit);
        $query = "SELECT a.id, a.title, a.category, a.status, u.display_name, u.id as user_id, a.created_at FROM archives a JOIN users u ON a.user_id = u.id ORDER BY a.id DESC LIMIT ? OFFSET ?";
        $stmt = $conn->prepare($query);
        $stmt->bind_param("ii", $limit, $offset);
        $stmt->execute();
        $archives = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        $response = ['status' => 'success', 'archives' => $archives, 'pagination' => ['currentPage' => $page, 'totalPages' => $total_pages]];
        break;
}
?>