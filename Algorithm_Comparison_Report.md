# Route Suggestion Algorithm Comparison Report

**Branch A (older):** `improv-user` @ commit `e81af5d` — "Optimized BusSuggestion Algorithm with real-time bus timing"
**Branch B (current):** `route-D2` @ commit `886a0fa`
**Files compared:**
- `src/services/RoutePlanningService.ts` (748 lines → 773 lines)
- `src/services/StopToRouteIndex.ts` (579 lines → 579 lines, identical)

---

## TL;DR — What Actually Changed

Both versions use the same underlying engine:
- 3-tier direction validation (GTFS sequence → directional shape → merged shapes)
- Authoritative GTFS gtfsStopRoutes.json index
- 500m → 800m radius fallback
- Live ETA enrichment via stop predictions API
- Top 5 results, live-first ranking with 10-min transfer penalty

The differences are **surgical improvements**, not an architecture rewrite. The `StopToRouteIndex.ts` is **byte-for-byte identical** between both commits.

---

## Detailed Diff: RoutePlanningService.ts

### 1. `isLivePrediction` Logic — Most Significant Fix

**e81af5d (old):**
```typescript
// enrichWithLiveETAs — line 706
option.isLivePrediction = allSegmentsLive;
//                        ^^^^^^^^^^^^^^
// allSegmentsLive starts true, flips to false if ANY segment has no prediction
// → transfer routes almost ALWAYS get isLivePrediction = false
// because the second stop's prediction isn't available yet
// (the user hasn't even boarded the first bus)
```

**route-D2 (current):**
```typescript
// enrichWithLiveETAs — line 707
option.isLivePrediction = firstSegmentLive;
//                        ^^^^^^^^^^^^^^^^
// Only the FIRST segment needs a prediction to count as "live"
// → transfer routes correctly show as live when the first bus has ETA data
// Comment added: "for transfer routes, second segment's stop often has no
// predictions yet (user hasn't arrived there), but first bus info is actionable"
```

