# Issues log

COS30045 Assignment 1 · *The Price of a Bigger Picture*
Source: `tv_2026_10_04.csv`, Energy Rating registration data, data.gov.au, retrieved 4 Oct 2026

A running record of every defect found — in the source data, in its official documentation, and in
the tooling — with the evidence that found it and the decision taken. Written to feed the Design
Book sections **2.2 Data processing and analysis** and **4.1 Testing and refinements**.

---

# Part A — Defects in the source data

Ten issues. Each had to be resolved before any chart could be trusted.

---

### A1 · Inconsistent brand naming
**Severity:** high — would corrupt every brand-level aggregate
**Dimension:** Consistency

The register is keyed by *registrant*, not by company, so one manufacturer appears under several
spellings.

| Evidence | |
|---|---|
| Raw distinct `Brand_Reg` values | **93** (88 after scoping to Australia) |
| `SAMSUNG ELECTRONICS` / `Samsung` / `SAMSUNG` | 698 + 264 + 243 = **1,205 rows, one company** |
| `Kogan` / `KOGAN` / `kogan` | 505 + 227 + 110 = **842 rows, one company** |

**Decision.** `upperCase(strip())` → 77 distinct, then three explicit alias merges
(`SAMSUNG ELECTRONICS`→`SAMSUNG`, `Q.BELL`→`QBELL`, `HUBBL GLASS`→`HUBBL`) → **74**.

**Deliberately not merged:** `SPARK ELECTRONICS`. It shares a word with Samsung's registrant name
but is an unrelated brand. Fuzzy brand matching introduces errors that are invisible downstream.

> This is the textbook "naming conventions" problem from W1.2 slide 10, occurring in the exact
> dataset the slide uses. Worth leading with if asked about data quality.

---

### A2 · Missing values written as `-`
**Severity:** high — forces whole columns to parse as text
**Dimension:** Completeness

`Pasv_stnd_power`, `Act_stnd_power` and `Act_stnd_time` use a literal hyphen for "not supplied".

| Evidence | |
|---|---|
| Rows affected | **854** |
| Effect | All three columns type as String instead of Double |

**Decision.** Recode `-` → empty, then String-to-Number with *fail on error* **off**, so they become
proper missing values.

**No imputation.** Standby power is not used in any headline figure. Filling 854 values into a
column nothing depends on would add fabricated data for zero analytical gain.

---

### A3 · A second null convention — `unknown`
**Severity:** low
**Dimension:** Consistency

`Tuner Type` uses the string `unknown` for the same purpose as `-` elsewhere.

| Evidence | |
|---|---|
| Rows | **116** |

**Decision.** Recoded to null so the conventions agree.

---

### A4 · A *third* null convention — `N/A`
**Severity:** medium — silently changes inferred column types
**Dimension:** Consistency

Found only when deriving the KNIME column spec: `Star` and `SRI` carry the literal string `N/A`.

| Evidence | |
|---|---|
| Cells affected | **9,435** |
| Effect | Both columns infer as String, not Double — in KNIME *and* in pandas-equivalent readers |

**Decision.** No action needed — both columns are dropped as deprecated (see A5). Recorded because
**three different null conventions in one file** (empty, `-`, `N/A`) is the clearest single
demonstration of why null rules must be checked per column rather than assumed.

> This one was missed on the first pass and only surfaced during type inference. Good illustration
> for Design Book §4.1 that data quality checking is iterative.

---

### A5 · `Star` and `SRI` are 94% null — but it is not missing data
**Severity:** medium — easy to mishandle
**Dimension:** Interpretability

| Evidence | |
|---|---|
| `Star` nulls | 4,716 / 5,030 (**93.8%**) |
| `SRI` nulls | 4,719 / 5,030 (**93.8%**) |
| `Star2` nulls | **0** |

The naive reading is "94% missing, impute or drop". The **official data dictionary** says:

> *"This is the star rating from the previous Minimum Energy Performance Standard level. This figure
> has been superseded by the field Star2."*

**Decision.** Drop both. These are **deprecated columns, not missing data** — the distinction
changes the correct treatment entirely. `Star2` is used throughout.

> Reading the data dictionary is what produced this. Worth saying so explicitly.

---

### A6 · Columns carrying no information
**Severity:** low
**Dimension:** Completeness

