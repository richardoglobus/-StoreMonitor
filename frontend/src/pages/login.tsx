import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth-context";
import { Loader2, Eye, EyeOff, User, Lock } from "lucide-react";
import { toast } from "sonner";
import { useTheme, LOGOS } from "@/lib/theme-context";

// ── Particle canvas (used by "particles" effect) ─────────────────────────
function ParticleCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize();
    const ro = new ResizeObserver(resize); ro.observe(canvas);
    const pts = Array.from({ length: 50 }, () => ({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.5, vy: (Math.random() - 0.5) * 0.5,
    }));
    let raf: number;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      pts.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
        ctx.beginPath(); ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.4)"; ctx.fill();
        pts.forEach(p2 => {
          const d = Math.hypot(p.x - p2.x, p.y - p2.y);
          if (d < 100) { ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p2.x, p2.y); ctx.strokeStyle = `rgba(255,255,255,${0.12 * (1 - d / 100)})`; ctx.lineWidth = 0.5; ctx.stroke(); }
        });
      });
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);
  return <canvas ref={ref} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />;
}

// ── Effects config ────────────────────────────────────────────────────────
type Effect = "split" | "particles" | "glass" | "wave" | "gradient";

const EFFECTS: Record<Effect, { label: string; description: string }> = {
  split:     { label: "Split Panel",      description: "Classic left/right animated panels" },
  particles: { label: "Particle Network", description: "Floating connected particles" },
  glass:     { label: "Glassmorphism",    description: "Frosted glass card on dark background" },
  wave:      { label: "Wave Gradient",    description: "Animated flowing gradient" },
  gradient:  { label: "Mesh Gradient",    description: "Colourful animated mesh" },
};

// ── Form fields ───────────────────────────────────────────────────────────
function FormFields({ username, setUsername, password, setPassword, showPw, setShowPw, isLoading, focused, setFocused, inputStyle, labelColor, btnGradient }: any) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div>
        <label style={{ fontSize: 12, fontWeight: 600, color: labelColor, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>Username</label>
        <div style={{ position: "relative" }}>
          <User size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: focused === "u" ? "#f97316" : "#9ca3af" }} />
          <input value={username} onChange={e => setUsername(e.target.value)} onFocus={() => setFocused("u")} onBlur={() => setFocused(null)}
            placeholder="Enter username" required autoComplete="username"
            style={{ ...inputStyle, paddingLeft: 36, borderColor: focused === "u" ? "#f97316" : inputStyle.borderColor }} />
        </div>
      </div>
      <div>
        <label style={{ fontSize: 12, fontWeight: 600, color: labelColor, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>Password</label>
        <div style={{ position: "relative" }}>
          <Lock size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: focused === "p" ? "#f97316" : "#9ca3af" }} />
          <input type={showPw ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} onFocus={() => setFocused("p")} onBlur={() => setFocused(null)}
            placeholder="Enter password" required autoComplete="current-password"
            style={{ ...inputStyle, paddingLeft: 36, paddingRight: 40, borderColor: focused === "p" ? "#f97316" : inputStyle.borderColor }} />
          <button type="button" onClick={() => setShowPw(!showPw)}
            style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#9ca3af", display: "flex" }}>
            {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
      </div>
      <button type="submit" disabled={isLoading || !username || !password}
        style={{ padding: "13px", border: "none", borderRadius: 10, background: btnGradient, color: "white", fontWeight: 700, fontSize: 15,
          cursor: isLoading || !username || !password ? "not-allowed" : "pointer", opacity: !username || !password ? 0.6 : 1,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          boxShadow: "0 4px 20px rgba(249,115,22,0.35)", transition: "all 0.2s",
          marginTop: 4 }}>
        {isLoading ? <><Loader2 size={17} style={{ animation: "spin 1s linear infinite" }} />Signing in…</> : "Sign In →"}
      </button>
    </div>
  );
}

