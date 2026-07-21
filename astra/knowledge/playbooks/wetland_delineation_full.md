---
type: playbook
name: wetland_delineation_full
updated: 2026-07
---

# Playbook: Wetland Delineation (three-parameter)

> Orchestrates a routine delineation under the Corps 1987 Manual + regional
> supplement (Great Plains / Atlantic-Gulf as applicable to site).

## DOMAIN SEQUENCE
1. wetlands — scope, manual/supplement selection, sampling design.
2. soils — SSURGO hydric screen (desktop); predicted redoximorphic
   indicators by series → field hydric-soil parameter.
3. hydrology — water table, ponding/flooding frequency, wetland hydrology
   indicators; secondary indicators where primary absent.
4. wetlands — hydrophytic vegetation (dominance / prevalence index).
5. wetlands — three-parameter determination per data point; boundary.
6. regulatory — jurisdictional call (WOTUS status, drained/prior-converted
   questions) → 404/401 pathway if jurisdictional.
7. endangered_species / cultural_resources — co-located resource flags
   [content pending].

## PER-DOMAIN CONTRIBUTION
- soils → hydric parameter + desktop probability.
- hydrology → hydrology parameter + water-source reasoning.
- wetlands → vegetation, integration, boundary, and determination.
- regulatory → jurisdiction and permitting exposure.

## ROLL-UP LOGIC
All three parameters present at a point = wetland (absent atypical/problem
situations, which require documented reasoning). Boundary = transition where
any parameter fails. Jurisdiction is a separate legal determination from
presence.

## OUTPUT TEMPLATE
Methods → data points (veg/soil/hydro per point) → mapped boundary →
acreage → jurisdictional discussion → permitting implications.
