import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth-context";
import { Loader2, Eye, EyeOff, Activity } from "lucide-react";
import { toast } from "sonner";
import { useTheme, LOGOS } from "@/lib/theme-context";

// Floating particle
interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  opacity: number;
  color: string;
}

function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useRef<Particle[]>([]);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const colors = ["#6366f1","#8b5cf6","#3b82f6","#06b6d4","#10b981","#f59e0b"];

    // Create particles
    particles.current = Array.from({ length: 60 }, (_, i) => ({
      id: i,
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 4 + 1,
      speedX: (Math.random() - 0.5) * 0.6,
      speedY: (Math.random() - 0.5) * 0.6,
      opacity: Math.random() * 0.5 + 0.1,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.current.forEach(p => {
        // Move
        p.x += p.speedX;
        p.y += p.speedY;

        // Wrap around
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        // Draw circle
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color + Math.floor(p.opacity * 255).toString(16).padStart(2, "0");
        ctx.fill();

        // Draw connections
        particles.current.forEach(p2 => {
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(99,102,241,${0.08 * (1 - dist / 120)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        });
      });

      animRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}

// Animated ECG/heartbeat line
function HeartbeatLine() {
  return (
    <svg viewBox="0 0 200 40" className="w-32 h-8 opacity-60" style={{ overflow: "visible" }}>
      <polyline
        points="0,20 30,20 40,5 50,35 60,20 80,20 90,10 100,30 110,20 200,20"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="text-primary"
        strokeDasharray="300"
        style={{
          animation: "dash 2s linear infinite",
        }}
      />
      <style>{`@keyframes dash { from { stroke-dashoffset: 300; } to { stroke-dashoffset: 0; } }`}</style>
    </svg>
  );
}

export default function LoginPage() {
  const { login } = useAuth();
  const { appLogo } = useTheme();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);
  const [shake, setShake] = useState(false);

  useEffect(() => {
    setTimeout(() => setMounted(true), 100);
  }, []);

  const LogoEmoji = LOGOS[appLogo as keyof typeof LOGOS]?.emoji || "🏥";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;
    setIsLoading(true);
    try {
      await login({ data: { username, password } });
      toast.success("Welcome back!");
    } catch {
      toast.error("Invalid username or password");
      setShake(true);
      setTimeout(() => setShake(false), 600);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden"
      style={{ background: "linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)" }}>

      {/* Animated particle background */}
      <ParticleCanvas />

      {/* Blurred glow orbs */}
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 1 }}>
        <div style={{
          position: "absolute", top: "15%", left: "10%",
          width: 300, height: 300, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)",
          animation: "float1 8s ease-in-out infinite",
        }} />
        <div style={{
          position: "absolute", bottom: "20%", right: "10%",
          width: 250, height: 250, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)",
          animation: "float2 10s ease-in-out infinite",
        }} />
        <div style={{
          position: "absolute", top: "50%", right: "20%",
          width: 200, height: 200, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(6,182,212,0.12) 0%, transparent 70%)",
          animation: "float3 7s ease-in-out infinite",
        }} />
      </div>

      <style>{`
        @keyframes float1 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(30px,-20px) scale(1.1)} }
        @keyframes float2 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(-20px,30px) scale(0.9)} }
        @keyframes float3 { 0%,100%{transform:translate(0,0)} 33%{transform:translate(15px,15px)} 66%{transform:translate(-15px,10px)} }
        @keyframes slideUp { from{opacity:0;transform:translateY(40px)} to{opacity:1;transform:translateY(0)} }
        @keyframes logoFloat { 0%,100%{transform:translateY(0) rotate(0deg)} 50%{transform:translateY(-8px) rotate(3deg)} }
        @keyframes shimmer { 0%{background-position:-200% center} 100%{background-position:200% center} }
        @keyframes shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-8px)} 40%{transform:translateX(8px)} 60%{transform:translateX(-8px)} 80%{transform:translateX(8px)} }
        @keyframes pulse-ring { 0%{transform:scale(0.8);opacity:0.8} 100%{transform:scale(1.4);opacity:0} }
        @keyframes rotate-border { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }
        .input-glow:focus { box-shadow: 0 0 0 2px rgba(99,102,241,0.4), 0 0 20px rgba(99,102,241,0.15); }
        .btn-glow:hover:not(:disabled) { box-shadow: 0 0 20px rgba(99,102,241,0.5); transform: translateY(-1px); }
        .btn-glow:active:not(:disabled) { transform: translateY(0); }
      `}</style>

      {/* Login card */}
      <div
        style={{
          position: "relative",
          zIndex: 10,
          width: "100%",
          maxWidth: 420,
          padding: "0 1rem",
          opacity: mounted ? 1 : 0,
          transform: mounted ? "translateY(0)" : "translateY(40px)",
          transition: "opacity 0.7s ease, transform 0.7s ease",
          animation: shake ? "shake 0.6s ease" : undefined,
        }}
      >
        {/* Glass card */}
        <div style={{
          background: "rgba(255,255,255,0.07)",
          backdropFilter: "blur(20px)",
          borderRadius: 24,
          border: "1px solid rgba(255,255,255,0.12)",
          boxShadow: "0 25px 50px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)",
          padding: "2.5rem 2rem",
        }}>

          {/* Logo section */}
          <div className="flex flex-col items-center mb-8">
            {/* Animated logo with pulse rings */}
            <div style={{ position: "relative", marginBottom: 16 }}>
              <div style={{
                position: "absolute", inset: -8, borderRadius: "50%",
                border: "2px solid rgba(99,102,241,0.4)",
                animation: "pulse-ring 2s ease-out infinite",
              }} />
              <div style={{
                position: "absolute", inset: -4, borderRadius: "50%",
                border: "2px solid rgba(99,102,241,0.2)",
                animation: "pulse-ring 2s ease-out infinite 0.5s",
              }} />
              <div style={{
                width: 72, height: 72, borderRadius: "50%",
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 32,
                boxShadow: "0 8px 32px rgba(99,102,241,0.4)",
                animation: "logoFloat 4s ease-in-out infinite",
              }}>
                {LogoEmoji}
              </div>
            </div>

            {/* Heartbeat line */}
            <HeartbeatLine />

            <h1 style={{
              color: "white", fontWeight: 700, fontSize: 20,
              textAlign: "center", marginTop: 12, marginBottom: 4,
              background: "linear-gradient(90deg, #fff, #a5b4fc, #fff)",
              backgroundSize: "200% auto",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              animation: "shimmer 3s linear infinite",
            }}>
              Mukurweini Hospital Stores
            </h1>
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, textAlign: "center" }}>
              Sign in to access the system
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Username */}
            <div>
              <label style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, fontWeight: 500, display: "block", marginBottom: 6 }}>
                Username
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  onFocus={() => setFocused("username")}
                  onBlur={() => setFocused(null)}
                  placeholder="Enter username"
                  required
                  className="input-glow"
                  style={{
                    width: "100%", padding: "11px 16px",
                    background: focused === "username" ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.07)",
                    border: `1px solid ${focused === "username" ? "rgba(99,102,241,0.6)" : "rgba(255,255,255,0.12)"}`,
                    borderRadius: 12, color: "white", fontSize: 14, outline: "none",
                    transition: "all 0.3s ease",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, fontWeight: 500, display: "block", marginBottom: 6 }}>
                Password
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onFocus={() => setFocused("password")}
                  onBlur={() => setFocused(null)}
                  placeholder="Enter password"
                  required
                  className="input-glow"
                  style={{
                    width: "100%", padding: "11px 44px 11px 16px",
                    background: focused === "password" ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.07)",
                    border: `1px solid ${focused === "password" ? "rgba(99,102,241,0.6)" : "rgba(255,255,255,0.12)"}`,
                    borderRadius: 12, color: "white", fontSize: 14, outline: "none",
                    transition: "all 0.3s ease",
                    boxSizing: "border-box",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none", cursor: "pointer",
                    color: "rgba(255,255,255,0.4)", display: "flex", alignItems: "center",
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={isLoading || !username || !password}
              className="btn-glow"
              style={{
                marginTop: 8,
                padding: "13px",
                background: isLoading ? "rgba(99,102,241,0.5)" : "linear-gradient(135deg, #6366f1, #8b5cf6)",
                border: "none", borderRadius: 12,
                color: "white", fontWeight: 600, fontSize: 15,
                cursor: isLoading ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                transition: "all 0.3s ease",
                boxShadow: "0 4px 15px rgba(99,102,241,0.3)",
                opacity: !username || !password ? 0.6 : 1,
              }}
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
                  Signing in…
                </>
              ) : (
                <>
                  <Activity size={18} />
                  Sign In
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <p style={{ color: "rgba(255,255,255,0.25)", fontSize: 11, textAlign: "center", marginTop: 24 }}>
            Mukurweini Sub-County Hospital • Secure Access
          </p>
        </div>
      </div>
    </div>
  );
}
