import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Bot, LayoutDashboard, Users2, ArrowRight, Menu, X as CloseIcon } from 'lucide-react'
import ChatWidget from '../components/ChatWidget'
import { useAuth } from '../context/AuthContext'
import heroImage from '../assets/hero.png'

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Docs', href: '#docs' },
]

const FEATURES = [
  {
    icon: Bot,
    title: 'Drop the Snippet, Go Live Instantly',
    description:
      'Paste one self-contained <script> tag onto any HTML page — no framework, no bundler, no CDN required. The widget reads your Project ID, connects to your gateway, and loads your saved branding automatically.',
  },
  {
    icon: LayoutDashboard,
    title: 'AI Handles the First Line',
    description:
      'Every incoming message is answered instantly by Google Gemini — concise, on-brand replies with intent detection built in. Your agents are only paged when a conversation genuinely needs a human.',
  },
  {
    icon: Users2,
    title: 'Agents Step In When It Matters',
    description:
      'When Gemini detects frustration, a repeated complaint, or an explicit "talk to a person" — it escalates automatically. The agent sees the full history and takes over in real time, without the customer re-explaining anything.',
  },
]

const HOW_TO_STEPS = [
  {
    step: '01',
    title: 'Create your account',
    body: 'Register at aeroreply.app. Your unique Project ID is generated automatically — every API call, socket connection, and widget embed is scoped to it.',
  },
  {
    step: '02',
    title: 'Customise your widget',
    body: 'Open More → Widget Settings in the agent dashboard. Pick your brand colours, chat title, launcher icon, and screen position. Changes are saved to the database and applied live on the next visitor connection.',
  },
  {
    step: '03',
    title: 'Embed the snippet',
    body: 'Copy the one-line <script> tag from More → Integration Code and paste it before </body> on any website. The widget fetches your branding, connects to your agent room, and is ready to chat immediately.',
  },
  {
    step: '04',
    title: 'Manage conversations',
    body: 'Open the Agent Dashboard on any device. The Ticket Queue shows every active conversation. Click into one to read the full history and reply in real time. When you are offline, the widget captures visitor emails automatically.',
  },
]

