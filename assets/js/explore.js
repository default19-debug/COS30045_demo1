/* ==========================================================================
   explore.js - the interactive explorer on explore.html.

   Three linked views over the cleaned register, all driven by one filter
   state object:
     1. a horizontal bar chart of brand efficiency (kWh per m2 of screen)
     2. a table of the matching models
     3. a "your television" panel that prices one real registered model

   Efficiency is expressed per square metre of screen so that brands selling
   mostly small sets are not flattered by their size mix. Comparing raw
   kWh/year across brands would mostly measure what size they sell.
   ========================================================================== */

(function () {
  'use strict';

  if (typeof d3 === 'undefined') return;

  const cssVar = (name) =>
    getComputedStyle(document.documentElement).getPropertyValue(name).trim();

  let ALL = [];                       // every cleaned row
  const state = {
    bands: new Set(),                 // empty = all
    techs: new Set(),
    brand: 'all',
    query: '',
    price: VIZ.DEFAULT_PRICE,
    hours: VIZ.LABEL_HOURS,
    sort: 'kwh',
    dir: 1,
    selected: null
  };

  /* --- Filtering ---------------------------------------------------------- */

  function filtered() {
    const q = state.query.trim().toLowerCase();
    return ALL.filter(d => {
      if (state.bands.size && !state.bands.has(d.band)) return false;
      if (state.techs.size && !state.techs.has(d.tech)) return false;
      if (state.brand !== 'all' && d.brand !== state.brand) return false;
      if (q && !(d.model.toLowerCase().includes(q) || d.brand.toLowerCase().includes(q))) return false;
      return true;
    });
  }

  /** Cost of a model at the reader's tariff and viewing hours. */
  function costOf(d) {
    return d.kwh * (state.price / 100) * (state.hours / VIZ.LABEL_HOURS);
  }

  /* --- View 1: brand efficiency bar chart --------------------------------
     Band scale for the categorical axis, linear scale for the quantity, and
     direct value labels so the reader never has to measure against an axis.
     ---------------------------------------------------------------------- */

  function drawBrands(rows) {
    const sel = '#chart-brands';
    const MIN_MODELS = 8;

    const byBrand = Array.from(
      d3.group(rows, d => d.brand),
      ([brand, list]) => ({
        brand,
        models: list.length,
        kwhPerM2: d3.median(list, d => d.kwhPerM2),
        kwh: d3.median(list, d => d.kwh),
        inches: d3.median(list, d => d.inches),
        star: d3.median(list, d => d.star)
      })
    )
      .filter(d => d.models >= MIN_MODELS)
      .sort((a, b) => d3.ascending(a.kwhPerM2, b.kwhPerM2))
      .slice(0, 22);

    if (!byBrand.length) {
      VIZ.msg(sel, '<div><strong>No brand has enough models in this selection.</strong><br>' +
                   `A brand needs at least ${MIN_MODELS} matching models to be shown.</div>`);
      return;
    }

    const W = 1000;
    const m = { top: 20, right: 92, bottom: 54, left: 150 };
    const H = m.top + m.bottom + byBrand.length * 27;
    const { svg, plot, w, h } = VIZ.makeSvg(sel, W, H, m);

    VIZ.describe(svg,
      'Median energy use per square metre of screen, by brand',
      'A horizontal bar chart ranking brands from most to least efficient per square metre of ' +
      'screen area. Bars start at zero.');

    const x = d3.scaleLinear()
      .domain([0, d3.max(byBrand, d => d.kwhPerM2) * 1.02]).nice()
      .range([0, w]);

    const y = d3.scaleBand()
      .domain(byBrand.map(d => d.brand))
      .range([0, h])
      .padding(0.18);

    plot.append('g').selectAll('line')
      .data(x.ticks(6))
      .join('line')
        .attr('class', 'gridline')
        .attr('x1', d => x(d)).attr('x2', d => x(d))
        .attr('y1', 0).attr('y2', h);

    VIZ.axisBottom(plot, x, h, { ticks: 6, format: d3.format(',') });
    VIZ.axisTitle(plot, 'Median kWh per year, per m² of screen  (lower is better)', w / 2, h + 44);

    const colour = VIZ.energyScale(d3.extent(byBrand, d => d.kwhPerM2));

    const g = plot.append('g')
      .selectAll('g')
      .data(byBrand, d => d.brand)
      .join('g')
        .attr('transform', d => `translate(0, ${y(d.brand)})`);

    g.append('rect')
      .attr('class', 'bar')
      .attr('x', 0).attr('y', 0)
      .attr('height', y.bandwidth())
      .attr('rx', 3)
      .attr('fill', d => colour(d.kwhPerM2))
      .attr('width', 0)
      .transition().duration(VIZ.dur(500)).delay((d, i) => VIZ.dur(i * 22))
        .attr('width', d => Math.max(1, x(d.kwhPerM2)));

    g.append('text')
      .attr('class', 'value-label')
      .attr('x', d => x(d.kwhPerM2) + 7)
      .attr('y', y.bandwidth() / 2 + 4)
      .attr('fill', cssVar('--ink-2'))
      .text(d => Math.round(d.kwhPerM2));

    // Category labels, drawn from the band scale domain.
    plot.append('g').attr('class', 'axis')
      .selectAll('text')
      .data(byBrand)
      .join('text')
        .attr('x', -10)
        .attr('y', d => y(d.brand) + y.bandwidth() / 2 + 4)
        .attr('text-anchor', 'end')
        .style('font-size', '12px')
        .attr('fill', cssVar('--ink-2'))
        .text(d => d.brand);

    // Full-width hit area per row.
    g.append('rect')
      .attr('x', -m.left).attr('y', 0)
      .attr('width', w + m.left).attr('height', y.bandwidth())
      .attr('fill', 'transparent')
      .style('cursor', 'pointer')
      .on('pointerenter', (event, d) => {
        VIZ.showTip(event, VIZ.tipHtml(d.brand, [
          ['Models in selection', VIZ.fmt.int(d.models)],
          ['Median kWh/m²', Math.round(d.kwhPerM2)],
          ['Median kWh/year', VIZ.fmt.kwh(d.kwh)],
          ['Median screen', d.inches + '"'],
          ['Median stars', VIZ.fmt.stars(d.star)]
        ]));
      })
      .on('pointermove', VIZ.moveTip)
      .on('pointerleave', VIZ.hideTip);
  }

  /* --- View 2: model table ------------------------------------------------ */

  const COLUMNS = [
    { key: 'brand', label: 'Brand', type: 'text' },
    { key: 'model', label: 'Model', type: 'text' },
    { key: 'tech', label: 'Panel', type: 'text' },
    { key: 'inches', label: 'Size', type: 'num', fmt: d => d.inches + '"' },
    { key: 'kwh', label: 'kWh/yr', type: 'num', fmt: d => VIZ.fmt.int(d.kwh) },
    { key: 'star', label: 'Stars', type: 'num', fmt: d => VIZ.fmt.stars(d.star) },
    { key: 'cost', label: 'Cost/yr', type: 'num', fmt: d => VIZ.fmt.dollars(costOf(d)) }
  ];

  function drawTable(rows) {
    const LIMIT = 150;

    const sorted = rows.slice().sort((a, b) => {
      const k = state.sort;
      const av = a[k], bv = b[k];
      const cmp = (typeof av === 'string')
        ? d3.ascending(av, bv)
        : d3.ascending(av, bv);
      return cmp * state.dir;
    });

    const shown = sorted.slice(0, LIMIT);

    // Header, with sort affordances.
    d3.select('#table-head').selectAll('th')
      .data(COLUMNS, d => d.key)
      .join('th')
        .attr('class', d => d.type === 'num' ? 'num' : null)
        .attr('scope', 'col')
        .attr('aria-sort', d => state.sort === d.key
          ? (state.dir === 1 ? 'ascending' : 'descending') : 'none')
        .style('cursor', 'pointer')
        .text(d => d.label + (state.sort === d.key ? (state.dir === 1 ? ' ↑' : ' ↓') : ''))
        .on('click', (event, d) => {
          if (state.sort === d.key) state.dir *= -1;
          else { state.sort = d.key; state.dir = d.type === 'num' ? 1 : 1; }
          render();
        });

    // Rows: a data join onto <tr>, same pattern as the SVG charts.
    const tr = d3.select('#table-body').selectAll('tr')
      .data(shown, d => d.brand + '|' + d.model)
      .join('tr')
        .style('cursor', 'pointer')
        .on('click', (event, d) => { state.selected = d; renderPicked(); });

    tr.selectAll('td')
      .data(d => COLUMNS.map(c => ({ c, d })))
      .join('td')
        .attr('class', o => o.c.type === 'num' ? 'num' : null)
        .text(o => o.c.fmt ? o.c.fmt(o.d) : o.d[o.c.key]);

    d3.select('#table-count').text(
      rows.length > LIMIT
        ? `Showing the first ${LIMIT} of ${VIZ.fmt.int(rows.length)} matching models. Narrow the filters, or click a row to price it.`
        : `${VIZ.fmt.int(rows.length)} matching model${rows.length === 1 ? '' : 's'}. Click a row to price it.`
    );
  }

  /* --- View 3: price one real model --------------------------------------
     Replaces the usual "type in a wattage" calculator. Every number here
     comes from the register, so the answer is about an actual product.
     ---------------------------------------------------------------------- */

  function renderPicked() {
    const host = document.getElementById('picked');
    if (!host) return;

    const d = state.selected;
    if (!d) {
      host.innerHTML = '<p class="muted small" style="margin:0">' +
        'Pick a model from the table to see what it costs to run, and how it compares with ' +
        'other televisions of the same size.</p>';
      return;
    }

    // Percentile against same-size peers: the comparison the star rating
    // cannot give you across sizes.
    const peers = ALL.filter(p => Math.abs(p.inches - d.inches) <= 1);
    const better = peers.filter(p => p.kwh < d.kwh).length;
    const pct = peers.length > 1 ? Math.round((better / peers.length) * 100) : null;

    const cost = costOf(d);
    const peerMedian = d3.median(peers, p => p.kwh);
    const vsMedian = peerMedian ? (d.kwh - peerMedian) * (state.price / 100) * (state.hours / VIZ.LABEL_HOURS) : null;

    host.innerHTML = `
      <h3 style="margin-bottom:var(--sp-1)">${d.brand} ${d.model}</h3>
      <p class="small muted" style="margin-bottom:var(--sp-4)">
        ${d.inches}&quot; &middot; ${VIZ.TECH_LABEL[d.tech] || d.tech} &middot;
        ${VIZ.fmt.stars(d.star)} &middot; ${VIZ.fmt.watts(d.watts)} when on
      </p>

      <dl class="meta" style="margin-bottom:var(--sp-4)">
        <dt>Labelled energy</dt><dd class="mono">${VIZ.fmt.kwh(d.kwh)} per year</dd>
        <dt>Your cost</dt><dd class="mono"><b>${VIZ.fmt.dollars(cost)} per year</b>
          &middot; ${VIZ.fmt.dollars(cost * 10)} over 10 years</dd>
        ${pct !== null ? `<dt>Among ${d.inches}&quot; sets</dt>
          <dd>More efficient than <b>${100 - pct}%</b> of the ${VIZ.fmt.int(peers.length)} models this size</dd>` : ''}
        ${vsMedian !== null ? `<dt>Versus the median</dt>
          <dd class="mono">${vsMedian >= 0 ? '+' : '−'}${VIZ.fmt.dollars(Math.abs(vsMedian))} per year</dd>` : ''}
      </dl>

      <p class="xs muted" style="margin:0">
        At ${state.price.toFixed(0)}c/kWh and ${state.hours} hours a day. The official label figure
        assumes 10 hours a day, so the energy value above is scaled accordingly.
      </p>`;
  }

  /* --- Render everything -------------------------------------------------- */

  function render() {
    const rows = filtered();
    d3.select('#match-count').text(VIZ.fmt.int(rows.length));
    drawBrands(rows);
    drawTable(rows);
    renderPicked();
  }

  /* --- Controls ----------------------------------------------------------- */

  function buildChips(hostSel, values, bucket, labelFn) {
    const host = d3.select(hostSel);
    host.selectAll('button')
      .data(values)
      .join('button')
        .attr('class', 'chip')
        .attr('type', 'button')
        .attr('aria-pressed', 'false')
        .text(d => labelFn ? labelFn(d) : d)
        .on('click', function (event, d) {
          const set = state[bucket];
          if (set.has(d)) set.delete(d); else set.add(d);
          d3.select(this).attr('aria-pressed', set.has(d) ? 'true' : 'false');
          render();
        });
  }

  function wire() {
    const bands = VIZ.BAND_ORDER.filter(b => ALL.some(d => d.band === b));
    buildChips('#chips-band', bands, 'bands', VIZ.prettyBand);

    const techs = Array.from(new Set(ALL.map(d => d.tech))).sort();
    buildChips('#chips-tech', techs, 'techs', t => VIZ.TECH_LABEL[t] || t);

    // Brand select, most models first so the familiar names are at the top.
    const brands = Array.from(d3.rollup(ALL, v => v.length, d => d.brand))
      .sort((a, b) => d3.descending(a[1], b[1]));
    const brandSel = d3.select('#brand-select');
    brandSel.selectAll('option')
      .data([['all', ALL.length]].concat(brands))
      .join('option')
        .attr('value', d => d[0])
        .text(d => (d[0] === 'all' ? 'All brands' : d[0]) + ` (${VIZ.fmt.int(d[1])})`);
    brandSel.on('change', function () { state.brand = this.value; render(); });

    const q = document.getElementById('model-search');
    if (q) {
      let t;
      q.addEventListener('input', () => {
        clearTimeout(t);
        t = setTimeout(() => { state.query = q.value; render(); }, 180);
      });
    }

    const price = document.getElementById('x-price');
    const hours = document.getElementById('x-hours');
    const priceOut = document.getElementById('x-price-out');
    const hoursOut = document.getElementById('x-hours-out');

    if (price) price.addEventListener('input', () => {
      state.price = +price.value;
      if (priceOut) priceOut.textContent = state.price.toFixed(0) + 'c';
      drawTable(filtered());
      renderPicked();
    });
    if (hours) hours.addEventListener('input', () => {
      state.hours = +hours.value;
      if (hoursOut) hoursOut.textContent = state.hours + ' h';
      drawTable(filtered());
      renderPicked();
    });

    const reset = document.getElementById('reset-filters');
    if (reset) reset.addEventListener('click', () => {
      state.bands.clear(); state.techs.clear();
      state.brand = 'all'; state.query = '';
      state.selected = null;
      if (q) q.value = '';
      brandSel.property('value', 'all');
      d3.selectAll('#chips-band button, #chips-tech button').attr('aria-pressed', 'false');
      render();
    });
  }

  /* --- Boot --------------------------------------------------------------- */

  document.addEventListener('DOMContentLoaded', function () {
    VIZ.loadingMsg('#chart-brands');

    VIZ.load('tv_clean.csv', 'clean')
      .then(rows => {
        ALL = rows;
        d3.select('#total-count').text(VIZ.fmt.int(rows.length));
        wire();
        render();
        VIZ.onResize(() => drawBrands(filtered()));
        window.addEventListener('themechange', () => drawBrands(filtered()));
      })
      .catch(err => {
        console.error(err);
        VIZ.failMsg('#chart-brands', err);
      });
  });
})();
