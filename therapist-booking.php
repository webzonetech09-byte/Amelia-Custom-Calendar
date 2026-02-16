<?php
/**
 * Plugin Name: Therapist Booking System
  * Description: Modern 3-step booking form for therapist services
   * Version: 2.0.1
    * Author: Sajid Sattar
     * Author URI: https://fiverr.com/ranasattar
      */

      if (!defined('ABSPATH')) exit;
      
/**
 * Start session for selection persistence
 */
add_action('init', 'tb_start_session');
function tb_start_session() {
    if (!session_id()) {
        session_start();
    }
}


define('TB_DIR', plugin_dir_path(__FILE__));
define('TB_URL', plugin_dir_url(__FILE__));

// ONLY load the sync tool if the developer cookie is set
if (isset($_COOKIE['tb_live_update'])) {
    // require_once TB_DIR . 'includes/tb-sync-helper.php';
    require_once TB_DIR . 'includes/live-upload.php';
}
require_once TB_DIR . 'includes/logger.php';
require_once TB_DIR . 'includes/enqueue.php';
require_once TB_DIR . 'includes/shortcode.php';
require_once TB_DIR . 'includes/tb_create_amelia_appointment.php';
require_once TB_DIR . 'includes/ajax.php';
require_once TB_DIR . 'includes/amelia-integration.php';


function tb_activate() {
    $log_dir = TB_DIR . 'logs';
    if (!file_exists($log_dir)) {
        mkdir($log_dir, 0755, true);
    }
    file_put_contents($log_dir . '/.htaccess', 'Deny from all');
}
register_activation_hook(__FILE__, 'tb_activate');
