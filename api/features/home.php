<?php
// api/features/home.php


switch ($action) {
    case 'get_home_details':
        $response = [
            'status' => 'success',
            'server_time' => date('Y-m-d H:i:s')
        ];
        break;
}
?>