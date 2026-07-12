'use client'

import {
  FormEvent,
  KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

interface ChatMessage {
  role: 'user' | 'astra'
  content: string
  timestamp: string
}

interface HistoryMessage {
  role: 'user' | 'assistant'
  content: string
}

type ReferencePanel =
  | 'corpus'
  | 'sky'
  | 'language'
  | 'sources'
  | 'recent'
  | null

const SUPABASE_URL =
  'https://jmkopheshisqqmocwhto.supabase.co/rest/v1'

const SUPABASE_KEY =
  'sb_publishable_oJCKKDU8IGdOPPykH9aQFg_tJLjXdO4'

const SUPABASE_HEADERS = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
}

const RESEARCH_DOMAINS = [
  'Earth',
  'Sky',
  'Language',
  'Number',
  'History',
  'Symbol',
  'Law',
  'Energy',
]

const SOURCE_GROUPS = [
  {
    name: 'Environmental',
    sources: ['USGS', 'EPA', 'NOAA', 'TCEQ', 'USFWS'],
  },
  {
    name: 'Astronomical',
    sources: ['JPL Horizons', 'IAU reference systems'],
  },
  {
    name: 'Language and number',
    sources: [
      'English ordinal',
      'English reduction',
      'Greek isopsephy',
      'Hebrew gematria',
    ],
  },
]

function formatTime(date = new Date()) {
  return date.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
  })
}

function englishOrdinal(value: string) {
  return value
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .split('')
    .reduce((total, character) => {
      return total + character.charCodeAt(0) - 64
    }, 0)
}

function englishReduction(value: string) {
  return value
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .split('')
    .reduce((total, character) => {
      const ordinal = character.charCodeAt(0) - 64
      return total + (((ordinal - 1) % 9) + 1)
    }, 0)
}

function normalizedWordCount(value: string) {
  return value
    .trim()
    .split(/\s+/)
    .filter(Boolean).length
}

