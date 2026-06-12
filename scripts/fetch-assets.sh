#!/usr/bin/env bash
# Downloads Alonsera brand assets from the live site's CDN into assets/img/.
# Squarespace's CDN serves WebP regardless of the original extension, so files
# are saved as .webp. Run once from the repo root: bash scripts/fetch-assets.sh
set -euo pipefail

BASE="https://images.squarespace-cdn.com/content/v1/65578b907b01fb7ededf289b"
OUT="assets/img"
mkdir -p "$OUT"

fetch() { # fetch <url> <outfile>
  curl -sSL --fail --max-time 60 "$1" -o "$OUT/$2"
  local kind
  kind=$(file -b "$OUT/$2")
  case "$kind" in
    *PNG*|*JPEG*|*"Web/P"*) printf '%-46s %8s\n' "$2" "$(du -h "$OUT/$2" | cut -f1)" ;;
    *) echo "ERROR: $2 is not an image ($kind)"; exit 1 ;;
  esac
}

fetch "$BASE/7fff5ff1-2a51-43ec-9441-5ad76493fee8/AS--primary-logo-3x.png" "logo-alonsera.webp"
fetch "$BASE/6117a12d-35e3-4c90-aca3-1de3aebaa1e3/AS--home--top-bg.png?format=1000w" "hero-wave-lines.webp"
fetch "$BASE/b8220344-554d-4e91-9ea0-e7d00dad2802/water-pattern-by-the-sea-wave-2023-11-27-05-20-43-utc+%281%29.jpg?format=1500w" "ocean-aerial.webp"
fetch "$BASE/059df3c7-7bf3-40e1-b41c-53e73e8c15a4/world-map-lighter.png?format=1500w" "world-map.webp"

fetch "$BASE/ea4950a5-bb2a-4af3-bce7-9d8b5ae0da66/Financial+Services.png?format=750w" "industry-financial-services.webp"
fetch "$BASE/c5b8f8d0-e5e2-4fa3-a868-16d715ff5e31/Communications%2C+Media+%26+Tech.png?format=750w" "industry-communications-media-tech.webp"
fetch "$BASE/4fbef47d-5d36-435c-8336-b4f3ef049ddb/Retail+%26+CPG.png?format=750w" "industry-retail-cpg.webp"
fetch "$BASE/2e222219-430a-4eef-8d6e-c99364570049/Life+Science+%26+Healthcare.png?format=750w" "industry-life-science-healthcare.webp"
fetch "$BASE/a552ef10-8d5a-404e-962a-f14cd1aaa008/Non-Profit%2C+Gov+%26+Education.png?format=750w" "industry-nonprofit-gov-education.webp"
fetch "$BASE/d122188e-b75e-42f3-8a0f-b25c976c44ec/Travel%2C+Hospitality+%26+Real+Estate.png?format=750w" "industry-travel-hospitality-realestate.webp"
fetch "$BASE/1237aa9e-e2aa-4415-8b07-9a7b2f0505e2/Manufacturing%2C+Auto+%26+Energy.png?format=750w" "industry-manufacturing-auto-energy.webp"

fetch "$BASE/a35c6a5c-1c34-4c6b-8db9-e7b221bac241/Strategic+Partners+.png?format=1500w" "partners-strategic.webp"
fetch "$BASE/c9a58e74-7be2-45d1-b6bf-760355638937/Alliance+Partners.png?format=1500w" "partners-alliance.webp"
fetch "$BASE/4a420715-6248-4fe4-9a4c-20b942c78ecb/Technology+Partners.png?format=1500w" "partners-technology.webp"

fetch "$BASE/a2106e55-a529-4bfe-9804-d24d335dbbb0/CD+Main.png?format=750w" "team-christine-duque.webp"
fetch "$BASE/1e3b46c6-e2c4-4447-8b39-6cad9f8ede58/Niko%27s+Headshot.png?format=750w" "team-nikos-acuna.webp"

echo "All assets downloaded."
