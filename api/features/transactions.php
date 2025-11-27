<?php
// api/features/transactions.php

switch ($action) {
    case 'request_recharge':
        if (!$current_user_id) { $response['message'] = 'You must be logged in to make a request.'; break; }
        
        $amount = (float)($_POST['amount'] ?? 0);
        $method = trim($_POST['method'] ?? '');
        $trx_id = trim($_POST['trx_id'] ?? '');

        if ($amount > 0 && !empty($method) && !empty($trx_id)) {
            $details = "Transaction ID: " . $trx_id;
            $stmt = $conn->prepare("INSERT INTO transactions (user_id, type, amount, method, details) VALUES (?, 'Recharge', ?, ?, ?)");
            $stmt->bind_param("idss", $current_user_id, $amount, $method, $details);
            if ($stmt->execute()) {
                $response = ['status' => 'success', 'message' => 'Your recharge request has been received. Your balance will be updated after admin review.'];
            } else {
                $response['message'] = 'Failed to send your request.';
            }
        } else {
            $response['message'] = 'Please fill in all fields correctly.';
        }
        break;

    case 'request_withdrawal':
        if (!$current_user_id) { $response['message'] = 'You must be logged in to make a request.'; break; }

        $amount = (float)($_POST['amount'] ?? 0);
        $method = trim($_POST['method'] ?? '');
        $account_number = trim($_POST['account_number'] ?? '');

        $user_stmt = $conn->prepare("SELECT balance FROM users WHERE id = ?");
        $user_stmt->bind_param("i", $current_user_id);
        $user_stmt->execute();
        $user_balance = $user_stmt->get_result()->fetch_assoc()['balance'];

        if ($amount > 0 && $amount <= $user_balance && !empty($method) && !empty($account_number)) {
            $details = "Account Number: " . $account_number;
            $stmt = $conn->prepare("INSERT INTO transactions (user_id, type, amount, method, details) VALUES (?, 'Withdrawal', ?, ?, ?)");
            $stmt->bind_param("idss", $current_user_id, $amount, $method, $details);
            if ($stmt->execute()) {
                $conn->query("UPDATE users SET balance = balance - $amount WHERE id = $current_user_id");
                $response = ['status' => 'success', 'message' => 'Your withdrawal request has been received. The funds will be sent to your account shortly.'];
            } else {
                $response['message'] = 'Failed to send your request.';
            }
        } else {
            $response['message'] = 'Invalid amount or insufficient balance.';
        }
        break;
}
?>