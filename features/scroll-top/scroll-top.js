/**
 * SCROLL-TOP.JS — "Başa dön" butonunu scroll pozisyonuna göre göster/gizle
 * Bağımlılık: scroll-top.css
 *
 * Gerekli HTML:
 *   <button class="scroll-top" id="scrollTop"
 *           onclick="window.scrollTo({top:0,behavior:'smooth'})"
 *           aria-label="Başa dön">
 *     <svg viewBox="0 0 24 24"><polyline points="18 15 12 9 6 15"/></svg>
 *   </button>
 *
 * Yapılandırma (opsiyonel):
 *   window.SCROLL_TOP_CONFIG = { threshold: 400 }; // görünme eşiği (px)
 */
(function () {
    'use strict';

    var scrollTopConfig = window.SCROLL_TOP_CONFIG || {};
    var VISIBILITY_THRESHOLD = scrollTopConfig.threshold || 400;

    function init() {
        var scrollTopButton = document.getElementById('scrollTop');
        if (!scrollTopButton) return;

        window.addEventListener('scroll', function () {
            scrollTopButton.classList.toggle('visible', window.scrollY > VISIBILITY_THRESHOLD);
        }, { passive: true });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
