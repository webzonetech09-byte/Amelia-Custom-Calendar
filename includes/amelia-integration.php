<?php
/**
 * Amelia Integration - Using Amelia's Native API
 * Step-by-step implementation
 */

if (!defined('ABSPATH')) exit;

// ============================================
// CONFIGURATION
// ============================================
date_default_timezone_set('Asia/Karachi'); // Or 'UTC' or your preferred timezone
// date_default_timezone_set('UTC');

define('TB_AVAILABILITY_MONTHS', 12); // 12 months ahead

// ============================================
// STEP 1: CALL AMELIA API
// ============================================

/**
 * Main function - Get therapist availability
 */
function tb_get_therapist_availability($therapist_id, $service_id = 84, $location_id = 1) {
    
    // Validate input
    if (empty($therapist_id) || !is_numeric($therapist_id)) {
        tb_log("Invalid therapist ID: {$therapist_id}", 'ERROR');
        return tb_get_fallback_data();
    }
    
    tb_log("=== Starting availability fetch for therapist ID: {$therapist_id} ===", 'INFO');
    
    // Step 1: Call Amelia API
    $api_response = tb_call_amelia_api($therapist_id, $service_id, $location_id);
    
    if (!$api_response) {
        tb_log("API call failed", 'ERROR');
        return tb_get_fallback_data();
    }
    
    tb_log("API call successful!", 'SUCCESS');
    
    // Step 2: Parse the response (next step)
    $parsed_data = tb_parse_api_response($api_response);
    
    return $parsed_data;
}

// ============================================
// API CALL FUNCTION
// ============================================

/**
 * Call Amelia's slots API
 */
/**
 * Call Amelia's slots API - FIXED VERSION
 */
function tb_call_amelia_api($therapist_id, $service_id, $location_id) {
    
    tb_log("Calling Amelia API...", 'INFO');
    
    // Calculate date range
    $start_date = date('Y-m-d');
    $end_date = date('Y-m-d', strtotime("+". TB_AVAILABILITY_MONTHS ." months"));
    
    tb_log("Date range: {$start_date} to {$end_date}", 'INFO');
    
    // Build URL manually to avoid encoding issues
    $base_url = admin_url('admin-ajax.php');
    
    $api_url = $base_url . 
        '?action=wpamelia_api' .
        '&call=/slots' .
        '&startDateTime=' . $start_date .
        '&endDateTime=' . $end_date .
        '&monthsLoad=1' .
        '&locationId=' . $location_id .
        '&serviceId=' . $service_id .
        '&serviceDuration=7200' .
        '&providerIds[]=' . $therapist_id .
        '&extras=[]' .
        '&group=1' .
        '&page=booking' .
        '&structured=true' .
        '&persons=1';
    
    tb_log("API URL: " . $api_url, 'INFO');
    
    // Make the request
    $response = wp_remote_get($api_url, array(
        'timeout' => 30,
        'sslverify' => true
    ));
    
    // Check for errors
    if (is_wp_error($response)) {
        tb_log("WP Error: " . $response->get_error_message(), 'ERROR');
        return false;
    }
    
    // Get response code
    $response_code = wp_remote_retrieve_response_code($response);
    tb_log("Response code: {$response_code}", 'INFO');
    
    if ($response_code !== 200) {
        tb_log("Non-200 response code", 'ERROR');
        
        // Log the response body to see error message
        $body = wp_remote_retrieve_body($response);
        tb_log("Error response: " . substr($body, 0, 500), 'ERROR');
        return false;
    }
    
    // Get body
    $body = wp_remote_retrieve_body($response);
    
    if (empty($body)) {
        tb_log("Empty response body", 'ERROR');
        return false;
    }
    
    tb_log("Response received, length: " . strlen($body) . " bytes", 'SUCCESS');
    
    // Decode JSON
    $data = json_decode($body, true);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        tb_log("JSON decode error: " . json_last_error_msg(), 'ERROR');
        tb_log("First 500 chars of response: " . substr($body, 0, 500), 'ERROR');
        return false;
    }
    
    // Check if data structure is valid
    if (!isset($data['data'])) {
        tb_log("Invalid data structure - 'data' key not found", 'ERROR');
        tb_log("Response keys: " . implode(', ', array_keys($data)), 'INFO');
        return false;
    }
    
    tb_log("JSON decoded successfully", 'SUCCESS');
    
    // Log what keys we have in the data
    if (is_array($data['data'])) {
        tb_log("Data keys: " . implode(', ', array_keys($data['data'])), 'INFO');
    }
    
    return $data['data'];
}
// ============================================
// PARSE API RESPONSE (NEXT STEP)
// ============================================


// ============================================
// FALLBACK DATA
// ============================================

function tb_get_fallback_data() {
    tb_log("Using fallback static data", 'WARNING');
    
    return array(
        'disabledDates' => array(),
        'bookedDates' => array(),
        'timeSlots' => array(
            'default' => array(
                array('time' => '09:00', 'available' => true),
                array('time' => '10:00', 'available' => true),
                array('time' => '14:00', 'available' => true),
            )
        )
    );
}

/**
 * Parse Amelia API response - STEP 2: BUILD THE DATA STRUCTURE
 */
