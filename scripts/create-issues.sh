#!/bin/sh
# Crée une issue GitHub par fichier de docs/issues/ (titre = 1re ligne, labels = ligne « Labels : »).
# Prérequis : gh authentifié (gh auth status). Supprimer ensuite les fichiers créés.
set -e
for f in docs/issues/*.md; do
  title=$(head -n 1 "$f" | sed 's/^# //')
  labels=$(sed -n 's/^\*\*Labels :\*\* //p' "$f")
  for l in $(echo "$labels" | tr ',' ' '); do gh label create "$l" --force >/dev/null; done
  tail -n +2 "$f" | grep -v '^\*\*Labels :\*\*' | gh issue create --title "$title" --label "$labels" --body-file -
done