// ── Effect: Split Panel (like the image) ─────────────────────────────────
function SplitEffect({ username, setUsername, password, setPassword, showPw, setShowPw, isLoading, focused, setFocused, shake, logoEmoji, hospitalName }: any) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setTimeout(() => setMounted(true), 80); }, []);

  const baseInput = { width: "100%", padding: "11px 14px", background: "#1a1a2e", border: "1.5px solid #2d2d44", borderRadius: 9, color: "white", fontSize: 14, outline: "none", boxSizing: "border-box" as const, transition: "border-color 0.2s" };

  return (
    <div style={{ minHeight: "100vh", background: "#111827", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <style>{`
        @keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
        @keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-10px)}75%{transform:translateX(10px)}}
        @keyframes slideInLeft{from{opacity:0;transform:translateX(-60px)}to{opacity:1;transform:translateX(0)}}
        @keyframes slideInRight{from{opacity:0;transform:translateX(60px)}to{opacity:1;transform:translateX(0)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        .split-input:focus{border-color:#f97316!important;box-shadow:0 0 0 3px rgba(249,115,22,0.15)}
      `}</style>
      <div style={{ width: "100%", maxWidth: 820, borderRadius: 20, overflow: "hidden", boxShadow: "0 30px 80px rgba(0,0,0,0.6)", display: "flex", minHeight: 480, animation: shake ? "shake 0.5s ease" : undefined }}>

        {/* LEFT — Login form */}
        <div style={{ flex: 1, background: "#1a1a2e", padding: "48px 40px", display: "flex", flexDirection: "column", justifyContent: "center",
          opacity: mounted ? 1 : 0, transform: mounted ? "translateX(0)" : "translateX(-60px)", transition: "all 0.7s cubic-bezier(0.34,1.56,0.64,1)" }}>
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontSize: 28, marginBottom: 4 }}>{logoEmoji}</div>
            <h2 style={{ color: "white", fontSize: 26, fontWeight: 800, margin: 0 }}>Login</h2>
            <p style={{ color: "#6b7280", fontSize: 13, marginTop: 4 }}>Welcome back — sign in to continue</p>
          </div>
          <FormFields {...{ username, setUsername, password, setPassword, showPw, setShowPw, isLoading, focused, setFocused }}
            inputStyle={{ ...baseInput }} labelColor="#9ca3af" btnGradient="linear-gradient(135deg,#f97316,#dc2626)" />
        </div>

        {/* RIGHT — Welcome panel */}
        <div style={{ width: 300, background: "linear-gradient(145deg,#f97316 0%,#dc2626 60%,#7c2d12 100%)", padding: "48px 32px", display: "flex", flexDirection: "column", justifyContent: "center", position: "relative", overflow: "hidden",
          opacity: mounted ? 1 : 0, transform: mounted ? "translateX(0)" : "translateX(60px)", transition: "all 0.7s cubic-bezier(0.34,1.56,0.64,1) 0.1s" }}>
          {/* Decorative circles */}
          <div style={{ position: "absolute", top: -60, right: -60, width: 200, height: 200, borderRadius: "50%", background: "rgba(255,255,255,0.08)" }} />
          <div style={{ position: "absolute", bottom: -40, left: -40, width: 160, height: 160, borderRadius: "50%", background: "rgba(255,255,255,0.06)" }} />
          <div style={{ position: "relative", zIndex: 1 }}>
            <h1 style={{ color: "white", fontSize: 30, fontWeight: 900, lineHeight: 1.2, marginBottom: 16 }}>WELCOME<br />BACK!</h1>
            <p style={{ color: "rgba(255,255,255,0.8)", fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
              We are happy to have you with us again. Access your hospital stores system securely.
            </p>
            <div style={{ background: "rgba(255,255,255,0.15)", borderRadius: 12, padding: "12px 16px", backdropFilter: "blur(8px)" }}>
              <p style={{ color: "white", fontSize: 12, fontWeight: 600, margin: 0 }}>🏥 {hospitalName}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Effect: Glassmorphism ─────────────────────────────────────────────────
function GlassEffect({ username, setUsername, password, setPassword, showPw, setShowPw, isLoading, focused, setFocused, shake, logoEmoji, hospitalName }: any) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setTimeout(() => setMounted(true), 80); }, []);
  const baseInput = { width: "100%", padding: "11px 14px", background: "rgba(255,255,255,0.08)", border: "1.5px solid rgba(255,255,255,0.15)", borderRadius: 10, color: "white", fontSize: 14, outline: "none", boxSizing: "border-box" as const, transition: "all 0.2s", WebkitTextFillColor: "white" };
  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#0f0c29,#302b63,#24243e)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}} @keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-10px)}75%{transform:translateX(10px)}} @keyframes blob1{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(30px,-20px) scale(1.1)}} @keyframes blob2{0%,100%{transform:translate(0,0)}50%{transform:translate(-20px,30px)}}`}</style>
      <div style={{ position: "fixed", top: "10%", left: "10%", width: 350, height: 350, borderRadius: "50%", background: "radial-gradient(circle,rgba(99,102,241,0.2),transparent 70%)", animation: "blob1 8s ease-in-out infinite" }} />
      <div style={{ position: "fixed", bottom: "10%", right: "10%", width: 280, height: 280, borderRadius: "50%", background: "radial-gradient(circle,rgba(249,115,22,0.15),transparent 70%)", animation: "blob2 10s ease-in-out infinite" }} />
      <div style={{ position: "relative", zIndex: 10, width: "100%", maxWidth: 400, padding: "0 1rem",
        opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0) scale(1)" : "translateY(30px) scale(0.97)", transition: "all 0.6s cubic-bezier(0.34,1.56,0.64,1)", animation: shake ? "shake 0.5s ease" : undefined }}>
        <div style={{ background: "rgba(255,255,255,0.07)", backdropFilter: "blur(20px)", borderRadius: 24, border: "1px solid rgba(255,255,255,0.12)", boxShadow: "0 25px 60px rgba(0,0,0,0.5)", padding: "2.5rem 2rem" }}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{ fontSize: 48, marginBottom: 8, animation: "blob1 4s ease-in-out infinite" }}>{logoEmoji}</div>
            <h2 style={{ color: "white", fontSize: 22, fontWeight: 800, margin: 0 }}>Sign In</h2>
            <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 13, marginTop: 4 }}>{hospitalName}</p>
          </div>
          <FormFields {...{ username, setUsername, password, setPassword, showPw, setShowPw, isLoading, focused, setFocused }}
            inputStyle={baseInput} labelColor="rgba(255,255,255,0.6)" btnGradient="linear-gradient(135deg,#f97316,#6366f1)" />
        </div>
      </div>
    </div>
  );
}

