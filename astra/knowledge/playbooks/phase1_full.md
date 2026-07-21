---
type: playbook
name: phase1_full
updated: 2026-07
---

# Playbook: Full Phase I ESA (ASTM E1527-21)

> Orchestrates the due-diligence cluster into one defensible workflow.
> This is the reasoning spine behind a Ceto Phase I and its CETO Score.

## DOMAIN SEQUENCE
1. phase1_esa — frame scope, user responsibilities, AAI, liability posture.
2. regulatory — records review targets, search radii, agency databases.
3. soils → geology → hydrology — site physics; gradient, stratigraphy,
   depth to water, migration pathways (needed for EVERY REC evaluation).
4. petroleum_storage — tank inventory + LPST case interpretation.
5. vapor_intrusion — pathway screen for any volatile source near/under
   occupied or planned structures.
6. hazmat_building — pre-1981 structures: asbestos/LBP discussion
   [content pending — flag as non-scope until domain filled].
7. Non-scope flags — floodplain, wetlands, endangered_species,
   cultural_resources → user awareness + upsell [most pending].
8. phase1_esa — conclusions, REC/CREC/HREC list, data-gap significance.

## PER-DOMAIN CONTRIBUTION
- petroleum_storage / vapor_intrusion → the specific conditions.
- soils/geology/hydrology → whether a condition can migrate to/from site.
- regulatory → whether records support "likely release."
- phase1_esa → classification and the AAI declaration.

## ROLL-UP LOGIC (feeds CETO Score)
For each identified condition: source → release evidence → media → migration
→ regulatory status → classification. Score weighting inputs:
- REC count and severity (open case > CREC > HREC > de minimis).
- Data-gap significance (significant gaps raise uncertainty weight).
- Pathway completeness (vapor pathway to occupied space escalates).
Every weight must be explainable from the contributing domain's core.md +
redflags.md — no black-box scoring.

## OUTPUT TEMPLATE
Findings → Opinions → RECs/CRECs (listed) → HRECs → De minimis → Data gaps
+ significance → Conclusions with AAI declaration → EP qualifications.
