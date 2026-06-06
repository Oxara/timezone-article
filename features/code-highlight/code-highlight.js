/**
 * CODE-HIGHLIGHT.JS — Sözdizimi vurgulama + otomatik biçimlendirme
 * Bağımlılık: Yok (standalone). copy-code.js ile birlikte kullanılabilir.
 *
 * Özellikler:
 *   • <script class="code-block language-xml" type="text/plain"> bloklarını
 *     otomatik <pre><code> elemanına dönüştürür.
 *   • XML ve JSON için sözdizimi vurgulaması uygular.
 *   • Kodu otomatik girintiler.
 *
 * Kullanım:
 *   <script src="code-highlight/code-highlight.js"></script>
 *   <!-- Opsiyonel copy-code butonları için copy-code.js'i de dahil et -->
 */
(function () {
    'use strict';

    /* ── Yardımcı: HTML escape ── */
    function escapeHtml(value) {
        return value.replace(/[&<>"']/g, function (character) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character];
        });
    }

    /* ── Başındaki/sonundaki boş satırları at, ortak girintiyi sıfırla ── */
    function normalizeCode(value) {
        var lines = value.replace(/\r\n/g, '\n').split('\n');
        while (lines.length && !lines[0].trim()) lines.shift();
        while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
        var indent = lines.reduce(function (min, line) {
            if (!line.trim()) return min;
            return Math.min(min, line.match(/^\s*/)[0].length);
        }, Infinity);
        return lines.map(function (line) {
            return line.slice(indent === Infinity ? 0 : indent);
        }).join('\n');
    }

    /* ── Dil tespiti ── */
    function detectLanguage(code, explicit) {
        if (explicit) return explicit;
        var text = code.trim();
        if (/^</.test(text))      return 'xml';
        if (/^[\[{]/.test(text))  return 'json';
        if (/^https?:\/\//.test(text)) return 'url';
        return 'text';
    }

    /* ── JSON biçimlendirme ── */
    function formatJson(code) {
        try { return JSON.stringify(JSON.parse(code), null, 2); }
        catch (error) { return code; }
    }

    /* ── XML biçimlendirme (indentation) ── */
    function formatXml(code) {
        var compact = code.replace(/>\s+</g, '><').trim();
        var tokens  = compact.match(/<[^>]+>|[^<]+/g) || [];
        var lines   = [];
        var level   = 0;

        for (var tokenIndex = 0; tokenIndex < tokens.length; tokenIndex++) {
            var token     = tokens[tokenIndex];
            var next      = tokens[tokenIndex + 1] || '';
            var nextAfter = tokens[tokenIndex + 2] || '';

            if (/^<\//.test(token)) {
                level = Math.max(level - 1, 0);
                lines.push('    '.repeat(level) + token);
            } else if (/^</.test(token)) {
                if (/^<\?/.test(token) || /^<!--/.test(token) || /\/>$/.test(token)) {
                    lines.push('    '.repeat(level) + token);
                } else if (next && !/^</.test(next) && /^<\//.test(nextAfter)) {
                    lines.push('    '.repeat(level) + token + next.trim() + nextAfter);
                    tokenIndex += 2;
                } else {
                    lines.push('    '.repeat(level) + token);
                    level += 1;
                }
            } else if (token.trim()) {
                lines.push('    '.repeat(level) + token.trim());
            }
        }
        return lines.join('\n');
    }

    /* ── XML token vurgulama ── */
    function highlightXml(code) {
        return escapeHtml(code).replace(
            /(&lt;!--[\s\S]*?--&gt;)|(&lt;\/?)([\w:.-]+)([^&]*?)(&gt;)/g,
            function (match, comment, open, tag, attrs, close) {
                if (comment) return '<span class="code-token comment">' + comment + '</span>';
                var attrHtml = attrs.replace(
                    /([\w:.-]+)(=)(&quot;.*?&quot;|&#39;.*?&#39;)/g,
                    '<span class="code-token attr">$1</span>' +
                    '<span class="code-token punctuation">$2</span>' +
                    '<span class="code-token string">$3</span>'
                );
                return '<span class="code-token punctuation">' + open + '</span>' +
                    '<span class="code-token tag">' + tag + '</span>' +
                    attrHtml +
                    '<span class="code-token punctuation">' + close + '</span>';
            }
        );
    }

    /* ── JSON token vurgulama ── */
    function highlightJson(code) {
        return escapeHtml(code).replace(
            /("(?:\\.|[^"\\])*"\s*:)|("(?:\\.|[^"\\])*")|\b(true|false|null)\b|-?\b\d+(?:\.\d+)?\b/g,
            function (match, key, stringValue, keyword) {
                if (key)         return '<span class="code-token attr">'    + key         + '</span>';
                if (stringValue) return '<span class="code-token string">'  + stringValue + '</span>';
                if (keyword)     return '<span class="code-token keyword">'  + keyword     + '</span>';
                return '<span class="code-token number">' + match + '</span>';
            }
        );
    }

    /* ── Genel biçimlendir ── */
    function formatCode(code, lang) {
        var normalized = normalizeCode(code);
        if (lang === 'json') return formatJson(normalized);
        if (lang === 'xml')  return formatXml(normalized);
        return normalized;
    }

    window.CodeHighlight = {
        escapeHtml:    escapeHtml,
        normalizeCode: normalizeCode,
        detectLanguage: detectLanguage,
        formatCode:    formatCode,
        highlightXml:  highlightXml,
        highlightJson: highlightJson,
    };
    /* ── Public API: dışarıdan çağrılabilir ── */
    /* ── Init: DOM hazır olduğunda çalıştır ── */
    function init() {
        /* 1. <script class="code-block" type="text/plain"> → <pre><code> */
        document.querySelectorAll('script.code-block[type="text/plain"]').forEach(function (source) {
            var codeBlockWrapper  = document.createElement('pre');
            var code = document.createElement('code');
            var classes  = Array.from(source.classList);
            var langClass = classes.find(function (className) { return className.indexOf('language-') === 0; });
            var lang = langClass ? langClass.replace('language-', '') : '';

            code.textContent = normalizeCode(source.textContent);
            if (lang) code.className = 'language-' + lang;
            codeBlockWrapper.appendChild(code);
            source.parentNode.replaceChild(codeBlockWrapper, source);
        });

        /* 2. Tüm pre > code bloklarını vurgula */
        document.querySelectorAll('pre').forEach(function (codeBlockWrapper) {
            var code = codeBlockWrapper.querySelector('code');
            if (!code) return;

            var explicit = Array.from(code.classList).reduce(function (found, name) {
                return found || (name.indexOf('language-') === 0 ? name.replace('language-', '') : '');
            }, '');

            var lang      = detectLanguage(code.textContent, explicit);
            var formatted = formatCode(code.textContent, lang);

            codeBlockWrapper.setAttribute('data-lang', lang);
            code.textContent = formatted;

            if (lang === 'xml')  code.innerHTML = highlightXml(formatted);
            if (lang === 'json') code.innerHTML = highlightJson(formatted);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
