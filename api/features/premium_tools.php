<?php
// api/features/premium_tools.php

if (!$current_user_id) {
    $response['message'] = 'You must be logged in.';
    echo json_encode($response);
    exit;
}

// প্রিমিয়াম ইউজার কিনা তা নিশ্চিত করা হচ্ছে
$user_is_premium_res = $conn->query("SELECT is_premium, premium_expires_at, last_monthly_bonus FROM users WHERE id = $current_user_id");
$user_premium_data = $user_is_premium_res->fetch_assoc();

// *** চূড়ান্ত সংশোধন: NULL তারিখের জন্য চেক যোগ করা হয়েছে ***
$is_premium = $user_premium_data && $user_premium_data['is_premium'] && $user_premium_data['premium_expires_at'] && (new DateTime() < new DateTime($user_premium_data['premium_expires_at']));

if (!$is_premium) {
    $response['message'] = 'Only premium members can access these tools.';
    echo json_encode($response);
    exit;
}

switch ($action) {
    case 'get_premium_tools_data':
        // প্রোফাইল ভিজিটরদের তালিকা আনা হচ্ছে
        $visitors_query = "
            SELECT u.id, u.display_name, u.photo_url, pv.viewed_at 
            FROM profile_views pv
            JOIN users u ON pv.viewer_id = u.id
            WHERE pv.profile_id = ?
            ORDER BY pv.viewed_at DESC
            LIMIT 10
        ";
        $stmt_visitors = $conn->prepare($visitors_query);
        $stmt_visitors->bind_param("i", $current_user_id);
        $stmt_visitors->execute();
        $visitors = $stmt_visitors->get_result()->fetch_all(MYSQLI_ASSOC);

        // মাসিক বোনাসের স্ট্যাটাস চেক করা হচ্ছে
        $last_bonus_date = $user_premium_data['last_monthly_bonus'];
        $can_claim_bonus = false;
        if ($last_bonus_date === null) {
            $can_claim_bonus = true;
        } else {
            $last_bonus_dt = new DateTime($last_bonus_date);
            $today = new DateTime();
            if ($last_bonus_dt->format('Y-m') < $today->format('Y-m')) {
                $can_claim_bonus = true;
            }
        }

        $response = [
            'status' => 'success',
            'profile_visitors' => $visitors,
            'bonus_info' => [
                'can_claim' => $can_claim_bonus,
                'last_claimed' => $last_bonus_date
            ]
        ];
        break;

    case 'upload_cover_photo':
        if (isset($_FILES['coverPhotoFile']) && $_FILES['coverPhotoFile']['error'] === UPLOAD_ERR_OK) {
            $file = $_FILES['coverPhotoFile'];
            $allowed_types = ['image/jpeg', 'image/png', 'image/gif'];
            $max_size = 5 * 1024 * 1024; // 5MB

            if (!in_array($file['type'], $allowed_types) || $file['size'] > $max_size) {
                $response['message'] = 'Invalid file type or size (Max 5MB: JPG, PNG, GIF).';
                break;
            }

            $file_extension = pathinfo($file['name'], PATHINFO_EXTENSION);
            $new_filename = 'cover_' . $current_user_id . '_' . time() . '.' . $file_extension;
            
            $upload_dir = __DIR__ . '/../../uploads/covers/';
            if (!is_dir($upload_dir)) { mkdir($upload_dir, 0777, true); }
            $upload_path = $upload_dir . $new_filename;

            if (move_uploaded_file($file['tmp_name'], $upload_path)) {
                $file_url = 'https://' . $_SERVER['HTTP_HOST'] . '/uploads/covers/' . $new_filename;
                $stmt = $conn->prepare("UPDATE users SET cover_photo_url = ? WHERE id = ?");
                $stmt->bind_param("si", $file_url, $current_user_id);
                if($stmt->execute()){
                    $response = ['status' => 'success', 'message' => 'Cover photo uploaded successfully.', 'cover_photo_url' => $file_url];
                } else {
                    $response['message'] = 'Failed to update database.';
                }
            } else {
                $response['message'] = 'Failed to move uploaded file.';
            }
        } else {
            $response['message'] = 'No file was uploaded or an error occurred.';
        }
        break;

    case 'claim_monthly_bonus':
        $last_bonus_date = $user_premium_data['last_monthly_bonus'];
        $can_claim = false;
        if ($last_bonus_date === null || (new DateTime($last_bonus_date))->format('Y-m') < (new DateTime())->format('Y-m')) {
            $can_claim = true;
        }

        if ($can_claim) {
            $bonus_amount = 20;
            $conn->query("UPDATE users SET gold_coins = gold_coins + $bonus_amount, last_monthly_bonus = CURDATE() WHERE id = $current_user_id");
            $response = ['status' => 'success', 'message' => "Congratulations! You have received {$bonus_amount} Gold Coins as your monthly bonus."];
        } else {
            $response['message'] = 'You have already claimed your bonus for this month.';
        }
        break;
}
?>