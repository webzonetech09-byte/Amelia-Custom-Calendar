// STEP A — universal watcher
function waitForElement(selector, callback) {
    const el = document.querySelector(selector);
    if (el) {
        callback(el);
        return;
    }

    const observer = new MutationObserver((mutations, obs) => {
        const el = document.querySelector(selector);
        if (el) {
            callback(el);
            obs.disconnect();
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}


// STEP B — your TEST
waitForElement('tr.order-total span.woocommerce-Price-amount', function(el) {

    console.log('✅ Order total element found:', el.textContent);

    // Listen for ANY change in this element
    const observer = new MutationObserver(() => {
        console.log('🔥 Order total changed to:', el.textContent);
    });
    console.log("🚀 ~ observer:", observer)

    observer.observe(el, {
        childList: true,
        subtree: true,
        characterData: true
    });

});
