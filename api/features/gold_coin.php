<?php
// api/features/gold_coin.php

if (!$current_user_id) {
    $response['message'] = 'You must be logged in.';
    echo json_encode($response);
    exit;
}

function goldCoinErrorHandler($message) {
    global $conn;
    if ($conn && $conn->errno) {
        $message .= " DB Error: (" . $conn->errno . ") " . $conn->error;
    }
    echo json_encode(['status' => 'error', 'message' => $message]);
    exit;
}

switch ($action) {
    case 'get_coin_status':
        try {
            // --- ১. ইউজারের পারমিশন চেক করা ---
            $perm_stmt = $conn->prepare("SELECT role, is_premium, premium_expires_at FROM users WHERE id = ?");
            if (!$perm_stmt) { goldCoinErrorHandler('Failed to prepare permission statement.'); }
            $perm_stmt->bind_param("i", $current_user_id);
            $perm_stmt->execute();
            $user_perm = $perm_stmt->get_result()->fetch_assoc();
            
            $is_premium = $user_perm['is_premium'] && $user_perm['premium_expires_at'] && (new DateTime() < new DateTime($user_perm['premium_expires_at']));
            $is_staff = in_array($user_perm['role'], ['Admin', 'Senior Moderator', 'Moderator']);
            
            $can_see_timer = $is_premium || $is_staff; 

            // --- ২. কয়েন স্ট্যাটাস চেক ---
            $stmt = $conn->prepare("SELECT id, created_at, NOW() as server_time FROM gold_coins WHERE owner_id IS NULL ORDER BY created_at ASC LIMIT 1");
            if (!$stmt) { goldCoinErrorHandler('Failed to prepare coin status statement.'); }
            
            $stmt->execute();
            $coin_result = $stmt->get_result();
            $coin = $coin_result ? $coin_result->fetch_assoc() : null;

            if (!$coin) {
                $rand_interval = rand(300, 540); // 5 to 9 minutes
                $insert_res = $conn->query("INSERT INTO gold_coins (created_at) VALUES (NOW() + INTERVAL $rand_interval SECOND)");
                if ($insert_res === false) { goldCoinErrorHandler('Failed to create a new coin after finding none.'); }

                $stmt->execute();
                $coin_result = $stmt->get_result();
                $coin = $coin_result ? $coin_result->fetch_assoc() : null;

                if (!$coin) {
                    goldCoinErrorHandler('FATAL: Could not retrieve a coin even immediately after creating one.');
                }
            }
            
            // --- ৩. শেষ কয়েন বিজয়ীর তথ্য আনা ---
            $last_gainer_stmt = $conn->prepare("
                SELECT u.id as user_id, u.display_name, gc.grabbed_at
                FROM gold_coins gc
                JOIN users u ON gc.owner_id = u.id
                WHERE gc.owner_id IS NOT NULL
                ORDER BY gc.grabbed_at DESC
                LIMIT 1
            ");
            if (!$last_gainer_stmt) { goldCoinErrorHandler('Failed to prepare last gainer statement.'); }
            $last_gainer_stmt->execute();
            $last_gainer_result = $last_gainer_stmt->get_result();
            $last_gainer = $last_gainer_result->fetch_assoc();

            // --- ৪. ব্যবহারকারীর পরিসংখ্যান ---
            $user_stats_stmt = $conn->prepare("SELECT gold_coins FROM users WHERE id = ?");
            if (!$user_stats_stmt) { goldCoinErrorHandler('Failed to prepare user stats statement.'); }
            $user_stats_stmt->bind_param("i", $current_user_id);
            $user_stats_stmt->execute();
            $user_stats = $user_stats_stmt->get_result()->fetch_assoc();
            
            $grabs_24h_stmt = $conn->prepare("SELECT COUNT(id) as count FROM gold_coins WHERE owner_id = ? AND grabbed_at > NOW() - INTERVAL 24 HOUR");
            if (!$grabs_24h_stmt) { goldCoinErrorHandler('Failed to prepare grab count statement.'); }
            $grabs_24h_stmt->bind_param("i", $current_user_id);
            $grabs_24h_stmt->execute();
            $grabs_24h = $grabs_24h_stmt->get_result()->fetch_assoc()['count'];


            $response = [
                'status' => 'success',
                'coin' => $coin,
                'can_see_timer' => $can_see_timer,
                'last_gainer' => $last_gainer,
                'user_stats' => [
                    'total_coins' => $user_stats['gold_coins'] ?? 0,
                    'grabs_last_24h' => $grabs_24h
                ]
            ];

        } catch (Exception $e) {
            goldCoinErrorHandler('An exception occurred: ' . $e->getMessage());
        }
        break;

    case 'grab_coin':
        $coin_id = (int)($_POST['coin_id'] ?? 0);
        
        // দৈনিক লিমিট চেক
        $grabs_24h_stmt = $conn->prepare("SELECT COUNT(id) as count FROM gold_coins WHERE owner_id = ? AND grabbed_at > NOW() - INTERVAL 24 HOUR");
        $grabs_24h_stmt->bind_param("i", $current_user_id);
        $grabs_24h_stmt->execute();
        $grabs_result = $grabs_24h_stmt->get_result();
        $grabs_row = $grabs_result ? $grabs_result->fetch_assoc() : null;
        $grabs_24h = $grabs_row ? $grabs_row['count'] : 0;
        
        if ($grabs_24h >= 10) {
            $response['message'] = 'You have reached your grab limit for today. Please try again later.';
            break;
        }

        $conn->begin_transaction();
        try {
            // কয়েন লক করা হচ্ছে
            $stmt = $conn->prepare("SELECT id, owner_id, created_at FROM gold_coins WHERE id = ? FOR UPDATE");
            $stmt->bind_param("i", $coin_id);
            $stmt->execute();
            $coin_result = $stmt->get_result();
            $coin = $coin_result ? $coin_result->fetch_assoc() : null;

            if ($coin && $coin['owner_id'] === NULL && strtotime($coin['created_at']) <= time()) {
                // ১. কয়েনের মালিক আপডেট
                $update_coin_stmt = $conn->prepare("UPDATE gold_coins SET owner_id = ?, grabbed_at = NOW() WHERE id = ?");
                $update_coin_stmt->bind_param("ii", $current_user_id, $coin_id);
                $update_coin_stmt->execute();
                
                // ২. ইউজারের ব্যালেন্স আপডেট
                $update_user_stmt = $conn->prepare("UPDATE users SET gold_coins = gold_coins + 1 WHERE id = ?");
                $update_user_stmt->bind_param("i", $current_user_id);
                $update_user_stmt->execute();
                
                // ৩. পরবর্তী কয়েন তৈরি
                $rand_interval = rand(300, 540);
                $conn->query("INSERT INTO gold_coins (created_at) VALUES (NOW() + INTERVAL $rand_interval SECOND)");
                
                // ৪. XP যোগ করা
                addXP($conn, $current_user_id, 0.25); // Grab Coin: 0.25 XP

                $conn->commit();
                $response = ['status' => 'success', 'message' => 'Congratulations! You grabbed a Gold Coin!'];
            } else {
                $conn->rollback();
                $response['message'] = 'Too slow! Someone else grabbed the coin, or it is not yet available.';
            }
        } catch (Exception $e) {
            $conn->rollback();
            $response['message'] = 'An error occurred: ' . $e->getMessage();
        }
        break;
}
?>