/* == User Selection Handlers == */
// ============================================
// Selection Persistence System (Hybrid: localStorage + PHP Session)
// ============================================
// Common utilities and state management
const tbState = {
    currentStep: 1,
    selectedService: null,
    selectedTherapist: null,
    selectedDateTime: null,
    userInfo: {}
};

// Loader reference count to handle overlapping async operations
let tbLoaderCount = 0;

/**
 * Converts a time string (e.g., "9:00 AM") to 24-hour format.
 * @param {string} timeString - The time string to convert.
 * @returns {string} The time in 24-hour format (e.g., "09:00").
 */
function tbFormatTime24(timeString) {
    if (!timeString) return '';
    const [time, modifier] = timeString.split(' ');
    let [hours, minutes] = time.split(':');

    if (hours === '12') {
        hours = '00';
    }

    if (modifier && modifier.toUpperCase() === 'PM') {
        hours = parseInt(hours, 10) + 12;
    }

    return `${String(hours).padStart(2, '0')}:${minutes}`;
}

function tbLog(message, level = 'INFO') {
    console.log(`[TB ${level}] ${message}`);
    if (window.location.search.includes('testing123')) {
        const logData = new FormData();
        logData.append('action', 'tb_log');
        logData.append('message', message);
        logData.append('level', level);
        fetch(tbData.ajaxUrl, { method: 'POST', body: logData });
    }
}

function tbPlayClickSound() {
    // Click sound encoded in base64 WAV format
    const clickSoundBase64 = 'UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQIAAAAAAA==';
    const audio = new Audio('data:audio/wav;base64,' + clickSoundBase64);
    audio.volume = 0.3;
    
    // Reset and play to allow multiple rapid plays
    audio.currentTime = 0;
    audio.play().catch(err => {
        // //// //console.log('[TB Audio] Sound play failed:', err.message);
    });
}

function tbGoToStep(stepNumber) {
    // //tbLog(`Navigating to step ${stepNumber}`);
    
    // Update container data attribute for CSS animations
    const container = document.querySelector('.tb-container');
    container.setAttribute('data-step', stepNumber);
    
    document.querySelectorAll('.tb-step-container').forEach(container => {
        container.classList.remove('tb-active');
    });
    
    document.getElementById(`step-${stepNumber}`).classList.add('tb-active');
    
    document.querySelectorAll('.tb-step').forEach(step => {
        const stepNum = parseInt(step.dataset.step);
        step.classList.remove('tb-step-active', 'tb-step-completed');
        
        if (stepNum === stepNumber) {
            step.classList.add('tb-step-active');
        } else if (stepNum < stepNumber) {
            step.classList.add('tb-step-completed');
        }
    });
    
    tbState.currentStep = stepNumber;
    
    // Show/hide back button
    const backBtn = document.querySelector('.tb-back-btn');
    if (backBtn) {
        if (stepNumber > 1) {
            backBtn.classList.add('tb-show');
        } else {
            backBtn.classList.remove('tb-show');
        }
    }

    tbUpdateSidebarIcons(stepNumber);    
    tbPlayClickSound();
    
}

function tbUpdateSummary(type, value) {
    const element = document.getElementById(`summary-${type}`);
    if (!element) return;

    // If datetime and array-based selections
    if (type === 'datetime' && Array.isArray(value)) {
        // Clear existing content
        element.innerHTML = '';
        
        // Format date nicely
        function formatDateNice(dateStr) {
            const dateObj = new Date(dateStr);
            return dateObj.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        }
        
        // Create a row for each selection
        value.forEach((selection, index) => {
            const rowDiv = document.createElement('div');
            rowDiv.className = 'tb-summary-datetime-row';
            rowDiv.id = `tb-summary-datetime-row-${index + 1}`;
            
            const formattedDate = formatDateNice(selection.date);
            const formattedTime = tbFormatTime24(selection.time);
            
            rowDiv.innerHTML = `
                <span class="tb-datetime-icon">📅</span>
                <span class="tb-datetime-text">${formattedDate} at ${formattedTime}</span>
            `;
            
            element.appendChild(rowDiv);
        });
        return;
    }

    const span = element.querySelector('span');
    if (span) {
        span.textContent = value;
    }
}

