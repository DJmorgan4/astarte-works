"use client";

import { FormEvent, useMemo, useState } from "react";

const zodiacSigns = [
  { symbol: "♈", name: "Aries" },
  { symbol: "♉", name: "Taurus" },
  { symbol: "♊", name: "Gemini" },
  { symbol: "♋", name: "Cancer" },
  { symbol: "♌", name: "Leo" },
  { symbol: "♍", name: "Virgo" },
  { symbol: "♎", name: "Libra" },
  { symbol: "♏", name: "Scorpio" },
  { symbol: "♐", name: "Sagittarius" },
  { symbol: "♑", name: "Capricorn" },
  { symbol: "♒", name: "Aquarius" },
  { symbol: "♓", name: "Pisces" },
];

const systems = [
  {
    name: "CETO",
    role: "Operational Intelligence",
    description: "Procurement, opportunities, logistics, and mission activity.",
    status: "Connected",
  },
  {
    name: "ATLAS AI",
    role: "Spatial Intelligence",
    description: "Geospatial context, terrain, infrastructure, and mapping.",
    status: "Connected",
  },
  {
    name: "LITHIC EARTH",
    role: "Environmental Intelligence",
    description: "Hydrology, geology, ecology, climate, and field intelligence.",
    status: "Connected",
  },
];

type Layer = "evidence" | "synthesis" | "symbolic";

function calculateEnglishOrdinal(value: string) {
  return value
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .split("")
    .reduce((total, character) => {
      return total + character.charCodeAt(0) - 64;
    }, 0);
}

