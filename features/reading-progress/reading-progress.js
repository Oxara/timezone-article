/**
 * READING-PROGRESS.JS - Sayfa okuma ilerlemesini gunceller
 * Bagimlilik: reading-progress.css
 *
 * Gerekli HTML:
 *   <div class="reading-progress" id="readingProgress" aria-hidden="true"></div>
 *
 * Yapilandirma (opsiyonel):
 *   window.READING_PROGRESS_CONFIG = {
 *     elementId: 'readingProgress',
 *     contentSelector: null
 *   };
 *
 * contentSelector verilmezse tum dokuman yuksekligi kullanilir.
 */
(function () {
    'use strict';

    var readingProgressConfig = window.READING_PROGRESS_CONFIG || {};
    var ELEMENT_ID = readingProgressConfig.elementId || 'readingProgress';
    var CONTENT_SELECTOR = readingProgressConfig.contentSelector || null;

    function init() {
        var progressElement = document.getElementById(ELEMENT_ID);
        if (!progressElement) return;

        var ticking = false;

        function updateProgress() {
            var contentElement = CONTENT_SELECTOR ? document.querySelector(CONTENT_SELECTOR) : null;
            var scrollTop = window.scrollY;
            var scrollableHeight;

            if (contentElement) {
                var contentTop = contentElement.getBoundingClientRect().top + window.scrollY;
                scrollTop = Math.max(0, window.scrollY - contentTop);
                scrollableHeight = Math.max(0, contentElement.scrollHeight - window.innerHeight);
            } else {
                scrollableHeight = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
            }

            var progress = scrollableHeight > 0 ? Math.min(1, scrollTop / scrollableHeight) : 0;
            progressElement.style.transform = 'scaleX(' + progress + ')';
            ticking = false;
        }

        function requestUpdate() {
            if (ticking) return;
            ticking = true;
            window.requestAnimationFrame(updateProgress);
        }

        window.addEventListener('scroll', requestUpdate, { passive: true });
        window.addEventListener('resize', requestUpdate);
        requestUpdate();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
