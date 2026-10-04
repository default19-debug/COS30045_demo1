/* ==========================================================================
   main.js - site behaviour shared by every page.

   Also contains the Exercise 4.2 work: using D3 to manipulate and add
   elements to the page (style an existing element, append an element,
   append a shape). Those are done on real page furniture rather than throw-
   away demo nodes, so the technique is demonstrated by something the site
   actually needs.
   ========================================================================== */

(function () {
  'use strict';

  document.documentElement.classList.remove('no-js');

  /* --- Footer year ------------------------------------------------------- */
  function footerYear() {
    document.querySelectorAll('[data-year]').forEach(el => {
      el.textContent = String(new Date().getFullYear());
    });
  }

  /* --- Light / dark toggle ----------------------------------------------- */
  function themeToggle() {
    const btn = document.querySelector('.theme-toggle');
    if (!btn) return;

    const KEY = 'cos30045-theme';
    let stored = null;
    try { stored = localStorage.getItem(KEY); } catch (e) { /* private mode */ }

    const sysDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    function apply(mode) {
      document.documentElement.setAttribute('data-theme', mode);
      btn.textContent = mode === 'dark' ? '☀' : '☾';
      btn.setAttribute('aria-label',
        mode === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
    }

    apply(stored || (sysDark ? 'dark' : 'light'));

    btn.addEventListener('click', () => {
      const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      apply(next);
      try { localStorage.setItem(KEY, next); } catch (e) { /* ignore */ }
      // Charts read their colours from CSS custom properties at draw time,
      // so tell them to redraw against the new palette.
      window.dispatchEvent(new CustomEvent('themechange', { detail: next }));
    });
  }

  /* --- Scroll reveal -----------------------------------------------------
     Progressive enhancement: the CSS only hides .reveal once JS has removed
     .no-js, so content is never stranded invisible.
     ---------------------------------------------------------------------- */
  function scrollReveal() {
    const items = document.querySelectorAll('.reveal');
    if (!items.length) return;

    if (!('IntersectionObserver' in window) ||
        window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      items.forEach(el => el.classList.add('is-in'));
      return;
    }

    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px' });

    items.forEach(el => io.observe(el));
  }

  /* --- Headline figures count up on first view --------------------------- */
  function countUp() {
    const nums = document.querySelectorAll('[data-count]');
    if (!nums.length) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function render(el, value) {
      const dp = +(el.dataset.countDp || 0);
      const txt = value.toLocaleString('en-AU', {
        minimumFractionDigits: dp, maximumFractionDigits: dp
      });
      el.textContent = (el.dataset.countPrefix || '') + txt + (el.dataset.countSuffix || '');
    }

    function run(el) {
      const target = +el.dataset.count;
      if (reduce || !('requestAnimationFrame' in window)) { render(el, target); return; }

      const ms = 900;
      const t0 = performance.now();
      function frame(now) {
        const p = Math.min(1, (now - t0) / ms);
        // easeOutCubic
        render(el, target * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(frame);
        else render(el, target);
      }
      requestAnimationFrame(frame);
    }

    if (!('IntersectionObserver' in window)) { nums.forEach(run); return; }

    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) { run(e.target); io.unobserve(e.target); }
      });
    }, { threshold: 0.5 });

    nums.forEach(el => io.observe(el));
  }

  /* ======================================================================
     EXERCISE 4.2 - Manipulate and add elements to a webpage with D3
     ----------------------------------------------------------------------
     Four required techniques, applied to the page's provenance strip:

       1. d3.select  + .style()   style an existing element
       2. d3.select  + .append()  append an element ("p")
       3. .append("svg") + shapes append shapes (rect, circle, line)
       4. .selectAll().data().join()  bind data to elements

     The strip prints which dataset build the page is showing, which is
     information the page genuinely has to carry for the data-governance
     requirement.
     ====================================================================== */
  function d3Provenance() {
    const host = document.querySelector('[data-d3-provenance]');
    if (!host || typeof d3 === 'undefined') return;

    const meta = {
      file: host.dataset.file || 'tv_2026_10_04.csv',
      models: host.dataset.models || '4,599',
      retrieved: host.dataset.retrieved || '4 October 2026'
    };

    // (1) Style an existing element with D3.
    d3.select(host)
      .style('display', 'flex')
      .style('align-items', 'center')
      .style('gap', '0.6rem')
      .style('flex-wrap', 'wrap');

    // (3) Append an SVG and draw shapes into it - a miniature energy-label
    //     swatch showing the five-step ramp used by every chart on the site.
    const svg = d3.select(host)
      .append('svg')
      .attr('viewBox', '0 0 92 16')
      .attr('width', 92)
      .attr('height', 16)
      .attr('aria-hidden', 'true')
      .style('flex', 'none');

    // (4) Bind the ramp array to <rect> elements.
    svg.selectAll('rect')
      .data(VIZ.ENERGY_RAMP)
      .join('rect')
        .attr('x', (d, i) => i * 18)
        .attr('y', 3)
        .attr('width', 16)
        .attr('height', 10)
        .attr('rx', 2)
        .attr('fill', d => d);

    // A line and a circle, so the shape vocabulary is covered.
    svg.append('line')
      .attr('x1', 0).attr('y1', 15).attr('x2', 88).attr('y2', 15)
      .attr('stroke', 'currentColor').attr('stroke-opacity', 0.25);

    svg.append('circle')
      .attr('cx', 8).attr('cy', 8).attr('r', 2.4)
      .attr('fill', 'none')
      .attr('stroke', '#fff').attr('stroke-width', 1.2);

    // (2) Append a new element and set its text from data.
    d3.select(host)
      .append('p')
      .attr('class', 'xs mono')
      .style('margin', '0')
      .style('color', 'var(--ink-3)')
      .text(`${meta.file} · ${meta.models} models · retrieved ${meta.retrieved}`);
  }

  /* --- Boot -------------------------------------------------------------- */
  document.addEventListener('DOMContentLoaded', function () {
    footerYear();
    themeToggle();
    scrollReveal();
    countUp();
    d3Provenance();
  });
})();
