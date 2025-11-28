<?php
// api/features/admin_tools.php

if (!$is_admin) {
    $response['message'] = 'You do not have permission to perform this action.';
    echo json_encode($response);
    exit;
}

switch ($action) {
    // --- Special Status & Blue Tick Toggle ---
    case 'toggle_special_status':
        $user_id_to_modify = (int)($_POST['user_id'] ?? 0);
        if ($user_id_to_modify > 0) {
            $conn->query("UPDATE users SET is_special = !is_special WHERE id = $user_id_to_modify");
            $response = ['status' => 'success', 'message' => 'User special status has been toggled.'];
        } else {
            $response['message'] = 'Invalid user ID.';
        }
        break;

    case 'toggle_blue_tick':
        $user_id_to_modify = (int)($_POST['user_id'] ?? 0);
        if ($user_id_to_modify > 0) {
            $conn->query("UPDATE users SET is_verified = !is_verified WHERE id = $user_id_to_modify");
            $response = ['status' => 'success', 'message' => 'User blue tick status has been toggled.'];
        } else {
            $response['message'] = 'Invalid user ID.';
        }
        break;

    // --- Clear Data Functionality ---
    case 'clear_data':
        $type = $_POST['type'] ?? '';
        $message = 'Unknown error.';
        $status = 'error';

        if (!isset($_POST['confirm']) || $_POST['confirm'] !== 'true') {
            $response['message'] = 'Confirmation not received.';
            echo json_encode($response);
            exit;
        }

        switch ($type) {
            case 'notifications':
                if ($conn->query("TRUNCATE TABLE notifications")) {
                    $status = 'success';
                    $message = 'All user notifications have been deleted.';
                } else {
                    $message = 'Failed to delete notifications.';
                }
                break;
            case 'inboxes':
                if ($conn->query("TRUNCATE TABLE private_messages")) {
                    $status = 'success';
                    $message = 'All user inboxes (private messages) have been deleted.';
                } else {
                    $message = 'Failed to delete inboxes.';
                }
                break;
            case 'unread_inboxes':
                if ($conn->query("DELETE FROM private_messages WHERE is_read = 0")) {
                    $status = 'success';
                    $message = 'All unread private messages have been deleted.';
                } else {
                    $message = 'Failed to delete unread messages.';
                }
                break;
            case 'modlog':
                if ($conn->query("TRUNCATE TABLE reports")) {
                    $status = 'success';
                    $message = 'Moderator logs (reports) have been cleared.';
                } else {
                    $message = 'Failed to clear moderator logs.';
                }
                break;
            case 'shouts':
                $conn->begin_transaction();
                try {
                    $conn->query("SET FOREIGN_KEY_CHECKS=0");
                    $conn->query("TRUNCATE TABLE shouts");
                    $conn->query("TRUNCATE TABLE shout_reactions");
                    $conn->query("UPDATE users SET pinned_shout_id = NULL");
                    $conn->query("SET FOREIGN_KEY_CHECKS=1");
                    $conn->commit();
                    $status = 'success';
                    $message = 'All shouts and their reactions have been deleted.';
                } catch (Exception $e) {
                    $conn->rollback();
                    $conn->query("SET FOREIGN_KEY_CHECKS=1");
                    $message = 'Failed to delete shouts: ' . $e->getMessage();
                }
                break;
            default:
                $message = 'Invalid data clearing type specified.';
                break;
        }
        $response = ['status' => $status, 'message' => $message];
        break;

    // --- Standard Admin Tools ---
    case 'get_themes_for_promo':
        $themes = $conn->query("SELECT id, name, type, cost FROM themes WHERE cost > 0 ORDER BY type, id")->fetch_all(MYSQLI_ASSOC);
        $response = ['status' => 'success', 'themes' => $themes];
        break;

    case 'generate_theme_promo_code':
        $theme_id = (int)($_POST['theme_id'] ?? 0);
        if ($theme_id <= 0) {
            $response['message'] = 'Invalid theme selected.';
            break;
        }
        $code = 'THEME-' . strtoupper(bin2hex(random_bytes(4))) . '-' . strtoupper(bin2hex(random_bytes(4)));
        $stmt = $conn->prepare("INSERT INTO theme_promo_codes (code, theme_id, generated_by) VALUES (?, ?, ?)");
        $stmt->bind_param("sii", $code, $theme_id, $current_user_id);
        if ($stmt->execute()) {
            $response = ['status' => 'success', 'code' => $code];
        } else {
            $response['message'] = 'Failed to generate code. Please try again.';
        }
        break;

    case 'toggle_ban_status':
        $user_id_to_modify = (int)($_POST['user_id'] ?? 0);
        if ($user_id_to_modify > 0 && $user_id_to_modify != $current_user_id) {
            $conn->query("UPDATE users SET is_banned = !is_banned WHERE id = $user_id_to_modify");
            $response = ['status' => 'success', 'message' => 'User ban status has been toggled successfully.'];
        } else {
            $response['message'] = 'Invalid request. You cannot change your own status.';
        }
        break;
        
    case 'update_user_role_admin':
        $user_id_to_update = (int)($_POST['user_id'] ?? 0);
        $new_role = $_POST['role'] ?? '';
        $is_hidden = isset($_POST['is_hidden']) && $_POST['is_hidden'] == 'true';
        $allowed_roles = ['Member', 'Moderator', 'Senior Moderator', 'Admin'];

        if ($user_id_to_update > 0 && in_array($new_role, $allowed_roles) && $user_id_to_update != $current_user_id) {
            $display_role = NULL;
            if ($is_hidden && in_array($new_role, ['Admin', 'Senior Moderator', 'Moderator'])) {
                $display_role = 'Member';
            }

            $stmt = $conn->prepare("UPDATE users SET role = ?, display_role = ? WHERE id = ?");
            $stmt->bind_param("ssi", $new_role, $display_role, $user_id_to_update);
            
            if ($stmt->execute()) {
                $response = ['status' => 'success', 'message' => 'User role updated successfully.'];
            } else {
                $response['message'] = 'Failed to update role.';
            }
        } else {
            $response['message'] = 'Invalid request. You cannot change your own role.';
        }
        break;

    case 'adjust_balance':
        $user_id_to_modify = (int)($_POST['user_id'] ?? 0);
        $amount = (float)($_POST['amount'] ?? 0);
        $adjustment_type = $_POST['type'] ?? 'add';

        if ($user_id_to_modify > 0 && is_numeric($amount) && $amount >= 0) {
            $sql = "UPDATE users SET balance = balance + ? WHERE id = ?";
            if($adjustment_type === 'remove') $sql = "UPDATE users SET balance = balance - ? WHERE id = ?";
            $stmt = $conn->prepare($sql);
            $stmt->bind_param("di", $amount, $user_id_to_modify);
            if ($stmt->execute()) {
                $response = ['status' => 'success', 'message' => 'User balance updated successfully.'];
            } else {
                $response['message'] = 'Failed to update balance.';
            }
        } else {
            $response['message'] = 'Invalid data provided.';
        }
        break;

    case 'adjust_gold_coins':
        $user_id_to_modify = (int)($_POST['user_id'] ?? 0);
        $amount = (int)($_POST['amount'] ?? 0);
        $adjustment_type = $_POST['type'] ?? 'add';

        if ($user_id_to_modify > 0 && is_numeric($amount) && $amount >= 0) {
            $sql = "UPDATE users SET gold_coins = gold_coins + ? WHERE id = ?";
            if ($adjustment_type === 'remove') $sql = "UPDATE users SET gold_coins = gold_coins - ? WHERE id = ?";
            $stmt = $conn->prepare($sql);
            $stmt->bind_param("ii", $amount, $user_id_to_modify);
            if ($stmt->execute()) {
                $response = ['status' => 'success', 'message' => 'User gold coins updated successfully.'];
            } else {
                $response['message'] = 'Failed to update gold coins.';
            }
        } else {
            $response['message'] = 'Invalid data provided.';
        }
        break;

    case 'reset_password':
        $user_id_to_modify = (int)($_POST['user_id'] ?? 0);
        $new_password = $_POST['new_password'] ?? '';
        if ($user_id_to_modify > 0 && !empty($new_password) && strlen($new_password) >= 6) {
            $password_hash = password_hash($new_password, PASSWORD_DEFAULT);
            $stmt = $conn->prepare("UPDATE users SET password_hash = ? WHERE id = ?");
            $stmt->bind_param("si", $password_hash, $user_id_to_modify);
            if ($stmt->execute()) {
                $response = ['status' => 'success', 'message' => 'Password has been reset successfully.'];
            } else {
                $response['message'] = 'Failed to reset password.';
            }
        } else {
            $response['message'] = 'Invalid user or password.';
        }
        break;

    case 'get_user_restrictions':
        $user_id = (int)($_GET['user_id'] ?? 0);
        if ($user_id > 0) {
            $stmt = $conn->prepare("SELECT can_shout, can_pm, can_post_topic FROM users WHERE id = ?");
            $stmt->bind_param("i", $user_id);
            $stmt->execute();
            $restrictions = $stmt->get_result()->fetch_assoc();
            $response = ['status' => 'success', 'restrictions' => $restrictions];
        } else {
            $response['message'] = 'Invalid user ID.';
        }
        break;

    case 'toggle_restriction':
        $user_id = (int)($_POST['user_id'] ?? 0);
        $restriction_type = $_POST['type'] ?? '';
        $allowed_types = ['can_shout', 'can_pm', 'can_post_topic'];
        
        if ($user_id > 0 && in_array($restriction_type, $allowed_types)) {
            $conn->query("UPDATE users SET `$restriction_type` = !`$restriction_type` WHERE id = $user_id");
            $response = ['status' => 'success', 'message' => 'Restriction status toggled.'];
        } else {
            $response['message'] = 'Invalid request.';
        }
        break;

    case 'issue_warning':
        $user_id_to_warn = (int)($_POST['user_id'] ?? 0);
        $reason = trim($_POST['reason'] ?? '');
        if ($user_id_to_warn > 0 && !empty($reason)) {
            $stmt = $conn->prepare("INSERT INTO user_warnings (user_id, issuer_id, reason) VALUES (?, ?, ?)");
            $stmt->bind_param("iis", $user_id_to_warn, $current_user_id, $reason);
            if ($stmt->execute()) {
                $response = ['status' => 'success', 'message' => 'Warning issued successfully.'];
            } else {
                $response['message'] = 'Failed to issue warning.';
            }
        } else {
            $response['message'] = 'User ID and reason are required.';
        }
        break;
        
    case 'get_user_warnings':
        $user_id = (int)($_GET['user_id'] ?? 0);
        if ($user_id > 0) {
            $query = "SELECT w.*, u.display_name as issuer_name FROM user_warnings w JOIN users u ON w.issuer_id = u.id WHERE w.user_id = ? ORDER BY w.created_at DESC";
            $stmt = $conn->prepare($query);
            $stmt->bind_param("i", $user_id);
            $stmt->execute();
            $warnings = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
            $response = ['status' => 'success', 'warnings' => $warnings];
        } else {
            $response['message'] = 'Invalid User ID.';
        }
        break;

    case 'clear_avatar':
        $user_id = (int)($_POST['user_id'] ?? 0);
        if ($user_id > 0) {
            $stmt = $conn->prepare("UPDATE users SET photo_url = NULL WHERE id = ?");
            $stmt->bind_param("i", $user_id);
            if ($stmt->execute()) {
                $response = ['status' => 'success', 'message' => "User's avatar has been cleared."];
            } else {
                $response['message'] = 'Failed to clear avatar.';
            }
        } else {
            $response['message'] = 'Invalid User ID.';
        }
        break;
    
    case 'grant_premium_admin':
        $user_id = (int)($_POST['user_id'] ?? 0);
        $duration_days = (int)($_POST['duration_days'] ?? 0);
        $allowed_durations = [1, 7, 14, 30, 90, 180, 365];

        if ($user_id > 0 && in_array($duration_days, $allowed_durations)) {
            $update_stmt = $conn->prepare("
                UPDATE users SET is_premium = 1, premium_expires_at = (
                    CASE
                        WHEN premium_expires_at IS NOT NULL AND premium_expires_at > NOW()
                        THEN DATE_ADD(premium_expires_at, INTERVAL ? DAY)
                        ELSE DATE_ADD(NOW(), INTERVAL ? DAY)
                    END
                ) WHERE id = ?
            ");
            $update_stmt->bind_param("iii", $duration_days, $duration_days, $user_id);

            if ($update_stmt->execute()) {
                $response = ['status' => 'success', 'message' => "Successfully granted {$duration_days} days of premium membership."];
            } else {
                $response['message'] = 'Failed to update premium status.';
            }
        } else {
            $response['message'] = 'Invalid user ID or duration.';
        }
        break;

    case 'remove_premium_admin':
        $user_id = (int)($_POST['user_id'] ?? 0);
        if ($user_id > 0) {
            $stmt = $conn->prepare("UPDATE users SET is_premium = 0, premium_expires_at = NULL WHERE id = ?");
            $stmt->bind_param("i", $user_id);
            if ($stmt->execute()) {
                $response = ['status' => 'success', 'message' => "User's premium status has been removed."];
            } else {
                $response['message'] = 'Failed to remove premium status.';
            }
        } else {
            $response['message'] = 'Invalid User ID.';
        }
        break;

    case 'add_user_note':
        $user_id = (int)($_POST['user_id'] ?? 0);
        $note = trim($_POST['note'] ?? '');
        if ($user_id > 0 && !empty($note)) {
            $stmt = $conn->prepare("INSERT INTO user_notes (user_id, admin_id, note) VALUES (?, ?, ?)");
            $stmt->bind_param("iis", $user_id, $current_user_id, $note);
            if ($stmt->execute()) {
                $response = ['status' => 'success', 'message' => 'Note added successfully.'];
            } else {
                $response['message'] = 'Failed to add note.';
            }
        } else {
            $response['message'] = 'User ID and note are required.';
        }
        break;
        
    case 'get_user_notes':
        $user_id = (int)($_GET['user_id'] ?? 0);
        if ($user_id > 0) {
            $query = "SELECT n.*, u.display_name as admin_name FROM user_notes n JOIN users u ON n.admin_id = u.id WHERE n.user_id = ? ORDER BY n.created_at DESC";
            $stmt = $conn->prepare($query);
            $stmt->bind_param("i", $user_id);
            $stmt->execute();
            $notes = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
            $response = ['status' => 'success', 'notes' => $notes];
        } else {
            $response['message'] = 'Invalid User ID.';
        }
        break;
        
    case 'get_login_history':
        $user_id = (int)($_GET['user_id'] ?? 0);
        if ($user_id > 0) {
            $stmt = $conn->prepare("SELECT ip_address, user_agent, login_time FROM login_history WHERE user_id = ? ORDER BY login_time DESC LIMIT 50");
            $stmt->bind_param("i", $user_id);
            $stmt->execute();
            $history = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
            $response = ['status' => 'success', 'history' => $history];
        } else {
            $response['message'] = 'Invalid User ID.';
        }
        break;
        
    case 'get_transaction_history':
        $user_id = (int)($_GET['user_id'] ?? 0);
        if ($user_id > 0) {
            $stmt = $conn->prepare("SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 100");
            $stmt->bind_param("i", $user_id);
            $stmt->execute();
            $history = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
            $response = ['status' => 'success', 'history' => $history];
        } else {
            $response['message'] = 'Invalid User ID.';
        }
        break;
        
    case 'impersonate_user':
        $user_id_to_impersonate = (int)($_POST['user_id'] ?? 0);
        if ($user_id_to_impersonate > 0 && $user_id_to_impersonate != $current_user_id) {
            $role_to_impersonate = getUserRole($conn, $user_id_to_impersonate);
            if($role_to_impersonate === 'Admin'){
                 $response['message'] = 'You cannot impersonate another admin.';
            } else {
                $_SESSION['original_user_id'] = $current_user_id;
                $_SESSION['user_id'] = $user_id_to_impersonate;
                $response = ['status' => 'success', 'message' => 'Now impersonating user. Refreshing...'];
            }
        } else {
            $response['message'] = 'Invalid request. Cannot impersonate yourself.';
        }
        break;

    case 'get_premium_settings':
        $settings_query = "SELECT setting_name, setting_value FROM site_settings WHERE setting_name IN ('coupon_system_enabled', 'site_wide_discount_enabled', 'site_wide_discount_percent')";
        $settings_result = $conn->query($settings_query);
        $settings = [];
        while ($row = $settings_result->fetch_assoc()) {
            $settings[$row['setting_name']] = $row['setting_value'];
        }
        $coupons_query = "SELECT code, discount_percent FROM coupons WHERE is_used = 0 ORDER BY id DESC LIMIT 20";
        $coupons = $conn->query($coupons_query)->fetch_all(MYSQLI_ASSOC);
        $response = ['status' => 'success', 'settings' => $settings, 'coupons' => $coupons];
        break;

    case 'update_premium_settings':
        $coupon_enabled = isset($_POST['coupon_system_enabled']) ? '1' : '0';
        $site_discount_enabled = isset($_POST['site_wide_discount_enabled']) ? '1' : '0';
        $site_discount_percent = (int)($_POST['site_wide_discount_percent'] ?? 0);
        $stmt1 = $conn->prepare("INSERT INTO site_settings (setting_name, setting_value) VALUES ('coupon_system_enabled', ?) ON DUPLICATE KEY UPDATE setting_value = ?");
        $stmt1->bind_param("ss", $coupon_enabled, $coupon_enabled);
        $stmt1->execute();
        $stmt2 = $conn->prepare("INSERT INTO site_settings (setting_name, setting_value) VALUES ('site_wide_discount_enabled', ?) ON DUPLICATE KEY UPDATE setting_value = ?");
        $stmt2->bind_param("ss", $site_discount_enabled, $site_discount_enabled);
        $stmt2->execute();
        $stmt3 = $conn->prepare("INSERT INTO site_settings (setting_name, setting_value) VALUES ('site_wide_discount_percent', ?) ON DUPLICATE KEY UPDATE setting_value = ?");
        $stmt3->bind_param("ii", $site_discount_percent, $site_discount_percent);
        $stmt3->execute();
        $response = ['status' => 'success', 'message' => 'Settings updated successfully.'];
        break;

    case 'generate_coupon':
        $discount_percent = (int)($_POST['discount_percent'] ?? 0);
        if ($discount_percent > 0 && $discount_percent <= 90) {
            $coupon_code = 'PREMIUM' . strtoupper(bin2hex(random_bytes(4)));
            $stmt = $conn->prepare("INSERT INTO coupons (code, discount_percent) VALUES (?, ?)");
            $stmt->bind_param("si", $coupon_code, $discount_percent);
            if ($stmt->execute()) {
                $response = ['status' => 'success', 'message' => "Coupon '{$coupon_code}' generated successfully."];
            } else {
                $response['message'] = 'Could not generate coupon. Please try again.';
            }
        } else {
            $response['message'] = 'Invalid discount percentage.';
        }
        break;
        
    case 'delete_user':
        if (!$is_admin) { $response['message'] = 'You do not have permission to delete users.'; break; }
        $user_id_to_delete = (int)($_POST['user_id'] ?? 0);
        if ($user_id_to_delete > 0 && $user_id_to_delete != $current_user_id) {
            $conn->query("DELETE FROM shout_reactions WHERE user_id = $user_id_to_delete");
            $conn->query("DELETE FROM shouts WHERE user_id = $user_id_to_delete");
            $stmt = $conn->prepare("DELETE FROM users WHERE id = ?");
            $stmt->bind_param("i", $user_id_to_delete);
            $response = $stmt->execute() ? ['status' => 'success'] : ['message' => 'Failed to delete user.'];
        } else {
            $response['message'] = 'Invalid request. You cannot delete yourself.';
        }
        break;
}
?>