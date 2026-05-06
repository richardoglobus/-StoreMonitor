"use strict";

const express = require("express");
const cors = require("cors");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const low = require("lowdb");
const FileSync = require("lowdb/adapters/FileSync");
const { v4: uuidv4 } = require("uuid");
const path = require("path");

const adapter = new FileSync(process.env.DATA_PATH || path.join(__dirname, "store.json"));
const db = low(adapter);

db.defaults({
  _seq: { users: 0, departments: 0, items: 0, inventory: 0, receipts: 0, issues: 0, purchases: 0, activities: 0 },
  users: [],
  departments: [],
  items: [],
  inventory: [],
  receipts: [],
  issues: [],
  purchases: [],
  activities: []
}).write();

function nextId(table) {
  const id = (db.get(`_seq.${table}`).value() || 0) + 1;
  db.set(`_seq.${table}`, id).write();
  return id;
}

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

const DEPARTMENTS = [
  "MALE WARD","PAEDS","FEMALE WARD","MATERNITY","HDU","THEATRE",
  "DENTAL","LAB","OPD CASUALTY","RADIOLOGY","MCH","CASTING",
  "REVENUE","KITCHEN","AMBULANCE","STORES","RECORDS","CCC","PITC",
  "DNSM","MAINTAINANCE","NSM","LAUNDRY","MORGUE","PHYSIOTHERAPY"
];

const ITEMS = [
  ["ABSORBENT COTTON WOOL 500G","ROLL"],["ABSORBENT GAUZE 36*100YDS","ROLL"],
  ["ADRENALINE 1MG/1ML","AMP"],["ALCOHOL SWABS","PKT"],
  ["AMOXICILLIN 250MG/5ML SUSP","BTL"],["AMOXICILLIN 500MG CAPS","PKT"],
  ["AMPICILLIN 500MG INJ","VIAL"],["ARTESUNATE 60MG INJ","AMP"],
  ["ASPIRIN 300MG TABS","PKT"],["BANDAGE 10CM CREPE","ROLL"],
  ["BANDAGE 15CM CREPE","ROLL"],["BANDAGE PLASTER OF PARIS 15CM","ROLL"],
  ["BENZYL PENICILLIN 5MU","VIAL"],["BLOOD GIVING SETS","PC"],
  ["BLOOD GLUCOSE TEST STRIPS","BOX"],["CANNULA IV 18G","PC"],
  ["CANNULA IV 20G","PC"],["CANNULA IV 22G","PC"],
  ["CATHETER FOLEY 12FG","PC"],["CATHETER FOLEY 14FG","PC"],
  ["CATHETER FOLEY 16FG","PC"],["CATHETER SUCTION CH12","PC"],
  ["CATHETER SUCTION CH14","PC"],["CHLORHEXIDINE 0.5% 500ML","BTL"],
  ["CHLORHEXIDINE 4% SCRUB","BTL"],["CIPROFLOXACIN 200MG INJ","VIAL"],
  ["CIPROFLOXACIN 500MG TABS","PKT"],["CLINDAMYCIN 300MG CAPS","PKT"],
  ["CO-AMOXICLAV 1.2G INJ","VIAL"],["CO-AMOXICLAV 625MG TABS","PKT"],
  ["COTTON APPLICATORS","PKT"],["DEXTROSE 5% 500ML","BTL"],
  ["DEXTROSE 50% 50ML","AMP"],["DIAZEPAM 10MG/2ML INJ","AMP"],
  ["DICLOFENAC 75MG/3ML INJ","AMP"],["DRESSING PACK","PC"],
  ["ELASTOPLAST 7.5CM*5M","ROLL"],["ERGOMETRINE 0.2MG/ML INJ","AMP"],
  ["EXAMINATION GLOVES LARGE","BOX"],["EXAMINATION GLOVES MEDIUM","BOX"],
  ["EXAMINATION GLOVES SMALL","BOX"],["FERROUS SULPHATE 200MG","PKT"],
  ["FLUCONAZOLE 200MG CAPS","PKT"],["FOLIC ACID 5MG TABS","PKT"],
  ["FUROSEMIDE 20MG/2ML INJ","AMP"],["FUROSEMIDE 40MG TABS","PKT"],
  ["GELOFUSINE 500ML","BTL"],["GENTAMICIN 80MG/2ML INJ","AMP"],
  ["GLUCOSE SALINE 500ML","BTL"],["GLYCERINE SUPPOSITORY","PC"],
  ["HYDROCORTISONE 100MG INJ","VIAL"],["HYDROGEN PEROXIDE 3%","BTL"],
  ["IBUPROFEN 400MG TABS","PKT"],["INSULIN ACTRAPID 100IU","VIAL"],
  ["INSULIN INSULATARD 100IU","VIAL"],["INSULIN SYRINGE 1ML","PC"],
  ["KETAMINE 500MG/10ML INJ","VIAL"],["LIGNOCAINE 1% INJ","VIAL"],
  ["LIGNOCAINE 2% INJ","VIAL"],["MAGNESIUM SULPHATE 50% INJ","AMP"],
  ["METHYLDOPA 250MG TABS","PKT"],["METRONIDAZOLE 200MG/5ML SUSP","BTL"],
  ["METRONIDAZOLE 500MG TABS","PKT"],["METRONIDAZOLE 500MG INJ","VIAL"],
  ["MORPHINE 10MG/ML INJ","AMP"],["NIFEDIPINE 10MG CAPS","PKT"],
  ["NORMAL SALINE 0.9% 500ML","BTL"],["NORMAL SALINE 0.9% 1L","BTL"],
  ["NYSTATIN 100000IU TABS","PKT"],["OMEPRAZOLE 40MG INJ","VIAL"],
  ["OMEPRAZOLE 20MG CAPS","PKT"],["ORAL REHYDRATION SALTS","SACHET"],
  ["OXYTOCIN 10IU/ML INJ","AMP"],["PARACETAMOL 500MG TABS","PKT"],
  ["PARACETAMOL 250MG/5ML SUSP","BTL"],["PARACETAMOL SUPPOSITORY","PC"],
  ["PETHIDINE 100MG/2ML INJ","AMP"],["PHENOBARBITONE 200MG INJ","AMP"],
  ["PHENYTOIN 250MG/5ML INJ","AMP"],["PHYTOMENADIONE 10MG INJ","AMP"],
  ["PLASTER ZINC OXIDE 1.25CM","ROLL"],["PLASTER ZINC OXIDE 2.5CM","ROLL"],
  ["POVIDONE IODINE 10%","BTL"],["PROCAINE PENICILLIN 3MU","VIAL"],
  ["QUININE 300MG TABS","PKT"],["QUININE 600MG/2ML INJ","AMP"],
  ["RANITIDINE 50MG/2ML INJ","AMP"],["RINGER'S LACTATE 500ML","BTL"],
  ["SALBUTAMOL 2.5MG NEBULES","PC"],["SODIUM BICARBONATE 8.4%","AMP"],
  ["STERILE GAUZE 36*100YDS","ROLL"],["STERILE GLOVES SIZE 6","PAIR"],
  ["STERILE GLOVES SIZE 6.5","PAIR"],["STERILE GLOVES SIZE 7","PAIR"],
  ["STERILE GLOVES SIZE 7.5","PAIR"],["STERILE GLOVES SIZE 8","PAIR"],
  ["SURGICAL SPIRIT 500ML","BTL"],["SYRINGE 2ML","PC"],
  ["SYRINGE 5ML","PC"],["SYRINGE 10ML","PC"],["SYRINGE 20ML","PC"],
  ["TRANEXAMIC ACID 500MG INJ","AMP"],["URINE TEST STRIPS","BOX"],
  ["VASELINE GAUZE","PC"],["WATER FOR INJECTION 10ML","AMP"],
  ["WATER FOR INJECTION 5ML","AMP"],["WOUND DRESSING NO.1","PC"],
  ["WOUND DRESSING NO.2","PC"],["WOUND DRESSING NO.3","PC"],["ZINC OXIDE TAPE 2.5CM","ROLL"]
];