| Column | Problem |
|---|---|
| `GrandDate` | **100% null** (5,030/5,030) |
| `SubmitStatus` | Single value `Approved` for every row |
| `Product Class` | Single value; dictionary says *"Not Applicable"* |
| `What test standard was used` | Single value, plus 24.6% null |

**Decision.** Dropped. A zero-variance column cannot support a visual encoding.

---

### A7 · Repeat registrations
**Severity:** high — biases every median
**Dimension:** Accuracy

| Evidence | |
|---|---|
| Duplicate `Brand_Reg` + `Model_No` pairs, raw file | **242** |
| Rows actually removed in the workflow | **240** (after market scoping and brand normalisation) |
| Example | `QA65QN900B*`, `QA65QN900BS`, `QA65QN900BW` — one physical product |
| Unique `Submit_ID` vs rows | 2,874 vs 5,030 — one submission covers several models |

**Decision.** `Duplicate Row Filter` on `Brand` + `Model_No`, keep first. **5,030 → 4,599.**
Without this, popular models vote multiple times in every aggregate.

---

### A8 · Units not fit for the audience
**Severity:** low — but blocks comprehension
**Dimension:** Interpretability

`screensize` is a diagonal in **centimetres**; `Screen_Area` is in **cm²**. Australian retail sells
televisions in **inches**.

**Decision.** Derived `inches = round(screensize / 2.54)` and `screen_m2 = Screen_Area / 10000`.
Originals retained for audit.

> This is *attribute construction* (W1.2 slide 24), and binning `inches` into `size_band` changes
> the data type from **ratio → ordinal** — the exact thing Lab 4.1 asks you to identify.

---

### A9 · Mixed-market rows
**Severity:** medium — wrong scope
**Dimension:** Accuracy

`SoldIn` is a comma-separated list (`Australia,Fiji,New Zealand`).

| Scope | Rows |
|---|---|
| All | 5,030 |
| Contains Australia | **4,850** |
| NZ / Fiji only | 180 |

**Decision.** Filtered to rows containing `Australia`, matching the story's stated scope.

**Side finding:** all 170 registrations under the legacy `AS/NZS 62087.2.2:2011` standard are
NZ/Fiji only. Every Australian row is under GEMS 2013 — which killed a candidate story about
grandfathered products.

---

### A10 · Errors in the official data dictionary
**Severity:** medium — misleads anyone who trusts the documentation
**Dimension:** Interpretability

The published dictionary (May 2015) has two defects:

1. **Swapped identifiers.** `Act_stnd_power` is mapped to the identifier `act_stnd_time`, and
   `Act_stnd_time` to `act_stnd_power`.
2. **Phantom column.** It documents a `CEC` column ("Comparative Energy Consumption … kWh per year")
   that no longer exists under that name — it is now
   `Labelled energy consumption (kWh/year)`.

**Decision.** Column headers taken at face value, because the *value ranges* support them:
`Act_stnd_time` holds 0–14, consistent with hours; `Act_stnd_power` holds 225 distinct values,
consistent with watts.

**Also note:** the dictionary is dated **May 2015**; the data is from **October 2026**. An
11-year-old data dictionary is itself a *timeliness* finding.

---

## Analysis-level findings (not defects, but they changed decisions)

### Right-skewed distributions → median, never mean

| Statistic | kWh/year |
|---|---|
| Median | 400 |
| P90 | 824 |
| P99 | 1,445 |
| Max | **2,652** |

A handful of 8K flagships drag the mean well above anything a shopper would meet. **Every
aggregate on the site uses the median.**

### The headline figure is tail-driven — handled explicitly

At 65 inches (830 models):

| Measure | Range | Ratio | Cost gap |
|---|---|---|---|
| Full min–max | 185 – 1,135 kWh | **6.1×** | $332/yr |
| Middle 80% (P10–P90) | 360 – 652 kWh | **1.8×** | $102/yr |

The two extremes are a 2017-era commercial panel and an 8K flagship — products nobody
cross-shops. **Decision: lead with 1.8×, report 6.1× alongside, label both tails for what they
are.** Tufte: *graphics must not quote data out of context.*

---

# Part B — Tooling and build log

Useful for Design Book §4.1 *Testing and refinements*.

