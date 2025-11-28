<?php
// api/features/bot_functions.php

define('SYSTEM_USER_ID', 2);

function sendSystemPM($conn, $receiver_id, $message) {
    if ($receiver_id == SYSTEM_USER_ID) return;
    
    $sender_id = SYSTEM_USER_ID;
    
    $stmt = $conn->prepare("INSERT INTO private_messages (sender_id, receiver_id, message) VALUES (?, ?, ?)");
    $stmt->bind_param("iis", $sender_id, $receiver_id, $message);
    $stmt->execute();
}

function sendNotification($conn, $user_id, $message, $link = null) {
    if (!$user_id) return;
    
    // is_read ডিফল্ট 0
    $stmt = $conn->prepare("INSERT INTO notifications (user_id, message, link, is_read) VALUES (?, ?, ?, 0)");
    $stmt->bind_param("iss", $user_id, $message, $link);
    $stmt->execute();
}

// --- হেল্পার ফাংশন: লেভেল অনুযায়ী স্ট্যাটাস জেনারেট করা (১-১০০) ---
function getLevelStatus($level) {
    if ($level <= 0) return 'Newcomer';
    if ($level >= 100) return 'Supreme God'; 

    // ১০টি টিয়ার
    $tiers = [
        0 => 'Member',           // Level 1-9
        1 => 'Active Member',    // Level 10-19
        2 => 'Challenger',       // Level 20-29 (Verified -> Challenger)
        3 => 'Elite',            // Level 30-39
        4 => 'Warrior',          // Level 40-49
        5 => 'Master',           // Level 50-59
        6 => 'Grandmaster',      // Level 60-69
        7 => 'Legend',           // Level 70-79
        8 => 'Mythic',           // Level 80-89
        9 => 'Divine'            // Level 90-99
    ];

    // লেভেল ১-৯ এর জন্য ইনডেক্স ০
    $tierIndex = floor(($level) / 10);
    if ($level < 10) $tierIndex = 0;
    
    $baseName = isset($tiers[$tierIndex]) ? $tiers[$tierIndex] : 'Unknown';
    $subLevel = $level % 10;
    
    $romans = [
        0 => '', // ১০, ২০... লেভেলের জন্য ফাঁকা
        1 => 'I', 2 => 'II', 3 => 'III', 4 => 'IV', 5 => 'V', 
        6 => 'VI', 7 => 'VII', 8 => 'VIII', 9 => 'IX'
    ];
    
    $romanNumeral = isset($romans[$subLevel]) ? $romans[$subLevel] : '';

    if ($level == 1) return 'Member';
    if ($subLevel == 0) return $baseName; 
    
    return trim("$baseName $romanNumeral");
}

function addXP($conn, $user_id, $amount) {
    if (!$user_id) return;

    $stmt = $conn->prepare("SELECT xp, level FROM users WHERE id = ?");
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $user = $stmt->get_result()->fetch_assoc();

    if ($user) {
        $new_xp = (float)$user['xp'] + $amount;
        
        // *** ফিক্স: প্রতি ১০০ XP তে ১ লেভেল ***
        $new_level = floor($new_xp / 100) + 1;
        if ($new_level > 100) $new_level = 100;

        $new_status = getLevelStatus($new_level);

        $update = $conn->prepare("UPDATE users SET xp = ?, level = ?, member_status = ? WHERE id = ?");
        $update->bind_param("disi", $new_xp, $new_level, $new_status, $user_id);
        $update->execute();

        // লেভেল আপ নোটিফিকেশন
        if ($new_level > $user['level']) {
            $msg = "Congratulations! You've reached <b>Level $new_level</b> and your status is now <b>$new_status</b>!";
            sendNotification($conn, $user_id, $msg, 'user_profile:' . $user_id);
        }
    }
}

