<?php
/**
 * ============================================
 * ADD THIS CODE TO YOUR EXISTING ajax.php FILE
 * ============================================
 * 
 * This handles the therapist availability AJAX request
 * Just copy this entire block and paste it at the end of your ajax.php file
 */

// ============================================
// AJAX HANDLER: Get Therapist Availability
// ============================================

/**
 * Handle AJAX request to get therapist availability from Amelia
 * Called from calendar.js when Step 2 (calendar) is loaded
 */
add_action('wp_ajax_tb_get_therapist_availability', 'tb_ajax_get_therapist_availability');
add_action('wp_ajax_nopriv_tb_get_therapist_availability', 'tb_ajax_get_therapist_availability');

function tb_ajax_get_therapist_availability() {
    
    // Log the request
    tb_log('[TB AJAX] === Availability Request Received ===');
    tb_log('[TB AJAX] POST data: ' . print_r($_POST, true));
    tb_log('[TB AJAX] POST Therapist Data: ' . ($_POST['therapist'] ?? 'NOT SET'));
    
    // Verify nonce for security
    if (!isset($_POST['nonce']) || !wp_verify_nonce($_POST['nonce'], 'tb_booking')) {
        tb_log('[TB AJAX] ✗ Nonce verification failed');
        tb_log('[TB AJAX] Nonce received: ' . ($_POST['nonce'] ?? 'NOT SET'));
        
        wp_send_json_error([
            'message' => 'Security check failed',
            'debug' => [
                'nonce_received' => isset($_POST['nonce']) ? 'yes' : 'no',
                'nonce_value' => $_POST['nonce'] ?? 'not_set'
            ]
        ], 403);
        return;
    }
    
    tb_log('[TB AJAX] ✓ Nonce verified successfully');
    
    // Start session if not already started
    if (!session_id()) {
        session_start();
    }
    
    // Parse therapist data (it's stored as JSON string)
    $therapist_id  = null;
    $therapist_obj = null;

    $therapist_raw = isset($_POST['therapist']) 
        ? wp_unslash($_POST['therapist']) 
        : '';

    $therapist_data = json_decode($therapist_raw, true);

    if (json_last_error() !== JSON_ERROR_NONE) {
        wp_send_json_error(['message' => 'Invalid therapist data']);
    }

    $therapist_id = isset($therapist_data) ? intval($therapist_data['id']) : 0;

    // Validate therapist ID
    if( !$therapist_id || empty($therapist_id) || $therapist_id <= 0 ){
        wp_send_json_error([
            'message' => 'No therapist data found in session',
            'debug' => [
                'session_exists' => session_id() ? 'yes' : 'no',
                'session_id' => session_id(),
                'all_session_keys' => array_keys($_SESSION),
                'therapist_data' => $therapist_data
            ]
        ], 400);
    }

    tb_log('[TB AJAX] POST Data - tb_therapist: ' . ($therapist_data ?? 'NULL'));
    
    // Extract service_id and location_id from POST (with fallback to defaults)
    $service_id = isset($_POST['service_id']) ? intval($_POST['service_id']) : 84;
    $location_id = isset($_POST['location_id']) ? intval($_POST['location_id']) : 1;
    
    tb_log('[TB AJAX] POST Data - service_id: ' . $service_id . ', location_id: ' . $location_id);
        
    // Include the Amelia integration file
    $integration_file = TB_DIR . 'includes/amelia-integration.php';
    
    if (!file_exists($integration_file)) {
        tb_log('[TB AJAX] ✗ Amelia integration file not found: ' . $integration_file);
        
        wp_send_json_error([
            'message' => 'Amelia integration file not found',
            'file_path' => $integration_file
        ], 500);
        return;
    }
    
    require_once $integration_file;
    tb_log('[TB AJAX] ✓ Amelia integration file loaded');
    
    // Get availability data
    try {
        tb_log('[TB AJAX] Fetching availability for therapist ID: ' . $therapist_id . ', Service: ' . $service_id . ', Location: ' . $location_id);
        
        $availability = tb_get_therapist_availability($therapist_id, $service_id, $location_id);
        
        tb_log('[TB AJAX] ✓ Availability data retrieved successfully');
        tb_log('[TB AJAX] Data summary: ' . json_encode([
            'disabled_dates' => count($availability['disabledDates'] ?? []),
            'booked_dates' => count($availability['bookedDates'] ?? []),
            'available_dates' => count($availability['availableDates'] ?? []),
            'timeslot_dates' => count($availability['timeSlots'] ?? [])
        ]));
        
        // Success response
        wp_send_json_success([
            'message' => 'Availability data retrieved successfully',
            'therapist_id' => $therapist_id,
            'therapist_name' => isset($therapist_obj['name']) ? $therapist_obj['name'] : 'Unknown',
            'data' => $availability
        ]);
        
    } catch (Exception $e) {
        // Error response
        tb_log('[TB AJAX] ✗ Error fetching availability: ' . $e->getMessage());
        tb_log('[TB AJAX] Stack trace: ' . $e->getTraceAsString());
        
        wp_send_json_error([
            'message' => 'Failed to fetch availability data',
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ], 500);
    }
}

// ============================================
// END OF CODE TO ADD
// ============================================


// ============================================
// AJAX handler for getting therapists
add_action('wp_ajax_tb_get_therapists_for_service', 'tb_ajax_get_therapists');
add_action('wp_ajax_nopriv_tb_get_therapists_for_service', 'tb_ajax_get_therapists');

function tb_ajax_get_therapists() {
    check_ajax_referer('tb_booking', 'nonce');
    
    $service_id = intval($_POST['service_id']);
    $therapists = tb_get_demo_therapists($service_id);
    
    wp_send_json_success([
        'service_id' => $service_id,
        'therapist_count' => count($therapists),
        'therapists' => $therapists
    ]);
}