---

### B1 · KNIME Batch Executor not installed
**Impact:** the workflow cannot be execute-verified headlessly.

```
KNIME Batch Executor is not installed.
```

**Consequence.** All KNIME validation was **structural, not behavioural**, until the author ran
the workflow by hand in the KNIME GUI. Superseded by B13, which verifies the executed outputs.

---

### B2 · CSV Reader produced no output spec — root cause of a fully red workflow
**Severity:** critical
**Symptom:** CSV Reader red; every downstream node red.

The generated settings were missing `table_spec_config_Internals`, the block where KNIME caches the
column spec. Without it the Reader emits no output spec, so **every downstream node has no input
table to configure against**.

| | Keys |
|---|---|
| Generated (broken) | **64** |
| Real KNIME-authored reader | **403** |

**Diagnosis method — reusable.** Parse both settings files into flattened key-paths and diff the
sets:

```
/model/table_spec_config_Internals/version
/model/table_spec_config_Internals/individual_specs/<FILE>/<N>/name
/model/table_spec_config_Internals/table_transformation/columns/<N>/production_path/_converter
...
MISSING: 342
```

**Fix.** Generate the full spec from the source file: all 32 columns with inferred types and
production paths. Re-diffed to `MISSING: 0, EXTRA: 0`.

---

### B3 · Three further missing keys in the same block
Found by the same diff once B2 was partly fixed:

- `table_transformation/columns/num_columns`
- `table_transformation/columns/intersection_indices` (array)
- `table_transformation/skip_empty_columns`
- `file_selection/filter_mode/filter_options` (15 sub-keys)

---

### B4 · `Errors during load` — misnamed editor key
**Severity:** cosmetic, but presents as a scary error dialog

```
Unable to load editor UI information:
Double for key "workflow.editor.zoomLevel" not found
```

Written as `workflow.editor.currentZoomLevel`; KNIME requires `workflow.editor.zoomLevel`
(`xdouble`). Also missing `curvedConnections` and `connectionWidth`.

**Important:** everything else in that dialog was **informational, not errors** — every node
reported `State has changed from IDLE to CONFIGURED`, i.e. loaded *and* configured successfully.

---

### B5 · Partial delete destroyed the workflow — the worst bug of the build
**Severity:** critical — silent data loss
**Symptom:** workflow opened in KNIME showing **annotations but no nodes at all**.

Opening the workflow in place (rather than importing a copy) makes KNIME hold a `.knimeLock`.
The generator called `shutil.rmtree()` directly on the live folder before rebuilding:

```
PermissionError: [WinError 32] The process cannot access the file
because it is being used by another process: '...\.knimeLock'
```

The error looked harmless. It was not. **`rmtree` deletes as it walks** — by the time it reached
the lock file it had already removed 27 of 27 node directories. The rebuild then aborted, leaving
KNIME pointed at a gutted folder containing `workflow.knime` but no node settings at all.

**Diagnosis.** The UI gave no useful message; the canvas simply rendered the four annotations on an
empty sheet. The answer was in KNIME's own log at
`<workspace>/.metadata/knime/knime.log`:

```
ERROR : LoadWorkflowRunnable : Unable to load settings for node with ID suffix 4:
Unable to read settings file ...\Rule-based Row Filter (#4)\settings.xml
```

— repeated for every node. Confirmed by counting: `0 of 27` settings files on disk.

**Fix.** The generator now **always builds into a staging folder first** and only copies a
complete, finished build over the live one. The live folder is never deleted up front. When the
lock is present the live folder is left untouched entirely and only the `.knwf` is produced.

> **Lesson worth keeping:** a destructive operation that fails *half way* is far more dangerous
> than one that refuses outright. Build somewhere safe, then swap — never delete in place and hope
> the rebuild succeeds. Checking the application's own log file found in seconds what the GUI
> could not explain at all.

---

### B6 · Size-band labels containing `"`
**Severity:** low, but a real cross-tool hazard

Labels like `56-65"` have to survive a KNIME Rule Engine, a CSV file and a JavaScript string
comparison — each with different escaping rules.

**Fix.** Store as ASCII (`56-65in`); the web page substitutes a proper inch mark at display time.

---

