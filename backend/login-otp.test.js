"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const low = require("lowdb");
const Memory = require("lowdb/adapters/Memory");
const { registerLoginOtp, adminContactUpdates } = require("./login-otp");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const serverSource = fs.readFileSync(path.join(__dirname, "server.js"), "utf8");
const PASSWORD = "Testing-password-123";
const HASH = bcrypt.hashSync(PASSWORD, 4);

async function fixture(t, overrides = {}, options = {}) {
  const db = low(new Memory());
  db.setState({ users: [{ id: 1, username: "staff", fullName: "Test Staff", passwordHash: HASH,
    email: "staff@example.com", emailVerifiedAt: "2026-10-14T12:00:00Z", phone: null,
    role: "staff", permissions: {}, accountStatus: "active", ...overrides }] }).write();
  const emails = [], events = [];
  let clock = Date.now();
  let failDelivery = !!options.failDelivery;
  const settings = { otpExpiryMinutes: 1, otpResendCooldownSeconds: 10, ...options.settings };
  const app = express();
  app.use(express.json());
  app.use(session({ secret: "test-session-secret-only", resave: false, saveUninitialized: false }));
  registerLoginOtp(app, {
    db, secret: "test-hmac-secret-only", now: () => clock, getSettings: () => settings,
    deliverEmailOtp: async message => { if (failDelivery) throw new Error("Simulated provider outage"); emails.push(message); },
    safeUser: user => ({ id: user.id, username: user.username, role: user.role, permissions: user.permissions }),
    maskEmail: email => email.replace(/^[^@]+/, "st***"), normalizePermissions: (_, p) => p,
    logActivity: (...args) => events.push(args.slice(1)), logSecurityEvent: (...args) => events.push(args.slice(1))
  });
  if (options.adminRoutes) {
    // Evaluate the real route definitions against an in-memory database, not server startup/live data.
    const source = serverSource.slice(serverSource.indexOf('app.post("/api/auth/users",'), serverSource.indexOf('app.delete("/api/auth/users/:userId",'));
    const guard = serverSource.match(/function requireAdmin\(req,res,next\)\{[^\n]+/)[0];
    const normalizeEmail = value => String(value || "").trim().toLowerCase();
    const normalizePhone = value => String(value || "").trim().replace(/[\s()-]/g, "");
    vm.runInNewContext(guard + "\n" + source, { app, db, bcrypt, adminContactUpdates, normalizeEmail, normalizePhone,
      validEmail: value => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), validPhone: value => !value || /^\+?[0-9]{9,15}$/.test(value),
      normalizePermissions: (_, p) => p || {}, safeUser: user => ({ id: user.id, email: user.email, emailVerifiedAt: user.emailVerifiedAt, allowPasswordOnlyLogin: user.allowPasswordOnlyLogin === true }),
      nextId: () => Math.max(...db.get("users").value().map(u => u.id)) + 1,
      logActivity: (...args) => events.push(args.slice(1))
    });
  }
  app.get("/api/auth/me", (req, res) => req.session.userId ? res.json({ id: req.session.userId }) : res.status(401).json({ error: "Unauthorized" }));
  const server = app.listen(0, "127.0.0.1");
  await new Promise(resolve => server.once("listening", resolve));
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  const base = `http://127.0.0.1:${server.address().port}`;
  function client() {
    let cookie = "";
    return {
      get cookie() { return cookie; },
      async request(url, body, method = "POST", fixedCookie) {
        const response = await fetch(base + url, { method, headers: { "Content-Type": "application/json", ...(fixedCookie || cookie ? { Cookie: fixedCookie || cookie } : {}) }, ...(method !== "GET" ? { body: JSON.stringify(body || {}) } : {}) });
        const set = response.headers.get("set-cookie");
        if (set) cookie = set.split(";")[0];
        return { status: response.status, data: response.status === 204 ? null : await response.json(), cookie, headers: response.headers };
      },
      login(extra = {}) { return this.request("/api/auth/login", { identifier: "staff", password: PASSWORD, ...extra }); },
      verify(code) { return this.request("/api/auth/login/verify-otp", { otp: code }); },
      resend() { return this.request("/api/auth/login/resend-otp"); },
      me() { return this.request("/api/auth/me", null, "GET"); }
    };
  }
  return { db, user: () => db.get("users").find({ id: 1 }).value(), change: values => db.get("users").find({ id: 1 }).assign(values).write(),
    emails, events, settings, client, advance: ms => { clock += ms; }, fail: value => { failDelivery = value; } };
}

