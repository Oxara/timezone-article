/**
 * SIDEMENU.JS — Dinamik slide-out kenar menüsü + scroll spy + accordion
 * Bağımlılık: sidemenu.css
 *
 * Gerekli HTML iskelet:
 *   <nav class="sidenav" id="sidenav">
 *     <div class="sidenav-header">
 *       <span>İçindekiler</span>
 *       <button class="sidenav-close" onclick="sidemenu.closeSidenav()">&times;</button>
 *     </div>
 *     <div id="sidenav-body"></div>
 *   </nav>
 *   <div class="sidenav-overlay" id="sidenavOverlay" onclick="sidemenu.closeSidenav()"></div>
 *   <button class="menu-toggle" onclick="sidemenu.toggleSidenav()">
 *     <svg viewBox="0 0 24 24">
 *       <line x1="3" y1="6" x2="21" y2="6"/>
 *       <line x1="3" y1="12" x2="21" y2="12"/>
 *       <line x1="3" y1="18" x2="21" y2="18"/>
 *     </svg>
 *   </button>
 *
 * Otomatik tarama: .container içindeki section h2[id], h3[id], h4[id]
 *
 * Yapılandırma (opsiyonel, script yüklenmeden önce tanımlanabilir):
 *   window.SIDEMENU_CONFIG = {
 *     contentSelector: '.container',  // içerik kapsayıcısı
 *     scrollOffset: 150,              // scroll spy ofseti (px)
 *     mobileBreakpoint: 900,          // bu genişliğin altında link tıklaması menüyü kapatır
 *   };
 *
 * Public API:
 *   sidemenu.toggleSidenav()
 *   sidemenu.closeSidenav()
 */
(function () {
    'use strict';

    var sidemenuConfig = window.SIDEMENU_CONFIG || {};
    var CONTENT_SELECTOR  = sidemenuConfig.contentSelector  || '.container';
    var SCROLL_OFFSET     = sidemenuConfig.scrollOffset     || 150;
    var MOBILE_BREAKPOINT = sidemenuConfig.mobileBreakpoint || 900;
    var sidemenu = window.sidemenu || {};

    /* ── Aç/kapat ── */
    function toggleSidenav() {
        document.getElementById('sidenav').classList.toggle('open');
        document.getElementById('sidenavOverlay').classList.toggle('show');
    }

    function closeSidenav() {
        document.getElementById('sidenav').classList.remove('open');
        document.getElementById('sidenavOverlay').classList.remove('show');
    }

    sidemenu.toggleSidenav = toggleSidenav;
    sidemenu.closeSidenav = closeSidenav;
    window.sidemenu = sidemenu;

    /* ── ESC tuşuyla kapat ── */
    document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') closeSidenav();
    });

    /* ── Menü oluşturma ── */
    function buildMenu() {
        var container = document.getElementById('sidenav-body');
        var content   = document.querySelector(CONTENT_SELECTOR);
        if (!container || !content) return;

        var headings = Array.from(content.querySelectorAll('section h2[id],section h3[id],section h4[id]'))
            .filter(function (heading) {
                return !heading.closest('.demo-output');
            });

        /* Ağaç yapısı: h2 → kök, h3/h4 → çocuk */
        var menuTree       = [];
        var currentSection  = null;
        var currentSubsection  = null;

        headings.forEach(function (heading) {
            var headingLevel = heading.tagName.toLowerCase();
            if (headingLevel === 'h2') {
                currentSection = { heading: heading, children: [] };
                currentSubsection = null;
                menuTree.push(currentSection);
            } else if (headingLevel === 'h3') {
                if (!currentSection) return;
                currentSubsection = { heading: heading, children: [] };
                currentSection.children.push(currentSubsection);
            } else if (headingLevel === 'h4') {
                var parent = currentSubsection || currentSection;
                if (!parent) return;
                parent.children.push({ heading: heading, children: [] });
            }
        });

        /* Link listesi scroll spy için */
        var allLinks = [];

        function makeLink(heading, className) {
            var link = document.createElement('a');
            link.href      = '#' + heading.id;
            link.className = className;
            link.textContent = heading.textContent.replace(/^[\d]+\.\s*/, '').trim();
            allLinks.push({ link: link, heading: heading });
            return link;
        }

        menuTree.forEach(function (sectionNode) {
            var sectionLink = makeLink(sectionNode.heading, 'sidenav-section-link');
            container.appendChild(sectionLink);

            if (sectionNode.children.length > 0) {
                var subsectionGroup = document.createElement('div');
                subsectionGroup.className = 'sidenav-group';
                container.appendChild(subsectionGroup);

                sectionNode.children.forEach(function (child) {
                    var headingLevel = child.heading.tagName.toLowerCase();
                    if (headingLevel === 'h3') {
                        subsectionGroup.appendChild(makeLink(child.heading, 'sidenav-subsection-link'));
                        child.children.forEach(function (grand) {
                            subsectionGroup.appendChild(makeLink(grand.heading, 'sidenav-detail-link'));
                        });
                    } else {
                        subsectionGroup.appendChild(makeLink(child.heading, 'sidenav-subsection-link'));
                    }
                });

                /* Accordion: h2 linkine tıklayınca grup aç/kapat */
                sectionLink.addEventListener('click', function (event) {
                    event.preventDefault();
                    var isOpen = subsectionGroup.classList.contains('open');

                    /* Tüm açık grupları kapat */
                    container.querySelectorAll('.sidenav-group.open').forEach(function (openGroup) {
                        openGroup.style.height = openGroup.scrollHeight + 'px';
                        openGroup.getBoundingClientRect(); /* reflow */
                        openGroup.style.height = '0';
                        openGroup.classList.remove('open');
                    });
                    container.querySelectorAll('a.sidenav-section-link.open').forEach(function (openLink) {
                        openLink.classList.remove('open');
                    });

                    if (!isOpen) {
                        subsectionGroup.style.height = '0';
                        subsectionGroup.classList.add('open');
                        subsectionGroup.getBoundingClientRect(); /* reflow */
                        subsectionGroup.style.height = subsectionGroup.scrollHeight + 'px';
                        subsectionGroup.addEventListener('transitionend', function done() {
                            if (subsectionGroup.classList.contains('open')) subsectionGroup.style.height = 'auto';
                            subsectionGroup.removeEventListener('transitionend', done);
                        });
                        sectionLink.classList.add('open');
                        setTimeout(function () {
                            sectionNode.heading.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }, 60);
                    }
                });
            }
        });

        /* ── Scroll spy ── */
        container.querySelectorAll('a.sidenav-subsection-link,a.sidenav-detail-link').forEach(function (link) {
            link.addEventListener('click', function () {
                if (window.innerWidth < MOBILE_BREAKPOINT) setTimeout(closeSidenav, 250);
            });
        });
        var ticking = false;
        function onScroll() {
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(function () {
                var scrollPos = window.scrollY + SCROLL_OFFSET;
                var active = null;
                for (var linkIndex = allLinks.length - 1; linkIndex >= 0; linkIndex--) {
                    if (allLinks[linkIndex].heading.offsetTop <= scrollPos) {
                        active = allLinks[linkIndex];
                        break;
                    }
                }
                allLinks.forEach(function (linkEntry) { linkEntry.link.classList.remove('active'); });
                if (active) active.link.classList.add('active');
                ticking = false;
            });
        }
        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', buildMenu);
    } else {
        buildMenu();
    }
})();