function parseTagsAndNotify($conn, $text, $context_type, $context_id, $sender_id) {
    preg_match_all('/@([a-zA-Z0-9_]+)@/i', $text, $matches);
    $tagged_usernames = array_unique($matches[1]);

    if (empty($tagged_usernames)) {
        return;
    }

    foreach ($tagged_usernames as $username) {
        $username_escaped = $conn->real_escape_string($username);
        $user_res = $conn->query("SELECT id FROM users WHERE display_name = '$username_escaped'");
        
        if ($user_res && $user_res->num_rows > 0) {
            $tagged_user_id = $user_res->fetch_assoc()['id'];
            
            if ($tagged_user_id != $sender_id) {
                $sender_res = $conn->query("SELECT display_name FROM users WHERE id = $sender_id");
                $sender_name = htmlspecialchars($sender_res->fetch_assoc()['display_name']);
                
                $notification_message = "<b>{$sender_name}</b> tagged you in a post.";
                $link = "home";

                switch ($context_type) {
                    case 'shout': $notification_message = "<b>{$sender_name}</b> tagged you in a shout."; $link = "single_shout_view:{$context_id}"; break;
                    case 'topic': $notification_message = "<b>{$sender_name}</b> tagged you in a topic."; $link = "topic_view:{$context_id}"; break;
                    case 'archive': $notification_message = "<b>{$sender_name}</b> tagged you in an archive."; $link = "archive_view:{$context_id}"; break;
                    case 'topic_reply':
                        $reply_res = $conn->query("SELECT topic_id FROM topic_replies WHERE id = $context_id");
                        if ($reply_res && $reply_res->num_rows > 0) {
                            $topic_id = $reply_res->fetch_assoc()['topic_id'];
                            $notification_message = "<b>{$sender_name}</b> tagged you in a topic reply.";
                            $link = "topic_view:{$topic_id}";
                        }
                        break;
                    case 'archive_reply':
                         $reply_res = $conn->query("SELECT archive_id FROM archive_replies WHERE id = $context_id");
                        if ($reply_res && $reply_res->num_rows > 0) {
                            $archive_id = $reply_res->fetch_assoc()['archive_id'];
                            $notification_message = "<b>{$sender_name}</b> tagged you in an archive reply.";
                            $link = "archive_view:{$archive_id}";
                        }
                        break;
                }
                sendNotification($conn, $tagged_user_id, $notification_message, $link);
            }
        }
    }
}

function postSystemShout($conn, $message) {
    $user_id = SYSTEM_USER_ID;
    $stmt = $conn->prepare("INSERT INTO shouts (user_id, text) VALUES (?, ?)");
    $stmt->bind_param("is", $user_id, $message);
    $stmt->execute();
}

function callGeminiAPI($prompt) {
    $api_key = 'YOUR_GEMINI_API_KEY'; // আপনার Gemini API কী এখানে দিন
    $api_url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=' . $api_key;
    $data = ['contents' => [['parts' => [['text' => $prompt]]]]];
    $payload = json_encode($data);
    $ch = curl_init($api_url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $payload,
        CURLOPT_SSL_VERIFYPEER => false
    ]);
    $response = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($http_code == 200) {
        $result = json_decode($response, true);
        return $result['candidates'][0]['content']['parts'][0]['text'] ?? "দুঃখিত, আমি উত্তর তৈরি করতে পারিনি।";
    } else {
        $error_details = json_decode($response, true);
        $error_message = $error_details['error']['message'] ?? 'সার্ভার থেকে কোনো নির্দিষ্ট উত্তর পাওয়া যায়নি।';
        return "দুঃখিত, AI সার্ভিসের সাথে যোগাযোগ করতে সমস্যা হচ্ছে। (HTTP Code: " . $http_code . " - Error: " . $error_message . ")";
    }
}

function callImageGenerationAPI($prompt) {
    $hf_api_key = 'YOUR_HUGGING_FACE_API_KEY'; // আপনার Hugging Face API কী এখানে দিন

    if ($hf_api_key === 'YOUR_HUGGING_FACE_API_KEY') {
        return 'দুঃখিত, ইমেজ জেনারেশন সেটআপ করা হয়নি। অ্যাডমিনকে একটি Hugging Face API Key যোগ করতে হবে।';
    }

    $api_url = "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0";
    $data = [
        'inputs' => $prompt,
        'options' => [ 'use_cache' => false, 'wait_for_model' => true ]
    ];
    $payload = json_encode($data);

    $ch = curl_init($api_url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => [
            'Authorization: Bearer ' . $hf_api_key,
            'Content-Type: application/json'
        ],
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $payload,
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_TIMEOUT => 120
    ]);

    $response = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($http_code == 200) {
        $upload_dir = __DIR__ . '/../../uploads/generated_images/';
        if (!is_dir($upload_dir)) {
            if (!mkdir($upload_dir, 0777, true)) {
                return 'Server error: Could not create the image storage directory.';
            }
        }
        if (!is_writable($upload_dir)) {
            return 'Server error: The image storage directory is not writable.';
        }
        $file_name = 'generated_image_' . time() . '.jpeg';
        $file_path = $upload_dir . $file_name;
        if (file_put_contents($file_path, $response) === false) {
            return 'Server error: Could not save the generated image.';
        }
        $image_url = 'https://' . $_SERVER['HTTP_HOST'] . '/uploads/generated_images/' . $file_name;
        return $image_url;
    } else {
        $error_details = json_decode($response, true);
        $error_message = $error_details['error'] ?? 'Unknown error';
        return "Image generation failed. (HTTP Code: " . $http_code . " - Error: " . $error_message . ")";
    }
}
?>