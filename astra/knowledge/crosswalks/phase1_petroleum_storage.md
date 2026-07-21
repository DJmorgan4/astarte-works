---
type: crosswalk
domains: [phase1_esa, petroleum_storage]
updated: 2026-07
---

# Crosswalk: phase1_esa ↔ petroleum_storage

> Retrieve whenever a Phase I query involves tanks, filling stations,
> LPST cases, or fuel history. petroleum_storage produces the tank facts;
> phase1_esa consumes them as REC/CREC/HREC classifications.

## SIGNAL FLOW
petroleum_storage → phase1_esa:
- Tank inventory (registered + historical evidence) → potential source ID.
- LPST closure interpretation (era, standard, residuals, controls) →
  drives the REC vs. CREC vs. HREC decision directly.
- Contaminant era (leaded gas, MTBE window, scavengers) → analyte list
  and Phase II scoping if a REC is called.
phase1_esa → petroleum_storage:
- Historical sources (Sanborn, directory, aerial) surface unregistered
  tanks the database never had → sends petroleum_storage to look deeper.

## COMBINED RED FLAGS
- Registered tank removed late-1980s/1990s with NO LPST case → removal-era
  sampling was inconsistent; absence of a case ≠ no release. Suspect REC.
- Filled-in-place tank → tank still present; confirm assessment beneath.
- Pre-1999 closure → verify residuals against CURRENT TRRP PCLs before
  granting HREC; may migrate back to REC/CREC.
- MSD-based closure → groundwater pathway only; CREC pattern, and vapor
  still open (route to vapor_intrusion).
- Historical filling station on Sanborn, zero database record → the
  classic "clean paperwork, dirty ground" trap.

## EXAMPLE QUERIES
- "Former Texaco on the corner, removed 1991, no TCEQ case — REC or not?"
- "LPST closed 1997 to commercial PCLs, site now going residential — status?"
- "Sanborn shows a 1955 service station, database is empty. What now?"