test("password first, then a session-bound OTP, single use, with session rotation", async t => {
  const f = await fixture(t), c = f.client();
  assert.equal((await c.login({ password: "wrong" })).status, 401);
  assert.equal(f.emails.length, 0);
  const start = await c.login({ email: "attacker@example.com", allowPasswordOnlyLogin: true });
  assert.equal(start.data.status, "otp_required");
  assert.equal(start.headers.get("cache-control"), "no-store");
  assert.equal(start.data.devOtp, undefined);
  assert.equal(f.emails[0].email, "staff@example.com");
  assert.equal(f.emails[0].purpose, "login");
  assert.equal((await c.me()).status, 401);
  assert.notEqual(f.user().loginOtp.codeHash, f.emails[0].code);
  const pendingCookie = c.cookie;
  assert.equal((await f.client().verify(f.emails[0].code)).status, 401);
  assert.equal((await c.verify(f.emails[0].code)).status, 200);
  assert.notEqual(c.cookie, pendingCookie);
  assert.equal((await c.me()).status, 200);
  assert.equal((await c.verify(f.emails[0].code)).status, 401);
  assert.equal(f.user().loginOtp, null);
  assert.equal(f.events.filter(e => e[0] === "LOGIN").length, 1);
});

for (const [name, changes] of Object.entries({
  "no contact": { email: null, emailVerifiedAt: null, phone: null },
  "phone only": { email: null, emailVerifiedAt: null, phone: "+254700000000", phoneVerifiedAt: "2026-10-14" },
  "unverified email": { emailVerifiedAt: null },
  "malformed stored email": { email: "not-an-email" },
  "exempt account without verified email": { emailVerifiedAt: null, allowPasswordOnlyLogin: true },
  "administrator without contact": { email: null, emailVerifiedAt: null, role: "admin", allowPasswordOnlyLogin: true }
})) test(`${name}: contact administrator, no enrollment or session`, async t => {
  const f = await fixture(t, changes), c = f.client();
  const before = JSON.stringify(f.user());
  const result = await c.login({ email: "attacker@example.com", phone: "+254711111111", adminEmailVerified: true, allowPasswordOnlyLogin: true });
  assert.equal(result.status, 403);
  assert.equal(result.data.code, "CONTACT_ADMIN_REQUIRED");
  assert.equal(JSON.stringify(f.user()), before);
  assert.equal(f.emails.length, 0);
  assert.equal((await c.me()).status, 401);
});

test("explicit admin exemption allows password-only login but request flags do not", async t => {
  const f = await fixture(t, { allowPasswordOnlyLogin: true }), c = f.client();
  assert.equal((await c.login({ password: "wrong" })).status, 401);
  assert.equal((await c.login()).status, 200);
  assert.equal((await c.me()).status, 200);
  assert.equal(f.emails.length, 0);
  assert.equal(f.events.find(e => e[0] === "LOGIN")[3].method, "password_only");
});

for (const changes of [{ accountStatus: "disabled" }, { isActive: false }, { accountStatus: "pending_verification" }]) {
  test(`exemption cannot bypass inactive status ${JSON.stringify(changes)}`, async t => {
    const f = await fixture(t, { ...changes, allowPasswordOnlyLogin: true }), c = f.client();
    assert.equal((await c.login()).status, 403);
    assert.equal((await c.me()).status, 401);
    assert.equal(f.emails.length, 0);
  });
}

test("resend throttle applies across browser sessions and new password logins", async t => {
  const f = await fixture(t), c = f.client();
  await c.login();
  assert.equal((await c.resend()).status, 429);
  assert.equal((await f.client().login()).status, 429);
  assert.equal(f.emails.length, 1);
  f.advance(11000);
  assert.equal((await c.resend()).status, 200);
  assert.equal(f.emails.length, 2);
  // Crypto randomness can generate the same numeric value; compare hashes via challenge data separately.
  if (f.emails[0].code !== f.emails[1].code) assert.equal((await c.verify(f.emails[0].code)).status, 400);
  assert.equal((await c.verify(f.emails[1].code)).status, 200);
});

test("five incorrect attempts lock verification and cannot be reset by resending/relogging", async t => {
  const f = await fixture(t), c = f.client();
  await c.login();
  for (let i = 0; i < 5; i++) assert.equal((await c.verify("000000")).status, i === 4 ? 429 : 400);
  assert.equal((await c.verify(f.emails[0].code)).status, 429);
  f.advance(11000);
  assert.equal((await c.resend()).status, 429);
  assert.equal((await f.client().login()).status, 429);
  assert.equal((await c.me()).status, 401);
});

