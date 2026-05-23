import { API_BASE } from "@/lib/api";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth-context";
import { Loader2, Eye, EyeOff, User, Lock, UserPlus, ArrowLeft, Copy, CheckCircle, Download, X } from "lucide-react";
import { toast } from "sonner";
import { useTheme, LOGOS } from "@/lib/theme-context";

type Panel = "login" | "signup" | "forgot" | "reset_token";
type Effect = "split" | "particles" | "glass" | "wave" | "gradient";

// ── Particle canvas ───────────────────────────────────────────────────────
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
          if (d < 110) { ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p2.x, p2.y); ctx.strokeStyle = `rgba(${color},${0.12*(1-d/110)})`; ctx.lineWidth=0.6; ctx.stroke(); }
        });
      });
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);
  return <canvas ref={ref} style={{ position:"absolute", inset:0, width:"100%", height:"100%" }} />;
}


// ── PWA Install Banner ────────────────────────────────────────────────────
function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [dismissed, setDismissed] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed (standalone mode)
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true);
      return;
    }
    const handler = (e: any) => { e.preventDefault(); setDeferredPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => setInstalled(true));
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setInstalled(true);
    setDeferredPrompt(null);
  };

  if (installed || dismissed) return null;

  // On iOS Safari — no beforeinstallprompt, show manual instructions
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as any).MSStream;
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
      background: 'linear-gradient(135deg, #0f766e, #0d9488)',
      padding: '12px 16px', display: 'flex', alignItems: 'center',
      gap: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
      animation: 'fadeUp 0.4s ease'
    }}>
      <img src="/icons/icon-72x72.png" alt="App icon"
        style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ color: '#fff', fontWeight: 700, fontSize: 13, margin: 0 }}>
          Install Mukurweini Hospital Stores App
        </p>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11, margin: '2px 0 0' }}>
          {isIOS && isSafari
            ? 'Tap the Share button below, then "Add to Home Screen"'
            : deferredPrompt
              ? 'Install for quick access — works offline too'
              : 'Open in Chrome or Edge to install this app'}
        </p>
      </div>
      {deferredPrompt && (
        <button onClick={handleInstall} style={{
          background: '#fff', color: '#0f766e', border: 'none',
          borderRadius: 8, padding: '8px 14px', fontWeight: 700,
          fontSize: 12, cursor: 'pointer', display: 'flex',
          alignItems: 'center', gap: 5, flexShrink: 0, whiteSpace: 'nowrap'
        }}>
          <Download size={13} /> Install
        </button>
      )}
      <button onClick={() => setDismissed(true)} style={{
        background: 'rgba(255,255,255,0.15)', border: 'none',
        borderRadius: 6, padding: 6, cursor: 'pointer',
        color: '#fff', display: 'flex', flexShrink: 0
      }}>
        <X size={14} />
      </button>
    </div>
  );
}

const BASE_CSS = `
  @keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
  @keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-10px)}40%{transform:translateX(10px)}60%{transform:translateX(-8px)}80%{transform:translateX(8px)}}
  @keyframes slideLeft{from{opacity:0;transform:translateX(60px)}to{opacity:1;transform:translateX(0)}}
  @keyframes slideRight{from{opacity:0;transform:translateX(-60px)}to{opacity:1;transform:translateX(0)}}
  @keyframes fadeUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
  @keyframes wave{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
  @keyframes blob{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(30px,-20px) scale(1.08)}}
  @keyframes blob2{0%,100%{transform:translate(0,0)}50%{transform:translate(-25px,30px)}}
  .login-input:focus{outline:none;}
  .login-btn:hover:not(:disabled){transform:translateY(-1px);filter:brightness(1.1);}
  .login-btn:active:not(:disabled){transform:translateY(0);}
`;