// The public marketing surface for AeroReply. Pure presentation — the only
// live functionality on this page is the embedded ChatWidget demo, which
// uses the landing variant: AI-only sales assistant that never triggers
// human handoff or alerts agent dashboards.
export default function LandingPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [widgetOpen, setWidgetOpen] = useState(false)

  // If already authenticated, go straight to the dashboard.
  // Otherwise send the visitor to the register flow.
  function handleGetStarted() {
    navigate(user ? '/dashboard' : '/register')
  }

  return (
    <div style={styles.page}>
      <style>{RESPONSIVE_CSS}</style>

      {/* ----------------------------- Navbar ----------------------------- */}
      <header style={styles.navbar}>
        <div style={styles.navInner}>
          <div style={styles.brand}>
            <span style={styles.brandMark} />
            <span>AeroReply</span>
          </div>

          <nav className="lp-nav-links" style={styles.navLinks}>
            {NAV_LINKS.map((link) => (
              <a key={link.href} href={link.href} style={styles.navLink}>
                {link.label}
              </a>
            ))}
          </nav>

          <div className="lp-nav-cta" style={styles.navCtaWrap}>
            <Link to="/login" style={styles.navLoginLink}>
              Log in
            </Link>
            <button type="button" style={styles.ctaButtonSmall} onClick={handleGetStarted}>
              Get Started
            </button>
          </div>

          <button
            type="button"
            className="lp-nav-toggle"
            style={styles.navToggle}
            onClick={() => setMobileNavOpen((v) => !v)}
            aria-label={mobileNavOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileNavOpen ? <CloseIcon size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {mobileNavOpen && (
          <div className="lp-mobile-menu" style={styles.mobileMenu}>
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                style={styles.mobileMenuLink}
                onClick={() => setMobileNavOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <Link
              to="/login"
              style={styles.mobileMenuLink}
              onClick={() => setMobileNavOpen(false)}
            >
              Log in
            </Link>
            <button
              type="button"
              style={styles.ctaButtonFull}
              onClick={() => { setMobileNavOpen(false); handleGetStarted() }}
            >
              Get Started
            </button>
          </div>
        )}
      </header>

      {/* ------------------------------ Hero ------------------------------- */}
      <section className="lp-hero" style={styles.hero}>
        <div className="lp-hero-copy" style={styles.heroCopy}>
          <span style={styles.heroEyebrow}>Embeddable AI + Human Live Chat</span>
          <h1 style={styles.heroHeadline}>
            Your Site, Your Brand.
            <br />
            Real Support in Minutes.
          </h1>
          <p style={styles.heroSub}>
            AeroReply gives any website a production-ready live-chat widget — backed by
            Google Gemini for instant AI replies and a real-time agent dashboard for
            when a human touch is needed. Embed in one line. Customise without code.
          </p>
          <div style={styles.heroActions}>
            <button type="button" style={styles.ctaButtonLarge} onClick={handleGetStarted}>
              Get Started
              <ArrowRight size={18} />
            </button>
            <a href="#features" style={styles.secondaryLink}>
              See how it works
            </a>
          </div>
        </div>

        <div className="lp-hero-art" style={styles.heroArt}>
          <div style={styles.heroArtGlow} />
          <img src={heroImage} alt="" style={styles.heroImage} />
        </div>
      </section>

      {/* ---------------------------- Features ----------------------------- */}
      <section id="features" style={styles.features}>
        <div style={styles.featuresHeader}>
          <span style={styles.sectionEyebrow}>How AeroReply works</span>
          <h2 style={styles.sectionTitle}>From embed to conversation in minutes</h2>
        </div>

        <div className="lp-feature-grid" style={styles.featureGrid}>
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <div key={title} style={styles.featureCard}>
              <div style={styles.featureIconWrap}>
                <Icon size={22} strokeWidth={2} />
              </div>
              <h3 style={styles.featureTitle}>{title}</h3>
              <p style={styles.featureDesc}>{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─────────────────── How to Use ──────────────────── */}
      <section id="docs" style={styles.howTo}>
        <div style={styles.featuresHeader}>
          <span style={{ ...styles.sectionEyebrow, color: '#34d399' }}>Step-by-step guide</span>
          <h2 style={styles.sectionTitle}>How to use AeroReply</h2>
          <p style={{ margin: '8px 0 0', color: '#6b7280', fontSize: '15px', lineHeight: 1.6 }}>
            Four steps from zero to a live, branded chat widget on any website.
          </p>
        </div>

        <div className="lp-steps-grid" style={styles.stepsGrid}>
          {HOW_TO_STEPS.map(({ step, title, body }) => (
            <div key={step} style={styles.stepCard}>
              <span style={styles.stepNumber}>{step}</span>
              <h3 style={styles.stepTitle}>{title}</h3>
              <p style={styles.stepBody}>{body}</p>
            </div>
          ))}
        </div>

        {/* Embed snippet preview */}
        <div style={styles.snippetPreview}>
          <p style={styles.snippetLabel}>Your embed snippet looks like this:</p>
          <pre style={styles.snippetCode}>{`<script
  src="https://your-domain/widget.js"
  data-aeroreply-project-id="YOUR_PROJECT_ID"
  async
></script>`}</pre>
          <p style={styles.snippetHint}>
            Copy it from <strong style={{ color: '#f9fafb' }}>More → Integration Code</strong> in your dashboard after registering.
          </p>
        </div>
      </section>

      <footer style={styles.footer}>
        <span>© {new Date().getFullYear()} AeroReply. All rights reserved.</span>
      </footer>

      {/* ----------- Landing-only AI assistant widget (no handoff) ---------- */}
      <div style={styles.widgetArea}>
        {widgetOpen && (
          <div style={styles.widgetFrame}>
            <ChatWidget variant="landing" />
          </div>
        )}
        <button
          type="button"
          style={styles.widgetLauncher}
          onClick={() => setWidgetOpen((v) => !v)}
          aria-label={widgetOpen ? 'Close chat demo' : 'Try the chat widget'}
        >
          {widgetOpen ? <CloseIcon size={22} /> : <Bot size={22} />}
        </button>
      </div>
    </div>
  )
}

const RESPONSIVE_CSS = `
  .lp-nav-toggle { display: none; }

  @media (max-width: 860px) {
    .lp-nav-links, .lp-nav-cta { display: none !important; }
    .lp-nav-toggle { display: flex !important; }

    .lp-hero {
      flex-direction: column !important;
      text-align: center;
      padding: 48px 20px 56px !important;
    }
    .lp-hero-copy { align-items: center !important; }
    .lp-hero-art { margin-top: 32px; }

    .lp-feature-grid {
      grid-template-columns: 1fr !important;
    }

    .lp-steps-grid {
      grid-template-columns: 1fr !important;
    }
  }
`

const styles = {
  page: {
    minHeight: '100vh',
    background: '#0b0f19',
    color: '#f9fafb',
    fontFamily: 'system-ui, sans-serif',
    display: 'flex',
    flexDirection: 'column',
  },

  // Navbar
  navbar: {
    position: 'sticky',
    top: 0,
    zIndex: 40,
    background: 'rgba(11,15,25,0.85)',
    backdropFilter: 'blur(10px)',
    borderBottom: '1px solid #1f2937',
  },
  navInner: {
    maxWidth: '1180px',
    margin: '0 auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 24px',
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontWeight: 800,
    fontSize: '18px',
    letterSpacing: '-0.4px',
    color: '#f9fafb',
  },
  brandMark: {
    width: '10px',
    height: '10px',
    borderRadius: '3px',
    background: 'linear-gradient(135deg, #60a5fa, #a78bfa)',
    flexShrink: 0,
  },
  navLinks: {
    display: 'flex',
    alignItems: 'center',
    gap: '28px',
  },
  navLink: {
    color: '#9ca3af',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: 500,
  },
  navCtaWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  navLoginLink: {
    color: '#d1d5db',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: 600,
  },
  navToggle: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '38px',
    height: '38px',
    borderRadius: '8px',
    border: '1px solid #1f2937',
    background: '#111827',
    color: '#f9fafb',
    cursor: 'pointer',
  },
  mobileMenu: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    padding: '8px 24px 20px',
    borderTop: '1px solid #1f2937',
  },
  mobileMenuLink: {
    color: '#d1d5db',
    textDecoration: 'none',
    fontSize: '15px',
    fontWeight: 500,
    padding: '10px 4px',
  },

  // Buttons
  ctaButtonSmall: {
    background: '#3b82f6',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    padding: '9px 16px',
    fontSize: '13.5px',
    fontWeight: 700,
    cursor: 'pointer',
  },
  ctaButtonFull: {
    marginTop: '8px',
    background: '#3b82f6',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 16px',
    fontSize: '14px',
    fontWeight: 700,
    cursor: 'pointer',
  },
  ctaButtonLarge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
    color: '#fff',
    border: 'none',
    borderRadius: '10px',
    padding: '14px 22px',
    fontSize: '15px',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 12px 28px rgba(59,130,246,0.35)',
  },
  secondaryLink: {
    color: '#9ca3af',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: 600,
    alignSelf: 'center',
  },

  // Hero
  hero: {
    maxWidth: '1180px',
    margin: '0 auto',
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '48px',
    padding: '84px 24px 96px',
    boxSizing: 'border-box',
  },
  heroCopy: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: '20px',
    maxWidth: '560px',
  },
  heroEyebrow: {
    color: '#60a5fa',
    fontSize: '13px',
    fontWeight: 700,
    letterSpacing: '0.3px',
    textTransform: 'uppercase',
  },
  heroHeadline: {
    margin: 0,
    fontSize: '48px',
    fontWeight: 800,
    lineHeight: 1.12,
    letterSpacing: '-1px',
    color: '#f9fafb',
  },
  heroSub: {
    margin: 0,
    color: '#9ca3af',
    fontSize: '16px',
    lineHeight: 1.65,
  },
  heroActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    marginTop: '8px',
    flexWrap: 'wrap',
  },
  heroArt: {
    position: 'relative',
    flexShrink: 0,
    width: '380px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroArtGlow: {
    position: 'absolute',
    inset: '-40px',
    background:
      'radial-gradient(circle at 50% 40%, rgba(96,165,250,0.28), transparent 65%)',
    filter: 'blur(10px)',
  },
  heroImage: {
    position: 'relative',
    width: '100%',
    maxWidth: '380px',
    borderRadius: '16px',
    boxShadow: '0 24px 60px rgba(0,0,0,0.55)',
  },

  // Features
  features: {
    maxWidth: '1180px',
    margin: '0 auto',
    width: '100%',
    padding: '0 24px 96px',
    boxSizing: 'border-box',
  },
  featuresHeader: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginBottom: '40px',
    maxWidth: '560px',
  },
  sectionEyebrow: {
    color: '#a78bfa',
    fontSize: '13px',
    fontWeight: 700,
    letterSpacing: '0.3px',
    textTransform: 'uppercase',
  },
  sectionTitle: {
    margin: 0,
    fontSize: '30px',
    fontWeight: 800,
    letterSpacing: '-0.6px',
    color: '#f9fafb',
  },
  featureGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '20px',
  },
  featureCard: {
    background: 'linear-gradient(180deg, #131a2a 0%, #0e1420 100%)',
    border: '1px solid #1f2937',
    borderRadius: '16px',
    padding: '26px 24px',
  },
  featureIconWrap: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '44px',
    height: '44px',
    borderRadius: '12px',
    background: 'rgba(59,130,246,0.15)',
    color: '#60a5fa',
    marginBottom: '16px',
  },
  featureTitle: {
    margin: '0 0 8px',
    fontSize: '17px',
    fontWeight: 700,
    color: '#f9fafb',
  },
  featureDesc: {
    margin: 0,
    color: '#9ca3af',
    fontSize: '14px',
    lineHeight: 1.65,
  },

  // How to Use section
  howTo: {
    maxWidth: '1180px',
    margin: '0 auto',
    width: '100%',
    padding: '0 24px 96px',
    boxSizing: 'border-box',
  },
  stepsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '20px',
    margin: '40px 0 48px',
  },
  stepCard: {
    background: 'linear-gradient(180deg, #0d1520 0%, #0b1018 100%)',
    border: '1px solid #1f2937',
    borderRadius: '16px',
    padding: '28px 26px',
    position: 'relative',
    overflow: 'hidden',
  },
  stepNumber: {
    display: 'inline-block',
    fontWeight: 900,
    fontSize: '44px',
    letterSpacing: '-2px',
    lineHeight: 1,
    marginBottom: '14px',
    background: 'linear-gradient(135deg, #1f2937 0%, #111827 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  stepTitle: {
    margin: '0 0 10px',
    fontSize: '17px',
    fontWeight: 700,
    color: '#f9fafb',
    letterSpacing: '-0.2px',
  },
  stepBody: {
    margin: 0,
    color: '#6b7280',
    fontSize: '14px',
    lineHeight: 1.65,
  },

  // Embed snippet preview block
  snippetPreview: {
    background: '#0d1117',
    border: '1px solid #21262d',
    borderRadius: '14px',
    padding: '24px 28px',
    maxWidth: '680px',
  },
  snippetLabel: {
    margin: '0 0 12px',
    color: '#8b949e',
    fontSize: '13px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  snippetCode: {
    margin: '0 0 12px',
    padding: '16px 18px',
    background: '#161b22',
    border: '1px solid #30363d',
    borderRadius: '8px',
    color: '#79c0ff',
    fontSize: '13px',
    fontFamily: '"Fira Code", "Cascadia Code", "Courier New", monospace',
    overflowX: 'auto',
    lineHeight: 1.6,
    whiteSpace: 'pre',
  },
  snippetHint: {
    margin: 0,
    color: '#6b7280',
    fontSize: '13px',
    lineHeight: 1.55,
  },

  // Footer
  footer: {
    marginTop: 'auto',
    borderTop: '1px solid #1f2937',
    padding: '22px 24px',
    textAlign: 'center',
    color: '#6b7280',
    fontSize: '12.5px',
  },

  // Widget demo launcher
  widgetArea: {
    position: 'fixed',
    right: '24px',
    bottom: '24px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '14px',
    zIndex: 50,
  },
  widgetFrame: {
    boxShadow: '0 12px 32px rgba(0,0,0,0.45)',
    borderRadius: '18px',
  },
  widgetLauncher: {
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    border: 'none',
    background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: '0 10px 26px rgba(59,130,246,0.45)',
  },
}