test("five sends per account per 15 minutes, regardless of session", async t => {
  const f = await fixture(t), c = f.client();
  await c.login();
  for (let i = 0; i < 4; i++) { f.advance(11000); assert.equal((await c.resend()).status, 200); }
  f.advance(11000);
  assert.equal((await c.resend()).status, 429);
  assert.equal((await f.client().login()).status, 429);
  assert.equal(f.emails.length, 5);
});

test("expired OTP cannot authenticate; resend works within the challenge lifetime", async t => {
  const f = await fixture(t), c = f.client();
  await c.login(); f.advance(61000);
  assert.equal((await c.verify(f.emails[0].code)).status, 400);
  assert.equal((await c.resend()).status, 200);
  assert.equal((await c.verify(f.emails[1].code)).status, 200);
});

test("expired sign-in challenge requires password validation again", async t => {
  const f = await fixture(t), c = f.client();
  await c.login(); f.advance(16 * 60000);
  assert.equal((await c.verify(f.emails[0].code)).status, 401);
  assert.equal((await c.resend()).status, 401);
});

test("failed email delivery never grants a session or keeps a usable challenge", async t => {
  const f = await fixture(t, {}, { failDelivery: true }), c = f.client();
  const result = await c.login();
  assert.equal(result.status, 503);
  assert.equal(result.data.code, "OTP_DELIVERY_FAILED");
  assert.equal(f.user().loginOtp, null);
  assert.equal((await c.me()).status, 401);
  assert.equal((await c.verify("123456")).status, 401);
});

for (const [name, changes] of Object.entries({
  "email changes": { email: "replacement@example.com" },
  "verification revoked": { emailVerifiedAt: null },
  "password changes": { passwordHash: bcrypt.hashSync("New-password-1234", 4) },
  "account disabled": { accountStatus: "disabled" },
  "user inactive": { isActive: false }
})) test(`pending challenge rejected when ${name}`, async t => {
  const f = await fixture(t), c = f.client();
  await c.login(); f.change(changes);
  assert.notEqual((await c.verify(f.emails[0].code)).status, 200);
  assert.notEqual((await c.resend()).status, 200);
  assert.equal((await c.me()).status, 401);
});

test("maintenance is checked again on verification, and exemption cannot bypass it", async t => {
  const f = await fixture(t), c = f.client();
  await c.login();
  f.settings.maintenanceMode = true;
  f.settings.maintenanceEndsAt = new Date(Date.now() + 600000).toISOString();
  assert.equal((await c.verify(f.emails[0].code)).status, 423);
  f.change({ allowPasswordOnlyLogin: true });
  assert.equal((await f.client().login()).status, 423);
});

test("concurrent replay authenticates only one request", async t => {
  const f = await fixture(t), c = f.client();
  await c.login(); const cookie = c.cookie;
  const results = await Promise.all([1, 2].map(() => f.client().request("/api/auth/login/verify-otp", { otp: f.emails[0].code }, "POST", cookie)));
  assert.equal(results.filter(r => r.status === 200).length, 1);
});

test("IP password-attempt throttle limits credential guessing", async t => {
  const f = await fixture(t), c = f.client();
  for (let i = 0; i < 30; i++) assert.equal((await c.login({ password: "wrong" })).status, 401);
  assert.equal((await c.login()).status, 429);
});

test("administrator email updates never inherit verification or outstanding codes", () => {
  const current = { email: "old@example.com", emailVerifiedAt: "old-timestamp", phone: "+254700000000", phoneVerifiedAt: "old-timestamp" };
  const changed = adminContactUpdates(current, { email: "new@example.com", phone: "+254711111111" });
  assert.equal(changed.emailVerifiedAt, null);
  assert.equal(changed.phoneVerifiedAt, null);
  assert.equal(changed.loginOtp, null);
  assert.equal(changed.emailOtpHash, null);
  assert.equal(changed.resetSessionHash, null);
  assert.ok(adminContactUpdates(current, { email: "new@example.com", adminEmailVerified: true }).emailVerifiedAt);
  assert.equal(adminContactUpdates(current, { email: "old@example.com" }).emailVerifiedAt, undefined);
  assert.equal(adminContactUpdates(current, { email: "", adminEmailVerified: true }).emailVerifiedAt, null);
  assert.equal(adminContactUpdates(current, { email: "new@example.com", adminEmailVerified: "true" }).emailVerifiedAt, null);
});

