"""
Check that the KNIME workflow reproduces the files the website loads.

    data/knime_out/   what the KNIME CSV Writers produced, unedited
    data/out/         what the site loads, written by knime/pipeline_reference.py

Every row is matched on its key (brand + model, size band, or brand) and every shared
column is compared value by value. Three differences are known and explained in
WALKTHROUGH.md; they are reported as EXPECTED. Anything else is reported as UNEXPECTED
and the script exits with status 1.

Standard library only, so it runs on a fresh macOS or Windows Python 3:

    python3 knime/verify_knime_outputs.py
"""
import csv
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, os.pardir))
KNIME = os.path.join(ROOT, "data", "knime_out")
SITE = os.path.join(ROOT, "data", "out")

# KNIME's GroupBy names its outputs "Median(kwh_year)" and so on; the site uses short names.
AGG_NAMES = {
    "Count*(kwh_year)": "models",
    "Min*(kwh_year)": "kwh_min",
    "Median(kwh_year)": "kwh_median",
    "Max*(kwh_year)": "kwh_max",
    "Median(inches)": "median_inches",
    "Median(kwh_per_m2)": "kwh_per_m2_median",
    "Median(star_rating)": "star_median",
}
# Column Filter #28 kept the text copy that String Manipulation #6 appended (see WALKTHROUGH.md).
TV_NAMES = {"Act_stnd_power (#1)": "watts_active_standby"}


def read(folder, name, rename=None):
    with open(os.path.join(folder, name), newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    if rename:
        rows = [{rename.get(k, k): v for k, v in r.items()} for r in rows]
    return rows


def num(v):
    if v is None or v.strip() in ("", "nan", "NaN"):
        return None
    try:
        return float(v)
    except ValueError:
        return v


def classify(col, k, r):
    """Return None if equal, else 'EXPECTED' or 'UNEXPECTED'."""
    a, b = num(k), num(r)
    if a is None and b is None:
        return None
    if isinstance(a, float) and isinstance(b, float):
        if abs(a - b) <= 1e-6:
            return None
        if col == "cost_aud_year" and abs(a - b) <= 1:
            return "EXPECTED"   # KNIME rounds kWh * 0.35 (binary float); the script rounds kWh*35/100
        return "UNEXPECTED"
    if a == b:
        return None
    if col == "tuner" and (k or "").strip() == "unknown" and b is None:
        return "EXPECTED"       # the script recodes 'unknown' to missing; the workflow does not
    return "UNEXPECTED"


def model_key(r):
    # One JVC model is registered with the model number "NA". pandas reads that text as
    # missing by default, so the script writes it blank; KNIME keeps the text. Same model.
    return (r["Brand"], "" if r["model"] == "NA" else r["model"])


def compare(title, knime_rows, site_rows, key, check_order=False, keyfn=None):
    keyfn = keyfn or (lambda r: tuple(r[c] for c in key))
    renamed = sum(1 for r in knime_rows if keyfn(r) != tuple(r[c] for c in key))
    kk = {keyfn(r): r for r in knime_rows}
    ss = {keyfn(r): r for r in site_rows}
    only_k, only_s = set(kk) - set(ss), set(ss) - set(kk)
    shared_cols = [c for c in site_rows[0] if c in knime_rows[0] and c not in key]
    print(f"\n{title}")
    print(f"  rows: knime {len(knime_rows)}, site {len(site_rows)}, matched {len(set(kk) & set(ss))}"
          f", only in knime {len(only_k)}, only in site {len(only_s)}")
    if renamed:
        print(f"  key: {renamed} model registered as 'NA' matched to its blank twin    (expected)")
    unexpected = len(only_k) + len(only_s)
    for col in shared_cols:
        exp = unexp = 0
        example = None
        for key_val in set(kk) & set(ss):
            verdict = classify(col, kk[key_val][col], ss[key_val][col])
            if verdict == "EXPECTED":
                exp += 1
            elif verdict == "UNEXPECTED":
                unexp += 1
                example = example or (key_val, kk[key_val][col], ss[key_val][col])
        if exp or unexp:
            line = f"  {col:24s} expected diffs {exp:4d}   unexpected {unexp:4d}"
            if example:
                line += f"   e.g. {example[0]}: knime={example[1]!r} site={example[2]!r}"
            print(line)
        unexpected += unexp
    if check_order:
        same = [keyfn(r) for r in knime_rows] == [keyfn(r) for r in site_rows]
        print(f"  row order identical: {same}")
        unexpected += 0 if same else 1
    if unexpected == 0:
        print("  OK - every shared value matches, apart from the expected differences listed")
    return unexpected


def main():
    if not os.path.isdir(KNIME):
        sys.exit(f"missing {KNIME}")
    bad = 0

    bad += compare("tv_clean.csv  (CSV Writer #19)",
                   read(KNIME, "tv_clean.csv", TV_NAMES), read(SITE, "tv_clean.csv"), ["Brand", "model"],
                   keyfn=model_key)

    bad += compare("band_summary.csv  (GroupBy #29 -> CSV Writer #21; aggregate columns only)",
                   read(KNIME, "band_summary.csv", AGG_NAMES), read(SITE, "band_summary.csv"), ["size_band"])

    brands = [r for r in read(KNIME, "brand_efficiency.csv", AGG_NAMES) if float(r["models"]) >= 25]
    brands.sort(key=lambda r: float(r["kwh_per_m2_median"]))
    bad += compare("brand_efficiency.csv  (GroupBy #30 -> CSV Writer #26; filtered to >= 25 models, sorted)",
                   brands, read(SITE, "brand_efficiency.csv"), ["Brand"], check_order=True)

    bad += compare("shelf_65.csv  (Row Filter #22 -> Sorter #23 -> CSV Writer #24)",
                   read(KNIME, "shelf_65.csv"), read(SITE, "shelf_65.csv"), ["Brand", "model"],
                   keyfn=model_key)

    print("\nRESULT:", "PASS - KNIME reproduces the site data" if bad == 0 else f"FAIL - {bad} unexpected differences")
    sys.exit(0 if bad == 0 else 1)


if __name__ == "__main__":
    main()