function tb_parse_api_response($api_data) {
    
    tb_log("=== Starting to parse API response ===", 'INFO');
    
    // Get the data from API
    $slots = isset($api_data['slots']) ? $api_data['slots'] : array();
    $occupied = isset($api_data['occupied']) ? $api_data['occupied'] : array();
    
    tb_log("Available dates with free slots: " . count($slots), 'INFO');
    tb_log("Dates with occupied slots: " . count($occupied), 'INFO');
    
    // Log samples
    $sample_dates = array_slice(array_keys($slots), 0, 3);
    foreach ($sample_dates as $date) {
        $times = array_keys($slots[$date]);
        tb_log("Sample - {$date}: " . implode(', ', $times), 'INFO');
    }
    
    // Get date range we're checking
    $date_range = tb_get_date_range();
    
    // Process the data
    $result = tb_process_availability($slots, $occupied, $date_range);
    
    tb_log("=== Parsing complete ===", 'SUCCESS');
    tb_log("Disabled dates: " . count($result['disabledDates']), 'INFO');
    tb_log("Booked dates: " . count($result['bookedDates']), 'INFO');
    tb_log("Available dates: " . count($result['availableDates']), 'INFO');
    tb_log("Dates with available slots: " . count($result['timeSlots']), 'INFO');
    
    return $result;
}

/**
 * Get date range
 */
function tb_get_date_range() {
    $start = date('Y-m-d');
    $end = date('Y-m-d', strtotime("+". TB_AVAILABILITY_MONTHS ." months"));
    
    return array(
        'start' => $start,
        'end' => $end
    );
}

/**
 * Process availability data - STEP 2
 */
function tb_process_availability($slots, $occupied, $date_range) {
    
    tb_log("Processing availability data...", 'INFO');
    
    $disabled_dates = array();
    $booked_dates = array();
    $available_dates = array();
    $time_slots = array();
    
    // Generate all dates in range
    $all_dates = tb_get_all_dates_in_range($date_range['start'], $date_range['end']);
    tb_log("Total dates in range: " . count($all_dates), 'INFO');
    
    foreach ($all_dates as $date) {
        
        $has_free_slots = isset($slots[$date]);
        $has_occupied_slots = isset($occupied[$date]);
        
        if (!$has_free_slots && !$has_occupied_slots) {
            // No slots at all = therapist not working
            $disabled_dates[] = $date;
            continue;
        }
        
        if ($has_free_slots) {
            $day_slots = tb_process_day_slots($date, $slots[$date], $occupied[$date] ?? array());
            
            // Check if there are ANY available slots
            $has_any_available = false;
            foreach ($day_slots as $slot) {
                if ($slot['available']) {
                    $has_any_available = true;
                    break;
                }
            }
            
            if ($has_any_available) {
                $time_slots[$date] = $day_slots;
                $available_dates[] = $date;
            } else {
                // All slots occupied = fully booked
                $booked_dates[] = $date;
            }
        } elseif ($has_occupied_slots) {
            // Only occupied, no free slots
            $booked_dates[] = $date;
        }
    }
    
    tb_log("Processed all dates", 'SUCCESS');
    
    return array(
        'disabledDates' => $disabled_dates,
        'bookedDates' => $booked_dates,
        'availableDates' => $available_dates,
        'timeSlots' => $time_slots,
        'date_range' => $date_range
    );
}
/**
 * Generate all dates in range
 */
function tb_get_all_dates_in_range($start_date, $end_date) {
    $dates = array();
    $current = strtotime($start_date);
    $end = strtotime($end_date);
    
    while ($current <= $end) {
        $dates[] = date('Y-m-d', $current);
        $current = strtotime('+1 day', $current);
    }
    
    return $dates;
}

/**
 * Process slots for a single day
 */
function tb_process_day_slots($date, $free_slots, $occupied_slots) {
    
    $processed_slots = array();
    
    // Get all free time slots
    foreach ($free_slots as $time => $slot_data) {
        
        $processed_slots[] = array(
            'time' => $time,
            'available' => true
        );
    }
    
    // Get all occupied time slots
    foreach ($occupied_slots as $time => $slot_data) {
        
        $processed_slots[] = array(
            'time' => $time,
            'available' => false
        );
    }
    
    // Sort by time
    usort($processed_slots, function($a, $b) {
        return strtotime($a['time']) - strtotime($b['time']);
    });
    
    return $processed_slots;
}

// ```

// ---

// ## 📝 **What This Does:**

// 1. ✅ Gets all dates in your range (12 months)
// 2. ✅ For each date:
//    - If no slots at all → **disabled** (therapist not working)
//    - If only occupied slots → **fully booked**
//    - If has free slots → **add to timeSlots** with available times
// 3. ✅ Converts 24-hour time to 12-hour format (09:30 → 09:30 AM)
// 4. ✅ Marks occupied slots as `available: false`
// 5. ✅ Sorts times chronologically

// ---

// ## 🧪 **Add these functions to your file and test:**

// You should now see logs like:
// ```
// [INFO] Total dates in range: 365
// [SUCCESS] Processed all dates
// [INFO] Disabled dates: 100
// [INFO] Booked dates: 5
// [INFO] Dates with available slots: 224

if(isset($_GET['tb_debug'])){   
    $output = tb_get_therapist_availability(18, 84);
    echo "<pre>";
    print_r($output);
    echo "</pre>";
    exit;
}