const UNIT_FULL_NAMES = {
  ROLL: "Roll",
  AMP: "Ampoule",
  PKT: "Packet",
  BTL: "Bottle",
  VIAL: "Vial",
  PC: "Piece",
  BOX: "Box",
  SACHET: "Sachet",
  PAIR: "Pair"
};

const ALL_PERMISSIONS = {
  viewDashboard: true,
  issueItems: true,
  manageCatalog: true,
  manageDepartments: true,
  manageInventory: true,
  managePurchases: true,
  viewReports: true,
  exportData: true,
  deleteTransactions: true,
  viewActivityLogs: true,
  manageUsers: true
};

function getDefaultPermissions(role) {
  if (role === "admin") return { ...ALL_PERMISSIONS };
  if (role === "manager") {
    return {
      viewDashboard: true,
      issueItems: true,
      manageCatalog: true,
      manageDepartments: true,
      manageInventory: true,
      managePurchases: true,
      viewReports: true,
      exportData: true,
      deleteTransactions: true,
      viewActivityLogs: false,
      manageUsers: false
    };
  }
  return {
    viewDashboard: true,
    issueItems: true,
    manageCatalog: false,
    manageDepartments: false,
    manageInventory: false,
    managePurchases: false,
    viewReports: false,
    exportData: false,
    deleteTransactions: false,
    viewActivityLogs: false,
    manageUsers: false
  };
}

function normalizePermissions(role, permissions) {
  const defaults = getDefaultPermissions(role);
  if (!permissions || typeof permissions !== "object") return defaults;
  return {
    viewDashboard: permissions.viewDashboard !== undefined ? !!permissions.viewDashboard : defaults.viewDashboard,
    issueItems: permissions.issueItems !== undefined ? !!permissions.issueItems : defaults.issueItems,
    manageCatalog: permissions.manageCatalog !== undefined ? !!permissions.manageCatalog : defaults.manageCatalog,
    manageDepartments: permissions.manageDepartments !== undefined ? !!permissions.manageDepartments : defaults.manageDepartments,
    manageInventory: permissions.manageInventory !== undefined ? !!permissions.manageInventory : defaults.manageInventory,
    managePurchases: permissions.managePurchases !== undefined ? !!permissions.managePurchases : defaults.managePurchases,
    viewReports: permissions.viewReports !== undefined ? !!permissions.viewReports : defaults.viewReports,
    exportData: permissions.exportData !== undefined ? !!permissions.exportData : defaults.exportData,
    deleteTransactions: permissions.deleteTransactions !== undefined ? !!permissions.deleteTransactions : defaults.deleteTransactions,
    viewActivityLogs: permissions.viewActivityLogs !== undefined ? !!permissions.viewActivityLogs : defaults.viewActivityLogs,
    manageUsers: permissions.manageUsers !== undefined ? !!permissions.manageUsers : defaults.manageUsers
  };
}

function getCurrentStockForItem(itemId) {
  const item = db.get("items").find({ id: itemId }).value();
  const opening = item?.quantity ?? 0;
  const purchasedTotal = db.get("purchases").filter({ itemId }).value().reduce((s, p) => s + Number(p.quantity || 0), 0);
  const issuedTotal = db.get("issues").filter({ itemId }).value().reduce((s, i) => s + Number(i.quantity || 0), 0);
  return opening + purchasedTotal - issuedTotal;
}

function logActivity(req, action, entityType, entityId, details = null) {
  if (!req?.session?.userId) return;
  db.get("activities").push({
    id: nextId("activities"),
    userId: req.session.userId,
    username: req.session.username || null,
    action,
    entityType,
    entityId: entityId ?? null,
    details,
    createdAt: new Date().toISOString()
  }).write();
}

if (db.get("departments").value().length === 0) {
  for (const name of DEPARTMENTS) {
    db.get("departments").push({ id: nextId("departments"), name, slug: slugify(name) }).write();
  }
  console.log("Seeded departments");
}
if (db.get("items").value().length === 0) {
  for (const [description, unit] of ITEMS) {
    db.get("items").push({ id: nextId("items"), description, unit: UNIT_FULL_NAMES[unit] || unit, quantity: 0 }).write();
  }
  console.log("Seeded items");
}
if (db.get("users").value().length === 0) {
  const hash = bcrypt.hashSync("admin123", 10);
  db.get("users").push({
    id: nextId("users"),
    username: "admin",
    passwordHash: hash,
    fullName: "Administrator",
    role: "admin",
    permissions: getDefaultPermissions("admin")
  }).write();
  console.log("Created admin user: admin / admin123");
}

for (const item of db.get("items").value()) {
  const updates = {};
  if (item.quantity === undefined) updates.quantity = 0;
  if (item.unit && UNIT_FULL_NAMES[item.unit]) updates.unit = UNIT_FULL_NAMES[item.unit];
  if (Object.keys(updates).length) db.get("items").find({ id: item.id }).assign(updates).write();
}
for (const user of db.get("users").value()) {
  db.get("users").find({ id: user.id }).assign({ permissions: normalizePermissions(user.role, user.permissions) }).write();
}

function weekdayFor(dateStr) {
  const d = new Date(dateStr + "T00:00:00Z");
  const day = d.getUTCDay();
  if (day === 2) return "TUE";
  if (day === 5) return "FRI";
  return "OTHER";
}

function monthRange(month) {
  const [y, m] = month.split("-").map(Number);
  const start = `${String(y).padStart(4,"0")}-${String(m).padStart(2,"0")}-01`;
  const nd = new Date(Date.UTC(y, m, 1));
  const end = `${nd.getUTCFullYear()}-${String(nd.getUTCMonth()+1).padStart(2,"0")}-01`;
  return { start, end };
}

function currentMonth() {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,"0")}`;
}

function inRange(dateStr, start, end) { return dateStr >= start && dateStr < end; }

function nextIssueDate() {
  const now = new Date();
  for (let i = 0; i < 14; i++) {
    const d = new Date(now); d.setUTCDate(d.getUTCDate() + i);
    const day = d.getUTCDay();
    if (day === 2 || day === 5) {
      return { date: `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,"0")}-${String(d.getUTCDate()).padStart(2,"0")}`, weekday: day===2?"TUE":"FRI" };
    }
  }
  return { date: "", weekday: "TUE" };
}

function tuesdaysAndFridays(month) {
  const [y, m] = month.split("-").map(Number);
  const dim = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const result = [];
  for (let d = 1; d <= dim; d++) {
    const day = new Date(Date.UTC(y, m-1, d)).getUTCDay();
    if (day === 2 || day === 5)
      result.push({ date: `${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`, weekday: day===2?"TUE":"FRI" });
  }
  return result;
}

function getItemMap() { return new Map(db.get("items").value().map(i=>[i.id,i])); }
function getDeptMap() { return new Map(db.get("departments").value().map(d=>[d.id,d])); }

function buildInventoryRows(departmentId, month) {
  const { start, end } = monthRange(month);
  const items = db.get("items").orderBy("description","asc").value();
  const invRows = db.get("inventory").filter({departmentId,month}).value();
  const receipts = db.get("receipts").filter(r=>r.departmentId===departmentId&&inRange(r.receivedAt,start,end)).value();
  const issues = db.get("issues").filter(i=>i.departmentId===departmentId&&inRange(i.issuedAt,start,end)).value();
  const invByItem = new Map(invRows.map(r=>[r.itemId,r]));
  const recvKemsa=new Map(), recvMeds=new Map();
  for (const r of receipts) {
    if (r.source==="KEMSA") recvKemsa.set(r.itemId,(recvKemsa.get(r.itemId)||0)+r.quantity);
    else if (r.source==="MEDS") recvMeds.set(r.itemId,(recvMeds.get(r.itemId)||0)+r.quantity);
  }
  const issuedMap=new Map();
  for (const i of issues) issuedMap.set(i.itemId,(issuedMap.get(i.itemId)||0)+i.quantity);
  return items.map(item=>{
    const inv=invByItem.get(item.id);
    const physicalCount=inv?.physicalCount??0;
    const receivedKemsa=recvKemsa.get(item.id)??0;
    const receivedMeds=recvMeds.get(item.id)??0;
    const totalUsed=issuedMap.get(item.id)??0;
    const balance=physicalCount+receivedKemsa+receivedMeds-totalUsed;
    return {id:inv?.id??-item.id,departmentId,itemId:item.id,month,physicalCount,receivedKemsa,receivedMeds,totalUsed,balance,item:{id:item.id,description:item.description,unit:item.unit}};
  });
}

function csvEscape(v) {
  if (v===null||v===undefined) return "";
  const s=String(v);
  return /[",\n\r]/.test(s)?`"${s.replace(/"/g,'""')}"`:s;
}

