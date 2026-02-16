function initStepWatcher() {

    const container = document.querySelector('.tb-container');

    if (!container) {
        // //console.log('tb-container not found');
        return;
    }

    // //console.log('Initial data-step:', container.dataset.step);

    // 1️⃣ Watch data-step attribute changes
    const attributeObserver = new MutationObserver(function(mutations) {

        mutations.forEach(function(mutation) {

            if (mutation.type === "attributes" && mutation.attributeName === "data-step") {

                // //console.log('🔥 data-step changed to:', container.dataset.step);

            }

        });

    });

    attributeObserver.observe(container, {
        attributes: true,
        attributeFilter: ['data-step']
    });



    // 2️⃣ Watch active step container changes
    const classObserver = new MutationObserver(function() {

        const activeStep = document.querySelector('.tb-step-container.tb-active');

        if (activeStep) {
            // //console.log('🔥 Active step container changed to:', activeStep.id);
        }

    });

    classObserver.observe(document.querySelector('.tb-main-content'), {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class']
    });

}


// Wait for container to exist
function waitForElement(selector, callback) {

    const el = document.querySelector(selector);

    if (el) {
        callback();
        return;
    }

    const observer = new MutationObserver((mutations, obs) => {

        const el = document.querySelector(selector);

        if (el) {
            callback();
            obs.disconnect();
        }

    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

}

waitForElement('.tb-container', initStepWatcher);
// initStepWatcher();