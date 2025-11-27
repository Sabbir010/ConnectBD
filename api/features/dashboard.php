<?php
// api/features/dashboard.php

if (!$is_admin) {
    $response['message'] = 'You do not have permission to view this page.';
    echo json_encode($response);
    exit;
}

switch ($action) {
    case 'get_dashboard_stats':
        // Stat Cards Data
        $new_users = $conn->query("SELECT COUNT(id) as count FROM users WHERE created_at > NOW() - INTERVAL 24 HOUR")->fetch_assoc()['count'];
        $total_shouts = $conn->query("SELECT COUNT(id) as count FROM shouts")->fetch_assoc()['count'];
        $pending_reports = $conn->query("SELECT COUNT(id) as count FROM reports WHERE status = 'pending'")->fetch_assoc()['count'];
        $total_members = $conn->query("SELECT COUNT(id) as count FROM users")->fetch_assoc()['count'];

        // User Registrations Chart Data (Last 7 days)
        $registration_chart_data = [];
        for ($i = 6; $i >= 0; $i--) {
            $date = date('Y-m-d', strtotime("-$i days"));
            $count = $conn->query("SELECT COUNT(id) as count FROM users WHERE DATE(created_at) = '$date'")->fetch_assoc()['count'];
            $registration_chart_data['labels'][] = date('D, M j', strtotime($date));
            $registration_chart_data['data'][] = $count;
        }
        
        // Content Overview Chart Data
        $total_topics = $conn->query("SELECT COUNT(id) as count FROM topics")->fetch_assoc()['count'];
        $total_archives = $conn->query("SELECT COUNT(id) as count FROM archives")->fetch_assoc()['count'];
        $total_pms = $conn->query("SELECT COUNT(id) as count FROM private_messages")->fetch_assoc()['count'];
        
        $content_overview_data = [
            'labels' => ['Shouts', 'Topics', 'Archives', 'Private Messages'],
            'data' => [$total_shouts, $total_topics, $total_archives, $total_pms]
        ];

        $response = [
            'status' => 'success',
            'stats' => [
                'new_users' => $new_users,
                'total_shouts' => $total_shouts,
                'pending_reports' => $pending_reports,
                'total_members' => $total_members
            ],
            'charts' => [
                'registrations' => $registration_chart_data,
                'content_overview' => $content_overview_data
            ]
        ];
        break;
}
?>