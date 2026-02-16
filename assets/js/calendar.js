{
  // ============================================
  // Calendar Initialization and Logic
  // Real-time Amelia Integration
  // ============================================

  let tbCalendar = null;
  let tbSelectedDate = null;
  let tbCalendarData = null; // Will be populated via AJAX
  let tbIsLoadingData = false;

  // Sequential 3-day block state
  let tbCurrentBlock = [];
  let tbCurrentBlockIndex = 0;
  let tbBlockSelections = []; // Will store 3 selections as array

  // ============================================
  // MAIN INITIALIZATION
  // ============================================

  function tbUpdateBlockProgress() {
    const progressEl = document.querySelector(".tb-timeslot-progress");
    if (!progressEl) return;

    const currentDate = tbCurrentBlock[tbCurrentBlockIndex];

    // UI: Move the "Current Day" highlight
    document
      .querySelectorAll(".flatpickr-day")
      .forEach((el) => el.classList.remove("tb-day-highlight-current"));
    const currentDayElem = document.querySelector(".flatpickr-" + currentDate);
    if (currentDayElem) {
      currentDayElem.classList.add("tb-day-highlight-current");
    }

    // 2. NEW: Remove 'tb-block-selected' from PREVIOUS days in the block
    // This ensures only the day being worked on (and future days in the block) keep the style
    tbCurrentBlock.forEach((date, index) => {
      if (index < tbCurrentBlockIndex) {
        const prevDayElem = document.querySelector(".flatpickr-" + date);
        if (prevDayElem) {
          prevDayElem.classList.remove("tb-block-selected");
          // Optional: Add a 'completed' class if you want a different style for finished days
          prevDayElem.classList.add("tb-block-finished");
        }
      }
    });

    // 3. Add highlight to the actual current date
    if (currentDayElem) {
      currentDayElem.classList.add("tb-day-highlight-current");
      // Ensure it has the selected background too
      currentDayElem.classList.add("tb-block-selected");
    }

    const dateObj = new Date(currentDate);
    const formattedDate = dateObj.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    progressEl.textContent = `Select time for ${formattedDate} (Day ${tbCurrentBlockIndex + 1} of ${tbCurrentBlock.length})`;
  }

  /**
   * Initialize the calendar with real-time Amelia data
   */
  function tbInitCalendar() {
    if (!document.getElementById("tb-flatpickr")) {
      // //console.log('[TB Calendar] Calendar element not found');
      return;
    }

    // //console.log('[TB Calendar] Initializing calendar...');

    // Check if therapist is selected
    const therapist = tbGetSelection("therapist");

    if (!therapist || !therapist.id) {
      console.warn("[TB Calendar] No therapist selected, using fallback data");
      tbInitCalendarWithFallback();
      return;
    }

    // //console.log('[TB Calendar] Therapist selected:', therapist.name, '(ID:', therapist.id + ')');

    // Show loading state
    tbShowCalendarLoading();

    // Fetch real-time availability from Amelia
    // tbFetchTherapistAvailability()
    tbFetchTherapistAvailability(therapist)
      .then((data) => {
        // //console.log('[TB Calendar] ✓ Availability data received:', data);
        tbCalendarData = data;
        tbInitCalendarWithData(data);
        tbHideCalendarLoading();
      })
      .catch((error) => {
        console.error("[TB Calendar] ✗ Failed to fetch availability:", error);
        tbShowCalendarError(error.message);
        // Fallback to static data
        tbInitCalendarWithFallback();
        tbHideCalendarLoading();
      });
  }

  // ============================================
  // AJAX: FETCH THERAPIST AVAILABILITY
  // ============================================

  /**
   * Fetch therapist availability from server via AJAX
   * @returns {Promise} Resolves with availability data
   */
  function tbFetchTherapistAvailability(therapistData) {
    return new Promise((resolve, reject) => {
      if (tbIsLoadingData) {
        // //console.log('[TB AJAX] Request already in progress...');
        return;
      }

      tbIsLoadingData = true;

      // //console.log('[TB AJAX] Sending request to:', tbData.ajaxUrl);

      jQuery.ajax({
        url: tbData.ajaxUrl,
        type: "POST",
        data: {
          action: "tb_get_therapist_availability",
          therapist: JSON.stringify(therapistData),
          service_id: window.tbBookingConfig?.serviceId || 84,
          location_id: window.tbBookingConfig?.locationId || 1,
          nonce: tbData.nonce,
        },
        success: function (response) {
          tbIsLoadingData = false;

          // //console.log('[TB AJAX] Response received:', response);

          if (response.success) {
            // //console.log('[TB AJAX] ✓ Success! Therapist:', response.data.therapist_name);
            resolve(response.data.data); // The actual availability data
          } else {
            console.error("[TB AJAX] ✗ Server returned error:", response.data);
            reject(new Error(response.data.message || "Unknown error"));
          }
        },
        error: function (xhr, status, error) {
          tbIsLoadingData = false;
          console.error("[TB AJAX] ✗ Request failed:", {
            status: status,
            error: error,
            response: xhr.responseText,
          });
          reject(new Error("Network error: " + error));
        },
      });
    });
  }

  // ============================================
  // CALENDAR INITIALIZATION WITH DATA
  // ============================================
  /**
   * Check if a date has 2 consecutive available days after it
   */
  function tbHas3ConsecutiveDays(dateStr, availableDates) {
    const currentDate = new Date(dateStr);

    // Get next 2 dates
    const next1 = new Date(currentDate);
    next1.setDate(next1.getDate() + 1);
    const next1Str =
      next1.getFullYear() +
      "-" +
      String(next1.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(next1.getDate()).padStart(2, "0");

    const next2 = new Date(currentDate);
    next2.setDate(next2.getDate() + 2);
    const next2Str =
      next2.getFullYear() +
      "-" +
      String(next2.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(next2.getDate()).padStart(2, "0");

    // Check if all 3 days are available
    return (
      availableDates.includes(dateStr) &&
      availableDates.includes(next1Str) &&
      availableDates.includes(next2Str)
    );
  }

  function tbFind3DayBlock(dateStr, availableDates) {
    const currentDate = new Date(dateStr);

    function getDateStr(date) {
      return (
        date.getFullYear() +
        "-" +
        String(date.getMonth() + 1).padStart(2, "0") +
        "-" +
        String(date.getDate()).padStart(2, "0")
      );
    }

    // Try 3 patterns: clicked date as day 1, 2, or 3

    // Pattern 1: Start of block (dateStr, +1, +2)
    const next1 = new Date(currentDate);
    next1.setDate(next1.getDate() + 1);
    const next2 = new Date(currentDate);
    next2.setDate(next2.getDate() + 2);

    if (
      availableDates.includes(dateStr) &&
      availableDates.includes(getDateStr(next1)) &&
      availableDates.includes(getDateStr(next2))
    ) {
      return [dateStr, getDateStr(next1), getDateStr(next2)];
    }

    // Pattern 2: Middle of block (-1, dateStr, +1)
    const prev1 = new Date(currentDate);
    prev1.setDate(prev1.getDate() - 1);
    const next1_p2 = new Date(currentDate);
    next1_p2.setDate(next1_p2.getDate() + 1);

    if (
      availableDates.includes(getDateStr(prev1)) &&
      availableDates.includes(dateStr) &&
      availableDates.includes(getDateStr(next1_p2))
    ) {
      return [getDateStr(prev1), dateStr, getDateStr(next1_p2)];
    }

    // Pattern 3: End of block (-2, -1, dateStr)
    const prev2 = new Date(currentDate);
    prev2.setDate(prev2.getDate() - 2);
    const prev1_p3 = new Date(currentDate);
    prev1_p3.setDate(prev1_p3.getDate() - 1);

    if (
      availableDates.includes(getDateStr(prev2)) &&
      availableDates.includes(getDateStr(prev1_p3)) &&
      availableDates.includes(dateStr)
    ) {
      return [getDateStr(prev2), getDateStr(prev1_p3), dateStr];
    }

    return null; // No valid block found
  }

  /**
   * Initialize Flatpickr calendar with availability data
   * @param {Object} data - Contains disabledDates, bookedDates, timeSlots
   */
  function tbInitCalendarWithData(data) {
    // Destroy existing calendar if exists
    // if (tbCalendar) {
    // tbCalendar.destroy();
    // }

    // Destroy existing calendar if exists
    if (tbCalendar && typeof tbCalendar.destroy === "function") {
      tbCalendar.destroy();
    }

    tbCalendar = flatpickr("#tb-flatpickr", {
      inline: true,
      minDate: "today",
      dateFormat: "Y-m-d",
      locale: {
        firstDayOfWeek: 0, // ADD THIS - 0=Sunday, 1=Monday
      },
      static: false,
      monthSelectorType: "static",
      // Disable dates where therapist is not working
      disable: data.disabledDates || [],
      onMonthChange: function (selectedDates, dateStr, instance) {
        // Add fade out effect
        // instance.calendarContainer.style.transition = 'opacity 0.3s ease';
        instance.calendarContainer.style.opacity = "0";

        // Fade back in after 300ms
        setTimeout(() => {
          instance.calendarContainer.style.opacity = "1";
        }, 300);
      },

      // Handle date selection
      onChange: function (selectedDates, dateStr) {
        tbHandleDateSelect(dateStr, data);
      },
      onDayCreate: function (dObj, dStr, fp, dayElem) {
        const date = dayElem.dateObj;
        const dateStr =
          date.getFullYear() +
          "-" +
          String(date.getMonth() + 1).padStart(2, "0") +
          "-" +
          String(date.getDate()).padStart(2, "0");
        const dayOfWeek = dayElem.dateObj.getDay();

        dayElem.classList.add("flatpickr-" + dateStr);

        if (dayOfWeek === 0 || dayOfWeek === 6) {
          dayElem.classList.add("tb-weekend");
        } else {
          dayElem.classList.add("tb-weekday");
        }

        // Check if this date is part of ANY valid 3-day block
        const isValidForBooking = tbIsPartOfValid3DayBlock(
          dateStr,
          data.availableDates || [],
        );

        if (isValidForBooking) {
          // ADD HOVER HANDLERS:
          dayElem.addEventListener("mouseenter", function () {
            const block = tbFind3DayBlock(dateStr, data.availableDates || []);
            if (block) {
              block.forEach((d) => {
                const elem = document.querySelector(".flatpickr-" + d);
                if (elem) elem.classList.add("tb-block-hover");
              });
            }
          });

          dayElem.addEventListener("mouseleave", function () {
            document.querySelectorAll(".tb-block-hover").forEach((el) => {
              el.classList.remove("tb-block-hover");
            });
          });
        }

        if (isValidForBooking) {
          // dayElem.classList.add('tb-available');
          dayElem.classList.add("in-session");
          dayElem.title = "Available for 3-day booking";
        } else {
          dayElem.classList.add("tb-unavailable", "disabled", "out-of-session");
          // dayElem.classList.add('out-of-session');
        }

        if (data.availableDates.includes(dateStr)) {
          dayElem.classList.add("tb-available");
          return; // Stop here
        } else {
          dayElem.classList.add("tb-unavailable", "disabled");
          dayElem.title = "Not Available";
          console.log(dayElem + " : " + dateStr);
          return; // Stop here
        }
      },
      //     // 4. HAS TIME SLOTS (Check availability)
      //     if (data.timeSlots[dateStr]) {

      //         const slots = data.timeSlots[dateStr];
      //         // const hasAvailable = slots.some(s => s.available);
      //         // const hasUnavailable = slots.some(s => !s.available);

      //         // if (hasAvailable && hasUnavailable) {
      //         //     // PARTIALLY AVAILABLE
      //         //     dayElem.classList.add('tb-partial');
      //         //     const availCount = slots.filter(s => s.available).length;
      //         //     dayElem.title = `${availCount} slot(s) available`;
      //         // } else if (hasAvailable) {
      //         //     // FULLY AVAILABLE
      //         //     dayElem.classList.add('tb-available');
      //         //     dayElem.title = `${slots.length} slot(s) available`;
      //         // }
    });

    setTimeout(() => {
      if (tbCalendar) {
        tbCalendar.redraw();
      }
    }, 100);

    // //console.log('[TB Calendar] ✓ Calendar initialized successfully');
  }

  /**
   * Initialize calendar with fallback static data
   */
  function tbInitCalendarWithFallback() {
    // //console.log('[TB Calendar] Using fallback static data');

    // Use data from window.tbCalendarData if available (from PHP)
    const fallbackData = window.tbCalendarData || {
      disabledDates: [],
      bookedDates: [],
      timeSlots: {
        default: [
          { time: "09:00", available: true },
          { time: "10:00", available: true },
          { time: "11:00", available: true },
          { time: "14:00", available: true },
          { time: "15:00", available: true },
          { time: "16:00", available: true },
        ],
      },
    };

    tbCalendarData = fallbackData;
    tbInitCalendarWithData(fallbackData);
  }

  // ============================================
  // CALENDAR UI HELPERS
  // ============================================

  /**
   * Mark fully booked dates on calendar
   * @param {HTMLElement} dayElem - Flatpickr day element
   * @param {Array} bookedDates - Array of booked date strings
   */
  function tbMarkBookedDates(dayElem, bookedDates) {
    if (!bookedDates || !Array.isArray(bookedDates)) return;

    const dateStr = dayElem.dateObj.toISOString().split("T")[0];

    if (bookedDates.includes(dateStr)) {
      dayElem.classList.add("tb-booked");
      dayElem.title = "Fully booked";
    }
  }

  /**
   * Show loading spinner on calendar
   */
  function tbShowCalendarLoading() {
    const calendarSection = document.querySelector(".tb-calendar-section");
    if (!calendarSection) return;

    const flatpickrCalendar = document.querySelector(
      ".flatpickr-calendar.inline",
    );
    if (!flatpickrCalendar) return;
    flatpickrCalendar.style.visibility = "hidden";

    const tbTimeslotsSection = document.querySelector(".tb-timeslots-section");
    if (!tbTimeslotsSection) return;
    tbTimeslotsSection.style.visibility = "hidden";

    // Add loading overlay
    const loadingHtml = `
        <div class="tb-calendar-loading" style="
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(255,255,255,0.9);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10;
            border-radius: 8px;
        ">
            <div style="text-align: center;">
                <div class="tb-spinner" style="
                    border: 3px solid #f3f3f3;
                    border-top: 3px solid var(--tb-primary, #6366f1);
                    border-radius: 50%;
                    width: 40px;
                    height: 40px;
                    animation: tb-spin 1s linear infinite;
                    margin: 0 auto 10px;
                "></div>
                <p style="margin: 0; color: #666;">Loading availability...</p>
            </div>
        </div>
    `;

    calendarSection.style.position = "relative";
    calendarSection.insertAdjacentHTML("beforeend", loadingHtml);

    // Add spinner animation if not exists
    if (!document.getElementById("tb-spinner-style")) {
      const style = document.createElement("style");
      style.id = "tb-spinner-style";
      style.textContent = `
            @keyframes tb-spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
      document.head.appendChild(style);
    }
  }

  /**
   * Hide loading spinner
   */
  function tbHideCalendarLoading() {
    // hide beautiful modal
    setTimeout(() => {
      tbHideBeautifulLoader();
    }, 800);

    const loading = document.querySelector(".tb-calendar-loading");

    const tbTimeslotsSection = document.querySelector(".tb-timeslots-section");
    if (!tbTimeslotsSection) return;
    tbTimeslotsSection.style.visibility = "visible";

    const flatpickrCalendar = document.querySelector(
      ".flatpickr-calendar.inline",
    );
    if (flatpickrCalendar) {
      flatpickrCalendar.style.visibility = "visible";
    }

    if (loading) {
      loading.remove();
    }
  }

  /**
   * Show error message on calendar
   * @param {string} message - Error message to display
   */
  function tbShowCalendarError(message) {
    const calendarSection = document.querySelector(".tb-calendar-section");
    if (!calendarSection) return;

    const errorHtml = `
        <div class="tb-calendar-error" style="
            padding: 20px;
            background: #fee;
            border: 1px solid #fcc;
            border-radius: 8px;
            color: #c33;
            margin-bottom: 15px;
        ">
            <strong>⚠️ Error:</strong> ${message}
            <br><small>Using fallback availability data.</small>
        </div>
    `;

    calendarSection.insertAdjacentHTML("afterbegin", errorHtml);

    // Auto-hide after 5 seconds
    setTimeout(() => {
      const error = document.querySelector(".tb-calendar-error");
      if (error) error.remove();
    }, 5000);
  }

  /**
   * Converts a time string (e.g., "9:00 AM") to 24-hour format.
   * @param {string} timeString - The time string to convert.
   * @returns {string} The time in 24-hour format (e.g., "09:00").
   */
  function tbFormatTime24(timeString) {
    if (!timeString) return "";
    const [time, modifier] = timeString.split(" ");
    let [hours, minutes] = time.split(":");

    if (hours === "12") {
      hours = "00";
    }

    if (modifier === "PM") {
      hours = parseInt(hours, 10) + 12;
    }

    return `${String(hours).padStart(2, "0")}:${minutes}`;
  }

  // ============================================
  // DATE & TIME SELECTION HANDLERS
  // ============================================

  /**
   * Check if a date is part of ANY valid 3-consecutive-day block
   */
  function tbIsPartOfValid3DayBlock(dateStr, availableDates) {
    const currentDate = new Date(dateStr);

    // Helper to get date string
    function getDateStr(date) {
      return (
        date.getFullYear() +
        "-" +
        String(date.getMonth() + 1).padStart(2, "0") +
        "-" +
        String(date.getDate()).padStart(2, "0")
      );
    }

    // Check 3 patterns: this date can be day 1, 2, or 3 of a valid block

    // Pattern 1: This date is START (day 1 of 3)
    const next1 = new Date(currentDate);
    next1.setDate(next1.getDate() + 1);
    const next2 = new Date(currentDate);
    next2.setDate(next2.getDate() + 2);

    const pattern1Valid =
      availableDates.includes(dateStr) &&
      availableDates.includes(getDateStr(next1)) &&
      availableDates.includes(getDateStr(next2));

    // Pattern 2: This date is MIDDLE (day 2 of 3)
    const prev1 = new Date(currentDate);
    prev1.setDate(prev1.getDate() - 1);
    const next1_p2 = new Date(currentDate);
    next1_p2.setDate(next1_p2.getDate() + 1);

    const pattern2Valid =
      availableDates.includes(getDateStr(prev1)) &&
      availableDates.includes(dateStr) &&
      availableDates.includes(getDateStr(next1_p2));

    // Pattern 3: This date is END (day 3 of 3)
    const prev2 = new Date(currentDate);
    prev2.setDate(prev2.getDate() - 2);
    const prev1_p3 = new Date(currentDate);
    prev1_p3.setDate(prev1_p3.getDate() - 1);

    const pattern3Valid =
      availableDates.includes(getDateStr(prev2)) &&
      availableDates.includes(getDateStr(prev1_p3)) &&
      availableDates.includes(dateStr);

    return pattern1Valid || pattern2Valid || pattern3Valid;
  }
  function tbShowModernAlert(message, type = "error") {
    const alertDiv = document.createElement("div");
    alertDiv.className = "tb-modern-alert tb-alert-" + type;
    alertDiv.innerHTML = `
        <div class="tb-alert-content">
            <span class="tb-alert-icon">${type === "error" ? "⚠️" : "ℹ️"}</span>
            <span class="tb-alert-message">${message}</span>
        </div>
    `;

    document.body.appendChild(alertDiv);

    setTimeout(() => alertDiv.classList.add("tb-alert-show"), 10);
    setTimeout(() => {
      alertDiv.classList.remove("tb-alert-show");
      setTimeout(() => alertDiv.remove(), 300);
    }, 3000);
  }
  /**
   * Handle date selection from calendar
   * @param {string} dateStr - Selected date in Y-m-d format
   * @param {Object} data - Availability data
   */
  function tbHandleDateSelect(dateStr, data) {
    const block = tbFind3DayBlock(dateStr, data.availableDates || []);

    if (!block) {
      tbShowModernAlert(
        "Please select a date with 3 consecutive available days",
        "error",
      );
      return;
    }

    // //console.log('[TB] 3-day block selected:', block);

    // Initialize sequential flow state
    tbCurrentBlock = block;
    tbCurrentBlockIndex = 0;
    tbBlockSelections = [];

    // Highlight the 3-day block
    document.querySelectorAll(".flatpickr-day").forEach((day) => {
      day.classList.remove("tb-block-selected");
    });

    // Clear any previous locks first
    document
      .querySelectorAll(".tb-day-locked")
      .forEach((el) => el.classList.remove("tb-day-locked"));

    // Highlight and LOCK the 2nd and 3rd days immediately
    block.forEach((d, index) => {
      const dayElem = document.querySelector(".flatpickr-" + d);
      if (dayElem) {
        dayElem.classList.add("tb-block-selected");
        // Logic: Lock the 2nd and 3rd days of this specific block
        if (index > 0) {
          dayElem.classList.add("tb-day-locked");
        }
      }
    });

    // Load time slots for first day
    tbLoadTimeSlots(tbCurrentBlock[tbCurrentBlockIndex], data);
    tbUpdateBlockProgress();

    tbPlayClickSound();
  }

  // function tbHandleDateSelect(dateStr, data) {
  //     tbSelectedDate = dateStr;
  //     console.log(`[TB Calendar] Date selected: ${dateStr}`);

  //     // Save date selection (without time yet)
  //     tbSaveSelection('datetime', {
  //         id: null,
  //         date: dateStr,
  //         time: 'Not Selected',
  //         timestamp: new Date(dateStr).getTime()
  //     });

  //     // Load time slots for this date
  //     tbLoadTimeSlots(dateStr, data);

  //     // Play click sound
  //     tbPlayClickSound();
  // }

  /**
   * Load and display time slots for selected date
   * @param {string} dateStr - Selected date
   * @param {Object} data - Availability data
   */
  function tbLoadTimeSlots(dateStr, data) {
    const timeSlotsData = data?.timeSlots || {};

    // Get slots for this specific date, or use default
    let slots = timeSlotsData[dateStr] || timeSlotsData["default"] || [];

    console.log(
      `[TB Calendar] Loading ${slots.length} time slots for ${dateStr}`,
    );

    // Render the time slots
    tbRenderTimeSlots(slots, dateStr);
  }

  /**
   * Render time slots in the UI
   * @param {Array} slots - Array of time slot objects
   * @param {string} dateStr - Selected date
   */
  function tbRenderTimeSlots(slots, dateStr) {
    const container = document.getElementById("tb-timeslots");
    const prompt = document.querySelector(".tb-timeslots-prompt");

    if (!container) {
      console.error("[TB Calendar] Time slots container not found");
      return;
    }

    // Hide prompt message
    if (prompt) {
      prompt.style.display = "none";
    }

    // Clear existing slots
    container.innerHTML = "";

    // Check if there are any slots
    if (!slots || slots.length === 0) {
      container.innerHTML = `
            <div style="
                padding: 20px;
                text-align: center;
                color: #666;
                grid-column: 1 / -1;
            ">
                No available time slots for this date.
            </div>
        `;
      // //console.log('[TB Calendar] No time slots available for', dateStr);
      return;
    }

    // Render each time slot
    slots.forEach((slot) => {
      const slotEl = tbCreateTimeSlot(slot, dateStr);
      container.appendChild(slotEl);
    });

    console.log(`[TB Calendar] ✓ Rendered ${slots.length} time slots`);
  }

  /**
   * Create a time slot element
   * @param {Object} slot - Slot object with time and available properties
   * @param {string} dateStr - Date string
   * @returns {HTMLElement} Time slot div element
   */
  function tbCreateTimeSlot(slot, dateStr) {
    const div = document.createElement("div");
    div.className = "tb-timeslot";
    const time24 = tbFormatTime24(slot.time);
    div.textContent = time24;
    div.dataset.time = time24;

    if (!slot.available) {
      div.classList.add("tb-booked");
      div.title = "This slot is already booked";
    } else {
      div.classList.add("tb-available");
      div.title = "Click to select this time";

      // Add click handler for available slots
      div.addEventListener("click", () => {
        tbSelectTimeSlot(div, time24, dateStr);
      });
    }

    return div;
  }

  /**
   * Handle time slot selection
   * @param {HTMLElement} element - Clicked time slot element
   * @param {string} time - Time string (e.g., "10:00 AM")
   * @param {string} dateStr - Date string (Y-m-d)
   */
  function tbSelectTimeSlot(element, time, dateStr) {
    console.log(`[TB Calendar] Time slot selected: ${dateStr} ${time}`);

    // Remove previous selection (visual)
    // document.querySelectorAll('.tb-timeslot')
    element
      .closest("#tb-timeslots")
      .querySelectorAll(".tb-timeslot")
      .forEach((slot) => {
        slot.classList.remove("tb-selected");
      });

    element.classList.add("tb-selected");

    const time24 = tbFormatTime24(time);
    const timestamp = new Date(`${dateStr} ${time24}`).getTime();

    // Store this day's selection
    // Ensure only one selection per block index
    tbBlockSelections[tbCurrentBlockIndex] = {
      date: dateStr,
      time: time24,
      timestamp: timestamp,
      fullDateTime: `${dateStr} ${time24}`,
    };

    // //console.log('[TB] Current block selections:', tbBlockSelections);

    tbPlayClickSound();

    // Move to next day or finish
    tbAdvanceToNextBlockDay(tbCalendarData);
  }

  function tbAdvanceToNextBlockDay(data) {
    tbCurrentBlockIndex++;

    // If still inside block → load next day
    if (tbCurrentBlockIndex < tbCurrentBlock.length) {
      const nextDate = tbCurrentBlock[tbCurrentBlockIndex];

      // //console.log('[TB] Moving to next day in block:', nextDate);

      // Clear previous slot selections visually
      document.querySelectorAll(".tb-timeslot").forEach((slot) => {
        slot.classList.remove("tb-selected");
      });

      tbLoadTimeSlots(nextDate, data);
      tbUpdateBlockProgress();

      return;
    }

    if (tbBlockSelections.length !== tbCurrentBlock.length) {
      tbShowModernAlert("Please select all 3 days before continuing", "error");
      return;
    }

    // All 3 days selected → save final array
    tbSaveSelection("datetime", {
      id: null,
      block: tbCurrentBlock,
      selections: tbBlockSelections,
      timestamp: Date.now(),
    });

    tbUpdateSummary("datetime", tbBlockSelections);

    console.log("[TB] ✓ All 3 days selected:", tbBlockSelections);

    // Show continue button
    tbShowContinueButton();

    // setTimeout(() => {
    // tbGoToStep(3);
    // }, 500);
  }
  /**
   * Show continue button after all 3 days selected
   */
  function tbShowContinueButton() {
    // const container = document.getElementById("tb-timeslots");
    const container = document.querySelector(".tb-timeslots-section");
    if (!container) return;

    // Remove existing button if any
    const existingBtn = document.getElementById("tb-continue-btn");
    if (existingBtn) existingBtn.remove();

    // Create button
    const btnHtml = `
        <button id="tb-continue-btn" class="tb-continue-button" style="
            grid-column: 1 / -1;
            padding: 15px 30px;
            background: var(--tb-primary, #6366f1);
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            margin-top: 20px;
            transition: all 0.3s ease;
        ">
            Continue to Next Step →
        </button>
    `;

    // container.insertAdjacentHTML("beforeend", btnHtml);
    container.innerHTML = btnHtml;

    // Add click handler
    document.getElementById("tb-continue-btn").addEventListener("click", () => {
      tbPlayClickSound();
      tbGoToStep(3); // Go to next step
    });
  }

  // ============================================
  // INITIALIZE ON PAGE LOAD
  // ============================================

  document.addEventListener("DOMContentLoaded", () => {
    // //console.log('[TB Calendar] DOM loaded, checking for Flatpickr...');

    if (typeof flatpickr === "undefined") {
      console.error("[TB Calendar] ✗ Flatpickr library not loaded!");
      return;
    }

    if (typeof jQuery === "undefined") {
      console.error("[TB Calendar] ✗ jQuery not loaded!");
      return;
    }

    // Initialize calendar
    // tbInitCalendar();
  });

  // ============================================
  // REFRESH CALENDAR (Optional Helper)
  // ============================================

  /**
   * Refresh calendar data (useful if user changes therapist selection)
   */
  function tbRefreshCalendar() {
    // //console.log('[TB Calendar] Refreshing calendar...');

    // Clear existing data
    tbCalendarData = null;

    // Reinitialize
    tbInitCalendar();
  }

  // Export refresh function to window for external access
  window.tbRefreshCalendar = tbRefreshCalendar;
  ``;
}