test("actual account routes reject anonymous and non-admin exemption/contact changes", async t => {
  const f = await fixture(t, { allowPasswordOnlyLogin: true, permissions: { manageUsers: true } }, { adminRoutes: true });
  const c = f.client();
  assert.equal((await c.request("/api/auth/users/1", { allowPasswordOnlyLogin: true }, "PATCH")).status, 401);
  await c.login();
  assert.equal((await c.request("/api/auth/users/1", { email: "attacker@example.com", adminEmailVerified: true }, "PATCH")).status, 403);
  assert.equal((await c.request("/api/auth/users/1", { allowPasswordOnlyLogin: false }, "PATCH")).status, 403);
  assert.equal((await c.request("/api/auth/users", { username: "new", password: PASSWORD, email: "new@example.com", adminEmailVerified: true, allowPasswordOnlyLogin: true })).status, 403);
  assert.equal(f.user().email, "staff@example.com");
});

test("actual admin routes grant and revoke an exemption, recording the change", async t => {
  const f = await fixture(t, { role: "admin", allowPasswordOnlyLogin: true }, { adminRoutes: true });
  f.db.get("users").push({ ...f.user(), id: 2, username: "target", email: "target@example.com", allowPasswordOnlyLogin: false }).write();
  const admin = f.client(); await admin.login();
  const grant = await admin.request("/api/auth/users/2", { allowPasswordOnlyLogin: true }, "PATCH");
  assert.equal(grant.status, 200);
  assert.equal(grant.data.allowPasswordOnlyLogin, true);
  const target = f.client();
  assert.equal((await target.login({ identifier: "target" })).data.id, 2);
  assert.equal(f.emails.length, 0);
  assert.equal((await admin.request("/api/auth/users/2", { allowPasswordOnlyLogin: false }, "PATCH")).status, 200);
  assert.equal((await f.client().login({ identifier: "target" })).data.status, "otp_required");
  assert.equal(f.events.filter(e => e[0] === "LOGIN_OTP_EXEMPTION_CHANGED").length, 2);
});

test("actual admin routes revoke stale email verification and require explicit reconfirmation", async t => {
  const f = await fixture(t, { role: "admin", allowPasswordOnlyLogin: true }, { adminRoutes: true });
  f.db.get("users").push({ ...f.user(), id: 2, username: "target", email: "target@example.com", emailOtpHash: "old-code", resetSessionHash: "old-reset" }).write();
  const admin = f.client(); await admin.login();
  const change = await admin.request("/api/auth/users/2", { email: "replacement@example.com" }, "PATCH");
  assert.equal(change.status, 200);
  assert.equal(change.data.emailVerifiedAt, null);
  assert.equal(change.data.allowPasswordOnlyLogin, false);
  const user = f.db.get("users").find({ id: 2 }).value();
  assert.equal(user.emailOtpHash, null); assert.equal(user.resetSessionHash, null);
  assert.equal((await f.client().login({ identifier: "target" })).data.code, "CONTACT_ADMIN_REQUIRED");
  assert.equal((await admin.request("/api/auth/users/2", { allowPasswordOnlyLogin: true }, "PATCH")).status, 400);
  assert.equal((await admin.request("/api/auth/users/2", { adminEmailVerified: "true" }, "PATCH")).status, 400);
  assert.equal((await admin.request("/api/auth/users/2", { adminEmailVerified: true, allowPasswordOnlyLogin: true }, "PATCH")).status, 200);
  assert.equal((await f.client().login({ identifier: "target" })).data.id, 2);
});

test("actual admin create route defaults to OTP and refuses exemption without a verified email", async t => {
  const f = await fixture(t, { role: "admin", allowPasswordOnlyLogin: true }, { adminRoutes: true });
  const admin = f.client(); await admin.login();
  assert.equal((await admin.request("/api/auth/users", { username: "blocked", password: PASSWORD, email: "blocked@example.com", allowPasswordOnlyLogin: true })).status, 400);
  const created = await admin.request("/api/auth/users", { username: "new-user", password: PASSWORD, email: "new@example.com", adminEmailVerified: true });
  assert.equal(created.status, 201);
  assert.equal(created.data.allowPasswordOnlyLogin, false);
  assert.ok(created.data.emailVerifiedAt);
  assert.equal((await f.client().login({ identifier: "new-user" })).data.status, "otp_required");
});

test("stale admin session cannot change security policy after demotion or disablement", async t => {
  const f = await fixture(t, { role: "admin", allowPasswordOnlyLogin: true }, { adminRoutes: true });
  const admin = f.client(); await admin.login();
  f.change({ role: "staff" });
  assert.equal((await admin.request("/api/auth/users/1", { allowPasswordOnlyLogin: false }, "PATCH")).status, 403);
  f.change({ role: "admin", accountStatus: "disabled" });
  assert.equal((await admin.request("/api/auth/users/1", { allowPasswordOnlyLogin: false }, "PATCH")).status, 403);
});