function Field({ label, type="text", value, onChange, placeholder, icon:Icon, focused, onFocus, onBlur, accentColor, inputBg, inputBorder, textColor }: any) {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";
  return (
    <div>
      <label style={{fontSize:11,fontWeight:700,color:textColor,display:"block",marginBottom:5,textTransform:"uppercase",letterSpacing:1.2}}>{label}</label>
      <div style={{position:"relative"}}>
        {Icon && <Icon size={14} style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",color:focused?accentColor:"rgba(150,150,180,0.8)",transition:"color 0.2s"}}/>}
        <input className="login-input" type={isPassword?(show?"text":"password"):type} value={value} onChange={e=>onChange(e.target.value)}
          onFocus={onFocus} onBlur={onBlur} placeholder={placeholder} required
          style={{width:"100%",padding:`11px ${isPassword?"40px":"14px"} 11px ${Icon?"34px":"14px"}`,background:inputBg,border:`1.5px solid ${focused?accentColor:inputBorder}`,borderRadius:10,color:"#fff",fontSize:14,boxSizing:"border-box" as const,transition:"border-color 0.2s, box-shadow 0.2s",boxShadow:focused?`0 0 0 3px ${accentColor}28`:"none"}}
        />
        {isPassword && (
          <button type="button" onClick={()=>setShow(!show)} style={{position:"absolute",right:11,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:"rgba(150,150,180,0.8)",display:"flex"}}>
            {show?<EyeOff size={14}/>:<Eye size={14}/>}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Form panels ───────────────────────────────────────────────────────────
function FormContent({ panel, setPanel, onLogin, onSignup, accentColor, inputBg, inputBorder, textMuted, allowSignup, resetTokenData, setResetTokenData }: any) {
  const [u,setU]=useState(""); const [p,setP]=useState(""); const [p2,setP2]=useState("");
  const [name,setName]=useState(""); const [loading,setLoading]=useState(false);
  const [focused,setFocused]=useState<string|null>(null);
  const [copied,setCopied]=useState(false);
  const f=(id:string)=>({focused:focused===id,onFocus:()=>setFocused(id),onBlur:()=>setFocused(null)});
  const shared={accentColor,inputBg,inputBorder,textColor:textMuted};

  const btnStyle:any={width:"100%",padding:"13px",border:"none",borderRadius:10,background:`linear-gradient(135deg,${accentColor},${accentColor}cc)`,color:"white",fontWeight:700,fontSize:15,cursor:loading?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,boxShadow:`0 4px 20px ${accentColor}44`,transition:"all 0.2s",marginTop:6,opacity:loading?0.7:1};
  const linkStyle:any={color:accentColor,background:"none",border:"none",cursor:"pointer",fontSize:13,fontWeight:600,textDecoration:"underline",padding:0};

  const handleLogin=async(e:React.FormEvent)=>{e.preventDefault();if(!u||!p)return;setLoading(true);try{await onLogin(u,p);}catch{toast.error("Invalid username or password");}finally{setLoading(false);}};
  const handleSignup=async(e:React.FormEvent)=>{e.preventDefault();if(!name||!u||!p)return;if(p!==p2){toast.error("Passwords do not match");return;}if(p.length<6){toast.error("Password must be at least 6 characters");return;}setLoading(true);try{await onSignup(name,u,p);}catch(err:any){toast.error(err?.message||"Registration failed");}finally{setLoading(false);}};
  const handleForgot=async(e:React.FormEvent)=>{
    e.preventDefault();if(!u)return;setLoading(true);
    try{
      const res=await fetch(`${API_BASE}/api/auth/forgot-password`,{method:"POST",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify({username:u})});
      const data=await res.json();
      if(!res.ok)throw new Error(data.error);
      setResetTokenData(data);
      setPanel("reset_token");
    }catch(err:any){toast.error(err?.message||"Failed");}
    finally{setLoading(false);}
  };

  const copyToken=()=>{
    if(resetTokenData?.resetToken){navigator.clipboard.writeText(resetTokenData.resetToken);setCopied(true);setTimeout(()=>setCopied(false),2000);}
  };

  // ── Reset token panel ──────────────────────────────────────────────────
  if(panel==="reset_token") return (
    <div style={{animation:"fadeUp 0.4s ease",display:"flex",flexDirection:"column",gap:16}}>
      <div style={{background:"rgba(16,185,129,0.1)",border:"1px solid rgba(16,185,129,0.3)",borderRadius:12,padding:"14px 16px"}}>
        <p style={{color:"#10b981",fontWeight:700,fontSize:13,marginBottom:8}}>✅ Reset token generated!</p>
        <p style={{color:textMuted,fontSize:12,marginBottom:12,lineHeight:1.5}}>
          Share this token with <strong style={{color:"white"}}>{resetTokenData?.username}</strong>. They must give it to the administrator to complete the reset.
        </p>
        <div style={{background:"rgba(0,0,0,0.3)",borderRadius:8,padding:"10px 14px",fontFamily:"monospace",fontSize:13,color:"white",wordBreak:"break-all",marginBottom:10}}>
          {resetTokenData?.resetToken}
        </div>
        <button onClick={copyToken} style={{...btnStyle,marginTop:0,padding:"9px 16px",width:"auto",fontSize:13}}>
          {copied?<><CheckCircle size={14}/>Copied!</>:<><Copy size={14}/>Copy Token</>}
        </button>
        <p style={{color:textMuted,fontSize:11,marginTop:8}}>⏰ Expires in: {resetTokenData?.expiresIn}</p>
      </div>
      <p style={{color:textMuted,fontSize:12,lineHeight:1.5}}>
        To reset: go to <strong style={{color:"white"}}>Activity Log</strong> or the administrator can use the token at:<br/>
        <code style={{fontSize:11,color:accentColor}}>PATCH /api/auth/reset-password</code>
      </p>
      <button type="button" onClick={()=>{setPanel("login");setResetTokenData(null);}} style={{...linkStyle,textAlign:"center",display:"block"}}>← Back to Login</button>
    </div>
  );

  // ── Login panel ────────────────────────────────────────────────────────
  if(panel==="login") return (
    <form onSubmit={handleLogin} style={{display:"flex",flexDirection:"column",gap:14,animation:"slideRight 0.45s cubic-bezier(0.34,1.56,0.64,1)"}}>
      <Field label="Username" value={u} onChange={setU} placeholder="Enter username" icon={User} {...f("u")} {...shared}/>
      <Field label="Password" type="password" value={p} onChange={setP} placeholder="Enter password" icon={Lock} {...f("p")} {...shared}/>
      <button type="button" onClick={()=>setPanel("forgot")} style={{...linkStyle,textAlign:"right",marginTop:-6}}>Forgot password?</button>
      <button type="submit" className="login-btn" disabled={loading||!u||!p} style={btnStyle}>
        {loading?<><Loader2 size={16} style={{animation:"spin 1s linear infinite"}}/>Signing in…</>:"Sign In →"}
      </button>
      <p style={{textAlign:"center",color:textMuted,fontSize:13,marginTop:4}}>
        Don't have an account?{" "}
        <button type="button" onClick={()=>setPanel("signup")} style={linkStyle}>Sign up</button>
      </p>
    </form>
  );

  // ── Signup panel ───────────────────────────────────────────────────────
  if(panel==="signup") return (
    <form onSubmit={handleSignup} style={{display:"flex",flexDirection:"column",gap:12,animation:"slideLeft 0.45s cubic-bezier(0.34,1.56,0.64,1)"}}>
      <Field label="Full Name" value={name} onChange={setName} placeholder="e.g. John Kamau" icon={User} {...f("n")} {...shared}/>
      <Field label="Username" value={u} onChange={setU} placeholder="Choose a username" icon={User} {...f("u")} {...shared}/>
      <Field label="Password" type="password" value={p} onChange={setP} placeholder="Min. 6 characters" icon={Lock} {...f("p")} {...shared}/>
      <Field label="Confirm Password" type="password" value={p2} onChange={setP2} placeholder="Repeat password" icon={Lock} {...f("p2")} {...shared}/>
      <button type="submit" className="login-btn" disabled={loading||!name||!u||!p||!p2} style={btnStyle}>
        {loading?<><Loader2 size={16} style={{animation:"spin 1s linear infinite"}}/>Creating…</>:<><UserPlus size={16}/>Create Account</>}
      </button>
      <p style={{textAlign:"center",color:textMuted,fontSize:11,fontStyle:"italic"}}>{allowSignup?"New accounts require admin approval.":"Contact administrator if you cannot log in."}</p>
      <p style={{textAlign:"center",color:textMuted,fontSize:13}}>
        Already have an account?{" "}
        <button type="button" onClick={()=>setPanel("login")} style={linkStyle}>Sign in</button>
      </p>
    </form>
  );

  // ── Forgot panel ───────────────────────────────────────────────────────
  return (
    <form onSubmit={handleForgot} style={{display:"flex",flexDirection:"column",gap:14,animation:"fadeUp 0.4s ease"}}>
      <button type="button" onClick={()=>setPanel("login")} style={{...linkStyle,display:"flex",alignItems:"center",gap:4,fontSize:13}}>
        <ArrowLeft size={14}/> Back to login
      </button>
      <p style={{color:textMuted,fontSize:13,lineHeight:1.5}}>Enter your username. A reset token will be generated for your administrator to share with you.</p>
      <Field label="Username" value={u} onChange={setU} placeholder="Your username" icon={User} {...f("u")} {...shared}/>
      <button type="submit" className="login-btn" disabled={loading||!u} style={btnStyle}>
        {loading?<><Loader2 size={16} style={{animation:"spin 1s linear infinite"}}/>Generating…</>:"Get Reset Token"}
      </button>
    </form>
  );
}

// ── Panel meta ────────────────────────────────────────────────────────────
const PANEL_META:Record<string,any>={
  login:{title:"Login",sub:"Welcome back — sign in to continue"},
  signup:{title:"Create Account",sub:"Join the hospital stores system"},
  forgot:{title:"Forgot Password",sub:"We'll help you get back in"},
  reset_token:{title:"Reset Token",sub:"Share this with your administrator"},
};
const WELCOME_META:Record<string,any>={
  login:{title:"WELCOME\nBACK!",body:"Access your hospital stores system securely and efficiently."},
  signup:{title:"JOIN US\nTODAY!",body:"Create your account. An administrator will approve it before you can log in."},
  forgot:{title:"DON'T\nWORRY!",body:"We will generate a reset token. Your administrator will help you complete the password reset."},
  reset_token:{title:"ALMOST\nTHERE!",body:"Copy the token and give it to your system administrator. They will reset your password for you."},
};

// ── Effect themes ─────────────────────────────────────────────────────────
const EFFECT_THEMES:Record<Effect,any>={
  split:{bg:"#111827",formBg:"#1a1a2e",inputBg:"#0f0f1e",inputBorder:"#2d2d44",textMuted:"#6b7280",accentColor:"#f97316",accentGrad:"linear-gradient(145deg,#f97316 0%,#dc2626 65%,#7c2d12 100%)",particleColor:null},
  particles:{bg:"#05050f",formBg:"rgba(15,15,35,0.95)",inputBg:"rgba(255,255,255,0.05)",inputBorder:"rgba(255,255,255,0.1)",textMuted:"rgba(200,200,230,0.55)",accentColor:"#6366f1",accentGrad:"linear-gradient(145deg,#6366f1 0%,#8b5cf6 65%,#4f46e5 100%)",particleColor:"99,102,241"},
  glass:{bg:"#0d0d1f",formBg:"rgba(255,255,255,0.07)",inputBg:"rgba(255,255,255,0.07)",inputBorder:"rgba(255,255,255,0.12)",textMuted:"rgba(200,200,230,0.5)",accentColor:"#10b981",accentGrad:"linear-gradient(145deg,#10b981 0%,#059669 65%,#065f46 100%)",particleColor:"16,185,129"},
  wave:{bg:"#0a0a1a",formBg:"rgba(10,10,30,0.92)",inputBg:"rgba(255,255,255,0.08)",inputBorder:"rgba(255,255,255,0.15)",textMuted:"rgba(200,200,230,0.55)",accentColor:"#e11d48",accentGrad:"linear-gradient(145deg,#e11d48 0%,#f97316 65%,#dc2626 100%)",particleColor:"225,29,72"},
  gradient:{bg:"#0f0c29",formBg:"rgba(20,15,50,0.88)",inputBg:"rgba(255,255,255,0.07)",inputBorder:"rgba(255,255,255,0.12)",textMuted:"rgba(200,200,230,0.5)",accentColor:"#ec4899",accentGrad:"linear-gradient(145deg,#ec4899 0%,#8b5cf6 65%,#6366f1 100%)",particleColor:"236,72,153"},
};

function EffectBg({effect}:{effect:Effect}){
  if(effect==="wave") return <div style={{position:"fixed",inset:0,zIndex:0,background:"linear-gradient(-45deg,#ee7752,#e73c7e,#23a6d5,#23d5ab)",backgroundSize:"400% 400%",animation:"wave 12s ease infinite",opacity:0.15}}/>;
  if(effect==="gradient") return <><div style={{position:"fixed",top:"8%",left:"8%",width:350,height:350,borderRadius:"50%",background:"radial-gradient(circle,rgba(236,72,153,0.2),transparent 65%)",animation:"blob 9s ease-in-out infinite",filter:"blur(30px)",zIndex:0}}/><div style={{position:"fixed",bottom:"8%",right:"8%",width:300,height:300,borderRadius:"50%",background:"radial-gradient(circle,rgba(99,102,241,0.2),transparent 65%)",animation:"blob2 11s ease-in-out infinite",filter:"blur(25px)",zIndex:0}}/></>;
  if(effect==="glass") return <><div style={{position:"fixed",top:"5%",right:"5%",width:320,height:320,borderRadius:"50%",background:"radial-gradient(circle,rgba(16,185,129,0.15),transparent 65%)",animation:"blob 8s ease-in-out infinite",filter:"blur(35px)",zIndex:0}}/><div style={{position:"fixed",bottom:"5%",left:"5%",width:280,height:280,borderRadius:"50%",background:"radial-gradient(circle,rgba(59,130,246,0.12),transparent 65%)",animation:"blob2 10s ease-in-out infinite",filter:"blur(30px)",zIndex:0}}/></>;
  if(effect==="particles") return <div style={{position:"fixed",inset:0,zIndex:0}}><ParticleCanvas color="99,102,241"/></div>;
  return null;
}

// ── Main layout ───────────────────────────────────────────────────────────
export default function LoginPage(){
  const {login}=useAuth();
  const {appLogo}=useTheme();
  const [panel,setPanel]=useState<Panel>("login");
  const [effect,setEffect]=useState<Effect>("split");
  const [shake,setShake]=useState(false);
  const [hospitalName,setHospitalName]=useState("Mukurweini Hospital Stores");
  const [allowSignup,setAllowSignup]=useState(false);
  const [effectIdx,setEffectIdx]=useState(0);
  const [resetTokenData,setResetTokenData]=useState<any>(null);
  const effects:Effect[]=["split","particles","glass","wave","gradient"];
  const LogoEmoji=LOGOS[appLogo as keyof typeof LOGOS]?.emoji||"🏥";

  useEffect(()=>{
    fetch(`${API_BASE}/api/settings/public`).then(r=>r.json()).then(s=>{
      if(s.hospitalName) setHospitalName(s.hospitalName);
      if(s.loginEffect) setEffect(s.loginEffect as Effect);
      if(s.allowSelfRegistration) setAllowSignup(s.allowSelfRegistration);
    }).catch(()=>{});
  },[]);

  const reshuffleEffect=()=>{ const next=(effectIdx+1)%effects.length; setEffectIdx(next); setEffect(effects[next]); };

  const onLogin=async(u:string,p:string)=>{
    try{ await login({data:{username:u,password:p}}); toast.success("Welcome back!"); }
    catch{ setShake(true); setTimeout(()=>setShake(false),600); throw new Error(""); }
  };

  const onSignup=async(fullName:string,username:string,password:string)=>{
    const res=await fetch(`${API_BASE}/api/auth/register`,{method:"POST",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify({fullName,username,password})});
    const data=await res.json();
    if(!res.ok) throw new Error(data.error||"Registration failed");
    toast.success("Account created! Wait for admin approval.");
    setPanel("login");
  };

  const t=EFFECT_THEMES[effect];
  const meta=PANEL_META[panel]||PANEL_META.login;
  const welcome=WELCOME_META[panel]||WELCOME_META.login;
  const isSignup=panel==="signup";

  const [mounted,setMounted]=useState(false);
  useEffect(()=>{setTimeout(()=>setMounted(true),80);},[]);

  return (
    <div style={{position:"relative",minHeight:"100vh",overflow:"hidden",background:t.bg}}>
      <InstallBanner />
      <style>{BASE_CSS+`@keyframes wave{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}} @keyframes blob{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(30px,-20px) scale(1.08)}} @keyframes blob2{0%,100%{transform:translate(0,0)}50%{transform:translate(-25px,30px)}}`}</style>
      <EffectBg effect={effect}/>

      {/* Reshuffle button */}
      <button onClick={reshuffleEffect} title="Switch style" style={{position:"fixed",top:16,right:16,zIndex:100,background:"rgba(255,255,255,0.1)",backdropFilter:"blur(8px)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:10,padding:"8px 14px",color:"white",fontSize:12,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>
        🎨 {effects.indexOf(effect)+1}/{effects.length}
      </button>

      {/* Main card */}
      <div style={{position:"relative",zIndex:10,minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
        <div style={{width:"100%",maxWidth:860,borderRadius:22,overflow:"hidden",boxShadow:"0 32px 80px rgba(0,0,0,0.6)",display:"flex",flexDirection:isSignup?"row-reverse":"row",minHeight:520,animation:shake?"shake 0.5s ease":undefined,transition:"all 0.5s"}}>

          {/* Form panel */}
          <div style={{flex:1,background:t.formBg,padding:"44px 40px",display:"flex",flexDirection:"column",justifyContent:"center",backdropFilter:"blur(16px)",border:`1px solid ${t.inputBorder}`,opacity:mounted?1:0,transform:mounted?"translateX(0)":isSignup?"translateX(60px)":"translateX(-60px)",transition:"all 0.65s cubic-bezier(0.34,1.56,0.64,1)"}}>
            <div style={{marginBottom:28}}>
              <div style={{fontSize:32,marginBottom:6}}>{LogoEmoji}</div>
              <h2 style={{color:"#fff",fontSize:24,fontWeight:800,margin:0}}>{meta.title}</h2>
              <p style={{color:t.textMuted,fontSize:13,marginTop:4}}>{meta.sub}</p>
            </div>
            <FormContent panel={panel} setPanel={setPanel} onLogin={onLogin} onSignup={onSignup}
              accentColor={t.accentColor} inputBg={t.inputBg} inputBorder={t.inputBorder}
              textMuted={t.textMuted} allowSignup={allowSignup} resetTokenData={resetTokenData} setResetTokenData={setResetTokenData}/>
          </div>

          {/* Welcome panel */}
          <div style={{width:290,background:t.accentGrad,padding:"44px 30px",display:"flex",flexDirection:"column",justifyContent:"center",position:"relative",overflow:"hidden",opacity:mounted?1:0,transform:mounted?"translateX(0)":isSignup?"translateX(-60px)":"translateX(60px)",transition:"all 0.65s cubic-bezier(0.34,1.56,0.64,1) 0.08s"}}>
            {t.particleColor&&<div style={{position:"absolute",inset:0}}><ParticleCanvas color={t.particleColor}/></div>}
            <div style={{position:"absolute",top:-70,right:-70,width:220,height:220,borderRadius:"50%",background:"rgba(255,255,255,0.07)"}}/>
            <div style={{position:"absolute",bottom:-50,left:-50,width:180,height:180,borderRadius:"50%",background:"rgba(255,255,255,0.05)"}}/>
            <div style={{position:"relative",zIndex:1}}>
              <h1 style={{color:"white",fontSize:28,fontWeight:900,lineHeight:1.2,marginBottom:14,whiteSpace:"pre-line"}}>{welcome.title}</h1>
              <p style={{color:"rgba(255,255,255,0.82)",fontSize:13,lineHeight:1.65,marginBottom:22}}>{welcome.body}</p>
              <div style={{background:"rgba(255,255,255,0.14)",borderRadius:12,padding:"10px 14px",backdropFilter:"blur(8px)"}}>
                <p style={{color:"white",fontSize:12,fontWeight:600,margin:0}}>🏥 {hospitalName}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
