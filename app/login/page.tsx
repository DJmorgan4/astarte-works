'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AstarteLogin() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit() {
    if (!password) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        router.push('/mission');
        router.refresh();
      } else {
        setError('ACCESS DENIED');
        setPassword('');
      }
    } catch {
      setError('CONNECTION ERROR');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#080808',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Space Mono', monospace", position: 'relative', overflow: 'hidden',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap');
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes scanline { 0%{transform:translateY(-100%)} 100%{transform:translateY(100vh)} }
        input:-webkit-autofill {
          -webkit-box-shadow: 0 0 0 1000px #0E0E0E inset !important;
          -webkit-text-fill-color: #B08840 !important;
        }
      `}</style>

      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
        background: 'linear-gradient(90deg, transparent, rgba(176,136,64,0.15), transparent)',
        animation: 'scanline 8s linear infinite', pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: `linear-gradient(rgba(176,136,64,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(176,136,64,0.03) 1px, transparent 1px)`,
        backgroundSize: '40px 40px',
      }} />

      <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: 340, padding: '0 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ fontSize: 11, letterSpacing: '0.4em', color: '#B08840', fontWeight: 700, marginBottom: 6 }}>
            ASTARTE WORKS
          </div>
          <div style={{ fontSize: 7, letterSpacing: '0.3em', color: '#3A3A3A' }}>
            ASTRA CORE · CLASSIFIED ACCESS
          </div>
          <div style={{ width: 32, height: 1, background: '#2A2010', margin: '16px auto 0' }} />
        </div>

        <div style={{ border: '1px solid #1A1A1A', background: '#0A0A0A', padding: '32px 28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
            <span style={{
              width: 5, height: 5, borderRadius: '50%',
              background: '#B08840', boxShadow: '0 0 6px #B08840',
              animation: 'pulse 2s infinite',
            }} />
            <span style={{ fontSize: 7, letterSpacing: '0.2em', color: '#5A4A28' }}>
              SYSTEM ONLINE · AUTHENTICATION REQUIRED
            </span>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 7, letterSpacing: '0.25em', color: '#3A3A3A', marginBottom: 8 }}>
              ACCESS CODE
            </label>
            <input
              type="password"
              value={password}
              onChange={e => { setPassword(e.target.value); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder="••••••••••••"
              autoFocus
              autoComplete="current-password"
              style={{
                width: '100%', background: '#0E0E0E',
                border: `1px solid ${error ? '#8B2020' : '#222'}`,
                color: '#B08840', fontFamily: "'Space Mono', monospace",
                fontSize: 13, padding: '10px 12px', outline: 'none',
                letterSpacing: '0.2em',
              }}
            />
            {error && (
              <div style={{ fontSize: 7, letterSpacing: '0.2em', color: '#8B2020', marginTop: 8 }}>
                ⚠ {error}
              </div>
            )}
          </div>

          <button
            onClick={handleSubmit}
            disabled={!password || loading}
            style={{
              width: '100%',
              background: password && !loading ? '#B08840' : '#111',
              border: 'none',
              color: password && !loading ? '#080808' : '#333',
              fontFamily: "'Space Mono', monospace",
              fontSize: 9, letterSpacing: '0.25em', fontWeight: 700,
              padding: '12px 0',
              cursor: password && !loading ? 'pointer' : 'not-allowed',
            }}
          >
            {loading ? 'VERIFYING...' : 'AUTHENTICATE →'}
          </button>
        </div>

        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <span style={{ fontSize: 7, letterSpacing: '0.2em', color: '#2A2A2A' }}>
            astarte-works.vercel.app
          </span>
        </div>
      </div>
    </div>
  );
}
