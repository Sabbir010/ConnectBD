<?php
// api/features/premium.php

if (!$current_user_id) {
    $response['message'] = 'You must be logged in.';
    echo json_encode($response);
    exit;
}

// Helper function to get site settings
function get_setting($conn, $setting_name) {
    $stmt = $conn->prepare("SELECT setting_value FROM site_settings WHERE setting_name = ?");
    $stmt->bind_param("s", $setting_name);
    $stmt->execute();
    return $stmt->get_result()->fetch_assoc()['setting_value'] ?? null;
}

switch ($action) {
    case 'get_premium_packages':
        $packages = [
            ['id' => 1, 'name' => '1 Month', 'duration_days' => 30, 'price' => 50.00],
            ['id' => 2, 'name' => '2 Months', 'duration_days' => 60, 'price' => 80.00],
            ['id' => 3, 'name' => '3 Months', 'duration_days' => 90, 'price' => 130.00]
        ];

        $discount_info = [
            'site_wide_enabled' => (bool)get_setting($conn, 'site_wide_discount_enabled'),
            'site_wide_percent' => (int)get_setting($conn, 'site_wide_discount_percent'),
            'coupon_system_enabled' => (bool)get_setting($conn, 'coupon_system_enabled')
        ];

        $response = ['status' => 'success', 'packages' => $packages, 'discount_info' => $discount_info];
        break;

    case 'buy_premium':
        $package_id = (int)($_POST['package_id'] ?? 0);
        $coupon_code = trim($_POST['coupon_code'] ?? '');

        $packages = [
            1 => ['duration_days' => 30, 'price' => 50.00],
            2 => ['duration_days' => 60, 'price' => 80.00],
            3 => ['duration_days' => 90, 'price' => 130.00]
        ];

        if (!isset($packages[$package_id])) {
            $response['message'] = 'Invalid package selected.';
            break;
        }

        $package = $packages[$package_id];
        $final_price = $package['price'];
        $discount_applied = 0;

        // Apply site-wide discount
        if ((bool)get_setting($conn, 'site_wide_discount_enabled')) {
            $discount_percent = (int)get_setting($conn, 'site_wide_discount_percent');
            if ($discount_percent > 0) {
                $discount_applied = $discount_percent;
                $final_price -= ($final_price * $discount_percent / 100);
            }
        } 
        // Or apply coupon discount
        elseif (!empty($coupon_code) && (bool)get_setting($conn, 'coupon_system_enabled')) {
            $coupon_stmt = $conn->prepare("SELECT * FROM coupons WHERE code = ? AND is_used = 0");
            $coupon_stmt->bind_param("s", $coupon_code);
            $coupon_stmt->execute();
            $coupon = $coupon_stmt->get_result()->fetch_assoc();

            if ($coupon) {
                $discount_applied = $coupon['discount_percent'];
                $final_price -= ($final_price * $discount_applied / 100);
            } else {
                $response['message'] = 'Invalid or used coupon code.';
                break;
            }
        }
        
        // Check user balance
        $user_balance_stmt = $conn->prepare("SELECT balance FROM users WHERE id = ?");
        $user_balance_stmt->bind_param("i", $current_user_id);
        $user_balance_stmt->execute();
        $user_balance = $user_balance_stmt->get_result()->fetch_assoc()['balance'];

        if ($user_balance < $final_price) {
            $response['message'] = 'Insufficient balance. Please recharge.';
            break;
        }

        $conn->begin_transaction();
        try {
            // 1. Deduct balance
            $update_balance_stmt = $conn->prepare("UPDATE users SET balance = balance - ? WHERE id = ?");
            $update_balance_stmt->bind_param("di", $final_price, $current_user_id);
            $update_balance_stmt->execute();
            
            // 2. Update premium status
            $duration = $package['duration_days'];
            $update_premium_stmt = $conn->prepare("UPDATE users SET is_premium = 1, premium_expires_at = (
                CASE 
                    WHEN premium_expires_at IS NOT NULL AND premium_expires_at > NOW()
                    THEN DATE_ADD(premium_expires_at, INTERVAL ? DAY)
                    ELSE DATE_ADD(NOW(), INTERVAL ? DAY)
                END
            ) WHERE id = ?");
            $update_premium_stmt->bind_param("iii", $duration, $duration, $current_user_id);
            $update_premium_stmt->execute();
            
            // 3. Mark coupon as used (if any)
            if (isset($coupon)) {
                $use_coupon_stmt = $conn->prepare("UPDATE coupons SET is_used = 1, used_by_user_id = ?, used_at = NOW() WHERE id = ?");
                $use_coupon_stmt->bind_param("ii", $current_user_id, $coupon['id']);
                $use_coupon_stmt->execute();
            }

            // 4. Record transaction
            $details = "Premium Purchase: " . $package_id . " day package.";
            if($discount_applied > 0) $details .= " ($discount_applied% discount applied).";
            $trans_stmt = $conn->prepare("INSERT INTO transactions (user_id, type, amount, method, details, status) VALUES (?, 'Purchase', ?, 'Balance', ?, 'approved')");
            $trans_stmt->bind_param("ids", $current_user_id, $final_price, $details);
            $trans_stmt->execute();

            $conn->commit();
            $response = ['status' => 'success', 'message' => 'Congratulations! You are now a Premium Member.'];

        } catch (Exception $e) {
            $conn->rollback();
            $response['message'] = 'An error occurred during the transaction. Please try again. ' . $e->getMessage();
        }
        break;
}
?>