function tbShowSuccess() {
    const modal = document.getElementById('tb-success-modal');
    modal.classList.add('tb-show');
    tbPlayClickSound();
}

function tbInitBackButton() {
    const backBtn = document.querySelector('.tb-back-btn');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            if (tbState.currentStep > 1) {
                tbGoToStep(tbState.currentStep - 1);
            }
        });
    }
}

// ============================================
// Selection Persistence System (Hybrid: localStorage + PHP Session)
// ============================================

/**
 * Save selection to both localStorage and PHP session
 * @param {string} type - Type of selection (service, therapist, datetime, userinfo)
 * @param {object} data - Data object containing id, name, and other relevant info
 */
function tbSaveSelection(type = "unknown", data = {}) {

  if (type !== "service") {
    // Show beautiful loader
    tbShowBeautifulLoader();
  }

  // Default values for missing parameters
  const defaults = {
    service: { id: null, name: "Not Selected" },
    therapist: {
      id: null,
      name: "Not Selected",
      image: "",
      rating: 0,
      services: "",
    },
    datetime: { id: null, block: [], selections: [], timestamp: null },
    userinfo: { name: "", email: "", phone: "", notes: "" },
  };

  // Merge with defaults
  const selectionData = { ...defaults[type], ...data };

  // Update summary for userinfo AFTER selectionData is defined
  if (type === "userinfo") {
    const fullName =
      `${selectionData.first_name || ""} ${selectionData.last_name || ""}`.trim();
        tbUpdateSummary("userInfo", fullName);

  }
  console.log(`[TB Selection] Saving ${type}:`, selectionData);

  // Save to localStorage
  try {
    localStorage.setItem(`tb_${type}`, JSON.stringify(selectionData));
    console.log(`[TB Selection] ✓ Saved to localStorage: tb_${type}`);
  } catch (e) {
    console.error(`[TB Selection] ✗ localStorage save failed:`, e);
  }

  // Save to PHP session via AJAX
  tbSaveToPhpSession(type, selectionData);
}

