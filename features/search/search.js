/**
 * SEARCH.JS — Ctrl+K sayfa içi arama modalı
 * Bağımlılık: search.css
 *
 * Gerekli HTML:
 *   <!-- Tetik butonu (header-actions içine koy) -->
 *   <button class="search-trigger" onclick="search.openSearch()" aria-label="Arama yap">
 *     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
 *       <circle cx="10" cy="10" r="7"/><line x1="21" y1="21" x2="15" y2="15"/>
 *     </svg>
 *     <span>Ara</span>
 *     <kbd>Ctrl+K</kbd>
 *   </button>
 *
 *   <!-- Modal -->
 *   <div class="search-overlay" id="searchOverlay" onclick="search.closeSearchOnOverlay(event)">
 *     <div class="search-modal" onclick="event.stopPropagation()">
 *       <div class="search-input-wrapper">
 *         <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
 *           <circle cx="10" cy="10" r="7"/><line x1="21" y1="21" x2="15" y2="15"/>
 *         </svg>
 *         <input type="text" class="search-input" id="searchInput"
 *                placeholder="Ara..." autocomplete="off">
 *         <button class="search-close" onclick="search.closeSearch()">×</button>
 *       </div>
 *       <div class="search-results" id="searchResults"></div>
 *     </div>
 *   </div>
 *
 * Yapılandırma (opsiyonel, yüklenmeden önce tanımlanabilir):
 *   window.SEARCH_CONFIG = {
 *     contentSelector: '.container',
 *     maxResults: 50,
 *     debounceMs: 200,
 *     noResultsText: '✨ Sonuç bulunamadı.',
 *     sectionTypes: {           // CSS class → etiket
 *       scenario-card: 'Senaryo',
 *       endpoint-card: 'Endpoint',
 *       table-wrapper: 'Tablo',
 *       callout: 'Not',
 *     }
 *   };
 *
 * Public API:
 *   search.openSearch()
 *   search.closeSearch()
 *   search.closeSearchOnOverlay(event)
 *   search.navigateToResult(anchor, sectionId)
 */
