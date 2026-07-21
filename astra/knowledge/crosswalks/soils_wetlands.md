---
type: crosswalk
domains: [soils, wetlands]
updated: 2026-07
---

# Crosswalk: soils ↔ wetlands

> Retrieve for wetland screening and delineation support. Hydric soil is
> one of the three delineation parameters; soils data is the desktop
> trigger before boots hit the ground.

## SIGNAL FLOW
soils → wetlands:
- SSURGO hydric rating (hydric %, hydric components) → wetland probability
  screen at desktop stage.
- Drainage class (poorly/very poorly drained) + low slope → depression /
  flat wetland candidacy.
- Water table depth + ponding/flooding frequency → hydrology parameter
  corroboration.
- Redoximorphic indicators expected by series → field indicator prediction.
wetlands → soils:
- Field-confirmed hydric indicators refine/override SSURGO map-unit
  generalization at the parcel scale.

## COMBINED RED FLAGS
- Hydric-rated map unit + slope <2% + NWI polygon on-site or adjoining →
  delineation warranted before any earthwork/permitting assumption.
- Drained-hydric soils (historically wet, artificially drained) → prior
  converted vs. jurisdictional question; route to regulatory (404).
- Poorly drained series under a proposed fill footprint → 404/401 exposure.

## EXAMPLE QUERIES
- "SSURGO says 60% hydric and there's an NWI polygon next door — delineate?"
- "Do these drained clay soils flag a prior-converted cropland issue?"
