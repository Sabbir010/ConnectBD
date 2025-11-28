<?php
// api/features/username_shop.php

if (!$current_user_id) {
    $response['message'] = 'You must be logged in.';
    echo json_encode($response);
    exit;
}

function get_user_status($conn, $user_id) {
    $stmt = $conn->prepare("SELECT is_premium, premium_expires_at, is_verified FROM users WHERE id = ?");
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $user = $stmt->get_result()->fetch_assoc();

    if ($user) {
        if ($user['is_verified']) return 'verified';
        if ($user['is_premium'] && $user['premium_expires_at'] && new DateTime() < new DateTime($user['premium_expires_at'])) return 'premium';
    }
    return 'normal';
}

function get_costs($user_status) {
    $costs = [
        'permanent' => ['normal' => 25, 'premium' => 20, 'verified' => 15],
        'monthly' => ['normal' => 25, 'premium' => 20, 'verified' => 15],
        'yearly' => ['normal' => 240, 'premium' => 200, 'verified' => 180],
        'color' => [
            'balance' => ['normal' => 30, 'premium' => 15, 'verified' => 0],
            'gold' => ['normal' => 200, 'premium' => 100, 'verified' => 0]
        ]
    ];
    return [
        'permanent' => $costs['permanent'][$user_status],
        'monthly' => $costs['monthly'][$user_status],
        'yearly' => $costs['yearly'][$user_status],
        'color_balance' => $costs['color']['balance'][$user_status],
        'color_gold' => $costs['color']['gold'][$user_status]
    ];
}

switch ($action) {
    case 'get_username_shop_info':
        $user_status = get_user_status($conn, $current_user_id);
        $costs = get_costs($user_status);
        
        $user_res = $conn->query("SELECT display_name FROM users WHERE id = $current_user_id");
        $user = $user_res->fetch_assoc();

        if ($user) {
            $username = $user['display_name'];
            $response = ['status' => 'success', 'costs' => $costs, 'username' => $username];
        } else {
            $response['message'] = 'User not found.';
        }
        break;

    case 'change_username':
        $package = $_POST['package'] ?? '';
        $new_name = trim($_POST['new_name'] ?? '');

        if (empty($new_name) || empty($package)) {
            $response['message'] = 'Invalid data provided.';
            break;
        }

        $user_res = $conn->query("SELECT display_name, balance FROM users WHERE id = $current_user_id");
        $user = $user_res->fetch_assoc();
        
        $user_status = get_user_status($conn, $current_user_id);
        $costs = get_costs($user_status);
        $total_cost = 0;
        $expiry_date = null;
        
        // Final Fix: Check if the new name (display_name or capitalized_username) is already taken by another user
        $check_name_stmt = $conn->prepare("SELECT id FROM users WHERE (display_name = ? OR capitalized_username = ?) AND id != ?");
        $check_name_stmt->bind_param("ssi", $new_name, $new_name, $current_user_id);
        $check_name_stmt->execute();
        if ($check_name_stmt->get_result()->num_rows > 0) {
            $response['message'] = 'This username is already taken.';
            break;
        }

        if ($package === 'permanent') {
            if (!preg_match('/^[a-z][a-z0-9_-]{7,}$/', $new_name)) {
                $response['message'] = 'Invalid username format. Must be all small letters, at least 8 chars, and start with a letter.';
                break;
            }
            $total_cost = $costs['permanent'];
        } else { // Monthly or Yearly for capitalization - "Invalid Name" logic removed
            $capital_letters = preg_match_all('/[A-Z]/', $new_name);
            
            if ($capital_letters == 0 && strtolower($user['display_name']) === strtolower($new_name)) {
                $response['message'] = 'You must use at least one capital letter for capitalization packages.';
                break;
            }
            
            if ($package === 'monthly') {
                $total_cost = $capital_letters * $costs['monthly'];
                $expiry_date = (new DateTime())->modify('+1 month')->format('Y-m-d H:i:s');
            } elseif ($package === 'yearly') {
                $total_cost = $capital_letters * $costs['yearly'];
                $expiry_date = (new DateTime())->modify('+1 year')->format('Y-m-d H:i:s');
            }
        }

        if ($user['balance'] < $total_cost) {
            $response['message'] = "Insufficient balance. You need {$total_cost} TK.";
            break;
        }
        
        $conn->begin_transaction();
        try {
            if ($total_cost > 0) {
                $conn->query("UPDATE users SET balance = balance - $total_cost WHERE id = $current_user_id");
            }

            if ($package === 'permanent') {
                // For permanent change, update the main display_name and clear capitalization
                $stmt = $conn->prepare("UPDATE users SET display_name = ?, capitalized_username = NULL, capitalization_expires_at = NULL WHERE id = ?");
                $stmt->bind_param("si", $new_name, $current_user_id);
            } else {
                // For temporary capitalization/name change, set capitalized_username
                $stmt = $conn->prepare("UPDATE users SET capitalized_username = ?, capitalization_expires_at = ? WHERE id = ?");
                $stmt->bind_param("ssi", $new_name, $expiry_date, $current_user_id);
            }
            
            $stmt->execute();
            $conn->commit();
            $response = ['status' => 'success', 'message' => 'Username updated successfully!'];
        } catch (Exception $e) {
            $conn->rollback();
            $response['message'] = 'An error occurred: ' . $e->getMessage();
        }
        break;

    case 'change_username_color':
        $color_code = trim($_POST['color_code'] ?? '');
        $payment_method = $_POST['payment_method'] ?? '';

        if (!preg_match('/^#[a-f0-9]{6}$/i', $color_code)) {
            $response['message'] = 'Invalid color code format. Please use a hex code like #RRGGBB.';
            break;
        }

        $user_status = get_user_status($conn, $current_user_id);
        $costs = get_costs($user_status);
        $user_res = $conn->query("SELECT balance, gold_coins FROM users WHERE id = $current_user_id");
        $user = $user_res->fetch_assoc();
        
        $conn->begin_transaction();
        try {
            if ($payment_method === 'balance') {
                $cost = $costs['color_balance'];
                if ($user['balance'] < $cost) throw new Exception("Insufficient balance. You need {$cost} TK.");
                if ($cost > 0) $conn->query("UPDATE users SET balance = balance - $cost WHERE id = $current_user_id");
            } elseif ($payment_method === 'gold') {
                $cost = $costs['color_gold'];
                if ($user['gold_coins'] < $cost) throw new Exception("Insufficient Gold Coins. You need {$cost} Gold.");
                if ($cost > 0) $conn->query("UPDATE users SET gold_coins = gold_coins - $cost WHERE id = $current_user_id");
            } else {
                throw new Exception("Invalid payment method.");
            }
            
            $stmt = $conn->prepare("UPDATE users SET username_color = ? WHERE id = ?");
            $stmt->bind_param("si", $color_code, $current_user_id);
            $stmt->execute();

            $conn->commit();
            $response = ['status' => 'success', 'message' => 'Username color updated successfully!'];
        } catch(Exception $e) {
            $conn->rollback();
            $response['message'] = $e->getMessage();
        }
        break;
}
?>