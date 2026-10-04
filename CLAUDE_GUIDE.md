# CLAUDE_GUIDE — clone, run, present and deploy on a Mac

**For:** Claude Code (and the author) on a **MacBook Pro 13-inch, M1, 2020**, the evening before
and the morning of a presentation at Swinburne.
**Repository:** <https://github.com/default19-debug/COS30045_demo1> (public — cloning needs no login)
**Goal:** a clean, verified local copy that serves the website, with Mercury hosting as a backup.

Work through the steps in order. Each one ends with a check; do not move on until it passes. If a
step fails, stop and report what you saw rather than improvising a fix.

---

## 0. Ground rules for Claude

1. **Read-only by default.** Cloning, reading, verifying and serving are fine. Do not edit any file
   unless the author asks for that specific change.
2. **Never touch `data/out/`.** It is the data the website loads. Do not run
   `knime/pipeline_reference.py` (it rewrites that folder) unless asked.
3. **Never run `deploy/deploy_mercury.sh` without an explicit go-ahead** in the conversation. It
   publishes to a server. The author types their own SIMS password at the prompt: never ask for
   it, never echo it, never write it to a file.
4. **No force-push, no history rewrites, no commits or pushes** unless the author asks. This Mac may
   not be logged in to GitHub, and that is fine — pulling a public repo needs no login.
5. **Do not install anything globally** (Homebrew packages, pip packages) without asking. Nothing in
   steps 1–6 needs an install beyond Apple's Command Line Tools.

---

## 1. Check the tools (do this the night before)

```bash
xcode-select -p && git --version && python3 --version
```

**Pass:** three lines of output — a path such as `/Library/Developer/CommandLineTools`, a git
version, and `Python 3.x`.

**If a dialog appears saying the command requires the command line developer tools:** that is
Apple's installer. Click *Install*. It needs internet and takes roughly 5–15 minutes. This is the
one thing that can eat time on the morning, which is why this step is for the night before. If the
dialog does not appear, run `xcode-select --install`.

---

## 2. Choose where to put it

Do **not** clone into `~/Desktop` or `~/Documents` if *Desktop & Documents Folders* is switched on
in iCloud (System Settings → your name → iCloud → iCloud Drive). iCloud can offload files to save
space, and an offloaded CSV means a blank chart mid-presentation. Use a folder iCloud does not sync:

```bash
mkdir -p ~/Developer && cd ~/Developer
```

---

## 3. Clone, or update an existing copy

**First time:**

```bash
cd ~/Developer
git clone https://github.com/default19-debug/COS30045_demo1.git
cd COS30045_demo1
```

**If `~/Developer/COS30045_demo1` already exists:**

```bash
cd ~/Developer/COS30045_demo1
git status --short
```

- No output (clean): run `git pull --ff-only`.
- Any output (local changes): **stop and ask the author.** Do not stash, reset or discard their
  changes.
- `--ff-only` refuses rather than merges if histories have diverged; if it refuses, stop and ask.

**Check:**

```bash
git log --oneline -3
ls data/out/*.csv | wc -l            # expect 7
ls assets/js/vendor/d3.v7.min.js     # must exist: the site is offline-capable because of it
```

---

## 4. Verify the data

```bash
python3 knime/verify_knime_outputs.py
```

**Pass:** the last line reads `RESULT: PASS - KNIME reproduces the site data`. Standard library
only; nothing to install. Three "expected diffs" lines are normal and explained in
`WALKTHROUGH.md` §5.

---

## 5. Serve the site

```bash
cd ~/Developer/COS30045_demo1
python3 -m http.server 8000 --bind 127.0.0.1
```

Open <http://localhost:8000> in Chrome or Safari. Leave the Terminal window open — closing it stops
the site. Stop it with **Ctrl+C**.

- `--bind 127.0.0.1` keeps it local, so macOS does not show an "accept incoming connections"
  firewall prompt.
- *Address already in use:* use another port, e.g. `8001`, and open `http://localhost:8001`.
- **Never open `index.html` by double-clicking.** On `file://` the browser blocks the data, and the
  page shows an instruction message instead of charts.

**Smoke test** — the author can click through in about a minute:

| Page | Should see |
|---|---|
| Story | Counters reach 4,599 · 74 · 830 · 8×; scatter, beeswarm, heat map and cost bars all drawn; dragging an Act four slider changes the bars |
| Explore | Table fills with models; size chips filter it; clicking a row prices that model |
| Data & method | KNIME node table (29 nodes) whose last row is Statistics #27 |
| About | Text only; theme toggle (top right) switches light and dark |

