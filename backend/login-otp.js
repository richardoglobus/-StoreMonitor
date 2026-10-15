"use strict";

const crypto = require("crypto");
const bcrypt = require("bcryptjs");

const CONTACT_MESSAGE = "Contact your administrator to configure and verify an email address for your account. For your security, contact details cannot be added or changed during sign-in.";
const WINDOW_MS = 15 * 60 * 1000;
const MAX_SENDS = 5;
const MAX_ATTEMPTS = 5;
const normalizeEmail = value => String(value || "").trim().toLowerCase();
const normalizePhone = value => String(value || "").trim().replace(/[\s()-]/g, "");
const digest = value => crypto.createHash("sha256").update(String(value)).digest("hex");

// Only the administrator-only user routes may accept this confirmation.
// Changing a contact never inherits the old contact's verification timestamp.
function adminContactUpdates(current, input) {
  const updates = {};
  const email = input.email === undefined ? normalizeEmail(current.email) : normalizeEmail(input.email);
  const emailChanged = email !== normalizeEmail(current.email);
  if (input.email !== undefined) updates.email = email || null;
  if (emailChanged || input.adminEmailVerified !== undefined) {
    updates.emailVerifiedAt = email && input.adminEmailVerified === true
      ? (!emailChanged && current.emailVerifiedAt || new Date().toISOString()) : null;
    updates.loginOtp = null;
    updates.emailOtpHash = null;
    updates.emailOtpExpires = null;
    updates.emailOtpPurpose = null;
    updates.emailOtpAttempts = 0;
    updates.resetSessionHash = null;
    updates.resetSessionExpires = null;
    updates.loginOtpTrustHash = null;
    updates.loginOtpTrustedUntil = null;
    updates.loginOtpTrustFingerprint = null;
  }
  if (input.phone !== undefined) {
    const phone = normalizePhone(input.phone);
    updates.phone = phone || null;
    if (phone !== normalizePhone(current.phone)) updates.phoneVerifiedAt = null;
  }
  return updates;
}