// AJAX handler for saving selection to PHP session
// ============================================
// Session Management AJAX Handlers
// ============================================

add_action('wp_ajax_tb_save_session', 'tb_save_session_handler');
add_action('wp_ajax_nopriv_tb_save_session', 'tb_save_session_handler');

function tb_save_session_handler() {
    // Disable error output to prevent JSON corruption
    // PHP errors/notices/warnings will break JSON response
    @ini_set('display_errors', 'Off');
    error_reporting(E_ALL);

    check_ajax_referer('tb_booking', 'nonce');
    
    // Start session if not already started
    if (!session_id()) {
        session_start();
    }
    
    $type = sanitize_text_field($_POST['type']);
    $data = $_POST['data']; // Already JSON string
    
    // Create Amelia 3 appointments when datetime is saved
    if( $type == 'userinfo'){

        // Boot Amelia before using its classes
        if (!tb_boot_amelia()) {
            wp_send_json_error(['message' => 'Amelia not available'], 500);
            return;
        }
        
        $service = tb_get_session_selection('service');
        $therapist = tb_get_session_selection('therapist');
        $datetime = tb_get_session_selection('datetime');
        $userinfo = $data;
        $userinfo['notes'] = 'Custom Appointment'; // Add custom note to user info
        $userinfo['name'] = $data['first_name'] . ' ' . $data['last_name']; // Combine first and last name for easier use

        if(!$service || !$therapist || !$datetime || !$userinfo){
            wp_send_json_error([
                'message' => 'Missing required data for appointment creation',
                'service' => $service,
                'therapist' => $therapist,
                'datetime' => $datetime,
                'userinfo' => $userinfo
            ], 400);
            return;
        }

        tb_log("[TB Session] Attempting to create appointment with data:".
            "\nService: " . print_r($service, true) .
            "\nTherapist: " . print_r($therapist, true) .
            "\nDatetime: " . print_r($datetime, true) .
            "\nUser Info: " . print_r($userinfo, true)
        );

        $appointment_result = tb_create_amelia_appointment($service, $therapist, $datetime, $userinfo);
        // $appointment_result['status'] = '0'; // Simulate successful appointment creation for testing

        if($appointment_result['status'] === 'confirmed'){
            tb_log("[TB Session] Appointment created successfully: " . print_r($appointment_result, true));
            // Clear session after successful appointment creation
            foreach (['service', 'therapist', 'datetime', 'userinfo'] as $key) {
                unset($_SESSION['tb_' . $key]);
            }
            wp_send_json_success([
                'message' => 'Selection saved to session and appointment creation simulated',
                'appointment' => $appointment_result,
                'received_data_from_ajax' => [
                    'service' => $service,
                    'therapist' => $therapist,
                    'datetime' => $datetime,
                    'userinfo' => $userinfo
                ]
            ]);
            return;
        } else {
            tb_log("Selection saved to session but appointment creation failed: " . print_r($appointment_result, true));
            wp_send_json_error([
                'message' => 'Selection saved to session but appointment creation failed',
                'appointment_result' => $appointment_result,
                'received_data_from_ajax' => [
                    'service' => $service,
                    'therapist' => $therapist,
                    'datetime' => $datetime,
                    'userinfo' => $userinfo
                ]
            ], 500);
            return;
        }
    }

    
    // Save to session
    $_SESSION['tb_' . $type] = $data;
    // Log for debugging
    tb_log("[TB Session] Saved {$type}: " . $data);
    
    wp_send_json_success([
        'message' => 'Selection Type: '.$type.' saved to session',
        'data' => $data
    ]);
}

add_action('wp_ajax_tb_clear_session', 'tb_clear_session_handler');
add_action('wp_ajax_nopriv_tb_clear_session', 'tb_clear_session_handler');

function tb_clear_session_handler() {
    check_ajax_referer('tb_booking', 'nonce');
    
    if (!session_id()) {
        session_start();
    }
    
    $type = sanitize_text_field($_POST['type']);
    
    if ($type === 'all') {
        // Clear all TB selections
        foreach (['service', 'therapist', 'datetime', 'userinfo'] as $key) {
            unset($_SESSION['tb_' . $key]);
        }
        tb_log("[TB Session] Cleared all selections");
        wp_send_json_success(['message' => 'All selections cleared']);
    } else {
        // Clear specific selection
        unset($_SESSION['tb_' . $type]);
        tb_log("[TB Session] Cleared {$type}");
        wp_send_json_success(['message' => "{$type} cleared"]);
    }
}

/**
 * Helper function to get selection from PHP session
 * @param string $type Type of selection (service, therapist, datetime, userinfo)
 * @return array|null Selection data or null
 */
function tb_get_session_selection($type) {

    if (!session_id()) {
        session_start();
    }

    $key = 'tb_' . $type;

    if (!isset($_SESSION[$key])) {
        return null;
    }

    $value = $_SESSION[$key];

    // If already array → return directly
    if (is_array($value)) {
        return $value;
    }

    // If string → attempt JSON decode
    if (is_string($value)) {
        $decoded = json_decode($value, true);
        return $decoded ?: null;
    }

    return null;
}

/**
 * Helper function to get all selections from PHP session
 * @return array All selections
 */
function tb_get_all_session_selections() {
    if (!session_id()) {
        session_start();
    }
    
    return [
        'service' => tb_get_session_selection('service'),
        'therapist' => tb_get_session_selection('therapist'),
        'datetime' => tb_get_session_selection('datetime'),
        'userinfo' => tb_get_session_selection('userinfo')
    ];
}


//testing endpoint to view session data  

// hello

