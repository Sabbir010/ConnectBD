<?php
// api/features/bbcode.php

if (!$current_user_id) {
    $response['message'] = 'You must be logged in.';
    echo json_encode($response);
    exit;
}

// *** ফিক্স: ব্যবহারকারী প্রিমিয়াম কিনা, সেই চেকটি এখান থেকে সরিয়ে দেওয়া হয়েছে ***
// এখন এই ফাইলটি সব ধরনের ব্যবহারকারীর জন্য BBCode পার্স করতে পারবে।

switch ($action) {
    case 'parse_bbcode':
        $text = $_POST['text'] ?? '';
        $viewer_id = (int)($_POST['viewer_id'] ?? $current_user_id);

        if (empty($text)) {
            $response = ['status' => 'success', 'html' => ''];
            break;
        }

        $viewer_name = 'Guest';
        if ($viewer_id > 0) {
            $viewer_res = $conn->query("SELECT display_name FROM users WHERE id = $viewer_id");
            if ($viewer_res) {
                $viewer_name = $viewer_res->fetch_assoc()['display_name'];
            }
        }

        $text = htmlspecialchars($text, ENT_QUOTES, 'UTF-8');
        $text = preg_replace('/\[b\](.*?)\[\/b\]/i', '<strong>$1</strong>', $text);
        $text = preg_replace('/\[u\](.*?)\[\/u\]/i', '<u>$1</u>', $text);
        $text = preg_replace('/\[i\](.*?)\[\/i\]/i', '<em>$1</em>', $text);
        $text = preg_replace('/\[br\/\]/i', '<br>', $text);
        $text = preg_replace('/\[big\](.*?)\[\/big\]/i', '<span style="font-size: 1.2em;">$1</span>', $text);
        $text = preg_replace('/\[small\](.*?)\[\/small\]/i', '<span style="font-size: 0.8em;">$1</span>', $text);
        $text = preg_replace('/\[clr=(.*?)\](.*?)\[\/clr\]/i', '<span style="color: $1;">$2</span>', $text);

        $page_shortcuts = [
            'shout' => 'shout_history', 'gshop' => 'gifts', 'tshop' => 'theme_shop',
            'topics' => 'topics', 'archives' => 'archives', 'friends' => 'friends',
            'inbox' => 'inbox', 'notifications' => 'notifications', 'goldcoin' => 'gold_coin',
            'premium' => 'buy_premium', 'games' => 'games', 'lottery' => 'lottery',
            'stats' => 'statistics', 'quizzes' => 'quizzes', 'profile' => 'user_profile/' . $viewer_id,
            'editprofile' => 'edit_profile',
        ];
        foreach ($page_shortcuts as $code => $view) {
            $text = preg_replace_callback('/\[(' . $code . ')\]/i', function($matches) use ($view) {
                $url = '/' . str_replace('/', '', $view);
                $page_name = ucwords(str_replace('_', ' ', basename($view)));
                 return "<a href=\"{$url}\" class=\"bbcode-link\">{$page_name}</a>";
            }, $text);
        }

        $text = preg_replace_callback('/\[t=(\d+)\]/i', function($matches) use ($conn) {
            $topic_id = (int)$matches[1];
            $topic_res = $conn->query("SELECT title FROM topics WHERE id = $topic_id");
            if ($topic_res && $topic_res->num_rows > 0) {
                $title = htmlspecialchars($topic_res->fetch_assoc()['title']);
                return "<a href=\"/topic_view?id={$topic_id}\" class=\"bbcode-link\">{$title}</a>";
            }
            return '[Invalid Topic ID]';
        }, $text);

        $text = preg_replace_callback('/\[s=(\d+)\]/i', function($matches) use ($conn) {
            $shout_id = (int)$matches[1];
            $shout_res = $conn->query("SELECT text FROM shouts WHERE id = $shout_id");
            if ($shout_res && $shout_res->num_rows > 0) {
                $shout_text = $shout_res->fetch_assoc()['text'];
                $truncated_text = htmlspecialchars((mb_strlen($shout_text) > 30) ? mb_substr($shout_text, 0, 30) . '...' : $shout_text);
                return "<a href=\"/shout_history#shout-{$shout_id}\" class=\"bbcode-link\">{$truncated_text}</a>";
            }
            return '[Invalid Shout ID]';
        }, $text);

        $text = preg_replace_callback('/\[a=(\d+)\]/i', function($matches) use ($conn) {
            $archive_id = (int)$matches[1];
            $archive_res = $conn->query("SELECT title FROM archives WHERE id = $archive_id AND status = 'approved'");
            if ($archive_res && $archive_res->num_rows > 0) {
                $title = htmlspecialchars($archive_res->fetch_assoc()['title']);
                return "<a href=\"/archive_view?id={$archive_id}\" class=\"bbcode-link\">{$title}</a>";
            }
            return '[Invalid Archive ID]';
        }, $text);
        
        $text = preg_replace_callback('/@([a-zA-Z0-9_]+)@/i', function($matches) use ($conn) {
            $username = $conn->real_escape_string($matches[1]);
            $user_res = $conn->query("SELECT id, display_name FROM users WHERE display_name = '$username'");
            if ($user_res && $user_res->num_rows > 0) {
                $user = $user_res->fetch_assoc();
                $tagged_user_name = htmlspecialchars($user['display_name']);
                return "<strong>(Tagged: {$tagged_user_name})</strong>";
            }
            return "@{$matches[1]}@";
        }, $text);
        
        $text = preg_replace('/\[user\]/i', "<strong>" . htmlspecialchars($viewer_name) . "</strong>", $text);
        $text = preg_replace('/\[youtube=(.*?)\](.*?)\[\/youtube\]/i', '<div class="youtube-embed"><iframe width="100%" height="315" src="https://www.youtube.com/embed/$1" frameborder="0" allowfullscreen></iframe><p class="youtube-caption">$2</p></div>', $text);

        $response = ['status' => 'success', 'html' => $text];
        break;

    default:
        $response['message'] = 'Invalid BBCode action.';
        break;
}
?>