const app = express();
app.set("trust proxy", 1);
app.use(cors({credentials:true,origin:true}));
app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(session({
  secret: process.env.SESSION_SECRET||"dev-secret-store-2024",
  resave:false,saveUninitialized:false,rolling:true,
  cookie:{httpOnly:true,sameSite:"lax",secure:process.env.NODE_ENV==="production",maxAge:86400000*30}
}));

function requireAuth(req,res,next){ if(!req.session.userId) return res.status(401).json({error:"Unauthorized"}); next(); }
function requireAdmin(req,res,next){ if(!req.session.userId) return res.status(401).json({error:"Unauthorized"}); if(req.session.role!=="admin") return res.status(403).json({error:"Forbidden"}); next(); }
function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.session.userId) return res.status(401).json({ error: "Unauthorized" });
    const user = db.get("users").find({ id: req.session.userId }).value();
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const permissions = normalizePermissions(user.role, user.permissions);
    if (!permissions[permission]) return res.status(403).json({ error: "Forbidden" });
    next();
  };
}

app.get("/api/healthz",(_,res)=>res.json({status:"ok"}));

// AUTH
app.post("/api/auth/login",(req,res)=>{
  const {username,password}=req.body;
  const user=db.get("users").find({username}).value();
  if(!user||!bcrypt.compareSync(password,user.passwordHash)) return res.status(401).json({error:"Invalid credentials"});
  req.session.userId=user.id; req.session.username=user.username; req.session.role=user.role;
  const permissions = normalizePermissions(user.role, user.permissions);
  req.session.permissions = permissions;
  logActivity(req, "LOGIN", "AUTH", user.id, null);
  res.json({id:user.id,username:user.username,fullName:user.fullName,role:user.role,permissions});
});
app.post("/api/auth/logout",(req,res)=>{
  logActivity(req, "LOGOUT", "AUTH", req.session.userId, null);
  req.session.destroy(()=>{ res.clearCookie("connect.sid"); res.status(204).send(); });
});
app.get("/api/auth/me",(req,res)=>{
  if(!req.session.userId) return res.status(401).json({error:"Unauthorized"});
  const user=db.get("users").find({id:req.session.userId}).value();
  if(!user) return res.status(401).json({error:"Unauthorized"});
  res.json({id:user.id,username:user.username,fullName:user.fullName,role:user.role,permissions:normalizePermissions(user.role, user.permissions)});
});
app.get("/api/auth/users",requirePermission("manageUsers"),(_,res)=>{ res.json(db.get("users").orderBy("username","asc").value().map(u=>({id:u.id,username:u.username,fullName:u.fullName,role:u.role,permissions:normalizePermissions(u.role, u.permissions)}))); });
app.post("/api/auth/users",requireAdmin,(req,res)=>{
  const {username,password,fullName,role,permissions}=req.body;
  if(!username||!password) return res.status(400).json({error:"Missing fields"});
  if(db.get("users").find({username}).value()) return res.status(400).json({error:"Username already exists"});
  const id=nextId("users");
  const resolvedRole = role || "staff";
  const user={id,username,passwordHash:bcrypt.hashSync(password,10),fullName:fullName||null,role:resolvedRole,permissions:normalizePermissions(resolvedRole, permissions)};
  db.get("users").push(user).write();
  logActivity(req, "CREATE_USER", "USER", id, { username, role: user.role });
  res.status(201).json({id,username,fullName:user.fullName,role:user.role,permissions:user.permissions});
});
app.patch("/api/auth/users/:userId",requireAdmin,(req,res)=>{
  const userId=Number(req.params.userId);
  const {fullName,role,password,permissions}=req.body;
  const user=db.get("users").find({id:userId});
  if(!user.value()) return res.status(404).json({error:"Not found"});
  const current = user.value();
  const updates={};
  if(fullName!==undefined) updates.fullName=fullName;
  if(role!==undefined) updates.role=role;
  if(password) updates.passwordHash=bcrypt.hashSync(password,10);
  const resolvedRole = updates.role || current.role;
  if (permissions !== undefined || role !== undefined) updates.permissions = normalizePermissions(resolvedRole, permissions !== undefined ? permissions : current.permissions);
  user.assign(updates).write();
  const u=user.value();
  logActivity(req, "UPDATE_USER", "USER", u.id, { role: u.role });
  res.json({id:u.id,username:u.username,fullName:u.fullName,role:u.role,permissions:normalizePermissions(u.role, u.permissions)});
});
app.delete("/api/auth/users/:userId",requireAdmin,(req,res)=>{
  const userId=Number(req.params.userId);
  if(userId===req.session.userId) return res.status(400).json({error:"Cannot delete your own account"});
  db.get("users").remove({id:userId}).write();
  logActivity(req, "DELETE_USER", "USER", userId, null);
  res.status(204).send();
});

app.use(["/api/departments","/api/items","/api/inventory","/api/receipts","/api/issues","/api/purchases","/api/dashboard","/api/reports","/api/export","/api/activity"],requireAuth);

// DEPARTMENTS
app.get("/api/departments",(_,res)=>res.json(db.get("departments").orderBy("name","asc").value()));
app.post("/api/departments",requirePermission("manageDepartments"),(req,res)=>{
  const {name}=req.body; if(!name) return res.status(400).json({error:"Name required"});
  if(db.get("departments").find({name}).value()) return res.status(400).json({error:"Already exists"});
  const row={id:nextId("departments"),name,slug:slugify(name)};
  logActivity(req, "CREATE_DEPARTMENT", "DEPARTMENT", row.id, { name: row.name });
  db.get("departments").push(row).write(); res.status(201).json(row);
});
app.get("/api/departments/:id",(req,res)=>{
  const row=db.get("departments").find({id:Number(req.params.id)}).value();
  if(!row) return res.status(404).json({error:"Not found"}); res.json(row);
});