**Automated check for Claude**, if Google Chrome is installed:

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu \
  --virtual-time-budget=8000 --dump-dom http://127.0.0.1:8000/index.html 2>/dev/null \
  | grep -o "<circle" | wc -l
```

**Pass:** at least 5,400 (4,599 scatter dots, 830 beeswarm dots, plus annotation marks). A number
near 0 means the data did not load.

---

## 6. Presenting on the 13-inch M1

- The site was checked at **1440 × 900**, the MacBook's default scaled resolution, and at
  **1280 × 800**. Keep browser zoom at **100%** (Cmd+0). If a projector mirrors at a lower
  resolution and things feel cramped, Cmd+− once.
- Full screen: **Cmd+Ctrl+F** in Chrome or Safari.
- **Before you start, scroll through the whole Story page once** so every chart has drawn and
  animated in.
- **Dark theme can wash out on a projector** in a bright room. Try both with the ☀ toggle at the top
  right before you begin; the choice is remembered.
- Turn on **Do Not Disturb** (Control Centre → Focus). Plug in the charger.
- If the page looks stale after an update: Safari Cmd+Option+R, Chrome Cmd+Shift+R.
- Two things to say aloud (they were removed from the page on purpose — see `WALKTHROUGH.md` §8):
  at Act one, *"Read it vertically, not diagonally — every vertical slice is tall. Size sets the
  floor; it does not set the bill."*; at Act two, pointing at the shaded band, *"Eight in ten
  65-inch models land in here."*

A three-minute script and likely questions are in `WALKTHROUGH.md` §14.

---

## 7. Publish to Mercury (only when the author says so)

**Mercury** is Swinburne's Apache server. The target folder is
`~/cos30045/www/htdocs/assignment1`, and the public URL will be:

<http://mercury.swin.edu.au/cos30045/s106214726/assignment1/index.html>

**Network:** on campus Wi-Fi it works directly. Off campus, the author must connect the **Swinburne
VPN** first, or SSH times out. Viewers never need the VPN.

**7a. Activate the account (once):**

```bash
ssh s106214726@mercury.swin.edu.au
```

Type `yes` if asked about the host fingerprint, then the SIMS password (nothing shows while typing —
that is normal). Once logged in, type `exit`.

**7b. Upload:**

```bash
cd ~/Developer/COS30045_demo1
bash deploy/deploy_mercury.sh
```

It asks for the SIMS password once. It uploads only the four pages, `assets/` and `data/out/` — about
313 KB — into the `assignment1` folder. It never touches anything else in `htdocs`, including the
`.htaccess` file. It ends by printing the URL. Re-running it simply updates the files.

**7c. Check:** open the URL. The browser asks for a login — use the **SIMS** username and password.

| Symptom | Cause |
|---|---|
| `Connection timed out` | Off campus without VPN |
| `Permission denied` | Wrong password, or `s` + student ID mistyped |
| `~/cos30045/www/htdocs not found` | Account not activated — do 7a |
| Browser shows 403 Forbidden | Permissions; re-run the script (it sets them) and check `.htaccess` in `htdocs` was not deleted |
| Pages load but no charts | Open DevTools (Cmd+Option+I) → Console, and report the first red error |

---

## 8. KNIME on the Mac (optional)

Only needed if the author wants to show or run the workflow live.

1. Install KNIME Analytics Platform for **macOS (Apple Silicon)** from knime.com.
2. *File → Import KNIME Workflow* → `knime/TV_Energy_TriTran.knwf`.
3. The export contains settings but no data, and its paths point at the Windows machine it was built
   on:
   - **CSV Reader #1** → re-point to `~/Developer/COS30045_demo1/data/raw/tv_2026_10_04.csv`.
   - **CSV Writers #19, #21, #24, #26** → re-point into `data/knime_out/` (`tv_clean.csv`,
     `band_summary.csv`, `shelf_65.csv`, `brand_efficiency.csv`). **Never into `data/out/`** — that
     overwrites the site's data and breaks Act four.
4. *Execute all*. Expected row counts: 5,030 → 4,850 → 4,839 → 4,599; branches 8, 830 and 74.
5. Then run `python3 knime/verify_knime_outputs.py` again.

---

## 9. If something fails during the presentation

| Problem | Fallback |
|---|---|
| Mercury unreachable | Serve locally (step 5) — no internet needed |
| Local server problem | Use the Mercury URL |
| Both | Open the repo on GitHub and walk through `WALKTHROUGH.md`, or show the KNIME canvas |
