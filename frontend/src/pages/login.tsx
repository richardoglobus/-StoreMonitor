import { API_BASE, requestPasswordOtp, resendOtp, resendLoginOtp, resetPassword, verifyOtp, type LoginOtpChallenge } from "@/lib/api";
import { useState, useEffect, useRef, useCallback, useId } from "react";
import { useAuth } from "@/lib/auth-context";
import { Loader2, Eye, EyeOff, User, Lock, UserPlus, ArrowLeft, Download, X } from "lucide-react";
import { toast } from "sonner";
import { useTheme, LOGOS } from "@/lib/theme-context";
import { useLocation } from "wouter";

type Panel = "login" | "signup" | "forgot" | "verify_signup" | "verify_reset" | "reset_password" | "verify_login" | "contact_admin";
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
  const [showManual, setShowManual] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true); return;
    }
    const handler = (e: any) => { e.preventDefault(); setDeferredPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => setInstalled(true));
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as any).MSStream;

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setInstalled(true);
      setDeferredPrompt(null);
    } else {
      setShowManual(true);
    }
  };

  if (installed || dismissed) return null;

  return (
    <>
      {/* Banner */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
        background: 'linear-gradient(135deg,#0f766e,#0d9488)',
        padding: '10px 14px', display: 'flex', alignItems: 'center',
        gap: 10, boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
        animation: 'fadeUp 0.4s ease'
      }}>
        <img src="/icons/icon-72x72.png" alt="icon"
          style={{ width: 38, height: 38, borderRadius: 9, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ color:'#fff', fontWeight:700, fontSize:13, margin:0 }}>
            Install Mukurweini Hospital Stores App
          </p>
          <p style={{ color:'rgba(255,255,255,0.8)', fontSize:11, margin:'2px 0 0' }}>
            {isIOS ? 'Tap Share → "Add to Home Screen"' : 'Install for quick access on your device'}
          </p>
        </div>
        {!isIOS && (
          <button onClick={handleInstall} style={{
            background:'#fff', color:'#0f766e', border:'none',
            borderRadius:8, padding:'8px 14px', fontWeight:700,
            fontSize:12, cursor:'pointer', display:'flex',
            alignItems:'center', gap:5, flexShrink:0, whiteSpace:'nowrap'
          }}>
            <Download size={13}/> Install App
          </button>
        )}
        <button onClick={() => setDismissed(true)} style={{
          background:'rgba(255,255,255,0.15)', border:'none',
          borderRadius:6, padding:6, cursor:'pointer',
          color:'#fff', display:'flex', flexShrink:0
        }}>
          <X size={14}/>
        </button>
      </div>

      {/* Manual install modal — shown when SW not ready yet */}
      {showManual && (
        <div style={{
          position:'fixed', inset:0, zIndex:10000,
          background:'rgba(0,0,0,0.7)', display:'flex',
          alignItems:'center', justifyContent:'center', padding:20
        }} onClick={() => setShowManual(false)}>
          <div style={{
            background:'#1a2332', borderRadius:16, padding:28,
            maxWidth:360, width:'100%', boxShadow:'0 24px 60px rgba(0,0,0,0.6)',
            border:'1px solid rgba(255,255,255,0.1)'
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
              <p style={{ color:'#fff', fontWeight:700, fontSize:16, margin:0 }}>How to Install</p>
              <button onClick={() => setShowManual(false)} style={{ background:'none', border:'none', color:'#9ca3af', cursor:'pointer' }}>
                <X size={18}/>
              </button>
            </div>
            {[
              { label:'Chrome (Android)', steps:['Open this page in Chrome','Tap the 3-dot menu (⋮) top right','Tap "Add to Home screen"','Tap "Install"'] },
              { label:'Edge / Chrome (Windows)', steps:['Open this page in Edge or Chrome','Click the install icon (⊕) in the address bar','Click "Install"'] },
            ].map(({ label, steps }) => (
              <div key={label} style={{ marginBottom:16 }}>
                <p style={{ color:'#0d9488', fontWeight:700, fontSize:12, margin:'0 0 8px', textTransform:'uppercase', letterSpacing:1 }}>{label}</p>
                {steps.map((s,i) => (
                  <p key={i} style={{ color:'rgba(255,255,255,0.8)', fontSize:13, margin:'4px 0', display:'flex', gap:8 }}>
                    <span style={{ color:'#0d9488', fontWeight:700, flexShrink:0 }}>{i+1}.</span>{s}
                  </p>
                ))}
              </div>
            ))}
            <button onClick={() => setShowManual(false)} style={{
              width:'100%', padding:'11px', marginTop:6,
              background:'linear-gradient(135deg,#0f766e,#0d9488)',
              color:'#fff', border:'none', borderRadius:10,
              fontWeight:700, fontSize:14, cursor:'pointer'
            }}>Got it</button>
          </div>
        </div>
      )}
    </>
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

function Field({ label, type="text", value, onChange, placeholder, icon:Icon, focused, onFocus, onBlur, accentColor, inputBg, inputBorder, textColor, inputMode, autoComplete, maxLength, pattern, required=true }: any) {
  const [show, setShow] = useState(false);
  const id = useId();
  const isPassword = type === "password";
  return (
    <div>
      <label htmlFor={id} style={{fontSize:11,fontWeight:700,color:textColor,display:"block",marginBottom:5,textTransform:"uppercase",letterSpacing:1.2}}>{label}</label>
      <div style={{position:"relative"}}>
        {Icon && <Icon size={14} style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",color:focused?accentColor:"rgba(150,150,180,0.8)",transition:"color 0.2s"}}/>}
        <input id={id} className="login-input" type={isPassword?(show?"text":"password"):type} value={value} onChange={e=>onChange(e.target.value)}
          onFocus={onFocus} onBlur={onBlur} placeholder={placeholder} required={required}
          inputMode={inputMode} autoComplete={autoComplete} maxLength={maxLength} pattern={pattern}
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
function FormContent({ panel, setPanel, onLogin, onVerifyLogin, onSignup, accentColor, inputBg, inputBorder, textMuted, allowSignup, otpExpirySeconds = 600, otpResendCooldownSeconds = 60 }: any) {
  const [u,setU]=useState(""); const [p,setP]=useState(""); const [p2,setP2]=useState(""); const [email,setEmail]=useState(""); const [phone,setPhone]=useState(""); const [otp,setOtp]=useState(""); const [resetSession,setResetSession]=useState("");
  const [name,setName]=useState(""); const [loading,setLoading]=useState(false); const [focused,setFocused]=useState<string|null>(null); const [otpCooldown,setOtpCooldown]=useState(0);
  const [loginChallenge,setLoginChallenge]=useState<LoginOtpChallenge|null>(null);
  const [loginExpiresAt,setLoginExpiresAt]=useState(0);
  const [loginResendAt,setLoginResendAt]=useState(0);
  const [loginNow,setLoginNow]=useState(Date.now());
  useEffect(()=>{ if(panel!=="verify_login") return; const timer=setInterval(()=>setLoginNow(Date.now()),1000); return ()=>clearInterval(timer); },[panel]);
  useEffect(()=>{ if (otpCooldown <= 0) return; const timer=setInterval(()=>setOtpCooldown(value=>Math.max(0,value-1)),1000); return ()=>clearInterval(timer); },[otpCooldown]);
  const f=(id:string)=>({focused:focused===id,onFocus:()=>setFocused(id),onBlur:()=>setFocused(null)}); const shared={accentColor,inputBg,inputBorder,textColor:textMuted};
  const btnStyle:any={width:"100%",padding:"13px",border:"none",borderRadius:10,background:`linear-gradient(135deg,${accentColor},${accentColor}cc)`,color:"white",fontWeight:700,fontSize:15,cursor:loading?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,boxShadow:`0 4px 20px ${accentColor}44`,transition:"all 0.2s",marginTop:6,opacity:loading?0.7:1};
  const linkStyle:any={color:accentColor,background:"none",border:"none",cursor:"pointer",fontSize:13,fontWeight:600,textDecoration:"underline",padding:0};
  const startLoginChallenge=(result:LoginOtpChallenge)=>{
    const timestamp=Date.now();
    setLoginChallenge(result); setOtp(""); setP(""); setLoginNow(timestamp);
    setLoginExpiresAt(timestamp+result.expiresInSeconds*1000);
    setLoginResendAt(timestamp+result.resendAfterSeconds*1000);
    setPanel("verify_login");
  };
  const loginError=(err:any)=>{
    if(err?.code==="CONTACT_ADMIN_REQUIRED") { setP(""); setOtp(""); setLoginChallenge(null); setPanel("contact_admin"); }
    else { if(err?.code==="LOGIN_CHALLENGE_EXPIRED") { setP(""); setOtp(""); setLoginChallenge(null); setPanel("login"); } toast.error(err?.error||err?.message||"Unable to sign in. Please try again."); }
  };
  const handleLogin=async(e:React.FormEvent)=>{
    e.preventDefault(); if(!u||!p||loading)return; setLoading(true);
    try { const result=await onLogin(u,p); if(result?.status==="otp_required") startLoginChallenge(result); }
    catch(err:any) { loginError(err); }
    finally { setLoading(false); }
  };
  const handleLoginVerify=async(e:React.FormEvent)=>{
    e.preventDefault(); if(!/^\d{6}$/.test(otp)||loading)return; setLoading(true);
    try { await onVerifyLogin(otp); }
    catch(err:any) { loginError(err); }
    finally { setLoading(false); }
  };
  const handleLoginResend=async()=>{
    if(loading||Date.now()<loginResendAt)return; setLoading(true);
    try { startLoginChallenge(await resendLoginOtp()); toast.success("A new sign-in code has been sent."); }
    catch(err:any) { if(err?.retryAfterSeconds) setLoginResendAt(Date.now()+err.retryAfterSeconds*1000); loginError(err); }
    finally { setLoading(false); }
  };
  const handleSignup=async(e:React.FormEvent)=>{e.preventDefault();if(!name||!u||!email||!p)return;if(p!==p2){toast.error("Passwords do not match");return;}if(p.length<12){toast.error("Password must be at least 12 characters");return;}setLoading(true);try{const result=await onSignup(name,u,email,phone,p);setOtpCooldown(otpExpirySeconds);setPanel("verify_signup");if(result?.devOtp){setOtp(String(result.devOtp));toast.info(`Development OTP: ${result.devOtp}`);}}catch(err:any){toast.error(err?.message||"Registration failed");}finally{setLoading(false);}};
  const handleForgot=async(e:React.FormEvent)=>{e.preventDefault();if(!u)return;setLoading(true);try{await requestPasswordOtp(u);setOtpCooldown(otpExpirySeconds);setPanel("verify_reset");toast.success("If an account matches, a verification code has been sent.");}catch(err:any){toast.error(err?.error||"Unable to request code");}finally{setLoading(false);}};
  const handleResend=async()=>{const purpose: "signup" | "reset" = panel==="verify_signup" ? "signup" : "reset";const identifier=purpose==="signup"?email:u;if(!identifier||otpCooldown>0)return;setLoading(true);try{await resendOtp(identifier,purpose);setOtp("");setOtpCooldown(otpExpirySeconds);toast.success("A new verification code has been sent.");}catch(err:any){toast.error(err?.error||"Unable to resend code");}finally{setLoading(false);}};
  const handleVerify=async(e:React.FormEvent,purpose:"signup"|"reset")=>{e.preventDefault();setLoading(true);try{const result=await verifyOtp(purpose==="signup"?email:u,otp,purpose);if(purpose==="reset"){setResetSession(result.resetSession||"");setPanel("reset_password");}else{toast.success("Email verified. You can now sign in.");setPanel("login");}}catch(err:any){toast.error(err?.error||"Invalid or expired code");}finally{setLoading(false);}};
  const handleReset=async(e:React.FormEvent)=>{e.preventDefault();if(p!==p2){toast.error("Passwords do not match");return;}setLoading(true);try{await resetPassword(resetSession,p,p2);toast.success("Password changed. You can now sign in.");setPanel("login");setP("");setP2("");}catch(err:any){toast.error(err?.error||"Unable to reset password");}finally{setLoading(false);}};

  if(panel==="contact_admin") return <section role="alert" style={{display:"flex",flexDirection:"column",gap:16,animation:"fadeUp 0.4s ease"}}>
    <Lock size={32} color={accentColor}/>
    <p style={{color:"#fff",fontSize:15,lineHeight:1.6,margin:0}}>Your account needs a verified email before you can sign in.</p>
    <p style={{color:textMuted,fontSize:13,lineHeight:1.6,margin:0}}>Please contact your administrator to configure and verify your account's email. Contact details cannot be added or changed during sign-in.</p>
    <p style={{color:textMuted,fontSize:12,lineHeight:1.5,margin:0}}>A phone number or password-only approval does not remove this requirement.</p>
    <button type="button" onClick={()=>{setP("");setPanel("login");}} style={{...linkStyle,textAlign:"left"}}>← Back to sign in</button>
  </section>;

  if(panel==="verify_login") {
    const expires=Math.max(0,Math.ceil((loginExpiresAt-loginNow)/1000));
    const resendWait=Math.max(0,Math.ceil((loginResendAt-loginNow)/1000));
    return <form onSubmit={handleLoginVerify} style={{display:"flex",flexDirection:"column",gap:14,animation:"fadeUp 0.4s ease"}}>
      <p style={{color:textMuted,fontSize:13,lineHeight:1.6}}>Enter the six-digit sign-in code sent to <strong style={{color:"#fff"}}>{loginChallenge?.maskedEmail}</strong>. Your account is not signed in until the code is verified.</p>
      <Field label="Email sign-in code" value={otp} onChange={(value:string)=>setOtp(value.replace(/\D/g,"").slice(0,6))} placeholder="123456" icon={Lock} inputMode="numeric" autoComplete="one-time-code" maxLength={6} pattern="[0-9]{6}" {...f("login_otp")} {...shared}/>
      <button type="submit" className="login-btn" disabled={loading||!/^\d{6}$/.test(otp)||expires===0} style={btnStyle}>{loading?<><Loader2 size={16} style={{animation:"spin 1s linear infinite"}}/>Please wait…</>:"Verify and Sign In"}</button>
      <p style={{color:textMuted,fontSize:12,textAlign:"center",margin:0}}>{expires>0?`Code expires in ${Math.floor(expires/60)}m ${String(expires%60).padStart(2,"0")}s`:"Your code has expired. Request a new code."}</p>
      <button type="button" onClick={handleLoginResend} disabled={loading||resendWait>0} style={{...linkStyle,textAlign:"center",opacity:loading||resendWait>0?0.5:1}}>{resendWait>0?`Resend code in ${resendWait}s`:"Resend sign-in code"}</button>
      <p style={{color:textMuted,fontSize:12,lineHeight:1.5,margin:0}}>Can't access this email? Contact your administrator. You cannot change the email here.</p>
      <button type="button" disabled={loading} onClick={()=>{setOtp("");setP("");setLoginChallenge(null);setPanel("login");}} style={{...linkStyle,textAlign:"center"}}>← Back to sign in</button>
    </form>;
  }

  if(panel==="verify_signup"||panel==="verify_reset") return <form onSubmit={e=>handleVerify(e,panel==="verify_signup"?"signup":"reset")} style={{display:"flex",flexDirection:"column",gap:14,animation:"fadeUp 0.4s ease"}}>
    <p style={{color:textMuted,fontSize:13,lineHeight:1.5}}>Enter the six-digit code sent to your email. The code expires in {Math.floor(otpExpirySeconds / 60)} minutes.</p>
    <Field label="Verification Code" value={otp} onChange={setOtp} placeholder="123456" icon={Lock} {...f("otp")} {...shared}/>
    <button type="submit" className="login-btn" disabled={loading||otp.length<6} style={btnStyle}>{loading?<><Loader2 size={16} style={{animation:"spin 1s linear infinite"}}/>Verifying…</>:"Verify Code"}</button>
    <p style={{color:textMuted,fontSize:12,textAlign:"center",margin:0}}>{otpCooldown>0?`Code expires in ${Math.floor(otpCooldown/60)}m ${String(otpCooldown%60).padStart(2,"0")}s`:`This code has expired.`}</p>
    <button type="button" onClick={handleResend} disabled={loading||otpCooldown>0} style={{...linkStyle,textAlign:"center",opacity:loading||otpCooldown>0?0.5:1}}>{otpCooldown>0?"Resend available after expiry":"Resend verification code"}</button>
    <button type="button" onClick={()=>setPanel("login")} style={{...linkStyle,textAlign:"center"}}>← Back to login</button>
  </form>;
  if(panel==="reset_password") return <form onSubmit={handleReset} style={{display:"flex",flexDirection:"column",gap:14,animation:"fadeUp 0.4s ease"}}>
    <p style={{color:textMuted,fontSize:13,lineHeight:1.5}}>Choose a new password for your account.</p>
    <Field label="New Password" type="password" value={p} onChange={setP} placeholder="At least 12 characters" icon={Lock} {...f("p")} {...shared}/>
    <Field label="Confirm Password" type="password" value={p2} onChange={setP2} placeholder="Repeat password" icon={Lock} {...f("p2")} {...shared}/>
    <button type="submit" className="login-btn" disabled={loading||!p||!p2} style={btnStyle}>{loading?"Saving…":"Set New Password"}</button>
  </form>;

  // ── Login panel ────────────────────────────────────────────────────────
  if(panel==="login") return (
    <form onSubmit={handleLogin} style={{display:"flex",flexDirection:"column",gap:14,animation:"slideRight 0.45s cubic-bezier(0.34,1.56,0.64,1)"}}>
      <Field label="Username, Email, or Phone" value={u} onChange={setU} placeholder="Enter username, email, or phone" icon={User} {...f("u")} {...shared}/>
      <Field label="Password" type="password" value={p} onChange={setP} placeholder="Enter password" icon={Lock} {...f("p")} {...shared}/>
      <button type="button" onClick={()=>setPanel("forgot")} style={{...linkStyle,textAlign:"right",marginTop:-6}}>Forgot password?</button>
      <button type="submit" className="login-btn" disabled={loading||!u||!p} style={btnStyle}>
        {loading?<><Loader2 size={16} style={{animation:"spin 1s linear infinite"}}/>Signing in…</>:"Sign In →"}
      </button>
      {allowSignup && <p style={{textAlign:"center",color:textMuted,fontSize:13,marginTop:4}}>
        Don't have an account?{" "}
        <button type="button" onClick={()=>setPanel("signup")} style={linkStyle}>Sign up</button>
      </p>}
    </form>
  );

  // ── Signup panel ───────────────────────────────────────────────────────
  if(panel==="signup") return (
    <form onSubmit={handleSignup} style={{display:"flex",flexDirection:"column",gap:12,animation:"slideLeft 0.45s cubic-bezier(0.34,1.56,0.64,1)"}}>
      <Field label="Full Name" value={name} onChange={setName} placeholder="e.g. John Kamau" icon={User} {...f("n")} {...shared}/>
      <Field label="Username" value={u} onChange={setU} placeholder="Choose a username" icon={User} {...f("u")} {...shared}/>
      <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="name@example.com" icon={User} {...f("email")} {...shared}/>
      <Field label="Phone (optional)" required={false} value={phone} onChange={setPhone} placeholder="+254..." icon={User} {...f("phone")} {...shared}/>
      <Field label="Password" type="password" value={p} onChange={setP} placeholder="At least 12 characters" icon={Lock} {...f("p")} {...shared}/>
      <Field label="Confirm Password" type="password" value={p2} onChange={setP2} placeholder="Repeat password" icon={Lock} {...f("p2")} {...shared}/>
      <button type="submit" className="login-btn" disabled={loading||!name||!u||!p||!p2} style={btnStyle}>
        {loading?<><Loader2 size={16} style={{animation:"spin 1s linear infinite"}}/>Creating…</>:<><UserPlus size={16}/>Create Account</>}
      </button>
      <p style={{textAlign:"center",color:textMuted,fontSize:11,fontStyle:"italic"}}>{allowSignup?"A verification code will be sent to your email.":"Contact administrator if you cannot log in."}</p>
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
      <p style={{color:textMuted,fontSize:13,lineHeight:1.5}}>Enter your username, email, or phone. If the account matches, we will email a verification code.</p>
      <Field label="Username, Email, or Phone" value={u} onChange={setU} placeholder="Your account identifier" icon={User} {...f("u")} {...shared}/>
      <button type="submit" className="login-btn" disabled={loading||!u} style={btnStyle}>
        {loading?<><Loader2 size={16} style={{animation:"spin 1s linear infinite"}}/>Sending…</>:"Send Verification Code"}
      </button>
    </form>
  );
}

// ── Panel meta ────────────────────────────────────────────────────────────
const PANEL_META:Record<string,any>={
  login:{title:"Login",sub:"Welcome back — sign in to continue"},
  signup:{title:"Create Account",sub:"Join the hospital stores system"},
  forgot:{title:"Forgot Password",sub:"We'll help you get back in"},
  verify_signup:{title:"Verify Email",sub:"Confirm your email address"},
  verify_reset:{title:"Verify Identity",sub:"Enter the code from your email"},
  reset_password:{title:"New Password",sub:"Create a new password"},
  verify_login:{title:"Verify Sign-In",sub:"One more step to protect your account"},
  contact_admin:{title:"Contact Your Administrator",sub:"A verified email is required to sign in"},
};
const WELCOME_META:Record<string,any>={
  login:{title:"WELCOME\nBACK!",body:"Access your hospital stores system securely and efficiently."},
  signup:{title:"JOIN US\nTODAY!",body:"Create your account. An administrator will approve it before you can log in."},
  forgot:{title:"DON'T\nWORRY!",body:"We will generate a reset token. Your administrator will help you complete the password reset."},
  verify_signup:{title:"ALMOST\nTHERE!",body:"Check your email and enter the verification code."},
  verify_reset:{title:"ALMOST\nTHERE!",body:"Check your email to continue securely."},
  reset_password:{title:"WELCOME\nBACK!",body:"Create a new password and return to your account."},
  verify_login:{title:"SECURE\nSIGN-IN",body:"Use the one-time code sent to your verified email. Never share your code with anyone."},
  contact_admin:{title:"ACCOUNT\nPROTECTION",body:"Only an administrator can configure your account's contact details. This helps prevent account takeover."},
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
  const {login,completeLoginOtp}=useAuth();
  const [, setLocation] = useLocation();
  const {appLogo}=useTheme();
  const [panel,setPanel]=useState<Panel>("login");
  const [effect,setEffect]=useState<Effect>("split");
  const [shake,setShake]=useState(false);
  const [hospitalName,setHospitalName]=useState("Mukurweini Hospital Stores");
  const [allowSignup,setAllowSignup]=useState(false);
  const [otpExpirySeconds,setOtpExpirySeconds]=useState(600);
  const [otpResendCooldownSeconds,setOtpResendCooldownSeconds]=useState(60);
  const [effectIdx,setEffectIdx]=useState(0);
  const [producedBy,setProducedBy]=useState("");
  const [appVersion,setAppVersion]=useState("dev");
  const [maintenance,setMaintenance]=useState({active:false,endsAt:null as string|null,message:"System maintenance is in progress. Please check back soon."});
  const [maintenanceNow,setMaintenanceNow]=useState(Date.now());
  const [energy,setEnergy]=useState(0);
  const effects:Effect[]=["split","particles","glass","wave","gradient"];
  const LogoEmoji=LOGOS[appLogo as keyof typeof LOGOS]?.emoji||"🏥";

  useEffect(()=>{
    fetch(`${API_BASE}/api/settings/public`).then(r=>r.json()).then(s=>{
      if(s.hospitalName) setHospitalName(s.hospitalName);
      if(s.producedBy) setProducedBy(s.producedBy);
      setMaintenance({active:!!s.maintenanceMode,endsAt:s.maintenanceEndsAt||null,message:s.maintenanceMessage||"System maintenance is in progress. Please check back soon."});
      if(s.allowSelfRegistration) setAllowSignup(s.allowSelfRegistration);
      if(s.otpExpiryMinutes) setOtpExpirySeconds(Math.max(60, Number(s.otpExpiryMinutes) * 60));
      if(s.otpResendCooldownSeconds) setOtpResendCooldownSeconds(Math.max(10, Number(s.otpResendCooldownSeconds)));

      if(s.shuffleEffect){
        // Start on a random effect
        const startIdx = Math.floor(Math.random() * effects.length);
        setEffectIdx(startIdx);
        setEffect(effects[startIdx]);
        const interval = (s.shuffleIntervalSeconds || 30) * 1000;
        let cur = startIdx;
        shuffleRef.current = setInterval(() => {
          cur = (cur + 1) % effects.length;
          setEffectIdx(cur);
          setEffect(effects[cur]);
        }, interval);
      } else {
        if(s.loginEffect) setEffect(s.loginEffect as Effect);
      }
    }).catch(()=>{});
    fetch(`${API_BASE}/api/version`).then(r=>r.json()).then(v=>{ if(v.version) setAppVersion(String(v.version)); }).catch(()=>{});
    return () => { if(shuffleRef.current) clearInterval(shuffleRef.current); };
  },[]);
  useEffect(()=>{ if(!maintenance.active) return; const timer=setInterval(()=>{ const now=Date.now(); setMaintenanceNow(now); if(maintenance.endsAt && new Date(maintenance.endsAt).getTime() <= now) setMaintenance(v=>({...v,active:false})); },1000); return ()=>clearInterval(timer); },[maintenance.active,maintenance.endsAt]);

  const shuffleRef = useRef<ReturnType<typeof setInterval>|null>(null);

  const nextEffect = useCallback((idx: number) => {
    const next = (idx + 1) % effects.length;
    setEffectIdx(next);
    setEffect(effects[next]);
    return next;
  }, [effects]);

  const reshuffleEffect=()=>{ const next=(effectIdx+1)%effects.length; setEffectIdx(next); setEffect(effects[next]); };

  const onLogin=async(u:string,p:string)=>{
    try { const result=await login({data:{identifier:u,password:p}}); if("id" in result) { setLocation("/"); toast.success("Welcome back!"); } return result; }
    catch(err) { setShake(true); setTimeout(()=>setShake(false),600); throw err; }
  };
  const onVerifyLogin=async(otp:string)=>{
    await completeLoginOtp(otp); setLocation("/"); toast.success("Welcome back!");
  };

  const onSignup=async(fullName:string,username:string,email:string,phone:string,password:string)=>{
    const res=await fetch(`${API_BASE}/api/auth/register`,{method:"POST",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify({fullName,username,email,phone,password})});
    const data=await res.json();
    if(!res.ok) throw new Error(data.error||"Registration failed");
    toast.success(data.message || "Account created. Check your email for the verification code.");
    return data;
  };

  const t=EFFECT_THEMES[effect];
  const meta=PANEL_META[panel]||PANEL_META.login;
  const welcome=WELCOME_META[panel]||WELCOME_META.login;
  const isSignup=panel==="signup";
  const maintenanceRemaining=maintenance.endsAt ? Math.max(0,new Date(maintenance.endsAt).getTime()-maintenanceNow) : 0;
  const countdown=maintenanceRemaining ? `${String(Math.floor(maintenanceRemaining/86400000)).padStart(2,"0")}d:${String(Math.floor((maintenanceRemaining%86400000)/3600000)).padStart(2,"0")}h:${String(Math.floor((maintenanceRemaining%3600000)/60000)).padStart(2,"0")}m:${String(Math.floor((maintenanceRemaining%60000)/1000)).padStart(2,"0")}s` : "Soon";

  const [mounted,setMounted]=useState(false);
  useEffect(()=>{setTimeout(()=>setMounted(true),80);},[]);

  return (
    <div style={{position:"relative",minHeight:"100vh",overflow:"hidden",background:t.bg}}>
      <InstallBanner />
      <style>{BASE_CSS+`@keyframes wave{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}} @keyframes blob{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(30px,-20px) scale(1.08)}} @keyframes blob2{0%,100%{transform:translate(0,0)}50%{transform:translate(-25px,30px)}}`}</style>
      <EffectBg effect={effect}/>
      {maintenance.active && maintenanceRemaining > 0 && <div style={{position:"fixed",inset:0,zIndex:20,display:"flex",alignItems:"center",justifyContent:"center",padding:20,color:"white",textAlign:"center"}}>
        <div style={{width:"100%",maxWidth:560,background:t.formBg,border:`1px solid ${t.inputBorder}`,backdropFilter:"blur(18px)",borderRadius:24,padding:"42px 30px",boxShadow:"0 24px 80px rgba(0,0,0,.45)"}}>
          <div style={{fontSize:48,marginBottom:10}}>🛠️</div><h1 style={{fontSize:28,margin:"0 0 10px",fontWeight:800}}>System Under Maintenance</h1>
          <p style={{color:t.textMuted,lineHeight:1.6,margin:"0 auto 18px",maxWidth:420}}>{maintenance.message}</p>
          <div style={{fontSize:42,fontWeight:900,letterSpacing:3,color:t.accentColor,fontVariantNumeric:"tabular-nums"}}>{countdown}</div><p style={{color:t.textMuted,fontSize:12,marginTop:4}}>Administrators may still sign in</p>
          <div style={{margin:"26px auto 12px",maxWidth:360,background:"rgba(255,255,255,.08)",borderRadius:16,padding:18}}><div style={{fontSize:13,color:t.textMuted,marginBottom:10}}>Keep the maintenance lights on while you wait</div><button type="button" onClick={()=>setEnergy(v=>Math.min(100,v+10))} style={{border:0,borderRadius:12,padding:"12px 24px",background:t.accentGrad,color:"white",fontWeight:800,cursor:"pointer"}}>⚡ Recharge system ({energy}%)</button><div style={{height:6,background:"rgba(255,255,255,.12)",borderRadius:8,marginTop:14}}><div style={{height:"100%",width:`${energy}%`,background:t.accentColor,borderRadius:8,transition:"width .2s"}}/></div></div>
          <button type="button" onClick={()=>setMaintenance(v=>({...v,active:false}))} style={{background:"none",border:"1px solid rgba(255,255,255,.22)",borderRadius:10,padding:"9px 16px",color:"white",fontSize:12,cursor:"pointer"}}>Administrator sign in</button>
          {producedBy && <div style={{color:t.textMuted,fontSize:11,marginTop:22}}>Powered by {producedBy}</div>}
        </div>
      </div>}

      {/* Reshuffle button */}
      <button onClick={reshuffleEffect} title="Switch style" style={{position:"fixed",top:16,right:16,zIndex:100,background:"rgba(255,255,255,0.1)",backdropFilter:"blur(8px)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:10,padding:"8px 14px",color:"white",fontSize:12,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>
        🎨 {effects.indexOf(effect)+1}/{effects.length}
      </button>

      {/* Main card */}
      <div style={{position:"relative",zIndex:maintenance.active?1:10,minHeight:"100vh",display:maintenance.active?"none":"flex",alignItems:"center",justifyContent:"center",padding:16}}>
        <div style={{width:"100%",maxWidth:860,borderRadius:22,overflow:"hidden",boxShadow:"0 32px 80px rgba(0,0,0,0.6)",display:"flex",flexDirection:isSignup?"row-reverse":"row",minHeight:520,animation:shake?"shake 0.5s ease":undefined,transition:"all 0.5s"}}>

          {/* Form panel */}
          <div style={{flex:1,background:t.formBg,padding:"44px 40px",display:"flex",flexDirection:"column",justifyContent:"center",backdropFilter:"blur(16px)",border:`1px solid ${t.inputBorder}`,opacity:mounted?1:0,transform:mounted?"translateX(0)":isSignup?"translateX(60px)":"translateX(-60px)",transition:"all 0.65s cubic-bezier(0.34,1.56,0.64,1)"}}>
            <div style={{marginBottom:28}}>
              <div style={{fontSize:32,marginBottom:6}}>{LogoEmoji}</div>
              <h2 style={{color:"#fff",fontSize:24,fontWeight:800,margin:0}}>{meta.title}</h2>
              <p style={{color:t.textMuted,fontSize:13,marginTop:4}}>{meta.sub}</p>
            </div>
            <FormContent panel={panel} setPanel={setPanel} onLogin={onLogin} onVerifyLogin={onVerifyLogin} onSignup={onSignup}
              accentColor={t.accentColor} inputBg={t.inputBg} inputBorder={t.inputBorder}
              textMuted={t.textMuted} allowSignup={allowSignup} otpExpirySeconds={otpExpirySeconds} otpResendCooldownSeconds={otpResendCooldownSeconds}/>
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
      <div style={{position:"fixed",bottom:12,left:0,right:0,zIndex:30,textAlign:"center",color:t.textMuted,fontSize:11}}>{producedBy ? `Powered by ${producedBy} · ` : ""}Version {appVersion}</div>
    </div>
  );
}