// ITEMS
app.get("/api/items",(_,res)=>res.json(db.get("items").orderBy("description","asc").value()));
app.get("/api/items/stock",(_,res)=>{
  const items=db.get("items").orderBy("description","asc").value();
  const pMap=new Map(),iMap=new Map();
  for(const p of db.get("purchases").value()) pMap.set(p.itemId,(pMap.get(p.itemId)||0)+p.quantity);
  for(const i of db.get("issues").value()) iMap.set(i.itemId,(iMap.get(i.itemId)||0)+i.quantity);
  res.json(items.map(it=>({
    id:it.id,
    description:it.description,
    unit:it.unit,
    quantity:it.quantity ?? 0,
    purchasedTotal:pMap.get(it.id)??0,
    issuedTotal:iMap.get(it.id)??0,
    stockBalance:(it.quantity ?? 0)+(pMap.get(it.id)??0)-(iMap.get(it.id)??0)
  })));
});
app.post("/api/items",requirePermission("manageCatalog"),(req,res)=>{
  const {description,unit,quantity}=req.body; if(!description||!unit) return res.status(400).json({error:"Missing fields"});
  if(db.get("items").find({description}).value()) return res.status(400).json({error:"Already exists"});
  const row={id:nextId("items"),description:String(description).trim().toUpperCase(),unit:String(unit).trim().toUpperCase(),quantity:Number(quantity)||0,lowStockThreshold:req.body.lowStockThreshold!=null&&req.body.lowStockThreshold!=""?Number(req.body.lowStockThreshold):null};
  db.get("items").push(row).write();
  logActivity(req, "CREATE_ITEM", "ITEM", row.id, { description: row.description });
  res.status(201).json(row);
});
app.patch("/api/items/:id",requirePermission("manageCatalog"),(req,res)=>{
  const id=Number(req.params.id);
  const row=db.get("items").find({id});
  if(!row.value()) return res.status(404).json({error:"Not found"});
  const {description,unit,quantity}=req.body;
  if(description!==undefined && !String(description).trim()) return res.status(400).json({error:"Description required"});
  if(unit!==undefined && !String(unit).trim()) return res.status(400).json({error:"Unit required"});
  if(description!==undefined){
    const dup=db.get("items").find(i=>i.description===description&&i.id!==id).value();
    if(dup) return res.status(400).json({error:"Already exists"});
  }
  const updates={};
  if(description!==undefined) updates.description=String(description).trim().toUpperCase();
  if(unit!==undefined) updates.unit=String(unit).trim().toUpperCase();
  if(req.body.lowStockThreshold!==undefined) updates.lowStockThreshold=req.body.lowStockThreshold===''||req.body.lowStockThreshold===null?null:Number(req.body.lowStockThreshold);
  if(quantity!==undefined) updates.quantity=Number(quantity)||0;
  row.assign(updates).write();
  logActivity(req, "UPDATE_ITEM", "ITEM", id, updates);
  res.json(row.value());
});
app.delete("/api/items/:id",requirePermission("manageCatalog"),(req,res)=>{
  const id=Number(req.params.id);
  const inPurchases=db.get("purchases").find({itemId:id}).value();
  const inIssues=db.get("issues").find({itemId:id}).value();
  const inInventory=db.get("inventory").find({itemId:id}).value();
  const inReceipts=db.get("receipts").find({itemId:id}).value();
  if(inPurchases||inIssues||inInventory||inReceipts) return res.status(400).json({error:"Item has transactions and cannot be deleted"});
  db.get("items").remove({id}).write();
  logActivity(req, "DELETE_ITEM", "ITEM", id, null);
  res.status(204).send();
});

// INVENTORY
app.get("/api/inventory",(req,res)=>{
  const departmentId=Number(req.query.departmentId),month=req.query.month||currentMonth();
  if(!departmentId) return res.status(400).json({error:"departmentId required"});
  res.json(buildInventoryRows(departmentId,month));
});
app.post("/api/inventory",requirePermission("manageInventory"),(req,res)=>{
  const {departmentId,itemId,month,physicalCount}=req.body;
  const existing=db.get("inventory").find({departmentId,itemId,month});
  if(existing.value()) existing.assign({physicalCount}).write();
  else db.get("inventory").push({id:nextId("inventory"),departmentId,itemId,month,physicalCount}).write();
  logActivity(req, "UPDATE_PHYSICAL_COUNT", "INVENTORY", itemId, { departmentId, month, physicalCount });
  res.json(buildInventoryRows(departmentId,month).find(r=>r.itemId===itemId));
});

// RECEIPTS
app.get("/api/receipts",(req,res)=>{
  const departmentId=req.query.departmentId?Number(req.query.departmentId):null,month=req.query.month;
  const {start,end}=month?monthRange(month):{start:null,end:null};
  const itemMap=getItemMap(),deptMap=getDeptMap();
  let rows=db.get("receipts").value();
  if(departmentId) rows=rows.filter(r=>r.departmentId===departmentId);
  if(start) rows=rows.filter(r=>inRange(r.receivedAt,start,end));
  rows=rows.sort((a,b)=>b.receivedAt.localeCompare(a.receivedAt)||b.id-a.id);
  res.json(rows.map(r=>({...r,item:itemMap.get(r.itemId),department:deptMap.get(r.departmentId)})));
});
app.post("/api/receipts",(req,res)=>{
  const {departmentId,itemId,source,quantity,receivedAt}=req.body;
  const row={id:nextId("receipts"),departmentId,itemId,source,quantity,receivedAt};
  db.get("receipts").push(row).write();
  logActivity(req, "CREATE_RECEIPT", "RECEIPT", row.id, { departmentId, itemId, quantity, source });
  res.status(201).json(row);
});

// ISSUES
app.get("/api/issues",requirePermission("issueItems"),(req,res)=>{
  const departmentId=req.query.departmentId?Number(req.query.departmentId):null,month=req.query.month,limit=req.query.limit?Number(req.query.limit):null;
  const {start,end}=month?monthRange(month):{start:null,end:null};
  const itemMap=getItemMap(),deptMap=getDeptMap();
  let rows=db.get("issues").value();
  if(departmentId) rows=rows.filter(r=>r.departmentId===departmentId);
  if(start) rows=rows.filter(r=>inRange(r.issuedAt,start,end));
  rows=rows.sort((a,b)=>b.issuedAt.localeCompare(a.issuedAt)||b.id-a.id);
  if(limit) rows=rows.slice(0,limit);
  res.json(rows.map(r=>({...r,item:itemMap.get(r.itemId),department:deptMap.get(r.departmentId)})));
});
app.post("/api/issues",requirePermission("issueItems"),(req,res)=>{
  const {departmentId,itemId,quantity,issuedAt,folioNo,s11No,note}=req.body;
  const available = getCurrentStockForItem(itemId);
  if (available <= 0) return res.status(400).json({ error: "Item is out of stock" });
  if (Number(quantity) > available) return res.status(400).json({ error: "Quantity exceeds stock in hand" });
  const row={id:nextId("issues"),voucherId:null,folioNo:folioNo||null,s11No:s11No||null,departmentId,itemId,quantity,issuedAt,weekday:weekdayFor(issuedAt),note:note||null};
  db.get("issues").push(row).write();
  logActivity(req, "CREATE_ISSUE", "ISSUE", row.id, { departmentId, itemId, quantity });
  res.status(201).json(row);
});
app.post("/api/issues/voucher",requirePermission("issueItems"),(req,res)=>{
  const {departmentId,issuedAt,s11No,note,items}=req.body;
  if(!departmentId) return res.status(400).json({error:"Department is required"});
  if(!s11No||!String(s11No).trim()) return res.status(400).json({error:"S11 number is required"});
  if(!items||!items.length) return res.status(400).json({error:"No items"});
  for (const it of items) {
    if(!it.folioNo||!String(it.folioNo).trim()) return res.status(400).json({error:"Folio number required for each item"});
    const available = getCurrentStockForItem(it.itemId);
    if (available <= 0) return res.status(400).json({ error: "One or more items are out of stock" });
    if (Number(it.quantity) > available) return res.status(400).json({ error: "One or more quantities exceed stock in hand" });
  }
  const voucherId=uuidv4(),wd=weekdayFor(issuedAt),inserted=[];
  for(const it of items){
    const row={id:nextId("issues"),voucherId,folioNo:String(it.folioNo||"").trim()||null,s11No:s11No||null,departmentId,itemId:it.itemId,quantity:it.quantity,issuedAt,weekday:wd,note:it.note||note||null};
    db.get("issues").push(row).write(); inserted.push(row);
  }
  logActivity(req, "CREATE_ISSUE_VOUCHER", "ISSUE", null, { departmentId, itemCount: items.length, voucherId });
  res.status(201).json(inserted);
});
app.delete("/api/issues/:id",requirePermission("deleteTransactions"),(req,res)=>{ const id=Number(req.params.id); db.get("issues").remove({id}).write(); logActivity(req, "DELETE_ISSUE", "ISSUE", id, null); res.status(204).send(); });

