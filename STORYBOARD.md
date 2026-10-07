# Storyboard — *The Price of a Bigger Picture*

COS30045 Data Visualisation · Exercise 3 (Communicating Data Insights)
Dataset: Energy Rating registration data for televisions, `tv_2026_10_04.csv`, data.gov.au

---

## 1. Audience and purpose

### Who is the audience?

An **Australian household about to buy a television**. Non-expert. Making the decision in the next
few weeks, in a shop or in a browser tab. Numerate enough to read a chart, but with no prior
interest in energy policy or kilowatt hours.

### What is my relationship to them?

An **outside analyst**, not part of their team. Knaflic's framing says that means I carry more of
the burden: I have to establish credibility before I ask them to believe anything, and I have to
explain where my numbers come from. That is why Act One opens by *agreeing* with them, and why the
Data & method page exists as a separate, complete account rather than as footnotes.

### What do they already believe?

> *"A bigger TV uses more power. Beyond that, the star rating tells me which one is efficient."*

Both halves are believed firmly. The first half is true. **The second half is the problem**, and it
is the thing the story has to dismantle.

### What do I want them to *do*?

One free action, taking about five seconds, at the moment of purchase:

> **Compare televisions within a single screen size, using the kWh/year number rather than the
> star count.**

Chosen from Knaflic's verb list: *know*, *understand*, *change*, **and above all `do`**. Not
"consider the environment", not "buy a smaller TV" — nobody does that. One concrete behaviour that
costs the reader nothing and can save them real money.

---

## 2. The Big Idea

Duarte's test: it must articulate a point of view, convey what is at stake, and be a complete
sentence.

> **Australians comparing televisions are shown a star rating that cannot be compared across screen
> sizes, so the number that actually predicts the bill — kilowatt hours per year, printed on the
> same label — is the one they should be reading.**

**Point of view:** the label is doing something other than what shoppers think it is doing.
**What's at stake:** roughly $100 a year, every year, for a decade, on a purchase people make
without the information in front of them.

### The three-minute version

> Every TV sold in Australia is registered with the government and energy-tested. I pulled all 4,599
> of them. Yes, bigger screens use more power — that part is real, and it's a tight relationship.
> But once you've picked a size, the spread between models *at that size* is still enormous: at 65
> inches, the middle 80% of models range from $126 to $228 a year to run. The star rating looks like
> it should settle this, but it's calculated relative to screen size — a five-star 32-inch uses 124
> kWh a year and a five-star 86-inch uses 988. Same badge, eight times the electricity. The fix is
> already on the label: the kWh/year figure underneath the stars means the same thing on every box.

---

## 3. My view on this data

The thing I did *not* want to write was "big TVs use lots of power, buy a smaller one." It is true,
useless, and nobody acts on it. The register supports a more interesting and more actionable claim.

Three findings shaped the angle:

1. **Size explains a lot — r = 0.88 between screen area and annual energy.** Strong enough that
   leading with "size doesn't matter" would have been dishonest. So the story concedes it first.

2. **But the residual variation is where the money is.** Holding size fixed at 65 inches (830
   models — the most crowded size on the market), the middle 80% still spans 360–652 kWh/year. That
   is $102 a year, over $1,000 across a typical ownership period, decided entirely by which box you
   carry out.

3. **The star rating is size-relative, and almost nobody knows this.** A five-star 86-inch TV uses
   8× the electricity of a five-star 32-inch. This is not a flaw — the Star Rating Index is
   *designed* to normalise for screen size so large TVs can be judged against large TVs. But it
   means a badge that reads as absolute is actually relative, and shoppers use it as though it were
   absolute.

**Finding 3 is the story.** It reframes the star rating from "the answer" to "an answer to a
different question", and it hands the reader a replacement instrument that is already in their hand.

### An integrity decision I made deliberately

The raw min–max spread at 65 inches is **6.1×** (185 kWh vs 1,135 kWh) — a far punchier headline
than 1.8×. I chose not to lead with it. Those two endpoints are a 2017-era commercial panel and an
8K flagship: products essentially nobody is choosing between. Leading with 6.1× would be quoting
data out of context in exactly the way Tufte warns about.

So the site reports **both**: the middle 80% as the figure a shopper actually faces, and the full
range labelled honestly as the extremes it is. The beeswarm shades the middle 80% and annotates both
tails with what they actually are. A weaker headline, a defensible one.

