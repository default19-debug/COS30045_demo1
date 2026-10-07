# The Price of a Bigger Picture

**Television energy use in Australia — a data story**

COS30045 Data Visualisation · Swinburne University of Technology · Tri Tran

A data story built on the Australian Government's public register of television energy
performance. It argues that the star rating on an Energy Rating Label cannot be compared across
screen sizes, and that the kilowatt-hour figure printed beneath it is the number shoppers should
actually be reading.

> **New here? Read [`WALKTHROUGH.md`](WALKTHROUGH.md)** — one document covering the data, every
> KNIME node, verification, the story and storyboard, every chart and the reasoning behind it, the
> build log, and how to present it.

---

## Run it

The charts load CSV files with `d3.csv()`, which browsers block on `file://`, so serve the folder:

```bash
git clone https://github.com/default19-debug/COS30045_demo1.git
cd COS30045_demo1
python3 -m http.server 8000 --bind 127.0.0.1     # Windows: python -m http.server 8000
```

Open <http://localhost:8000>. Nothing to install and no internet needed — D3 v7.9.0 is bundled.

**Hosted on Mercury:** <http://mercury.swin.edu.au/cos30045/s106214726/assignment1/index.html>
(Swinburne login required). Publish or update it with `bash deploy/deploy_mercury.sh`.

Presenting from a Mac, or asking Claude Code to set it up: see [`CLAUDE_GUIDE.md`](CLAUDE_GUIDE.md).

---

## Pages

| Page | What it does |
|---|---|
| `index.html` — Story | The four-act argument, four D3 charts: scatter, beeswarm, heat map, range bars with sliders |
| `explore.html` — Explore | All 4,599 models: filters, brand efficiency chart, sortable table, per-model running cost |
| `data.html` — Data & method | Provenance, privacy, the data quality log, the KNIME node chain, limitations |
| `about.html` — About | Audience, design rationale, references |

---

## Data

Energy Rating data for household appliances — Labelled products, `tv_2026_10_04.csv`, published by
the Department of Climate Change, Energy, the Environment and Water on
[data.gov.au](https://data.gov.au/data/dataset/energy-rating-for-household-appliances) under CC BY
4.0, retrieved 4 October 2026. 5,030 rows × 32 columns raw; 4,599 models × 17 columns after
cleaning.

Every television sold legally in Australia must be registered under the GEMS scheme, so this is an
administrative **census of the legal market**, not a sample. It contains no personal information.

---

## Pipeline

```
data/raw/tv_2026_10_04.csv
   │
   ├── KNIME  knime/TV_Energy_TriTran.knwf  (29 nodes)       ──►  data/knime_out/   KNIME's own output
   │
   └── Python knime/pipeline_reference.py  (mirror + shaping) ──►  data/out/         what the site loads
                                                                        ▲
                    knime/verify_knime_outputs.py  checks the two agree ┘   →  PASS
```

KNIME does the cleaning and aggregation; the Python mirror repeats it and adds the final shaping the
charts need. `verify_knime_outputs.py` (standard library only) matches every row and value — all
4,599 models agree, with three explained differences documented in the walkthrough.

```bash
python3 knime/verify_knime_outputs.py                              # check KNIME against the site data
python3 -m pip install pandas && python3 knime/pipeline_reference.py   # regenerate data/out/
```

---

## Findings

- Screen area explains most of the variation in annual energy use (**r = 0.88**).
- At a fixed size the spread stays large: among **830** 65-inch models the middle 80% use
  **360–652 kWh/year — $126 to $228 a year** at 35 c/kWh.
- The star rating is **size-relative**: five stars means a median 124 kWh/year on a 32-inch and
  988 on an 86-inch — the same badge for **8× the electricity**.
- Running-cost ranges of neighbouring size bands overlap heavily, so a well-chosen large television
  can cost less to run than a poorly chosen smaller one.

---

## Documents

| File | Contents |
|---|---|
| [`WALKTHROUGH.md`](WALKTHROUGH.md) | Everything, in one place, in sixteen sections |
| [`STORYBOARD.md`](STORYBOARD.md) | Audience, Big Idea, panel-by-panel storyboard, cut list |
| [`ISSUES_LOG.md`](ISSUES_LOG.md) | Ten source-data defects and sixteen build issues, with evidence and fixes |
| [`CLAUDE_GUIDE.md`](CLAUDE_GUIDE.md) | Clone, run, present and deploy — written for Claude Code on a Mac |

---

## Generative AI declaration

Generative AI (**Claude**, by Anthropic) was used for data profiling, designing the KNIME node
sequence and drafting the first workflow file (debugged and rebuilt by hand by the author), the
Python reference and verification scripts, the D3, CSS and HTML code, and drafting copy. It was
**not** used to generate, estimate or impute any data, or to choose the story, audience or argument.
Every figure was checked against the source data. Each page footer carries a short AI-use
note; the full declaration is submitted separately, and a copy is in `WALKTHROUGH.md` §16.
