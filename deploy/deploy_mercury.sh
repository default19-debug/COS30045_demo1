#!/usr/bin/env bash
# Publish the website to Swinburne's Mercury web server.
#
#   bash deploy/deploy_mercury.sh                 # student 106214726, folder "assignment1"
#   bash deploy/deploy_mercury.sh 1234567 lab05   # another student id / folder
#
# What it does, in one SSH session (so your SIMS password is asked for once):
#   1. checks ~/cos30045/www/htdocs exists (it only does once the account is activated)
#   2. creates ~/cos30045/www/htdocs/<folder>   - nothing outside that folder is touched,
#      so the .htaccess in htdocs is never overwritten
#   3. unpacks the four pages, assets/ and data/out/ into it
#   4. makes everything readable by Apache (dirs 755, files 644)
#
# Before running:
#   - Activate the account once:  ssh s<id>@mercury.swin.edu.au   (then type: exit)
#   - Off campus, connect the Swinburne VPN first. On campus Wi-Fi no VPN is needed.
# Works from macOS Terminal and from Git Bash on Windows.

set -euo pipefail

ID="${1:-106214726}"
ID="${ID#s}"                       # accept "s1234567" or "1234567"
FOLDER="${2:-assignment1}"
HOST="mercury.swin.edu.au"
REMOTE="s${ID}@${HOST}"
HTDOCS="cos30045/www/htdocs"
URL="http://${HOST}/cos30045/s${ID}/${FOLDER}/index.html"

# Apache folder-name guideline from the unit notes: lowercase letters, digits, - and _ only.
case "$FOLDER" in
  ""|*[!a-z0-9_-]*) echo "Folder name must use only lowercase letters, digits, - or _"; exit 1 ;;
esac

cd "$(dirname "$0")/.."

# Exactly what the site needs at runtime. No docs, no KNIME files, no raw data.
PUBLISH=(index.html explore.html data.html about.html assets data/out)
for f in "${PUBLISH[@]}"; do
  [ -e "$f" ] || { echo "Missing $f - run this from inside the repository."; exit 1; }
done

# Stop macOS tar adding ._AppleDouble files, which would show up as junk on the Linux server.
export COPYFILE_DISABLE=1

echo "Publishing to ${REMOTE}:~/${HTDOCS}/${FOLDER}"
echo "You will be asked for your SIMS password."
echo

tar --exclude='.DS_Store' -czf - "${PUBLISH[@]}" | ssh "$REMOTE" "
  set -e
  if [ ! -d ~/${HTDOCS} ]; then
    echo 'ERROR: ~/${HTDOCS} not found. Log in once with ssh to activate your Mercury account.'
    exit 1
  fi
  mkdir -p ~/${HTDOCS}/${FOLDER}
  tar -xzf - -C ~/${HTDOCS}/${FOLDER}
  chmod -R u=rwX,go=rX ~/${HTDOCS}/${FOLDER}
  echo 'Uploaded:'
  ls -1 ~/${HTDOCS}/${FOLDER}
"

echo
echo "Done. Open:  ${URL}"
echo "The browser will ask for a login - use your SIMS username and password."
