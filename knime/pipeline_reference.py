"""
COS30045 - Exercise 1.0 / Assignment 1
Reference implementation of the KNIME data-processing workflow.

This script mirrors the KNIME workflow (knime/TV_Energy_TriTran.knwf, walked
through node by node in WALKTHROUGH.md) and adds the final shaping the charts
need: tidy aggregate names, the spread and cost columns, the star x band pivot,
the 25-model brand cut and key_facts.csv. Its output in data/out/ is what the
website loads.

KNIME's own writer output lives in data/knime_out/. knime/verify_knime_outputs.py
checks the two agree: every row and value matches apart from three explained
differences ($1 rounding on 43 costs, 106 'unknown' tuner values, and one model
number registered as the text "NA", which pandas reads as missing).

Input : data/raw/tv_2026_10_04.csv   (data.gov.au, Energy Rating registration data)
Output: data/out/*.csv              (one file per chart in the story)

Run from the assignment_1 folder:  python knime/pipeline_reference.py
"""

import os
import pandas as pd
import numpy as np

RAW = "data/raw/tv_2026_10_04.csv"
OUT = "data/out"

# Price used for every dollar figure on the site. One constant, one place.
# AER / Mozo national average residential usage rate, 2026: 30-35 c/kWh.
# We take the top of that range so costs are not understated.
PRICE_C_PER_KWH = 35.0

# Energy Rating label test assumption, fixed by the GEMS determination:
# the kWh/year figure assumes 10 hours of use per day.
LABEL_HOURS_PER_DAY = 10.0

os.makedirs(OUT, exist_ok=True)
log = []


def step(node, note, df_):
    """Record the row/column count after each KNIME node, for the design book."""
    log.append((node, note, len(df_), df_.shape[1]))
    print(f"{node:<28} {len(df_):>6} rows x {df_.shape[1]:>2} cols   {note}")


# ---------------------------------------------------------------------------
# 1. CSV Reader
# ---------------------------------------------------------------------------
df = pd.read_csv(RAW, low_memory=False)
step("CSV Reader", "raw registration extract", df)

KWH = "Labelled energy consumption (kWh/year)"

# ---------------------------------------------------------------------------
# 2. Column Filter  - data reduction
#    Dropped because they carry no information for this story:
#      GrandDate                   100% null
#      SubmitStatus                single value "Approved"
#      Product Class               single value, dictionary says "Not Applicable"
#      What test standard was used single value, 25% null
#      Star, SRI                   94% null - superseded by Star2 per the
#                                  official data dictionary
#      Star Image Large/Small      URLs to label images
#      Product Website, Representative Brand URL   77% / 53% null
#      Family Name                 42% null, marketing grouping only
#      Submit_ID, Registration Number              administrative keys
# ---------------------------------------------------------------------------
keep = [
    "Brand_Reg", "Model_No", "SoldIn", "Country",
    "screensize", "Screen_Area", "Screen_Tech",
    "Pasv_stnd_power", "Act_stnd_power", "Act_stnd_time", "Avg_mode_power",
    "Star2", KWH,
    "Availability Status", "ExpDate", "Tuner Type", "Regulatory Standard",
]
df = df[keep]
step("Column Filter", "dropped 15 empty/constant/admin columns", df)

# ---------------------------------------------------------------------------
# 3. Row Filter  - scope to the Australian market
#    SoldIn is a comma-separated list, e.g. "Australia,Fiji,New Zealand".
#    KNIME: Row Filter, pattern matching, contains "Australia".
# ---------------------------------------------------------------------------
df = df[df["SoldIn"].str.contains("Australia", na=False)].copy()
step("Row Filter (SoldIn)", "sold in Australia", df)

# ---------------------------------------------------------------------------
# 4. Row Filter  - currently on the market
# ---------------------------------------------------------------------------
df = df[df["Availability Status"] == "Available"].copy()
step("Row Filter (Available)", "self-reported as available", df)

# ---------------------------------------------------------------------------
# 5. Rule Engine  - recode the null placeholder
#    The three standby columns use "-" to mean "not supplied", so they arrive
#    as strings. "-" is a null rule, not a value (W1.2: null rules).
# ---------------------------------------------------------------------------
standby = ["Pasv_stnd_power", "Act_stnd_power", "Act_stnd_time"]
n_dash = int((df[standby].astype(str) == "-").any(axis=1).sum())
for c in standby:
    df[c] = df[c].astype(str).str.strip().replace({"-": np.nan, "": np.nan})
