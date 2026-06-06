/**
 * THEME.JS — Dark/Light tema yönetimi
 * Bağımlılık: Yok (standalone)
 *
 * Kullanım:
 *   1. HTML'ye ekle: <script src="theme/theme.js"></script>
 *   2. Toggle butonu: <button onclick="theme.toggleTheme()">...</button>
 *   3. Tercihi localStorage'da saklar; sayfa yüklenmesinde otomatik uygular.
 *
 * API:
 *   theme.toggleTheme()  — Tema değiştirir
 *   theme.setTheme(t)    — 'light' | 'dark'  zorla set eder
 */
(function () {
    'use strict';

    /** Aktif temayı <html data-theme> ve localStorage'a yazar, UI'ı günceller. */
    function setTheme(name) {
        document.documentElement.setAttribute('data-theme', name);
        localStorage.setItem('theme', name);
        updateThemeToggleUI(name);
    }

    /** Toggle: light ↔ dark */
    var theme = window.theme || {};

    function toggleTheme() {
        var current = document.documentElement.getAttribute('data-theme');
        setTheme(current === 'dark' ? 'light' : 'dark');
    }

    /** Dışarıdan set etmek için public API. */
    theme.toggleTheme = toggleTheme;
    theme.setTheme = setTheme;
    window.theme = theme;

    /** Buton ikon/label'ını senkronize eder. */
    function updateThemeToggleUI(themeName) {
        var themeToggleButton = document.querySelector('.theme-toggle');
        if (!themeToggleButton) return;
        var icon = themeToggleButton.querySelector('.theme-toggle-icon');
        var label = themeToggleButton.querySelector('.theme-toggle-label');
        if (icon)  icon.textContent  = themeName === 'dark' ? '🌙' : '☀️';
        if (label) label.textContent = themeName === 'dark' ? 'Light' : 'Dark';
    }

    /* Sayfa yüklenirken kayıtlı temayı uygula (FOUC'u önlemek için
       mümkün olduğunca erken çalıştırılmalı). */
    (function init() {
        var saved = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', saved);
        /* DOM hazır olmayabilir; UI güncellemesini DOMContentLoaded'a ertele. */
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function () { updateThemeToggleUI(saved); });
        } else {
            updateThemeToggleUI(saved);
        }
    })();
})();
