<?php
// api/features/topics.php

if (!$current_user_id) {
    $response['message'] = 'You must be logged in to perform this action.';
    echo json_encode($response);
    exit;
}

function isUserPremium($conn, $user_id) {
    if (!$user_id) return false;
    $stmt = $conn->prepare("SELECT is_premium FROM users WHERE id = ?");
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $result = $stmt->get_result()->fetch_assoc();
    return $result ? (bool)$result['is_premium'] : false;
}

switch ($action) {
    case 'create_topic':
        $user_perm_stmt = $conn->prepare("SELECT can_post_topic FROM users WHERE id = ?");
        $user_perm_stmt->bind_param("i", $current_user_id);
        $user_perm_stmt->execute();
        $user_perm = $user_perm_stmt->get_result()->fetch_assoc();
        if (!$user_perm || $user_perm['can_post_topic'] == 0) {
            $response['message'] = 'You do not have permission to create new topics.';
            break;
        }

        $title = trim($_POST['title'] ?? '');
        $content = trim($_POST['content'] ?? '');
        $category = trim($_POST['category'] ?? 'General Forum');
        $allowed_categories = ['General Forum', 'Site Official', 'Entertainment Forum', 'Tech Forum', 'Culture n People', 'ConnectBD Rules', 'ConnectBD All Quiz', 'ConnectBD Game', 'Facebook Page'];

        if (!in_array($category, $allowed_categories)) {
            $response['message'] = 'Invalid category selected.';
            break;
        }

        if (!empty($title) && !empty($content)) {
            $stmt = $conn->prepare("INSERT INTO topics (user_id, title, content, category, last_reply_at) VALUES (?, ?, ?, ?, NOW())");
            $stmt->bind_param("isss", $current_user_id, $title, $content, $category);
            if ($stmt->execute()) {
                $topic_id = $conn->insert_id;
                $conn->query("UPDATE users SET total_topics = total_topics + 1 WHERE id = $current_user_id");
                
                parseTagsAndNotify($conn, $content, 'topic', $topic_id, $current_user_id);
                addXP($conn, $current_user_id, 1);

                $response = ['status' => 'success', 'message' => 'Topic created successfully.'];
            } else {
                $response['message'] = 'Failed to create topic.';
            }
        } else {
            $response['message'] = 'Title and content cannot be empty.';
        }
        break;

    case 'get_all_topics':
        $category_filter = $_GET['category'] ?? 'all';
        $page = (int)($_GET['page'] ?? 1);
        $topics_per_page = 10;
        $offset = ($page - 1) * $topics_per_page;
        $allowed_categories = ['General Forum', 'Site Official', 'Entertainment Forum', 'Tech Forum', 'Culture n People', 'ConnectBD Rules', 'ConnectBD All Quiz', 'ConnectBD Game', 'Facebook Page'];
        
        $where_clause = "WHERE t.is_pinned = 0";
        if ($category_filter !== 'all' && in_array($category_filter, $allowed_categories)) {
            $where_clause .= " AND t.category = '" . $conn->real_escape_string($category_filter) . "'";
        }
        
        $total_topics_res = $conn->query("SELECT COUNT(t.id) as total FROM topics t $where_clause");
        $total_topics = $total_topics_res->fetch_assoc()['total'];
        $total_pages = ceil($total_topics / $topics_per_page);
        
        $pinned_topics = [];
        if ($page === 1) {
            $pinned_where_clause = "WHERE t.is_pinned = 1";
            if ($category_filter !== 'all' && in_array($category_filter, $allowed_categories)) {
                $pinned_where_clause .= " AND t.category = '" . $conn->real_escape_string($category_filter) . "'";
            }
            // *** Updated SELECT ***
            $pinned_topics_query = "SELECT t.id, t.title, t.category, t.created_at, t.is_closed, u.display_name, u.capitalized_username, u.username_color, u.is_verified, u.is_special, u.is_premium, u.premium_expires_at, u.role, u.display_role, u.member_status FROM topics t JOIN users u ON t.user_id = u.id $pinned_where_clause ORDER BY t.last_reply_at DESC";
            $pinned_topics = $conn->query($pinned_topics_query)->fetch_all(MYSQLI_ASSOC);
        }
        
        // *** Updated SELECT ***
        $query = "SELECT t.id, t.title, t.category, t.created_at, t.is_closed, u.display_name, u.capitalized_username, u.username_color, u.is_verified, u.is_special, u.is_premium, u.premium_expires_at, u.role, u.display_role, u.member_status FROM topics t JOIN users u ON t.user_id = u.id $where_clause ORDER BY t.last_reply_at DESC LIMIT ?, ?";
        $stmt = $conn->prepare($query);
        $stmt->bind_param("ii", $offset, $topics_per_page);
        $stmt->execute();
        $topics = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        
        $response = ['status' => 'success', 'pinned_topics' => $pinned_topics, 'topics' => $topics, 'pagination' => ['currentPage' => $page, 'totalPages' => $total_pages, 'category' => $category_filter]];
        break;

    case 'get_topic_details':
        $topic_id = (int)($_GET['topic_id'] ?? 0);
        $reply_id = (int)($_GET['reply_id'] ?? 0);
        $page = (int)($_GET['page'] ?? 1);
        $replies_per_page = 7;

        if ($reply_id > 0) {
            $reply_info_stmt = $conn->prepare("SELECT topic_id, (SELECT COUNT(*) FROM topic_replies tr2 WHERE tr2.topic_id = tr1.topic_id AND tr2.id <= tr1.id) as reply_position FROM topic_replies tr1 WHERE id = ?");
            $reply_info_stmt->bind_param("i", $reply_id);
            $reply_info_stmt->execute();
            $reply_info = $reply_info_stmt->get_result()->fetch_assoc();
            
            if ($reply_info) {
                $topic_id = $reply_info['topic_id'];
                $page = ceil($reply_info['reply_position'] / $replies_per_page);
            } else {
                $response['message'] = 'Reply not found.';
                echo json_encode($response);
                exit;
            }
        }

        $offset = ($page - 1) * $replies_per_page;

        if ($topic_id > 0) {
            // *** Updated SELECT ***
            $stmt_topic = $conn->prepare("
                SELECT t.*, u.display_name, u.capitalized_username, u.username_color, u.photo_url, u.role, u.display_role, u.is_verified, u.is_special, u.is_premium, u.premium_expires_at, u.member_status, editor.display_name as editor_name 
                FROM topics t 
                JOIN users u ON t.user_id = u.id 
                LEFT JOIN users editor ON t.last_edited_by = editor.id
                WHERE t.id = ?");
            $stmt_topic->bind_param("i", $topic_id);
            $stmt_topic->execute();
            $topic = $stmt_topic->get_result()->fetch_assoc();

            if ($topic) {
                if ($current_user_id != $topic['user_id']) {
                    $conn->query("UPDATE topics SET views = views + 1 WHERE id = $topic_id");
                    $topic['views']++; 
                }
                
                $replies = [];
                $total_replies_res = $conn->query("SELECT COUNT(id) as total FROM topic_replies WHERE topic_id = $topic_id");
                $total_replies = $total_replies_res->fetch_assoc()['total'];
                $total_pages = 0;

                if ($topic['replies_hidden_by'] === NULL || $topic['replies_hidden_by'] == $current_user_id) {
                    $total_pages = ceil($total_replies / $replies_per_page);
                    if ($total_replies > 0) {
                        // *** Updated SELECT ***
                        $replies_query = "SELECT tr.*, u.display_name, u.capitalized_username, u.username_color, u.photo_url, u.role, u.display_role, u.is_premium, u.premium_expires_at, u.is_verified, u.is_special, u.member_status FROM topic_replies tr JOIN users u ON tr.user_id = u.id WHERE tr.topic_id = ? ORDER BY tr.created_at ASC LIMIT ?, ?";
                        $stmt_replies = $conn->prepare($replies_query);
                        $stmt_replies->bind_param("iii", $topic_id, $offset, $replies_per_page);
                        $stmt_replies->execute();
                        $replies = $stmt_replies->get_result()->fetch_all(MYSQLI_ASSOC);
                    }
                }
                
                $topic['replies_count'] = $total_replies;
                $pagination_data = ['currentPage' => $page, 'totalPages' => $total_pages];
                $response = ['status' => 'success', 'topic' => $topic, 'replies' => $replies, 'pagination' => $pagination_data];
            } else {
                $response['message'] = 'Topic not found.';
            }
        } else {
            $response['message'] = 'Invalid Topic ID.';
        }
        break;
    
    case 'post_topic_reply':
        $topic_id = (int)($_POST['topic_id'] ?? 0);
        $content = trim($_POST['content'] ?? '');

        $topic_status_res = $conn->query("SELECT is_closed, user_id, title FROM topics WHERE id = $topic_id");
        if ($topic_status_res->num_rows === 0) {
             $response['message'] = 'Topic not found.';
             break;
        }
        $topic_status = $topic_status_res->fetch_assoc();
        
        if ($topic_status['is_closed']) {
            $response['message'] = 'This topic is closed. No new replies are allowed.';
            break;
        }

        if ($topic_id > 0 && !empty($content)) {
            $stmt = $conn->prepare("INSERT INTO topic_replies (topic_id, user_id, content) VALUES (?, ?, ?)");
            $stmt->bind_param("iis", $topic_id, $current_user_id, $content);
            if ($stmt->execute()) {
                $reply_id = $conn->insert_id;
                $conn->query("UPDATE topics SET last_reply_at = NOW() WHERE id = $topic_id");

                parseTagsAndNotify($conn, $content, 'topic_reply', $reply_id, $current_user_id);
                addXP($conn, $current_user_id, 0.50);
                
                $response = ['status' => 'success', 'message' => 'Reply posted successfully.'];
                
                $topic_owner_id = $topic_status['user_id'];
                $topic_title = $topic_status['title'];
                $replier_res = $conn->query("SELECT display_name FROM users WHERE id = $current_user_id");
                $replier_name = $replier_res->fetch_assoc()['display_name'];
                
                if ($topic_owner_id != $current_user_id) {
                    $reply_notification_msg = "<b>{$replier_name}</b> replied to your topic: \"<b>{$topic_title}</b>\"";
                    $link = "topic_view:{$topic_id}";
                    sendNotification($conn, $topic_owner_id, $reply_notification_msg, $link);
                }
            } else {
                $response['message'] = 'Failed to post reply.';
            }
        } else {
            $response['message'] = 'Invalid data.';
        }
        break;

    case 'toggle_pin_topic':
        if (!$is_staff) { $response['message'] = 'You do not have permission.'; break; }
        $topic_id = (int)($_POST['topic_id'] ?? 0);
        if ($topic_id > 0) {
            $conn->query("UPDATE topics SET is_pinned = !is_pinned WHERE id = $topic_id");
            $response = ['status' => 'success', 'message' => 'Pin status toggled.'];
        } else {
            $response['message'] = 'Invalid Topic ID.';
        }
        break;

    case 'toggle_close_topic':
        $topic_id = (int)($_POST['topic_id'] ?? 0);
        $owner_res = $conn->query("SELECT user_id FROM topics WHERE id=$topic_id");
        if ($owner_res->num_rows > 0) {
            $owner_id = $owner_res->fetch_assoc()['user_id'];
            if ($current_user_id == $owner_id || $is_staff) {
                $conn->query("UPDATE topics SET is_closed = !is_closed WHERE id = $topic_id");
                $response = ['status' => 'success', 'message' => 'Topic close status toggled.'];
            } else {
                $response['message'] = 'You do not have permission.';
            }
        } else {
             $response['message'] = 'Topic not found.';
        }
        break;

    case 'move_topic':
        if (!$is_staff) { $response['message'] = 'You do not have permission.'; break; }
        $topic_id = (int)($_POST['topic_id'] ?? 0);
        $new_category = trim($_POST['category'] ?? '');
        $allowed_categories = ['General Forum', 'Site Official', 'Entertainment Forum', 'Tech Forum', 'Culture n People', 'ConnectBD Rules', 'ConnectBD All Quiz', 'ConnectBD Game', 'Facebook Page'];
        
        if ($topic_id > 0 && in_array($new_category, $allowed_categories)) {
            $stmt = $conn->prepare("UPDATE topics SET category = ? WHERE id = ?");
            $stmt->bind_param("si", $new_category, $topic_id);
            $stmt->execute();
            $response = ['status' => 'success', 'message' => "Topic moved to $new_category."];
        } else {
            $response['message'] = 'Invalid data.';
        }
        break;

    case 'shout_topic':
        $topic_id = (int)($_POST['topic_id'] ?? 0);
        $topic_res = $conn->query("SELECT title FROM topics WHERE id=$topic_id");
        if ($topic_res->num_rows > 0) {
            $topic_data = $topic_res->fetch_assoc();
            $topic_title = $topic_data['title'];
            $shout_message = "Check out this topic: " . $topic_title;
            postSystemShout($conn, $shout_message);
            $response = ['status' => 'success', 'message' => 'Topic has been shouted successfully!'];
        } else {
            $response['message'] = 'Topic not found.';
        }
        break;
        
    case 'delete_topic':
        $topic_id = (int)($_POST['topic_id'] ?? 0);
        $owner_res = $conn->query("SELECT user_id FROM topics WHERE id=$topic_id");
        if($owner_res->num_rows > 0) {
            $owner_id = $owner_res->fetch_assoc()['user_id'];
            if ($current_user_id == $owner_id || $is_staff) {
                $conn->query("DELETE FROM topic_replies WHERE topic_id = $topic_id");
                $conn->query("DELETE FROM topics WHERE id = $topic_id");
                $response = ['status' => 'success', 'message' => 'Topic and all its replies have been deleted.'];
            } else {
                 $response['message'] = 'You do not have permission to delete this topic.';
            }
        } else {
            $response['message'] = 'Topic not found.';
        }
        break;
        
    case 'edit_topic':
        $topic_id = (int)($_POST['topic_id'] ?? 0);
        $title = trim($_POST['title'] ?? '');
        $content = trim($_POST['content'] ?? '');

        $owner_res = $conn->query("SELECT user_id FROM topics WHERE id = $topic_id");
        if ($owner_res->num_rows > 0) {
            $owner_id = $owner_res->fetch_assoc()['user_id'];
            
            $is_premium = isUserPremium($conn, $current_user_id);

            if ($topic_id > 0 && !empty($title) && !empty($content) && (($current_user_id == $owner_id && $is_premium) || $is_staff)) {
                $update_stmt = $conn->prepare("UPDATE topics SET title = ?, content = ?, last_edited_by = ?, last_edited_at = NOW() WHERE id = ?");
                $update_stmt->bind_param("ssii", $title, $content, $current_user_id, $topic_id);
                if ($update_stmt->execute()) {
                    parseTagsAndNotify($conn, $content, 'topic', $topic_id, $current_user_id);
                    $response = ['status' => 'success', 'message' => 'Topic updated successfully.'];
                } else {
                    $response['message'] = 'Failed to update topic.';
                }
            } else {
                $response['message'] = 'You do not have permission to edit this topic. Only Staff or Premium Owners can edit.';
            }
        } else {
            $response['message'] = 'Topic not found.';
        }
        break;

    case 'get_topic_stats':
        $last_post_query = "SELECT t.id, t.title, u.display_name, u.id as user_id 
                            FROM topics t 
                            JOIN users u ON t.user_id = u.id 
                            ORDER BY t.created_at DESC LIMIT 1";
        $last_post = $conn->query($last_post_query)->fetch_assoc();

        $random_topic_query = "SELECT id, title FROM topics ORDER BY RAND() LIMIT 1";
        $random_topic = $conn->query($random_topic_query)->fetch_assoc();

        $total_users = $conn->query("SELECT COUNT(id) as count FROM users")->fetch_assoc()['count'];
        $total_posts = $conn->query("SELECT (SELECT COUNT(id) FROM topics) + (SELECT COUNT(id) FROM topic_replies) as total")->fetch_assoc()['total'];

        $response = [
            'status' => 'success',
            'stats' => [
                'last_post' => $last_post,
                'random_topic' => $random_topic,
                'total_users' => $total_users,
                'total_posts' => $total_posts
            ]
        ];
        break;

    case 'toggle_replies_visibility':
        $topic_id = (int)($_POST['topic_id'] ?? 0);
        $owner_res = $conn->query("SELECT user_id, replies_hidden_by FROM topics WHERE id=$topic_id");
        if ($owner_res->num_rows > 0) {
            $topic_data = $owner_res->fetch_assoc();
            $owner_id = $topic_data['user_id'];
            $hidden_by = $topic_data['replies_hidden_by'];

            if ($current_user_id == $owner_id || $is_staff) {
                if ($hidden_by === NULL) {
                    $conn->query("UPDATE topics SET replies_hidden_by = $current_user_id WHERE id = $topic_id");
                    $response = ['status' => 'success', 'message' => 'Replies are now hidden and visible only to you.'];
                } else {
                    $conn->query("UPDATE topics SET replies_hidden_by = NULL WHERE id = $topic_id");
                    $response = ['status' => 'success', 'message' => 'Replies are now visible to everyone.'];
                }
            } else {
                $response['message'] = 'You do not have permission.';
            }
        } else {
             $response['message'] = 'Topic not found.';
        }
        break;

    case 'search_topics':
        $text = $_GET['text'] ?? '';
        $in = $_GET['in'] ?? 'topic_name';
        $order = $_GET['order'] ?? 'newest';
        
        $search_text = '%' . $conn->real_escape_string($text) . '%';
        $order_by = ($order === 'oldest') ? 'ASC' : 'DESC';

        $query = "";
        if ($in === 'topic_name') {
            // *** Updated SELECT ***
            $query = "SELECT t.id, t.title, t.category, t.created_at, u.display_name, u.capitalized_username, u.username_color, u.is_verified, u.is_special FROM topics t JOIN users u ON t.user_id = u.id WHERE t.title LIKE ? ORDER BY t.created_at $order_by";
            $stmt = $conn->prepare($query);
            $stmt->bind_param("s", $search_text);
        } else {
            // *** Updated SELECT ***
            $query = "SELECT t.id, t.title, t.category, t.created_at, u.display_name, u.capitalized_username, u.username_color, u.is_verified, u.is_special 
                      FROM topics t 
                      JOIN users u ON t.user_id = u.id 
                      WHERE t.title LIKE ? OR t.content LIKE ? OR t.id IN (SELECT topic_id FROM topic_replies WHERE content LIKE ?)
                      ORDER BY t.created_at $order_by";
            $stmt = $conn->prepare($query);
            $stmt->bind_param("sss", $search_text, $search_text, $search_text);
        }
        
        $stmt->execute();
        $results = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        $response = ['status' => 'success', 'results' => $results];
        break;
    
    case 'get_reply_details':
        $reply_id = (int)($_GET['reply_id'] ?? 0);
        if ($reply_id > 0) {
            $stmt = $conn->prepare("SELECT * FROM topic_replies WHERE id = ?");
            $stmt->bind_param("i", $reply_id);
            $stmt->execute();
            $reply = $stmt->get_result()->fetch_assoc();
            
            if ($reply) {
                $owner_id = $reply['user_id'];
                
                $user_perm_stmt = $conn->prepare("SELECT role FROM users WHERE id = ?");
                $user_perm_stmt->bind_param("i", $current_user_id);
                $user_perm_stmt->execute();
                $current_user_role = $user_perm_stmt->get_result()->fetch_assoc()['role'];
                
                $is_staff = in_array($current_user_role, ['Admin', 'Senior Moderator', 'Moderator']);
                $is_premium = isUserPremium($conn, $current_user_id);
                $is_owner = ($current_user_id == $owner_id);

                if ($is_staff || ($is_owner && $is_premium)) {
                     $response = ['status' => 'success', 'reply' => $reply];
                } else {
                     $response['message'] = 'You do not have permission to edit this reply.';
                }
            } else {
                $response['message'] = 'Reply not found.';
            }
        } else {
            $response['message'] = 'Invalid Reply ID.';
        }
        break;

    case 'edit_reply':
        $reply_id = (int)($_POST['reply_id'] ?? 0);
        $content = trim($_POST['content'] ?? '');

        if ($reply_id > 0 && !empty($content)) {
            $stmt = $conn->prepare("SELECT user_id FROM topic_replies WHERE id = ?");
            $stmt->bind_param("i", $reply_id);
            $stmt->execute();
            $reply = $stmt->get_result()->fetch_assoc();

            if ($reply) {
                $owner_id = $reply['user_id'];
                
                $user_perm_stmt = $conn->prepare("SELECT role FROM users WHERE id = ?");
                $user_perm_stmt->bind_param("i", $current_user_id);
                $user_perm_stmt->execute();
                $current_user_role = $user_perm_stmt->get_result()->fetch_assoc()['role'];

                $is_staff = in_array($current_user_role, ['Admin', 'Senior Moderator', 'Moderator']);
                $is_premium = isUserPremium($conn, $current_user_id);
                $is_owner = ($current_user_id == $owner_id);

                if ($is_staff || ($is_owner && $is_premium)) {
                    $update_stmt = $conn->prepare("UPDATE topic_replies SET content = ? WHERE id = ?");
                    $update_stmt->bind_param("si", $content, $reply_id);
                    if ($update_stmt->execute()) {
                        parseTagsAndNotify($conn, $content, 'topic_reply', $reply_id, $current_user_id);
                        $response = ['status' => 'success', 'message' => 'Reply updated successfully.'];
                    } else {
                        $response['message'] = 'Failed to update reply.';
                    }
                } else {
                    $response['message'] = 'You do not have permission to edit this reply.';
                }
            } else {
                $response['message'] = 'Reply not found.';
            }
        } else {
            $response['message'] = 'Invalid data.';
        }
        break;
}
?>