step("Rule Engine", f'"-" -> missing in {len(standby)} standby cols ({n_dash} rows)', df)

# Tuner Type uses the string "unknown" for the same purpose.
df["Tuner Type"] = df["Tuner Type"].replace({"unknown": np.nan})

# ---------------------------------------------------------------------------
# 6. String To Number
# ---------------------------------------------------------------------------
for c in standby:
    df[c] = pd.to_numeric(df[c], errors="coerce")
step("String To Number", "standby columns -> double", df)

# ---------------------------------------------------------------------------
# 7. String Manipulation + Cell Replacer  - brand naming conventions
#    The register is supplier-keyed, so the same company appears under several
#    spellings: "SAMSUNG ELECTRONICS" / "Samsung" / "SAMSUNG",
#    "Kogan" / "KOGAN" / "kogan". Upper-case + trim collapses the case
#    variants; the dictionary below merges the remaining same-entity names.
# ---------------------------------------------------------------------------
before = df["Brand_Reg"].nunique()
df["Brand"] = df["Brand_Reg"].str.strip().str.upper()
BRAND_MAP = {
    "SAMSUNG ELECTRONICS": "SAMSUNG",
    "Q.BELL": "QBELL",
    "HUBBL GLASS": "HUBBL",
}
df["Brand"] = df["Brand"].replace(BRAND_MAP)
step("String Manip + Cell Replacer",
     f"brands {before} -> {df['Brand'].nunique()} distinct", df)

# ---------------------------------------------------------------------------
# 8. Duplicate Row Filter
#    242 Brand+Model pairs appear more than once: a supplier re-registers the
#    same model, or registers trailing variants (QA65QN900B* / BS / BW).
#    Keep the first occurrence so one physical model counts once.
# ---------------------------------------------------------------------------
n_before = len(df)
df = df.drop_duplicates(subset=["Brand", "Model_No"], keep="first").copy()
step("Duplicate Row Filter", f"removed {n_before - len(df)} repeat registrations", df)

# ---------------------------------------------------------------------------
# 9. Math Formula  - attribute construction
#    screensize is a diagonal in cm; Australian retail sells TVs in inches.
#    Screen_Area is cm^2; m^2 is the readable unit.
#    Watts per m^2 is the size-independent efficiency measure the story needs.
# ---------------------------------------------------------------------------
df["inches"] = (df["screensize"] / 2.54).round(0).astype(int)
df["screen_m2"] = (df["Screen_Area"] / 10000).round(3)
df["cost_aud_year"] = (df[KWH] * PRICE_C_PER_KWH / 100).round(0)
df["watts_per_m2"] = (df["Avg_mode_power"] / df["screen_m2"]).round(1)
df["kwh_per_m2"] = (df[KWH] / df["screen_m2"]).round(0)
step("Math Formula x5", "inches, m2, $/yr, W/m2, kWh/m2", df)

# ---------------------------------------------------------------------------
# 10. Rule Engine  - bin screen size into the bands retailers advertise
# ---------------------------------------------------------------------------
# Labels are deliberately plain ASCII with no quote character: they have to be
# typed into a KNIME Rule Engine, written to CSV and matched in JavaScript, and
# an embedded " needs escaping differently in all three. The web page renders
# them with a proper inch mark at display time instead.
BANDS = [0, 32, 43, 50, 55, 65, 75, 85, 300]
LABELS = ['32in & under', '33-43in', '44-50in', '51-55in',
          '56-65in', '66-75in', '76-85in', '86in+']
df["size_band"] = pd.cut(df["inches"], bins=BANDS, labels=LABELS, right=True)

# Star rating to whole stars, for the heat map axis.
df["stars"] = df["Star2"].round(0).astype(int)
step("Rule Engine (bands)", f"{len(LABELS)} size bands + whole-star column", df)