// PURCHASES
app.get("/api/purchases",requirePermission("managePurchases"),(req,res)=>{
  const month=req.query.month,itemId=req.query.itemId?Number(req.query.itemId):null;
  const {start,end}=month?monthRange(month):{start:null,end:null};
  const itemMap=getItemMap();
  let rows=db.get("purchases").value();
  if(itemId) rows=rows.filter(r=>r.itemId===itemId);
  if(start) rows=rows.filter(r=>inRange(r.purchasedAt,start,end));
  rows=rows.sort((a,b)=>b.purchasedAt.localeCompare(a.purchasedAt)||b.id-a.id);
  res.json(rows.map(r=>({...r,item:itemMap.get(r.itemId)})));
});
app.post("/api/purchases",requirePermission("managePurchases"),(req,res)=>{
  const {supplier,itemId,quantity,unitPrice,purchasedAt,note,invoiceNo}=req.body;
  if(!supplier||!String(supplier).trim()) return res.status(400).json({error:"Supplier is required"});
  if(!invoiceNo||!String(invoiceNo).trim()) return res.status(400).json({error:"Invoice number is required"});
  const row={id:nextId("purchases"),supplier,itemId,quantity,unitPrice:Number(unitPrice),invoiceNo:invoiceNo||null,purchasedAt,note:note||null};
  db.get("purchases").push(row).write();
  logActivity(req, "CREATE_PURCHASE", "PURCHASE", row.id, { supplier, itemId, quantity, invoiceNo: row.invoiceNo });
  res.status(201).json(row);
});
app.delete("/api/purchases/:id",requirePermission("deleteTransactions"),(req,res)=>{ const id=Number(req.params.id); db.get("purchases").remove({id}).write(); logActivity(req, "DELETE_PURCHASE", "PURCHASE", id, null); res.status(204).send(); });

// DASHBOARD

// ── Settings ─────────────────────────────────────────────────────────────
const DEFAULT_SETTINGS = {
  inactivityTimeoutMinutes: 1,
  warningBeforeSeconds: 10,
  lowStockDefaultThreshold: 10,
  issueDays: ["TUESDAY","FRIDAY"],
  hospitalName: "Mukurweini Hospital Stores",
  sessionDurationDays: 30,
  requireFolioPerItem: true,
  reportChargeItem: "2211002",
  allowDataExports: true,
  maxLoginAttempts: 5,
};
function getSettings(){
  const stored=db.get("settings").value()||{};
  return {...DEFAULT_SETTINGS,...stored};
}
app.get("/api/settings",requirePermission("manageUsers"),(req,res)=>{
  res.json(getSettings());
});
app.patch("/api/settings",requirePermission("manageUsers"),(req,res)=>{
  const current=getSettings();
  const allowed=Object.keys(DEFAULT_SETTINGS);
  const updates={};
  for(const key of allowed){ if(req.body[key]!==undefined) updates[key]=req.body[key]; }
  const next={...current,...updates};
  db.set("settings",next).write();
  logActivity(req,"UPDATE_SETTINGS","SETTINGS",null,updates);
  res.json(next);
});
app.get("/api/settings/public",(req,res)=>{
  const s=getSettings();
  res.json({hospitalName:s.hospitalName,inactivityTimeoutMinutes:s.inactivityTimeoutMinutes,warningBeforeSeconds:s.warningBeforeSeconds});
});

app.get("/api/dashboard/summary",requirePermission("viewDashboard"),(req,res)=>{
  const month=req.query.month||currentMonth(),{start,end}=monthRange(month);
  const depCount=db.get("departments").value().length,itemCount=db.get("items").value().length;
  const issues=db.get("issues").filter(r=>inRange(r.issuedAt,start,end)).value();
  const purchases=db.get("purchases").filter(r=>inRange(r.purchasedAt,start,end)).value();
  const totalIssued=issues.reduce((s,r)=>s+r.quantity,0);
  const totalReceived=purchases.reduce((s,r)=>s+r.quantity,0);
  let lowStockCount=0,outOfStockCount=0;
  for(const dept of db.get("departments").value()){
    for(const r of buildInventoryRows(dept.id,month)){
      if(r.balance<=0) outOfStockCount++; else if(r.balance<=10) lowStockCount++;
    }
  }
  const next=nextIssueDate();
  res.json({month,totalDepartments:depCount,totalItems:itemCount,totalIssuedThisMonth:totalIssued,totalReceivedThisMonth:totalReceived,lowStockCount,outOfStockCount,nextIssueDate:next.date||null,nextIssueWeekday:next.date?next.weekday:null});
});

// ACTIVITY LOG
app.get("/api/activity",requireAdmin,(req,res)=>{
  const limit=req.query.limit?Number(req.query.limit):100;
  const rows=db.get("activities").value().sort((a,b)=>b.createdAt.localeCompare(a.createdAt)||b.id-a.id).slice(0,limit);
  res.json(rows);
});
app.get("/api/dashboard/recent-issues",requirePermission("viewDashboard"),(req,res)=>{
  const limit=Number(req.query.limit)||10;
  const itemMap=getItemMap(),deptMap=getDeptMap();
  const rows=db.get("issues").value().sort((a,b)=>b.issuedAt.localeCompare(a.issuedAt)||b.id-a.id).slice(0,limit);
  res.json(rows.map(r=>({...r,item:itemMap.get(r.itemId),department:deptMap.get(r.departmentId)})));
});
app.get("/api/dashboard/low-stock",requirePermission("viewDashboard"),(req,res)=>{
  const settings=getSettings();
  const globalThreshold=req.query.threshold!=null?Number(req.query.threshold):settings.lowStockDefaultThreshold||10;
  const result=[];
  for(const item of db.get("items").value()){
    const threshold=item.lowStockThreshold!=null?Number(item.lowStockThreshold):globalThreshold;
    const bal=getCurrentStockForItem(item.id);
    if(bal<=threshold) result.push({itemId:item.id,itemDescription:item.description,unit:item.unit,balance:bal,threshold});
  }
  result.sort((a,b)=>a.balance-b.balance);
  res.json(result);
});
app.get("/api/dashboard/department-usage",requirePermission("viewDashboard"),(req,res)=>{
  const month=req.query.month||currentMonth(),{start,end}=monthRange(month);
  const issues=db.get("issues").filter(r=>inRange(r.issuedAt,start,end)).value();
  const result=db.get("departments").value().map(dept=>{
    const di=issues.filter(i=>i.departmentId===dept.id);
    return {departmentId:dept.id,departmentName:dept.name,totalIssued:di.reduce((s,i)=>s+i.quantity,0),issueCount:di.length};
  });
  result.sort((a,b)=>b.totalIssued-a.totalIssued);
  res.json(result);
});
app.get("/api/dashboard/top-used-items",requirePermission("viewDashboard"),(req,res)=>{
  const month=req.query.month||currentMonth(),limit=Number(req.query.limit)||10;
  const {start,end}=monthRange(month),itemMap=getItemMap();
  const totals=new Map();
  for(const i of db.get("issues").filter(r=>inRange(r.issuedAt,start,end)).value())
    totals.set(i.itemId,(totals.get(i.itemId)||0)+i.quantity);
  res.json(Array.from(totals.entries()).map(([itemId,totalIssued])=>{const item=itemMap.get(itemId);return{itemId,itemDescription:item?.description||"",unit:item?.unit||"",totalIssued};}).sort((a,b)=>b.totalIssued-a.totalIssued).slice(0,limit));
});
app.get("/api/dashboard/issue-schedule",requirePermission("viewDashboard"),(req,res)=>{
  const month=req.query.month||currentMonth(),days=tuesdaysAndFridays(month);
  if(!days.length) return res.json([]);
  const {start,end}=monthRange(month);
  const dayMap=new Map();
  for(const i of db.get("issues").filter(r=>inRange(r.issuedAt,start,end)).value()){
    if(!dayMap.has(i.issuedAt)) dayMap.set(i.issuedAt,{issueCount:0,totalQuantity:0});
    const d=dayMap.get(i.issuedAt); d.issueCount++; d.totalQuantity+=i.quantity;
  }
  res.json(days.map(d=>{const m=dayMap.get(d.date);return{date:d.date,weekday:d.weekday,issueCount:m?.issueCount??0,totalQuantity:m?.totalQuantity??0};}));
});