function calculateEnglishReduction(value: string) {
  return value
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .split("")
    .reduce((total, character) => {
      const ordinal = character.charCodeAt(0) - 64;
      return total + (((ordinal - 1) % 9) + 1);
    }, 0);
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [activeLayer, setActiveLayer] = useState<Layer>("evidence");
  const [symbolicEnabled, setSymbolicEnabled] = useState(true);

  const ordinalValue = useMemo(
    () => calculateEnglishOrdinal(submittedQuery),
    [submittedQuery],
  );

  const reductionValue = useMemo(
    () => calculateEnglishReduction(submittedQuery),
    [submittedQuery],
  );

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmed = query.trim();

    if (!trimmed) {
      return;
    }

    setSubmittedQuery(trimmed);
  }

  return (
    <main className="astra-shell">
      <div className="cosmic-background" aria-hidden="true">
        <div className="nebula nebula-one" />
        <div className="nebula nebula-two" />
        <div className="nebula nebula-three" />
        <div className="star-layer stars-small" />
        <div className="star-layer stars-medium" />
        <div className="star-layer stars-large" />
        <div className="cosmic-grid" />
      </div>

      <header className="topbar">
        <a className="brand" href="/" aria-label="ASTRA CORE home">
          <span className="brand-star" aria-hidden="true">
            <span className="brand-star-horizontal" />
            <span className="brand-star-vertical" />
            <span className="brand-star-diagonal-one" />
            <span className="brand-star-diagonal-two" />
          </span>

          <span className="brand-text">
            <strong>ASTRA CORE</strong>
            <small>BY ASTARTE WORKS</small>
          </span>
        </a>

        <div className="topbar-status">
          <span className="online-dot" />
          <span>CORE ONLINE</span>
        </div>
      </header>

      <section className="hero">
        <div className="hero-intro">
          <p className="eyebrow">THE INTELLIGENCE NEXUS</p>

          <h1>
            Query the
            <span> living Earth.</span>
          </h1>

          <p className="hero-copy">
            Environmental evidence, spatial intelligence, operational context,
            and symbolic knowledge—organized through one reasoning architecture.
          </p>
        </div>

        <form className="search-panel" onSubmit={handleSubmit}>
          <div className="search-field">
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              className="search-icon"
            >
              <circle
                cx="11"
                cy="11"
                r="7"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <path
                d="M16.5 16.5L21 21"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>

            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Ask ASTRA about a place, system, event, or pattern..."
              aria-label="Query ASTRA"
            />

            <button type="submit">
              <span>Query</span>
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <path
                  d="M4 10h11M11 5l5 5-5 5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>

          <div className="search-options">
            <button
              type="button"
              className={symbolicEnabled ? "toggle active" : "toggle"}
              onClick={() => setSymbolicEnabled((current) => !current)}
              aria-pressed={symbolicEnabled}
            >
              <span className="toggle-orb" />
              Symbolic layer
            </button>

            <span className="search-example">
              Example: McKinney wetlands review
            </span>
          </div>
        </form>

        <section className="nexus-stage" aria-label="ASTRA intelligence nexus">
          <div className="nexus-light" />

          <div className="zodiac-wheel">
            <div className="orbit orbit-seven" />
            <div className="orbit orbit-six" />
            <div className="orbit orbit-five" />
            <div className="orbit orbit-four" />
            <div className="orbit orbit-three" />
            <div className="orbit orbit-two" />
            <div className="orbit orbit-one" />

            <div className="constellation-lines" aria-hidden="true">
              <span className="constellation-line line-one" />
              <span className="constellation-line line-two" />
              <span className="constellation-line line-three" />
              <span className="constellation-line line-four" />
              <span className="constellation-line line-five" />
              <span className="constellation-line line-six" />
            </div>

            {zodiacSigns.map((sign, index) => {
              const angle = index * 30;

              return (
                <div
                  className="zodiac-position"
                  key={sign.name}
                  style={{
                    transform: `rotate(${angle}deg) translateY(-248px)`,
                  }}
                  title={sign.name}
                >
                  <span
                    style={{
                      transform: `rotate(${-angle}deg)`,
                    }}
                  >
                    {sign.symbol}
                  </span>
                </div>
              );
            })}

            <div className="nexus-core">
              <div className="core-atmosphere" />
              <div className="core-surface" />

              <div className="core-copy">
                <strong>ASTRA</strong>
                <span>LOCUS CORE</span>
                <small>INTELLIGENCE NEXUS</small>
              </div>
            </div>

            <div className="nexus-node node-one" />
            <div className="nexus-node node-two" />
            <div className="nexus-node node-three" />
            <div className="nexus-node node-four" />
          </div>

          <div className="nexus-caption">
            <span className="caption-line" />
            <p>
              Evidence is kept separate from interpretation. Astronomical and
              environmental data connectors will display their source and
              retrieval time.
            </p>
            <span className="caption-line" />
          </div>
        </section>

        <section className="system-strip">
          <div>
            <strong>20</strong>
            <span>Knowledge domains</span>
          </div>

          <div>
            <strong>03</strong>
            <span>Connected engines</span>
          </div>

          <div>
            <strong>601</strong>
            <span>Corpus entries</span>
          </div>

          <div>
            <strong>∞</strong>
            <span>Patterns examined</span>
          </div>
        </section>
      </section>

      {submittedQuery && (
        <section className="results-section">
          <div className="results-header">
            <div>
              <p className="section-label">ASTRA QUERY</p>
              <h2>{submittedQuery}</h2>
            </div>

            <span className="local-analysis-badge">
              Local interface analysis
            </span>
          </div>

          <div className="layer-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeLayer === "evidence"}
              className={activeLayer === "evidence" ? "active" : ""}
              onClick={() => setActiveLayer("evidence")}
            >
              Evidence
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeLayer === "synthesis"}
              className={activeLayer === "synthesis" ? "active" : ""}
              onClick={() => setActiveLayer("synthesis")}
            >
              Synthesis
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeLayer === "symbolic"}
              className={activeLayer === "symbolic" ? "active" : ""}
              onClick={() => setActiveLayer("symbolic")}
              disabled={!symbolicEnabled}
            >
              Symbolic layer
            </button>
          </div>

          <div className="result-content">
            {activeLayer === "evidence" && (
              <article className="result-card">
                <p className="card-label">VERIFIED DATA LAYER</p>
                <h3>External evidence connectors are not active yet.</h3>
                <p>
                  This interface is ready for authoritative environmental,
                  geographic, regulatory, weather, and astronomical services.
                  Until those services are connected, ASTRA will not display
                  fabricated live conditions.
                </p>

                <div className="source-grid">
                  <div>
                    <span>NWS</span>
                    <small>Weather alerts</small>
                  </div>
                  <div>
                    <span>USGS</span>
                    <small>Water and geology</small>
                  </div>
                  <div>
                    <span>USFWS</span>
                    <small>Species and wetlands</small>
                  </div>
                  <div>
                    <span>JPL</span>
                    <small>Astronomical ephemerides</small>
                  </div>
                </div>
              </article>
            )}

            {activeLayer === "synthesis" && (
              <article className="result-card">
                <p className="card-label">REASONING LAYER</p>
                <h3>ASTRA synthesis will appear here.</h3>
                <p>
                  Once verified sources are connected, this layer will organize
                  findings, conflicts, limitations, uncertainty, and strategic
                  implications without changing the underlying evidence.
                </p>

                <div className="status-list">
                  <span>
                    <i className="status-ready" />
                    Query interface ready
                  </span>
                  <span>
                    <i className="status-ready" />
                    Evidence separation active
                  </span>
                  <span>
                    <i className="status-pending" />
                    Reasoning API pending
                  </span>
                </div>
              </article>
            )}

            {activeLayer === "symbolic" && symbolicEnabled && (
              <article className="result-card symbolic-card">
                <p className="card-label">SYMBOLIC / INTERPRETIVE LAYER</p>
                <h3>Gematria calculation</h3>

                <p>
                  These values are deterministic calculations. They are
                  interpretive and are not environmental or scientific
                  evidence.
                </p>

                <div className="gematria-grid">
                  <div>
                    <span>{ordinalValue}</span>
                    <strong>English Ordinal</strong>
                    <small>A=1 through Z=26</small>
                  </div>

                  <div>
                    <span>{reductionValue}</span>
                    <strong>English Reduction</strong>
                    <small>Letters reduced to 1–9</small>
                  </div>
                </div>

                <p className="method-note">
                  Normalization: uppercase letters only. Spaces, punctuation,
                  and numbers are ignored.
                </p>
              </article>
            )}
          </div>
        </section>
      )}

      <section className="systems-section">
        <div className="section-heading">
          <div>
            <p className="section-label">CONNECTED INTELLIGENCE ENGINES</p>
            <h2>Three systems. One reasoning core.</h2>
          </div>

          <p>
            CETO, ATLAS AI, and LITHIC EARTH organize the operational, spatial,
            and environmental worlds surrounding each ASTRA inquiry.
          </p>
        </div>

        <div className="systems-grid">
          {systems.map((system, index) => (
            <article className="system-card" key={system.name}>
              <div className="system-card-header">
                <span>0{index + 1}</span>
                <span className="system-state">
                  <i />
                  {system.status}
                </span>
              </div>

              <div className="system-symbol" aria-hidden="true">
                {index === 0 && "◌"}
                {index === 1 && "◎"}
                {index === 2 && "△"}
              </div>

              <p>{system.role}</p>
              <h3>{system.name}</h3>
              <div className="system-divider" />
              <p className="system-description">{system.description}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="site-footer">
        <div>
          <strong>ASTARTE WORKS</strong>
          <span>THE BLUE DUCK LLC</span>
        </div>

        <p>ASTRA CORE · INTELLIGENCE ARCHITECTURE</p>

        <div>
          <span>CAGE 14V05</span>
          <span>UEI LG15KPRZFQE3</span>
        </div>
      </footer>
    </main>
  );
}