### B7 · Heat map colour ramp washed out
**Severity:** medium — the chart failed to communicate
**Found by:** visual QA in headless Chrome

Cell values span 92 → 2,500 but most sit under 700, so a linear ramp painted roughly four-fifths of
the grid the same green.

**Fix.** Spread the ramp non-linearly over the crowded low end. The scale stays **continuous and
monotonic** — higher always reads redder — and the exact value is printed in every cell, so colour
never has to be measured.

**Declared on the About page**, because an undeclared non-linear colour scale is precisely the kind
of thing this unit teaches you to catch in someone else's work.

---

### B8 · Beeswarm overflowed its plot area
**Severity:** low
**Found by:** visual QA

The tallest column of dots exceeded the available height and spilled over the annotations above it.

**Fix.** Two-pass layout — count the deepest column first, then choose a row spacing that
guarantees the swarm fits.

---

### B9 · `append_column` is saved inverted — the root cause of every "Replace Column" fallback
**Severity:** high — behind four separate red nodes
**Found by:** reading the settings of the hand-fixed, exported workflow

The generator wrote `append_column="true"` to mean *append a new column*. KNIME's String
Manipulation and Math Formula nodes do the opposite: every node the author set to **Append** in the
dialog was saved with `append_column="false"` and the new name in `replaced_column`. The key's
name is not a description of its meaning.

That one inversion explains three symptoms that looked unrelated at the time:

| Node | Generator meant | KNIME did | Symptom |
|---|---|---|---|
| #9 String Manipulation | append `Brand` | replaced an existing column | Rule Engine #10: `Not a column: Brand` |
| #12–#16, #18 Math Formula | append `inches`, `screen_m2`, … | replaced `Brand` | #15: `No such column: screen_m2` |
| #5–#7 String Manipulation | clean in place | appended text copies `Pasv_stnd_power (#1)` … | 28 columns where 25 were expected |

**Fix applied.** Every affected dialog was reset by hand to *Append* with the right name.

**Residue, not yet fixed.** Because of #5–#7, String To Number #8 converted the *original* standby
columns, and Column Filter #28 later kept the *text copies*. The exported values are identical —
`verify_knime_outputs.py` confirms it — but in KNIME two standby columns are typed String and one is
still named `Act_stnd_power (#1)`. To fix: in #28 include `Pasv_stnd_power` and `Act_stnd_power`
instead of the `(#1)` copies, then add `Act_stnd_power → watts_active_standby` in Renamer #31.

**Lesson.** Validate a generated settings file against one KNIME itself saved, not against what a
key name suggests.

---

### B10 · Both GroupBy dialogs refused to open
**Severity:** medium

```
The dialog cannot be opened for the following reason:
Int for key "maxNoneNumericalVals" not found.
```

**Cause.** The generator left the GroupBy settings empty on purpose, but GroupBy needs about a dozen
keys before its dialog can even launch — so it could not be configured from the GUI at all.

