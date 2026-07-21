'use client'

import {
  FormEvent,
  KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface ChatMessage {
  role: 'user' | 'astra'
  content: string
  timestamp: string
}

interface HistoryMessage {
  role: 'user' | 'assistant'
  content: string
}

const SUPABASE_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1`

const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

const SUPABASE_HEADERS = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
}

function formatTime(date = new Date()) {
  return date.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function AstraResearch() {
  const [corpusCount, setCorpusCount] = useState(0)
  const [engine, setEngine] = useState<'online' | 'offline' | 'checking'>(
    'checking',
  )
  const [lastSynchronized, setLastSynchronized] = useState<string>('Checking')

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

  const conversationRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const fetchCorpusCount = useCallback(async () => {
    try {
      const response = await fetch(`${SUPABASE_URL}/astra_knowledge?select=id`, {
        headers: {
          ...SUPABASE_HEADERS,
          Prefer: 'count=exact',
          Range: '0-0',
        },
      })

      const contentRange = response.headers.get('content-range')

      if (contentRange) {
        const count = Number.parseInt(contentRange.split('/')[1] ?? '0', 10)
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

    const corpusTimer = window.setInterval(fetchCorpusCount, 60_000)
    const engineTimer = window.setInterval(checkEngine, 120_000)

    return () => {
      window.clearInterval(corpusTimer)
      window.clearInterval(engineTimer)
    }
  }, [fetchCorpusCount, checkEngine])

  useEffect(() => {
    conversationRef.current?.scrollTo({
      top: conversationRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }, [messages, thinking])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  async function sendQuery(queryOverride?: string) {
    const query = (queryOverride ?? input).trim()

    if (!query || thinking) {
      return
    }

    setInput('')

    setMessages((current) => [
      ...current,
      {
        role: 'user',
        content: query,
        timestamp: formatTime(),
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
        payload.response || payload.error || 'ASTRA returned no response.'

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

  function handleInputKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      sendQuery()
    }
  }

  function startNewResearch() {
    setMessages([
      {
        role: 'astra',
        content: 'New research session. What would you like to understand?',
        timestamp: formatTime(),
      },
    ])

    setHistory([])
    setInput('')
    inputRef.current?.focus()
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
            <strong className={`engine-state engine-${engine}`}>{engine}</strong>
          </div>

          <button type="button" className="new-session" onClick={startNewResearch}>
            New research
          </button>
        </div>
      </header>

      <section className="workspace">
        <div className="research-introduction">
          <p className="overline">ASTRA KNOWLEDGE INSTRUMENT</p>

          <h2>Search across the corpus, sky, language, number, and Earth.</h2>

          <p>
            Ask a direct question, compare systems, examine evidence, or trace
            relationships across disciplines.
          </p>
        </div>

        <form className="query-form" onSubmit={submitQuery}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="What would you like to understand?"
            rows={3}
            aria-label="Ask ASTRA"
          />

          <div className="query-footer">
            <span>Enter to submit · Shift + Enter for a new line</span>

            <button type="submit" disabled={thinking || !input.trim()}>
              {thinking ? 'Working' : 'Ask ASTRA'}
            </button>
          </div>
        </form>

        <div className="conversation" ref={conversationRef}>
          {messages.map((message, index) => (
            <article
              className={`message message-${message.role}`}
              key={`${message.timestamp}-${index}`}
            >
              <div className="message-meta">
                <span>{message.role === 'astra' ? 'ASTRA' : 'DJ'}</span>
                <time>{message.timestamp}</time>
              </div>

              <div
                className={`message-body${
                  message.role === 'astra' ? ' markdown' : ''
                }`}
              >
                {message.role === 'astra' ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {message.content}
                  </ReactMarkdown>
                ) : (
                  message.content
                )}
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

      <style jsx>{`
        :global(*) {
          box-sizing: border-box;
        }

        :global(html) {
          background: #040810;
        }

        :global(body) {
          margin: 0;
          background: #040810;
        }

        :global(::selection) {
          color: #040810;
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
          background: rgba(155, 184, 223, 0.18);
        }

        .astra {
          --background: #040810;
          --panel: #070d18;
          --line: rgba(163, 190, 224, 0.1);
          --line-strong: rgba(163, 190, 224, 0.22);
          --text: #eef4fb;
          --muted: #8497af;
          --faint: #4f6078;
          --accent: #91bfff;
          --accent-soft: #bdd7ff;
          --positive: #8abda6;
          --negative: #c78989;
          --serif: Georgia, 'Times New Roman', serif;
          --mono: 'Space Mono', 'SFMono-Regular', Consolas, monospace;

          min-height: 100vh;
          color: var(--text);
          background:
            radial-gradient(
              circle at 50% -12%,
              rgba(57, 94, 145, 0.11),
              transparent 34%
            ),
            linear-gradient(180deg, #050b15 0%, var(--background) 40%, #030609 100%);
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
          background: rgba(4, 8, 16, 0.86);
          backdrop-filter: blur(18px);
          position: sticky;
          top: 0;
          z-index: 10;
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
          width: min(980px, 100%);
          margin: 0 auto;
          padding: 76px clamp(20px, 5vw, 44px) 90px;
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
          margin: 0;
          font-family: var(--serif);
          font-size: clamp(36px, 5vw, 62px);
          font-weight: 400;
          line-height: 1.06;
          letter-spacing: -0.035em;
        }

        .research-introduction > p:last-child {
          max-width: 640px;
          margin: 24px 0 0;
          color: var(--muted);
          font-size: 14px;
          line-height: 1.75;
        }

        .query-form {
          margin-top: 45px;
          border: 1px solid var(--line-strong);
          border-radius: 8px;
          background: rgba(7, 13, 24, 0.78);
          box-shadow:
            0 16px 55px rgba(0, 0, 0, 0.2),
            inset 0 1px 0 rgba(255, 255, 255, 0.015);
          transition:
            border-color 160ms ease,
            box-shadow 160ms ease;
        }

        .query-form:focus-within {
          border-color: rgba(145, 191, 255, 0.38);
          box-shadow:
            0 18px 60px rgba(0, 0, 0, 0.26),
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
          color: #5f7189;
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
          display: flex;
          flex-direction: column;
          gap: 36px;
          margin-top: 62px;
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

        .message-body.markdown {
          white-space: normal;
        }

        .message-body.markdown :global(p) {
          margin: 0 0 14px;
        }

        .message-body.markdown :global(p:last-child) {
          margin-bottom: 0;
        }

        .message-body.markdown :global(h1),
        .message-body.markdown :global(h2),
        .message-body.markdown :global(h3) {
          margin: 22px 0 10px;
          font-family: var(--serif);
          font-weight: 400;
          letter-spacing: -0.01em;
          color: var(--text);
        }

        .message-body.markdown :global(h1) {
          font-size: 21px;
        }

        .message-body.markdown :global(h2) {
          font-size: 17px;
        }

        .message-body.markdown :global(h3) {
          font-family: var(--mono);
          font-size: 10px;
          letter-spacing: 0.09em;
          text-transform: uppercase;
          color: var(--accent);
        }

        .message-body.markdown :global(ul),
        .message-body.markdown :global(ol) {
          margin: 0 0 14px;
          padding-left: 19px;
        }

        .message-body.markdown :global(li) {
          margin-bottom: 5px;
        }

        .message-body.markdown :global(strong) {
          color: var(--text);
          font-weight: 600;
        }

        .message-body.markdown :global(code) {
          padding: 1px 5px;
          border-radius: 3px;
          background: rgba(145, 191, 255, 0.07);
          color: var(--accent-soft);
          font-family: var(--mono);
          font-size: 11px;
        }

        .message-body.markdown :global(pre) {
          margin: 0 0 14px;
          padding: 14px;
          overflow-x: auto;
          border: 1px solid var(--line);
          border-radius: 6px;
          background: rgba(4, 8, 16, 0.7);
        }

        .message-body.markdown :global(pre code) {
          padding: 0;
          background: transparent;
        }

        .message-body.markdown :global(table) {
          width: 100%;
          margin: 0 0 16px;
          border-collapse: collapse;
          font-size: 12px;
        }

        .message-body.markdown :global(th) {
          padding: 8px 11px;
          border-bottom: 1px solid var(--line-strong);
          color: var(--accent);
          font-family: var(--mono);
          font-size: 8px;
          font-weight: 400;
          letter-spacing: 0.09em;
          text-align: left;
          text-transform: uppercase;
        }

        .message-body.markdown :global(td) {
          padding: 8px 11px;
          border-bottom: 1px solid var(--line);
          color: #c6d3e3;
        }

        .message-body.markdown :global(blockquote) {
          margin: 0 0 14px;
          padding-left: 13px;
          border-left: 1px solid var(--line-strong);
          color: var(--muted);
        }

        .message-body.markdown :global(hr) {
          margin: 18px 0;
          border: 0;
          border-top: 1px solid var(--line);
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

        @media (max-width: 1050px) {
          .header-meta > div:nth-child(2) {
            display: none;
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
            padding: 50px 20px 70px;
          }
        }

        @media (max-width: 560px) {
          .new-session {
            padding: 0 10px;
            font-size: 7px;
          }

          .research-introduction h2 {
            font-size: 37px;
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
