import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth-context";
import { Loader2, Eye, EyeOff, User, Lock, UserPlus, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useTheme, LOGOS } from "@/lib/theme-context";

// ─── Types ────────────────────────────────────────────────────────────────
type Panel = "login" | "signup" | "forgot";
type Effect = "split" | "particles" | "glass" | "wave" | "gradient";

// ─── Particle canvas ──────────────────────────────────────────────────────
function ParticleCanvas({ color = "99,102,241" }: { color?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize();
    const ro = new ResizeObserver(resize); ro.observe(canvas);
    const pts = Array.from({ length: 55 }, () => ({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.55, vy: (Math.random() - 0.5) * 0.55,
    }));
    let raf: number;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      pts.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
        ctx.beginPath(); ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${color},0.5)`; ctx.fill();
        pts.forEach(p2 => {
          const d = Math.hypot(p.x - p2.x, p.y - p2.y);
          if (d < 110) { ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p2.x, p2.y); ctx.strokeStyle = `rgba(${color},${0.12 * (1 - d / 110)})`; ctx.lineWidth = 0.6; ctx.stroke(); }
        });
      });
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);
  return <canvas ref={ref} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />;
}

// ─── Shared CSS ───────────────────────────────────────────────────────────
const BASE_CSS = `
  @keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
  @keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-10px)}40%{transform:translateX(10px)}60%{transform:translateX(-8px)}80%{transform:translateX(8px)}}
  @keyframes slideLeft{from{opacity:0;transform:translateX(60px)}to{opacity:1;transform:translateX(0)}}
  @keyframes slideRight{from{opacity:0;transform:translateX(-60px)}to{opacity:1;transform:translateX(0)}}
  @keyframes fadeUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
  @keyframes wave{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
  @keyframes blob{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(30px,-20px) scale(1.08)}}
  @keyframes blob2{0%,100%{transform:translate(0,0)}50%{transform:translate(-25px,30px)}}
  @keyframes shimmer{0%{background-position:-200% center}100%{background-position:200% center}}
  @keyframes pulseRing{0%{transform:scale(0.9);opacity:0.7}100%{transform:scale(1.5);opacity:0}}
  .login-input:focus{outline:none;}
  .login-btn:hover:not(:disabled){transform:translateY(-1px);filter:brightness(1.1);}
  .login-btn:active:not(:disabled){transform:translateY(0);}
  .link-btn{background:none;border:none;cursor:pointer;text-decoration:underline;padding:0;font-size:13px;}