**Fix.** Deleted both and dragged fresh GroupBy nodes from the node repository (#20 → #29,
#25 → #30), then configured them by hand.

---

### B11 · No final shaping step; branches reading raw column names
**Severity:** medium

After #18 the table had 28 columns under government names (`Labelled energy consumption
(kWh/year)`), and the three aggregation branches hung off that node. Sorter #23 was set to sort by
`kwh_year`, which did not exist on its branch.

**Fix.** Added Column Filter #28 (keep 17) and Column Renamer #31 (short names), then rewired all
three branches to start from the renamer. The Sorter warning cleared with no other change.

---

### B12 · The CSV Writers overwrote the website's input files — Act four went blank
**Severity:** high — a visible break on the presentation page
**Found by:** file timestamps in `data/out/`, then comparing headers

Writers #21, #24 and #26 pointed into `data/out/`, the folder the site loads from. Writer #19 wrote
`data/out/desktop.csv`.

| File | KNIME wrote | Effect on the site |
|---|---|---|
| `band_summary.csv` | `Count*(kwh_year)`, `Min*(kwh_year)` … and no spread or cost columns | **Act four drew nothing** — every value the chart reads was undefined |
| `shelf_65.csv` | 17 columns instead of 9 | still rendered (every needed column present) |
| `brand_efficiency.csv` | 74 unfiltered brands | none — no page loads this file |

**Fix.** Moved KNIME's four outputs, unedited, to `data/knime_out/`. Regenerated `data/out/` with
`pipeline_reference.py`; every file came out byte-identical to the known-good copies committed
earlier. Re-rendered all four pages in headless Chrome: four charts, no `NaN`.

**Still to do in KNIME before running it again:** point the four writers at `data/knime_out/`, and
rename #19's output from `desktop.csv` to `tv_clean.csv`.

---

### B13 · Verification — does KNIME reproduce the site data?
**Found by:** `knime/verify_knime_outputs.py`, which matches every row on its key and compares
every shared column

**Result: yes.** 4,599 models, 8 size bands, 22 brands (after the ≥ 25-model cut) and 830 65-inch
models all match value for value, with three explained differences:

| Difference | Rows | Cause |
|---|---|---|
| `cost_aud_year` $1 lower in KNIME | 43 (+1 in the shelf) | KNIME computes `kWh × 0.35`; 0.35 is not exact in binary, so 170 × 0.35 = 59.4999… rounds to 59. The script computes 170 × 35 / 100 = 59.5 exactly and rounds to 60. |
| `tuner` = `unknown` in KNIME, blank in the script | 106 | The script recodes `unknown` to missing (A3); the workflow has no node for it. |
| Model number `NA` in KNIME, blank in the script | 1 (JVC) | The raw file registers one JVC model with the model number `NA`. **pandas treats the text `NA` as missing by default; KNIME keeps it.** |

The third is a data quality finding in its own right: *the same file, read by two standard tools,
gives two different answers*, because "missing" is decided by the reader as well as the writer. It
belongs next to A2–A4.

None of the three reaches a chart: the site loads the script's files.

---

### B14 · Heat-map caption ran outside its chart card
**Severity:** low, but visible on a 13-inch screen
**Found by:** headless render at 1440 × 900

The caption under the grid was anchored `end` at `x = −10`, so the 450-pixel sentence ran back
through the left margin and past the card edge.

**Fix.** Anchored `start` at `x = 0`, the plot's left edge.

---

### B15 · D3 loaded from a CDN — a presentation risk
**Severity:** medium for a live demo

All four pages loaded `https://d3js.org/d3.v7.min.js`. On a slow or filtered network every chart
would have been blank.

**Fix.** D3 v7.9.0 bundled at `assets/js/vendor/d3.v7.min.js`. The site now has no external runtime
dependency, which also makes the About page's "renders identically offline" true.

---

### B16 · A figure in the story copy answered a different question
**Severity:** medium — a wrong number on the presentation page
**Found by:** re-checking every number in the prose against the CSVs before publishing

Act three's warning callout said upgrading from a *five-star* 55-inch to a *five-star* 75-inch moves
the median bill "from $125 to $202". Those are the medians of **all** models in the 51–55" and
66–75" bands. The five-star cells of the heat map say **$116 → $205** (331 → 586 kWh; 114 and 127
models).

**Fix.** Copy corrected on the Story page and in the storyboard. The point survives and gets
slightly stronger: an $89 jump rather than $77.

**Lesson.** A number can be correct and still be the wrong number — it has to answer the question
the sentence asks.

---

# Summary

| | Count |
|---|---|
| Source data defects | **10** |
| Official documentation defects | **2** (within A10) |
| Ways of writing *missing* in one file | **4** — empty, `-`, `unknown`, `N/A` (plus `NA`, B13) |
| Rows removed by cleaning | 5,030 → **4,599** |
| Columns removed | 32 → **17** |
| Brand strings collapsed | 93 → **74** |
| Build/tooling issues logged | **16** |
| Verified by execution | **All 29 KNIME nodes** executed by the author; outputs checked value by value against the reference (B13) |

## The three worth putting in the report

1. **Four ways of writing *missing* in one file** (A2–A4) — empty, `-`, `unknown`, `N/A` — and a
   fifth that only one tool notices: a model number that is literally `NA` (B13). Same file, two
   tools, two answers.
2. **`Star` is deprecated, not missing** (A5) — 94% null, but the dictionary explains why, and the
   correct treatment is the opposite of imputation.
3. **The headline number was deliberately weakened** (analysis findings) — 1.8× over 6.1×, because
   the bigger number compares two products nobody cross-shops.