# ---------------------------------------------------------------------------
# 11. CSV Writer  - the cleaned model-level table
# ---------------------------------------------------------------------------
clean_cols = ["Brand", "Model_No", "Screen_Tech", "inches", "screen_m2",
              "Avg_mode_power", "Pasv_stnd_power", "Act_stnd_power",
              KWH, "cost_aud_year", "watts_per_m2", "kwh_per_m2",
              "Star2", "stars", "size_band", "Country", "Tuner Type"]
clean = df[clean_cols].rename(columns={KWH: "kwh_year", "Avg_mode_power": "watts_on",
                                       "Pasv_stnd_power": "watts_passive_standby",
                                       "Act_stnd_power": "watts_active_standby",
                                       "Model_No": "model", "Screen_Tech": "screen_tech",
                                       "Star2": "star_rating", "Tuner Type": "tuner"})
clean.to_csv(f"{OUT}/tv_clean.csv", index=False)
step("CSV Writer", "tv_clean.csv", clean)

# ---------------------------------------------------------------------------
# 12. GroupBy  - Act 1: does size explain the bill?
# ---------------------------------------------------------------------------
band = (df.groupby("size_band", observed=True)
          .agg(models=(KWH, "size"),
               kwh_min=(KWH, "min"),
               kwh_median=(KWH, "median"),
               kwh_max=(KWH, "max"),
               median_inches=("inches", "median"))
          .reset_index())
band["kwh_spread"] = band["kwh_max"] - band["kwh_min"]
band["spread_ratio"] = (band["kwh_max"] / band["kwh_min"]).round(1)
band["cost_min"] = (band["kwh_min"] * PRICE_C_PER_KWH / 100).round(0)
band["cost_median"] = (band["kwh_median"] * PRICE_C_PER_KWH / 100).round(0)
band["cost_max"] = (band["kwh_max"] * PRICE_C_PER_KWH / 100).round(0)
band.to_csv(f"{OUT}/band_summary.csv", index=False)
step("GroupBy (size_band)", "band_summary.csv", band)

# ---------------------------------------------------------------------------
# 13. Pivot  - Act 3: the star rating is size-relative
#     Rows = size band, Columns = whole stars, Value = median kWh/year.
# ---------------------------------------------------------------------------
pv = df.pivot_table(index="size_band", columns="stars", values=KWH,
                    aggfunc="median", observed=True)
cnt = df.pivot_table(index="size_band", columns="stars", values=KWH,
                     aggfunc="count", observed=True)
heat = (pv.stack().rename("kwh_median").reset_index()
          .merge(cnt.stack().rename("models").reset_index(),
                 on=["size_band", "stars"]))
heat["cost_aud_year"] = (heat["kwh_median"] * PRICE_C_PER_KWH / 100).round(0)
# Only show cells backed by enough models to be worth reading.
heat = heat[heat["models"] >= 3]
heat.to_csv(f"{OUT}/star_band_heat.csv", index=False)
step("Pivot (band x stars)", "star_band_heat.csv", heat)

# ---------------------------------------------------------------------------
# 14. Row Filter + Sorter  - Act 2: the 65-inch shelf
#     The single most-registered size in Australia. Same size, same shelf.
# ---------------------------------------------------------------------------
shelf = df[(df["inches"] >= 64) & (df["inches"] <= 66)].copy()
shelf = shelf.sort_values(KWH)
shelf_out = shelf[["Brand", "Model_No", "Screen_Tech", "inches", "Avg_mode_power",
                   KWH, "cost_aud_year", "Star2", "watts_per_m2"]].rename(
    columns={KWH: "kwh_year", "Avg_mode_power": "watts_on",
             "Model_No": "model", "Screen_Tech": "screen_tech", "Star2": "star_rating"})
shelf_out.to_csv(f"{OUT}/shelf_65.csv", index=False)
step("Row Filter (64-66in)", "shelf_65.csv", shelf_out)

# ---------------------------------------------------------------------------
# 15. GroupBy  - technology comparison, held at one size
# ---------------------------------------------------------------------------
tech = (shelf.groupby("Screen_Tech", observed=True)
             .agg(models=(KWH, "size"), kwh_min=(KWH, "min"),
                  kwh_median=(KWH, "median"), kwh_max=(KWH, "max"))
             .reset_index().rename(columns={"Screen_Tech": "screen_tech"}))