// ── Effect: Wave Gradient ─────────────────────────────────────────────────
function WaveEffect({ username, setUsername, password, setPassword, showPw, setShowPw, isLoading, focused, setFocused, shake, logoEmoji, hospitalName }: any) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setTimeout(() => setMounted(true), 80); }, []);
  const baseInput = { width: "100%", padding: "11px 14px", background: "rgba(0,0,0,0.25)", border: "1.5px solid rgba(255,255,255,0.2)", borderRadius: 10, color: "white", fontSize: 14, outline: "none", boxSizing: "border-box" as const, transition: "all 0.2s" };
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, position: "relative", overflow: "hidden" }}>
      <style>{`
        @keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
        @keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-10px)}75%{transform:translateX(10px)}}
        @keyframes wave{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
      `}</style>
      <div style={{ position: "fixed", inset: 0, background: "linear-gradient(-45deg,#ee7752,#e73c7e,#23a6d5,#23d5ab)", backgroundSize: "400% 400%", animation: "wave 10s ease infinite" }} />
      <div style={{ position: "relative", zIndex: 10, width: "100%", maxWidth: 400,
        opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(30px)", transition: "all 0.6s ease", animation: shake ? "shake 0.5s ease" : undefined }}>
        <div style={{ background: "rgba(0,0,0,0.35)", backdropFilter: "blur(16px)", borderRadius: 24, border: "1px solid rgba(255,255,255,0.2)", padding: "2.5rem 2rem", boxShadow: "0 20px 60px rgba(0,0,0,0.4)" }}>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{ fontSize: 44, marginBottom: 8 }}>{logoEmoji}</div>
            <h2 style={{ color: "white", fontSize: 22, fontWeight: 800, margin: 0 }}>Hospital Stores</h2>
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, marginTop: 4 }}>{hospitalName}</p>
          </div>
          <FormFields {...{ username, setUsername, password, setPassword, showPw, setShowPw, isLoading, focused, setFocused }}
            inputStyle={baseInput} labelColor="rgba(255,255,255,0.75)" btnGradient="linear-gradient(135deg,#e73c7e,#ee7752)" />
        </div>
      </div>
    </div>
  );
}