(function () {
    'use strict';

    var searchConfig = window.SEARCH_CONFIG || {};
    var CONTENT_SELECTOR    = searchConfig.contentSelector || '.container';
    var MAX_RESULTS    = searchConfig.maxResults      || 50;
    var DEBOUNCE_MS    = searchConfig.debounceMs      || 200;
    var NO_RESULTS_MESSAGE = searchConfig.noResultsText   || '✨ Sonuç bulunamadı. Farklı bir kelime deneyin.';

    var SECTION_TYPES = Object.assign({
        'scenario-card': 'Senaryo',
        'endpoint-card': 'Endpoint',
        'table-wrapper': 'Tablo',
        'callout': 'Not',
    }, searchConfig.sectionTypes || {});

    /* ── State ── */
    var searchOverlay    = null;
    var searchInput      = null;
    var searchResults    = null;
    var searchableContent = [];
    var selectedIndex    = -1;
    var debounceTimer    = null;
    var search = window.search || {};

    /* ══════════════════════════════════════════════════════════
       İNDEKS OLUŞTURMA
    ══════════════════════════════════════════════════════════ */
    function buildIndex() {
        var container = document.querySelector(CONTENT_SELECTOR);
        if (!container) return;

        var sections = container.querySelectorAll('section, .scenario-card, .endpoint-card, .table-wrapper, .callout');
        var seen = new Set();

        sections.forEach(function (section) {
            if (seen.has(section)) return;
            seen.add(section);

            var heading     = section.querySelector('h2, h3, h4');
            var sectionTitle = heading ? heading.textContent.trim() : '';
            var parentSec   = section.closest('section');
            var sectionId   = parentSec ? parentSec.id : '';
            var textContent = section.textContent || '';

            var codeBlocks = section.querySelectorAll('pre code, .code-block');
            var codeText   = '';
            codeBlocks.forEach(function (codeBlock) { codeText += ' ' + (codeBlock.textContent || ''); });

            var fullText = sectionTitle + ' ' + textContent + ' ' + codeText;
            var preview  = textContent.substring(0, 300).replace(/\s+/g, ' ').trim();
            if (preview.length > 300) preview = preview.substring(0, 297) + '...';

            /* Bölüm tipi etiketi */
            var sectionType = 'İçerik';
            var classes = Array.from(section.classList);
            for (var key in SECTION_TYPES) {
                if (classes.indexOf(key) !== -1) { sectionType = SECTION_TYPES[key]; break; }
            }
            if (sectionType === 'İçerik') {
                if (section.id && /^s\d/.test(section.id))   sectionType = 'Bölüm';
                else if (section.id && /^h-/.test(section.id)) sectionType = 'Alt Bölüm';
            }

            searchableContent.push({
                element:     section,
                title:       sectionTitle,
                text:        fullText,
                preview:     preview,
                sectionId:   sectionId,
                sectionType: sectionType,
                id:          section.id || (section.querySelector('[id]') ? section.querySelector('[id]').id : ''),
            });
        });

        /* Başlıkları da ayrıca ekle (daha hızlı gezinme için) */
        var headings = container.querySelectorAll('h2[id], h3[id], h4[id]');
        headings.forEach(function (heading) {
            if (seen.has(heading)) return;
            seen.add(heading);
            var parentSection = heading.closest('section');
            searchableContent.push({
                element:     heading,
                title:       heading.textContent.trim(),
                text:        heading.textContent.trim(),
                preview:     heading.textContent.trim(),
                sectionId:   parentSection ? parentSection.id : '',
                sectionType: 'Başlık',
                id:          heading.id,
            });
        });
    }

    /* ══════════════════════════════════════════════════════════
       ARAMA
    ══════════════════════════════════════════════════════════ */
    function performSearch(query) {
        if (!query || query.trim().length < 2) {
            renderResults([]);
            return;
        }

        var term    = query.toLowerCase().trim();
        var results = [];
        var wordBoundaryPattern  = new RegExp('\\b' + term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');

        searchableContent.forEach(function (item) {
            var textLower  = (item.text  || '').toLowerCase();
            var titleLower = (item.title || '').toLowerCase();
            var score      = 0;

            if (titleLower.includes(term)) score += 100;
            if (textLower.includes(term))  score += 10;
            if (wordBoundaryPattern.test(item.text))    score += 50;

            if (score > 0) results.push(Object.assign({}, item, { score: score }));
        });

        results.sort(function (leftResult, rightResult) { return rightResult.score - leftResult.score; });
        renderResults(results.slice(0, MAX_RESULTS));
    }

    /* ── Eşleşen terimi <mark> ile vurgula ── */
    function highlight(text, term) {
        if (!term || term.length < 2) return text;
        var highlightPattern = new RegExp('(' + term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
        return text.replace(highlightPattern, '<mark>$1</mark>');
    }

    /* ── Sonuçları DOM'a yaz ── */
    function renderResults(results) {
        if (!searchResults) return;

        if (results.length === 0) {
            searchResults.innerHTML = '<div class="search-no-results">' + NO_RESULTS_MESSAGE + '</div>';
            return;
        }

        var term = searchInput ? searchInput.value.trim() : '';
        var resultsHtml = '';

        results.forEach(function (result, resultIndex) {
            var highlightedTitle   = result.title;
            var highlightedPreview = result.preview;

            if (term && term.length >= 2) {
                highlightedTitle = highlight(result.title, term);
                var textLower  = result.text.toLowerCase();
                var termLower  = term.toLowerCase();
                var matchPos   = textLower.indexOf(termLower);
                if (matchPos !== -1) {
                    var start   = Math.max(0, matchPos - 60);
                    var end     = Math.min(result.text.length, matchPos + term.length + 80);
                    var snippet = result.text.substring(start, end);
                    if (start > 0) snippet = '...' + snippet;
                    if (end < result.text.length) snippet += '...';
                    highlightedPreview = highlight(snippet, term);
                } else {
                    highlightedPreview = highlight(result.preview.substring(0, 200), term);
                }
            }

            var anchor  = result.id || (result.element ? (result.element.id || '') : '');
            var badge   = result.sectionType
                ? '<span class="search-result-section">' + result.sectionType + '</span>'
                : '';

            resultsHtml +=
                '<div class="search-result-item"' +
                ' onclick="search.navigateToResult(\'' + anchor + '\',\'' + result.sectionId + '\')">' +
                badge +
                '<div class="search-result-title">' + (highlightedTitle || '(Başlıksız)') + '</div>' +
                '<div class="search-result-content">' + highlightedPreview + '</div>' +
                '</div>';
        });

        searchResults.innerHTML = resultsHtml;
        selectedIndex = -1;
    }

    /* ══════════════════════════════════════════════════════════
       NAVİGASYON
    ══════════════════════════════════════════════════════════ */
    function navigateToResult(anchor, sectionId) {
        var target = null;
        if (anchor   && document.getElementById(anchor))   target = document.getElementById(anchor);
        if (!target && sectionId && document.getElementById(sectionId)) target = document.getElementById(sectionId);

        closeSearch();
        if (!target) return;

        setTimeout(function () {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            target.style.transition = 'background 0.3s';
            target.style.background = 'var(--brand-bg, rgba(81,43,212,0.1))';
            setTimeout(function () { target.style.background = ''; }, 1500);
        }, 150);
    }

    /* ══════════════════════════════════════════════════════════
       KLAVYE
    ══════════════════════════════════════════════════════════ */
    function handleKeyboard(event) {
        if (!searchOverlay || !searchOverlay.classList.contains('active')) return;

        var resultItems = document.querySelectorAll('.search-result-item');

        switch (event.key) {
            case 'ArrowDown':
                event.preventDefault();
                if (resultItems.length > 0) {
                    if (selectedIndex >= 0) resultItems[selectedIndex].classList.remove('selected');
                    selectedIndex = Math.min(selectedIndex + 1, resultItems.length - 1);
                    resultItems[selectedIndex].classList.add('selected');
                    resultItems[selectedIndex].scrollIntoView({ block: 'nearest' });
                }
                break;

            case 'ArrowUp':
                event.preventDefault();
                if (resultItems.length > 0) {
                    if (selectedIndex >= 0) resultItems[selectedIndex].classList.remove('selected');
                    selectedIndex = Math.max(selectedIndex - 1, 0);
                    resultItems[selectedIndex].classList.add('selected');
                    resultItems[selectedIndex].scrollIntoView({ block: 'nearest' });
                }
                break;

            case 'Enter':
                event.preventDefault();
                if (selectedIndex >= 0 && resultItems[selectedIndex]) {
                    resultItems[selectedIndex].click();
                } else if (resultItems.length >= 1) {
                    resultItems[0].click();
                }
                break;

            case 'Escape':
                closeSearch();
                break;
        }
    }

    /* ══════════════════════════════════════════════════════════
       PUBLIC API
    ══════════════════════════════════════════════════════════ */
    function openSearch() {
        if (!searchOverlay) return;
        searchOverlay.classList.add('active');
        setTimeout(function () {
            if (searchInput) { searchInput.focus(); searchInput.select(); }
        }, 100);
        document.addEventListener('keydown', handleKeyboard);
    }

    function closeSearch() {
        if (!searchOverlay) return;
        searchOverlay.classList.remove('active');
        if (searchInput) searchInput.value = '';
        renderResults([]);
        document.removeEventListener('keydown', handleKeyboard);
    }

    function closeSearchOnOverlay(event) {
        if (event.target === searchOverlay) closeSearch();
    }

    search.openSearch = openSearch;
    search.closeSearch = closeSearch;
    search.closeSearchOnOverlay = closeSearchOnOverlay;
    search.navigateToResult = navigateToResult;
    window.search = search;

    /* ══════════════════════════════════════════════════════════
       INIT
    ══════════════════════════════════════════════════════════ */
    function init() {
        searchOverlay  = document.getElementById('searchOverlay');
        searchInput    = document.getElementById('searchInput');
        searchResults  = document.getElementById('searchResults');

        if (!searchOverlay) return;

        buildIndex();

        /* Input debounce */
        if (searchInput) {
            searchInput.addEventListener('input', function (event) {
                if (debounceTimer) clearTimeout(debounceTimer);
                debounceTimer = setTimeout(function () {
                    performSearch(event.target.value);
                }, DEBOUNCE_MS);
            });
        }

        /* Ctrl+K / Cmd+K global kısayol */
        document.addEventListener('keydown', function (event) {
            if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
                event.preventDefault();
                openSearch();
            }
            if (event.key === 'Escape' && searchOverlay && searchOverlay.classList.contains('active')) {
                closeSearch();
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
