// Step 3: User Information & Booking
document.addEventListener('DOMContentLoaded', () => {
    initStep3();
});

function initStep3() {
    const form = document.getElementById('tb-booking-form');
    
    if (form) {
        form.addEventListener('submit', handleFormSubmit);
        addFormInputListeners(form);
    }
    
    initModalClose();
    // //tbLog('Step 3 initialized with booking form');
}

function handleFormSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    collectUserInfo(formData);
    
    // Save user info to localStorage + PHP Session
    tbSaveSelection('userinfo', tbState.userInfo);
    
    // //tbLog('Booking form submitted', 'SUCCESS');
    // //tbLog(`User: ${tbState.userInfo.first_name} ${tbState.userInfo.last_name}`);
    
    tbShowSuccess();
}

function collectUserInfo(formData) {
    tbState.userInfo = {
        first_name: formData.get('first_name'),
        last_name: formData.get('last_name'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        address: formData.get('address')
    };
}

function addFormInputListeners(form) {
    const inputs = form.querySelectorAll('input, textarea');
    inputs.forEach(input => {
        input.addEventListener('focus', () => {
            input.parentElement.style.transform = 'scale(1.01)';
        });
        input.addEventListener('blur', () => {
            input.parentElement.style.transform = 'scale(1)';
        });
    });
}

function initModalClose() {
    const closeBtn = document.querySelector('.tb-close-modal');
    const modal = document.getElementById('tb-success-modal');
    
    if (closeBtn && modal) {
        closeBtn.addEventListener('click', () => {
            modal.classList.remove('tb-show');
            //reload the page to clear any cached data
            location.reload();
            // resetBookingForm();
        });
    }
}

function resetBookingForm() {
    tbGoToStep(1);
    document.getElementById('tb-booking-form').reset();
    
    // Reset state
    tbState.selectedService = null;
    tbState.selectedTherapist = null;
    tbState.selectedDateTime = null;
    tbState.userInfo = {};
    
    // Clear all selections from localStorage + PHP Session
    tbClearSelection(); // Clears all
    
    // Update UI
    tbUpdateSummary('service', 'Not selected');
    tbUpdateSummary('therapist', 'Not selected');
    tbUpdateSummary('datetime', 'Not selected');
    
    // //tbLog('Booking form reset - all selections cleared');
}
