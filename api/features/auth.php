<?php
// api/features/auth.php

switch ($action) {
    case 'register':
        $name = trim($_POST['name'] ?? '');
        $email = trim($_POST['email'] ?? '');
        $password = $_POST['password'] ?? '';
        $gender = $_POST['gender'] ?? 'Other';

        if (empty($name) || empty($email) || empty($password) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $response['message'] = 'Please fill in all fields correctly.';
        } else {
            $stmt_check = $conn->prepare("SELECT id FROM users WHERE email = ?");
            $stmt_check->bind_param("s", $email);
            $stmt_check->execute();
            if ($stmt_check->get_result()->num_rows > 0) {
                $response['message'] = 'This email is already registered.';
            } else {
                $password_hash = password_hash($password, PASSWORD_DEFAULT);
                $stmt_insert = $conn->prepare("INSERT INTO users (display_name, email, password_hash, gender) VALUES (?, ?, ?, ?)");
                $stmt_insert->bind_param("ssss", $name, $email, $password_hash, $gender);
                if ($stmt_insert->execute()) {
                    $response = ['status' => 'success', 'message' => 'Registration successful. Please log in.'];
                } else {
                    $response['message'] = 'Registration failed due to a server error.';
                }
            }
        }
        break;

    case 'login':
        $email = trim($_POST['email'] ?? '');
        $password = $_POST['password'] ?? '';
        
        if (empty($email) || empty($password)) {
             $response['message'] = 'Email and password are required.';
        } else {
            $stmt = $conn->prepare("SELECT id, password_hash, is_banned FROM users WHERE email = ?");
            $stmt->bind_param("s", $email);
            $stmt->execute();
            $user = $stmt->get_result()->fetch_assoc();
            
            if (!$user) {
                $response['message'] = 'No user found with this email.';
            } else if ($user['is_banned']) {
                $response['message'] = 'Your account has been banned.';
            } else if (password_verify($password, $user['password_hash'])) {
                $_SESSION['user_id'] = $user['id'];
                unset($_SESSION['original_user_id']); 
                
                $ip_address = $_SERVER['REMOTE_ADDR'];
                $user_agent = $_SERVER['HTTP_USER_AGENT'];
                $login_stmt = $conn->prepare("INSERT INTO login_history (user_id, ip_address, user_agent) VALUES (?, ?, ?)");
                $login_stmt->bind_param("iss", $user['id'], $ip_address, $user_agent);
                $login_stmt->execute();
                
                $conn->query("UPDATE users SET last_seen = NOW(), last_activity = NOW() WHERE id = {$user['id']}");
                $response = ['status' => 'success', 'message' => 'Login successful.'];
            } else {
                $response['message'] = 'Incorrect password.';
            }
        }
        break;

    case 'check_status':
        $user_to_send = [];
        if (isset($_SESSION['original_user_id']) && $is_admin) {
             $user_to_send['impersonating'] = true;
        }

        if ($current_user_id > 0) {
            $stmt = $conn->prepare("
                SELECT 
                    total_online_seconds, 
                    TIMESTAMPDIFF(SECOND, last_activity, NOW()) as seconds_since_last_activity 
                FROM users 
                WHERE id = ?
            ");
            $stmt->bind_param("i", $current_user_id);
            $stmt->execute();
            $time_data = $stmt->get_result()->fetch_assoc();

            if ($time_data) {
                $interval = (int)($time_data['seconds_since_last_activity'] ?? 0);
                $current_total_seconds = (int)$time_data['total_online_seconds'];

                if ($interval >= 0 && $interval < 300) { // যদি অ্যাক্টিভিটি ৫ মিনিটের মধ্যে হয়
                    $new_total_seconds = $current_total_seconds + $interval; 

                    $hours_passed_old = floor($current_total_seconds / 3600);
                    $hours_passed_new = floor($new_total_seconds / 3600);
                    
                    $reward_amount = 0;
                    if ($hours_passed_new > $hours_passed_old) {
                        $hours_to_reward = $hours_passed_new - $hours_passed_old;
                        $reward_amount = $hours_to_reward * 0.001;
                        
                        if ($reward_amount > 0) {
                            $reward_message = "অভিনন্দন! সাইটে " . ($hours_to_reward) . " ঘন্টা সক্রিয় থাকার জন্য আপনি " . number_format($reward_amount, 5) . " ব্যালেন্স পুরস্কৃত হয়েছেন।";
                            sendSystemPM($conn, $current_user_id, $reward_message);
                        }
                    }

                    // *** ফিক্স: এখান থেকে last_activity আপডেট করার কোডটি সরিয়ে দেওয়া হয়েছে ***
                    $update_stmt = $conn->prepare("UPDATE users SET last_seen = NOW(), total_online_seconds = ?, balance = balance + ? WHERE id = ?");
                    $update_stmt->bind_param("idi", $new_total_seconds, $reward_amount, $current_user_id);
                    $update_stmt->execute();
                } else {
                    // যদি ৫ মিনিটের বেশি idle থাকে, শুধু last_seen আপডেট হবে
                    $conn->query("UPDATE users SET last_seen = NOW() WHERE id = $current_user_id");
                }
            }
            
            $stmt_user = $conn->prepare("
                SELECT u.id, u.display_name, u.photo_url, u.role, u.is_premium, u.premium_expires_at, u.balance, u.pinned_shout_id,
                       st.class_name as site_theme_class, st.background_url as site_theme_bg,
                       pt.class_name as profile_theme_class
                FROM users u
                LEFT JOIN themes st ON u.selected_site_theme_id = st.id
                LEFT JOIN themes pt ON u.selected_profile_theme_id = pt.id
                WHERE u.id = ?
            ");
            $stmt_user->bind_param("i", $current_user_id);
            $stmt_user->execute();
            $user = $stmt_user->get_result()->fetch_assoc();
            
            if ($user) {
                $user_to_send = array_merge($user_to_send, [
                    'id' => $user['id'],
                    'display_name' => $user['display_name'],
                    'photo_url' => $user['photo_url'],
                    'role' => $user['role'],
                    'is_premium' => $user['is_premium'],
                    'premium_expires_at' => $user['premium_expires_at'],
                    'balance' => $user['balance'],
                    'pinned_shout_id' => $user['pinned_shout_id'],
                    'site_theme' => [
                        'class_name' => $user['site_theme_class'],
                        'background_url' => $user['site_theme_bg']
                    ],
                    'profile_theme' => [
                        'class_name' => $user['profile_theme_class']
                    ]
                ]);
                $response = ['status' => 'success', 'user' => $user_to_send];
            } else {
                 $response = ['status' => 'error', 'message' => 'User not found.'];
            }
        } else {
            $response = ['status' => 'error', 'message' => 'Not logged in'];
        }
        break;
        
    case 'stop_impersonation':
        if (isset($_SESSION['original_user_id']) && $is_admin) {
            $_SESSION['user_id'] = $_SESSION['original_user_id'];
            unset($_SESSION['original_user_id']);
            $response = ['status' => 'success', 'message' => 'Stopped impersonating.'];
        } else {
            $response['message'] = 'No active impersonation session.';
        }
        break;
        
    case 'logout':
        session_destroy();
        $response = ['status' => 'success', 'message' => 'Successfully logged out.'];
        break;
}
?>