// ── Effect: Particles ─────────────────────────────────────────────────────
function ParticlesEffect({ username, setUsername, password, setPassword, showPw, setShowPw, isLoading, focused, setFocused, shake, logoEmoji, hospitalName }: any) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setTimeout(() => setMounted(true), 80); }, []);
  const baseInput = { width: "100%", padding: "11px 14px", background: "rgba(255,255,255,0.06)", border: "1.5px solid rgba(255,255,255,0.12)", borderRadius: 10, color: "white", fontSize: 14, outline: "none", boxSizing: "border-box" as const, transition: "all 0.2s" };
  return (
    <div style={{ minHeight: "100vh", background: "#050510", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, position: "relative", overflow: "hidden" }}>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}} @keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-10px)}75%{transform:translateX(10px)}}`}</style>
      <div style={{ position: "fixed", inset: 0 }}><ParticleCanvas /></div>
      <div style={{ position: "relative", zIndex: 10, width: "100%", maxWidth: 400,
        opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(30px)", transition: "all 0.7s ease", animation: shake ? "shake 0.5s ease" : undefined }}>
        <div style={{ background: "rgba(255,255,255,0.05)", backdropFilter: "blur(20px)", borderRadius: 24, border: "1px solid rgba(255,255,255,0.1)", padding: "2.5rem 2rem", boxShadow: "0 25px 60px rgba(0,0,0,0.6)" }}>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{ fontSize: 44, marginBottom: 8 }}>{logoEmoji}</div>
            <h2 style={{ color: "white", fontSize: 22, fontWeight: 800 }}>Sign In</h2>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, marginTop: 4 }}>{hospitalName}</p>
          </div>
          <FormFields {...{ username, setUsername, password, setPassword, showPw, setShowPw, isLoading, focused, setFocused }}
            inputStyle={baseInput} labelColor="rgba(255,255,255,0.55)" btnGradient="linear-gradient(135deg,#6366f1,#8b5cf6)" />
        </div>
      </div>
    </div>
  );
}

// ── Effect: Mesh Gradient ─────────────────────────────────────────────────
function MeshEffect({ username, setUsername, password, setPassword, showPw, setShowPw, isLoading, focused, setFocused, shake, logoEmoji, hospitalName }: any) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setTimeout(() => setMounted(true), 80); }, []);
  const baseInput = { width: "100%", padding: "11px 14px", background: "rgba(255,255,255,0.1)", border: "1.5px solid rgba(255,255,255,0.2)", borderRadius: 10, color: "white", fontSize: 14, outline: "none", boxSizing: "border-box" as const, transition: "all 0.2s" };
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, position: "relative", overflow: "hidden",
      background: "linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%)" }}>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}} @keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-10px)}75%{transform:translateX(10px)}} @keyframes mesh1{0%,100%{transform:translate(0,0)}50%{transform:translate(40px,20px)}} @keyframes mesh2{0%,100%{transform:translate(0,0)}50%{transform:translate(-30px,40px)}}`}</style>
      <div style={{ position: "fixed", top: "5%", left: "5%", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle,rgba(236,72,153,0.3),transparent 60%)", animation: "mesh1 8s ease-in-out infinite", filter: "blur(40px)" }} />
      <div style={{ position: "fixed", bottom: "5%", right: "5%", width: 350, height: 350, borderRadius: "50%", background: "radial-gradient(circle,rgba(59,130,246,0.3),transparent 60%)", animation: "mesh2 10s ease-in-out infinite", filter: "blur(40px)" }} />
      <div style={{ position: "fixed", top: "40%", right: "20%", width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle,rgba(16,185,129,0.2),transparent 60%)", filter: "blur(30px)" }} />
      <div style={{ position: "relative", zIndex: 10, width: "100%", maxWidth: 400,
        opacity: mounted ? 1 : 0, transform: mounted ? "scale(1)" : "scale(0.9)", transition: "all 0.6s cubic-bezier(0.34,1.56,0.64,1)", animation: shake ? "shake 0.5s ease" : undefined }}>
        <div style={{ background: "rgba(255,255,255,0.08)", backdropFilter: "blur(24px)", borderRadius: 28, border: "1px solid rgba(255,255,255,0.15)", padding: "2.5rem 2rem", boxShadow: "0 30px 80px rgba(0,0,0,0.5)" }}>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{ fontSize: 44, marginBottom: 8 }}>{logoEmoji}</div>
            <h2 style={{ background: "linear-gradient(135deg,#ec4899,#6366f1,#10b981)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", fontSize: 24, fontWeight: 900, margin: 0 }}>Sign In</h2>
            <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 13, marginTop: 4 }}>{hospitalName}</p>
          </div>
          <FormFields {...{ username, setUsername, password, setPassword, showPw, setShowPw, isLoading, focused, setFocused }}
            inputStyle={baseInput} labelColor="rgba(255,255,255,0.6)" btnGradient="linear-gradient(135deg,#ec4899,#6366f1)" />
        </div>
      </div>
    </div>
  );
}

