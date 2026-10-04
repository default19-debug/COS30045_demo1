# Instructions for Claude Code in this repository

This is a static D3 website for a university presentation, plus the KNIME workflow behind its data.
**Read `CLAUDE_GUIDE.md` before doing anything** — it has the clone, run, present and deploy steps.
`WALKTHROUGH.md` explains every part of the project.

Rules:

- Treat the repository as **read-only** unless the user asks for a specific change.
- Never edit, delete or regenerate anything in `data/out/` unless asked — it is what the site loads.
  Never point KNIME CSV Writers at `data/out/`; KNIME output belongs in `data/knime_out/`.
- Never run `deploy/deploy_mercury.sh` without the user's explicit go-ahead in this conversation. It
  publishes to a public server. The user types their own SIMS password at the prompt — never ask for
  it, never store it.
- Never force-push, rewrite history, or commit credentials.
- Serve the site with `python3 -m http.server 8000 --bind 127.0.0.1`.
  Check the data with `python3 knime/verify_knime_outputs.py` (expects `RESULT: PASS`).