function registerLoginOtp(app, deps) {
  const { db, getSettings, deliverEmailOtp, safeUser, maskEmail, normalizePermissions,
    logActivity, logSecurityEvent } = deps;
  const secret = deps.secret || process.env.SESSION_SECRET || "dev-secret-store-2024";
  const now = deps.now || Date.now;
  const ipAttempts = new Map();
  const userById = id => db.get("users").find({ id }).value();
  const update = (id, values) => db.get("users").find({ id }).assign(values).write();
  const save = req => new Promise((resolve, reject) => req.session.save(err => err ? reject(err) : resolve()));
  const regenerate = req => new Promise((resolve, reject) => req.session.regenerate(err => err ? reject(err) : resolve()));
  const hashCode = (id, code) => crypto.createHmac("sha256", secret).update(`${id}:${code}`).digest("hex");
  const trustHash = token => crypto.createHmac("sha256", secret).update(`otp-trust:${token}`).digest("hex");
  const readTrustToken = req => String(req.headers.cookie || "").split(";").map(v => v.trim()).find(v => v.startsWith("storemonitor_otp_trust="))?.slice("storemonitor_otp_trust=".length) || "";
  const rememberHours = () => Math.min(168, Math.max(0, Number(getSettings().otpRememberHours) ?? 24));
  const setTrustCookie = (res, token, hours) => res.set("Set-Cookie", `storemonitor_otp_trust=${token}; Max-Age=${Math.floor(hours * 3600)}; Path=/; HttpOnly; SameSite=None${process.env.NODE_ENV === "production" ? "; Secure" : ""}`);
  const settingsSeconds = () => {
    const s = getSettings();
    return {
      expiresInSeconds: Math.min(1800, Math.max(60, (Number(s.otpExpiryMinutes) || 10) * 60)),
      resendAfterSeconds: Math.min(1800, Math.max(10, Number(s.otpResendCooldownSeconds) || 60))
    };
  };
  const eligible = user => !!(user && user.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(user.email)) && user.emailVerifiedAt);
  const inactive = user => user.accountStatus === "disabled" || user.accountStatus === "pending_verification" || user.isActive === false;
  function contact(res) {
    return res.status(403).json({ code: "CONTACT_ADMIN_REQUIRED", error: CONTACT_MESSAGE });
  }
  function maintenance(user, res) {
    const s = getSettings();
    if (s.maintenanceMode && new Date(s.maintenanceEndsAt).getTime() > now() && user.role !== "admin") {
      res.status(423).json({ error: "System maintenance is in progress", maintenanceEndsAt: s.maintenanceEndsAt });
      return true;
    }
    return false;
  }
  function limited(req, res) {
    const timestamp = now();
    // Bound memory and expire stale IP entries; do not trust client-supplied identifiers.
    for (const [ip, entry] of ipAttempts) if (timestamp - entry.start >= WINDOW_MS) ipAttempts.delete(ip);
    const ip = req.ip || "unknown";
    const entry = ipAttempts.get(ip) || { start: timestamp, count: 0 };
    if (entry.count >= 30 || (!ipAttempts.has(ip) && ipAttempts.size >= 10000)) {
      res.status(429).json({ error: "Too many sign-in attempts. Please try again later." });
      return true;
    }
    entry.count++;
    ipAttempts.set(ip, entry);
    return false;
  }
  function sendLimited(user, res) {
    const timestamp = now();
    if (timestamp - (user.loginOtpVerifyWindowAt || 0) < WINDOW_MS && (user.loginOtpVerifyAttempts || 0) >= MAX_ATTEMPTS) {
      res.status(429).json({ error: "Too many verification attempts. Please try again in 15 minutes." });
      return true;
    }
    const { resendAfterSeconds } = settingsSeconds();
    const wait = Math.ceil(((user.loginOtpLastSentAt || 0) + resendAfterSeconds * 1000 - timestamp) / 1000);
    if (wait > 0) {
      res.set("Retry-After", String(wait)).status(429).json({ error: `Please wait ${wait} seconds before requesting another code.`, retryAfterSeconds: wait });
      return true;
    }
    if (timestamp - (user.loginOtpSendWindowAt || 0) < WINDOW_MS && (user.loginOtpSendCount || 0) >= MAX_SENDS) {
      res.status(429).json({ error: "Too many verification codes requested. Please try again in 15 minutes." });
      return true;
    }
    return false;
  }
  function pending(req, res) {
    const ref = req.session.loginChallenge;
    const user = ref && userById(ref.userId);
    const challenge = user && user.loginOtp;
    if (!challenge || challenge.id !== ref.id || challenge.sessionHash !== digest(req.sessionID) || challenge.challengeExpiresAt <= now()) {
      res.status(401).json({ code: "LOGIN_CHALLENGE_EXPIRED", error: "Your sign-in request expired. Please sign in again." });
      return null;
    }
    if (!eligible(user)) { contact(res); return null; }
    if (inactive(user) || challenge.email !== normalizeEmail(user.email) || challenge.emailVerifiedAt !== user.emailVerifiedAt || challenge.passwordFingerprint !== digest(user.passwordHash)) {
      res.status(401).json({ code: "LOGIN_CHALLENGE_EXPIRED", error: "Your account changed. Please sign in again." });
      return null;
    }
    if (maintenance(user, res)) return null;
    return { user, challenge };
  }
  async function issue(req, res, user, previous) {
    const timestamp = now();
    const timing = settingsSeconds();
    const id = previous ? previous.id : crypto.randomBytes(32).toString("hex");
    const code = String(crypto.randomInt(100000, 1000000));
    const challenge = {
      id, sessionHash: digest(req.sessionID), email: normalizeEmail(user.email),
      emailVerifiedAt: user.emailVerifiedAt, passwordFingerprint: digest(user.passwordHash),
      codeHash: hashCode(id, code), expiresAt: timestamp + timing.expiresInSeconds * 1000,
      challengeExpiresAt: previous ? previous.challengeExpiresAt : timestamp + Math.max(WINDOW_MS, timing.expiresInSeconds * 2000),
      delivered: false
    };
    const sameWindow = timestamp - (user.loginOtpSendWindowAt || 0) < WINDOW_MS;
    update(user.id, {
      loginOtp: challenge, loginOtpLastSentAt: timestamp,
      loginOtpSendWindowAt: sameWindow ? user.loginOtpSendWindowAt : timestamp,
      loginOtpSendCount: (sameWindow ? user.loginOtpSendCount || 0 : 0) + 1
    });
    req.session.loginChallenge = { userId: user.id, id };
    await save(req);
    try {
      await deliverEmailOtp({ email: challenge.email, code, purpose: "login", expiresInSeconds: timing.expiresInSeconds });
    } catch (error) {
      const current = userById(user.id);
      if (current?.loginOtp?.codeHash === challenge.codeHash) update(user.id, { loginOtp: null });
      delete req.session.loginChallenge;
      await save(req);
      console.error("[OTP] sign-in delivery failed:", error.message);
      return res.status(503).json({ code: "OTP_DELIVERY_FAILED", error: "Unable to send your sign-in code. Please try signing in again later or contact your administrator." });
    }
    const current = userById(user.id);
    if (!current?.loginOtp || current.loginOtp.codeHash !== challenge.codeHash || !eligible(current) || inactive(current) || normalizeEmail(current.email) !== challenge.email || current.emailVerifiedAt !== challenge.emailVerifiedAt || digest(current.passwordHash) !== challenge.passwordFingerprint) {
      return res.status(401).json({ code: "LOGIN_CHALLENGE_EXPIRED", error: "Your account changed. Please sign in again." });
    }
    update(user.id, { loginOtp: { ...challenge, delivered: true } });
    return res.json({ status: "otp_required", maskedEmail: maskEmail(challenge.email), ...timing });
  }
  const route = handler => async (req, res) => {
    res.set("Cache-Control", "no-store");
    try { await handler(req, res); }
    catch (error) { console.error("[AUTH] sign-in failed:", error.message); if (!res.headersSent) res.status(500).json({ error: "Unable to complete sign-in. Please try again." }); }
  };

  async function completeLogin(req, res, user, method) {
    const proof = { email: normalizeEmail(user.email), verifiedAt: user.emailVerifiedAt, password: digest(user.passwordHash) };
    await regenerate(req);
    const fresh = userById(user.id);
    if (!eligible(fresh)) return contact(res);
    if (inactive(fresh) || normalizeEmail(fresh.email) !== proof.email || fresh.emailVerifiedAt !== proof.verifiedAt || digest(fresh.passwordHash) !== proof.password || (method === "password_only" && fresh.allowPasswordOnlyLogin !== true)) {
      return res.status(401).json({ error: "Your account changed. Please sign in again." });
    }
    if (maintenance(fresh, res)) return;
    req.session.userId = fresh.id;
    req.session.username = fresh.username;
    req.session.role = fresh.role;
    req.session.permissions = normalizePermissions(fresh.role, fresh.permissions);
    if (method === "email_otp") {
      const hours = rememberHours();
      if (hours > 0) {
        const token = crypto.randomBytes(32).toString("hex");
        const trustedUntil = new Date(now() + hours * 60 * 60 * 1000).toISOString();
        update(fresh.id, { loginOtpTrustHash: trustHash(token), loginOtpTrustedUntil: trustedUntil, loginOtpTrustFingerprint: proof.password });
        setTrustCookie(res, token, hours);
      }
    }
    await save(req);
    logActivity(req, "LOGIN", "AUTH", fresh.id, { method });
    return res.json(safeUser(fresh));
  }

  app.post("/api/auth/login", route(async (req, res) => {
    if (limited(req, res)) return;
    const input = req.body || {};
    const identifier = typeof (input.identifier ?? input.username) === "string" ? (input.identifier ?? input.username).trim() : "";
    if (!identifier || identifier.length > 254 || typeof input.password !== "string" || input.password.length > 1024) return res.status(401).json({ error: "Invalid credentials" });
    const key = identifier.toLowerCase();
    const phone = normalizePhone(identifier);
    const user = db.get("users").find(u => String(u.username || "").toLowerCase() === key || (u.email && normalizeEmail(u.email) === key) || (u.phone && normalizePhone(u.phone) === phone)).value();
    const passwordFingerprint = user && digest(user.passwordHash);
    if (!user || !await bcrypt.compare(input.password, user.passwordHash)) {
      logSecurityEvent(req, "LOGIN_FAILED", { identifierType: identifier.includes("@") ? "email" : "username" });
      return res.status(401).json({ error: "Invalid credentials" });
    }
    if (digest(userById(user.id)?.passwordHash) !== passwordFingerprint) return res.status(401).json({ error: "Invalid credentials" });
    if (user.accountStatus === "disabled" || user.isActive === false) return res.status(403).json({ error: "This account is inactive" });
    // Never accept email/phone supplied alongside credentials as an enrollment request.
    if (!eligible(user) || user.accountStatus === "pending_verification") return contact(res);
    if (maintenance(user, res)) return;
    if (user.allowPasswordOnlyLogin === true) {
      update(user.id, { loginOtp: null });
      return completeLogin(req, res, user, "password_only");
    }
    const trustToken = readTrustToken(req);
    if (rememberHours() > 0 && trustToken && user.loginOtpTrustHash && user.loginOtpTrustedUntil && new Date(user.loginOtpTrustedUntil).getTime() > now() && user.loginOtpTrustFingerprint === passwordFingerprint && user.loginOtpTrustHash === trustHash(trustToken)) {
      return completeLogin(req, res, user, "remembered_otp");
    }
    if (sendLimited(user, res)) return;
    await regenerate(req);
    const fresh = userById(user.id);
    if (!eligible(fresh)) return contact(res);
    if (inactive(fresh) || digest(fresh.passwordHash) !== passwordFingerprint) return res.status(401).json({ error: "Your account changed. Please sign in again." });
    if (maintenance(fresh, res) || sendLimited(fresh, res)) return;
    return issue(req, res, fresh);
  }));

  app.post("/api/auth/login/resend-otp", route(async (req, res) => {
    const state = pending(req, res);
    if (!state || sendLimited(state.user, res)) return;
    return issue(req, res, state.user, state.challenge);
  }));

  app.post("/api/auth/login/verify-otp", route(async (req, res) => {
    const state = pending(req, res);
    if (!state) return;
    const { user, challenge } = state;
    const timestamp = now();
    const sameWindow = timestamp - (user.loginOtpVerifyWindowAt || 0) < WINDOW_MS;
    const attempts = sameWindow ? user.loginOtpVerifyAttempts || 0 : 0;
    if (attempts >= MAX_ATTEMPTS) return res.status(429).json({ error: "Too many verification attempts. Please try again in 15 minutes." });
    if (!challenge.delivered || challenge.expiresAt <= timestamp) return res.status(400).json({ error: "Invalid or expired verification code" });
    const code = typeof req.body?.otp === "string" ? req.body.otp : "";
    const matches = /^\d{6}$/.test(code) && crypto.timingSafeEqual(Buffer.from(hashCode(challenge.id, code), "hex"), Buffer.from(challenge.codeHash, "hex"));
    if (!matches) {
      update(user.id, { loginOtpVerifyWindowAt: sameWindow ? user.loginOtpVerifyWindowAt : timestamp, loginOtpVerifyAttempts: attempts + 1 });
      logSecurityEvent(req, "LOGIN_OTP_FAILED", { userId: user.id });
      return res.status(attempts + 1 >= MAX_ATTEMPTS ? 429 : 400).json({ error: attempts + 1 >= MAX_ATTEMPTS ? "Too many verification attempts. Please try again in 15 minutes." : "Invalid or expired verification code" });
    }
    // Consume synchronously before rotating/saving the session: concurrent replays fail.
    update(user.id, { loginOtp: null, loginOtpVerifyAttempts: 0, loginOtpVerifyWindowAt: null });
    return completeLogin(req, res, user, "email_otp");
  }));
}

module.exports = { registerLoginOtp, adminContactUpdates, CONTACT_MESSAGE };
