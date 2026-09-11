/* ======================================
   A11Y.JS
   Focus trap + zamykanie na Escape dla
   wszystkich okien modalnych (.modal, .day-modal).

   Działa "z zewnątrz" - nie zmienia istniejącej
   logiki otwierania/zamykania w script.js, tylko
   obserwuje zmianę klasy "active" na modalach.
====================================== */

(function () {

    const FOCUSABLE_SELECTOR =
        'a[href], button:not([disabled]), textarea:not([disabled]), ' +
        'input:not([disabled]):not([type="hidden"]), select:not([disabled]), ' +
        '[tabindex]:not([tabindex="-1"])';

    // Selektory znanych przycisków zamykających poszczególne modale.
    // Jeśli modal nie ma żadnego z nich (np. ekran logowania),
    // Escape nie zamknie go - to celowe, logowanie jest wymagane.
    const CLOSE_TRIGGER_SELECTOR =
        '#closeModal, .close-day-modal, #closeImportObsadyModal, ' +
        '#closeTeamsAdminModal, #closeAccountModal';

    let activeModal = null;
    let lastFocusedBeforeOpen = null;

    function getFocusableElements(modal) {
        return Array.from(modal.querySelectorAll(FOCUSABLE_SELECTOR))
            .filter(el => el.offsetParent !== null);
    }

    function handleKeydown(e) {

        if (!activeModal) return;

        if (e.key === "Escape") {

            const closeTrigger =
                activeModal.querySelector(CLOSE_TRIGGER_SELECTOR);

            if (closeTrigger) {
                e.preventDefault();
                closeTrigger.click();
            }

            return;
        }

        if (e.key !== "Tab") return;

        const focusables = getFocusableElements(activeModal);

        if (focusables.length === 0) return;

        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
        }
    }

    function onModalOpen(modal) {

        activeModal = modal;
        lastFocusedBeforeOpen = document.activeElement;

        // Nie kradnij fokusu z pola tekstowego, jeśli modal
        // otworzył się bez interakcji (np. auto-login error) -
        // ale w praktyce user zawsze klika/submituje, więc OK.
        const focusables = getFocusableElements(modal);

        if (focusables.length > 0) {
            focusables[0].focus({ preventScroll: true });
        }
    }

    function onModalClose(modal) {

        if (activeModal !== modal) return;

        activeModal = null;

        if (
            lastFocusedBeforeOpen &&
            typeof lastFocusedBeforeOpen.focus === "function" &&
            document.body.contains(lastFocusedBeforeOpen)
        ) {
            lastFocusedBeforeOpen.focus({ preventScroll: true });
        }

        lastFocusedBeforeOpen = null;
    }

    function watchModal(modal) {

        if (!modal.hasAttribute("role")) {
            modal.setAttribute("role", "dialog");
        }

        if (!modal.hasAttribute("aria-modal")) {
            modal.setAttribute("aria-modal", "true");
        }

        const observer = new MutationObserver(() => {

            const isActive = modal.classList.contains("active");

            if (isActive) {
                onModalOpen(modal);
            } else {
                onModalClose(modal);
            }
        });

        observer.observe(modal, {
            attributes: true,
            attributeFilter: ["class"]
        });
    }

    function init() {

        document
            .querySelectorAll(".modal, .day-modal")
            .forEach(watchModal);

        document.addEventListener("keydown", handleKeydown, true);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }

})();
