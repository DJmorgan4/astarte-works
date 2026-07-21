---
type: playbook
name: swppp_full
updated: 2026-07
---

# Playbook: Full SWPPP (TPDES CGP TXR150000)

> Orchestrates a compliant, physics-grounded SWPPP from threshold check
> through inspection machinery.

## DOMAIN SEQUENCE
1. stormwater — threshold: disturbed acreage, common-plan status, operator
   roles; coverage tier (small vs. large), NOI/CSN, posting.
2. hydrology — drainage-area delineation, receiving water + segment,
   303(d)/TMDL check, buffer applicability.
3. soils — HSG, K-factor erodibility, texture, shrink-swell → BMP fit.
4. stormwater — control train per discharge point (erosion first,
   sediment second); concrete washout; dewatering.
5. floodplain — SFHA work adds development-permit layer
   [content pending — flag if site touches mapped floodplain].
6. wetlands — discharge to/near wetlands → 404/401 (do NOT treat a wetland
   as a stormwater feature).
7. stormwater — inspection cadence, corrective-action tracking,
   modification log, termination criteria.

## PER-DOMAIN CONTRIBUTION
- soils → why each BMP was chosen (defensible design rationale).
- hydrology → outfalls, receiving-water sensitivity, buffers.
- stormwater → permit compliance machinery and recordkeeping.

## ROLL-UP LOGIC (feeds CETO Score construction compliance category)
Coverage correctness + BMP-to-physics match + inspection/record
completeness. Paperwork gaps score as failures even on a clean site —
that mirrors real TCEQ/MS4 enforcement.

## OUTPUT TEMPLATE
Site description → maps (pre/post drainage, controls) → BMP schedule with
rationale → inspection & maintenance plan → pollution prevention →
certifications & posting → termination plan.
