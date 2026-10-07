/* ==========================================================================
   story.js - the four charts that carry the story on index.html.

   Act 1  #chart-scatter   screen area vs annual energy        (scatter, W4.3)
   Act 2  #chart-shelf     830 models at one screen size       (beeswarm)
   Act 3  #chart-heat      size band x star rating              (heat map)
   Act 4  #chart-cost      what each band costs to run          (range bars)

   Every chart is redrawn on resize and on theme change, because colours are
   read from CSS custom properties at draw time.
   ========================================================================== */

(function () {
  'use strict';

  if (typeof d3 === 'undefined') return;

  /** Read a CSS custom property so charts follow the light/dark palette. */
  const cssVar = (name) =>
    getComputedStyle(document.documentElement).getPropertyValue(name).trim();

  const registry = [];   // [{ sel, draw, data }]

  function register(sel, draw) {
    registry.push({ sel, draw, data: null });
  }

  function redrawAll() {
    registry.forEach(r => { if (r.data) r.draw(r.sel, r.data); });
  }

  /* ======================================================================
     ACT 1 - Screen area vs annual energy
     One dot per registered model. Position on two common scales is the most
     accurate channel available (Munzner), so it carries the quantities;
     colour carries the one categorical attribute, screen technology.
     ====================================================================== */

  function drawScatter(sel, data) {
    const W = 1000, H = 620;
    const m = { top: 24, right: 150, bottom: 58, left: 70 };
    const { svg, plot, w, h } = VIZ.makeSvg(sel, W, H, m);

    VIZ.describe(svg,
      'Annual energy use against screen area for 4,599 televisions registered for sale in Australia',
      'A scatter plot. Screen area in square metres runs along the horizontal axis and labelled ' +
      'energy consumption in kilowatt hours per year runs up the vertical axis. Points rise from ' +
      'left to right, showing that larger screens use more electricity, but at any given screen ' +
      'area the points are spread over a wide vertical range.');

    const x = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.m2) * 1.02]).nice()
      .range([0, w]);

    const y = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.kwh) * 1.02]).nice()
      .range([h, 0]);

    VIZ.gridY(plot, y, w, 6);

    VIZ.axisBottom(plot, x, h, { ticks: 7, format: d => d3.format('.1f')(d) });
    VIZ.axisLeft(plot, y, { ticks: 6, format: d3.format(',') });
    VIZ.axisTitle(plot, 'Screen area (m²)', w / 2, h + 44);
    plot.append('text')
      .attr('class', 'axis-title')
      .attr('transform', 'rotate(-90)')
      .attr('x', -h / 2).attr('y', -52)
      .attr('text-anchor', 'middle')
      .text('Labelled energy use (kWh/year)');

    // Ordinary least squares fit, drawn to make the shared trend explicit.
    const n = data.length;
    const mx = d3.mean(data, d => d.m2), my = d3.mean(data, d => d.kwh);
    let num = 0, den = 0;
    for (const d of data) { num += (d.m2 - mx) * (d.kwh - my); den += (d.m2 - mx) ** 2; }
    const slope = num / den, intercept = my - slope * mx;
    const xr = x.domain();

    plot.append('line')
      .attr('class', 'annot-line')
      .attr('x1', x(xr[0])).attr('y1', y(intercept + slope * xr[0]))
      .attr('x2', x(xr[1])).attr('y2', y(Math.max(0, intercept + slope * xr[1])))
      .attr('stroke', cssVar('--ink'))
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '5 4');

    // Highlight the 65-inch slice. Act 2 zooms into exactly this column, so
    // marking it here shows where the next chart comes from and makes the
    // "every vertical slice is tall" claim visible rather than asserted.
    const slice = data.filter(d => d.inches >= 64 && d.inches <= 66);
    if (slice.length) {
      const mx = d3.extent(slice, d => d.m2);
      const sorted = slice.map(d => d.kwh).sort(d3.ascending);
      const q10 = d3.quantile(sorted, 0.10);
      const q90 = d3.quantile(sorted, 0.90);

      // All 65-inch sets have near-identical area, so the band is a sliver.
      // Give it a floor width so it reads as a deliberate highlight.
      const bandL = x(mx[0]), bandR = Math.max(x(mx[1]), bandL + 9);

      plot.append('rect')
        .attr('x', bandL - 2).attr('width', (bandR - bandL) + 4)
        .attr('y', 0).attr('height', h)
        .attr('fill', cssVar('--accent')).attr('fill-opacity', 0.10);

      // Bracket showing the middle 80% of that one column.
      const bx = bandR + 16;
      plot.append('path')
        .attr('d', `M${bx - 5},${y(q90)} L${bx},${y(q90)} L${bx},${y(q10)} L${bx - 5},${y(q10)}`)
        .attr('fill', 'none')
        .attr('stroke', cssVar('--accent')).attr('stroke-width', 2);

      // Park the label in the empty upper-left quadrant - no small television
      // uses a lot of power, so nothing is ever plotted there - and run a
      // leader line across to the bracket.
      const lx = x(0.14), ly = y(2180);
      plot.append('path')
        .attr('d', `M${x(1.02)},${ly + 24} L${bx - 2},${y(q90) - 6}`)
        .attr('fill', 'none')
        .attr('stroke', cssVar('--accent'))
        .attr('stroke-width', 1).attr('stroke-opacity', 0.55);

      plot.append('text').attr('class', 'annot-text')
        .attr('x', lx).attr('y', ly)
        .attr('fill', cssVar('--accent'))
        .text(`${slice.length} models here are all 65 inches`);
      plot.append('text').attr('class', 'annot-text annot-text--sub')
        .attr('x', lx).attr('y', ly + 16)
        .attr('fill', cssVar('--ink-2'))
        .text(`Middle 80% of them: ${Math.round(q10)}–${Math.round(q90)} kWh a year`);
      plot.append('text').attr('class', 'annot-text annot-text--sub')
        .attr('x', lx).attr('y', ly + 31)
        .attr('fill', cssVar('--ink-3'))
        .text('Act two zooms into this one column →');
    }

    // Dots last so they sit above the gridlines and trend line.
    plot.append('g')
      .selectAll('circle')
      .data(data)
      .join('circle')
        .attr('class', 'dot')
        .attr('cx', d => x(d.m2))
        .attr('cy', d => y(d.kwh))
        .attr('r', 2.3)
        .attr('fill', d => VIZ.techColour(d.tech))
        .attr('fill-opacity', 0.42)
        .on('pointerenter', function (event, d) {
          d3.select(this).attr('r', 6).attr('fill-opacity', 1);
          VIZ.showTip(event, VIZ.tipHtml(`${d.brand} ${d.model}`, [
            ['Screen', `${d.inches}" · ${d.m2.toFixed(2)} m²`],
            ['Technology', VIZ.TECH_LABEL[d.tech] || d.tech],
            ['Energy', VIZ.fmt.kwh(d.kwh) + '/yr'],
            ['Running cost', VIZ.fmt.dollars(d.cost) + '/yr'],
            ['Star rating', VIZ.fmt.stars(d.star)]
          ]));
        })
        .on('pointermove', VIZ.moveTip)
        .on('pointerleave', function () {
          d3.select(this).attr('r', 2.3).attr('fill-opacity', 0.42);
          VIZ.hideTip();
        });

    // Annotate the trend out in the sparse right-hand side, clear of both the
    // dense cloud and the 65-inch callout.
    const ax = x(2.95), ay = y(intercept + slope * 2.95) - 54;
    plot.append('text')
      .attr('class', 'annot-text')
      .attr('x', ax).attr('y', ay)
      .attr('text-anchor', 'middle')
      .attr('fill', cssVar('--ink'))
      .text('Bigger screen, bigger bill');
    plot.append('text')
      .attr('class', 'annot-text annot-text--sub')
      .attr('x', ax).attr('y', ay + 15)
      .attr('text-anchor', 'middle')
      .attr('fill', cssVar('--ink-3'))
      .text('but every vertical slice is tall');
  }

  /* ======================================================================
     ACT 2 - One size, 830 choices
     A beeswarm of every 65-inch model. Binned dodge rather than a force
     simulation, so the layout is deterministic and identical every reload.
     ====================================================================== */

  function drawShelf(sel, data) {
    const W = 1000, H = 520;
    const m = { top: 92, right: 28, bottom: 62, left: 28 };
    const { svg, plot, w, h } = VIZ.makeSvg(sel, W, H, m);

    VIZ.describe(svg,
      'Annual energy use of 830 sixty-five inch televisions registered for sale in Australia',
      'A beeswarm plot. Each dot is one 65-inch model, placed along the horizontal axis by its ' +
      'labelled energy use. Most models cluster between 360 and 652 kilowatt hours a year. A thin ' +
      'tail reaches past 1,100 kilowatt hours.');

    const x = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.kwh) * 1.04]).nice()
      .range([0, w]);

    const p10 = d3.quantile(data.map(d => d.kwh).sort(d3.ascending), 0.10);
    const p90 = d3.quantile(data.map(d => d.kwh).sort(d3.ascending), 0.90);
    const med = d3.median(data, d => d.kwh);

    // Shaded middle 80%: the range a shopper realistically faces.
    plot.append('rect')
      .attr('x', x(p10)).attr('y', -10)
      .attr('width', x(p90) - x(p10)).attr('height', h + 10)
      .attr('fill', cssVar('--accent'))
      .attr('fill-opacity', 0.09);

    [[p10, 'P10'], [p90, 'P90']].forEach(([v, lbl]) => {
      plot.append('line')
        .attr('x1', x(v)).attr('x2', x(v)).attr('y1', -10).attr('y2', h)
        .attr('stroke', cssVar('--accent')).attr('stroke-width', 1).attr('stroke-opacity', 0.5);
      plot.append('text')
        .attr('class', 'annot-text--sub')
        .attr('x', x(v)).attr('y', -16).attr('text-anchor', 'middle')
        .attr('fill', cssVar('--accent'))
        .text(`${lbl} · ${Math.round(v)} kWh`);
    });

    // The interpretation of this band ("8 in 10 models land in here") is
    // delivered verbally in the presentation, so the chart carries the data
    // labels only and the presenter supplies the meaning.

    // Median marker.
    plot.append('line')
      .attr('x1', x(med)).attr('x2', x(med)).attr('y1', -10).attr('y2', h)
      .attr('stroke', cssVar('--ink')).attr('stroke-width', 1.5).attr('stroke-dasharray', '4 3');

    VIZ.axisBottom(plot, x, h, { ticks: 8, format: d3.format(',') });
    VIZ.axisTitle(plot, 'Labelled energy use (kWh/year) — every model is 65 inches', w / 2, h + 46);

    // --- binned dodge -----------------------------------------------------
    // Two passes: count how deep the tallest column gets, then choose a row
    // spacing that guarantees the swarm fits inside the plot area instead of
    // spilling over the annotations above it.
    const r = 3.8;
    const colW = r * 2 - 0.6;
    const pts = data
      .map(d => ({ d, px: x(d.kwh) }))
      .sort((a, b) => a.px - b.px);

    const counts = new Map();
    pts.forEach(p => {
      const key = Math.round(p.px / colW);
      counts.set(key, (counts.get(key) || 0) + 1);
    });

    const maxStack = d3.max(Array.from(counts.values()));
    const rowsPerSide = Math.ceil(maxStack / 2);
    const baseline = h / 2;
    const rowGap = Math.min(colW, (baseline - 8) / Math.max(1, rowsPerSide));

    const seen = new Map();
    pts.forEach(p => {
      const key = Math.round(p.px / colW);
      const stack = seen.get(key) || 0;
      seen.set(key, stack + 1);
      // Alternate above/below the baseline so the swarm grows symmetrically.
      const row = Math.floor(stack / 2);
      const sign = stack % 2 === 0 ? -1 : 1;
      p.py = baseline + sign * (row + 0.5) * rowGap;
    });

    // Span the ramp across the data that is actually present, otherwise every
    // dot lands in the middle of the scale and the colour says nothing.
    const colour = VIZ.energyScale(d3.extent(data, d => d.kwh));

    plot.append('g')
      .selectAll('circle')
      .data(pts)
      .join('circle')
        .attr('class', 'dot')
        .attr('cx', d => d.px)
        .attr('cy', d => d.py)
        .attr('r', r - 0.7)
        .attr('fill', d => colour(d.d.kwh))
        .attr('stroke', cssVar('--paper'))
        .attr('stroke-width', 0.6)
        .on('pointerenter', function (event, p) {
          const d = p.d;
          d3.select(this).attr('r', r + 2.6).raise();
          VIZ.showTip(event, VIZ.tipHtml(`${d.brand} ${d.model}`, [
            ['Technology', VIZ.TECH_LABEL[d.tech] || d.tech],
            ['Energy', VIZ.fmt.kwh(d.kwh) + '/yr'],
            ['Running cost', VIZ.fmt.dollars(d.cost) + '/yr'],
            ['Power when on', VIZ.fmt.watts(d.watts)],
            ['Star rating', VIZ.fmt.stars(d.star)]
          ]));
        })
        .on('pointermove', VIZ.moveTip)
        .on('pointerleave', function () {
          d3.select(this).attr('r', r - 0.7);
          VIZ.hideTip();
        });

    // Label the two tails honestly - they are atypical, and saying so is the
    // difference between an insight and a misleading statistic.
    const lo = data[0], hi = data[data.length - 1];

    function tail(d, label, sub, dx, anchor) {
      const px = x(d.kwh);
      plot.append('line')
        .attr('class', 'annot-line')
        .attr('x1', px).attr('y1', baseline)
        .attr('x2', px + dx).attr('y2', h - 34)
        .attr('stroke', cssVar('--ink-3'));
      plot.append('text')
        .attr('class', 'annot-text')
        .attr('x', px + dx).attr('y', h - 22)
        .attr('text-anchor', anchor)
        .attr('fill', cssVar('--ink'))
        .text(label);
      plot.append('text')
        .attr('class', 'annot-text annot-text--sub')
        .attr('x', px + dx).attr('y', h - 8)
        .attr('text-anchor', anchor)
        .attr('fill', cssVar('--ink-3'))
        .text(sub);
    }

    tail(lo, `${Math.round(lo.kwh)} kWh · ${VIZ.fmt.dollars(lo.cost)}/yr`,
         'lowest on the shelf (a 2017 commercial panel)', 12, 'start');
    tail(hi, `${Math.round(hi.kwh)} kWh · ${VIZ.fmt.dollars(hi.cost)}/yr`,
         'highest — an 8K flagship', -12, 'end');
  }

  /* ======================================================================
     ACT 3 - The star rating is size-relative
     Heat map: rows are size bands, columns are whole star ratings, the cell
     encodes median kWh/year on the Energy Rating Label's own colour ramp.
     Reading across a row shows stars working; reading down a column shows
     that the same star count means very different electricity.
     ====================================================================== */

  function drawHeat(sel, data) {
    const bands = VIZ.BAND_ORDER.filter(b => data.some(d => d.band === b));
    const starVals = Array.from(new Set(data.map(d => d.stars))).sort(d3.ascending);

    const W = 1000;
    const m = { top: 46, right: 150, bottom: 54, left: 118 };
    const cell = Math.min(74, (W - m.left - m.right) / starVals.length);
    const H = m.top + m.bottom + bands.length * 52;

    const { svg, plot, w, h } = VIZ.makeSvg(sel, W, H, m);

    VIZ.describe(svg,
      'Median annual energy use by screen size band and star rating',
      'A heat map. Rows are screen size bands from 32 inches and under up to 86 inches and over. ' +
      'Columns are whole star ratings from 1 to 9. Cell colour shows median kilowatt hours per ' +
      'year, green for low and red for high. Colour gets redder down each column, meaning the ' +
      'same star rating on a larger screen still uses much more electricity.');

    const x = d3.scaleBand().domain(starVals.map(String)).range([0, cell * starVals.length]).padding(0.06);
    const y = d3.scaleBand().domain(bands).range([0, h]).padding(0.08);

    // Exponent < 1: the median cell is around 400 kWh but the top cell is
    // 2,500, so a linear ramp would paint four fifths of the grid the same
    // green. See VIZ.energyScale for the reasoning.
    const colour = VIZ.energyScale(
      [d3.min(data, d => d.kwh), d3.max(data, d => d.kwh)], 0.5);

    plot.append('g')
      .selectAll('rect')
      .data(data)
      .join('rect')
        .attr('x', d => x(String(d.stars)))
        .attr('y', d => y(d.band))
        .attr('width', x.bandwidth())
        .attr('height', y.bandwidth())
        .attr('rx', 3)
        .attr('fill', d => colour(d.kwh))
        .attr('stroke', cssVar('--paper'))
        .attr('stroke-width', 1)
        .style('cursor', 'pointer')
        .on('pointerenter', function (event, d) {
          d3.select(this).attr('stroke', cssVar('--ink')).attr('stroke-width', 2).raise();
          VIZ.showTip(event, VIZ.tipHtml(`${VIZ.prettyBand(d.band)} · ${d.stars} star`, [
            ['Median energy', VIZ.fmt.kwh(d.kwh) + '/yr'],
            ['Median cost', VIZ.fmt.dollars(d.cost) + '/yr'],
            ['Models', VIZ.fmt.int(d.models)]
          ]));
        })
        .on('pointermove', VIZ.moveTip)
        .on('pointerleave', function () {
          d3.select(this).attr('stroke', cssVar('--paper')).attr('stroke-width', 1);
          VIZ.hideTip();
        });

    // Print the value in each cell: the heat map doubles as a table, which is
    // high data density for very little extra ink.
    plot.append('g')
      .selectAll('text')
      .data(data)
      .join('text')
        .attr('x', d => x(String(d.stars)) + x.bandwidth() / 2)
        .attr('y', d => y(d.band) + y.bandwidth() / 2 + 4)
        .attr('text-anchor', 'middle')
        .style('font-size', '10.5px')
        .style('font-variant-numeric', 'tabular-nums')
        .style('pointer-events', 'none')
        // Dark text on the pale middle of the ramp, white on the dark ends.
        .attr('fill', d => {
          const c = d3.color(colour(d.kwh));
          const lum = 0.299 * c.r + 0.587 * c.g + 0.114 * c.b;
          return lum > 150 ? '#15181d' : '#ffffff';
        })
        .text(d => Math.round(d.kwh));

    // Axes: band scale labels, drawn directly rather than via an axis call.
    plot.append('g').attr('class', 'axis')
      .selectAll('text')
      .data(bands)
      .join('text')
        .attr('x', -10)
        .attr('y', d => y(d) + y.bandwidth() / 2 + 4)
        .attr('text-anchor', 'end')
        .style('font-size', '12px')
        .attr('fill', cssVar('--ink-2'))
        .text(d => VIZ.prettyBand(d));

    plot.append('g').attr('class', 'axis')
      .selectAll('text')
      .data(starVals)
      .join('text')
        .attr('x', d => x(String(d)) + x.bandwidth() / 2)
        .attr('y', -14)
        .attr('text-anchor', 'middle')
        .style('font-size', '12px')
        .attr('fill', cssVar('--ink-2'))
        .text(d => d + '★');

    VIZ.axisTitle(plot, 'Star rating →', x.range()[1] / 2, -32);
    plot.append('text')
      .attr('class', 'axis-title')
      .attr('x', 0).attr('y', h + 34)
      .attr('text-anchor', 'start')
      .attr('fill', cssVar('--ink-3'))
      .style('font-weight', '400')
      .text('Cell = median kWh/year · cells with fewer than 3 models are left blank');

    // Call out the comparison the chart exists to make.
    const a = data.find(d => d.band === '32in & under' && d.stars === 5);
    const b = data.find(d => d.band === '86in+' && d.stars === 5);
    if (a && b) {
      const cx = x('5') + x.bandwidth() / 2;
      plot.append('line')
        .attr('x1', cx).attr('x2', cx)
        .attr('y1', y(a.band) + y.bandwidth())
        .attr('y2', y(b.band))
        .attr('stroke', cssVar('--ink'))
        .attr('stroke-width', 1.5)
        .attr('opacity', 0.45);

      const gx = x.range()[1] + 16;
      const g = plot.append('g').attr('transform', `translate(${gx}, ${y(b.band) - 6})`);
      g.append('text').attr('class', 'annot-text')
        .attr('fill', cssVar('--ink')).attr('y', 0)
        .text('Same 5 stars,');
      g.append('text').attr('class', 'annot-text')
        .attr('fill', cssVar('--ink')).attr('y', 15)
        .text(`${VIZ.fmt.x(b.kwh / a.kwh)} the electricity`);
      g.append('text').attr('class', 'annot-text annot-text--sub')
        .attr('fill', cssVar('--ink-3')).attr('y', 32)
        .text(`${Math.round(a.kwh)} kWh at 32″`);
      g.append('text').attr('class', 'annot-text annot-text--sub')
        .attr('fill', cssVar('--ink-3')).attr('y', 46)
        .text(`${Math.round(b.kwh)} kWh at 86″+`);
    }
  }

  /* ======================================================================
     ACT 4 - What it actually costs, at your tariff
     Range bars: min to max running cost per size band, with the median
     marked. The electricity price is a slider, so the reader can put their
     own tariff in rather than trust ours.
     ====================================================================== */

  let costState = { price: VIZ.DEFAULT_PRICE, hours: VIZ.LABEL_HOURS };

  function drawCost(sel, data) {
    const W = 1000;
    const m = { top: 34, right: 96, bottom: 56, left: 118 };
    const H = m.top + m.bottom + data.length * 46;
    const { svg, plot, w, h } = VIZ.makeSvg(sel, W, H, m);

    // The label figure assumes 10 h/day. Scale linearly for other habits.
    const factor = (costState.price / 100) * (costState.hours / VIZ.LABEL_HOURS);
    const cost = (kwh) => kwh * factor;

    VIZ.describe(svg,
      'Annual running cost range by screen size band',
      'Horizontal range bars. Each bar spans the cheapest to the most expensive model in that ' +
      'screen size band, with a line marking the median. Bars start at zero dollars and get ' +
      'longer for bigger screens, and the bars overlap heavily between neighbouring bands.');

    const bands = data.slice().sort((a, b) =>
      VIZ.BAND_ORDER.indexOf(a.band) - VIZ.BAND_ORDER.indexOf(b.band));

    const x = d3.scaleLinear()
      .domain([0, d3.max(bands, d => cost(d.max)) * 1.04]).nice()
      .range([0, w]);

    const y = d3.scaleBand()
      .domain(bands.map(d => d.band))
      .range([0, h])
      .padding(0.34);

    // Vertical gridlines for a value axis read left-to-right.
    plot.append('g').selectAll('line')
      .data(x.ticks(6))
      .join('line')
        .attr('class', 'gridline')
        .attr('x1', d => x(d)).attr('x2', d => x(d))
        .attr('y1', 0).attr('y2', h);

    VIZ.axisBottom(plot, x, h, { ticks: 6, format: d => '$' + d3.format(',')(d) });
    VIZ.axisTitle(plot, `Running cost per year at ${costState.price.toFixed(0)}c/kWh and ${costState.hours} h/day`,
                  w / 2, h + 46);

    plot.append('g').attr('class', 'axis')
      .selectAll('text')
      .data(bands)
      .join('text')
        .attr('x', -10)
        .attr('y', d => y(d.band) + y.bandwidth() / 2 + 4)
        .attr('text-anchor', 'end')
        .style('font-size', '12.5px')
        .attr('fill', cssVar('--ink-2'))
        .text(d => VIZ.prettyBand(d.band));

    // One gradient, reused by every bar. Because it is defined in bounding-box
    // units, each bar is green at its own cheapest end and red at its own
    // dearest end - so the fill restates the point: within any single size
    // band you can land anywhere from efficient to wasteful.
    const grad = svg.append('defs')
      .append('linearGradient')
        .attr('id', 'band-ramp')
        .attr('x1', '0%').attr('x2', '100%')
        .attr('y1', '0%').attr('y2', '0%');
    VIZ.ENERGY_RAMP.forEach((c, i) => {
      grad.append('stop')
        .attr('offset', (i / (VIZ.ENERGY_RAMP.length - 1) * 100) + '%')
        .attr('stop-color', c);
    });

    const g = plot.append('g')
      .selectAll('g')
      .data(bands)
      .join('g')
        .attr('transform', d => `translate(0, ${y(d.band)})`);

    // The span from cheapest to dearest model in the band.
    g.append('rect')
      .attr('class', 'bar')
      .attr('x', d => x(cost(d.min)))
      .attr('y', 0)
      .attr('height', y.bandwidth())
      .attr('rx', 4)
      .attr('fill', 'url(#band-ramp)')
      .attr('fill-opacity', 0.82)
      .attr('width', 0)
      .transition().duration(VIZ.dur(620)).delay((d, i) => VIZ.dur(i * 55))
        .attr('width', d => Math.max(2, x(cost(d.max)) - x(cost(d.min))));

    // Median marker: the single number most readers want.
    g.append('line')
      .attr('y1', -2).attr('y2', y.bandwidth() + 2)
      .attr('stroke', cssVar('--ink'))
      .attr('stroke-width', 2.5)
      .attr('x1', 0).attr('x2', 0)
      .transition().duration(VIZ.dur(620)).delay((d, i) => VIZ.dur(i * 55))
        .attr('x1', d => x(cost(d.median))).attr('x2', d => x(cost(d.median)));

    g.append('text')
      .attr('class', 'value-label')
      .attr('y', y.bandwidth() / 2 + 4)
      .attr('x', d => x(cost(d.max)) + 8)
      .attr('fill', cssVar('--ink-2'))
      .style('opacity', 0)
      .text(d => VIZ.fmt.dollars(cost(d.median)))
      .transition().duration(VIZ.dur(400)).delay((d, i) => VIZ.dur(300 + i * 55))
        .style('opacity', 1);

    // Invisible hit area so the whole row is hoverable, not just the bar.
    g.append('rect')
      .attr('x', 0).attr('y', 0).attr('width', w).attr('height', y.bandwidth())
      .attr('fill', 'transparent')
      .style('cursor', 'pointer')
      .on('pointerenter', (event, d) => {
        VIZ.showTip(event, VIZ.tipHtml(VIZ.prettyBand(d.band), [
          ['Models', VIZ.fmt.int(d.models)],
          ['Cheapest', VIZ.fmt.dollars(cost(d.min)) + '/yr'],
          ['Median', VIZ.fmt.dollars(cost(d.median)) + '/yr'],
          ['Dearest', VIZ.fmt.dollars(cost(d.max)) + '/yr'],
          ['Spread', VIZ.fmt.dollars(cost(d.max) - cost(d.min)) + '/yr']
        ]));
      })
      .on('pointermove', VIZ.moveTip)
      .on('pointerleave', VIZ.hideTip);
  }

  /* --- Controls for Act 4 ------------------------------------------------ */

  function wireCostControls() {
    const price = document.getElementById('price-input');
    const hours = document.getElementById('hours-input');
    const priceOut = document.getElementById('price-out');
    const hoursOut = document.getElementById('hours-out');
    const entry = registry.find(r => r.sel === '#chart-cost');

    function sync() {
      if (price) { costState.price = +price.value; if (priceOut) priceOut.textContent = (+price.value).toFixed(0) + 'c'; }
      if (hours) { costState.hours = +hours.value; if (hoursOut) hoursOut.textContent = (+hours.value) + ' h'; }
      if (entry && entry.data) drawCost('#chart-cost', entry.data);
    }

    if (price) price.addEventListener('input', sync);
    if (hours) hours.addEventListener('input', sync);
    sync();
  }

  /* --- Boot --------------------------------------------------------------- */

  function boot() {
    register('#chart-scatter', drawScatter);
    register('#chart-shelf', drawShelf);
    register('#chart-heat', drawHeat);
    register('#chart-cost', drawCost);

    const jobs = [
      ['#chart-scatter', 'tv_clean.csv', 'clean'],
      ['#chart-shelf', 'shelf_65.csv', 'shelf'],
      ['#chart-heat', 'star_band_heat.csv', 'heat'],
      ['#chart-cost', 'band_summary.csv', 'band']
    ];

    jobs.forEach(([sel, file, parser]) => {
      if (!document.querySelector(sel)) return;
      VIZ.loadingMsg(sel);

      VIZ.load(file, parser)
        .then(rows => {
          const entry = registry.find(r => r.sel === sel);
          entry.data = rows;
          entry.draw(sel, rows);
          if (sel === '#chart-cost') wireCostControls();
        })
        .catch(err => {
          console.error('Failed to load ' + file, err);
          VIZ.failMsg(sel, err);
        });
    });

    VIZ.onResize(redrawAll);
    window.addEventListener('themechange', redrawAll);
  }

  document.addEventListener('DOMContentLoaded', boot);
})();