// REPORTS
function expandMonths(start,end){
  const [sy,sm]=start.split("-").map(Number),[ey,em]=end.split("-").map(Number);
  const months=[];let y=sy,m=sm;
  while(y<ey||(y===ey&&m<=em)){months.push(`${String(y).padStart(4,"0")}-${String(m).padStart(2,"0")}`);m++;if(m>12){m=1;y++;}}
  return months;
}
function buildReport(startMonth,endMonth,itemId){
  const months=expandMonths(startMonth,endMonth);
  if(!months.length) return {startMonth,endMonth,commodities:[]};
  const overallStart=monthRange(months[0]).start;
  let items=db.get("items").orderBy("description","asc").value();
  if(itemId) items=items.filter(i=>i.id===itemId);
  const allP=db.get("purchases").value(),allI=db.get("issues").value();
  const running=new Map(),lastPrice=new Map();
  for(const item of items) running.set(item.id,Number(item.quantity)||0);
  for(const p of allP.filter(p=>p.purchasedAt<overallStart).sort((a,b)=>a.purchasedAt.localeCompare(b.purchasedAt)||a.id-b.id)){
    if(itemId&&p.itemId!==itemId) continue;
    running.set(p.itemId,(running.get(p.itemId)||0)+p.quantity);
    lastPrice.set(p.itemId,Number(p.unitPrice)||0);
  }
  for(const i of allI){
    if(i.issuedAt>=overallStart) continue;
    if(itemId&&i.itemId!==itemId) continue;
    running.set(i.itemId,(running.get(i.itemId)||0)-i.quantity);
  }
  const CHARGE="2211002";
  const commodityMap=new Map();
  for(const item of items) commodityMap.set(item.id,{itemId:item.id,itemDescription:item.description,unit:item.unit,rows:[],hasActivity:false});
  for(const month of months){
    const {start,end}=monthRange(month);
    const [y,m]=month.split("-").map(Number);
    const lastDayDate=new Date(Date.UTC(y,m,0));
    const lastDay=lastDayDate.getUTCFullYear()+"-"+String(lastDayDate.getUTCMonth()+1).padStart(2,"0")+"-"+String(lastDayDate.getUTCDate()).padStart(2,"0");
    for(const item of items){
      const openingQty=running.get(item.id)??0;
      const openingPrice=Number(lastPrice.get(item.id)||0);
      const monthPurchases=allP.filter(p=>p.itemId===item.id&&inRange(p.purchasedAt,start,end)).sort((a,b)=>a.purchasedAt.localeCompare(b.purchasedAt)||a.id-b.id);
      const monthIssues=allI.filter(i=>i.itemId===item.id&&inRange(i.issuedAt,start,end));
      const totalIssued=monthIssues.reduce((s,i)=>s+Number(i.quantity||0),0);
      const totalAdditions=monthPurchases.reduce((s,p)=>s+Number(p.quantity||0),0);
      const closingBalance=openingQty+totalAdditions-totalIssued;
      const commodity=commodityMap.get(item.id);
      if(openingQty===0&&totalAdditions===0&&totalIssued===0){running.set(item.id,closingBalance);continue;}
      commodity.hasActivity=true;
      commodity.rows.push({rowType:"opening",month,date:start,units:openingQty,unitPrice:openingPrice||null,openingTotalCost:openingPrice?openingQty*openingPrice:null,additionsUnits:null,additionsUnitCost:null,itemsIssued:null,balance:openingQty,chargeItem:CHARGE,responsibleOfficer:null,remarks:"Opening balance"});
      let runBal=openingQty;
      for(const p of monthPurchases){
        const price=Number(p.unitPrice||0);
        runBal+=Number(p.quantity||0);
        lastPrice.set(item.id,price||lastPrice.get(item.id)||0);
        commodity.rows.push({rowType:"additions",month,date:p.purchasedAt,units:null,unitPrice:price||null,openingTotalCost:null,additionsUnits:Number(p.quantity||0),additionsUnitCost:price?Number(p.quantity||0)*price:null,itemsIssued:null,balance:runBal,chargeItem:CHARGE,responsibleOfficer:null,remarks:p.note||(p.supplier?"From "+p.supplier:"Additions")});
      }
      commodity.rows.push({rowType:"closing",month,date:lastDay,units:null,unitPrice:null,openingTotalCost:null,additionsUnits:null,additionsUnitCost:null,itemsIssued:totalIssued||null,balance:closingBalance,chargeItem:CHARGE,responsibleOfficer:null,remarks:"Closing balance"});
      running.set(item.id,closingBalance);
    }
  }
  const commodities=Array.from(commodityMap.values()).filter(c=>c.hasActivity);
  return {startMonth,endMonth,commodities};
}

app.get("/api/reports/monthly",requirePermission("viewReports"),(req,res)=>{
  const startMonth=req.query.startMonth||currentMonth(),endMonth=req.query.endMonth||currentMonth();
  const itemId=req.query.itemId?Number(req.query.itemId):undefined;
  res.json(buildReport(startMonth,endMonth,itemId));
});

// EXPORTS
app.get("/api/export/issues.csv",requirePermission("exportData"),(req,res)=>{
  const month=req.query.month,departmentId=req.query.departmentId?Number(req.query.departmentId):null;
  const {start,end}=month?monthRange(month):{start:null,end:null};
  const itemMap=getItemMap(),deptMap=getDeptMap();
  let rows=db.get("issues").value();
  if(departmentId) rows=rows.filter(r=>r.departmentId===departmentId);
  if(start) rows=rows.filter(r=>inRange(r.issuedAt,start,end));
  rows=rows.sort((a,b)=>a.issuedAt.localeCompare(b.issuedAt)||a.id-b.id);
  const lines=[["ID","Date","Weekday","Department","Item","Unit","Quantity","Note"].map(csvEscape).join(",")];
  for(const r of rows){const item=itemMap.get(r.itemId),dept=deptMap.get(r.departmentId);lines.push([r.id,r.issuedAt,r.weekday,dept?.name||"",item?.description||"",item?.unit||"",r.quantity,r.note??""].map(csvEscape).join(","));}
  res.setHeader("Content-Type","text/csv");
  res.setHeader("Content-Disposition",`attachment; filename="issues_${month??"all"}${departmentId?`_dept${departmentId}`:""}.csv"`);
  res.send(lines.join("\n"));
});
app.get("/api/export/inventory.csv",requirePermission("exportData"),(req,res)=>{
  const departmentId=Number(req.query.departmentId),month=req.query.month||currentMonth();
  if(!departmentId) return res.status(400).json({error:"departmentId required"});
  const dept=db.get("departments").find({id:departmentId}).value();
  const inv=buildInventoryRows(departmentId,month),days=tuesdaysAndFridays(month);
  const {start,end}=monthRange(month);
  const dayMap=new Map();
  for(const r of db.get("issues").filter(i=>i.departmentId===departmentId&&inRange(i.issuedAt,start,end)).value()){
    if(!dayMap.has(r.issuedAt)) dayMap.set(r.issuedAt,new Map());
    dayMap.get(r.issuedAt).set(r.itemId,(dayMap.get(r.issuedAt).get(r.itemId)||0)+r.quantity);
  }
  const headers=["#","Item","Unit","Physical Count","KEMSA","MEDS",...days.map(d=>`${d.weekday} ${d.date.slice(8)}`),"Total Used","Balance"];
  const lines=[headers.map(csvEscape).join(",")];
  inv.forEach((r,i)=>{ const perDay=days.map(d=>dayMap.get(d.date)?.get(r.itemId)??0); lines.push([i+1,r.item.description,r.item.unit,r.physicalCount,r.receivedKemsa,r.receivedMeds,...perDay,r.totalUsed,r.balance].map(csvEscape).join(",")); });
  res.setHeader("Content-Type","text/csv");
  res.setHeader("Content-Disposition",`attachment; filename="inventory_${(dept?.name||"dept").replace(/[^A-Za-z0-9]+/g,"_")}_${month}.csv"`);
  res.send(lines.join("\n"));
});
app.get("/api/export/monthly-report.csv",requirePermission("exportData"),(req,res)=>{
  const startMonth=req.query.startMonth||currentMonth(),endMonth=req.query.endMonth||currentMonth();
  const itemId=req.query.itemId?Number(req.query.itemId):undefined;
  const data=buildReport(startMonth,endMonth,itemId);
  const lines=[];
  const commodities=data.commodities||[];
  for(const c of commodities){
    lines.push([csvEscape("COMMODITY: "+c.itemDescription+" ("+c.unit+")")]);
    lines.push(["Date","Opening Units","Unit Price","Opening Cost","Additions","Cost of Additions","Items Issued","Balance","Charge Item","Responsible Officer","Remarks"].map(csvEscape).join(","));
    let lastMon="";
    for(const r of c.rows){
      if(r.month&&r.month!==lastMon){
        const [y,m]=r.month.split("-").map(Number);
        const mn=new Date(Date.UTC(y,m-1,1)).toLocaleString("en-US",{month:"long",year:"numeric",timeZone:"UTC"});
        lines.push([csvEscape("--- "+mn+" ---")]);
        lastMon=r.month;
      }
      lines.push([r.date,r.units??"",r.unitPrice??"",r.openingTotalCost??"",r.additionsUnits??"",r.additionsUnitCost??"",r.itemsIssued??"",r.balance,r.chargeItem||"2211002",r.responsibleOfficer||"",r.remarks||""].map(csvEscape).join(","));
    }
    lines.push("");
  }
  res.setHeader("Content-Type","text/csv");
  res.setHeader("Content-Disposition",`attachment; filename="monthly_report_${startMonth}_to_${endMonth}.csv"`);
  res.send(lines.join("\n"));
});