---

## 4. Storyboard panels

Each panel: what the reader sees, what they can do, and what they should take away.

---

### Panel 0 — Hero
**Sees.** Headline: *"A bigger screen costs more to run. That is not the decision that costs you
money."* Four counters animating up: 4,599 models · 74 brands · 830 choices at 65" · 8× energy gap
at the same star rating. A provenance strip naming the source file and retrieval date.

**Does.** Reads. Scrolls.

**Takes away.** This is about every TV on sale, not a sample. The headline plants a contradiction
that needs resolving.

> *Design note:* the fourth counter is the Act Three finding stated before it is proved. It is the
> hook; the rest of the page earns it.

---

### Panel 1 — Act One · "What everybody believes"
**Sees.** Scatter plot, 4,599 dots. Screen area (m²) on x, kWh/year on y, coloured by panel
technology. An OLS trend line. Annotation: *"Bigger screen, bigger bill — r = 0.88"*. A highlighted
vertical band at 1.15 m² with a bracket, labelled *"830 models here are all 65 inches — Act two
zooms into this one column →"*.

**Does.** Hovers any dot to see brand, model, size, technology, energy, cost, stars.

**Takes away.** The author is not arguing with me. Size really does drive energy. **But each
vertical slice is tall** — and that detail is planted visually, not just asserted.

> *Chart choice:* scatter, because two quantitative variables and the question is about the shape of
> a relationship. Position on two common scales is the most accurate channel available (Munzner), so
> it carries the quantities; colour carries the single categorical attribute.
>
> *Transition into Act Two:* the highlight band is the hinge of the whole page. Act Two is literally
> a zoom into one column of Act One, and marking it means the reader is never lost.

---

### Panel 2 — Act Two · "One size. 830 choices. Nearly double the running cost."
**Sees.** Beeswarm of every 65-inch model, positioned by kWh/year, coloured on the Energy Rating
Label's own green→red ramp. Shaded band across the middle 80%, marked P10 · 360 kWh and
P90 · 652 kWh. (The on-chart label *"8 in 10 models land in here"* was removed in the final build so
the presenter says it aloud while pointing at the band — see the revision log in `WALKTHROUGH.md`.) Both tails annotated: *"185 kWh · $65/yr — lowest on
the shelf (a 2017 commercial panel)"* and *"1135 kWh · $397/yr — highest, an 8K flagship"*.

**Does.** Hovers any dot for the exact model.

**Takes away.** Screen size is settled and the decision is *still* wide open. The gap is money, and
it is my money.

> *Chart choice:* beeswarm rather than a histogram, because every dot is a product you could
> actually buy. A histogram shows a distribution; a beeswarm shows **choices**, which is the
> emotional point. Deterministic binned dodge, not a force simulation, so the layout is identical on
> every reload.
>
> *Pull quote closing the panel:* "The size decision is made in the showroom; the running-cost
> decision is made on the spec sheet — and almost nobody reads it."

---

### Panel 3 — Act Three · "And the label on the box cannot answer the question"
**Sees.** Heat map. Rows = eight screen-size bands, columns = star rating 1–8, cell = median
kWh/year, printed as a number and coloured on the label ramp. A vertical connector down the 5-star
column with the callout *"Same 5 stars, 8.0× the electricity — 124 kWh at 32", 988 kWh at 86"+"*.
Below it, a warning callout: upgrading from a five-star 55" to a five-star 75" feels like a
like-for-like swap; the median five-star bill goes from $116 to $205 (331 → 586 kWh).

**Does.** Reads across a row (stars work). Reads down a column (stars are relative). Hovers for
model counts.

**Takes away.** The instrument I was trusting measures something other than what I thought. I now
have a problem and no tool.

> *Chart choice:* heat map, because the question is genuinely two-dimensional — the whole point is
> that the answer depends on *both* size and stars, and only a matrix shows an interaction. Doubling
> it as a table (printing the value in each cell) gives high data density for almost no extra ink,
> and means the colour never has to be measured.
>
> *This is the pivot of the story.* Everything before it builds the problem; everything after it
> resolves it.

---

### Panel 4 — Act Four · "What it costs, at your tariff and your viewing habits"
**Sees.** Horizontal range bars, one per size band, spanning cheapest to dearest model, filled with
the green→red ramp so each bar reads *cheapest → dearest within this size*. White median marker.
Two sliders: electricity price (15–60 c/kWh) and viewing hours (1–16 h/day). Bars re-render live.