**Impact:** With `allSegmentsLive`, any 1-transfer route where the second leg has no predictions (very common — it's a future stop, not an active bus stop) gets marked as "estimated". With `firstSegmentLive`, the same route correctly shows as live as long as the first bus has real-time data. This means more route cards show live ETAs and get sorted higher in results.

---

### 2. `parsePredTime` — New Time Format Support

**e81af5d (old):**
```typescript
private parsePredTime(predTime: string, now: Date): Date | null {
    // Only handles 12-hour AM/PM format: "01:18 PM"
    const match = trimmed.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (!match) return null; // returns null for any other format
    // ...
}
```

**route-D2 (current):**
```typescript
private parsePredTime(predTime: string, now: Date): Date | null {
    // Handles old format: "01:18 PM"
    const ampmMatch = trimmed.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (ampmMatch) { /* ... */ return result; }

    // NEW: handles new format "09:08:36" or "01:18:00" (no AM/PM)
    const parts = trimmed.split(':');
    if (parts.length >= 2) {
        let hours = parseInt(parts[0], 10);
        const minutes = parseInt(parts[1], 10);
        const result = new Date(now);
        result.setHours(hours, minutes, 0, 0);
        // If time is > 6 hours in the past, assume PM
        if (result.getTime() < now.getTime() - 6 * 60 * 60_000 && hours < 12) {
            result.setHours(hours + 12, minutes, 0, 0);
        }
        return result;
    }
    return null;
}
```

**Impact:** The predictions API started returning times in `"09:08:36"` format (24-hour or 12-hour without AM/PM). The old `parsePredTime` returns `null` for every such prediction, so the entire ETA enrichment silently fails. In the old commit, **every route card showed "estimated"** despite predictions being available. In `route-D2`, both formats are handled correctly.

This is **the single most impactful bug fix** — ETA enrichment was completely broken for the new API response format.

---

### 3. `generateWalkableShortcuts` — New Method

**e81af5d (old):** Method does not exist.

**route-D2 (current):**
```typescript
// Line 503–561: new private method
private generateWalkableShortcuts(
    origin: Coordinates,
    destination: Coordinates,
    transferOptions: TripOption[],
    directRouteNums: Set<string>
): TripOption[] {

    for (const opt of transferOptions) {
        // If the first leg is trivially short (≤ 2 stops estimated),
        // check if the user can walk directly to the second bus's boarding stop
        if (opt.segments[0].estimatedTime > 5) continue; // first leg > 5 min → skip

        const seg2 = opt.segments[1];
        if (!seg2) continue;

        // Skip if already have a direct route for this route number
        if (directRouteNums.has(seg2.routeNum)) continue;

        const walkToBoard = this.calculateDistance(
            { lat: origin.lat, lng: origin.lng },
            { lat: seg2.fromStopLat, lng: seg2.fromStopLng }
        );
        if (walkToBoard > this.WALKING_DISTANCE_EXPANDED) continue; // too far (> 800m)

        // Build a new direct-style option skipping the first bus entirely
        shortcuts.push({
            segments: [{ ...seg2 }],
            totalTime: seg2.estimatedTime + Math.round(walkToBoard / 1000 / WALKING_SPEED * 60),
            transfers: 0,
            walkToFirstStop: Math.round(walkToBoard),
            ...
        });
    }
}

// Called from calculateTripOptions:
const shortcuts = this.generateWalkableShortcuts(origin, destination, transferOptions, directRouteNums);
const allOptions = [...directOptions, ...shortcuts, ...transferOptions];
```

**Impact:** Surfaces a scenario like "instead of taking Route 8 for 1 stop then transferring to Route 10, just walk 400m to the Route 10 stop directly." This saves the user the wait + ride time of a trivially short first leg.

---

### 4. `findNearbyStops` — Top N Limit Raised

**e81af5d (old):**
```typescript
.slice(0, 15); // Top 15 closest
// Comment: "ensures both directional stops (NB+SB, EB+WB) are always included"
```

**route-D2 (current):**
```typescript
.slice(0, 15); // Top 15 closest — same value
```

Both are 15. Identical. *(Earlier main branch used 5 — that was the earlier comparison.)*

---

### 5. Direction Checking in `findDirectRoutes` — Identical Logic

Both commits call `checkStopDirection()` with the same 3-tier fallback:

```typescript
// Both versions — line ~187
const dirCheck = checkStopDirection(routeNum, oStop.STOP_ID, dStop.STOP_ID);
if (dirCheck && !dirCheck.valid) continue; // wrong direction — skip
// null → inconclusive, allow with haversine estimate
```

The direction validation is **identical** in both commits. `StopToRouteIndex.ts` is unchanged.

---

### 6. Transfer Route Direction Checks — Identical Logic

Both commits validate both legs independently:

```typescript
// Both versions — lines ~343, ~381
const leg1Check = checkStopDirection(oRouteNum, originCandidate.STOP_ID, xStopId);
const leg2Dir = checkStopDirection(dRouteNum, dStopId, dStop.STOP_ID);
```

Identical. No change.

---

## StopToRouteIndex.ts — Zero Differences

The 3-tier direction validation system is identical in both commits:

| Component | e81af5d | route-D2 | Same? |
|---|---|---|---|
| PROXIMITY_THRESHOLD_METERS | 65m | 65m | ✅ |
| Index data source | gtfsStopRoutes.json (GTFS) | gtfsStopRoutes.json (GTFS) | ✅ |
| Tier 1: GTFS stop-sequence | ✅ | ✅ | ✅ |
| Tier 2: GTFS directional shape (150m) | ✅ | ✅ | ✅ |
| Tier 3: Merged transitShapes projection | ✅ | ✅ | ✅ |
| Per-line pair projection | ✅ | ✅ | ✅ |
| `getOrderedStopsForRoute` | ✅ | ✅ | ✅ |

---

## Summary: Which Is Better?

**`route-D2` (current branch) is better — specifically for two concrete bugs:**

### Bug 1 — Transfer routes never showed live ETAs (e81af5d)
`allSegmentsLive` required predictions for ALL segments. The second segment of a transfer route (a stop the user will reach in 20 minutes) almost never has an active prediction. So every transfer route was downgraded to "estimated" even when the first bus had perfect real-time data. `firstSegmentLive` in `route-D2` fixes this.

### Bug 2 — All ETA enrichment silently failed when API changed format (e81af5d)
`parsePredTime` in `e81af5d` only matched `"HH:MM AM/PM"`. When the predictions API switched to returning `"09:08:36"`, every `parsePredTime` call returned `null`. Every `routePreds.length === 0` short-circuit triggered. Every option stayed at `isLivePrediction = false`. The fix in `route-D2` adds a second parser path for the new format with an intelligent PM-inference heuristic.

### Feature Addition — Walkable shortcuts (route-D2 only)
New method in `route-D2` surfaces options that skip a trivial first bus leg in favour of walking directly to the second leg's boarding stop. Reduces total trip time in cases where the first leg is only 1–2 stops.

### Direction correctness — Identical code, but shared bugs exist
Both commits implement the same 3-tier GTFS direction validation. The direction code is **byte-for-byte identical** — neither version fixes or introduces a direction bug relative to the other. However, there are **existing direction bugs** present in both versions:

| Issue | e81af5d | route-D2 | Winner |
|---|---|---|---|
| Direction validation (3-tier) | ✅ Full (with bugs below) | ✅ Full (same bugs) | Tie |
| Transfer route live ETA display | ❌ Broken (`allSegmentsLive`) | ✅ Fixed (`firstSegmentLive`) | **route-D2** |
| New API time format support | ❌ Returns null, silent fail | ✅ Handles both formats | **route-D2** |
| Walkable shortcut generation | ❌ Not present | ✅ New method | **route-D2** |
| StopToRouteIndex | Identical | Identical | Tie |

---

## Addendum: Direction Validation Bug Investigation

A data-driven investigation of the 3-tier direction validation system revealed **three concrete bugs** affecting direction correctness in **both** `e81af5d` and `route-D2` (the code is identical).

### Direction Bug 1 — Loop Routes Reject 50% of Valid Trips

**Affected routes:** 15, 16, 17 (all confirmed loops — first stop = last stop)

Routes 15, 16, and 17 are circular routes with only `direction_id = 0` in GTFS data. All their stops share the same direction, so the `getGtfsDirectionsForStop` pre-filter never rejects anything.

The problem is in Tier 1 (GTFS stop-sequence check):

```
Route 15 sequence: [1189, 1190, 1191, ..., 1225, ..., 1189]
                     ↑ start                  ↑ later    ↑ loops back

User wants: stop 1225 → stop 1190
Tier 1:     indexOf(1225) = 30, indexOf(1190) = 1
            30 > 1 → INVALID
Reality:    1225 → ... → 1189 → 1190 is a perfectly valid forward trip around the loop
```

**Measured impact:**

| Route | Total Valid Pairs | Wrongly Rejected | Rejection Rate |
|---|---|---|---|
| Route 15 | 1,722 | 861 | **50.0%** |
| Route 16 | 992 | 496 | **50.0%** |
| Route 17 | 1,722 | 861 | **50.0%** |

On loop routes, exactly half of all origin→destination combinations are wrongly marked as "invalid direction" because the stop-sequence check doesn't understand that after the last stop, the bus loops back to the first.

**Root cause:** `checkStopDirection` Tier 1 compares `seq.indexOf(stopA) < seq.indexOf(stopB)`. On a loop, this comparison is only valid for the "shorter path" direction. When the shorter path goes backward in the sequence (but forward around the loop), it's incorrectly rejected.

**Fix needed:** For loop routes (where `seq[0] === seq[seq.length-1]`), Tier 1 should recognize that both orderings are valid — the bus always goes forward around the loop.

---

### Direction Bug 2 — Null = "Allow" Semantic Gap

When `checkStopDirection` returns `null` (all 3 tiers inconclusive), the calling code in `findDirectRoutes` treats it as **allowed**:

```typescript
const dirCheck = checkStopDirection(routeNum, oStop.STOP_ID, dStop.STOP_ID);
if (dirCheck && !dirCheck.valid) continue; // wrong direction — skip
// null → falls through → route is ACCEPTED
```

**After the `getGtfsDirectionsForStop` pre-filter**, Tier 1 resolves 99.1% of stop pairs. The remaining **0.9% (1,176 pairs)** fall through to Tier 2/3. These are concentrated in:

| Route | Null Pairs | Null Rate | Reason |
|---|---|---|---|
| Route 1 | 616 | 5.6% | Large route, variant coverage gaps |
| Route 5 | 162 | 5.7% | Variant coverage gaps |
| Route 10 | 398 | 4.2% | Variant coverage gaps |

If Tier 2 (GTFS directional shape projection, 150m tolerance) and Tier 3 (merged shapes, 65m tolerance) also can't resolve, the route is **silently allowed** even if the bus would actually go in the wrong direction. This produces wrong-way suggestions for Routes 1, 5, and 10.

---

### Direction Bug 3 — Valid-Bias in Multi-Direction Resolution

When both stops appear in multiple directions' stop sequences with **conflicting** results (valid in one direction, invalid in another), the code **always prefers "valid"**:

```typescript
// Tier 1 resolution
if (!bestSeqResult || (candidate.valid && !bestSeqResult.valid)) {
    bestSeqResult = candidate;  // valid always wins
}
```

**Measured:** 51 stop pairs across all routes have conflicting direction results. The code always picks "valid" for these, which means ~half of them are wrong-direction acceptances.

This is numerically small (51 out of 125,641 total pairs = 0.04%), but it means for these specific stop combinations, a wrong-direction bus will always be suggested.

---

### Combined Direction Error Rate Estimate

| Bug | Affected Pairs | % of All Pairs | Severity |
|---|---|---|---|
| Loop route rejection | 2,218 | 1.8% | **High** — valid trips completely hidden from user |
| Null = allow | 1,176 | 0.9% | **Medium** — wrong-direction suggestions shown |
| Valid-bias | 51 | 0.04% | **Low** — rare edge case |
| **Total** | **3,445** | **2.7%** | — |

The 2.7% figure is across all routes. For specific routes, the error rate is much higher:
- **Routes 15, 16, 17: 50%** of valid trips rejected (loop bug)
- **Routes 1, 5, 10: ~5%** of pairs may get wrong-direction suggestions (null gap)

**Note:** These bugs exist identically in both `e81af5d` and `route-D2`. Neither commit introduced or fixed any direction logic.