// Beautiful loader functions
function tbShowBeautifulLoader() {
    // Increment reference count and only create/show loader when first request arrives
    tbLoaderCount = Math.max(0, tbLoaderCount) + 1;
    if (tbLoaderCount > 1) return;

    // Remove any stale loader
    const existing = document.querySelector('.tb-beautiful-loader');
    if (existing) existing.remove();

    const loaderHTML = `
        <div class="tb-beautiful-loader">
            <div class="tb-loader-backdrop"></div>
            <div class="tb-loader-content">
                <div class="tb-loader-spinner">
                    <div class="tb-spinner-ring"></div>
                    <div class="tb-spinner-ring"></div>
                    <div class="tb-spinner-ring"></div>
                </div>
                <p class="tb-loader-text">Saving your selection...</p>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', loaderHTML);

    // Trigger animation
    setTimeout(() => {
        const loader = document.querySelector('.tb-beautiful-loader');
        if (loader) loader.classList.add('tb-loader-show');
    }, 10);
}

function tbHideBeautifulLoader() {
    // Decrement reference count; only hide when count reaches zero
    tbLoaderCount = Math.max(0, tbLoaderCount - 1);
    if (tbLoaderCount > 0) return;

    const loader = document.querySelector('.tb-beautiful-loader');
    if (loader) {
        loader.classList.remove('tb-loader-show');
        setTimeout(() => loader.remove(), 300);
    }
}

/**
 * Update sidebar summary icon states
 * @param {number} activeStep - Current active step number
 */
function tbUpdateSidebarIcons(activeStep) {
    const items = document.querySelectorAll('.tb-summary-icon');

    activeStep = activeStep+1;

    items.forEach(item => {

        const step = parseInt(item.dataset.step);

        item.classList.remove('tb-summary-icon-current', 'tb-summary-icon-filled');

        if (step === activeStep) {
            item.classList.add('tb-summary-icon-current');
        } else if (step < activeStep) {
            item.classList.add('tb-summary-icon-filled');
        }
    });
}


/**
 * AJAX method to save selection to PHP session
 * @param {string} type - Type of selection
 * @param {object} data - Selection data
 */
function tbSaveToPhpSession(type, data) {
    
    console.log(`[TB Session] Sending ${type} to PHP session...`);

    // if('userinfo' === type){
    //     alert('userinfo');
    //     $service_data = tbGetAllSelections();
    //     data = $service_data;
    // }
    
    jQuery.ajax({
        url: tbData.ajaxUrl,
        type: 'POST',
        data: {
            action: 'tb_save_session',
            type: type,
            data: data,
            nonce: tbData.nonce
        },
        success: function(response) {
            if (response.success) {
                console.log(`[TB Session] ✓ Saved to PHP session: ${type}`, response.data);
                // Hide loader after save completes
                if('userinfo' === type){
                    //change popup html to show appointment details
                   const modalContent = document.querySelector('#tb-success-modal .tb-modal-content .modal-container');
                    if (modalContent) {
                        // Get all booking data
                        const service = tbGetSelection('service');
                        const therapist = tbGetSelection('therapist');
                        const datetime = tbGetSelection('datetime');
                        
                        // Build appointment cards HTML
                        let appointmentCards = '';
                        if (datetime && datetime.selections) {
                            datetime.selections.forEach((selection, index) => {
                                const dayLabel = ['First Session', 'Second Session', 'Third Session'][index];
                                appointmentCards += `
                                    <div class="tb-appointment-card">
                                        <div class="tb-appointment-day">${dayLabel}</div>
                                        <div class="tb-appointment-details">
                                            <div class="tb-appointment-date">📅 ${selection.date}</div>
                                            <div class="tb-appointment-time">🕐 ${selection.time}</div>
                                        </div>
                                    </div>
                                `;
                            });
                        }
                        
                        const appointmentDetails = `
                            <div class="tb-success-container tb-success-horizontal">
                                
                                <div class="tb-success-left">
                                    <div class="tb-success-icon">✓</div>
                                    <h2 class="tb-success-title">Booking Confirmed!</h2>
                                    <p class="tb-success-subtitle">
                                        Thank you, ${data.first_name} ${data.last_name}
                                    </p>

                                    <div class="tb-contact-box">
                                        <div>✉️ Confirmation sent to <strong id="tb-success-email">${data.email}</strong></div>
                                        <div>📱 ${data.phone}</div>
                                    </div>
                                </div>

                                <div class="tb-success-right">
                                    
                                    <div class="tb-summary-row">
                                        <div class="tb-summary-item-inline">
                                            <span class="tb-label">Service</span>
                                            <span class="tb-value">${service?.name || 'N/A'}</span>
                                        </div>

                                        <div class="tb-summary-item-inline">
                                            <span class="tb-label">Therapist</span>
                                            <span class="tb-value">${therapist?.name || 'N/A'}</span>
                                        </div>
                                    </div>

                                    <div class="tb-sessions-wrapper">
                                        <div class="tb-label">Your Sessions</div>
                                        <div class="tb-appointments-grid-horizontal">
                                            ${appointmentCards}
                                        </div>
                                    </div>

                                </div>
                            </div>
                        `;

                        
                        modalContent.innerHTML = appointmentDetails;
                        document.getElementById('tb-success-modal').style.display = 'flex';
                        //scroll to modal as sometimes it might be out of viewport
                        document.getElementById('tb-success-modal').scrollIntoView({ behavior: 'smooth' });


                        document.querySelectorAll('.elementor-section').forEach(section => {
                            section.style.zIndex = '-1';
                        });
                        
                        // Add close button functionality
                        const closeBtn = modalContent.querySelector('.tb-close-modal');
                        if (closeBtn) {
                            closeBtn.addEventListener('click', function() {
                                document.getElementById('tb-success-modal').classList.remove('tb-show');
                            });
                        }

                        // Hide loader after modal is displayed
                        tbHideBeautifulLoader();
                    }
                }else if(type === 'therapist'){
                    // Don't hide loader on therapist selection - calendar is still loading availability
                    // The loader will be hidden by tbHideCalendarLoading() when calendar finishes loading
                    console.log(`[TB Session] Therapist saved, calendar is loading - keeping loader visible`);
                }else{
                    // Hide loader after the step is completely displayed
                    setTimeout(() => {
                        tbHideBeautifulLoader();
                    }, 800);

                }

            } else {
                console.error(`[TB Session] ✗ Failed to save ${type}:`, response.data);
                // Hide loader on failure
                tbHideBeautifulLoader();
            }
        },
        error: function(xhr, status, error) {
            console.error(`[TB Session] ✗ AJAX error for ${type}:`, error);
            // Hide loader on AJAX error
            tbHideBeautifulLoader();
        }
    });
}

/**
 * Get selection from localStorage
 * @param {string} type - Type of selection to retrieve
 * @returns {object|null} - Selection data or null if not found
 */
function tbGetSelection(type = 'unknown') {
    try {
        const data = localStorage.getItem(`tb_${type}`);
        if (data) {
            const parsed = JSON.parse(data);
            console.log(`[TB Selection] Retrieved ${type} from localStorage:`, parsed);
            return parsed;
        } else {
            console.log(`[TB Selection] No ${type} found in localStorage`);
            return null;
        }
    } catch (e) {
        console.error(`[TB Selection] ✗ localStorage retrieve failed:`, e);
        return null;
    }
}

/**
 * Clear specific selection or all selections
 * @param {string|null} type - Type to clear, or null to clear all
 */
function tbClearSelection(type = null) {
    if (type) {
        localStorage.removeItem(`tb_${type}`);
        console.log(`[TB Selection] Cleared ${type} from localStorage`);
        
        // Also clear from PHP session
        jQuery.ajax({
            url: tbData.ajaxUrl,
            type: 'POST',
            data: {
                action: 'tb_clear_session',
                type: type,
                nonce: tbData.nonce
            },
            success: function(response) {
                console.log(`[TB Session] Cleared ${type} from PHP session`);
            }
        });
    } else {
        // Clear all
        ['service', 'therapist', 'datetime', 'userinfo'].forEach(t => {
            localStorage.removeItem(`tb_${t}`);
        });
        console.log(`[TB Selection] Cleared all selections from localStorage`);
        
        // Clear all from PHP session
        jQuery.ajax({
            url: tbData.ajaxUrl,
            type: 'POST',
            data: {
                action: 'tb_clear_session',
                type: 'all',
                nonce: tbData.nonce
            }
        });
    }
}

/**
 * Get all selections at once
 * @returns {object} - Object containing all selections
 */
function tbGetAllSelections() {
    const selections = {
        service: tbGetSelection('service'),
        therapist: tbGetSelection('therapist'),
        datetime: tbGetSelection('datetime'),
        userinfo: tbGetSelection('userinfo')
    };
    // //// //console.log('[TB Selection] All selections:', selections);
    return selections;
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    // Set initial step
    const container = document.querySelector('.tb-container');
    if (container) {
        container.setAttribute('data-step', '1');
    }
    tbInitBackButton();
    // //tbLog('Booking system initialized');
});
/* ============================================
   End Selection Persistence System
   ============================================ */

document.addEventListener('click', function(e) {
    if (e.target.classList.contains('tb-close-modal')) {
        document.getElementById('tb-success-modal')
            .classList.remove('tb-show');
    }
});
