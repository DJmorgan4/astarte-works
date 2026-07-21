---
type: playbook
name: site_screening_rapid
updated: 2026-07
---

# Playbook: Rapid Site Screening (desktop triage)

> Fast multi-domain go/no-go before committing to full scope. Desktop only,
> live data + knowledge interpretation, no field work. Produces a risk
> posture and a recommended next step, not a conclusion.

## DOMAIN SEQUENCE (parallel scan, then synthesize)
1. phase1_esa — quick historical-use read (aerials/Sanborn if available),
   obvious REC potential.
2. petroleum_storage — nearby LPST/PST hits within screening radius.
3. soils + geotechnical — hydric flag, shrink-swell/foundation risk class.
4. wetlands — SSURGO hydric + NWI adjacency flag.
5. floodplain — FEMA SFHA presence [pending domain — use live FIRM data].
6. regulatory — any open case, VCP, or database hit on/adjacent.

## PER-DOMAIN CONTRIBUTION
Each returns a single flag: CLEAR / WATCH / CONCERN, with a one-line basis.

## ROLL-UP LOGIC
Any CONCERN → recommend full assessment in that lane. All CLEAR/WATCH →
document basis, note residual uncertainty, recommend proportional scope.
This is a triage score, explicitly NOT a CETO Score or a Phase I opinion.

## OUTPUT TEMPLATE
Site snapshot → per-lane flag table → overall posture → recommended next
step → stated limitations (desktop, unverified, screening-level).
