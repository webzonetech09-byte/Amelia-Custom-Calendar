<?php

    if (!defined('ABSPATH')) exit;

    function tb_log($message, $level = 'INFO') {
        $log_file = TB_DIR . 'logs/debug.log';
        $time = date('Y-m-d H:i:s');
        $entry = "[$time] [$level] $message\n";
        file_put_contents($log_file, $entry, FILE_APPEND);
    }

    function tb_display_logs(): void {
        if (!isset($_GET['testing123'])) return;
        
        add_action('wp_footer', function() {
            $log_file = TB_DIR . 'logs/debug.log';
            if (!file_exists($log_file)) return;
            
            $logs = file_get_contents($log_file);
            $lines = array_slice(explode("\n", $logs), -50);
            ?>
            <div id="tb-debug-panel" style="position:fixed;bottom:0;left:0;right:0;
                background:#1a1a1a;color:#0f0;padding:15px;max-height:200px;
                overflow-y:auto;font-family:monospace;font-size:11px;z-index:99999;
                border-top:2px solid #0f0;">
                <strong>DEBUG LOGS (Last 50 entries)</strong><br>
                <?php echo nl2br(htmlspecialchars(implode("\n", $lines))); ?>
            </div>
            <?php
        });
    }
    add_action('template_redirect', 'tb_display_logs');

    add_action('wp_footer', 'tb_display_session_data', 999);

    function tb_display_session_data(): void {

        // Only show if URL contains ?show_session=1
        if (!isset($_GET['show_session'])) {
            return;
        }

        // Do not run in admin or during AJAX
        if (is_admin() || wp_doing_ajax()) {
            return;
        }

        // Start session safely
        if (!session_id()) {
            session_start();
        }

        ?>
        <div id="tb-session-panel" style="
            position:fixed;
            bottom:0;
            left:0;
            right:0;
            background:#1e1e1e;
            color:#00ff88;
            padding:15px;
            max-height:40vh;
            overflow-y:auto;
            font-family:monospace;
            font-size:12px;
            z-index:99999;
            border-top:3px solid #00ff88;
        ">
            <strong>PHP SESSION DEBUG</strong><br><br>

            <strong>Session ID:</strong><br>
            <?php echo esc_html(session_id()); ?>
            <br><br>

            <strong>All $_SESSION Data:</strong>
            <pre><?php echo esc_html(print_r($_SESSION, true)); ?></pre>

            <strong>Individual Keys:</strong><br>
            <?php
            if (!empty($_SESSION)) {
                foreach ($_SESSION as $key => $value) {
                    echo '<hr style="border-color:#444;">';
                    echo '<strong>' . esc_html($key) . ':</strong>';
                    echo '<pre>' . esc_html(print_r($value, true)) . '</pre>';
                }
            } else {
                echo 'Session is empty.';
            }
            ?>
        </div>
        <?php
    }



//== DEBUGGIN CODE FOR TEMPORARY DEV TESTING - NOT FOR PRODUCTION ==//
    /**
     * 1 & 2: Universal AJAX Handler for Dev Testing
     * Triggers any PHP function sent via the 'tb_cmd' parameter.
     */
    add_action('wp_ajax_tb_dev_exec', 'tb_handle_dev_execution');
    add_action('wp_ajax_nopriv_tb_dev_exec', 'tb_handle_dev_execution');

    function tb_handle_dev_execution() {
        // Simple security: Check capability OR a secret key in URL/POST
        if (!current_user_can('manage_options') && !isset($_REQUEST['testing123'])) {
            wp_send_json_error(['error' => 'Unauthorized']);
        }

        $command = $_REQUEST['tb_cmd'] ?? '';
        $params  = $_REQUEST['params'] ?? [];

        tb_log("Dev Exec Triggered: $command", 'TEST');

        // Execute function if it exists
        if (function_exists($command)) {
            ob_start(); // Capture any echo output
            try {
                $return_val = call_user_func($command, $params);
                $output = ob_get_clean();
                
                wp_send_json_success([
                    'cmd'    => $command,
                    'return' => $return_val,
                    'output' => $output,
                    'logs'   => tb_get_tail_logs(5) // Auto-return last 5 logs
                ]);
            } catch (Exception $e) {
                ob_end_clean();
                wp_send_json_error(['error' => $e->getMessage()]);
            }
        } else {
            wp_send_json_error(['error' => "Function '$command' not found."]);
        }
    }

    /**
     * 3. Suggestion: Helper to fetch last N log lines for AJAX response
     */
    function tb_get_tail_logs($count = 10) {
        $file = TB_DIR . 'logs/debug.log';
        if (!file_exists($file)) return [];
        $lines = file($file);
        return array_slice($lines, -$count);
    }

    /**
     * 3. Suggestion: Direct SQL Debugger
     * Call this via AJAX (tb_cmd=tb_sql_debug) to test queries
     */
    function tb_sql_debug($params) {
        global $wpdb;
        $table = $params['table'] ?? $wpdb->posts;
        $limit = intval($params['limit'] ?? 1);
        return $wpdb->get_results("SELECT * FROM $table LIMIT $limit");
    }

    /**
     * 3. Suggestion: Clear Log File via AJAX
     * Call this via AJAX (tb_cmd=tb_clear_logs)
     */
    function tb_clear_logs() {
        file_put_contents(TB_DIR . 'logs/debug.log', '');
        return "Logs cleared at " . date('Y-m-d H:i:s');
    }


//== END OF DEBUGGING CODE ==//

