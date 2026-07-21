---
type: manifest
updated: 2026-07
---

# ASTRA STRATUM — Domain Manifest

> Router reference. Each entry: description + example queries. Domains
> marked (draft) have scaffolding but core.md content pending.

## CORE ENVIRONMENTAL DOMAINS

## soils
Interprets SSURGO/soil-series data for engineering, wetland, and
contamination-migration reasoning. Texas series behavior.
_Ex: "What does Houston Black clay mean for this 12-acre site?"_

## geology
Formation mapping, stratigraphy, depth to competent rock, fracture and
sulfate-zone prediction; feeds migration and geotechnical reasoning.
_Ex: "What's the depth to Austin Chalk in this part of Collin County?"_

## hydrology
Surface/subsurface water flow, gradient, drainage-area delineation,
receiving waters, depth to water table.
_Ex: "Which way does groundwater flow relative to this LPST site?"_

## wetlands
Three-parameter delineation, hydric/hydrophytic/hydrology indicators,
jurisdictional reasoning.
_Ex: "Does SSURGO hydric rating plus an NWI polygon warrant delineation?"_

## water_quality
303(d) impairments, TMDLs, surface/groundwater quality standards,
monitoring benchmarks.
_Ex: "Is this receiving segment impaired, and does it carry a TMDL?"_

## airquality
Ambient standards, permitting thresholds, emissions screening.
_Ex: "Does this facility trigger air permitting review?"_

## toxicology
Contaminant potency, exposure routes, risk math, PCL/screening-level logic.
_Ex: "Why does TCE drive short-term action but benzene long-term?"_

## remediation
Corrective-action technologies, closure strategy, monitored natural
attenuation, TRRP pathways.
_Ex: "Is MNA defensible for this stable dissolved BTEX plume?"_

## regulatory
Federal + Texas environmental regulatory framework, agency jurisdiction,
database targets, permitting pathways.
_Ex: "TCEQ or RRC jurisdiction for a former oil-lease tank battery?"_

## conservation
Habitat, ecosystem services, land stewardship; Blue Duck Foundation lane.
_Ex: "What conservation value does this wetland complex hold?"_

## climate
Climate data, trends, and their bearing on hydrology and site planning.
_Ex: "How do Atlas 14 rainfall shifts affect this drainage design?"_

## energy
Energy infrastructure and siting context (solar/wind background).
_Ex: "Environmental screening concerns for this solar parcel?"_

## landuse
Land-use history, zoning, and development-pattern interpretation.
_Ex: "What does the historical land-use sequence imply for this site?"_

## wildlife
Species, habitat, and general wildlife reasoning (see endangered_species
for regulatory Section 7/10 mechanics).
_Ex: "What wildlife use would this habitat type support?"_

## texas_hunting
Texas waterfowl and game knowledge; wetlands/hunting domain expertise.
_Ex: "Best wetland management for waterfowl on this Texas tract?"_

## DUE-DILIGENCE DOMAINS

## phase1_esa
ASTM E1527-21 / AAI Phase I reasoning; REC/CREC/HREC classification, data
gaps, liability protection.
_Ex: "Former station removed 1991, no case — REC or HREC?"_

## petroleum_storage
UST/AST and LPST-case interpretation; tank history, closure-letter logic,
petroleum contaminant behavior.
_Ex: "This pre-1999 LPST closure — does it still hold under current PCLs?"_

## vapor_intrusion
Subsurface-to-indoor-air pathway; PVI vs. CVI, sub-slab/soil-gas data,
mitigation.
_Ex: "TCE plume 80 ft from the building — screen in for VI?"_

## geotechnical
Expansive-clay screening, PVR/shrink-swell, foundation-risk interpretation
(screening, not PE design).
_Ex: "PI 45 clay to 12 ft, no shallow rock — foundation risk?"_

## stormwater
TPDES CGP / SWPPP compliance, physics-first BMP selection, inspection
machinery.
_Ex: "BMP train for a 12-acre Houston Black site with 4:1 cut slopes?"_

## hazmat_building (draft)
Asbestos, lead-based paint, mold in pre-1981 structures; TAHPA.
_Ex: "1968 building in due diligence — what building-hazard flags?"_

## floodplain (draft)
FEMA FIRM interpretation, SFHA, floodway/fringe, LOMR/CLOMR, Atlas 14.
_Ex: "Is this parcel in the floodway or just the fringe?"_

## brownfields (draft)
TCEQ VCP/IOP, institutional controls, redevelopment incentives.
_Ex: "REC-heavy site — is VCP the right redevelopment path?"_

## REGULATORY / SPECIALIZED

## endangered_species (draft)
ESA Section 7/10, USFWS IPaC, habitat assessments, candidate species.
_Ex: "Does this project need Section 7 consultation?"_

## cultural_resources (draft)
Section 106, THC/SHPO coordination, Antiquities Code of Texas.
_Ex: "Does this federal-nexus project trigger a Section 106 review?"_

## water_law (draft)
Texas water law: rule of capture, GCDs, surface-water rights, Edwards rules.
_Ex: "Who controls groundwater rights under this Texas tract?"_

## mitigation_banking (draft)
Wetland/stream credits, ILF programs, ecosystem-services markets.
_Ex: "How many mitigation credits would this impact require?"_

## nepa (draft)
CatEx/EA/EIS logic for federal actions.
_Ex: "Does this federal IDIQ task need an EA or a CatEx?"_

## GEOSPATIAL / RESEARCH (LithicEarth)

## remote_sensing (draft)
SAR coherence, NDVI/NDWI, LiDAR derivatives, DEM analysis; MSIGI methods.
_Ex: "What does SAR coherence loss suggest at this site?"_

## geophysics (draft)
Magnetometry, GPR, resistivity, muon tomography.
_Ex: "Which geophysical method fits a buried-feature survey here?"_

## archaeology
Site-pattern reasoning, predictive modeling; LithicEarth archaeology lane.
_Ex: "What landscape signals predict a site in this terrain?"_

## ESOTERIC / SPECIALIZED

## astrology
Western and Vedic astrological reasoning.
_Ex: "Interpret this natal placement in Vedic terms."_

## gematria
Gematria and numerical-symbolic systems.
_Ex: "Compute and interpret the gematria of this term."_

## plasma
High-voltage plasma, ZVS/flyback, electromagnetic experimentation.
_Ex: "Design considerations for this ZVS flyback driver?"_

## business_compliance
Entity, federal-contracting, and compliance reasoning (NAICS, set-asides,
SAM, certifications).
_Ex: "Are we eligible for this set-aside under NAICS 541620?"_

## ORCHESTRATION LAYER
- crosswalks/ — pairwise domain interaction files (retrieve for
  multi-domain queries).
- playbooks/ — multi-domain workflows (phase1_full, swppp_full,
  wetland_delineation_full, site_screening_rapid, federal_capture_response).
