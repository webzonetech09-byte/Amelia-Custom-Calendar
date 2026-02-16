<?php if (!defined('ABSPATH')) exit; ?>

<div class="tb-container" data-theme="<?php echo esc_attr($atts['theme']); ?>">
    
    <div class="tb-main-content">
        
        <!-- Left Content Area (85%) -->
        <div class="tb-content-area">

            <!-- Back Button -->
            <button class="tb-back-btn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M19 12H5M12 19l-7-7 7-7"/>
                </svg>
                Zurück
            </button>
            
            <!-- Step 1: Choose Therapist -->
            <div class="tb-step-container tb-active" id="step-1">
                <?php include TB_DIR . 'templates/available-therapists.php'; ?>
            </div>

            <!-- Step 2: Select Date & Time -->
            <div class="tb-step-container" id="step-2">
                <?php include TB_DIR . 'templates/booking-calendar.php'; ?>
            </div>

            <!-- Step 3: User Information -->
            <div class="tb-step-container" id="step-3">
                <?php include TB_DIR . 'templates/user-form.php'; ?>
            </div>
        </div>

        <!-- Right Sidebar (15%) -->
        <div class="tb-sidebar">
            <h3>Ihre Auswahl</h3>
            <div class="tb-summary">
                <div class="tb-summary-item tb-summary-icon tb-summary-icon-filled"  data-step="1"  id="summary-service">
                    <strong>Service:</strong>
                    <span>Nicht ausgewählt</span>
                </div>
                <div class="tb-summary-item tb-summary-icon tb-summary-icon-current"  data-step="2"  id="summary-therapist">
                    <strong>Therapeut:</strong>
                    <span>Nicht ausgewählt</span>
                </div>
                <div class="tb-summary-item tb-summary-icon" data-step="3" id="summary-datetime">
                    <strong>Datum & Uhrzeit:</strong>
                    <span>Nicht ausgewählt</span>
                </div>
                <div class="tb-summary-item tb-summary-icon" data-step="4" id="summary-userInfo">
                    <strong>Benutzerinformationen:</strong>
                    <span>Nicht ausgewählt</span>
                </div>
            </div>
        </div>

    </div>

    <!-- Success Modal -->
    <div class="tb-modal" id="tb-success-modal">
        <div class="tb-modal-content">
            <div class="modal-container">
                <!-- <div class="tb-success-icon">✅</div>
                <h2>Booking Confirmed!</h2>
                <p>Your appointment has been successfully booked.</p>-->
            </div>
            <div class="tb-success-footer-horizontal">
                <button class="tb-close-modal">Close</button> 
            </div>
        </div>
    </div>

</div>
