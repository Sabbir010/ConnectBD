<?php
// api/features/themes.php

if (!$current_user_id) {
    $response['message'] = 'You must be logged in.';
    echo json_encode($response);
    exit;
}

switch ($action) {
    case 'get_themes':
        $theme_type = $_GET['type'] ?? null;
        if (!$theme_type || !in_array($theme_type, ['site', 'profile'])) {
            $response['message'] = 'Invalid theme type requested.';
            break;
        }

        $themes_stmt = $conn->prepare("SELECT id, name, type, class_name, background_url, cost FROM themes WHERE type = ?");
        $themes_stmt->bind_param("s", $theme_type);
        $themes_stmt->execute();
        $themes = $themes_stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        
        $user_data_res = $conn->query("SELECT selected_site_theme_id, selected_profile_theme_id, is_premium, premium_expires_at FROM users WHERE id = $current_user_id");
        $user_data = $user_data_res->fetch_assoc();
        
        $is_premium = $user_data['is_premium'] && $user_data['premium_expires_at'] && (new DateTime() < new DateTime($user_data['premium_expires_at']));

        $response = [
            'status' => 'success',
            'themes' => $themes,
            'user_selection' => [
                'site' => $user_data['selected_site_theme_id'],
                'profile' => $user_data['selected_profile_theme_id']
            ],
            'is_premium' => $is_premium
        ];
        break;

    case 'set_theme': // This action is now for BUYING a theme
        $theme_id = (int)($_POST['theme_id'] ?? 0);
        if ($theme_id <= 0) {
            $response['message'] = 'Invalid theme ID.';
            break;
        }

        $theme_res = $conn->query("SELECT type, cost FROM themes WHERE id = $theme_id");
        if ($theme_res->num_rows == 0) {
            $response['message'] = 'Theme not found.';
            break;
        }
        $theme = $theme_res->fetch_assoc();
        
        $user_data_res = $conn->query("SELECT gold_coins, is_premium, premium_expires_at FROM users WHERE id = $current_user_id");
        $user_data = $user_data_res->fetch_assoc();
        $is_premium = $user_data['is_premium'] && $user_data['premium_expires_at'] && (new DateTime() < new DateTime($user_data['premium_expires_at']));
        
        $cost = $theme['cost'];

        // Premium users get themes for free
        if ($is_premium) {
            $cost = 0;
        }

        if ($user_data['gold_coins'] < $cost) {
            $response['message'] = 'Not enough Gold Coins to purchase this theme.';
            break;
        }

        $conn->begin_transaction();
        try {
            if ($cost > 0) {
                $conn->query("UPDATE users SET gold_coins = gold_coins - $cost WHERE id = $current_user_id");
            }
            
            $column_to_update = ($theme['type'] == 'site') ? 'selected_site_theme_id' : 'selected_profile_theme_id';
            $stmt = $conn->prepare("UPDATE users SET $column_to_update = ? WHERE id = ?");
            $stmt->bind_param("ii", $theme_id, $current_user_id);
            $stmt->execute();
            
            $conn->commit();
            $response = ['status' => 'success', 'message' => 'Theme applied successfully!'];

        } catch (Exception $e) {
            $conn->rollback();
            $response['message'] = 'Failed to apply theme due to a server error.';
        }
        break;
        
    case 'redeem_theme_promo_code':
        $code = trim($_POST['code'] ?? '');
        if (empty($code)) {
            $response['message'] = 'Please enter a code.';
            break;
        }

        $stmt = $conn->prepare("SELECT id, theme_id, is_used FROM theme_promo_codes WHERE code = ?");
        $stmt->bind_param("s", $code);
        $stmt->execute();
        $promo_code = $stmt->get_result()->fetch_assoc();

        if (!$promo_code) {
            $response['message'] = 'Invalid code.';
            break;
        }
        if ($promo_code['is_used']) {
            $response['message'] = 'This code has already been used.';
            break;
        }

        $theme_res = $conn->query("SELECT type FROM themes WHERE id = " . $promo_code['theme_id']);
        if ($theme_res->num_rows == 0) {
            $response['message'] = 'The theme associated with this code no longer exists.';
            break;
        }
        $theme = $theme_res->fetch_assoc();
        $column_to_update = ($theme['type'] == 'site') ? 'selected_site_theme_id' : 'selected_profile_theme_id';
        
        $conn->begin_transaction();
        try {
            $update_user_stmt = $conn->prepare("UPDATE users SET $column_to_update = ? WHERE id = ?");
            $update_user_stmt->bind_param("ii", $promo_code['theme_id'], $current_user_id);
            $update_user_stmt->execute();
            
            $update_code_stmt = $conn->prepare("UPDATE theme_promo_codes SET is_used = 1, used_by = ?, used_at = NOW() WHERE id = ?");
            $update_code_stmt->bind_param("ii", $current_user_id, $promo_code['id']);
            $update_code_stmt->execute();
            
            $conn->commit();
            $response = ['status' => 'success', 'message' => 'Congratulations! The theme has been applied to your account for free.'];
        } catch (Exception $e) {
            $conn->rollback();
            $response['message'] = 'An error occurred while redeeming the code.';
        }
        break;
}
?>