export default function Home() {
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "54px 18px",
      background: "#0a0a0a",
      color: "#eaeaea",
      fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
      letterSpacing: "0.2px",
    }}>
      <div style={{
        width: "min(760px, 100%)",
        border: "1px solid rgba(234,234,234,0.12)",
        borderRadius: "18px",
        padding: "28px 22px",
        background: "linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))",
        boxShadow: "0 12px 50px rgba(0,0,0,0.42)",
      }}>

        <div style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: "16px",
          paddingBottom: "12px",
          borderBottom: "1px solid rgba(234,234,234,0.12)",
        }}>
          <span style={{ fontSize: "14px", letterSpacing: "1.2px", textTransform: "uppercase", opacity: 0.92 }}>
            Astarte Works
          </span>
          <nav style={{ display: "flex", gap: "14px", fontSize: "13px", color: "rgba(234,234,234,0.58)" }}>
            <a href="/about.html" style={{ color: "inherit", textDecoration: "none" }}>About</a>
            <a href="/contact.html" style={{ color: "inherit", textDecoration: "none" }}>Contact</a>
          </nav>
        </div>

        <div style={{ padding: "18px 0 8px" }}>
          <div style={{ position: "relative", display: "inline-block" }}>
            <h1 style={{
              margin: "14px 0 10px",
              fontSize: "clamp(32px, 8vw, 44px)",
              lineHeight: 1.02,
              letterSpacing: "1px",
              textTransform: "uppercase",
              position: "relative",
              display: "inline-block",
            }}>
              STRATEGIC DESIGN
            </h1>
            <span style={{
              position: "absolute", left: "-2%", right: "-2%", height: "2px",
              background: "rgba(234,234,234,0.55)", top: "52%", transform: "translateY(-50%)",
              pointerEvents: "none", display: "block",
            }} />
            <span style={{
              position: "absolute", left: "-2%", right: "-2%", height: "2px",
              background: "rgba(234,234,234,0.35)", top: "62%", transform: "translateY(-50%)",
              pointerEvents: "none", display: "block",
            }} />
          </div>

          <p style={{ margin: "0 0 10px", color: "rgba(234,234,234,0.58)", lineHeight: 1.55, fontSize: "18px" }}>
            Confidential advisory for leadership teams navigating complexity, transition, and structural pressure.
          </p>

          <div style={{
            marginTop: "12px", display: "flex", flexWrap: "wrap" as const,
            alignItems: "center", gap: "10px", fontSize: "12px",
            color: "rgba(234,234,234,0.58)", letterSpacing: "0.4px", textTransform: "uppercase",
          }}>
            {["Design", "Executive Advisory", "Crisis Architecture"].map((tag, i, arr) => (
              <span key={tag} style={{ display: "contents" }}>
                <span style={{
                  display: "inline-block", border: "1px solid rgba(234,234,234,0.22)",
                  padding: "6px 10px", borderRadius: "999px", fontSize: "12px",
                  color: "rgba(234,234,234,0.58)", textTransform: "uppercase",
                }}>{tag}</span>
                {i < arr.length - 1 && <span style={{ opacity: 0.35 }}>•</span>}
              </span>
            ))}
          </div>
        </div>

        <div style={{
          marginTop: "16px", padding: "14px",
          border: "1px dashed rgba(234,234,234,0.12)",
          borderRadius: "14px", background: "rgba(255,255,255,0.02)",
        }}>
          <div style={{
            fontSize: "12px", color: "rgba(234,234,234,0.58)",
            textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "8px",
          }}>Engagement</div>
          <p style={{ margin: "10px 0", color: "rgba(234,234,234,0.58)", lineHeight: 1.6 }}>
            <s style={{ opacity: 0.55 }}>Open inquiry</s> Selective. Referral-based. Limited capacity.
          </p>
        </div>

        <small style={{ display: "block", marginTop: "18px", color: "rgba(234,234,234,0.18)", fontStyle: "italic" }}>
          Discretion by structure.
        </small>

      </div>
    </div>
  );
}
