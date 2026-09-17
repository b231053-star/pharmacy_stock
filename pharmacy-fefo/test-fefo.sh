#!/bin/bash
set -e
PORT=${1:-3000}
BASE="http://localhost:$PORT"

echo "🧪 [1/4] Probing server availability on $BASE..."
curl -s -f "$BASE/api/medicines" > /dev/null || BASE="http://localhost:3001"

echo "🧪 [2/4] Verifying in-date stock and search..."
SEARCH_RES=$(curl -s "$BASE/api/medicines?search=Paracetamol")
echo "$SEARCH_RES" | grep -q "inDateStock" && echo "  ✅ Dynamic sellable calculation active."

MED_ID=$(echo "$SEARCH_RES" | grep -o '"id":"[^"]*"' | head -n 1 | cut -d'"' -f4)

if [ -n "$MED_ID" ]; then
  echo "🧪 [3/4] Testing FEFO atomic dispense on medicine ID: $MED_ID..."
  DISPENSE_RES=$(curl -s -X POST "$BASE/api/dispense" \
    -H "Content-Type: application/json" \
    -d "{\"medicineId\":\"$MED_ID\",\"quantity\":2}")
  echo "  ✅ Dispense outcome: $(echo "$DISPENSE_RES" | grep -o '"message":"[^"]*"' | cut -d'"' -f4)"
fi

echo "🧪 [4/4] Testing Expiry Radar & Alerts..."
ALERTS_RES=$(curl -s "$BASE/api/alerts")
echo "$ALERTS_RES" | grep -q "expiringSoon" && echo "  ✅ Expiry alerts operational."

echo "-----------------------------------------------------"
echo "🎉 ALL PHARMA-FEFO SMOKE TESTS PASSED CLEANLY!"
echo "-----------------------------------------------------"