`;

// ─── Input helper ─────────────────────────────────────────────────────────
function Field({ label, type = "text", value, onChange, placeholder, icon: Icon, focused, onFocus, onBlur, accentColor, inputBg, inputBorder, textColor, extra }: any) {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";
  return (
    <div>
      <label style={{ fontSize: 11, fontWeight: 700, color: textColor, display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: 1.2 }}>{label}</label>
      <div style={{ position: "relative" }}>
        {Icon && <Icon size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: focused ? accentColor : "rgba(150,150,180,0.8)", transition: "color 0.2s" }} />}
        <input
          className="login-input"
          type={isPassword ? (show ? "text" : "password") : type}
          value={value} onChange={e => onChange(e.target.value)}
          onFocus={onFocus} onBlur={onBlur}
          placeholder={placeholder} required
          style={{ width: "100%", padding: `11px ${isPassword ? "40px" : "14px"} 11px ${Icon ? "34px" : "14px"}`, background: inputBg, border: `1.5px solid ${focused ? accentColor : inputBorder}`, borderRadius: 10, color: "#fff", fontSize: 14, boxSizing: "border-box" as const, transition: "border-color 0.2s, box-shadow 0.2s", boxShadow: focused ? `0 0 0 3px ${accentColor}28` : "none" }}
        />
        {isPassword && (
          <button type="button" onClick={() => setShow(!show)} style={{ position: "absolute", right: 11, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "rgba(150,150,180,0.8)", display: "flex" }}>
            {show ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        )}
      </div>
      {extra}
    </div>
  );
}

// ─── Form content per panel ───────────────────────────────────────────────
function FormContent({ panel, setPanel, onLogin, onSignup, onForgot, accentColor, inputBg, inputBorder, textMuted, shake }: any) {
  const [u, setU] = useState(""); const [p, setP] = useState(""); const [p2, setP2] = useState("");
  const [name, setName] = useState(""); const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);
  const f = (id: string) => ({ focused: focused === id, onFocus: () => setFocused(id), onBlur: () => setFocused(null) });

  const sharedField = { accentColor, inputBg, inputBorder, textColor: textMuted };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); if (!u || !p) return;
    setLoading(true);
    try { await onLogin(u, p); }
    catch { toast.error("Invalid username or password"); }
    finally { setLoading(false); }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault(); if (!name || !u || !p) return;
    if (p !== p2) { toast.error("Passwords do not match"); return; }
    if (p.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    setLoading(true);
    try { await onSignup(name, u, p); }
    catch (err: any) { toast.error(err?.message || "Registration failed"); }
    finally { setLoading(false); }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault(); if (!u) return;
    setLoading(true);
    try { await onForgot(u); }
    catch (err: any) { toast.error(err?.message || "Failed"); }
    finally { setLoading(false); }
  };

  const btnStyle = { width: "100%", padding: "13px", border: "none", borderRadius: 10, background: `linear-gradient(135deg,${accentColor},${accentColor}cc)`, color: "white", fontWeight: 700, fontSize: 15, cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: `0 4px 20px ${accentColor}44`, transition: "all 0.2s", marginTop: 6, opacity: loading ? 0.7 : 1 };
  const linkStyle = { color: accentColor, background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, textDecoration: "underline", padding: 0 };

  if (panel === "login") return (
    <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 14, animation: "slideRight 0.45s cubic-bezier(0.34,1.56,0.64,1)" }}>
      <Field label="Username" value={u} onChange={setU} placeholder="Enter username" icon={User} {...f("u")} {...sharedField} />
      <Field label="Password" type="password" value={p} onChange={setP} placeholder="Enter password" icon={Lock} {...f("p")} {...sharedField} />
      <button type="button" onClick={() => setPanel("forgot")} style={{ ...linkStyle, textAlign: "right", marginTop: -6 }}>Forgot password?</button>
      <button type="submit" className="login-btn" disabled={loading || !u || !p} style={btnStyle}>
        {loading ? <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />Signing in…</> : "Sign In →"}
      </button>
      <p style={{ textAlign: "center", color: textMuted, fontSize: 13, marginTop: 4 }}>
        Don't have an account?{" "}
        <button type="button" onClick={() => setPanel("signup")} style={linkStyle}>Sign up</button>
      </p>
    </form>
  );

  if (panel === "signup") return (
    <form onSubmit={handleSignup} style={{ display: "flex", flexDirection: "column", gap: 13, animation: "slideLeft 0.45s cubic-bezier(0.34,1.56,0.64,1)" }}>
      <Field label="Full Name" value={name} onChange={setName} placeholder="e.g. John Kamau" icon={User} {...f("n")} {...sharedField} />
      <Field label="Username" value={u} onChange={setU} placeholder="Choose a username" icon={User} {...f("u")} {...sharedField} />
      <Field label="Password" type="password" value={p} onChange={setP} placeholder="Min. 6 characters" icon={Lock} {...f("p")} {...sharedField} />
      <Field label="Confirm Password" type="password" value={p2} onChange={setP2} placeholder="Repeat password" icon={Lock} {...f("p2")} {...sharedField} />
      <button type="submit" className="login-btn" disabled={loading || !name || !u || !p || !p2} style={btnStyle}>
        {loading ? <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />Creating account…</> : <><UserPlus size={16} />Create Account</>}
      </button>
      <p style={{ textAlign: "center", color: textMuted, fontSize: 12, marginTop: 2, fontStyle: "italic" }}>
        New accounts require admin approval before login.
      </p>
      <p style={{ textAlign: "center", color: textMuted, fontSize: 13 }}>
        Already have an account?{" "}
        <button type="button" onClick={() => setPanel("login")} style={linkStyle}>Sign in</button>
      </p>
    </form>
  );

  // forgot
  return (
    <form onSubmit={handleForgot} style={{ display: "flex", flexDirection: "column", gap: 14, animation: "fadeUp 0.4s ease" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <button type="button" onClick={() => setPanel("login")} style={{ ...linkStyle, display: "flex", alignItems: "center", gap: 4, fontSize: 13 }}>
          <ArrowLeft size={14} /> Back to login
        </button>
      </div>
      <p style={{ color: textMuted, fontSize: 13, lineHeight: 1.5 }}>Enter your username and contact your administrator to receive a reset token.</p>
      <Field label="Username" value={u} onChange={setU} placeholder="Your username" icon={User} {...f("u")} {...sharedField} />
      <button type="submit" className="login-btn" disabled={loading || !u} style={btnStyle}>
        {loading ? <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />Sending…</> : "Request Password Reset"}
      </button>
    </form>
  );
}

// ─── Panel titles ─────────────────────────────────────────────────────────
const PANEL_META = {
  login:  { title: "Login",            sub: "Welcome back — sign in to continue" },
  signup: { title: "Create Account",   sub: "Join the hospital stores system" },
  forgot: { title: "Forgot Password",  sub: "We'll help you get back in" },
};

const WELCOME_META = {
  login:  { title: "WELCOME\nBACK!",   body: "We are happy to have you back. Access your hospital stores system securely and efficiently." },
  signup: { title: "JOIN US\nTODAY!",  body: "Create your account to start managing hospital inventory. Your account will be reviewed by an administrator." },
  forgot: { title: "DON'T\nWORRY!",   body: "We will help you reset your password. Contact your system administrator after submitting your username." },
};

// ─── Effect wrappers — all share the split-panel DNA ─────────────────────

// SPLIT — exact match to the image
function SplitLayout({ panel, setPanel, accentColor, accentGrad, bg, formBg, formBorder, inputBg, inputBorder, textMuted, logoEmoji, hospitalName, shake, onLogin, onSignup, onForgot, particleColor }: any) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setTimeout(() => setMounted(true), 80); }, []);
  const meta = PANEL_META[panel as Panel];
  const welcome = WELCOME_META[panel as Panel];
  const isSignup = panel === "signup";

  return (
    <div style={{ minHeight: "100vh", background: bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <style>{BASE_CSS}</style>
      <div style={{ width: "100%", maxWidth: 860, borderRadius: 22, overflow: "hidden", boxShadow: "0 32px 80px rgba(0,0,0,0.6)", display: "flex", flexDirection: isSignup ? "row-reverse" : "row", minHeight: 500, animation: shake ? "shake 0.5s ease" : undefined, transition: "flex-direction 0.4s" }}>

        {/* Form side */}
        <div style={{ flex: 1, background: formBg, padding: "44px 40px", display: "flex", flexDirection: "column", justifyContent: "center",
          opacity: mounted ? 1 : 0, transform: mounted ? "translateX(0)" : isSignup ? "translateX(60px)" : "translateX(-60px)", transition: "all 0.65s cubic-bezier(0.34,1.56,0.64,1)" }}>
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 30, marginBottom: 6 }}>{logoEmoji}</div>
            <h2 style={{ color: "#fff", fontSize: 24, fontWeight: 800, margin: 0 }}>{meta.title}</h2>
            <p style={{ color: textMuted, fontSize: 13, marginTop: 4 }}>{meta.sub}</p>
          </div>
          <FormContent {...{ panel, setPanel, onLogin, onSignup, onForgot, accentColor, inputBg, inputBorder, textMuted, shake }} />
        </div>

        {/* Welcome side */}
        <div style={{ width: 290, background: accentGrad, padding: "44px 30px", display: "flex", flexDirection: "column", justifyContent: "center", position: "relative", overflow: "hidden",
          opacity: mounted ? 1 : 0, transform: mounted ? "translateX(0)" : isSignup ? "translateX(-60px)" : "translateX(60px)", transition: "all 0.65s cubic-bezier(0.34,1.56,0.64,1) 0.08s" }}>
          {particleColor && <div style={{ position: "absolute", inset: 0 }}><ParticleCanvas color={particleColor} /></div>}
          <div style={{ position: "absolute", top: -70, right: -70, width: 220, height: 220, borderRadius: "50%", background: "rgba(255,255,255,0.07)" }} />
          <div style={{ position: "absolute", bottom: -50, left: -50, width: 180, height: 180, borderRadius: "50%", background: "rgba(255,255,255,0.05)" }} />
          <div style={{ position: "absolute", top: "40%", left: "30%", width: 120, height: 120, borderRadius: "50%", background: "rgba(255,255,255,0.04)" }} />
          <div style={{ position: "relative", zIndex: 1 }}>
            <h1 style={{ color: "white", fontSize: 28, fontWeight: 900, lineHeight: 1.2, marginBottom: 14, whiteSpace: "pre-line" }}>{welcome.title}</h1>
            <p style={{ color: "rgba(255,255,255,0.82)", fontSize: 13, lineHeight: 1.65, marginBottom: 22 }}>{welcome.body}</p>
            <div style={{ background: "rgba(255,255,255,0.14)", borderRadius: 12, padding: "10px 14px", backdropFilter: "blur(8px)" }}>
              <p style={{ color: "white", fontSize: 12, fontWeight: 600, margin: 0 }}>🏥 {hospitalName}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Effect themes ─────────────────────────────────────────────────────────
const EFFECT_THEMES: Record<Effect, any> = {
  split: {
    bg: "#111827", formBg: "#1a1a2e", formBorder: "#2d2d44",
    inputBg: "#0f0f1e", inputBorder: "#2d2d44", textMuted: "#6b7280",
    accentColor: "#f97316", accentGrad: "linear-gradient(145deg,#f97316 0%,#dc2626 65%,#7c2d12 100%)",
    particleColor: null,
  },
  particles: {
    bg: "#05050f", formBg: "rgba(15,15,35,0.95)", formBorder: "#1e1e40",
    inputBg: "rgba(255,255,255,0.05)", inputBorder: "rgba(255,255,255,0.1)", textMuted: "rgba(200,200,230,0.55)",
    accentColor: "#6366f1", accentGrad: "linear-gradient(145deg,#6366f1 0%,#8b5cf6 65%,#4f46e5 100%)",
    particleColor: "99,102,241",
  },
  glass: {
    bg: "#0d0d1f", formBg: "rgba(255,255,255,0.07)", formBorder: "rgba(255,255,255,0.1)",
    inputBg: "rgba(255,255,255,0.07)", inputBorder: "rgba(255,255,255,0.12)", textMuted: "rgba(200,200,230,0.5)",
    accentColor: "#10b981", accentGrad: "linear-gradient(145deg,#10b981 0%,#059669 65%,#065f46 100%)",
    particleColor: "16,185,129",
  },
  wave: {
    bg: "#0a0a1a", formBg: "rgba(10,10,30,0.92)", formBorder: "rgba(255,255,255,0.12)",
    inputBg: "rgba(255,255,255,0.08)", inputBorder: "rgba(255,255,255,0.15)", textMuted: "rgba(200,200,230,0.55)",
    accentColor: "#e11d48", accentGrad: "linear-gradient(145deg,#e11d48 0%,#f97316 65%,#dc2626 100%)",
    particleColor: "225,29,72",
  },
  gradient: {
    bg: "#0f0c29", formBg: "rgba(20,15,50,0.88)", formBorder: "rgba(255,255,255,0.1)",
    inputBg: "rgba(255,255,255,0.07)", inputBorder: "rgba(255,255,255,0.12)", textMuted: "rgba(200,200,230,0.5)",
    accentColor: "#ec4899", accentGrad: "linear-gradient(145deg,#ec4899 0%,#8b5cf6 65%,#6366f1 100%)",
    particleColor: "236,72,153",
  },
};

// Extra background overlays per effect
function EffectBg({ effect }: { effect: Effect }) {
  if (effect === "wave") return (
    <div style={{ position: "fixed", inset: 0, zIndex: 0, background: "linear-gradient(-45deg,#ee7752,#e73c7e,#23a6d5,#23d5ab)", backgroundSize: "400% 400%", animation: "wave 12s ease infinite", opacity: 0.15 }} />
  );
  if (effect === "gradient") return (
    <>
      <div style={{ position: "fixed", top: "8%", left: "8%", width: 350, height: 350, borderRadius: "50%", background: "radial-gradient(circle,rgba(236,72,153,0.2),transparent 65%)", animation: "blob 9s ease-in-out infinite", filter: "blur(30px)", zIndex: 0 }} />
      <div style={{ position: "fixed", bottom: "8%", right: "8%", width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle,rgba(99,102,241,0.2),transparent 65%)", animation: "blob2 11s ease-in-out infinite", filter: "blur(25px)", zIndex: 0 }} />
    </>
  );
  if (effect === "glass") return (
    <>
      <div style={{ position: "fixed", top: "5%", right: "5%", width: 320, height: 320, borderRadius: "50%", background: "radial-gradient(circle,rgba(16,185,129,0.15),transparent 65%)", animation: "blob 8s ease-in-out infinite", filter: "blur(35px)", zIndex: 0 }} />
      <div style={{ position: "fixed", bottom: "5%", left: "5%", width: 280, height: 280, borderRadius: "50%", background: "radial-gradient(circle,rgba(59,130,246,0.12),transparent 65%)", animation: "blob2 10s ease-in-out infinite", filter: "blur(30px)", zIndex: 0 }} />
    </>
  );
  if (effect === "particles") return (
    <div style={{ position: "fixed", inset: 0, zIndex: 0 }}><ParticleCanvas color="99,102,241" /></div>
  );
  return null;
}

// ─── Main Login ────────────────────────────────────────────────────────────
export default function LoginPage() {
  const { login } = useAuth();
  const { appLogo } = useTheme();
  const [panel, setPanel] = useState<Panel>("login");
  const [effect, setEffect] = useState<Effect>("split");
  const [shake, setShake] = useState(false);
  const [hospitalName, setHospitalName] = useState("Mukurweini Hospital Stores");
  const [allowSignup, setAllowSignup] = useState(false);
  const [effectIdx, setEffectIdx] = useState(0);
  const effects: Effect[] = ["split","particles","glass","wave","gradient"];

  const LogoEmoji = LOGOS[appLogo as keyof typeof LOGOS]?.emoji || "🏥";

  useEffect(() => {
    fetch("/api/settings/public").then(r => r.json()).then(s => {
      if (s.hospitalName) setHospitalName(s.hospitalName);
      if (s.loginEffect) setEffect(s.loginEffect as Effect);
      if (s.allowSelfRegistration) setAllowSignup(s.allowSelfRegistration);
    }).catch(() => {});
  }, []);

  // Reshuffle cycle effect
  const reshuffleEffect = () => {
    const next = (effectIdx + 1) % effects.length;
    setEffectIdx(next);
    setEffect(effects[next]);
  };

  const triggerShake = () => { setShake(true); setTimeout(() => setShake(false), 600); };

  const onLogin = async (u: string, p: string) => {
    try { await login({ data: { username: u, password: p } }); toast.success("Welcome back!"); }
    catch { triggerShake(); throw new Error("Invalid credentials"); }
  };

  const onSignup = async (fullName: string, username: string, password: string) => {
    const res = await fetch("/api/auth/register", {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName, username, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Registration failed");
    toast.success("Account created! Please wait for admin approval.");
    setPanel("login");
  };

  const onForgot = async (username: string) => {
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    toast.success("Request sent! Contact your administrator to receive your reset token.");
    setPanel("login");
  };

  const t = EFFECT_THEMES[effect];

  return (
    <div style={{ position: "relative", minHeight: "100vh", overflow: "hidden", background: t.bg }}>
      <style>{BASE_CSS + `@keyframes wave{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}} @keyframes blob{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(30px,-20px) scale(1.08)}} @keyframes blob2{0%,100%{transform:translate(0,0)}50%{transform:translate(-25px,30px)}}`}</style>

      <EffectBg effect={effect} />

      {/* Reshuffle button */}
      <button
        onClick={reshuffleEffect}
        title="Switch animation style"
        style={{ position: "fixed", top: 16, right: 16, zIndex: 100, background: "rgba(255,255,255,0.1)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 10, padding: "8px 14px", color: "white", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, transition: "all 0.2s" }}
      >
        🎨 {effects.indexOf(effect) + 1}/{effects.length}
      </button>

      <div style={{ position: "relative", zIndex: 10 }}>
        <SplitLayout
          panel={panel} setPanel={setPanel}
          accentColor={t.accentColor} accentGrad={t.accentGrad}
          bg="transparent" formBg={t.formBg} formBorder={t.formBorder}
          inputBg={t.inputBg} inputBorder={t.inputBorder} textMuted={t.textMuted}
          logoEmoji={LogoEmoji} hospitalName={hospitalName}
          shake={shake} onLogin={onLogin} onSignup={allowSignup ? onSignup : null} onForgot={onForgot}
          particleColor={t.particleColor}
        />
      </div>
    </div>
  );
}