**Does.** Drags the sliders to their own tariff and habits. Watches the numbers become theirs.

**Takes away.** These are real dollars at *my* rates. And the bands overlap so heavily that a
well-chosen 75-inch can cost less to run than a badly-chosen 55-inch.

> *Chart choice:* range bars from a zero baseline, so length is proportional to cost. The overlap
> between adjacent bands is the entire argument of the page rendered in one glance.
>
> *Interaction rationale:* the tariff is the only assumption on the site that isn't a measurement.
> Exposing it as a control is both honest and persuasive — the reader stops auditing my number and
> starts using theirs.

---

### Panel 5 — Resolution · "Three things, in order"
**Sees.** A numbered list. (1) Settle the screen size first, then stop comparing across sizes.
(2) Read the kWh number, not the stars. (3) Multiply by your own tariff and habits.

**Does.** Clicks through to the Explorer, or leaves having learned one rule.

**Takes away.** A concrete, free action — and the knowledge that the right number was already
printed on the label the whole time.

---

### Panel 6 — Explorer (second page)
**Sees.** Filters (size chips, panel chips, brand, search), a brand-efficiency bar chart in
kWh per m² of screen, a sortable table of matching models, and a sticky panel that prices any
selected model.

**Does.** Filters to their own size. Sorts by kWh. Clicks their shortlisted model and sees
*"more efficient than 64% of the 830 models this size"* and a ten-year cost.

**Takes away.** Act Five's instruction, executable. Then a pointer to the government's own
[product comparator](https://reg.energyrating.gov.au/comparator/) to verify before buying.

> *Why kWh per m² for brands:* comparing raw kWh/year across brands would mostly measure which
> brands sell big televisions. Normalising by panel area asks the fairer question.

---

### Panels 7–8 — Data & method, About
Provenance, the ten-item data-quality log, the KNIME node chain with row counts, five stated
limitations, and references. (Each page footer carries a short AI-use note; the full declaration
is submitted separately.) These exist so the story page can stay clean: the
caveats are complete, but they are not in the reader's way.

---

## 5. Chart inventory

| # | Panel | Chart | Marks | Channels | Source file |
|---|-------|-------|-------|----------|-------------|
| 1 | Act 1 | Scatter | Points | x, y position; hue = technology | `tv_clean.csv` (4,599) |
| 2 | Act 2 | Beeswarm | Points | x position; sequential hue = kWh | `shelf_65.csv` (830) |
| 3 | Act 3 | Heat map | Area cells | 2× position (categorical); sequential hue + printed value | `star_band_heat.csv` (50) |
| 4 | Act 4 | Range bars | Lines/bars | Length from zero; gradient hue within bar | `band_summary.csv` (8) |
| 5 | Explore | Bar chart | Bars | Length from zero; sequential hue | `tv_clean.csv`, grouped live |

No pie charts. No 3D. No dual axes. No truncated baselines.

---

## 6. What got cut, and why

| Idea | Why it was dropped |
|------|--------------------|
| Standby power as its own act | Missing for 854 rows. Imputing it to make a point would have been exactly the kind of manipulation the unit warns about. Left out of every chart. |
| Country-of-manufacture analysis | Real column, genuinely interesting, **does not advance the plot** (Krzywinski & Cairo). Cut. |
| OLED vs LED as a headline | At 65 inches the medians are 448 vs 464 kWh — a difference too small to carry an act. It survives as colour in Act One, where it is honest context rather than a claim. |
| Time-series of efficiency improvement | The file has no reliable registration date, only expiry. Cannot be done honestly with this data. |
| National household consumption estimate | Would require sales weighting. The register counts models, not televisions sold. Listed as a stated limitation instead. |
| 6.1× as the headline number | Tail-driven. See §3. Reported, but not as the headline. |

---

## 7. Open question for review

The one thing I would most like a second opinion on: **is Act Three strong enough to carry the
pivot?** It asks the reader to accept that a familiar badge means something other than they assumed.
If a reader bounces off that, the resolution in Act Four has nothing to resolve. The heat map's
printed values and the explicit 55"→75" worked example are both there to reduce that risk, but it is
the load-bearing panel.
