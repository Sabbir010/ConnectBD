<?php
// api/features/site_settings.php

if (!$is_admin) {
    $response['message'] = 'You do not have permission to access this page.';
    echo json_encode($response);
    exit;
}

switch ($action) {
    case 'get_site_settings':
        $settings_query = "SELECT setting_name, setting_value FROM site_settings";
        $settings_result = $conn->query($settings_query);
        $settings = [];
        while ($row = $settings_result->fetch_assoc()) {
            $settings[$row['setting_name']] = $row['setting_value'];
        }
        $response = ['status' => 'success', 'settings' => $settings];
        break;

    case 'update_site_settings':
        $settings_to_update = $_POST['settings'] ?? [];
        if (!is_array($settings_to_update)) {
            $response['message'] = 'Invalid settings format.';
            break;
        }

        $conn->begin_transaction();
        try {
            foreach ($settings_to_update as $name => $value) {
                $stmt = $conn->prepare("INSERT INTO site_settings (setting_name, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?");
                $stmt->bind_param("sss", $name, $value, $value);
                $stmt->execute();
            }
            $conn->commit();
            $response = ['status' => 'success', 'message' => 'Site settings updated successfully.'];
        } catch (Exception $e) {
            $conn->rollback();
            $response['message'] = 'Failed to update settings: ' . $e->getMessage();
        }
        break;
}
?><?php
// api/features/site_settings.php

if (!$is_admin) {
    $response['message'] = 'You do not have permission to access this page.';
    echo json_encode($response);
    exit;
}

switch ($action) {
    case 'get_site_settings':
        $settings_query = "SELECT setting_name, setting_value FROM site_settings";
        $settings_result = $conn->query($settings_query);
        $settings = [];
        while ($row = $settings_result->fetch_assoc()) {
            $settings[$row['setting_name']] = $row['setting_value'];
        }
        $response = ['status' => 'success', 'settings' => $settings];
        break;

    case 'update_site_settings':
        $settings_to_update = $_POST['settings'] ?? [];
        if (!is_array($settings_to_update)) {
            $response['message'] = 'Invalid settings format.';
            break;
        }

        $conn->begin_transaction();
        try {
            foreach ($settings_to_update as $name => $value) {
                $stmt = $conn->prepare("INSERT INTO site_settings (setting_name, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?");
                $stmt->bind_param("sss", $name, $value, $value);
                $stmt->execute();
            }
            $conn->commit();
            $response = ['status' => 'success', 'message' => 'Site settings updated successfully.'];
        } catch (Exception $e) {
            $conn->rollback();
            $response['message'] = 'Failed to update settings: ' . $e->getMessage();
        }
        break;
}
?>