// ── Main Login ─────────────────────────────────────────────────────────────
export default function LoginPage() {
  const { login } = useAuth();
  const { appLogo } = useTheme();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const [effect, setEffect] = useState<Effect>("split");
  const [hospitalName, setHospitalName] = useState("Mukurweini Hospital Stores");

  const LogoEmoji = LOGOS[appLogo as keyof typeof LOGOS]?.emoji || "🏥";

  useEffect(() => {
    fetch("/api/settings/public").then(r => r.json()).then(s => {
      if (s.hospitalName) setHospitalName(s.hospitalName);
      if (s.loginEffect) setEffect(s.loginEffect as Effect);
    }).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;
    setIsLoading(true);
    try {
      await login({ data: { username, password } });
    } catch {
      toast.error("Invalid username or password");
      setShake(true);
      setTimeout(() => setShake(false), 600);
    } finally {
      setIsLoading(false);
    }
  };

  const props = { username, setUsername, password, setPassword, showPw, setShowPw, isLoading, focused, setFocused, shake, logoEmoji: LogoEmoji, hospitalName };

  return (
    <form onSubmit={handleSubmit} style={{ display: "contents" }}>
      {effect === "split"     && <SplitEffect     {...props} />}
      {effect === "glass"     && <GlassEffect     {...props} />}
      {effect === "wave"      && <WaveEffect      {...props} />}
      {effect === "particles" && <ParticlesEffect {...props} />}
      {effect === "gradient"  && <MeshEffect      {...props} />}
    </form>
  );
}
