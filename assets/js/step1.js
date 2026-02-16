// Step 1: Therapist Selection (Service 84 - Raucherentwöhnung is static default)
document.addEventListener("DOMContentLoaded", () => {
  jQuery(document).ready(function ($) {
    initStep1();

    function initStep1() {
      // Set static service 84 as default
      const staticServiceId = 84;
      const staticServiceName = "Raucherentwöhnung";

      tbState.selectedService = {
        id: staticServiceId,
        name: staticServiceName,
      };

      // Save service selection
      tbSaveSelection("service", {
        id: staticServiceId,
        name: staticServiceName,
      });

      tbUpdateSummary("service", staticServiceName);

      // Auto-load therapists for this service
      loadTherapists(staticServiceId);
    }

    function initTherapistCards() {
      const step1Cards = document.querySelectorAll("#step-1 .tb-card");

      step1Cards.forEach((card) => {
        addCardClickHandler(card);
      });
    }

    function addCardClickHandler(card) {
      const selectBtn = card.querySelector(".tb-select-btn");

      selectBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        handleTherapistSelection(card);
      });

      card.addEventListener("click", () => {
        highlightCard(card);
      });
    }

    function handleTherapistSelection(card) {
      const therapistId = card.dataset.id;
      const therapistName = card.dataset.name;

      tbState.selectedTherapist = {
        id: therapistId,
        name: therapistName,
      };

      tbUpdateSummary("therapist", therapistName);
      // //tbLog(`Therapist selected: ${therapistName}`);

      setTimeout(() => tbGoToStep(2), 300);
    }

    function highlightCard(selectedCard) {
      document.querySelectorAll("#step-1 .tb-card").forEach((card) => {
        card.style.borderColor = "transparent";
      });
      selectedCard.style.borderColor = "var(--tb-primary)";
    }

    function loadTherapists(serviceId) {
      var $container = $("#tb-therapist-container");

      // Show loading
      $container.html('<p class="tb-loading">Loading therapists...</p>');

      // AJAX call using global tbData
      $.ajax({
        url: tbData.ajaxUrl,
        type: "POST",
        data: {
          action: "tb_get_therapists_for_service",
          service_id: serviceId,
          nonce: tbData.nonce,
        },
        success: function (response) {
          if (response.success && response.data.therapists.length > 0) {
            var html = "";
            $.each(response.data.therapists, function (i, therapist) {
              html +=
                '<div class="tb-card" data-id="' +
                therapist.id +
                '" data-name="' +
                therapist.name +
                '">';
              html +=
                '  <img src="' +
                therapist.image +
                '" alt="' +
                therapist.name +
                '" class="tb-card-image">';
              html += '  <h3 class="tb-card-name">' + therapist.name + "</h3>";
              // html += '  <div class="tb-card-rating">⭐ ' + therapist.rating + '</div>';

              // This line displays the therapist's services from the AJAX response
              // therapist.services = comma-separated string of all services offered by this therapist
              // Example: "Depression, Anxiety, Stress Management, Sleep Issues"
              // The services are stored in data-full-text attribute for text truncation handling
              // html += '  <p class="tb-card-services" data-full-text="' + therapist.services + '">' + therapist.services + '</p>';
              // ========================================

              html += '  <button class="tb-select-btn">Select</button>';
              html += "</div>";
            });

            $container.html(html);

            // ===== SERVICE TEXT TRUNCATION LOGIC =====
            // After DOM loads, process each therapist's service list
            // to show "Read More/Less" if services text is too long
            setTimeout(function () {
              $container.find(".tb-card-services").each(function () {
                var $serviceP = $(this);
                var fullText = $serviceP.data("full-text"); // Get full service list from data attribute

                // Skip if already processed
                if ($serviceP.find(".tb-service-toggle-btn").length > 0) {
                  return;
                }

                // Check if text overflows one line (service list is too long)
                var lineHeight = parseFloat($serviceP.css("line-height"));
                var actualHeight = this.scrollHeight;

                if (actualHeight > lineHeight * 1.5) {
                  // More than 1 line
                  // Text overflows, we need to truncate and add button
                  var items = fullText.split(",").map(function (s) {
                    return s.trim();
                  });
                  var firstLine = "";
                  var remaining = "";
                  var foundBreak = false;

                  // Find the right truncation point
                  for (var i = 0; i < items.length; i++) {
                    var testText = items.slice(0, i + 1).join(", ");
                    $serviceP.text(testText);

                    if (this.scrollHeight > lineHeight * 1.5) {
                      // This item causes overflow
                      firstLine = items.slice(0, i).join(", ");
                      remaining = items.slice(i).join(", ");
                      foundBreak = true;
                      break;
                    }
                  }

                  if (foundBreak && remaining) {
                    // Update with truncated version
                    $serviceP.html(
                      '<span class="tb-service-visible">' +
                        firstLine +
                        "</span>" +
                        '<span class="tb-service-hidden" style="display:none;"> ' +
                        firstLine +
                        ", " +
                        remaining +
                        "</span>" +
                        ' <button class="tb-service-toggle-btn" type="button">' +
                        '<svg class="tb-arrow-icon" width="12" height="12" viewBox="0 0 12 12" fill="none">' +
                        '<path d="M2 4L6 8L10 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
                        "</svg>" +
                        "</button>",
                    );
                  } else {
                    // Restore original text if we didn't find a break
                    $serviceP.text(fullText);
                  }
                }
              });
            }, 150);
          } else {
            $container.html(
              '<p class="tb-no-therapists">No therapists available for this service</p>',
            );
          }
        },
        error: function () {
          $container.html(
            '<p class="tb-error">Error loading therapists. Please try again.</p>',
          );
        },
      });
    }

    jQuery(document).ready(function ($) {
      // Handle services toggle (event delegation for dynamically loaded content)
      $(document).on("click", ".tb-service-toggle-btn", function (e) {
        e.preventDefault();
        e.stopPropagation();

        var $btn = $(this);
        var $parent = $btn.closest(".tb-card-services");
        var $visible = $parent.find(".tb-service-visible");
        var $hidden = $parent.find(".tb-service-hidden");
        var $icon = $btn.find(".tb-arrow-icon");

        if ($hidden.is(":visible")) {
          $hidden.hide();
          $visible.show();
          $icon.css("transform", "rotate(0deg)");
        } else {
          $hidden.show();
          $visible.hide();
          $icon.css("transform", "rotate(180deg)");
        }
      });

      // Handle dynamically loaded therapist card clicks (event delegation)
      $(document).on(
        "click",
        "#tb-therapist-container .tb-select-btn",
        function (e) {
          e.preventDefault();
          e.stopPropagation();

          var $card = $(this).closest(".tb-card");
          var therapistId = $card.data("id");
          var therapistName = $card.data("name");
          var therapistImage = $card.find(".tb-card-image").attr("src");
          var therapistRating = $card
            .find(".tb-card-rating")
            .text()
            .replace("⭐ ", "");
          var therapistServices = $card
            .find(".tb-card-services")
            .data("full-text");

          tbState.selectedTherapist = {
            id: therapistId,
            name: therapistName,
            image: therapistImage,
            rating: therapistRating,
            services: therapistServices,
          };

          // Save selection (Hybrid: localStorage + PHP Session)
          tbSaveSelection("therapist", {
            id: therapistId,
            name: therapistName,
            image: therapistImage,
            rating: therapistRating,
            services: therapistServices,
          });

          tbUpdateSummary("therapist", therapistName);
          // //tbLog('Therapist selected: ' + therapistName);

          // Reinitialize
          tbInitCalendar();

          setTimeout(function () {
            tbGoToStep(2);
          }, 300);
        },
      );

      // Handle therapist card highlight on click (event delegation)
      $(document).on("click", "#tb-therapist-container .tb-card", function (e) {
        // Don't highlight if clicking the select button
        if (
          $(e.target).hasClass("tb-select-btn") ||
          $(e.target).hasClass("tb-service-toggle-btn")
        ) {
          return;
        }

        // Remove highlight from all cards
        $("#tb-therapist-container .tb-card").css(
          "border-color",
          "transparent",
        );

        // Highlight this card
        $(this).css("border-color", "var(--tb-primary)");

        const therapistId = this.dataset.id;
        const therapistName = this.dataset.name;

        tbState.selectedTherapist = {
          id: therapistId,
          name: therapistName,
        };

        tbUpdateSummary("therapist", therapistName);
        // //tbLog(`Therapist selected: ${therapistName}`);

        // setTimeout(() => tbGoToStep(2), 300);
      });
    });
  });
});
