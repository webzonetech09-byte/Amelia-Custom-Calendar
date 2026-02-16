<?php
/**
 * Calendar Data Provider
 * 
 * This file now acts as a bridge between static data and dynamic Amelia data
 * It will be called on initial page load, but the frontend will fetch fresh data via AJAX
 * 
 * @package TherapistBooking
 */

if (!defined('ABSPATH')) exit;

/**
 * Get calendar data for initial page load
 * This returns minimal data - the real data comes from AJAX
 * 
 * @return array Calendar configuration data
 */
function tb_get_calendar_data() {
    
    // Check if we have a selected therapist in session
    if (!session_id()) {
        session_start();
    }
    
    $therapist_data = isset($_SESSION['tb_therapist']) ? $_SESSION['tb_therapist'] : null;
    $therapist_id = null;
    
    if ($therapist_data) {
        $therapist_obj = json_decode($therapist_data, true);
        $therapist_id = isset($therapist_obj['id']) ? intval($therapist_obj['id']) : null;
    }
    
    // If we have a therapist ID, try to get their availability
    if ($therapist_id) {
        
        tb_log("[TB Calendar Data] Loading for therapist ID: {$therapist_id}");
        
        // Include Amelia integration
        if (file_exists(TB_DIR . 'includes/amelia-integration.php')) {
            require_once TB_DIR . 'includes/amelia-integration.php';
            
            try {
                // Get real-time data from Amelia
                $calendar_data = tb_get_therapist_availability($therapist_id);
                $calendar_data['source'] = 'amelia';
                $calendar_data['therapist_id'] = $therapist_id;
                
                tb_log("[TB Calendar Data] Loaded Amelia data successfully");
                
                return $calendar_data;
                
            } catch (Exception $e) {
                tb_log("[TB Calendar Data] Error loading Amelia data: " . $e->getMessage());
                // Fall through to static data
            }
        }
    }
    
    // Return static fallback data
    tb_log("[TB Calendar Data] Using static fallback data");
    
    return [
        'source' => 'static',
        'therapist_id' => null,
        'disabledDates' => tb_get_disabled_dates(),
        'bookedDates' => tb_get_booked_dates(),
        'timeSlots' => tb_get_time_slots()
    ];
}

/**
 * Static fallback: Get disabled dates
 * These are used if Amelia integration fails or no therapist is selected
 * 
 * @return array
 */
function tb_get_disabled_dates() {
    // Example: Disable Sundays and specific dates
    return [
        '2026-02-01', // Sunday
        '2026-02-08', // Sunday
        '2026-02-15', // Sunday
        '2026-02-22', // Sunday
    ];
}

/**
 * Static fallback: Get booked dates
 * 
 * @return array
 */
function tb_get_booked_dates() {
    // Dates that are fully booked
    return [
        '2026-02-05',
        '2026-02-12',
    ];
}

/**
 * Static fallback: Get time slots
 * 
 * @return array
 */
function tb_get_time_slots() {
    // Time slots for each date (can be dynamic later)
    return [
        'default' => [
            ['time' => '09:00 AM', 'available' => true],
            ['time' => '10:00 AM', 'available' => true],
            ['time' => '11:00 AM', 'available' => true],
            ['time' => '02:00 PM', 'available' => true],
            ['time' => '03:00 PM', 'available' => true],
            ['time' => '04:00 PM', 'available' => true],
        ],
        '2026-02-03' => [
            ['time' => '09:00 AM', 'available' => false],
            ['time' => '10:00 AM', 'available' => true],
            ['time' => '11:00 AM', 'available' => true],
            ['time' => '02:00 PM', 'available' => false],
            ['time' => '03:00 PM', 'available' => true],
        ]
    ];
}