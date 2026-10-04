# The Price of a Bigger Picture — the complete walkthrough

**Television energy use in Australia — a data story**
COS30045 Data Visualisation · Assignment 1 · Swinburne University of Technology · Tri Tran

This one document covers the whole project: where the data came from, every KNIME node and why it is
there, how the output was checked, the story and how it was storyboarded, every page and chart on the
website and the reasoning behind it, what went wrong during the build, and how to present it. Each
section stands on its own, so jump to the one you need.

---

## Contents

1. [The project on one page](#1-the-project-on-one-page)
2. [Running and viewing the site](#2-running-and-viewing-the-site)
3. [The data](#3-the-data)
4. [The KNIME workflow, node by node](#4-the-knime-workflow-node-by-node)
5. [Verifying the workflow](#5-verifying-the-workflow)
6. [What was wrong with the data](#6-what-was-wrong-with-the-data)
7. [The story](#7-the-story)
8. [Storyboard log](#8-storyboard-log)
9. [The website, page by page](#9-the-website-page-by-page)
10. [How the D3 code is organised](#10-how-the-d3-code-is-organised)
11. [Design decisions](#11-design-decisions)
12. [Build and debugging log](#12-build-and-debugging-log)
13. [Limitations](#13-limitations)
14. [Presenting it](#14-presenting-it)
15. [Repository map](#15-repository-map)
16. [Generative AI declaration and references](#16-generative-ai-declaration-and-references)

---

## 1. The project on one page

**The Big Idea** — one sentence, with a point of view and something at stake:

> Australians comparing televisions are shown a star rating that cannot be compared across screen
> sizes, so the number that actually predicts the bill — kilowatt hours per year, printed on the same
> label — is the one they should be reading.

**Audience.** An Australian household about to buy a television. Not experts, numerate enough to
read a chart, interested in dollars rather than kilowatt hours.

**What they should do.** Compare televisions *within* one screen size, using the kWh/year figure
rather than the star count. It costs nothing and takes five seconds in the shop.

**The story in three minutes.**

> Every TV sold in Australia is registered with the government and energy-tested. I took all 4,599
> of them. Yes, bigger screens use more power — screen area and energy correlate at r = 0.88. But
> once you have picked a size, the spread between models *at that size* is still large: at 65 inches
> the middle 80% of models cost between $126 and $228 a year to run. The star rating looks like it
> should settle that, but it is calculated relative to screen size: a five-star 32-inch uses 124 kWh
> a year and a five-star 86-inch uses 988. Same badge, eight times the electricity. The fix is
> already on the label: the kWh/year number under the stars means the same thing on every box.

**The numbers that carry it** (all from `data/out/key_facts.csv` and the chart files):

| Figure | Value |
|---|---|
| Models on the market | **4,599** (74 brands) |
| Screen area vs energy | **r = 0.88** (0.877) |
| 65-inch models | **830**, the most crowded size |
| Middle 80% at 65" (P10–P90) | **360–652 kWh/yr = $126–$228/yr** at 35 c/kWh |
| Typical gap at 65" | **$102 a year, about $1,000 over ten years** |
| Full range at 65" | 185 vs 1,135 kWh (6.1×) — LG 65UJ660H5LD vs Samsung QA65QN900BS, both atypical |
| Five stars, smallest vs largest band | **124 vs 988 kWh/yr (8.0×)** |
| Five-star 55" → five-star 75" | median **$116 → $205** a year |

---

## 2. Running and viewing the site

The charts load CSV files with `d3.csv()`, which browsers block on `file://`. **Use a local web
server** — double-clicking `index.html` shows an instruction message instead of charts.

```bash
cd COS30045_demo1            # the folder you cloned
python3 -m http.server 8000  # Windows: python -m http.server 8000
```

Then open <http://localhost:8000>. No build step and nothing to install: D3 v7.9.0 is bundled at
`assets/js/vendor/d3.v7.min.js`, so the site works with no internet connection.

**On Mercury** (Swinburne's web server) — see `deploy/deploy_mercury.sh`:

```bash
bash deploy/deploy_mercury.sh          # uploads to ~/cos30045/www/htdocs/assignment1
```

The site will be at <http://mercury.swin.edu.au/cos30045/s106214726/assignment1/index.html>. Viewers
log in with their SIMS username and password. Uploading needs the Swinburne VPN when off campus;
viewing does not. Full step-by-step for a Mac is in `CLAUDE_GUIDE.md`.

---

## 3. The data

| | |
|---|---|
| Dataset | Energy Rating data for household appliances — Labelled products |
| File | `tv_2026_10_04.csv` (kept untouched in `data/raw/`) |
| Publisher | Department of Climate Change, Energy, the Environment and Water |
| Portal | <https://data.gov.au/data/dataset/energy-rating-for-household-appliances> |
| Licence | Creative Commons Attribution 4.0 |
| Retrieved | 4 October 2026 |
| Extent | 5,030 rows × 32 columns → 4,599 models × 17 columns after cleaning |
| Dictionary | `data/raw/televisions-data-dictionary.docx` (official, May 2015) |

**What it is.** Under the Greenhouse and Energy Minimum Standards (GEMS) scheme, a television cannot
legally be sold in Australia or New Zealand unless its supplier registers it, submits energy test
results measured under a prescribed standard, and carries the Energy Rating Label. This file is
that register.

**Why that matters.** It is an **administrative census of the legal market, not a sample**. There is
no sampling error. There *is* registration bias: a registered model may legally be sold but is not
necessarily stocked anywhere (see [Limitations](#13-limitations)).

**Why this source.** It is the most realistic data available for the question: official, measured
under one standard test, covering every model, and free to reuse. The government's own consumer
comparator at reg.energyrating.gov.au searches the same database; data.gov.au publishes it as a file.

**Privacy.** No personal information. Every record is a manufactured product, and the only named
parties are companies registering products as part of a regulatory disclosure regime. No
anonymisation was needed.

**Key fields.**

| Column | Meaning |
|---|---|
| `Brand_Reg`, `Model_No` | Registrant brand and model number |
| `screensize`, `Screen_Area` | Diagonal in cm; panel area in cm² |
| `Screen_Tech` | LCD, LCD (LED) or OLED |
| `Avg_mode_power` | Watts drawn in normal on mode |
| `Labelled energy consumption (kWh/year)` | The headline label figure, at 10 hours a day |
| `Star2` | The current star rating (`Star` is superseded and 94% empty) |
| `SoldIn`, `Availability Status` | Market and whether still available |

---

## 4. The KNIME workflow, node by node

**File:** `knime/TV_Energy_TriTran.knwf` — KNIME Analytics Platform 5.12. Import it with
*File → Import KNIME Workflow*. It was exported **without data**, so run it once after importing.

**Shape:** 29 nodes and 28 connections. One cleaning chain, then three output branches, plus an
audit branch hanging off the reader. The node numbers below are the numbers on the KNIME canvas.

```
                    ┌─► Statistics #27  (profiles the RAW file, feeds nothing)
CSV Reader #1 ──────┤
                    └─► Column Filter #2 ─► Row Filter #3 ─► Row Filter #4
                         ─► String Manipulation #5 ─► #6 ─► #7 ─► String To Number #8
                         ─► String Manipulation #9 ─► Rule Engine #10 ─► Duplicate Row Filter #11
                         ─► Math Formula #12 ─► #13 ─► #14 ─► #15 ─► #16
                         ─► Rule Engine #17 ─► Math Formula #18
                         ─► Column Filter #28 ─► Column Renamer #31 ─┬─► CSV Writer #19        tv_clean
                                                                     ├─► GroupBy #29 ─► CSV Writer #21   band_summary
                                                                     ├─► Row Filter #22 ─► Sorter #23 ─► CSV Writer #24   shelf_65
                                                                     └─► GroupBy #30 ─► CSV Writer #26   brand_efficiency
```

The canvas carries four annotations: a header (project, author, source, licence, row counts) and one
per phase explaining *why*, not just what.

### Phase 1 — Reduce and scope

| # | Node | Setting | Rows out | Why |
|---|---|---|---|---|
| 1 | CSV Reader | `data/raw/tv_2026_10_04.csv` | 5,030 × 32 | The untouched source. |
| 2 | Column Filter | keep 17, drop 15 | 5,030 × 17 | Dropped `GrandDate` (100% empty); `SubmitStatus`, `Product Class`, `What test standard was used` (one value each — zero variance cannot be encoded); `Star`, `SRI` (deprecated, 94% empty); `Star Image Large/Small` (image URLs); `Product Website`, `Representative Brand URL` (77% / 53% empty); `Family Name` (42% empty, a marketing grouping); `Submit_ID`, `Registration Number` (administrative keys); `Power supply`, `Star Rating Index` (not used by the story). |
| 3 | Rule-based Row Filter | `$SoldIn$ LIKE "*Australia*" => TRUE` | 4,850 | `SoldIn` is a list; 180 rows are New Zealand or Fiji only. The story is about Australia. |
| 4 | Rule-based Row Filter | `$Availability Status$ = "Available" => TRUE` | 4,839 | Only models a shopper could still buy. |

### Phase 2 — Fix nulls, names and duplicates

| # | Node | Setting | Rows out | Why |
|---|---|---|---|---|
| 5–7 | String Manipulation ×3 | `replace($Pasv_stnd_power$, "-", "")`, same for `Act_stnd_power`, `Act_stnd_time` | 4,839 | 854 rows write *missing* as a literal `-`, which forces the whole column to text. |
| 8 | String To Number | the three standby columns → Double, fail on error off | 4,839 | Makes them numeric; anything unparseable becomes a proper missing value. |
| 9 | String Manipulation | `upperCase(strip($Brand_Reg$))` → append `Brand` | 4,839 | `SAMSUNG`, `Samsung`, `samsung ` collapse to one. 88 → 77 brand strings. |
| 10 | Rule Engine | `"SAMSUNG ELECTRONICS" => "SAMSUNG"`, `"Q.BELL" => "QBELL"`, `"HUBBL GLASS" => "HUBBL"`, `TRUE => $Brand$` | 4,839 | Three documented same-company aliases. 77 → 74. Deliberately conservative: `SPARK ELECTRONICS` is *not* merged into Samsung despite the shared word. The `TRUE` fallback keeps every other brand. |
| 11 | Duplicate Row Filter | key `Brand` + `Model_No`, keep first | **4,599** | 240 repeat registrations. Without this, popular models vote several times in every median. |

> **Known residue (does not affect any output value).** In these two node types KNIME saves
> *Append* as `append_column="false"`, the reverse of what the key name suggests. So #5–#7, meant to
> clean in place, each **appended** a cleaned text copy (`Pasv_stnd_power (#1)` …) and #8 converted
> the originals. The exported values are identical, but two standby columns leave KNIME typed as
> text and one keeps the name `Act_stnd_power (#1)`. Fix in two minutes: in Column Filter #28 swap
> the two `(#1)` columns for the numeric originals, then add `Act_stnd_power → watts_active_standby`
> in Column Renamer #31. See [§12](#12-build-and-debugging-log), B9.

### Phase 3 — Derive

| # | Node | Expression | New column | Why |
|---|---|---|---|---|
| 12 | Math Formula | `round($screensize$ / 2.54)` (to int) | `inches` | Australian shops sell televisions in inches, not centimetres. |
| 13 | Math Formula | `round($Screen_Area$ / 10000, 3)` | `screen_m2` | Square metres are readable; cm² are not. |
| 14 | Math Formula | `round($Labelled energy consumption (kWh/year)$ * 0.35)` | `cost_aud_year` | The audience thinks in dollars. 35 c/kWh is the top of the 2026 national average range, so costs are not understated. |
| 15 | Math Formula | `round($Avg_mode_power$ / $screen_m2$, 1)` | `watts_per_m2` | Power per unit of screen. |
| 16 | Math Formula | `round($Labelled energy consumption (kWh/year)$ / $screen_m2$)` | `kwh_per_m2` | Lets brands be compared without rewarding those that mostly sell small sets. |
| 17 | Rule Engine | `$inches$ <= 32 => "32in & under"` … `TRUE => "86in+"` (8 rules) | `size_band` | The eight sizes shops actually group by. **Ratio becomes ordinal** — a data-type change caused by a transformation. Labels are ASCII (`56-65in`) so they survive KNIME, CSV and JavaScript; the site prints a proper inch mark. |
| 18 | Math Formula | `round($Star2$)` (to int) | `stars` | Whole stars for the heat map axis. Again ratio → ordinal. |

### Phase 4 — Shape and write

| # | Node | Setting | Rows × cols | Why |
|---|---|---|---|---|
| 28 | Column Filter | keep the 17 published columns | 4,599 × 17 | Drop the working columns (`Brand_Reg`, `screensize`, `Screen_Area`, `SoldIn`, …). |
| 31 | Column Renamer | `Model_No → model`, `Screen_Tech → screen_tech`, `Avg_mode_power → watts_on`, `Pasv_stnd_power (#1) → watts_passive_standby`, `Labelled energy consumption (kWh/year) → kwh_year`, `Star2 → star_rating`, `Tuner Type → tuner` | 4,599 × 17 | Short names the JavaScript can use directly. All three branches start here, so they all see the same names. |
| 19 | CSV Writer | header on, row ID off, comma | 4,599 × 17 | The model-level table. |
| 29 → 21 | GroupBy → CSV Writer | group `size_band`; `kwh_year` Count, Min, Median, Max; `inches` Median; missing excluded | 8 × 6 | Act four's ranges per size band. |
| 22 → 23 → 24 | Rule-based Row Filter → Sorter → CSV Writer | `$inches$ >= 64 AND $inches$ <= 66 => TRUE`; sort `kwh_year` ascending | 830 × 17 | Every 65-inch television, cheapest to run first — Act two's shelf. |
| 30 → 26 | GroupBy → CSV Writer | group `Brand`; `kwh_year` Count and Median; `inches`, `kwh_per_m2`, `star_rating` Median | 74 × 6 | Brand efficiency, before the 25-model cut. |
| 27 | Statistics | medians on; nominal counts for `Brand_Reg`, `Screen_Tech`, `SoldIn`, `Availability Status`, `Country` | — | **Audit branch.** Profiles the *raw* file: missing counts per column, value counts that expose the brand spellings. Deliberately disconnected — a profile taken after cleaning would show no problems and prove nothing. |

### Where each output goes

The KNIME writers' files are kept, unedited, in **`data/knime_out/`**. The site loads
**`data/out/`**, written by `knime/pipeline_reference.py`, which repeats every KNIME step in Python
and adds the shaping the charts need that the workflow does not do: tidy names for the aggregate
columns, the spread and cost columns for Act four, the star × band pivot for the heat map, the
25-model brand cut, and `key_facts.csv`. [Section 5](#5-verifying-the-workflow) proves the two agree.

> **Before running the workflow again:** the four writers still point into `data/out/` (and #19 at
> `desktop.csv`). Re-point them to `data/knime_out/` first, or KNIME will overwrite the files the site
> loads — that is exactly how Act four broke once (B12). The reader and writer paths are absolute
> Windows paths; on another machine, re-point the CSV Reader at this repo's `data/raw/` file.

---

## 5. Verifying the workflow

```bash
python3 knime/verify_knime_outputs.py
```

The script uses only the Python standard library. It matches every row in `data/knime_out/` to its
twin in `data/out/` by key and compares every shared column. Current result: **PASS**.

| Output | Rows matched | Differences |
|---|---|---|
| `tv_clean.csv` | 4,599 / 4,599 | three explained differences, below |
| `band_summary.csv` | 8 / 8 | none on the five aggregate columns |
| `brand_efficiency.csv` | 22 / 22 after the ≥ 25 cut | none; same order |
| `shelf_65.csv` | 830 / 830 | one $1 rounding difference |

**The three explained differences:**

1. **`cost_aud_year` is $1 lower for 43 models.** KNIME multiplies by 0.35, which is not exact in
   binary floating point, so 170 × 0.35 = 59.4999… and rounds to 59. The script computes
   170 × 35 / 100 = 59.5 exactly and rounds to 60. To match exactly in KNIME, use `* 35 / 100`.
2. **106 `tuner` values read `unknown` in KNIME, blank in the script.** The script recodes that
   placeholder to missing; the workflow has no node for it.
3. **One JVC model is registered with the model number `NA`.** pandas reads the text `NA` as missing
   by default; KNIME keeps it. The same file read by two standard tools gives two answers.

None of the three reaches a chart.

**Regenerating the site data** (needs pandas, not needed to present):

```bash
python3 -m pip install pandas
python3 knime/pipeline_reference.py
```

---

## 6. What was wrong with the data

Ten defects in the source, each found with evidence and resolved with a stated decision. The full
record, with the evidence for each, is in `ISSUES_LOG.md` Part A; categories follow Han, Kamber &
Pei (2011).

| # | Issue | Evidence | Decision | Dimension |
|---|---|---|---|---|
| A1 | Inconsistent brand naming | `SAMSUNG ELECTRONICS`, `Samsung`, `SAMSUNG`; 93 raw strings | Trim + upper-case, merge 3 documented aliases → 74 | Consistency |
| A2 | Missing written as `-` | 854 rows in the standby columns | Recode to missing, convert to number; no imputation | Completeness |
| A3 | Missing written as `unknown` | 116 rows in `Tuner Type` | Recode to missing (reference script) | Consistency |
| A4 | Missing written as `N/A` | 9,435 cells in `Star`/`SRI` | Columns dropped anyway; recorded as a third convention | Consistency |
| A5 | `Star`, `SRI` 94% empty | 4,716 of 5,030 rows | Dropped: the dictionary says `Star` is superseded by `Star2`. **Deprecated, not missing** | Interpretability |
| A6 | Columns with no information | `GrandDate` 100% empty; three single-value columns | Dropped | Completeness |
| A7 | Repeat registrations | 240 brand + model pairs repeat | Keep first | Accuracy |
| A8 | Units unfit for the audience | cm diagonal, cm² area | Derive inches and m² | Interpretability |
| A9 | Mixed-market rows | 180 NZ/Fiji-only rows | Filter to Australia | Accuracy |
| A10 | Errors in the official dictionary | two column identifiers swapped; a documented column that no longer exists | Trust the headers (value ranges confirm them); record the defect | Interpretability |

Two analysis findings also changed decisions: the energy data is **right-skewed**, so the site uses
medians throughout, never means; and the headline spread at 65" is **driven by two atypical
products**, so the middle 80% leads instead ([§7](#7-the-story)).

---

## 7. The story

### Point of view

The obvious message — "big TVs use more power, buy a smaller one" — is true, useless, and nobody acts
on it. People pick a size for the room and the budget first. So the interesting question is not *how
much does size matter* but **how much room is left once size is settled** — and whether the tool
shoppers trust can see it.

Three findings shaped the angle:

1. **Size explains a lot** (r = 0.88). Leading with "size doesn't matter" would be dishonest, so the
   story concedes it first.
2. **The money is in the variation left over.** At one size, 65", the middle 80% of models still
   span 360–652 kWh — $102 a year.
3. **The star rating is size-relative**, and almost nobody knows. It is not a flaw — the Star Rating
   Index is designed so large TVs are judged against large TVs — but shoppers read a relative badge
   as an absolute one. **This is the story.**

### Structure — setting, conflict, resolution

| Act | Role | Claim | Chart |
|---|---|---|---|
| One — *What everybody believes* | Setting: agree with the reader | Bigger screens use more energy (r = 0.88) | Scatter, all 4,599 models |
| Two — *One size. 830 choices.* | Conflict: show the gap they cannot see | Same size, $126–$228 a year | Beeswarm, every 65" model |
| Three — *The label cannot answer the question* | Conflict deepens: remove the trusted tool | Five stars = 124 kWh or 988 kWh | Heat map, size × stars |
| Four — *What it costs, at your tariff* | Resolution: hand back a better instrument | Bands overlap; the model matters more than the size | Range bars with sliders |
| *Three things, in order* | Call to action | Settle size → read kWh → apply your own tariff | — |

### The integrity decision

The raw spread at 65" is **6.1×** (185 vs 1,135 kWh) — a far punchier headline than 1.8×. It was
deliberately not used as the headline. The two endpoints are a 2017-era commercial display and an 8K
flagship, products nobody cross-shops; leading with them would be quoting data out of context in
exactly the way Tufte warns about. The site reports both: the middle 80% as the figure a shopper
actually faces, and the extremes labelled for what they are. A weaker headline, and a defensible one.

### Other stories considered

| Idea | Why it was not chosen |
|---|---|
| "The size-step subscription" — what each step up in size adds to the yearly bill | Strong supporting insight, but it reinforces "size matters", which the story concedes rather than argues |
| OLED vs LED | At 65" the medians are 448 vs 464 kWh (`tech_at_65.csv`) — too small to carry an act |
| Standby power | Missing for 854 rows; imputing it to make a point would be manipulation |
| Efficiency over time | No reliable registration date in the file, only expiry |
| National consumption | Needs sales weighting; the register counts models, not televisions sold |
| Country of manufacture | Real and interesting, but does not advance the plot |

---

## 8. Storyboard log

The full storyboard, written before the site was built, is `STORYBOARD.md`: audience, Big Idea,
three-minute story, a panel for every screen (what the reader sees, does and takes away), the chart
inventory and the cut list. This section records how it evolved.

### Order of work

1. **Data first.** Found the official government register (data.gov.au) and confirmed it is a census
   of the legal market. Checked `reg.energyrating.gov.au` as an alternative source: same database,
   built for single-model lookup rather than bulk download, so data.gov.au stayed the source.
2. **Website rebuilt** around the data with D3 — four pages, shared chart helpers.
3. **Story and point of view** decided from the profiling findings (§7).
4. **Storyboard written** — `STORYBOARD.md`, panels 0–8.
5. **KNIME pipeline** — first drafted as a generated workflow file, then debugged and rebuilt by hand
   in the KNIME GUI ([§12](#12-build-and-debugging-log)).

### Panels as built

| Panel | Screen | Planned | As built |
|---|---|---|---|
| 0 | Hero | Headline + four counters + provenance strip | As planned |
| 1 | Act one | Scatter, trend line, 65" band highlighted as the hinge into Act two | As planned; callout moved to the empty upper-left with a leader line so it never covers data |
| 2 | Act two | Beeswarm, middle 80% shaded and labelled, tails annotated | Label *"8 in 10 models land in here"* **removed — said aloud instead** |
| 3 | Act three | Heat map, 5-star connector, 55"→75" warning | Colour ramp made non-linear (declared on About); 55"→75" figures corrected to the five-star cells ($116 → $205) |
| 4 | Act four | Range bars, price and hours sliders | As planned |
| 5 | Resolution | Three numbered actions | As planned |
| 6 | Explore | Filters, brand chart, sortable table, model pricing | As planned |
| 7–8 | Data & method, About | Provenance, quality log, KNIME chain, limitations, GenAI | KNIME section rewritten to match the 29-node workflow actually built |

### Revisions and why

| Change | Reason |
|---|---|
| Act one heading → *"What everybody believes"* | Author's edit: shorter, and names the belief the act sets up to complicate |
| Removed Act one's takeaway paragraph (*"Look again at the chart above and read it vertically instead of diagonally. Every vertical slice is tall. Size sets the floor. It does not set the bill."*) | Delivered **orally** while pointing at the chart — stronger spoken than read |
| Removed the beeswarm label *"8 in 10 models land in here"* | Delivered **orally** while pointing at the shaded band |
| Middle-80% figure leads, 6.1× demoted | Integrity (§7) |
| Heat-map ramp made non-linear | A linear ramp painted four-fifths of the grid the same green; declared on the About page |
| Beeswarm colour ramp stretched to the shelf's own kWh range | Spread over the whole axis, every dot landed mid-scale and the colour said nothing |
| Size labels stored as `56-65in` | A `"` in a label broke across KNIME, CSV and JavaScript escaping |
| Act three five-star costs corrected | The old figures were all-model band medians, not five-star medians (B16) |

---

## 9. The website, page by page

Four pages share one stylesheet and one set of chart helpers. Every chart is hand-built SVG with D3
v7: no charting library.

### 9.1 Story — `index.html`

**Hero.** *"A bigger screen costs more to run. That is not the decision that costs you money."* The
headline plants a contradiction the page has to resolve. Four counters animate up — 4,599 models ·
74 brands · 830 choices at 65" · 8× energy gap at the same star rating. The fourth is the Act three
finding stated before it is proved: the hook. The provenance strip under it (file, model count,
retrieval date, five label colours) is the Exercise 4.2 D3 work ([§10](#10-how-the-d3-code-is-organised)).

**Act one — scatter: screen area vs annual energy, 4,599 dots.**

- *Why a scatter:* two quantitative variables, and the question is the shape of their relationship.
  Position on two common scales is the most accurately perceived channel (Munzner), so position
  carries both quantities.
- *Encoding:* x = screen area (m²), y = kWh/year, colour = panel technology (the one categorical
  attribute, colour-blind-safe palette). An OLS trend line and *r = 0.88* annotation.
- *Story role:* agree with the reader to earn credibility, and plant the detail that matters — every
  vertical slice is tall. A highlighted band at 65" is the hinge: Act two is literally a zoom into
  that column, so the reader never gets lost.
- *Interaction:* hover any dot for brand, model, size, technology, energy, cost and stars.
- *Say aloud here:* "Read it vertically, not diagonally. Every vertical slice is tall. Size sets the
  floor; it does not set the bill."

**Act two — beeswarm: every 65-inch television, by annual energy.**

- *Why a beeswarm, not a histogram:* every dot is a product you could carry home. A histogram shows a
  distribution; a beeswarm shows **choices**, which is the emotional point.
- *Encoding:* x = kWh/year; colour = the Energy Rating Label's own green-to-red ramp, so it needs no
  legend to be understood. Shaded band = middle 80% (P10 360, P90 652 kWh). Both tails annotated
  with what they are: *185 kWh · $65/yr — a 2017 commercial panel*, *1,135 kWh · $397/yr — an 8K
  flagship*.
- *Layout:* deterministic binned dodge (not a force simulation), so it is identical on every reload;
  a two-pass layout guarantees the deepest column fits.
- *Story role:* the size decision is settled and the decision is still wide open — and the gap is
  money.
- *Say aloud here:* "Eight in ten 65-inch models land in this band."

**Act three — heat map: median kWh by size band × star rating.**

- *Why a heat map:* the question is genuinely two-dimensional — the answer depends on *both* size and
  stars, and only a matrix shows an interaction. Printing the value in each cell makes it a table as
  well, so the colour never has to be measured.
- *Encoding:* rows = eight size bands, columns = 1–8 stars, colour = median kWh on the label ramp
  (non-linear, declared), value printed. Cells with fewer than three models are left blank rather
  than drawn from a single product.
- *Reading it:* across a row, more stars always means less electricity — the rating works. Down a
  column, five stars means 124 kWh on a small set and 988 on a large one — the same badge, 8×.
- *Story role:* the pivot. The reader's trusted instrument turns out to measure something else. The
  warning callout makes it concrete: a five-star 55" to a five-star 75" feels like a like-for-like
  swap, but the median five-star bill goes from $116 to $205.

**Act four — range bars: annual running cost per size band.**

- *Why range bars from zero:* length is proportional to cost, so the comparison is honest. Each bar
  spans cheapest to dearest model in its band, filled green-to-red, with a marker at the median.
- *Interaction:* two sliders, electricity price (15–60 c/kWh) and viewing hours (1–16 h/day). Bars,
  labels and medians re-render live. The tariff is the only assumption on the site that is not a
  measurement, so it is handed to the reader — who stops auditing the number and starts using theirs.
- *Story role:* the overlap between neighbouring bands is the whole argument in one glance: a
  well-chosen 75" (from $90/yr) can cost less to run than a poorly-chosen 55" (up to $286/yr).

**Resolution — three things, in order.** Settle the size first, then stop comparing across sizes.
Read the kWh number, not the stars. Multiply it by your own tariff and habits.

### 9.2 Explore — `explore.html`

Makes the call to action executable.

- **Filters:** size-band chips, panel-technology chips, brand, free-text search, plus the same
  price and hours sliders.
- **Brand chart:** median kWh per m² of screen, per brand, recomputed live from the filtered rows.
  Normalising by area asks the fair question — raw kWh would mostly measure which brands sell big
  TVs. Brands with fewer than eight matching models are left out, because a median over a handful of
  products says more about what was registered than about the brand.
- **Model table:** sortable by any column.
- **Your television:** click a row to see that model's yearly and ten-year cost at your settings,
  the percentage of same-size models (±1 inch) it beats, and its cost against their median.
- **Comparing honestly:** a short guide — filter to your size, then sort by kWh — and a pointer to
  the government's official product comparator for checking before buying.

### 9.3 Data & method — `data.html`

The page that lets the story stay clean: provenance and governance, the privacy assessment, the
ten-item data-quality log, the KNIME node table with rows and columns after every node, how the site
files are produced and verified, the five limitations, and every data file with what uses it.

### 9.4 About — `about.html`

Purpose and Big Idea, audience and the action asked of them, the narrative structure act by act, the
design rationale (marks and channels, the label's colours, graphical integrity, the declared
non-linear ramp, data-ink, accessibility), how it was built, the GenAI declaration and references.

---

## 10. How the D3 code is organised

| File | Contents |
|---|---|
| `assets/js/vendor/d3.v7.min.js` | D3 v7.9.0, bundled so the site works offline |
| `assets/js/charts.js` | Shared `VIZ` module: price and hours constants (must match the Python script), the label colour scale `energyScale(domain, exponent)`, tooltip, `makeSvg` (responsive `viewBox`), axes and gridlines, CSV loading with typed row parsers, the `file://` warning, resize handling |
| `assets/js/story.js` | The four story charts: `drawScatter`, `drawShelf` (beeswarm), `drawHeat`, `drawCost`, plus the Act four slider wiring |
| `assets/js/explore.js` | Filters, `drawBrands`, `drawTable`, `renderPicked` (model pricing) |
| `assets/js/main.js` | Theme toggle, scroll reveals, count-up counters, and `d3Provenance()` |

### Unit exercise coverage

| Exercise | Where |
|---|---|
| 1.0 Data processing with KNIME | `knime/TV_Energy_TriTran.knwf`, §4, Data & method page |
| 3.0 Communicating data insights | `STORYBOARD.md`, §7–8, `index.html` |
| **4.2 Manipulate and add elements with D3** | `main.js → d3Provenance()`: (1) `d3.select().style()` styles an existing element; (2) `.append('p')` adds a text element; (3) `.append('svg')` with `rect`, `line`, `circle`; (4) `.selectAll('rect').data(VIZ.ENERGY_RAMP).join('rect')` binds the label colours to shapes |
| 4.3 Responsive SVG | `viewBox` on every chart via `VIZ.makeSvg` |
| 4.4 Loading data from CSV | `VIZ.load()` → `d3.csv()` with row-conversion functions |
| 4.5 Binding and drawing with data | `.selectAll().data().join()` in all five charts |
| 4.6 Scales | `scaleLinear`, `scaleBand` with padding, `scaleOrdinal`, the sequential label ramp |
| Interaction | Tooltips everywhere, Act four sliders, Explore filters, sortable table, `d3.transition()` on bars |

---

## 11. Design decisions

- **Marks and channels.** Quantities ride on position on a common scale wherever possible. Colour
  carries one categorical attribute at a time, or redundantly encodes a quantity that is also
  printed. Nothing is encoded by area or angle alone. No pie charts, no 3D, no dual axes.
- **The label's own colours.** The sequential ramp is the Energy Rating Label's green-to-red, so
  anyone who has seen the sticker already knows which end is good.
- **Graphical integrity.** Bars start at zero. No truncated axes, no clipped data. The tail-driven
  6.1× is reported but not the headline. Thin heat-map cells are left blank.
- **One declared distortion.** The heat-map ramp is spread non-linearly because energy is
  right-skewed; it stays continuous and monotonic, the value is printed in every cell, and it is
  declared on the About page.
- **Data-ink.** Faint dashed gridlines, no redundant spines, direct labels, no decoration.
- **Accessibility.** Every chart has a title and a text description for screen readers; colour is
  never the only carrier of meaning; colour-blind-safe categorical palette; keyboard-reachable
  controls with visible focus; 44 px touch targets; animation off under `prefers-reduced-motion`.
- **Light and dark themes.** Toggle in the top-right; follows the system setting until a choice is made, then remembers it.

---

## 12. Build and debugging log

The full record is `ISSUES_LOG.md` Part B (B1–B16). The ones worth knowing:

| # | What happened | Root cause | Fix |
|---|---|---|---|
| B2–B4 | Generated workflow loaded fully red; then "Errors during load" | Generated CSV Reader lacked its output spec; a misnamed editor key | Generated the full spec; key fixed. Diagnosed from KNIME's own log |
| B5 | KNIME showed annotations but no nodes | The generator deleted the live folder before failing on KNIME's lock file | Build to a staging folder, never delete the live copy |
| **B9** | Rule Engine: *Not a column: Brand*; Math Formula: *No such column: screen_m2*; 28 columns instead of 25 | **KNIME saves *Append* as `append_column="false"`** — the generator had it backwards | Every dialog reset by hand |
| B10 | GroupBy dialogs would not open | Empty generated settings | Deleted and re-added from the node repository |
| B11 | Sorter warning; 28 raw-named columns at the writer | No select-and-rename step | Added Column Filter #28 and Column Renamer #31; rewired all branches |
| **B12** | Act four went blank | The KNIME writers overwrote the site's `data/out/` files with differently shaped tables | KNIME output moved to `data/knime_out/`; site files regenerated and checked byte-identical |
| B13 | — | Verification | KNIME reproduces the site data; three explained differences |
| B14 | Heat-map caption ran off the card | `text-anchor: end` at a negative x | Anchored at the plot's left edge |
| B15 | Charts depended on a CDN | D3 loaded from d3js.org | D3 bundled locally |
| B16 | A wrong number in Act three | All-model band medians quoted for five-star models | Corrected to $116 → $205 |

The generator script itself was removed once the hand-built workflow became the source of truth:
re-running it would have overwritten the repaired workflow with the broken draft.

**Why `knime-claude-pipeline` was not used.** That repository sends each CSV row to the Claude API
and writes back an AI-generated summary. Here every number has to be deterministic and traceable;
routing 4,599 rows through a language model would make the figures unverifiable and the run
non-reproducible. Its one defensible use — drafting captions from already-computed aggregates —
belongs in the writing stage, not the data pipeline.

---

## 13. Limitations

1. **A lab figure, not your bill.** kWh/year is measured under one test at 10 hours a day with fixed
   picture settings: excellent for comparing models, approximate for predicting a household's use.
2. **Registered is not stocked.** Registration means a model may be sold, not that anyone sells it —
   which is how a 2017 commercial panel appears next to current models. Availability is
   self-reported.
3. **No sales weighting.** Every model counts once. A median across models is not a median across
   televisions in homes; national consumption cannot be estimated.
4. **Supplier-reported results**, backed by regulatory check-testing rather than independent testing
   of every model.
5. **The tariff is an assumption.** 35 c/kWh is a national average; the ranking of models is
   identical at any price, and the sliders let readers use their own.

Standby power is left out of every chart rather than imputed (missing for 854 rows).

---

## 14. Presenting it

### A three-minute run through the Story page

| Time | On screen | Say |
|---|---|---|
| 0:00 | Hero | "Every TV legally sold in Australia is in a government register — 4,599 models. A bigger screen costs more to run. That's not the decision that costs you money." |
| 0:25 | Act one scatter | "Size matters — r = 0.88. But read it vertically: every slice is tall. Size sets the floor, not the bill." *(the removed takeaway, spoken)* |
| 0:55 | Act two beeswarm | "830 models, all 65 inches. Eight in ten land in this band *(point)* — $126 to $228 a year. The extremes are 6.1× apart, but they're a commercial panel and an 8K flagship, so I lead with the middle." |
| 1:35 | Act three heat map | "Read a row: stars work. Read a column: five stars is 124 kWh on a 32-inch, 988 on an 86-inch. Same badge, 8× the power." |
| 2:15 | Act four, drag a slider | "Put in your own tariff. The bands overlap — a good 75-inch can cost less to run than a bad 55." |
| 2:40 | Resolution | "Settle the size, read the kWh number, use your own tariff. It's already on the label." |

### Questions you are likely to be asked

- **Walk me through the workflow.** Four phases: reduce and scope (5,030 → 4,839), fix nulls, names
  and duplicates (→ 4,599), derive, then shape and write three branches. Statistics profiles the raw
  file as an audit.
- **What was wrong with the data?** Lead with Samsung appearing under three names; then missing
  written four ways (empty, `-`, `unknown`, `N/A`) — and one model number literally `NA` that pandas
  and KNIME read differently.
- **Why drop `Star` and keep `Star2`?** The dictionary says `Star` is superseded; 94% empty. A
  deprecated column, not missing data — so drop, don't impute.
- **Why not impute standby?** Nothing on the site uses it; imputing 854 values adds fabricated data
  for no gain.
- **Why median, not mean?** Right-skewed data: a few 8K sets at up to 2,652 kWh drag the mean above
  anything a shopper meets.
- **Why only three brand merges?** Upper-casing is mechanical and safe; the three merges are
  documented aliases. Fuzzy matching would introduce errors.
- **Show a transformation that changed the data type.** `inches` (ratio) → `size_band` (ordinal);
  `Star2` (ratio) → `stars` (ordinal).
- **How do you know it's right?** The Python mirror reproduces the outputs independently and
  `verify_knime_outputs.py` matches every row: PASS, with three explained differences.
- **Why 25 models for the brand ranking?** Below that, one unusual model swings a brand's median.
  (The Explore chart uses 8 because it responds to filters and would otherwise empty out.)
- **Why a beeswarm and not a histogram?** Every dot is a product you could buy — it shows choices,
  not just a distribution.
- **Is the heat-map colour honest?** It is non-linear, declared on the About page, monotonic, and
  every cell prints its value.
- **What would break if the source file were updated?** Nothing structural — the workflow keys on
  column names. The counts would change, which is why they are recorded with the retrieval date.

### Day-of checklist

- Open the site from a local server or Mercury, never by double-clicking.
- Browser zoom at 100% (Cmd+0), full screen (Cmd+Ctrl+F in Chrome or Safari).
- Scroll through the whole Story page once before presenting so every chart has animated in.
- Have Mercury and localhost both ready; either works if the other fails.
- Turn on Do Not Disturb.

---

## 15. Repository map

```
├── index.html                 Story — four acts, four D3 charts
├── explore.html               Explorer — filters, brand chart, table, model pricing
├── data.html                  Data & method — provenance, quality log, KNIME chain, limits
├── about.html                 About — audience, design rationale, GenAI declaration
├── WALKTHROUGH.md             This document
├── README.md                  Front page: what it is and how to run it
├── CLAUDE_GUIDE.md            Step-by-step: clone, run, present, deploy on a Mac
├── CLAUDE.md                  Short rules for Claude Code working in this repo
├── STORYBOARD.md              The storyboard as written before the build
├── ISSUES_LOG.md              Every data defect (Part A) and build issue (Part B)
├── assets/
│   ├── css/styles.css         Design system and page styles
│   ├── img/PowerIcon.png
│   └── js/                    charts.js · story.js · explore.js · main.js · vendor/d3.v7.min.js
├── data/
│   ├── raw/                   Untouched source CSV + official data dictionary
│   ├── out/                   The CSVs the site loads (written by pipeline_reference.py)
│   └── knime_out/             The CSVs the KNIME writers produced, unedited
├── knime/
│   ├── TV_Energy_TriTran.knwf     The KNIME workflow (29 nodes)
│   ├── pipeline_reference.py      Python mirror of the workflow; writes data/out/
│   └── verify_knime_outputs.py    Checks data/knime_out/ against data/out/
└── deploy/
    └── deploy_mercury.sh      Publishes the site to Mercury
```

| Data file | Rows | Used by |
|---|---|---|
| `data/out/tv_clean.csv` | 4,599 | Act one scatter, Explore |
| `data/out/shelf_65.csv` | 830 | Act two beeswarm |
| `data/out/star_band_heat.csv` | 50 | Act three heat map |
| `data/out/band_summary.csv` | 8 | Act four range bars |
| `data/out/key_facts.csv` | 1 | Every figure quoted in the prose |
| `data/out/brand_efficiency.csv` | 22 | Write-up only (Explore recomputes live) |
| `data/out/tech_at_65.csv` | 3 | Write-up only (the OLED vs LED check) |

---

## 16. Generative AI declaration and references

Generative AI (**Claude**, by Anthropic) was used in this project.

**Used for:** profiling the raw data to surface quality issues; designing the KNIME node sequence and
writing the Python reference script; generating a first draft of the KNIME workflow file (which did
not load cleanly — the author debugged it and rebuilt the broken nodes by hand, and the submitted
workflow is the hand-repaired version); writing the D3 chart code, CSS and page markup; drafting and
editing copy; checking KNIME's outputs against the reference script; preparing these documents and
the deployment script.

**Not used for:** generating, estimating, imputing or inventing any data — every figure traces to
the source file; choosing the story, audience or argument; accepting any claim without checking the
number behind it.

**Verification.** Every quantity in the prose was recomputed from the source and cross-checked
against the CSVs (one wrong figure was caught and corrected this way — B16). All code was reviewed,
run and modified by the author, who takes full responsibility for the submission.

### References

- Department of Climate Change, Energy, the Environment and Water (2026). *Energy Rating data for
  household appliances — Labelled products.* data.gov.au. CC BY 4.0.
- Han, J., Kamber, M. & Pei, J. (2011). *Data Mining: Concepts and Techniques* (3rd ed.). Ch. 2–3.
- Knaflic, C. N. (2015). *Storytelling with Data.* Ch. 1–2.
- Munzner, T. (2014). *Visualization Analysis and Design.* Ch. 5–6.
- Tufte, E. R. (2001). *The Visual Display of Quantitative Information* (2nd ed.).
- Dufour, A. & Meeks, E. (2024). *D3.js in Action* (3rd ed.). Ch. 2–3.
- Jarmul, K. (2023). *Practical Data Privacy.* Ch. 1.
