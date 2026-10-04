/* ==========================================================================
   charts.js - shared D3 helpers used by every chart on the site.

   Keeps one copy of the things that must stay consistent across figures:
   the colour scales, the number/currency formats, the tooltip, the axis
   drawing, and the responsive <svg> set-up pattern from W4.2/W4.3.
   ========================================================================== */

const VIZ = (() => {
  'use strict';

  /* --- Shared constants -------------------------------------------------- */

  // Must match PRICE_C_PER_KWH in knime/pipeline_reference.py.
  const DEFAULT_PRICE = 35;          // cents per kWh
  const LABEL_HOURS = 10;            // hours/day assumed by the GEMS label

  const DATA = 'data/out/';

  /* --- Formats ----------------------------------------------------------- */

  const fmt = {
    int: d3.format(','),
    kwh: (v) => d3.format(',')(Math.round(v)) + ' kWh',
    dollars: (v) => '$' + d3.format(',')(Math.round(v)),
    dollars1: (v) => '$' + d3.format(',.1f')(v),
    watts: (v) => d3.format('.0f')(v) + ' W',
    inches: (v) => v + '"',
    x: (v) => d3.format('.1f')(v) + '×',
    stars: (v) => (Number.isInteger(v) ? v : d3.format('.1f')(v)) + '★'
  };

  /* --- Colour ------------------------------------------------------------
     The sequential ramp is the Australian Energy Rating Label's own ramp:
     green = efficient, red = inefficient. Reusing it means the chart legend
     already matches the sticker the reader has seen in a shop.
     ---------------------------------------------------------------------- */

  const ENERGY_RAMP = ['#00843d', '#8cc63f', '#ffd500', '#f7941e', '#e8112d'];

  /**
   * Sequential scale over kWh/year: low (green) -> high (red).
   *
   * `exponent` reshapes how the ramp is spread across the domain. Energy data
   * is strongly right-skewed - a handful of 2,500 kWh giants stretch the top
   * of the range - so a plain linear ramp dumps almost every real value into
   * the green end and the colour stops distinguishing anything. An exponent
   * below 1 spreads the ramp over the crowded low end. The scale stays
   * continuous and monotonic, so higher always reads redder; only the spacing
   * changes, and the exact value is printed in the cell anyway.
   */
  function energyScale(domain, exponent = 1) {
    const [lo, hi] = domain;
    const stops = d3.range(5).map(i => lo + Math.pow(i / 4, 1 / exponent) * (hi - lo));
    return d3.scaleLinear()
      .domain(stops)
      .range(ENERGY_RAMP)
      .clamp(true)
      .interpolate(d3.interpolateRgb);
  }

  /** Categorical scale for screen technology. Colour-blind safe trio. */
  const techColour = d3.scaleOrdinal()
    .domain(['LCD', 'LCD (LED)', 'OLED'])
    .range(['#4c72b0', '#55a868', '#c44e52'])
    .unknown('#8792a0');

  const TECH_LABEL = {
    'LCD': 'LCD (CCFL backlight)',
    'LCD (LED)': 'LCD, LED backlight',
    'OLED': 'OLED'
  };

  /* --- Tooltip -----------------------------------------------------------
     One tooltip element for the whole page, positioned with fixed
     coordinates so it never gets clipped by a scrolling container.
     ---------------------------------------------------------------------- */

  let tipEl = null;

  function tip() {
    if (!tipEl) {
      tipEl = document.createElement('div');
      tipEl.className = 'tip';
      tipEl.setAttribute('role', 'tooltip');
      document.body.appendChild(tipEl);
    }
    return tipEl;
  }

  function showTip(event, html) {
    const el = tip();
    el.innerHTML = html;
    el.classList.add('is-on');
    moveTip(event);
  }

  function moveTip(event) {
    const el = tip();
    const pad = 14;
    const r = el.getBoundingClientRect();
    let x = event.clientX + pad;
    let y = event.clientY + pad;
    if (x + r.width > window.innerWidth - 8) x = event.clientX - r.width - pad;
    if (y + r.height > window.innerHeight - 8) y = event.clientY - r.height - pad;
    el.style.left = Math.max(8, x) + 'px';
    el.style.top = Math.max(8, y) + 'px';
  }

  function hideTip() {
    if (tipEl) tipEl.classList.remove('is-on');
  }

  /** Build the inner HTML of a tooltip: a title plus key/value rows. */
  function tipHtml(title, rows) {
    const body = rows
      .filter(r => r)
      .map(([k, v]) => `<div class="tip__row"><span class="tip__k">${k}</span><b>${v}</b></div>`)
      .join('');
    return `<div style="margin-bottom:4px"><b>${title}</b></div>${body}`;
  }

  /* --- SVG set-up --------------------------------------------------------
     The pattern from W4.2: select the responsive container, append an svg,
     give it a viewBox so it scales, and return the inner plot group already
     offset by the margins.
     ---------------------------------------------------------------------- */

  function makeSvg(selector, width, height, margin) {
    const host = d3.select(selector);
    host.selectAll('*').remove();

    const svg = host.append('svg')
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('preserveAspectRatio', 'xMidYMid meet')
      .attr('role', 'img');

    const plot = svg.append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);

    return {
      svg,
      plot,
      w: width - margin.left - margin.right,
      h: height - margin.top - margin.bottom
    };
  }

  /** Accessible description for a chart, read by screen readers. */
  function describe(svg, title, desc) {
    svg.append('title').text(title);
    svg.append('desc').text(desc);
    svg.attr('aria-label', title + '. ' + desc);
  }

  /* --- Axes --------------------------------------------------------------- */

  function axisBottom(plot, scale, h, opts = {}) {
    const g = plot.append('g')
      .attr('class', 'axis axis--x')
      .attr('transform', `translate(0, ${h})`)
      .call(d3.axisBottom(scale).ticks(opts.ticks || 6).tickFormat(opts.format || null).tickSizeOuter(0));
    if (opts.rotate) {
      g.selectAll('text')
        .attr('transform', `rotate(${opts.rotate})`)
        .attr('text-anchor', 'end')
        .attr('dx', '-0.5em').attr('dy', '0.3em');
    }
    return g;
  }

  function axisLeft(plot, scale, opts = {}) {
    return plot.append('g')
      .attr('class', 'axis axis--y')
      .call(d3.axisLeft(scale).ticks(opts.ticks || 6).tickFormat(opts.format || null).tickSizeOuter(0));
  }

  /** Horizontal gridlines behind the marks - cheap orientation, little ink. */
  function gridY(plot, scale, w, ticks = 6) {
    plot.append('g')
      .attr('class', 'grid')
      .selectAll('line')
      .data(scale.ticks(ticks))
      .join('line')
        .attr('class', 'gridline')
        .attr('x1', 0).attr('x2', w)
        .attr('y1', d => scale(d)).attr('y2', d => scale(d));
  }

  function axisTitle(plot, text, x, y, anchor = 'middle') {
    plot.append('text')
      .attr('class', 'axis-title')
      .attr('x', x).attr('y', y)
      .attr('text-anchor', anchor)
      .text(text);
  }

  /* --- Loading / failure state -------------------------------------------
     Opening the page from file:// blocks fetch, so d3.csv fails. Rather than
     an empty box, say what to do about it.
     ---------------------------------------------------------------------- */

  function msg(selector, html) {
    const host = document.querySelector(selector);
    if (host) host.innerHTML = `<div class="chart-msg">${html}</div>`;
  }

  function loadingMsg(selector) {
    msg(selector, '<span>Loading data…</span>');
  }

  function failMsg(selector, err) {
    const offline = location.protocol === 'file:';
    msg(selector, offline
      ? `<div><strong>Charts need a local web server.</strong><br>
         The browser blocks <code>fetch()</code> on <code>file://</code>, so the CSV cannot load.<br>
         Run <code>python -m http.server 8000</code> in the project folder,
         then open <code>http://localhost:8000</code>.</div>`
      : `<div><strong>Could not load the data file.</strong><br>
         <span class="xs">${err && err.message ? err.message : err}</span></div>`);
  }

  /* --- CSV loading -------------------------------------------------------
     d3.csv with a row-conversion function, as taught in W4.3: every value
     arrives as a string, so numbers are coerced here once, at the edge.
     ---------------------------------------------------------------------- */

  const rowParsers = {
    clean: d => ({
      brand: d.Brand,
      model: d.model,
      tech: d.screen_tech,
      inches: +d.inches,
      m2: +d.screen_m2,
      watts: +d.watts_on,
      kwh: +d.kwh_year,
      cost: +d.cost_aud_year,
      wPerM2: +d.watts_per_m2,
      kwhPerM2: +d.kwh_per_m2,
      star: +d.star_rating,
      stars: +d.stars,
      band: d.size_band,
      country: d.Country
    }),
    band: d => ({
      band: d.size_band,
      models: +d.models,
      min: +d.kwh_min,
      median: +d.kwh_median,
      max: +d.kwh_max,
      inches: +d.median_inches,
      spread: +d.kwh_spread,
      ratio: +d.spread_ratio
    }),
    heat: d => ({
      band: d.size_band,
      stars: +d.stars,
      kwh: +d.kwh_median,
      models: +d.models,
      cost: +d.cost_aud_year
    }),
    shelf: d => ({
      brand: d.Brand,
      model: d.model,
      tech: d.screen_tech,
      inches: +d.inches,
      watts: +d.watts_on,
      kwh: +d.kwh_year,
      cost: +d.cost_aud_year,
      star: +d.star_rating,
      wPerM2: +d.watts_per_m2
    }),
    brand: d => ({
      brand: d.Brand,
      models: +d.models,
      kwh: +d.kwh_median,
      inches: +d.median_inches,
      kwhPerM2: +d.kwh_per_m2_median,
      star: +d.star_median
    })
  };

  function load(file, parser) {
    return d3.csv(DATA + file, rowParsers[parser]);
  }

  /* --- Size band ordering (used as a shared categorical domain) ---------- */

  const BAND_ORDER = ['32in & under', '33-43in', '44-50in', '51-55in',
                      '56-65in', '66-75in', '76-85in', '86in+'];

  /**
   * Band labels are stored as plain ASCII so the same string survives a KNIME
   * Rule Engine, a CSV file and a JavaScript comparison without escaping
   * trouble. Swap in a real inch mark only at the moment of display.
   */
  const prettyBand = (b) => String(b).replace(/in/g, '″');

  /** Re-render charts on resize, but only after the user has stopped. */
  function onResize(fn) {
    let t;
    window.addEventListener('resize', () => {
      clearTimeout(t);
      t = setTimeout(fn, 180);
    });
  }

  /** True when the visitor has asked for less motion. */
  const reducedMotion = () =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /** Duration helper: collapses to 0 when motion is reduced. */
  const dur = (ms) => (reducedMotion() ? 0 : ms);

  return {
    DEFAULT_PRICE, LABEL_HOURS, DATA, BAND_ORDER,
    fmt, ENERGY_RAMP, energyScale, techColour, TECH_LABEL,
    showTip, moveTip, hideTip, tipHtml,
    makeSvg, describe, axisBottom, axisLeft, gridY, axisTitle,
    msg, loadingMsg, failMsg, load, onResize, reducedMotion, dur, prettyBand
  };
})();
