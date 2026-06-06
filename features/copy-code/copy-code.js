/**
 * COPY-CODE.JS — pre bloklarına otomatik "Copy" butonu ekler
 * Bağımlılık: copy-code.css, code-highlight.js (code-highlight'tan sonra yüklenmeli)
 *
 * Kullanım:
 *   <script src="code-highlight/code-highlight.js"></script>
 *   <script src="copy-code/copy-code.js"></script>
 *
 * copy-code.js, code-highlight.js'in DOM işlemlerini tamamlamasından sonra
 * çalışması için aynı DOMContentLoaded kuyruğunu kullanır.
 * code-highlight.js olmadan yalnızca mevcut pre > code bloklarına buton ekler.
 */
(function () {
    'use strict';

    var COPY_LABEL   = 'Copy';
    var COPIED_LABEL = '✓ Copied';
    var RESET_MS     = 1500;

    function attachCopyButtons() {
        document.querySelectorAll('pre').forEach(function (codeBlockWrapper) {
            /* Zaten buton varsa tekrar ekleme */
            if (codeBlockWrapper.querySelector('.code-copy-button')) return;

            var code = codeBlockWrapper.querySelector('code');
            if (!code) return;

            var copyButton = document.createElement('button');
            copyButton.className = 'code-copy-button';
            copyButton.type      = 'button';
            copyButton.textContent = COPY_LABEL;

            copyButton.addEventListener('click', function () {
                var text = code.textContent || '';
                navigator.clipboard.writeText(text).then(function () {
                    copyButton.textContent = COPIED_LABEL;
                    copyButton.classList.add('is-copied');
                    setTimeout(function () {
                        copyButton.textContent = COPY_LABEL;
                        copyButton.classList.remove('is-copied');
                    }, RESET_MS);
                }).catch(function () {
                    /* Clipboard API başarısız → fallback execCommand */
                    var fallbackTextarea = document.createElement('textarea');
                    fallbackTextarea.value = text;
                    fallbackTextarea.style.position = 'fixed';
                    fallbackTextarea.style.opacity  = '0';
                    document.body.appendChild(fallbackTextarea);
                    fallbackTextarea.select();
                    try { document.execCommand('copy'); } catch (error) { /* sessiz */ }
                    document.body.removeChild(fallbackTextarea);
                    copyButton.textContent = COPIED_LABEL;
                    copyButton.classList.add('is-copied');
                    setTimeout(function () {
                        copyButton.textContent = COPY_LABEL;
                        copyButton.classList.remove('is-copied');
                    }, RESET_MS);
                });
            });

            codeBlockWrapper.appendChild(copyButton);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', attachCopyButtons);
    } else {
        attachCopyButtons();
    }
})();