// ── Excel Exports ────────────────────────────────────────────────────────────
app.get("/api/export/monthly-report.xlsx", requirePermission("exportData"), async (req, res) => {
  try {
    const ExcelJS = require("exceljs");
    const startMonth = req.query.startMonth || currentMonth();
    const endMonth = req.query.endMonth || currentMonth();
    const data = buildReport(startMonth, endMonth);
    const commodities = data.commodities || [];
    const wb = new ExcelJS.Workbook();
    wb.creator = "Mukurweini Hospital Stores";
    wb.created = new Date();
    const COLORS = ["4F46E5","EC4899","F59E0B","10B981","3B82F6","EF4444","8B5CF6","14B8A6","F97316","06B6D4","84CC16","E11D48"];

    if(commodities.length===0){
      const ws=wb.addWorksheet("No Data");
      ws.addRow(["No activity found for the selected period"]);
    }
    commodities.forEach((c, ci) => {
      const color = COLORS[ci % COLORS.length];
      const sheetName = c.itemDescription.replace(/[\\/:*?\[\]]/g, "").slice(0, 28);
      const ws = wb.addWorksheet(sheetName);

      const titleRow = ws.addRow([c.itemDescription]);
      titleRow.getCell(1).font = { bold: true, size: 13, color: { argb: "FF" + color } };
      titleRow.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF5F3FF" } };
      ws.addRow(["Unit: " + c.unit]).getCell(1).font = { italic: true, color: { argb: "FF6B7280" }, size: 10 };
      ws.addRow([]);

      const headers = ["Date","Opening Units","Unit Price","Opening Cost","Additions","Cost of Additions","Items Issued","Balance","Charge Item","Responsible Officer","Remarks"];
      const headerRow = ws.addRow(headers);
      headerRow.eachCell(cell => {
        cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + color } };
        cell.alignment = { horizontal: "center" };
      });

      let lastMonth = "";
      c.rows.forEach(r => {
        if (r.month && r.month !== lastMonth) {
          if (lastMonth) { const s = ws.addRow([]); s.height = 4; }
          lastMonth = r.month;
          const [y, m] = r.month.split("-").map(Number);
          const mn = new Date(Date.UTC(y, m - 1, 1)).toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
          const mRow = ws.addRow(["\u2500\u2500 " + mn + " \u2500\u2500"]);
          mRow.getCell(1).font = { bold: true, italic: true, color: { argb: "FF" + color }, size: 10 };
        }
        const isO = r.rowType === "opening", isA = r.rowType === "additions", isC = r.rowType === "closing";
        const row = ws.addRow([
          r.date,
          r.units != null ? r.units : "",
          r.unitPrice != null ? r.unitPrice : "",
          r.openingTotalCost != null ? r.openingTotalCost : "",
          r.additionsUnits != null ? r.additionsUnits : "",
          r.additionsUnitCost != null ? r.additionsUnitCost : "",
          r.itemsIssued != null ? r.itemsIssued : "",
          r.balance,
          r.chargeItem || "2211002",
          r.responsibleOfficer || "",
          r.remarks || ""
        ]);
        if (isO) row.eachCell(cell => { cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0E7FF" } }; });
        else if (isA) row.eachCell(cell => { cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD1FAE5" } }; });
        else if (isC) { row.eachCell(cell => { cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F4F6" } }; }); }
        const bal = Number(r.balance);
        if (bal <= 0) row.getCell(8).font = { bold: true, color: { argb: "FFDC2626" } };
        else if (bal <= 10) row.getCell(8).font = { bold: true, color: { argb: "FFD97706" } };
        else if (isC) row.getCell(8).font = { bold: true };
      });

      ws.columns = [{width:14},{width:14},{width:12},{width:16},{width:12},{width:18},{width:13},{width:10},{width:13},{width:20},{width:22}];
    });

    const buffer = await wb.xlsx.writeBuffer();
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", 'attachment; filename="monthly_report_' + startMonth + '_to_' + endMonth + '.xlsx"');
    res.setHeader("Content-Length", buffer.length);
    res.end(buffer);
  } catch (err) {
    console.error("Monthly Excel error:", err);
    res.status(500).json({ error: "Excel export failed: " + err.message });
  }
});

app.get("/api/export/all-departments.xlsx", requirePermission("exportData"), async (req, res) => {
  try {
    const ExcelJS = require("exceljs");
    const startMonth = req.query.startMonth || currentMonth();
    const endMonth = req.query.endMonth || currentMonth();
    const wb = new ExcelJS.Workbook();
    wb.creator = "Mukurweini Hospital Stores";
    wb.created = new Date();
    const DEPT_COLORS = ["4F46E5","EC4899","F59E0B","10B981","3B82F6","EF4444","8B5CF6","14B8A6","F97316","06B6D4","84CC16","E11D48","7C3AED","0EA5E9","D97706"];
    const months = expandMonths(startMonth, endMonth);
    const departments = db.get("departments").value();
    const allItems = db.get("items").orderBy("description", "asc").value();
    const DAY_NAMES = ["SUN","MON","TUE","WED","THU","FRI","SAT"];
    const DAY_COLORS = {TUE:"FF3B82F6",FRI:"FF8B5CF6",MON:"FF10B981",WED:"FFF59E0B",THU:"FFF97316",SAT:"FFEC4899",SUN:"FFEF4444"};
    const DAY_BG = {TUE:"FFDBEAFE",FRI:"FFEDE9FE",MON:"FFD1FAE5",WED:"FFFEF3C7",THU:"FFFFEDD5",SAT:"FFFCE7F3",SUN:"FFFEE2E2"};

    departments.forEach((dept, di) => {
      const color = DEPT_COLORS[di % DEPT_COLORS.length];
      const sheetName = dept.name.replace(/[\\/:*?\[\]]/g, "").slice(0, 28);
      const ws = wb.addWorksheet(sheetName);

      const titleRow = ws.addRow([dept.name]);
      titleRow.getCell(1).font = { bold: true, size: 14, color: { argb: "FF" + color } };
      titleRow.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF5F3FF" } };
      ws.addRow(["Period: " + startMonth + " to " + endMonth]).getCell(1).font = { italic: true, color: { argb: "FF6B7280" } };
      ws.addRow([]);

      for (const month of months) {
        const { start, end } = monthRange(month);
        const [y, m] = month.split("-").map(Number);
        const monthLabel = new Date(Date.UTC(y, m - 1, 1)).toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
        const dim = new Date(Date.UTC(y, m, 0)).getUTCDate();

        // Get all issues for this dept this month
        const deptIssues = db.get("issues").filter(i => i.departmentId === dept.id && inRange(i.issuedAt, start, end)).value();
        const issuedDatesSet = new Set(deptIssues.map(i => i.issuedAt));

        // All dates that had issues OR are Tue/Fri
        const allDates = [];
        for (let d = 1; d <= dim; d++) {
          const dt = new Date(Date.UTC(y, m - 1, d));
          const dayNum = dt.getUTCDay();
          const ds = y + "-" + String(m).padStart(2,"0") + "-" + String(d).padStart(2,"0");
          const isTueFri = dayNum === 2 || dayNum === 5;
          if (isTueFri || issuedDatesSet.has(ds)) {
            allDates.push({ ds, label: d + " " + dt.toLocaleString("en-US",{month:"short",timeZone:"UTC"}), weekday: DAY_NAMES[dayNum], isTueFri });
          }
        }

        // Month header
        const mLabelRow = ws.addRow([monthLabel]);
        mLabelRow.getCell(1).font = { bold: true, size: 12, color: { argb: "FFFFFFFF" } };
        mLabelRow.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + color } };
        if (allDates.length > 0) ws.mergeCells(mLabelRow.number, 1, mLabelRow.number, 6 + allDates.length);

        // Column headers
        const headerCells = ["Item","Unit","Opening","KEMSA","MEDS", ...allDates.map(d => d.weekday + "\n" + d.label), "Total Issued","Balance"];
        const headerRow = ws.addRow(headerCells);
        headerRow.height = 36;
        headerRow.eachCell((cell, ci) => {
          cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 9 };
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + color } };
          cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
        });
        headerRow.getCell(1).alignment = { horizontal: "left", vertical: "middle" };

        // Weekday sub-header
        const wdRow = ws.addRow(["","","","","",...allDates.map(d=>d.weekday),"",""]);
        wdRow.eachCell((cell, ci) => {
          if (ci <= 5 || ci > 5 + allDates.length) return;
          const wd = allDates[ci - 6] && allDates[ci - 6].weekday;
          if (!wd) return;
          cell.font = { bold: true, size: 8, color: { argb: DAY_COLORS[wd] || "FF374151" } };
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: DAY_BG[wd] || "FFF3F4F6" } };
          cell.alignment = { horizontal: "center" };
        });

        // Build lookups
        const receipts = db.get("receipts").filter(r => r.departmentId === dept.id && inRange(r.receivedAt, start, end)).value();
        const invRows = db.get("inventory").filter({ departmentId: dept.id, month }).value();
        const invByItem = new Map(invRows.map(r => [r.itemId, r]));
        const recvKemsa = new Map(), recvMeds = new Map();
        for (const r of receipts) {
          if (r.source === "KEMSA") recvKemsa.set(r.itemId, (recvKemsa.get(r.itemId)||0) + r.quantity);
          else if (r.source === "MEDS") recvMeds.set(r.itemId, (recvMeds.get(r.itemId)||0) + r.quantity);
        }
        const issueLookup = new Map();
        for (const iss of deptIssues) {
          if (!issueLookup.has(iss.itemId)) issueLookup.set(iss.itemId, new Map());
          const dm = issueLookup.get(iss.itemId);
          dm.set(iss.issuedAt, (dm.get(iss.issuedAt)||0) + iss.quantity);
        }

        let hasData = false;
        allItems.forEach((item, ii) => {
          const inv = invByItem.get(item.id);
          const opening = inv ? inv.physicalCount : 0;
          const kemsa = recvKemsa.get(item.id) || 0;
          const meds = recvMeds.get(item.id) || 0;
          const dm = issueLookup.get(item.id);
          const totalIssued = dm ? Array.from(dm.values()).reduce((a,b)=>a+b,0) : 0;
          const balance = opening + kemsa + meds - totalIssued;
          if (opening === 0 && kemsa === 0 && meds === 0 && totalIssued === 0) return;
          hasData = true;
          const issueCols = allDates.map(d => dm && dm.get(d.ds) ? dm.get(d.ds) : "");
          const rowData = [item.description, item.unit, opening||"", kemsa||"", meds||"", ...issueCols, totalIssued||"", balance];
          const row = ws.addRow(rowData);
          row.eachCell((cell, ci) => {
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ii%2===0?"FFFFFFFF":"FFF9FAFB" } };
            cell.alignment = { horizontal: ci <= 2 ? "left" : "center", vertical: "middle" };
          });
          if (kemsa > 0) row.getCell(4).font = { bold: true, color: { argb: "FF059669" } };
          if (meds > 0) row.getCell(5).font = { bold: true, color: { argb: "FF0891B2" } };
          allDates.forEach((d, idx) => {
            const cell = row.getCell(6 + idx);
            if (cell.value) {
              const fg = DAY_COLORS[d.weekday] || "FF374151";
              cell.font = { bold: true, color: { argb: fg } };
              if (!d.isTueFri) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF7ED" } };
            }
          });
          const balCell = row.getCell(7 + allDates.length);
          const bv = Number(balance);
          if (bv <= 0) balCell.font = { bold: true, color: { argb: "FFDC2626" } };
          else if (bv <= 10) balCell.font = { bold: true, color: { argb: "FFD97706" } };
          else balCell.font = { bold: true, color: { argb: "FF059669" } };
        });

        if (!hasData) ws.addRow(["No activity for this month"]).getCell(1).font = { italic: true, color: { argb: "FF9CA3AF" } };
        ws.addRow([]);
      }

      ws.getColumn(1).width = 34;
      ws.getColumn(2).width = 8;
      ws.getColumn(3).width = 10;
      ws.getColumn(4).width = 10;
      ws.getColumn(5).width = 10;
      for (let i = 6; i <= 50; i++) ws.getColumn(i).width = 10;
    });

    // Summary sheet
    const sumWs = wb.addWorksheet("Summary");
    sumWs.addRow(["All Departments Summary"]).getCell(1).font = { bold: true, size: 14, color: { argb: "FF4F46E5" } };
    sumWs.addRow(["Period: " + startMonth + " to " + endMonth]).getCell(1).font = { italic: true };
    sumWs.addRow([]);
    const sumH = sumWs.addRow(["Department","Total Qty Issued","Unique Items","KEMSA Received","MEDS Received"]);
    sumH.eachCell(cell => { cell.font = { bold: true, color: { argb: "FFFFFFFF" } }; cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4F46E5" } }; });
    const { start: aS } = monthRange(months[0]), { end: aE } = monthRange(months[months.length - 1]);
    departments.forEach((dept, di) => {
      const di2 = db.get("issues").filter(i => i.departmentId===dept.id && i.issuedAt>=aS && i.issuedAt<aE).value();
      const dr = db.get("receipts").filter(r => r.departmentId===dept.id && r.receivedAt>=aS && r.receivedAt<aE).value();
      const row = sumWs.addRow([dept.name, di2.reduce((s,i)=>s+i.quantity,0), new Set(di2.map(i=>i.itemId)).size, dr.filter(r=>r.source==="KEMSA").reduce((s,r)=>s+r.quantity,0)||"-", dr.filter(r=>r.source==="MEDS").reduce((s,r)=>s+r.quantity,0)||"-"]);
      row.getCell(1).font = { color: { argb: "FF" + DEPT_COLORS[di%DEPT_COLORS.length] }, bold: true };
    });
    sumWs.columns = [{width:30},{width:18},{width:15},{width:18},{width:18}];

    const buffer = await wb.xlsx.writeBuffer();
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", 'attachment; filename="all_departments_' + startMonth + '_to_' + endMonth + '.xlsx"');
    res.setHeader("Content-Length", buffer.length);
    res.end(buffer);
  } catch (err) {
    console.error("All-depts Excel error:", err);
    res.status(500).json({ error: "Export failed: " + err.message });
  }
});


// Serve frontend build in production deployments (single-origin app)
const frontendDistPath = path.join(__dirname, "..", "frontend", "dist");
app.use(express.static(frontendDistPath));
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/")) return next();
  res.sendFile(path.join(frontendDistPath, "index.html"), (err) => {
    if (err) next();
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\n✅ Store Monitor API running → http://localhost:${PORT}`);
  console.log(`   Login: admin / admin123`);
  console.log(`   Data:  ${path.join(__dirname, "store.json")}\n`);
});