tech.to_csv(f"{OUT}/tech_at_65.csv", index=False)
step("GroupBy (Screen_Tech)", "tech_at_65.csv", tech)

# ---------------------------------------------------------------------------
# 16. GroupBy  - brand efficiency, big brands only
# ---------------------------------------------------------------------------
brand = (df.groupby("Brand", observed=True)
           .agg(models=(KWH, "size"),
                kwh_median=(KWH, "median"),
                median_inches=("inches", "median"),
                kwh_per_m2_median=("kwh_per_m2", "median"),
                star_median=("Star2", "median"))
           .reset_index())
brand = brand[brand["models"] >= 25].sort_values("kwh_per_m2_median")
brand.to_csv(f"{OUT}/brand_efficiency.csv", index=False)
step("GroupBy (Brand)", "brand_efficiency.csv", brand)

# ---------------------------------------------------------------------------
# 17. Key figures for the headline text, written as a tiny CSV so the numbers
#     on the page and the numbers in the data can never drift apart.
# ---------------------------------------------------------------------------
best, worst = shelf.iloc[0], shelf.iloc[-1]

# Percentiles matter for honesty. The full min-max range at one screen size is
# dramatic (6x) but it is driven by two tails: a 2017 commercial panel at the
# bottom and an 8K flagship at the top. The middle 80% is the spread a shopper
# actually faces, so both figures are published and the charts label which is
# which (Tufte: do not quote data out of context).
p10, p50, p90 = np.percentile(shelf[KWH], [10, 50, 90])
facts = {
    "source_file": os.path.basename(RAW),
    "price_c_per_kwh": PRICE_C_PER_KWH,
    "label_hours_per_day": LABEL_HOURS_PER_DAY,
    "models_total": len(clean),
    "brands": int(df["Brand"].nunique()),
    "shelf65_models": len(shelf),
    "shelf65_best_kwh": int(best[KWH]),
    "shelf65_best_label": f"{best['Brand']} {best['Model_No']}",
    "shelf65_best_stars": float(best["Star2"]),
    "shelf65_worst_kwh": int(worst[KWH]),
    "shelf65_worst_label": f"{worst['Brand']} {worst['Model_No']}",
    "shelf65_worst_stars": float(worst["Star2"]),
    "shelf65_ratio": round(worst[KWH] / best[KWH], 1),
    "shelf65_cost_gap_year": int(round((worst[KWH] - best[KWH]) * PRICE_C_PER_KWH / 100)),
    "shelf65_cost_gap_10yr": int(round((worst[KWH] - best[KWH]) * PRICE_C_PER_KWH / 100 * 10)),
    # Robust (middle 80%) version of the same comparison.
    "shelf65_p10_kwh": int(p10),
    "shelf65_p50_kwh": int(p50),
    "shelf65_p90_kwh": int(p90),
    "shelf65_p10_cost": int(round(p10 * PRICE_C_PER_KWH / 100)),
    "shelf65_p90_cost": int(round(p90 * PRICE_C_PER_KWH / 100)),
    "shelf65_typical_ratio": round(p90 / p10, 1),
    "shelf65_typical_gap_year": int(round((p90 - p10) * PRICE_C_PER_KWH / 100)),
    "shelf65_typical_gap_10yr": int(round((p90 - p10) * PRICE_C_PER_KWH / 100 * 10)),
    "five_star_small_kwh": int(df[(df["stars"] == 5) & (df["size_band"] == "32in & under")][KWH].median()),
    "five_star_large_kwh": int(df[(df["stars"] == 5) & (df["size_band"] == "86in+")][KWH].median()),
    "corr_area_kwh": round(df["Screen_Area"].corr(df[KWH]), 3),
    "corr_star_kwh": round(df["Star2"].corr(df[KWH]), 3),
}
facts["five_star_ratio"] = round(facts["five_star_large_kwh"] / facts["five_star_small_kwh"], 1)
pd.DataFrame([facts]).to_csv(f"{OUT}/key_facts.csv", index=False)

print("\n--- KEY FACTS ---")
for k, v in facts.items():
    print(f"  {k:<26} {v}")

print("\n--- NODE LOG (for the design book) ---")
for node, note, r, c in log:
    print(f"  {node:<28} {r:>6} x {c:<3} {note}")
