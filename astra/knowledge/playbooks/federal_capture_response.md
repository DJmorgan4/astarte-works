---
type: playbook
name: federal_capture_response
updated: 2026-07
---

# Playbook: Federal Capture Response (Atlas → ASTRA)

> Orchestrates evaluation of a federal/grant opportunity surfaced by Atlas
> into a bid/no-bid recommendation and response scaffold. Business-side
> playbook; bridges capture intelligence with domain capability.

## DOMAIN SEQUENCE
1. business_compliance — entity fit: NAICS (541620 core), set-aside
   eligibility, SAM registration status, size standard, past performance.
2. regulatory — scope-of-work technical fit against Ceto/LithicEarth
   capability (which domains does the SOW actually require?).
3. Relevant technical domains — pull the specific cores the SOW touches
   (e.g., phase1_esa + stormwater for an environmental IDIQ) to gauge
   genuine capability vs. teaming need.
4. business_compliance — compliance matrix: mandatory clauses, certs,
   bonding, insurance, key-personnel quals.
5. Synthesis — bid / no-bid / teaming recommendation with rationale.

## PER-DOMAIN CONTRIBUTION
- business_compliance → can we legally/administratively win and perform?
- regulatory + technical domains → can we technically deliver?
- Atlas scorers (NAICS tiering, set-aside weight, agency lane) → priority.

## ROLL-UP LOGIC
Eligibility gate (fail = no-bid) → capability score → strategic fit
(agency lane, past performance, win probability) → bid/no-bid/team.
Feeds ASTRA CORE capture pipeline; rationale must be traceable.

## OUTPUT TEMPLATE
Opportunity summary → eligibility gate result → capability assessment →
gaps/teaming needs → compliance matrix skeleton → recommendation + rationale.