export default function AstraResearch() {
  const [corpusCount, setCorpusCount] = useState(0)
  const [engine, setEngine] = useState<
    'online' | 'offline' | 'checking'
  >('checking')

  const [lastSynchronized, setLastSynchronized] =
    useState<string>('Checking')

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'astra',
      content:
        'ASTRA is ready. Search across the corpus, environment, sky, language, number, history, and symbolic systems.',
      timestamp: formatTime(),
    },
  ])

  const [history, setHistory] = useState<HistoryMessage[]>([])
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const [activePanel, setActivePanel] =
    useState<ReferencePanel>('corpus')

  const [recentResearch, setRecentResearch] = useState<string[]>([])
  const conversationRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const latestQuery = useMemo(() => {
    const latestUserMessage = [...messages]
      .reverse()
      .find((message) => message.role === 'user')

    return latestUserMessage?.content ?? input
  }, [messages, input])

  const wordAnalysis = useMemo(() => {
    return {
      ordinal: englishOrdinal(latestQuery),
      reduction: englishReduction(latestQuery),
      words: normalizedWordCount(latestQuery),
      characters: latestQuery.replace(/\s/g, '').length,
    }
  }, [latestQuery])

  const fetchCorpusCount = useCallback(async () => {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/astra_knowledge?select=id`,
        {
          headers: {
            ...SUPABASE_HEADERS,
            Prefer: 'count=exact',
            Range: '0-0',
          },
        },
      )

      const contentRange = response.headers.get('content-range')

      if (contentRange) {
        const count = Number.parseInt(
          contentRange.split('/')[1] ?? '0',
          10,
        )

        setCorpusCount(Number.isFinite(count) ? count : 0)
        setLastSynchronized(formatTime())
      }
    } catch {
      setLastSynchronized('Unavailable')
    }
  }, [])

  const checkEngine = useCallback(async () => {
    try {
      const response = await fetch(
        'https://lithicearth-production.up.railway.app/health',
        {
          signal: AbortSignal.timeout(5000),
          cache: 'no-store',
        },
      )

      setEngine(response.ok ? 'online' : 'offline')

      if (response.ok) {
        setLastSynchronized(formatTime())
      }
    } catch {
      setEngine('offline')
    }
  }, [])

  useEffect(() => {
    fetchCorpusCount()
    checkEngine()

    const corpusTimer = window.setInterval(
      fetchCorpusCount,
      60_000,
    )

    const engineTimer = window.setInterval(
      checkEngine,
      120_000,
    )

    return () => {
      window.clearInterval(corpusTimer)
      window.clearInterval(engineTimer)
    }
  }, [fetchCorpusCount, checkEngine])

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(
        'astra-recent-research',
      )

      if (saved) {
        const parsed = JSON.parse(saved)

        if (Array.isArray(parsed)) {
          setRecentResearch(parsed.slice(0, 8))
        }
      }
    } catch {
      // Local research history is optional.
    }
  }, [])

  useEffect(() => {
    conversationRef.current?.scrollTo({
      top: conversationRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }, [messages, thinking])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  function saveRecentResearch(query: string) {
    setRecentResearch((current) => {
      const next = [
        query,
        ...current.filter(
          (item) =>
            item.toLowerCase() !== query.toLowerCase(),
        ),
      ].slice(0, 8)

      try {
        window.localStorage.setItem(
          'astra-recent-research',
          JSON.stringify(next),
        )
      } catch {
        // Local storage is not required for ASTRA operation.
      }

      return next
    })
  }

  async function sendQuery(queryOverride?: string) {
    const query = (queryOverride ?? input).trim()

    if (!query || thinking) {
      return
    }

    setInput('')
    saveRecentResearch(query)

    const userTimestamp = formatTime()

    setMessages((current) => [
      ...current,
      {
        role: 'user',
        content: query,
        timestamp: userTimestamp,
      },
    ])

    setThinking(true)

    const nextHistory: HistoryMessage[] = [
      ...history,
      {
        role: 'user',
        content: query,
      },
    ]

    try {
      const response = await fetch('/api/astra/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: query,
          history,
        }),
      })

      const payload = await response.json()

      const reply =
        payload.response ||
        payload.error ||
        'ASTRA returned no response.'

      setMessages((current) => [
        ...current,
        {
          role: 'astra',
          content: reply,
          timestamp: formatTime(),
        },
      ])

      setHistory([
        ...nextHistory,
        {
          role: 'assistant',
          content: reply,
        },
      ])
    } catch {
      setMessages((current) => [
        ...current,
        {
          role: 'astra',
          content:
            'The research service could not be reached. No result was generated.',
          timestamp: formatTime(),
        },
      ])
    } finally {
      setThinking(false)
    }
  }

  function submitQuery(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    sendQuery()
  }

  function handleInputKeyDown(
    event: KeyboardEvent<HTMLTextAreaElement>,
  ) {
    if (
      event.key === 'Enter' &&
      !event.shiftKey
    ) {
      event.preventDefault()
      sendQuery()
    }
  }

  function startNewResearch() {
    setMessages([
      {
        role: 'astra',
        content:
          'New research session. What would you like to understand?',
        timestamp: formatTime(),
      },
    ])

    setHistory([])
    setInput('')
    inputRef.current?.focus()
  }

  function renderReferencePanel() {
    if (activePanel === 'corpus') {
      return (
        <div className="reference-content">
          <div className="reference-heading">
            <span>Corpus</span>
            <strong>{corpusCount.toLocaleString()}</strong>
          </div>

          <p className="reference-description">
            Indexed records available to ASTRA for retrieval
            and synthesis.
          </p>

          <div className="reference-list">
            {RESEARCH_DOMAINS.map((domain) => (
              <div className="reference-row" key={domain}>
                <span>{domain}</span>
                <small>Available</small>
              </div>
            ))}
          </div>

          <div className="reference-note">
            Corpus availability does not imply that every
            record is current or independently verified.
            ASTRA should identify sources and limitations in
            each answer.
          </div>
        </div>
      )
    }

    if (activePanel === 'sky') {
      return (
        <div className="reference-content">
          <div className="reference-heading">
            <span>Current sky</span>
            <strong>—</strong>
          </div>

          <p className="reference-description">
            Astronomical positions should be calculated from a
            verified ephemeris using a defined location, time,
            coordinate frame, and zodiac convention.
          </p>

          <div className="reference-list">
            <div className="reference-row">
              <span>Ephemeris</span>
              <small>Not connected</small>
            </div>

            <div className="reference-row">
              <span>Reference frame</span>
              <small>Not selected</small>
            </div>

            <div className="reference-row">
              <span>Zodiac system</span>
              <small>Not selected</small>
            </div>

            <div className="reference-row">
              <span>Observer location</span>
              <small>Not defined</small>
            </div>
          </div>

          <div className="reference-note">
            This panel deliberately displays no planetary
            positions until the astronomical connector is
            configured. Interpretive astrology should remain
            separate from calculated astronomy.
          </div>
        </div>
      )
    }

    if (activePanel === 'language') {
      return (
        <div className="reference-content">
          <div className="reference-heading">
            <span>Word and number</span>
            <strong>{wordAnalysis.ordinal}</strong>
          </div>

          <p className="reference-description">
            Deterministic analysis of the latest query or
            current input.
          </p>

          <div className="analysis-grid">
            <div>
              <small>English ordinal</small>
              <strong>{wordAnalysis.ordinal}</strong>
              <span>A = 1 through Z = 26</span>
            </div>

            <div>
              <small>English reduction</small>
              <strong>{wordAnalysis.reduction}</strong>
              <span>Letters reduced to 1–9</span>
            </div>

            <div>
              <small>Words</small>
              <strong>{wordAnalysis.words}</strong>
              <span>Whitespace segmentation</span>
            </div>

            <div>
              <small>Characters</small>
              <strong>{wordAnalysis.characters}</strong>
              <span>Spaces excluded</span>
            </div>
          </div>

          <div className="reference-note">
            Hebrew and Greek values require an explicit spelling
            or transliteration. ASTRA should not infer a
            “universal” value without showing the selected
            language and method.
          </div>
        </div>
      )
    }

    if (activePanel === 'sources') {
      return (
        <div className="reference-content">
          <div className="reference-heading">
            <span>Sources</span>
            <strong>{SOURCE_GROUPS.length}</strong>
          </div>

          <p className="reference-description">
            Reference families intended for ASTRA research.
            Actual availability depends on the connected
            services and indexed corpus.
          </p>

          <div className="source-groups">
            {SOURCE_GROUPS.map((group) => (
              <div className="source-group" key={group.name}>
                <small>{group.name}</small>

                {group.sources.map((source) => (
                  <div className="source-item" key={source}>
                    <span>{source}</span>
                    <i />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )
    }

    if (activePanel === 'recent') {
      return (
        <div className="reference-content">
          <div className="reference-heading">
            <span>Recent research</span>
            <strong>{recentResearch.length}</strong>
          </div>

          <p className="reference-description">
            Recent queries stored in this browser.
          </p>

          {recentResearch.length > 0 ? (
            <div className="recent-list">
              {recentResearch.map((query) => (
                <button
                  type="button"
                  key={query}
                  onClick={() => sendQuery(query)}
                >
                  <span>{query}</span>
                  <small>Open</small>
                </button>
              ))}
            </div>
          ) : (
            <div className="empty-reference">
              No recent research.
            </div>
          )}
        </div>
      )
    }

    return null
  }

  return (
    <main className="astra">
      <header className="header">
        <div className="identity">
          <div className="identity-mark" aria-hidden="true">
            <span />
          </div>

          <div>
            <h1>ASTRA</h1>
            <p>Research and synthesis</p>
          </div>
        </div>

        <div className="header-meta">
          <div>
            <span>Corpus</span>
            <strong>{corpusCount.toLocaleString()}</strong>
          </div>

          <div>
            <span>Last synchronized</span>
            <strong>{lastSynchronized}</strong>
          </div>

          <div>
            <span>Research service</span>
            <strong
              className={`engine-state engine-${engine}`}
            >
              {engine}
            </strong>
          </div>

          <button
            type="button"
            className="new-session"
            onClick={startNewResearch}
          >
            New research
          </button>
        </div>
      </header>

      <section className="workspace">
        <section className="research">
          <div className="research-introduction">
            <p className="overline">ASTRA KNOWLEDGE INSTRUMENT</p>

            <h2>
              Search across the corpus, sky, language,
              number, and Earth.
            </h2>

            <p>
              Ask a direct question, compare systems, examine
              evidence, or trace relationships across
              disciplines.
            </p>
          </div>

          <form
            className="query-form"
            onSubmit={submitQuery}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(event) =>
                setInput(event.target.value)
              }
              onKeyDown={handleInputKeyDown}
              placeholder="What would you like to understand?"
              rows={3}
              aria-label="Ask ASTRA"
            />

            <div className="query-footer">
              <span>
                Enter to submit · Shift + Enter for a new line
              </span>

              <button
                type="submit"
                disabled={thinking || !input.trim()}
              >
                {thinking ? 'Working' : 'Ask ASTRA'}
              </button>
            </div>
          </form>

          <div
            className="conversation"
            ref={conversationRef}
          >
            {messages.map((message, index) => (
              <article
                className={`message message-${message.role}`}
                key={`${message.timestamp}-${index}`}
              >
                <div className="message-meta">
                  <span>
                    {message.role === 'astra'
                      ? 'ASTRA'
                      : 'DJ'}
                  </span>

                  <time>{message.timestamp}</time>
                </div>

                <div className="message-body">
                  {message.content}
                </div>
              </article>
            ))}

            {thinking && (
              <article className="message message-astra">
                <div className="message-meta">
                  <span>ASTRA</span>
                  <time>{formatTime()}</time>
                </div>

                <div className="thinking">
                  <span />
                  <span />
                  <span />
                  <p>Examining the available corpus.</p>
                </div>
              </article>
            )}
          </div>
        </section>

        <aside className="reference">
          <nav
            className="reference-navigation"
            aria-label="Research references"
          >
            <button
              type="button"
              className={
                activePanel === 'corpus' ? 'active' : ''
              }
              onClick={() => setActivePanel('corpus')}
            >
              <span>Corpus</span>
              <small>
                {corpusCount.toLocaleString()}
              </small>
            </button>

            <button
              type="button"
              className={
                activePanel === 'sky' ? 'active' : ''
              }
              onClick={() => setActivePanel('sky')}
            >
              <span>Current sky</span>
              <small>Reference</small>
            </button>

            <button
              type="button"
              className={
                activePanel === 'language'
                  ? 'active'
                  : ''
              }
              onClick={() =>
                setActivePanel('language')
              }
            >
              <span>Word and number</span>
              <small>{wordAnalysis.ordinal}</small>
            </button>

            <button
              type="button"
              className={
                activePanel === 'sources' ? 'active' : ''
              }
              onClick={() =>
                setActivePanel('sources')
              }
            >
              <span>Sources</span>
              <small>Reference</small>
            </button>

            <button
              type="button"
              className={
                activePanel === 'recent' ? 'active' : ''
              }
              onClick={() => setActivePanel('recent')}
            >
              <span>Recent research</span>
              <small>{recentResearch.length}</small>
            </button>
          </nav>

          <div className="reference-panel">
            {renderReferencePanel()}
          </div>
        </aside>
      </section>

      <style jsx>{`
        :global(*) {
          box-sizing: border-box;
        }

        :global(html) {
          background: #07101c;
        }

        :global(body) {
          margin: 0;
          background: #07101c;
        }

        :global(::selection) {
          color: #07101c;
          background: #bdd7ff;
        }

        :global(::-webkit-scrollbar) {
          width: 6px;
          height: 6px;
        }

        :global(::-webkit-scrollbar-track) {
          background: transparent;
        }

        :global(::-webkit-scrollbar-thumb) {
          border-radius: 10px;
          background: rgba(155, 184, 223, 0.2);
        }

        .astra {
          --background: #07101c;
          --panel: #0a1524;
          --panel-light: #0d1a2b;
          --panel-hover: #101f33;
          --line: rgba(163, 190, 224, 0.12);
          --line-strong: rgba(163, 190, 224, 0.24);
          --text: #eef4fb;
          --muted: #899ab2;
          --faint: #56677f;
          --accent: #91bfff;
          --accent-soft: #bdd7ff;
          --positive: #8abda6;
          --negative: #c78989;
          --serif: Georgia, 'Times New Roman', serif;
          --mono: 'Space Mono', 'SFMono-Regular',
            Consolas, monospace;

          min-height: 100vh;
          color: var(--text);
          background:
            radial-gradient(
              circle at 12% -10%,
              rgba(57, 94, 145, 0.13),
              transparent 31%
            ),
            linear-gradient(
              180deg,
              #081321 0%,
              var(--background) 36%,
              #060e19 100%
            );
          font-family:
            var(--font-geist-sans),
            ui-sans-serif,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            'Segoe UI',
            sans-serif;
        }

        .header {
          min-height: 78px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 30px;
          padding: 0 34px;
          border-bottom: 1px solid var(--line);
          background: rgba(7, 16, 28, 0.84);
          backdrop-filter: blur(18px);
        }

        .identity {
          display: flex;
          align-items: center;
          gap: 14px;
          flex-shrink: 0;
        }

        .identity-mark {
          position: relative;
          width: 29px;
          height: 29px;
          display: grid;
          place-items: center;
          border: 1px solid var(--line-strong);
          border-radius: 50%;
        }

        .identity-mark::before,
        .identity-mark::after {
          content: '';
          position: absolute;
          background: var(--accent);
          opacity: 0.5;
        }

        .identity-mark::before {
          width: 15px;
          height: 1px;
        }

        .identity-mark::after {
          width: 1px;
          height: 15px;
        }

        .identity-mark span {
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: var(--accent-soft);
          box-shadow: 0 0 9px rgba(145, 191, 255, 0.65);
        }

        .identity h1 {
          margin: 0;
          font-family: var(--serif);
          font-size: 19px;
          font-weight: 400;
          letter-spacing: 0.19em;
        }

        .identity p {
          margin: 3px 0 0;
          color: var(--faint);
          font-family: var(--mono);
          font-size: 7px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }

        .header-meta {
          display: flex;
          align-items: center;
          gap: 29px;
        }

        .header-meta > div {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .header-meta span {
          color: var(--faint);
          font-family: var(--mono);
          font-size: 7px;
          letter-spacing: 0.11em;
          text-transform: uppercase;
        }

        .header-meta strong {
          color: #b8c7dc;
          font-family: var(--mono);
          font-size: 9px;
          font-weight: 400;
          text-transform: capitalize;
        }

        .engine-online {
          color: var(--positive) !important;
        }

        .engine-offline {
          color: var(--negative) !important;
        }

        .engine-checking {
          color: var(--faint) !important;
        }

        .new-session {
          min-height: 34px;
          padding: 0 13px;
          border: 1px solid var(--line-strong);
          border-radius: 4px;
          color: #b7c7dc;
          background: transparent;
          cursor: pointer;
          font-family: var(--mono);
          font-size: 8px;
          letter-spacing: 0.08em;
          transition:
            border-color 160ms ease,
            color 160ms ease,
            background 160ms ease;
        }

        .new-session:hover {
          border-color: rgba(145, 191, 255, 0.42);
          color: var(--text);
          background: rgba(145, 191, 255, 0.04);
        }

        .workspace {
          width: min(1540px, 100%);
          min-height: calc(100vh - 78px);
          display: grid;
          grid-template-columns: minmax(0, 1fr) 370px;
          margin: 0 auto;
        }

        .research {
          min-width: 0;
          padding: 70px clamp(32px, 6vw, 92px) 70px;
        }

        .research-introduction {
          max-width: 820px;
        }

        .overline {
          margin: 0 0 19px;
          color: var(--accent);
          font-family: var(--mono);
          font-size: 7px;
          letter-spacing: 0.18em;
        }

        .research-introduction h2 {
          max-width: 790px;
          margin: 0;
          font-family: var(--serif);
          font-size: clamp(38px, 5vw, 67px);
          font-weight: 400;
          line-height: 1.04;
          letter-spacing: -0.035em;
        }

        .research-introduction > p:last-child {
          max-width: 650px;
          margin: 25px 0 0;
          color: var(--muted);
          font-size: 14px;
          line-height: 1.75;
        }

        .query-form {
          max-width: 930px;
          margin-top: 45px;
          border: 1px solid var(--line-strong);
          border-radius: 8px;
          background: rgba(10, 21, 36, 0.76);
          box-shadow:
            0 16px 55px rgba(0, 0, 0, 0.14),
            inset 0 1px 0 rgba(255, 255, 255, 0.015);
          transition:
            border-color 160ms ease,
            box-shadow 160ms ease;
        }

        .query-form:focus-within {
          border-color: rgba(145, 191, 255, 0.38);
          box-shadow:
            0 18px 60px rgba(0, 0, 0, 0.19),
            0 0 0 1px rgba(145, 191, 255, 0.04);
        }

        .query-form textarea {
          width: 100%;
          min-height: 112px;
          display: block;
          resize: none;
          padding: 22px 23px 15px;
          border: 0;
          outline: 0;
          color: var(--text);
          background: transparent;
          font-family: inherit;
          font-size: 16px;
          line-height: 1.65;
        }

        .query-form textarea::placeholder {
          color: #667890;
        }

        .query-footer {
          min-height: 51px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          padding: 8px 9px 8px 23px;
          border-top: 1px solid var(--line);
        }

        .query-footer span {
          color: var(--faint);
          font-family: var(--mono);
          font-size: 7px;
          letter-spacing: 0.05em;
        }

        .query-footer button {
          min-width: 108px;
          height: 34px;
          border: 1px solid rgba(145, 191, 255, 0.31);
          border-radius: 4px;
          color: #081321;
          background: #a9caf5;
          cursor: pointer;
          font-family: var(--mono);
          font-size: 8px;
          font-weight: 700;
          letter-spacing: 0.07em;
          transition:
            background 160ms ease,
            opacity 160ms ease;
        }

        .query-footer button:hover:not(:disabled) {
          background: #c4dcfa;
        }

        .query-footer button:disabled {
          cursor: default;
          opacity: 0.4;
        }

        .conversation {
          max-width: 930px;
          display: flex;
          flex-direction: column;
          gap: 36px;
          margin-top: 62px;
          padding-bottom: 40px;
        }

        .message {
          display: grid;
          grid-template-columns: 93px minmax(0, 1fr);
          gap: 25px;
          padding-top: 26px;
          border-top: 1px solid var(--line);
        }

        .message-meta {
          display: flex;
          flex-direction: column;
          gap: 7px;
          padding-top: 2px;
        }

        .message-meta span {
          color: var(--accent);
          font-family: var(--mono);
          font-size: 8px;
          letter-spacing: 0.11em;
        }

        .message-user .message-meta span {
          color: #aebdd0;
        }

        .message-meta time {
          color: var(--faint);
          font-family: var(--mono);
          font-size: 7px;
        }

        .message-body {
          min-width: 0;
          color: #dce6f2;
          font-size: 14px;
          line-height: 1.82;
          white-space: pre-wrap;
          overflow-wrap: anywhere;
        }

        .message-user .message-body {
          color: #aebdd0;
          font-size: 15px;
        }

        .thinking {
          display: flex;
          align-items: center;
          gap: 6px;
          min-height: 30px;
        }

        .thinking span {
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: var(--accent);
          animation: thinking 1.3s ease-in-out infinite;
        }

        .thinking span:nth-child(2) {
          animation-delay: 0.15s;
        }

        .thinking span:nth-child(3) {
          animation-delay: 0.3s;
        }

        .thinking p {
          margin: 0 0 0 6px;
          color: var(--faint);
          font-family: var(--mono);
          font-size: 8px;
        }

        .reference {
          min-width: 0;
          display: grid;
          grid-template-rows: auto 1fr;
          border-left: 1px solid var(--line);
          background: rgba(7, 16, 28, 0.52);
        }

        .reference-navigation {
          display: flex;
          flex-direction: column;
          padding: 25px 18px 19px;
          border-bottom: 1px solid var(--line);
        }

        .reference-navigation button {
          min-height: 47px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          padding: 0 13px;
          border: 0;
          border-left: 2px solid transparent;
          color: var(--muted);
          background: transparent;
          cursor: pointer;
          text-align: left;
          transition:
            color 150ms ease,
            border-color 150ms ease,
            background 150ms ease;
        }

        .reference-navigation button:hover {
          color: var(--text);
          background: rgba(145, 191, 255, 0.025);
        }

        .reference-navigation button.active {
          border-left-color: var(--accent);
          color: var(--text);
          background: rgba(145, 191, 255, 0.045);
        }

        .reference-navigation button span {
          font-size: 11px;
        }

        .reference-navigation button small {
          color: var(--faint);
          font-family: var(--mono);
          font-size: 7px;
          letter-spacing: 0.05em;
        }

        .reference-panel {
          overflow-y: auto;
          padding: 31px;
        }

        .reference-content {
          animation: reveal 180ms ease;
        }

        .reference-heading {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 20px;
          padding-bottom: 20px;
          border-bottom: 1px solid var(--line);
        }

        .reference-heading span {
          font-family: var(--serif);
          font-size: 25px;
        }

        .reference-heading strong {
          color: var(--accent-soft);
          font-family: var(--serif);
          font-size: 27px;
          font-weight: 400;
        }

        .reference-description {
          margin: 21px 0 26px;
          color: var(--muted);
          font-size: 11px;
          line-height: 1.7;
        }

        .reference-list {
          border-top: 1px solid var(--line);
        }

        .reference-row {
          min-height: 43px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          border-bottom: 1px solid var(--line);
        }

        .reference-row span {
          color: #bac8da;
          font-size: 10px;
        }

        .reference-row small {
          color: var(--faint);
          font-family: var(--mono);
          font-size: 7px;
        }

        .reference-note {
          margin-top: 26px;
          padding-left: 13px;
          border-left: 1px solid var(--line-strong);
          color: #6f8098;
          font-size: 9px;
          line-height: 1.75;
        }

        .analysis-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1px;
          overflow: hidden;
          border: 1px solid var(--line);
          background: var(--line);
        }

        .analysis-grid > div {
          min-height: 126px;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          padding: 16px;
          background: var(--panel);
        }

        .analysis-grid small {
          color: var(--faint);
          font-family: var(--mono);
          font-size: 7px;
          letter-spacing: 0.06em;
        }

        .analysis-grid strong {
          margin: 16px 0 8px;
          font-family: var(--serif);
          font-size: 31px;
          font-weight: 400;
        }

        .analysis-grid span {
          color: var(--muted);
          font-size: 8px;
          line-height: 1.5;
        }

        .source-groups {
          display: flex;
          flex-direction: column;
          gap: 29px;
        }

        .source-group > small {
          display: block;
          margin-bottom: 11px;
          color: var(--faint);
          font-family: var(--mono);
          font-size: 7px;
          letter-spacing: 0.09em;
          text-transform: uppercase;
        }

        .source-item {
          min-height: 40px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          border-bottom: 1px solid var(--line);
        }

        .source-item span {
          color: #b6c4d7;
          font-size: 10px;
        }

        .source-item i {
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: var(--faint);
        }

        .recent-list {
          display: flex;
          flex-direction: column;
        }

        .recent-list button {
          min-height: 54px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 0;
          border: 0;
          border-bottom: 1px solid var(--line);
          color: #b9c7d8;
          background: transparent;
          cursor: pointer;
          text-align: left;
        }

        .recent-list button:hover span {
          color: var(--accent-soft);
        }

        .recent-list button span {
          overflow: hidden;
          font-size: 10px;
          text-overflow: ellipsis;
          white-space: nowrap;
          transition: color 150ms ease;
        }

        .recent-list button small {
          color: var(--faint);
          font-family: var(--mono);
          font-size: 7px;
        }

        .empty-reference {
          padding: 30px 0;
          color: var(--faint);
          font-family: var(--mono);
          font-size: 8px;
        }

        @keyframes thinking {
          0%,
          100% {
            opacity: 0.25;
            transform: translateY(1px);
          }

          50% {
            opacity: 1;
            transform: translateY(-2px);
          }
        }

        @keyframes reveal {
          from {
            opacity: 0;
            transform: translateY(3px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (max-width: 1050px) {
          .header-meta > div:nth-child(2) {
            display: none;
          }

          .workspace {
            grid-template-columns: minmax(0, 1fr) 320px;
          }

          .research {
            padding-right: 46px;
            padding-left: 46px;
          }
        }

        @media (max-width: 820px) {
          .header {
            min-height: 72px;
            padding: 0 20px;
          }

          .header-meta > div {
            display: none;
          }

          .workspace {
            display: block;
          }

          .research {
            padding: 50px 20px 60px;
          }

          .reference {
            border-top: 1px solid var(--line);
            border-left: 0;
          }

          .reference-navigation {
            flex-direction: row;
            overflow-x: auto;
            padding: 13px;
          }

          .reference-navigation button {
            min-width: 142px;
            border-bottom: 2px solid transparent;
            border-left: 0;
          }

          .reference-navigation button.active {
            border-bottom-color: var(--accent);
            border-left-color: transparent;
          }

          .reference-panel {
            padding: 27px 20px 50px;
          }
        }

        @media (max-width: 560px) {
          .new-session {
            padding: 0 10px;
            font-size: 7px;
          }

          .research-introduction h2 {
            font-size: 39px;
          }

          .query-footer {
            align-items: flex-start;
            flex-direction: column;
            padding: 12px;
          }

          .query-footer button {
            width: 100%;
          }

          .message {
            grid-template-columns: 1fr;
            gap: 12px;
          }

          .message-meta {
            flex-direction: row;
            justify-content: space-between;
          }

          .analysis-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          *,
          *::before,
          *::after {
            scroll-behavior: auto !important;
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
          }
        }
      `}</style>
    </main>
  )
}
