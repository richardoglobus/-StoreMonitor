"use strict";

const express = require("express");
const compression = require("compression");
const cors = require("cors");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const low = require("lowdb");
const FileSync = require("lowdb/adapters/FileSync");
const { v4: uuidv4 } = require("uuid");
const path = require("path");
const fs = require("fs");
const { createClient } = require("@supabase/supabase-js");

// ── Supabase Storage sync ──────────────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const BUCKET = "store-data";
const BACKUP_FILE = "store.json";

let supabase = null;
if (SUPABASE_URL && SUPABASE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  console.log("✓ Supabase storage client ready");
}

const dataPath = process.env.DATA_PATH || path.join(__dirname, "store.json");

// Download on startup — called once before server starts (via spawn trick below)
async function downloadFromSupabase() {
  if (!supabase) return;
  try {
    const { data, error } = await supabase.storage.from(BUCKET).download(BACKUP_FILE);
    if (error) { console.log("No Supabase backup yet — starting fresh"); return; }
    const text = await data.text();
    fs.mkdirSync(path.dirname(dataPath), { recursive: true });
    fs.writeFileSync(dataPath, text, "utf8");
    console.log("✓ Store data restored from Supabase");
  } catch (e) { console.error("Supabase download error:", e.message); }
}

async function syncToSupabase() {
  if (!supabase) return;
  try {
    const content = fs.readFileSync(dataPath, "utf8");
    const { error } = await supabase.storage.from(BUCKET).upload(BACKUP_FILE,
      Buffer.from(content, "utf8"),
      { contentType: "application/json", upsert: true }
    );
    if (error) console.error("Supabase sync failed:", error.message);
  } catch (e) { console.error("Supabase sync error:", e.message); }
}
// ──────────────────────────────────────────────────────────────────────────

const adapter = new FileSync(dataPath);
const db = low(adapter);

// ── ASSET REGISTER SEED ──────────────────────────────────────────────────
const SEED_ASSETS = [
{id:1,category:"MEDICAL EQUIPMENT",description:"EXAMINATION LAMP",quantity:"1",serialNo:"202003044",model:"KS-Q3B",location:"MATERNITY",dateAcquired:"27TH SEPT 2021",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:2,category:"MEDICAL EQUIPMENT",description:"EXAMINATION LAMP",quantity:"1",serialNo:"202003042",model:"KS-Q3B",location:"MATERNITY",dateAcquired:"27TH SEPT 2021",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:3,category:"MEDICAL EQUIPMENT",description:"RESSUSSITATOR",quantity:"2",serialNo:"NONE",model:"",location:"MATERNITY",dateAcquired:"11TH NOV 2022",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:4,category:"MEDICAL EQUIPMENT",description:"BABY RESSUSSITAIRE",quantity:"1",serialNo:"SF917113118PA",model:"MD20723",location:"MATERNITY",dateAcquired:"9TH MAY 2025",status:"FUNCTIONMAL",ownership:"FACILITY OWNED",notes:""},
{id:5,category:"MEDICAL EQUIPMENT",description:"BABY RESSUSSITAIRE",quantity:"1",serialNo:"22A1ZH01001",model:"IR-200",location:"MATERNITY",dateAcquired:"20TH SEPT 2021",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:6,category:"MEDICAL EQUIPMENT",description:"INFANT WEIGHING MACHINE",quantity:"1",serialNo:"SN-C19032288",model:"MS-2400",location:"MATERNITY",dateAcquired:"23RD JUNE 2021",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:7,category:"MEDICAL EQUIPMENT",description:"ELECTRIC DELIVERY BED",quantity:"1",serialNo:"NONE",model:"",location:"MATERNITY",dateAcquired:"6TH JULY 2023",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:8,category:"MEDICAL EQUIPMENT",description:"MANUAL SUNCTION MACHINE",quantity:"1",serialNo:"NONE",model:"",location:"MATERNITY",dateAcquired:"22ND OCT 2021",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:9,category:"MEDICAL EQUIPMENT",description:"DELIVERY BED",quantity:"1",serialNo:"NONE",model:"",location:"MATERNITY",dateAcquired:"15TH JULY 2022",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:10,category:"MEDICAL EQUIPMENT",description:"DRIP STANDS",quantity:"3",serialNo:"NONE",model:"",location:"MATERNITY",dateAcquired:"29TH JUNE 2020",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:11,category:"MEDICAL EQUIPMENT",description:"DIGITAL BP MACHINE",quantity:"1",serialNo:"202208058812V",model:"MD-0197",location:"MATERNITY",dateAcquired:"4TH MARCH 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:12,category:"MEDICAL EQUIPMENT",description:"SIGHYGIONAL MAMOMETER",quantity:"1",serialNo:"NONE",model:"",location:"MATERNITY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:13,category:"MEDICAL EQUIPMENT",description:"THERMOGUN",quantity:"1",serialNo:"203X05",model:"203053",location:"MATERNITY",dateAcquired:"30TH MAY 2022",status:"NON- FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:14,category:"MEDICAL EQUIPMENT",description:"FLOWMETER",quantity:"1",serialNo:"326718",model:"9505",location:"MATERNITY",dateAcquired:"26TH MAY 2022",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:15,category:"MEDICAL EQUIPMENT",description:"BED SCREEN",quantity:"1",serialNo:"NONE",model:"",location:"MATERNITY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:16,category:"MEDICAL EQUIPMENT",description:"ROOM HEATERS",quantity:"3",serialNo:"NONE",model:"",location:"MATERNITY",dateAcquired:"27TH SEPT 2023",status:"NON- FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:17,category:"MEDICAL EQUIPMENT",description:"OXYGEN WALL SOCKETS",quantity:"24",serialNo:"",model:"",location:"MATERNITY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:18,category:"MEDICAL EQUIPMENT",description:"INFUSION PUMP",quantity:"1",serialNo:"25149791",model:"EP-15785-1",location:"MATERNITY",dateAcquired:"2022",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:19,category:"MEDICAL EQUIPMENT",description:"SUNCTION PUMP",quantity:"1",serialNo:"24966935",model:"EP11621-1",location:"MATERNITY",dateAcquired:"2022",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:20,category:"MEDICAL EQUIPMENT",description:"AMBU BAG:ADULT",quantity:"1",serialNo:"NONE",model:"",location:"MATERNITY",dateAcquired:"11TH NOV 2022",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:21,category:"MEDICAL EQUIPMENT",description:"AMBUBAG :PAED",quantity:"2",serialNo:"NONE",model:"",location:"MATERNITY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:22,category:"MEDICAL EQUIPMENT",description:"FETALSCOPE",quantity:"1",serialNo:"NONE",model:"",location:"MATERNITY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:23,category:"MEDICAL EQUIPMENT",description:"CHITTLE FORCEPS",quantity:"1",serialNo:"NONE",model:"",location:"MATERNITY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:24,category:"MEDICAL EQUIPMENT",description:"COLD BOX",quantity:"1",serialNo:"NONE",model:"",location:"MATERNITY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:25,category:"MEDICAL EQUIPMENT",description:"PULSE OXIMETER",quantity:"1",serialNo:"NONE",model:"",location:"MATERNITY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:26,category:"MEDICAL EQUIPMENT",description:"CRASH CART",quantity:"1",serialNo:"20191215750",model:"KL-ET750",location:"MATERNITY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:27,category:"MEDICAL EQUIPMENT",description:"FETAL DUPPLER",quantity:"1",serialNo:"FP14000334",model:"INP265PSUK",location:"MATERNITY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:28,category:"MEDICAL EQUIPMENT",description:"CTG MACHINE (FETAL MONITOR)",quantity:"1",serialNo:"PC-518054",model:"MCF-21K",location:"MATERNITY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:29,category:"MEDICAL EQUIPMENT",description:"CTG MACHINE (FETAL MONITOR)",quantity:"1",serialNo:"KI-191029024",model:"C21",location:"MATERNITY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:30,category:"MEDICAL EQUIPMENT",description:"21 INCH TV",quantity:"1",serialNo:"",model:"",location:"MATERNITY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:31,category:"MEDICAL EQUIPMENT",description:"STRETCHER",quantity:"1",serialNo:"N/A",model:"N/A",location:"MATERNITY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:32,category:"MEDICAL EQUIPMENT",description:"VAYU BUBBLE CPAP MACHINE",quantity:"1",serialNo:"",model:"",location:"MATERNITY",dateAcquired:"6TH MAY 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:33,category:"MEDICAL EQUIPMENT",description:"BEDS",quantity:"20",serialNo:"N/A",model:"N/A",location:"MATERNITY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:34,category:"MEDICAL EQUIPMENT",description:"BABY WEIGHING SCALE",quantity:"1",serialNo:"C19032272",model:"MS2400",location:"MATERNITY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:35,category:"MEDICAL EQUIPMENT",description:"BABY SCALE-HEIGHT",quantity:"1",serialNo:"C2001947",model:"HM80M",location:"MATERNITY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:36,category:"MEDICAL EQUIPMENT",description:"ELECTRIC SUNCTION MACHINE",quantity:"1",serialNo:"20240625/M02406130140014",model:"7A-230",location:"MATERNITY",dateAcquired:"5TH NOV 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:37,category:"MEDICAL EQUIPMENT",description:"PATIENT SRETCHER WITH DRIP STAND",quantity:"1",serialNo:"N/A",model:"N/A",location:"MATERNITY",dateAcquired:"28TH NOV 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:38,category:"MEDICAL EQUIPMENT",description:"VAYU BUBBLE CPAP SYSTEM",quantity:"2",serialNo:"",model:"",location:"MATERNITY",dateAcquired:"6TH NOV 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:39,category:"MEDICAL EQUIPMENT",description:"VAYU BUBBLE CPAP SYSTEM",quantity:"2",serialNo:"",model:"",location:"PAEDIATRIC WARD",dateAcquired:"23RD JULY 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:40,category:"MEDICAL EQUIPMENT",description:"PULSE OXIMETER",quantity:"2",serialNo:"UTL0019078825",model:"UT100",location:"PAEDIATRIC WARD",dateAcquired:"6TH AUG 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:41,category:"MEDICAL EQUIPMENT",description:"VAYU OXYGEN BLENDER SYSTEM (OBS)",quantity:"3",serialNo:"",model:"",location:"PAEDIATRIC WARD",dateAcquired:"28TH AUG 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:42,category:"MEDICAL EQUIPMENT",description:"THERMOGUN",quantity:"2",serialNo:"NONE",model:"",location:"PAEDIATRIC WARD",dateAcquired:"30TH MAY 2022",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:43,category:"MEDICAL EQUIPMENT",description:"INFANT SCALE -WEIGHT",quantity:"1",serialNo:"C19032267",model:"MS2400",location:"PAEDIATRIC WARD",dateAcquired:"30TH MAY 2022",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:44,category:"MEDICAL EQUIPMENT",description:"INFANT SCALE-HEIGHT",quantity:"1",serialNo:"C20014951",model:"MH80M",location:"PAEDIATRIC WARD",dateAcquired:"44711",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:45,category:"MEDICAL EQUIPMENT",description:"STRETCHER",quantity:"1",serialNo:"NONE",model:"",location:"PAEDIATRIC WARD",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:46,category:"MEDICAL EQUIPMENT",description:"EXAMINATION COUCH",quantity:"2",serialNo:"NONE",model:"",location:"PAEDIATRIC WARD",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:47,category:"MEDICAL EQUIPMENT",description:"DRIP STANDS",quantity:"3",serialNo:"NONE",model:"",location:"PAEDIATRIC WARD",dateAcquired:"30TH MAY 2022",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:48,category:"MEDICAL EQUIPMENT",description:"BABY COT",quantity:"1",serialNo:"NONE",model:"",location:"PAEDIATRIC WARD",dateAcquired:"30TH MAY 2022",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:49,category:"MEDICAL EQUIPMENT",description:"RESSUSSITRE INFANT RADIANT WARMER",quantity:"1",serialNo:"1200426005",model:"BN-100",location:"PAEDIATRIC WARD",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:50,category:"MEDICAL EQUIPMENT",description:"INFUSION PUMP",quantity:"1",serialNo:"25149807",model:"EP-15785-1",location:"PAEDIATRIC WARD",dateAcquired:"2022",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:51,category:"MEDICAL EQUIPMENT",description:"SUNCTION PUMP",quantity:"1",serialNo:"24966934",model:"EP-11621-1",location:"PAEDIATRIC WARD",dateAcquired:"2022",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:52,category:"MEDICAL EQUIPMENT",description:"ROOM HEATERS(WALL)",quantity:"2",serialNo:"NONE",model:"",location:"PAEDIATRIC WARD",dateAcquired:"6TH MAY 2025",status:"NON-FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:53,category:"MEDICAL EQUIPMENT",description:"FLOWMETER",quantity:"1",serialNo:"326827",model:"9505",location:"PAEDIATRIC WARD",dateAcquired:"26TH MAY 2022",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:54,category:"MEDICAL EQUIPMENT",description:"FLOWMETER",quantity:"1",serialNo:"326796",model:"9505",location:"PAEDIATRIC WARD",dateAcquired:"26TH MAY 2022",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:55,category:"MEDICAL EQUIPMENT",description:"FLOWMETER",quantity:"1",serialNo:"326831",model:"9505",location:"PAEDIATRIC WARD",dateAcquired:"26TH MAY 2022",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:56,category:"MEDICAL EQUIPMENT",description:"FLOWMETER",quantity:"1",serialNo:"326683",model:"9505",location:"PAEDIATRIC WARD",dateAcquired:"26TH MAY 2022",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:57,category:"MEDICAL EQUIPMENT",description:"NEBULIZER",quantity:"1",serialNo:"103010-126",model:"CE0197",location:"PAEDIATRIC WARD",dateAcquired:"8TH MAY 2023",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:58,category:"MEDICAL EQUIPMENT",description:"AMBUBAGS",quantity:"2",serialNo:"NONE",model:"",location:"PAEDIATRIC WARD",dateAcquired:"28TH JUNE 2024",status:"NON-FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:59,category:"MEDICAL EQUIPMENT",description:"BED SIDE LOCKERS",quantity:"15",serialNo:"",model:"",location:"PAEDIATRIC WARD",dateAcquired:"30TH MAY 2022",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:60,category:"MEDICAL EQUIPMENT",description:"INCUBATOR",quantity:"1",serialNo:"06AiZH02020",model:"A200",location:"PAEDIATRIC WARD",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:61,category:"MEDICAL EQUIPMENT",description:"INCUBATOR",quantity:"1",serialNo:"01AHZ111001",model:"A100",location:"PAEDIATRIC WARD",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:62,category:"MEDICAL EQUIPMENT",description:"OXYGEN HUMIDIFIERS",quantity:"4",serialNo:"",model:"",location:"PAEDIATRIC WARD",dateAcquired:"26TH MAY 2022",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:63,category:"MEDICAL EQUIPMENT",description:"BEDS",quantity:"32",serialNo:"NONE",model:"",location:"PAEDIATRIC WARD",dateAcquired:"22ND SEPT 2010",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:64,category:"MEDICAL EQUIPMENT",description:"CRASH CART",quantity:"3",serialNo:"20210809",model:"",location:"PAEDIATRIC WARD",dateAcquired:"7TH MARCH 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:65,category:"MEDICAL EQUIPMENT",description:"SUNCTION MACHINE",quantity:"1",serialNo:"101148",model:"",location:"NBU",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:66,category:"MEDICAL EQUIPMENT",description:"PHOTOTHERAPY MACHINE",quantity:"1",serialNo:"42A1ZD68062",model:"AS20",location:"NBU",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:67,category:"MEDICAL EQUIPMENT",description:"SIPUMP MACHINE",quantity:"1",serialNo:"NONE",model:"",location:"NBU",dateAcquired:"2021",status:"NON-FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:68,category:"MEDICAL EQUIPMENT",description:"DRIPSTAND",quantity:"10",serialNo:"NONE",model:"",location:"NBU",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:69,category:"MEDICAL EQUIPMENT",description:"INCUBATOR",quantity:"5",serialNo:"NONE",model:"",location:"NBU",dateAcquired:"-",status:"3 FUNCTIONAL,2 NON FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:70,category:"MEDICAL EQUIPMENT",description:"RESSUSSITRE",quantity:"1",serialNo:"NONE",model:"",location:"NBU",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:71,category:"MEDICAL EQUIPMENT",description:"AMBUBAG",quantity:"3",serialNo:"NONE",model:"",location:"NBU",dateAcquired:"11TH NOV 2022",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:72,category:"MEDICAL EQUIPMENT",description:"DIGITAL THERMOMETER",quantity:"1",serialNo:"NONE",model:"",location:"NBU",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:73,category:"MEDICAL EQUIPMENT",description:"CLINICAL THERMOMETER",quantity:"1",serialNo:"NONE",model:"",location:"NBU",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:74,category:"MEDICAL EQUIPMENT",description:"BP MACHINE",quantity:"1",serialNo:"NONE",model:"",location:"NBU",dateAcquired:"4TH MARCH 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:75,category:"MEDICAL EQUIPMENT",description:"BASINETTE",quantity:"1",serialNo:"NONE",model:"",location:"NBU",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:76,category:"MEDICAL EQUIPMENT",description:"BABYCOT",quantity:"2",serialNo:"NONE",model:"",location:"NBU",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:77,category:"MEDICAL EQUIPMENT",description:"ROOM HEATERS",quantity:"2",serialNo:"C352022 02200640/AFH3BAR-0324-1015",model:"",location:"NBU",dateAcquired:"27TH SEPT 2023",status:"NOT FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:78,category:"MEDICAL EQUIPMENT",description:"EXAMINATION LAMP",quantity:"1",serialNo:"202003041",model:"KS-Q3B",location:"FEMALE WARD",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:79,category:"MEDICAL EQUIPMENT",description:"MANUAL VACCUM EXTRACTOR",quantity:"1",serialNo:"",model:"",location:"FEMALE WARD",dateAcquired:"2ND JUNE 2023",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:80,category:"MEDICAL EQUIPMENT",description:"ADULT WEIGHING MACHINE",quantity:"1",serialNo:"7831.3019206640001",model:"",location:"FEMALE WARD",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:81,category:"MEDICAL EQUIPMENT",description:"BP MACHINE",quantity:"1",serialNo:"2022208058817V",model:"IP20",location:"FEMALE WARD",dateAcquired:"4TH MARCH 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:82,category:"MEDICAL EQUIPMENT",description:"THERMOGUN",quantity:"2",serialNo:"NONE",model:"Y1-400",location:"FEMALE WARD",dateAcquired:"30TH MAY 2022",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:83,category:"MEDICAL EQUIPMENT",description:"PATIENT MONITOR",quantity:"1",serialNo:"211221023",model:"HT8",location:"FEMALE WARD",dateAcquired:"23RD MARCH 2021",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:84,category:"MEDICAL EQUIPMENT",description:"THERMOGUN",quantity:"1",serialNo:"J202002593619",model:"JZK-601",location:"FEMALE WARD",dateAcquired:"30TH MAY 2022",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:85,category:"MEDICAL EQUIPMENT",description:"FINGER PULSE OXIMETER",quantity:"1",serialNo:"NONE",model:"",location:"FEMALE WARD",dateAcquired:"30TH MAY 2022",status:"NON-FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:86,category:"MEDICAL EQUIPMENT",description:"INFUSION PUMP",quantity:"1",serialNo:"NONE",model:"",location:"FEMALE WARD",dateAcquired:"2021",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:87,category:"MEDICAL EQUIPMENT",description:"FLOWMETER",quantity:"1",serialNo:"326835",model:"9505",location:"FEMALE WARD",dateAcquired:"26TH MAY 2022",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:88,category:"MEDICAL EQUIPMENT",description:"FLOWMETER",quantity:"1",serialNo:"326713",model:"9505",location:"FEMALE WARD",dateAcquired:"26TH MAY 2022",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:89,category:"MEDICAL EQUIPMENT",description:"FLOWMETER",quantity:"1",serialNo:"326830",model:"9505",location:"FEMALE WARD",dateAcquired:"26TH MAY 2022",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:90,category:"MEDICAL EQUIPMENT",description:"FLOWMETER",quantity:"1",serialNo:"326829",model:"9505",location:"FEMALE WARD",dateAcquired:"26TH MAY 2022",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:91,category:"MEDICAL EQUIPMENT",description:"FLOWMETER",quantity:"1",serialNo:"326808",model:"9505",location:"FEMALE WARD",dateAcquired:"26TH MAY 2022",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:92,category:"MEDICAL EQUIPMENT",description:"FLOWMETER",quantity:"1",serialNo:"326822",model:"9505",location:"FEMALE WARD",dateAcquired:"26TH MAY 2022",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:93,category:"MEDICAL EQUIPMENT",description:"FLOWMETER",quantity:"1",serialNo:"326704",model:"9505",location:"FEMALE WARD",dateAcquired:"26TH MAY 2022",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:94,category:"MEDICAL EQUIPMENT",description:"FLOWMETER",quantity:"1",serialNo:"326711",model:"9505",location:"FEMALE WARD",dateAcquired:"26TH MAY 2022",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:95,category:"MEDICAL EQUIPMENT",description:"FLOWMETER",quantity:"1",serialNo:"326809",model:"9505",location:"FEMALE WARD",dateAcquired:"26TH MAY 2022",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:96,category:"MEDICAL EQUIPMENT",description:"DRIP STAND",quantity:"13",serialNo:"NONE",model:"",location:"FEMALE WARD",dateAcquired:"29TH JUNE 2020",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:97,category:"MEDICAL EQUIPMENT",description:"WALKING FRAME",quantity:"2",serialNo:"NONE",model:"",location:"FEMALE WARD",dateAcquired:"16TH OCT 2024",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:98,category:"MEDICAL EQUIPMENT",description:"BEDS",quantity:"30",serialNo:"NONE",model:"",location:"FEMALE WARD",dateAcquired:"16TH OCT 2024",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:99,category:"MEDICAL EQUIPMENT",description:"EXAMINATION COUCH",quantity:"1",serialNo:"NONE",model:"",location:"FEMALE WARD",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:100,category:"MEDICAL EQUIPMENT",description:"LINEN TROLLEY",quantity:"1",serialNo:"NONE",model:"",location:"FEMALE WARD",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:101,category:"MEDICAL EQUIPMENT",description:"BENCH",quantity:"1",serialNo:"NONE",model:"",location:"FEMALE WARD",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:102,category:"MEDICAL EQUIPMENT",description:"CRASH CART",quantity:"1",serialNo:"NONE",model:"MP/A5001",location:"FEMALE WARD",dateAcquired:"3RD JULY 2019",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:103,category:"MEDICAL EQUIPMENT",description:"DRESSING TROLLEY",quantity:"1",serialNo:"NONE",model:"",location:"FEMALE WARD",dateAcquired:"4TH FEB 2021",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:104,category:"MEDICAL EQUIPMENT",description:"BEDSIDE LOCKERS",quantity:"27",serialNo:"NONE",model:"",location:"FEMALE WARD",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:105,category:"MEDICAL EQUIPMENT",description:"PATIENT SRETCHER WITH DRIP STAND",quantity:"1",serialNo:"",model:"",location:"FEMALE WARD",dateAcquired:"28TH NOV 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:106,category:"MEDICAL EQUIPMENT",description:"SYRINGE PUMP",quantity:"1",serialNo:"",model:"",location:"FEMALE WARD",dateAcquired:"2022",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:107,category:"MEDICAL EQUIPMENT",description:"INFUSION PUMP",quantity:"1",serialNo:"",model:"",location:"FEMALE WARD",dateAcquired:"2022",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:108,category:"MEDICAL EQUIPMENT",description:"VENTILATOR",quantity:"1",serialNo:"AV20G027553",model:"CE0123",location:"HDU",dateAcquired:"30TH MAY 2022",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:109,category:"MEDICAL EQUIPMENT",description:"VENTILATOR",quantity:"1",serialNo:"AVL40320",model:"CE0120",location:"HDU",dateAcquired:"30TH MAY 2022",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:110,category:"MEDICAL EQUIPMENT",description:"INFUSION  PUMP",quantity:"1",serialNo:"Z170430",model:"",location:"HDU",dateAcquired:"2022",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:111,category:"MEDICAL EQUIPMENT",description:"INFUSION  PUMP",quantity:"1",serialNo:"Z170430",model:"",location:"HDU",dateAcquired:"2022",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:112,category:"MEDICAL EQUIPMENT",description:"SYRINGE PUMP",quantity:"3",serialNo:"NONE",model:"",location:"HDU",dateAcquired:"2022",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:113,category:"MEDICAL EQUIPMENT",description:"PATIENT MONITOR",quantity:"4",serialNo:"NONE",model:"",location:"HDU",dateAcquired:"16TH DEC 2021",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:114,category:"MEDICAL EQUIPMENT",description:"SUNCTION MACHINE",quantity:"1",serialNo:"NONE",model:"",location:"HDU",dateAcquired:"16TH DEC 2021",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:115,category:"MEDICAL EQUIPMENT",description:"DRIPSTAND",quantity:"4",serialNo:"NONE",model:"",location:"HDU",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:116,category:"MEDICAL EQUIPMENT",description:"OXYGEN FLOWMETER",quantity:"1",serialNo:"326698",model:"9505",location:"HDU",dateAcquired:"26TH MAY 2022",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:117,category:"MEDICAL EQUIPMENT",description:"OXYGEN FLOWMETER",quantity:"1",serialNo:"326800",model:"9505",location:"HDU",dateAcquired:"26TH MAY 2022",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:118,category:"MEDICAL EQUIPMENT",description:"OXYGEN FLOWMETER",quantity:"1",serialNo:"326817",model:"9505",location:"HDU",dateAcquired:"26TH MAY 2022",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:119,category:"MEDICAL EQUIPMENT",description:"OXYGEN FLOWMETER",quantity:"1",serialNo:"326706",model:"9505",location:"HDU",dateAcquired:"26TH MAY 2022",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:120,category:"MEDICAL EQUIPMENT",description:"DEFABRILLATOR",quantity:"1",serialNo:"13098000917",model:"CE 0459",location:"HDU",dateAcquired:"16TH DEC 2021",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:121,category:"MEDICAL EQUIPMENT",description:"TROLLEY",quantity:"1",serialNo:"NONE",model:"",location:"HDU",dateAcquired:"30TH MAY 2022",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:122,category:"MEDICAL EQUIPMENT",description:"DRUG TROLLEY",quantity:"1",serialNo:"NONE",model:"",location:"HDU",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:123,category:"MEDICAL EQUIPMENT",description:"AMBU BAGS ADULT",quantity:"1",serialNo:"NONE",model:"",location:"HDU",dateAcquired:"11TH NOV 2022",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:124,category:"MEDICAL EQUIPMENT",description:"AMBU BAGSPEADS",quantity:"1",serialNo:"NONE",model:"",location:"HDU",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:125,category:"MEDICAL EQUIPMENT",description:"STETHOSCOPE",quantity:"1",serialNo:"NONE",model:"",location:"HDU",dateAcquired:"30TH MAY 2022",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:126,category:"MEDICAL EQUIPMENT",description:"ELECTRIC BEDS",quantity:"1",serialNo:"SOT-4978-001024",model:"C070621",location:"HDU",dateAcquired:"27TH SEPT 2021",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:127,category:"MEDICAL EQUIPMENT",description:"ELECTRIC BEDS",quantity:"1",serialNo:"SOT-4978-001013",model:"C070621",location:"HDU",dateAcquired:"27TH SEPT 2021",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:128,category:"MEDICAL EQUIPMENT",description:"ELECTRIC BEDS",quantity:"1",serialNo:"SOT-4978-001014",model:"C070621",location:"HDU",dateAcquired:"27TH SEPT 2021",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:129,category:"MEDICAL EQUIPMENT",description:"ELECTRIC BEDS",quantity:"1",serialNo:"SOT-4978-001023",model:"C070621",location:"HDU",dateAcquired:"27TH SEPT 2021",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:130,category:"MEDICAL EQUIPMENT",description:"GLUCOMETER",quantity:"1",serialNo:"NONE",model:"",location:"HDU",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:131,category:"MEDICAL EQUIPMENT",description:"THERMOGUN",quantity:"1",serialNo:"NONE",model:"",location:"HDU",dateAcquired:"30TH MAY 2022",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:132,category:"MEDICAL EQUIPMENT",description:"RIPPLE MATRESS",quantity:"1",serialNo:"NONE",model:"",location:"HDU",dateAcquired:"2021",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:133,category:"MEDICAL EQUIPMENT",description:"OMRON BP",quantity:"1",serialNo:"20180157104VG",model:"HEM-7120-E",location:"MALE WARD",dateAcquired:"4TH MARCH 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:134,category:"MEDICAL EQUIPMENT",description:"SUNCTION MACHINE",quantity:"1",serialNo:"NONE",model:"",location:"MALE WARD",dateAcquired:"22ND OCT 2021",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:135,category:"MEDICAL EQUIPMENT",description:"PATIENT MONITOR",quantity:"1",serialNo:"2421029",model:"HT8",location:"MALE WARD",dateAcquired:"23RD MARCH 2021",status:"NON-FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:136,category:"MEDICAL EQUIPMENT",description:"BP MACHINE",quantity:"1",serialNo:"202208058818V",model:"M2BASIC(HEM-7121J-E",location:"MALE WARD",dateAcquired:"4TH MARCH 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:137,category:"MEDICAL EQUIPMENT",description:"BEDS",quantity:"36",serialNo:"",model:"",location:"MALE WARD",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:138,category:"MEDICAL EQUIPMENT",description:"BED SIDE LOCKERS",quantity:"34",serialNo:"",model:"",location:"MALE WARD",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:139,category:"MEDICAL EQUIPMENT",description:"INFUSION PUMP",quantity:"1",serialNo:"24966953",model:"",location:"MALE WARD",dateAcquired:"2021",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:140,category:"MEDICAL EQUIPMENT",description:"THERMO GUN",quantity:"1",serialNo:"2003053X08057",model:"HTD8813C",location:"MALE WARD",dateAcquired:"30TH MAY 2022",status:"NON-FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:141,category:"MEDICAL EQUIPMENT",description:"MANUAL BP MACHINE",quantity:"1",serialNo:"6940211 627818",model:"MDF800",location:"MALE WARD",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:142,category:"MEDICAL EQUIPMENT",description:"PULSE OXIMETER",quantity:"1",serialNo:"G1BQ70036",model:"G1D",location:"MALE WARD",dateAcquired:"30TH MAY 2022",status:"N0N-FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:143,category:"MEDICAL EQUIPMENT",description:"FINGER PULSEOXIMETER",quantity:"1",serialNo:"B2104007424",model:"",location:"MALE WARD",dateAcquired:"4TH MARCH 2025",status:"NON-FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:144,category:"MEDICAL EQUIPMENT",description:"LED RECHARGABLE LIGHT",quantity:"1",serialNo:"69390020 440203",model:"LED720",location:"MALE WARD",dateAcquired:"-",status:"N 0N-FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:145,category:"MEDICAL EQUIPMENT",description:"EXAMINATION COUCH",quantity:"1",serialNo:"NONE",model:"",location:"MALE WARD",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:146,category:"MEDICAL EQUIPMENT",description:"DRESSING TROLLEY",quantity:"1",serialNo:"",model:"",location:"MALE WARD",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:147,category:"MEDICAL EQUIPMENT",description:"DRIP STANDS",quantity:"13",serialNo:"NONE",model:"",location:"MALE WARD",dateAcquired:"4TH FEB 2021",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:148,category:"MEDICAL EQUIPMENT",description:"WHEEL CHAIRS",quantity:"3",serialNo:"",model:"",location:"MALE WARD",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:149,category:"MEDICAL EQUIPMENT",description:"WALKING FRAME",quantity:"1",serialNo:"NONE",model:"",location:"MALE WARD",dateAcquired:"16TH OCT 2024",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:150,category:"MEDICAL EQUIPMENT",description:"FLOW METERS",quantity:"1",serialNo:"326815",model:"9505",location:"MALE WARD",dateAcquired:"26TH MAY 2022",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:151,category:"MEDICAL EQUIPMENT",description:"FLOW METERS",quantity:"1",serialNo:"326720",model:"9505",location:"MALE WARD",dateAcquired:"26TH MAY 2022",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:152,category:"MEDICAL EQUIPMENT",description:"FLOW METERS",quantity:"1",serialNo:"3268811",model:"9505",location:"MALE WARD",dateAcquired:"26TH MAY 2022",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:153,category:"MEDICAL EQUIPMENT",description:"FLOW METERS",quantity:"1",serialNo:"3265933",model:"9505",location:"MALE WARD",dateAcquired:"26TH MAY 2022",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:154,category:"MEDICAL EQUIPMENT",description:"FLOW METERS",quantity:"1",serialNo:"326818",model:"9505",location:"MALE WARD",dateAcquired:"26TH MAY 2022",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:155,category:"MEDICAL EQUIPMENT",description:"OXYGEN HUMIDIFIERS",quantity:"4",serialNo:"",model:"",location:"MALE WARD",dateAcquired:"26TH MAY 2022",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:156,category:"MEDICAL EQUIPMENT",description:"PATIENT SRETCHER WITH DRIP STAND",quantity:"1",serialNo:"",model:"",location:"MALE WARD",dateAcquired:"28TH NOV 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:157,category:"MEDICAL EQUIPMENT",description:"FRIDGE",quantity:"1",serialNo:"908NLAM00192",model:"LG",location:"LABORATORY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:158,category:"MEDICAL EQUIPMENT",description:"FRIDGE",quantity:"1",serialNo:"212NTX22329",model:"LG",location:"LABORATORY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:159,category:"MEDICAL EQUIPMENT",description:"FRIDGE",quantity:"1",serialNo:"8061N00336",model:"EXPRESS COOL",location:"LABORATORY",dateAcquired:"-",status:"NOT FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:160,category:"MEDICAL EQUIPMENT",description:"FREEZER",quantity:"1",serialNo:"2021062 0010958",model:"5C1985H",location:"LABORATORY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:161,category:"MEDICAL EQUIPMENT",description:"HP-LASERJET P1102",quantity:"1",serialNo:"VNF8H38165",model:"CE651A",location:"LABORATORY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:162,category:"MEDICAL EQUIPMENT",description:"EPSON",quantity:"1",serialNo:"AI-M320BM",model:"L771A",location:"LABORATORY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:163,category:"MEDICAL EQUIPMENT",description:"FLUMIZEN H500 HORIBA",quantity:"1",serialNo:"10470X03984",model:"YUMIZEN H500 OT",location:"LABORATORY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:164,category:"MEDICAL EQUIPMENT",description:"SD BIOSENSOR F200",quantity:"1",serialNo:"FA20EAITG4935",model:"F200",location:"LABORATORY",dateAcquired:"30TH MAY 2022",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:165,category:"MEDICAL EQUIPMENT",description:"WATER BATH",quantity:"1",serialNo:"MERMMERT",model:"60509",location:"LABORATORY",dateAcquired:"10TH NOV 2010",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:166,category:"MEDICAL EQUIPMENT",description:"UPS",quantity:"1",serialNo:"310043872BB70459100089",model:"ME-2000-VU",location:"LABORATORY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:167,category:"MEDICAL EQUIPMENT",description:"UPS",quantity:"1",serialNo:"310034872BB70459100089",model:"UA100",location:"LABORATORY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:168,category:"MEDICAL EQUIPMENT",description:"UPS",quantity:"1",serialNo:"9B2023A13775",model:"CBV10001MSX",location:"LABORATORY",dateAcquired:"30TH MAY 20222",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:169,category:"MEDICAL EQUIPMENT",description:"UPS",quantity:"1",serialNo:"9B2319A26703",model:"BV1000MSX",location:"LABORATORY",dateAcquired:"30TH MAY 2022",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:170,category:"MEDICAL EQUIPMENT",description:"HP LASERJET PRO M1102A",quantity:"1",serialNo:"VNF3B97441",model:"G3Q34A",location:"LABORATORY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:171,category:"MEDICAL EQUIPMENT",description:"HPLASERJET P1102",quantity:"1",serialNo:"VNFB41144",model:"CE651A",location:"LABORATORY",dateAcquired:"13TH MAY 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:172,category:"MEDICAL EQUIPMENT",description:"BIOBASE",quantity:"1",serialNo:"SHY50018016181",model:"BK500",location:"LABORATORY",dateAcquired:"6TH JUNE 2019",status:"NON-FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:173,category:"MEDICAL EQUIPMENT",description:"URIT(FULL HAEMOGLAM)",quantity:"1",serialNo:"BH5100Y00274",model:"BH-5100",location:"LABORATORY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:174,category:"MEDICAL EQUIPMENT",description:"LABORATORY ROTOR",quantity:"1",serialNo:"13100263",model:"DSR2800P",location:"LABORATORY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:175,category:"MEDICAL EQUIPMENT",description:"THERMO SCIENTIFIC CENTRIFUGE",quantity:"1",serialNo:"T12U-424983-TU",model:"00450F",location:"LABORATORY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:176,category:"MEDICAL EQUIPMENT",description:"THERMO SCIENTIFIC CENTRIFUGE",quantity:"1",serialNo:"93435",model:"3M RANGER",location:"LABORATORY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:177,category:"MEDICAL EQUIPMENT",description:"SELECTRA PRO M BIO CHEMISTRY ANALYZER",quantity:"1",serialNo:"2020-7503",model:"PROM",location:"LABORATORY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:178,category:"MEDICAL EQUIPMENT",description:"ISMART PRO 30 ELECTROLYTE",quantity:"1",serialNo:"50298",model:"30 PRO",location:"LABORATORY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:179,category:"MEDICAL EQUIPMENT",description:"MICROSCOPE (OLYMPUS)",quantity:"1",serialNo:"3C86401",model:"CX224EDRFS1",location:"LABORATORY",dateAcquired:"13TH JULY 2016",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:180,category:"MEDICAL EQUIPMENT",description:"MICROSCOPE(PRIMOSTER)",quantity:"1",serialNo:"3134002847",model:"PRIMOSTER",location:"LABORATORY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:181,category:"MEDICAL EQUIPMENT",description:"DIASPECT HB MACHINE",quantity:"1",serialNo:"22T0140",model:"",location:"LABORATORY",dateAcquired:"23RD OCT 2023",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:182,category:"MEDICAL EQUIPMENT",description:"BLOOD GASES",quantity:"1",serialNo:"NONE",model:"",location:"LABORATORY",dateAcquired:"-",status:"NON-FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:183,category:"MEDICAL EQUIPMENT",description:"UNICLAVE",quantity:"1",serialNo:"321-AJC-160",model:"",location:"LABORATORY",dateAcquired:"-",status:"NON-FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:184,category:"MEDICAL EQUIPMENT",description:"BIOLOGICAL SAFETY CABINET",quantity:"1",serialNo:"BE02UDE0900QEE4P0001",model:"HR-40-11A2",location:"LABORATORY",dateAcquired:"-",status:"NON-FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:185,category:"MEDICAL EQUIPMENT",description:"HOT AIR OVEN",quantity:"1",serialNo:"1135",model:"",location:"LABORATORY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:186,category:"MEDICAL EQUIPMENT",description:"FULLY AUTOMATED CHEMISTRY PLUS ELECTROLYTE ANALYZER -BIOQUEST",quantity:"1",serialNo:"8021AY01883               2411204",model:"URIT-8021A",location:"LABORATORY",dateAcquired:"9TH APRIL 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:187,category:"MEDICAL EQUIPMENT",description:"BIO-HAZARD PEDAL BINS - YELLOW",quantity:"1",serialNo:"N/A",model:"N/A",location:"LABORATORY",dateAcquired:"9TH APRIL 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:188,category:"MEDICAL EQUIPMENT",description:"BIO-HAZARD PEDAL BINS - YELLOW",quantity:"2",serialNo:"N",model:"N/A",location:"LABORATORY",dateAcquired:"9TH APRIL 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:189,category:"MEDICAL EQUIPMENT",description:"BIO-HAZARD PEDAL BINS - RED",quantity:"1",serialNo:"N/A",model:"N/A",location:"LABORATORY",dateAcquired:"3RD MARCH 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:190,category:"MEDICAL EQUIPMENT",description:"BIO-HAZARD PEDAL BINS - RED",quantity:"1",serialNo:"N/A",model:"N/A",location:"LABORATORY",dateAcquired:"9TH APRIL 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:191,category:"MEDICAL EQUIPMENT",description:"BIO-HAZARD PEDAL BINS - BLACK",quantity:"1",serialNo:"N/A",model:"N/A",location:"LABORATORY",dateAcquired:"3RD MARCH 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:192,category:"MEDICAL EQUIPMENT",description:"BIO-HAZARD PEDAL BINS - BLACK",quantity:"1",serialNo:"N/A",model:"N/A",location:"LABORATORY",dateAcquired:"9TH APRIL 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:193,category:"MEDICAL EQUIPMENT",description:"CHEMISTRY ANALYZER PLUS ELECTROLYTE -FSE SARL",quantity:"1",serialNo:"22-4108",model:"",location:"LABORATORY",dateAcquired:"23RD JUNE 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:194,category:"MEDICAL EQUIPMENT",description:"MONITOR- CHEMISTRY ANALYZER",quantity:"1",serialNo:"CNK9330FGF",model:"HSTND-9581-Q",location:"LABORATORY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:195,category:"MEDICAL EQUIPMENT",description:"ELECTROLYTE ANALYZER",quantity:"1",serialNo:"2411204",model:"XI-921F",location:"LABORATORY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:196,category:"MEDICAL EQUIPMENT",description:"AUTOCLAVE",quantity:"1",serialNo:"249",model:"UNICLAVE 99",location:"LABORATORY",dateAcquired:"16TH DEC 2021",status:"NON-FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:197,category:"MEDICAL EQUIPMENT",description:"RS 232 CABLE",quantity:"1",serialNo:"6957 3038 22119",model:"",location:"LABORATORY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:198,category:"MEDICAL EQUIPMENT",description:"COMPUTER SET HP PRO",quantity:"1",serialNo:"",model:"HP PRO DESK 400L+6",location:"LABORATORY",dateAcquired:"-",status:"",ownership:"FACILITY OWNED",notes:""},
{id:199,category:"MEDICAL EQUIPMENT",description:"PRINTER",quantity:"1",serialNo:"CN32SB8ZJ1",model:"",location:"LABORATORY",dateAcquired:"-",status:"",ownership:"FACILITY OWNED",notes:""},
{id:200,category:"MEDICAL EQUIPMENT",description:"UPS",quantity:"1",serialNo:"9B2504A21863",model:"",location:"LABORATORY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:201,category:"MEDICAL EQUIPMENT",description:"DEFIBRILATOR",quantity:"1",serialNo:"H18212N",model:"BT9000A",location:"THEATRE",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:202,category:"MEDICAL EQUIPMENT",description:"DIATHERMY MACHINE",quantity:"1",serialNo:"",model:"",location:"THEATRE",dateAcquired:"2ND MAY 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:203,category:"MEDICAL EQUIPMENT",description:"DRAPING TROLLEY",quantity:"2",serialNo:"NONE",model:"",location:"THEATRE",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:204,category:"MEDICAL EQUIPMENT",description:"INSTRUMENTS TROLLEY",quantity:"7",serialNo:"NONE",model:"",location:"THEATRE",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:205,category:"MEDICAL EQUIPMENT",description:"ANAESTHETIC MACHINES",quantity:"2",serialNo:"ES-58002437",model:"WATO EX-55",location:"THEATRE",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:206,category:"MEDICAL EQUIPMENT",description:"ELECTRISURGICAL GENERATOR",quantity:"1",serialNo:"BN16022",model:"GD-300B-2",location:"THEATRE",dateAcquired:"-",status:"NOT FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:207,category:"MEDICAL EQUIPMENT",description:"BABY RADIATOR WARMER",quantity:"1",serialNo:"NONE",model:"",location:"THEATRE",dateAcquired:"2022",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:208,category:"MEDICAL EQUIPMENT",description:"SUNCTION MACHINE",quantity:"1",serialNo:"3090A2",model:"",location:"THEATRE",dateAcquired:"7TH MARCH 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:209,category:"MEDICAL EQUIPMENT",description:"AUTOCLAVE MACHINE",quantity:"2",serialNo:"14501",model:"ESTA-108A",location:"THEATRE",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:210,category:"MEDICAL EQUIPMENT",description:"ULTRASONIC WASHER",quantity:"2",serialNo:"EST2023194",model:"ESTU-101",location:"THEATRE",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:211,category:"MEDICAL EQUIPMENT",description:"ANAESTHETIC CRASH CART",quantity:"1",serialNo:"NONE",model:"",location:"THEATRE",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:212,category:"MEDICAL EQUIPMENT",description:"OPERATING TABLE",quantity:"2",serialNo:"NONE",model:"",location:"THEATRE",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:213,category:"MEDICAL EQUIPMENT",description:"OPERATING LIGHTS",quantity:"2",serialNo:"NONE",model:"",location:"THEATRE",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:214,category:"MEDICAL EQUIPMENT",description:"VAYU BUBBLE CPAP STSTEM",quantity:"1",serialNo:"",model:"",location:"THEATRE",dateAcquired:"16TH SEPT 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:215,category:"MEDICAL EQUIPMENT",description:"DISSECTING FORCEPS",quantity:"10",serialNo:"",model:"",location:"THEATRE",dateAcquired:"29TH SEPT 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:216,category:"MEDICAL EQUIPMENT",description:"PATIENT MONITOR",quantity:"1",serialNo:"",model:"",location:"THEATRE",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:217,category:"MEDICAL EQUIPMENT",description:"PATIENT MONITOR",quantity:"1",serialNo:"",model:"",location:"THEATRE",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:218,category:"MEDICAL EQUIPMENT",description:"PROTOSCOPE",quantity:"1",serialNo:"",model:"",location:"THEATRE",dateAcquired:"19THMAY 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:219,category:"MEDICAL EQUIPMENT",description:"THERAPY MEDIREG O23/4 OUTLET",quantity:"2",serialNo:"",model:"",location:"THEATRE",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:220,category:"MEDICAL EQUIPMENT",description:"MK2 SIDE ENTRY SS VALVE OXY",quantity:"2",serialNo:"",model:"",location:"THEATRE",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:221,category:"MEDICAL EQUIPMENT",description:"IMAGING INTENSIFIER",quantity:"1",serialNo:"NONE",model:"",location:"THEATRE",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:222,category:"MEDICAL EQUIPMENT",description:"PATIENTS STRETCHERS",quantity:"4",serialNo:"NONE",model:"",location:"THEATRE",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:223,category:"MEDICAL EQUIPMENT",description:"SKIN GRAFTING HANDLE",quantity:"1",serialNo:"",model:"",location:"THEATRE",dateAcquired:"10TH MARCH 2023",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:224,category:"MEDICAL EQUIPMENT",description:"KIDNEY DISHES",quantity:"10",serialNo:"",model:"",location:"THEATRE",dateAcquired:"29TH APRIL 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:225,category:"MEDICAL EQUIPMENT",description:"FORCEPTS ARTERY - STRAIGHT",quantity:"10",serialNo:"",model:"",location:"THEATRE",dateAcquired:"29TH APRIL 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:226,category:"MEDICAL EQUIPMENT",description:"GALLIPOT STAINLESS STEEL",quantity:"10",serialNo:"",model:"",location:"THEATRE",dateAcquired:"29TH APRIL 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:227,category:"MEDICAL EQUIPMENT",description:"RECOVERY BED",quantity:"1",serialNo:"NONE",model:"",location:"THEATRE",dateAcquired:"30TH MAY NE22",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:228,category:"MEDICAL EQUIPMENT",description:"UNIVERSALTIBIA/FEMUR INSTRUMENT KIT",quantity:"1",serialNo:"",model:"",location:"THEATRE",dateAcquired:"12TH OCT 2023",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:229,category:"MEDICAL EQUIPMENT",description:"LARGE FRAGMENT KIT",quantity:"1",serialNo:"",model:"",location:"THEATRE",dateAcquired:"12TH OCT 2023",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:230,category:"MEDICAL EQUIPMENT",description:"ELECTRIC HEATER",quantity:"1",serialNo:"",model:"",location:"THEATRE",dateAcquired:"6TH JUNE 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:231,category:"MEDICAL EQUIPMENT",description:"DRIP STAND",quantity:"1",serialNo:"NONE",model:"",location:"OPD CO",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:232,category:"MEDICAL EQUIPMENT",description:"EXAMINATION COUCH",quantity:"2",serialNo:"NONE",model:"",location:"OPD CO",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:233,category:"MEDICAL EQUIPMENT",description:"EXAMINATION COUCH",quantity:"1",serialNo:"NONE",model:"",location:"PLASTER ROOM",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:234,category:"MEDICAL EQUIPMENT",description:"OSCILATING MACHINE",quantity:"2",serialNo:"NONE",model:"",location:"PLASTER ROOM",dateAcquired:"-",status:"1 FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:235,category:"MEDICAL EQUIPMENT",description:"X-RAY VIEWER",quantity:"2",serialNo:"NONE",model:"",location:"PLASTER ROOM",dateAcquired:"-",status:"1 FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:236,category:"MEDICAL EQUIPMENT",description:"HP CYLINDER CARRIER",quantity:"4",serialNo:"28280",model:"",location:"OXYGEN PLANT",dateAcquired:"2020",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:237,category:"MEDICAL EQUIPMENT",description:"OXYGEN TANK",quantity:"1",serialNo:"28187",model:"",location:"OXYGEN PLANT",dateAcquired:"2020",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:238,category:"MEDICAL EQUIPMENT",description:"AIR TANK",quantity:"1",serialNo:"VL6550RN-P",model:"",location:"OXYGEN PLANT",dateAcquired:"2020",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:239,category:"MEDICAL EQUIPMENT",description:"AIR TREATMENT SYSTEM",quantity:"1",serialNo:"28158",model:"",location:"OXYGEN PLANT",dateAcquired:"2020",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:240,category:"MEDICAL EQUIPMENT",description:"FILLING SYSTEM 2/2",quantity:"1",serialNo:"28176",model:"",location:"OXYGEN PLANT",dateAcquired:"2020",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:241,category:"MEDICAL EQUIPMENT",description:"FILLING SYSTEM1/2",quantity:"1",serialNo:"20210061325CG",model:"",location:"OXYGEN PLANT",dateAcquired:"2020",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:242,category:"MEDICAL EQUIPMENT",description:"OXYGEN GENERATOR",quantity:"1",serialNo:"1007974",model:"VL6550RNP",location:"OXYGEN PLANT",dateAcquired:"2020",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:243,category:"MEDICAL EQUIPMENT",description:"AIR COMPRESSOR",quantity:"1",serialNo:"210020624",model:"",location:"OXYGEN PLANT",dateAcquired:"2020",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:244,category:"MEDICAL EQUIPMENT",description:"DRIER",quantity:"1",serialNo:"20210613736F08",model:"",location:"OXYGEN PLANT",dateAcquired:"2020",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:245,category:"MEDICAL EQUIPMENT",description:"FILLING PUMP",quantity:"2",serialNo:"20210613736F14",model:"",location:"OXYGEN PLANT",dateAcquired:"2020",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:246,category:"MEDICAL EQUIPMENT",description:"OXYGEN CYLINDERS 11.5KGS",quantity:"37",serialNo:"NONE",model:"",location:"OXYGEN PLANT",dateAcquired:"2020",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:247,category:"MEDICAL EQUIPMENT",description:"OXYGEN CYLINDERS1.84KGS",quantity:"11",serialNo:"NONE",model:"",location:"OXYGEN PLANT",dateAcquired:"2020",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:248,category:"MEDICAL EQUIPMENT",description:"NITROUS OXIDE 31.6KGS CYLINDER",quantity:"2",serialNo:"NONE",model:"",location:"OXYGEN PLANT",dateAcquired:"2020",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:249,category:"MEDICAL EQUIPMENT",description:"OXYGEN CYLINDERS 4.6 KGS CYLINDER",quantity:"2",serialNo:"NONE",model:"",location:"OXYGEN PLANT",dateAcquired:"2020",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:250,category:"MEDICAL EQUIPMENT",description:"WASTE MANAGEMENT SW 250",quantity:"1",serialNo:"NONE",model:"",location:"INCENERATOR",dateAcquired:"2021",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:251,category:"MEDICAL EQUIPMENT",description:"ELECTRICAL CABINET",quantity:"1",serialNo:"121",model:"",location:"OXYGEN PLANT",dateAcquired:"2021",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:252,category:"MEDICAL EQUIPMENT",description:"PUMP",quantity:"1",serialNo:"NONE",model:"",location:"INCENERATOR",dateAcquired:"2021",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:253,category:"MEDICAL EQUIPMENT",description:"GENERATOR",quantity:"1",serialNo:"NONE",model:"",location:"INCENERATOR",dateAcquired:"2021",status:"NON-FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:254,category:"MEDICAL EQUIPMENT",description:"ROOM HEATERS",quantity:"1",serialNo:"19066007548",model:"0HH-205",location:"CASUALTY",dateAcquired:"6TH MAY 2025",status:"NON-FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:255,category:"MEDICAL EQUIPMENT",description:"EXAMINATION COUCH",quantity:"4",serialNo:"NONE",model:"",location:"CASUALTY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:256,category:"MEDICAL EQUIPMENT",description:"DRIP STANDS",quantity:"5",serialNo:"NONE",model:"",location:"CASUALTY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:257,category:"MEDICAL EQUIPMENT",description:"FLOW METER",quantity:"1",serialNo:"326816",model:"9505",location:"CASUALTY",dateAcquired:"26TH MAY 2022",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:258,category:"MEDICAL EQUIPMENT",description:"FLOW METER",quantity:"1",serialNo:"326821",model:"9505",location:"CASUALTY",dateAcquired:"26TH MAY 2022",status:"NON-FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:259,category:"MEDICAL EQUIPMENT",description:"NEBULIZER",quantity:"1",serialNo:"007004-072",model:"",location:"CASUALTY",dateAcquired:"8TH MAY 2023",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:260,category:"MEDICAL EQUIPMENT",description:"NEBULIZER",quantity:"1",serialNo:"411709",model:"",location:"CASUALTY",dateAcquired:"8TH MAY 2023",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:261,category:"MEDICAL EQUIPMENT",description:"ELECTRIC SUNCTION MACHINE",quantity:"1",serialNo:"74",model:"7A-230",location:"CASUALTY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:262,category:"MEDICAL EQUIPMENT",description:"CRASH CART",quantity:"2",serialNo:"NONE",model:"",location:"CASUALTY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:263,category:"MEDICAL EQUIPMENT",description:"VACCINE CARRIER BOX",quantity:"1",serialNo:"NONE",model:"",location:"CASUALTY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:264,category:"MEDICAL EQUIPMENT",description:"NEBULIZER COMPRESSOR",quantity:"1",serialNo:"411708",model:"2110C-434",location:"CASUALTY",dateAcquired:"4TH MARCH 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:265,category:"MEDICAL EQUIPMENT",description:"ULTRASONIC COMMERCIAL NEBULISING MACHINE",quantity:"1",serialNo:"21092874 5030092",model:"",location:"CASUALTY",dateAcquired:"5TH NOV 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:266,category:"MEDICAL EQUIPMENT",description:"WHEELCHAIR",quantity:"8",serialNo:"NONE",model:"",location:"CASUALTY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:267,category:"MEDICAL EQUIPMENT",description:"21 INCH TV",quantity:"1",serialNo:"NONE",model:"",location:"OPD/CASUALTY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:268,category:"MEDICAL EQUIPMENT",description:"SINOCARE BP MACHINE",quantity:"1",serialNo:"",model:"BSX516",location:"CASUALTY",dateAcquired:"6TH AUG 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:269,category:"MEDICAL EQUIPMENT",description:"X-RAY VIEWER",quantity:"1",serialNo:"NONE",model:"",location:"CASUALTY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:270,category:"MEDICAL EQUIPMENT",description:"TEST BOOTH",quantity:"1",serialNo:"N/A",model:"",location:"CASUALTY",dateAcquired:"2ND NOV 2023",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:271,category:"MEDICAL EQUIPMENT",description:"PATIENT STRETCHER WITH DRIP STAND",quantity:"1",serialNo:"",model:"",location:"CASUALTY",dateAcquired:"28TH NOV 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:272,category:"MEDICAL EQUIPMENT",description:"ROOM HEATERS",quantity:"1",serialNo:"AFHQ2BAR-0525-0265",model:"AFH-Q2BAR",location:"STORE",dateAcquired:"5TH FEB 2026",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:273,category:"MEDICAL EQUIPMENT",description:"SKIN GRAFTING HANDLE",quantity:"1",serialNo:"NONE",model:"",location:"STORES",dateAcquired:"10TH MARCH 2023",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:274,category:"MEDICAL EQUIPMENT",description:"FETUS HEART STETHSCOPE-PLASTIC",quantity:"4",serialNo:"NONE",model:"",location:"STORES",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:275,category:"MEDICAL EQUIPMENT",description:"FETUS HEART STETHSCOPE -METALLIC",quantity:"1",serialNo:"NONE",model:"",location:"STORES",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:276,category:"MEDICAL EQUIPMENT",description:"OXYGEN REGULATOR",quantity:"1",serialNo:"NONE",model:"",location:"STORES",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:277,category:"MEDICAL EQUIPMENT",description:"DIGITAL THERMOMETER",quantity:"9",serialNo:"NONE",model:"",location:"STORES",dateAcquired:"4TH MARCH 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:278,category:"MEDICAL EQUIPMENT",description:"DIAGNOSTIC SET WITH C-HANDLE",quantity:"2",serialNo:"NONE",model:"",location:"STORES",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:279,category:"MEDICAL EQUIPMENT",description:"LARYNGOSCOPE",quantity:"2",serialNo:"NONE",model:"",location:"STORES",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:280,category:"MEDICAL EQUIPMENT",description:"INFRARED THERMOMETER",quantity:"3",serialNo:"NONE",model:"",location:"STORES",dateAcquired:"5TH NOV 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:281,category:"MEDICAL EQUIPMENT",description:"FINGER PULSE OXIMETER",quantity:"14",serialNo:"YX102",model:"",location:"STORES",dateAcquired:"4TH MARCH 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:282,category:"MEDICAL EQUIPMENT",description:"SPO2 SENSOR (PAED)",quantity:"1",serialNo:"42070 1221519",model:"SH-1-D",location:"STORES",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:283,category:"MEDICAL EQUIPMENT",description:"SPO2 SENSOR (PAED)",quantity:"1",serialNo:"H20600 380037",model:"SH3",location:"STORES",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:284,category:"MEDICAL EQUIPMENT",description:"SPO2 SENSOR (PAED)",quantity:"1",serialNo:"H205 01101901",model:"SH3",location:"STORES",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:285,category:"MEDICAL EQUIPMENT",description:"SPO2 SEMSOR (PAED)",quantity:"1",serialNo:"H20402382 738",model:"SH5",location:"STORES",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:286,category:"MEDICAL EQUIPMENT",description:"GALLIPOT STAINLESS STEEL",quantity:"90",serialNo:"N/A",model:"",location:"STORES",dateAcquired:"22ND MAY 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:287,category:"MEDICAL EQUIPMENT",description:"BLOOD WARMER",quantity:"1",serialNo:"93433",model:"24510",location:"STORES",dateAcquired:"2022",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:288,category:"MEDICAL EQUIPMENT",description:"BENCHMETER WITH PH",quantity:"1",serialNo:"C024611F",model:"",location:"STORES",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:289,category:"MEDICAL EQUIPMENT",description:"INFANT WEIGHING SCALE-WEIGHT",quantity:"1",serialNo:"C19032219",model:"",location:"MCH/FP",dateAcquired:"30TH MAY 2022",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:290,category:"MEDICAL EQUIPMENT",description:"INFANT WEIGHING SCALE-HEIGHT",quantity:"1",serialNo:"C19032220",model:"",location:"MCH/FP",dateAcquired:"30TH MAY 2022",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:291,category:"MEDICAL EQUIPMENT",description:"FINGER SENSOR",quantity:"1",serialNo:"20070 35791",model:"ASPNR-DR",location:"STORES",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:292,category:"MEDICAL EQUIPMENT",description:"FINGER SENSOR",quantity:"1",serialNo:"20021 70078",model:"ASANR-D3",location:"STORES",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:293,category:"MEDICAL EQUIPMENT",description:"KIDNEY DISH",quantity:"2",serialNo:"NONE",model:"",location:"STORES",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:294,category:"MEDICAL EQUIPMENT",description:"KOCHER ARTERY FORCEPS",quantity:"1",serialNo:"NONE",model:"",location:"STORES",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:295,category:"MEDICAL EQUIPMENT",description:"BRAUN STADLER SCISSORES 1",quantity:"3",serialNo:"NONE",model:"",location:"STORES",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:296,category:"MEDICAL EQUIPMENT",description:"TISSUE DISSECTING FORCEPS",quantity:"1",serialNo:"NONE",model:"",location:"STORES",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:297,category:"MEDICAL EQUIPMENT",description:"ECG MACHINE",quantity:"1",serialNo:"1070. 006595",model:"CARDIOVIT-AT16G",location:"STORES",dateAcquired:"16TH DEC 2021",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:298,category:"MEDICAL EQUIPMENT",description:"MANUAL VACUUM EXTRACTOR",quantity:"14",serialNo:"NONE",model:"",location:"STORES",dateAcquired:"20TH APRIL 2023",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:299,category:"MEDICAL EQUIPMENT",description:"INFUSION PUMP",quantity:"1",serialNo:"NONE",model:"",location:"STORES",dateAcquired:"2022",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:300,category:"MEDICAL EQUIPMENT",description:"INCUBATORS",quantity:"2",serialNo:"14-11442",model:"B28",location:"STORES",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:301,category:"MEDICAL EQUIPMENT",description:"NASAL CANULLA OXYGEN THERAPY DEVICE",quantity:"1",serialNo:"",model:"",location:"STORES",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:302,category:"MEDICAL EQUIPMENT",description:"NEBULIZER COMPRESSOR",quantity:"1",serialNo:"411710",model:"2110C-434",location:"STORES",dateAcquired:"4TH MARCH 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:303,category:"MEDICAL EQUIPMENT",description:"NEBULIZER COMPRESSOR",quantity:"1",serialNo:"438864",model:"2306C-184",location:"STORES",dateAcquired:"8TH MAY 2023",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:304,category:"MEDICAL EQUIPMENT",description:"NEBULIZER COMPRESSOR",quantity:"1",serialNo:"411705",model:"2110C-434",location:"STORES",dateAcquired:"4TH MARCH 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:305,category:"MEDICAL EQUIPMENT",description:"NEBULIZER COMPRESSOR",quantity:"1",serialNo:"438860",model:"2306C-184",location:"STORES",dateAcquired:"8TH MAY 2023",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:306,category:"MEDICAL EQUIPMENT",description:"NEBULIZER COMPRESSOR",quantity:"1",serialNo:"438865",model:"2306C-184",location:"STORES",dateAcquired:"8TH MAY 2023",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:307,category:"MEDICAL EQUIPMENT",description:"NEBULIZER COMPRESSOR",quantity:"1",serialNo:"411706",model:"2110C-434",location:"STORES",dateAcquired:"4TH MARCH 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:308,category:"MEDICAL EQUIPMENT",description:"FORCEPTS ARTERY - STRAIGHT",quantity:"90",serialNo:"NONE",model:"NONE",location:"STORES",dateAcquired:"25TH FEB 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:309,category:"MEDICAL EQUIPMENT",description:"WALKING FRAMES",quantity:"9",serialNo:"NONE",model:"NONE",location:"STORES",dateAcquired:"5TH NOV 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:310,category:"MEDICAL EQUIPMENT",description:"HBA1C ANALYZER + CONTROL",quantity:"1",serialNo:"H05C05E0019",model:"NONE",location:"STORES",dateAcquired:"5TH JUNE 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:311,category:"MEDICAL EQUIPMENT",description:"HAEMOGLOBIN ANALYZER",quantity:"1",serialNo:"Ma24040320013",model:"N",location:"STORES",dateAcquired:"5TH JUNE 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:312,category:"MEDICAL EQUIPMENT",description:"VAYU BUBBLE CPAP STSTEM",quantity:"3",serialNo:"NONE",model:"NONE",location:"STORES",dateAcquired:"6TH MAY 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:313,category:"MEDICAL EQUIPMENT",description:"DISSECTING FORCEPTS",quantity:"80",serialNo:"NONE",model:"N0NE",location:"STORES",dateAcquired:"25TH FEB 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:314,category:"MEDICAL EQUIPMENT",description:"KIDNEY DISHES 8`",quantity:"106",serialNo:"NONE",model:"NONE",location:"STORES",dateAcquired:"3RD MARCH 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:315,category:"MEDICAL EQUIPMENT",description:"PULSE OXIMETER",quantity:"1",serialNo:"360101-M20602830016",model:"H100B",location:"STORES",dateAcquired:"6TH AUG 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:316,category:"MEDICAL EQUIPMENT",description:"PULSE OXIMETER CHARGER STAND",quantity:"1",serialNo:"316055-M20602859248",model:"CS-01",location:"STORES",dateAcquired:"6TH AUG 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:317,category:"MEDICAL EQUIPMENT",description:"HP LASERJET PRO MFP 4103 fdw",quantity:"1",serialNo:"CNCRRDW5C8",model:"SHNGC-1801-02",location:"XRAY",dateAcquired:"28TH JUNE 2024",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:318,category:"MEDICAL EQUIPMENT",description:"HP LASERJET PRO MFP 4103 fdw",quantity:"1",serialNo:"CNCRRDW59X",model:"SHNGC-1801-02",location:"RECORDS",dateAcquired:"28TH JUNE 2024",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:319,category:"MEDICAL EQUIPMENT",description:"AUTOCLAVE",quantity:"1",serialNo:"SAI30814",model:"ESTEEM",location:"DENTAL",dateAcquired:"-",status:"NON-FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:320,category:"MEDICAL EQUIPMENT",description:"VOLTAGE STABILIZER/REGULATOR",quantity:"1",serialNo:"72A53380",model:"AIRSTAR",location:"DENTAL",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:321,category:"MEDICAL EQUIPMENT",description:"CURING BATH",quantity:"1",serialNo:"NONE",model:"NONE",location:"DENTAL",dateAcquired:"0CT 2024H",status:"FUNTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:322,category:"MEDICAL EQUIPMENT",description:"SKALLER MACHINE",quantity:"1",serialNo:"5A41004",model:"UDS-J",location:"DENTAL",dateAcquired:"-",status:"NON FUNTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:323,category:"MEDICAL EQUIPMENT",description:"EXTERNAL SUNTION",quantity:"1",serialNo:"101149",model:"CA.MI",location:"DENTAL",dateAcquired:"-",status:"NON FUNTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:324,category:"MEDICAL EQUIPMENT",description:"DENTAL UNIT",quantity:"1",serialNo:"350202 5061030",model:"GD-S350",location:"DENTAL",dateAcquired:"3RD SEPT 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:325,category:"MEDICAL EQUIPMENT",description:"KIDNEY DISHES",quantity:"5",serialNo:"NONE",model:"N",location:"DENTAL",dateAcquired:"3RD FEB 2026",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:326,category:"MEDICAL EQUIPMENT",description:"DENTAL FILES. ASSORTED SIZE 8",quantity:"1",serialNo:"NONE",model:"N",location:"DENTAL",dateAcquired:"10TH NOV 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:327,category:"MEDICAL EQUIPMENT",description:"DENTAL FILES. ASSORTED SIZE 10",quantity:"1",serialNo:"NONE",model:"N",location:"DENTAL",dateAcquired:"10TH NOV 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:328,category:"MEDICAL EQUIPMENT",description:"COMPRESSOR",quantity:"1",serialNo:"1584924",model:"G25S8X",location:"DENTAL",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:329,category:"MEDICAL EQUIPMENT",description:"DENTAL FILES . ASSORTED SIZE 15",quantity:"1",serialNo:"NONE",model:"N",location:"DENTAL",dateAcquired:"10TH NOV 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:330,category:"MEDICAL EQUIPMENT",description:"ULTRASOUND MACHINE",quantity:"1",serialNo:"612494WXO",model:"L0G1QF6",location:"X-RAY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:331,category:"MEDICAL EQUIPMENT",description:"PACS  COMPUTERS",quantity:"2",serialNo:"CZC61289Y4, CZC61289Y5",model:"HPZ840, HPZ840",location:"X-RAY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:332,category:"MEDICAL EQUIPMENT",description:"OPTIMA (PORTABLE XRAY)",quantity:"1",serialNo:"16B620",model:"55500-6",location:"X-RAY",dateAcquired:"16TH DEC 2021",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:333,category:"MEDICAL EQUIPMENT",description:"GENERAL XRAY (BRIVO)",quantity:"1",serialNo:"139097HLO",model:"BRF",location:"X-RAY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:334,category:"MEDICAL EQUIPMENT",description:"APOLEM  PORTABLE X-RAY",quantity:"1",serialNo:"81121001518",model:"APELEM  SAS -RAFALE -DR",location:"X-RAY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:335,category:"MEDICAL EQUIPMENT",description:"FSE PRINTER",quantity:"1",serialNo:"150C01622C",model:"FSE-CODOICS",location:"X-RAY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:336,category:"MEDICAL EQUIPMENT",description:"CARESTEAM PRINTER 1",quantity:"1",serialNo:"69530703",model:"6950",location:"X-RAY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:337,category:"MEDICAL EQUIPMENT",description:"CARESTREAM PRINTER  2",quantity:"1",serialNo:"59536304",model:"5950",location:"X-RAY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:338,category:"MEDICAL EQUIPMENT",description:"DENTAL XRAY",quantity:"1",serialNo:"2107060",model:"HL-08",location:"X-RAY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:339,category:"MEDICAL EQUIPMENT",description:"AGFA DYSTAR PRINTER",quantity:"1",serialNo:"33797",model:"DRYSTAR 5302",location:"X-RAY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:340,category:"MEDICAL EQUIPMENT",description:"KEYBOARD",quantity:"1",serialNo:"BGMCH0BTJFW222",model:"TPC-P001K",location:"X-RAY",dateAcquired:"28TH JUNE 2024",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:341,category:"MEDICAL EQUIPMENT",description:"MONITOR",quantity:"1",serialNo:"3CQ1340RLJ",model:"HPP204V",location:"X-RAY",dateAcquired:"28TH JUNE 2024",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:342,category:"MEDICAL EQUIPMENT",description:"CPU",quantity:"1",serialNo:"CND23D1528",model:"HP ELITE DESK 800G3SFF",location:"X-RAY",dateAcquired:"28TH JUNE 2024",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:343,category:"MEDICAL EQUIPMENT",description:"LAPTOP",quantity:"1",serialNo:"RYG6F A00",model:"DELL P121F20",location:"X-RAY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:344,category:"MEDICAL EQUIPMENT",description:"MODEM",quantity:"1",serialNo:"M1-KONNECT-03-24-0617",model:"QURE.9i",location:"X-RAY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:345,category:"MEDICAL EQUIPMENT",description:"HUB SWITCH",quantity:"1",serialNo:"218A096008978",model:"TL-SF1008D",location:"X-RAY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:346,category:"MEDICAL EQUIPMENT",description:"SPEAKERS",quantity:"2",serialNo:"NONE",model:"",location:"X-RAY",dateAcquired:"28TH JUNE 2024",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:347,category:"MEDICAL EQUIPMENT",description:"TELEPHONE/LANDLINE",quantity:"1",serialNo:"NONE",model:"",location:"X-RAY",dateAcquired:"-",status:"NON -FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:348,category:"MEDICAL EQUIPMENT",description:"WEIGHING MACHINE",quantity:"3",serialNo:"NONE",model:"",location:"MCH",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:349,category:"MEDICAL EQUIPMENT",description:"XRAY VIEWER",quantity:"1",serialNo:"NONE",model:"",location:"MCH",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:350,category:"MEDICAL EQUIPMENT",description:"EXAMINATION LAMPS",quantity:"2",serialNo:"NONE",model:"",location:"MCH",dateAcquired:"27TH SEPT 2021",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:351,category:"MEDICAL EQUIPMENT",description:"BP MACHINE",quantity:"1",serialNo:"IP20190209334G",model:"M2 MXCOMRON",location:"MCH",dateAcquired:"4TH MARCH 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:352,category:"MEDICAL EQUIPMENT",description:"CRYOTHERAPY MACHINE",quantity:"1",serialNo:"2203052",model:"6100",location:"MCH",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:353,category:"MEDICAL EQUIPMENT",description:"SPHYGMOMANOMETER",quantity:"1",serialNo:"MDF80004",model:"MDF 800",location:"MCH",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:354,category:"MEDICAL EQUIPMENT",description:"SPHYGMOMANOMETER",quantity:"1",serialNo:"MDF80004",model:"MDF 800",location:"MCH",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:355,category:"MEDICAL EQUIPMENT",description:"VACCINE CARRIER",quantity:"4",serialNo:"NONE",model:"N/A",location:"MCH",dateAcquired:"",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:356,category:"MEDICAL EQUIPMENT",description:"EXAMINATION COUCH",quantity:"1",serialNo:"N/A",model:"N/A",location:"MCH/FP",dateAcquired:"28TH JUNE 2021",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:357,category:"MEDICAL EQUIPMENT",description:"EXAMINATION COUCH",quantity:"3",serialNo:"N/A",model:"N/A",location:"MCH/FP",dateAcquired:"27TH SEPT 2021",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:358,category:"MEDICAL EQUIPMENT",description:"DRIP STAND",quantity:"1",serialNo:"2003150 2231000",model:"",location:"MCI",dateAcquired:"5TH NOV 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:359,category:"MEDICAL EQUIPMENT",description:"DIGITAL THERMOMETER",quantity:"1",serialNo:"",model:"",location:"MCH/FP",dateAcquired:"4TH MARCH 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:360,category:"MEDICAL EQUIPMENT",description:"SINOCARE BP MACHINE",quantity:"1",serialNo:"",model:"BSX516",location:"MCH/FP",dateAcquired:"6TH AUG 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:361,category:"MEDICAL EQUIPMENT",description:"VACCINE CARRIERS",quantity:"2",serialNo:"",model:"",location:"MCH/FP",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:362,category:"MEDICAL EQUIPMENT",description:"BP MACHINES",quantity:"1",serialNo:"202311031306V",model:"",location:"FEMALE WARD",dateAcquired:"4TH MARCH 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:363,category:"MEDICAL EQUIPMENT",description:"BP MACHINES",quantity:"1",serialNo:"202311031307V",model:"",location:"HDU",dateAcquired:"4TH MARCH 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:364,category:"MEDICAL EQUIPMENT",description:"BP MACHINES",quantity:"1",serialNo:"202311031308V",model:"",location:"CASUALTY",dateAcquired:"4TH MARCH 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:365,category:"MEDICAL EQUIPMENT",description:"BP MACHINES",quantity:"1",serialNo:"202311031309V",model:"",location:"MATERNITY",dateAcquired:"4TH MARCH 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:366,category:"MEDICAL EQUIPMENT",description:"BP MACHINES",quantity:"1",serialNo:"202311031305V",model:"",location:"MCH/FP",dateAcquired:"4TH MARCH 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:367,category:"MEDICAL EQUIPMENT",description:"BP MACHINES",quantity:"1",serialNo:"202311031310V",model:"",location:"CASUALTY",dateAcquired:"4TH MARCH 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:368,category:"MEDICAL EQUIPMENT",description:"PORTABLE PLEGM SUCTION UNIT",quantity:"1",serialNo:"2205 00170 3039",model:"H003-C",location:"STORE",dateAcquired:"30TH MAY 220522",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:369,category:"MEDICAL EQUIPMENT",description:"ELECTRIC SUCTION MACHINE",quantity:"1",serialNo:"000010027011|765",model:"",location:"THEATRE",dateAcquired:"8TH MAY 2023",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:370,category:"MEDICAL EQUIPMENT",description:"BABY WEIGHING SCALE",quantity:"1",serialNo:"F05214-017",model:"",location:"MCH/FP",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:371,category:"MEDICAL EQUIPMENT",description:"DIGITAL THERMOMETER",quantity:"11",serialNo:"NONE",model:"",location:"STORE",dateAcquired:"4TH MARCH 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:372,category:"MEDICAL EQUIPMENT",description:"PULSE OXIMETER-FINGER",quantity:"14",serialNo:",1908",model:"",location:"STORE",dateAcquired:"4TH MARCH 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:373,category:"MEDICAL EQUIPMENT",description:"MANUAL VACUUM EXTRACTOR",quantity:"19",serialNo:"NONE",model:"",location:"STORE",dateAcquired:"4TH MARCH 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:374,category:"MEDICAL EQUIPMENT",description:"ASSORTED SIZE KIDNEY DISHES",quantity:"3",serialNo:"NONE",model:"",location:"STORE",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:375,category:"MEDICAL EQUIPMENT",description:"BRAUN STADLER SCISSORS 14CM",quantity:"3",serialNo:"NONE",model:"",location:"STORE",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:376,category:"MEDICAL EQUIPMENT",description:"KOCHER ARTERY FORCEPS 18CM",quantity:"1",serialNo:"NONE",model:"",location:"STORE",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:377,category:"MEDICAL EQUIPMENT",description:"TISSUE DISSECTING FORCEPS 14CM",quantity:"1",serialNo:"NONE",model:"",location:"STORE",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:378,category:"MEDICAL EQUIPMENT",description:"MIXING BOWLS",quantity:"3",serialNo:"NONE",model:"",location:"STORE",dateAcquired:"29TH OCT 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:379,category:"MEDICAL EQUIPMENT",description:"SPIRIT LAMPS",quantity:"3",serialNo:"NONE",model:"",location:"STORE",dateAcquired:"29TH OCT 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:380,category:"MEDICAL EQUIPMENT",description:"MIXING SPATULA",quantity:"3",serialNo:"NONE",model:"",location:"STORE",dateAcquired:"5TH NOV 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:381,category:"MEDICAL EQUIPMENT",description:"OXYGEN FLOWMETER GAUGE",quantity:"2",serialNo:"61K-25020083-0412",model:"191M-15L-BS3",location:"STORE",dateAcquired:"5TH MAY 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:382,category:"MEDICAL EQUIPMENT",description:"DENTAL INSTRUMENT TRAY",quantity:"5",serialNo:"NONE",model:"",location:"STORE",dateAcquired:"5TH NOV 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:383,category:"MEDICAL EQUIPMENT",description:"IMPRESSION TRAYS",quantity:"5",serialNo:"NONE",model:"",location:"STORE",dateAcquired:"5TH NOV 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:384,category:"MEDICAL EQUIPMENT",description:"SIMPLE ARTICULATOR",quantity:"5",serialNo:"NONE",model:"",location:"STORE",dateAcquired:"5TH NOV 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:385,category:"MEDICAL EQUIPMENT",description:"DENTAL FLASK",quantity:"5",serialNo:"NONE",model:"",location:"STORE",dateAcquired:"5TH NOV 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:386,category:"MEDICAL EQUIPMENT",description:"DENTAL MATRIX BAND",quantity:"1",serialNo:"",model:"",location:"STORE",dateAcquired:"10TH NOV 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:387,category:"MEDICAL EQUIPMENT",description:"ANEROID BP MACHINE",quantity:"11",serialNo:"737309",model:"(01)4045396002586(11)",location:"STORE",dateAcquired:"7TH MARCH 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:388,category:"MEDICAL EQUIPMENT",description:"SPRAY PUMP",quantity:"1",serialNo:"",model:"",location:"STORE",dateAcquired:"30TH MAY 2022",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:389,category:"MEDICAL EQUIPMENT",description:"SPRAY PUMP",quantity:"1",serialNo:"",model:"",location:"STORE",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:390,category:"MEDICAL EQUIPMENT",description:"ADULT STETHESCOPE",quantity:"10",serialNo:"639670",model:"(01)4045396195370(11)",location:"STORE",dateAcquired:"4TH MARCH 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:391,category:"MEDICAL EQUIPMENT",description:"ADULT STETHESCOPE",quantity:"3",serialNo:"WG2021 3291",model:"",location:"STORE",dateAcquired:"5TH NOV 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:392,category:"MEDICAL EQUIPMENT",description:"VACCUM EXTRACTOR PLASTIC",quantity:"1",serialNo:"",model:"",location:"STORE",dateAcquired:"20TH APRIL 2023",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:393,category:"MEDICAL EQUIPMENT",description:"PEDAL BIN- YELLOW",quantity:"1",serialNo:"NONE",model:"",location:"THEATRE",dateAcquired:"28TH FEB 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:394,category:"MEDICAL EQUIPMENT",description:"PEDAL BIN -BLACK",quantity:"1",serialNo:"NONE",model:"",location:"THEATRE",dateAcquired:"28TH FEB 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:395,category:"MEDICAL EQUIPMENT",description:"PEDAL BIN -RED",quantity:"1",serialNo:"NONE",model:"",location:"THEATRE",dateAcquired:"28TH FEB 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:396,category:"MEDICAL EQUIPMENT",description:"DENTAL DOUBLE CLAMPS",quantity:"1",serialNo:"NONE",model:"",location:"STORES",dateAcquired:"5TH NOV 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:397,category:"MEDICAL EQUIPMENT",description:"BURS TRIMMING",quantity:"10",serialNo:"NONE",model:"",location:"STORES",dateAcquired:"5TH NOV 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:398,category:"MEDICAL EQUIPMENT",description:"WAX KNIVES",quantity:"5",serialNo:"NONE",model:"",location:"STORES",dateAcquired:"5TH NOV 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:399,category:"MEDICAL EQUIPMENT",description:"WIRE CUTTER",quantity:"2",serialNo:"NONE",model:"",location:"STORES",dateAcquired:"5TH NOV 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:400,category:"MEDICAL EQUIPMENT",description:"DENTAL SYRINGES",quantity:"20",serialNo:"",model:"",location:"STORES",dateAcquired:"5TH NOV 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:401,category:"MEDICAL EQUIPMENT",description:"DENTAL SYRINGES",quantity:"5",serialNo:"NONE",model:"",location:"DENTAL",dateAcquired:"5TH NOV 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:402,category:"MEDICAL EQUIPMENT",description:"FACE SHIELD SMALL",quantity:"4",serialNo:"NONE",model:"",location:"STORES",dateAcquired:"5TH NOV 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:403,category:"MEDICAL EQUIPMENT",description:"DENTAL LAB MICROMORTON",quantity:"1",serialNo:"NONE",model:"",location:"DENTAL",dateAcquired:"5TH NOV 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:404,category:"MEDICAL EQUIPMENT",description:"DENTAL STOCK TRAYS",quantity:"5",serialNo:"NONE",model:"",location:"STORES",dateAcquired:"3RD MARCH 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:405,category:"MEDICAL EQUIPMENT",description:"DENTAL MODEL TRIMMER",quantity:"1",serialNo:"NONE",model:"",location:"STORES",dateAcquired:"7TH FEB 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:406,category:"MEDICAL EQUIPMENT",description:"XRAY LEAD APRON",quantity:"1",serialNo:"NONE",model:"",location:"STORE",dateAcquired:"12TH MAY 2023",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:407,category:"MEDICAL EQUIPMENT",description:"XRAY LEAD APRON",quantity:"1",serialNo:"NONE",model:"",location:"STORE",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:408,category:"MEDICAL EQUIPMENT",description:"SYRINGE INFUSION PUMP",quantity:"1",serialNo:"25149792",model:"Z018631",location:"STORE",dateAcquired:"2022",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:409,category:"MEDICAL EQUIPMENT",description:"SYRINGE INFUSION PUMP",quantity:"1",serialNo:"25149782",model:"Z018631",location:"STORE",dateAcquired:"2022",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:410,category:"MEDICAL EQUIPMENT",description:"SYRINGE INFUSION PUMP",quantity:"1",serialNo:"2514996",model:"Z018631",location:"STORE",dateAcquired:"2022",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:411,category:"MEDICAL EQUIPMENT",description:"SYRINGE INFUSION PUMP",quantity:"1",serialNo:"25149797",model:"Z018631",location:"STORE",dateAcquired:"2022",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:412,category:"MEDICAL EQUIPMENT",description:"CODENSING UNIT",quantity:"4",serialNo:"NONE",model:"",location:"MORGUE",dateAcquired:"12TH APRIL 2022",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:413,category:"MEDICAL EQUIPMENT",description:"BODY TROLLEY",quantity:"1",serialNo:"NONE",model:"",location:"MORGUE",dateAcquired:"27TH OCT 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:414,category:"MEDICAL EQUIPMENT",description:"OXYGEN SPLITTERS",quantity:"3",serialNo:"1221004",model:"Dynmed 5WOS",location:"STORE",dateAcquired:"21ST MARCH 2023",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:415,category:"MEDICAL EQUIPMENT",description:"OXYGEN TUBES",quantity:"9",serialNo:"",model:"",location:"STORE",dateAcquired:"21ST MARCH 2023",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:416,category:"MEDICAL EQUIPMENT",description:"FIRE EXTINGUISHER CYLINDERS - WATER",quantity:"6",serialNo:"",model:"",location:"HOSP MAINTENANCE",dateAcquired:"8TH JUNE 2023",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:417,category:"MEDICAL EQUIPMENT",description:"FIRE EXTINGUISHER CYLINDERS - DRY POWDER",quantity:"3",serialNo:"",model:"",location:"HOSP MAINTENANCE",dateAcquired:"8TH JUNE 2023",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:418,category:"MEDICAL EQUIPMENT",description:"AUXILLARY CLUTCHES",quantity:"2",serialNo:"",model:"",location:"PHYSIOTHERAPY",dateAcquired:"16TH OCT 2024",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:419,category:"MEDICAL EQUIPMENT",description:"WALKING FRAMES",quantity:"8",serialNo:"",model:"",location:"PHYSIOTHERAPY",dateAcquired:"19TH DEC 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:420,category:"MEDICAL EQUIPMENT",description:"LIQUID OXYGEN TANK 6,000/10,000L",quantity:"1",serialNo:"275111",model:"",location:"NEAR OUTPATIENT DEPARTMENT",dateAcquired:"19TH SEPT 2022",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:421,category:"MEDICAL EQUIPMENT",description:"AMBIENT VAPORIZER- VAP 280",quantity:"1",serialNo:"575830",model:"",location:"NEAR OUTPATIENT DEPARTMENT",dateAcquired:"19TH SEPT 2022",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:422,category:"MEDICAL EQUIPMENT",description:"AMBIENT VAPORIZER- VAP 280",quantity:"1",serialNo:"575831",model:"",location:"NEAR OUTPATIENT DEPARTMENT",dateAcquired:"19TH SEPT 2022",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:423,category:"MEDICAL EQUIPMENT",description:"CONTROL PANEL",quantity:"1",serialNo:"39796",model:"",location:"NEAR OUTPATIENT DEPARTMENT",dateAcquired:"19TH SEPT 2022",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:424,category:"MEDICAL EQUIPMENT",description:"PORTABLE PLEGM SUCTION UNIT",quantity:"1",serialNo:"2205 00170 3039",model:"H003-C",location:"STORE",dateAcquired:"5TH NOV 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:425,category:"MEDICAL EQUIPMENT",description:"DIGITAL THERMOMETER",quantity:"1",serialNo:"NONE",model:"",location:"MCH",dateAcquired:"1ST NOV 2021",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:426,category:"MEDICAL EQUIPMENT",description:"PULSE OXIMETER",quantity:"1",serialNo:"NONE",model:"",location:"M/WARD",dateAcquired:"30TH MAY 2022",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:427,category:"MEDICAL EQUIPMENT",description:"BP MACHINE {OMRON}",quantity:"1",serialNo:"202311031301V",model:"",location:"MCH",dateAcquired:"4TH MARCH 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:428,category:"MEDICAL EQUIPMENT",description:"BP MACHINE",quantity:"1",serialNo:"202311031002V",model:"",location:"MCH",dateAcquired:"4TH MARCH 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:429,category:"MEDICAL EQUIPMENT",description:"BP MACHINE",quantity:"1",serialNo:"202311031304V",model:"",location:"OPD",dateAcquired:"4TH MARCH 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:430,category:"MEDICAL EQUIPMENT",description:"CRASH CART",quantity:"1",serialNo:"NONE",model:"KL-TC003",location:"OPD",dateAcquired:"7TH MARCH 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:431,category:"MEDICAL EQUIPMENT",description:"OMRON BP MACHINE",quantity:"1",serialNo:"202311031303",model:"",location:"M/WARD",dateAcquired:"4TH MARCH 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:432,category:"MEDICAL EQUIPMENT",description:"CRASH CART {TROLLEY}",quantity:"1",serialNo:"NONE",model:"MP-AS2513",location:"PAEDTRIAC WARD",dateAcquired:"7TH MARCH 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:433,category:"MEDICAL EQUIPMENT",description:"DENTAL FLASK",quantity:"5",serialNo:"NONE",model:"",location:"STORE",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:434,category:"MEDICAL EQUIPMENT",description:"DENTAL DOUBLE CLAMPS",quantity:"2",serialNo:"NONE",model:"",location:"STORES",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:435,category:"MEDICAL EQUIPMENT",description:"PATIENT MONITOR",quantity:"1",serialNo:"250528200 201",model:"YK-8000C",location:"STORE",dateAcquired:"5TH FEB 2026",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:436,category:"MEDICAL EQUIPMENT",description:"BLOOD WARMER",quantity:"1",serialNo:"93435",model:"",location:"LABORATORY",dateAcquired:"2022",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:437,category:"GENERAL EQUIPMENT",description:"CABINET",quantity:"2",serialNo:"NONE",model:"",location:"MATERNITY",dateAcquired:"-CGB",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:438,category:"GENERAL EQUIPMENT",description:"WALL CLOCK",quantity:"2",serialNo:"NONE",model:"",location:"MATERNITY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:439,category:"GENERAL EQUIPMENT",description:"DRESSING TROLLEY",quantity:"2",serialNo:"NONE",model:"",location:"MATERNITY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:440,category:"GENERAL EQUIPMENT",description:"BEDS",quantity:"24",serialNo:"NONE",model:"",location:"MATERNITY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:441,category:"GENERAL EQUIPMENT",description:"BED SIDE LOCKERS",quantity:"20",serialNo:"NONE",model:"",location:"MATERNITY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:442,category:"GENERAL EQUIPMENT",description:"TABLES",quantity:"1",serialNo:"NONE",model:"",location:"MATERNITY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:443,category:"GENERAL EQUIPMENT",description:"DRUG TROLLEY",quantity:"1",serialNo:"NONE",model:"",location:"MATERNITY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:444,category:"GENERAL EQUIPMENT",description:"FIRE EXTINGUISHER",quantity:"1",serialNo:"NONE",model:"",location:"MATERNITY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:445,category:"GENERAL EQUIPMENT",description:"MICROWAVE",quantity:"1",serialNo:"205VAMS23DGS1190",model:"VAMS-23DGS",location:"MATERNITY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:446,category:"GENERAL EQUIPMENT",description:"SHOWER HEAD",quantity:"3",serialNo:"NONE",model:"",location:"MATERNITY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:447,category:"GENERAL EQUIPMENT",description:"TAIFACARE TABLET +POWERBANK",quantity:"1",serialNo:"359199780 817364",model:"",location:"MATERNITY",dateAcquired:"12TH NOV 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:448,category:"GENERAL EQUIPMENT",description:"TAIFACARE TABLET+POWERBANK",quantity:"1",serialNo:"359199780 757958",model:"",location:"MATERNITY",dateAcquired:"12TH NOV 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:449,category:"GENERAL EQUIPMENT",description:"TAIFACRE TABLET+POERBANK",quantity:"1",serialNo:"359199780533946",model:"",location:"MATERNITY",dateAcquired:"12TH NOV 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:450,category:"GENERAL EQUIPMENT",description:"LINEN TROLLEY",quantity:"",serialNo:"NONE",model:"",location:"MATERNITY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:451,category:"GENERAL EQUIPMENT",description:"ELECTEIC KETTLE",quantity:"1",serialNo:"6349",model:"RM1262",location:"PAEDIATRIC WARD",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:452,category:"GENERAL EQUIPMENT",description:"TABLES",quantity:"2",serialNo:"NONE",model:"",location:"PAEDIATRIC WARD",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:453,category:"GENERAL EQUIPMENT",description:"CABINET",quantity:"2",serialNo:"NONE",model:"",location:"PAEDIATRIC WARD",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:454,category:"GENERAL EQUIPMENT",description:"CHAIR",quantity:"1",serialNo:"NONE",model:"",location:"PAEDIATRIC WARD",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:455,category:"GENERAL EQUIPMENT",description:"PAPER PUNCH",quantity:"1",serialNo:"NONE",model:"",location:"PAEDIATRIC WARD",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:456,category:"GENERAL EQUIPMENT",description:"DRESSING TROLLEY",quantity:"2",serialNo:"NONE",model:"",location:"PAEDIATRIC WARD",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:457,category:"GENERAL EQUIPMENT",description:"BEDSIDE LOCKERS",quantity:"20",serialNo:"NONE",model:"",location:"PAEDIATRIC WARD",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:458,category:"GENERAL EQUIPMENT",description:"LANDLINE",quantity:"1",serialNo:"NONE",model:"",location:"PAEDIATRIC WARD",dateAcquired:"-",status:"NON-FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:459,category:"GENERAL EQUIPMENT",description:"PAPER PUNCH",quantity:"1",serialNo:"NONE",model:"",location:"PAEDIATRIC WARD",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:460,category:"GENERAL EQUIPMENT",description:"LINEN TROLLEY",quantity:"1",serialNo:"NONE",model:"",location:"PAEDIATRIC WARD",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:461,category:"GENERAL EQUIPMENT",description:"TAIFACARE TABLET +POWERBANK",quantity:"1",serialNo:"359199780 785058",model:"",location:"PAEDIATRIC WARD",dateAcquired:"12TH NOV 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:462,category:"GENERAL EQUIPMENT",description:"TABLE",quantity:"1",serialNo:"NONE",model:"",location:"NBU",dateAcquired:"",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:463,category:"GENERAL EQUIPMENT",description:"SHOERACK",quantity:"2",serialNo:"NONE",model:"",location:"NBU",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:464,category:"GENERAL EQUIPMENT",description:"ELECTRICAL EXTENSION",quantity:"1",serialNo:"NONE",model:"",location:"NBU",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:465,category:"GENERAL EQUIPMENT",description:"CHAIRS",quantity:"2",serialNo:"NONE",model:"",location:"FEMALE WARD",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:466,category:"GENERAL EQUIPMENT",description:"CABINET",quantity:"3",serialNo:"NONE",model:"",location:"FEMALE WARD",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:467,category:"GENERAL EQUIPMENT",description:"PAPER PUNCH",quantity:"1",serialNo:"NONE",model:"",location:"FEMALE WARD",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:468,category:"GENERAL EQUIPMENT",description:"COOLBOX",quantity:"1",serialNo:"NONE",model:"",location:"FEMALE WARD",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:469,category:"GENERAL EQUIPMENT",description:"TAIFACARE TABLET+POWERBANK",quantity:"1",serialNo:"359199780 608524",model:"",location:"FEMALE WARD",dateAcquired:"12TH NOV 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:470,category:"GENERAL EQUIPMENT",description:"TAIFACARE TABLET +POWERBANK",quantity:"1",serialNo:"359199780 779820",model:"",location:"FEMALE WARD",dateAcquired:"12TH NOV 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:471,category:"GENERAL EQUIPMENT",description:"TAIFACARE TABLET+POWERBANK",quantity:"1",serialNo:"359199780 724854",model:"",location:"FEMALE WARD",dateAcquired:"12TH NOV 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:472,category:"GENERAL EQUIPMENT",description:"FIRE EXTINGUISHER",quantity:"1",serialNo:"NONE",model:"",location:"FEMALE WARD",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:473,category:"GENERAL EQUIPMENT",description:"STOOL",quantity:"1",serialNo:"NONE",model:"",location:"FEMALE WARD",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:474,category:"GENERAL EQUIPMENT",description:"SCREEN",quantity:"1",serialNo:"NONE",model:"",location:"FEMALE WARD",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:475,category:"GENERAL EQUIPMENT",description:"TABLET",quantity:"1",serialNo:"6972618 630373",model:"",location:"ACCOUNTS OFFICE",dateAcquired:"1ST OCT 2024",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:476,category:"GENERAL EQUIPMENT",description:"CHARGER",quantity:"1",serialNo:"18W0509200",model:"",location:"ACCOUNTS OFFICE",dateAcquired:"1ST OCT 2024",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:477,category:"GENERAL EQUIPMENT",description:"POWERBANK",quantity:"1",serialNo:"",model:"PF200",location:"ACCOUNTS OFFICE",dateAcquired:"1ST OCT 2024",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:478,category:"GENERAL EQUIPMENT",description:"MONITOR",quantity:"1",serialNo:"NONE",model:"",location:"ACCOUNTS OFFICE",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:479,category:"GENERAL EQUIPMENT",description:"MONITOR",quantity:"1",serialNo:"NONE",model:"",location:"ACCOUNTS OFFICE",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:480,category:"GENERAL EQUIPMENT",description:"KEYBOARD",quantity:"1",serialNo:"NONE",model:"",location:"ACCOUNTS OFFICE",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:481,category:"GENERAL EQUIPMENT",description:"KEYBOARD",quantity:"1",serialNo:"NONE",model:"",location:"ACCOUNTS OFFICE",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:482,category:"GENERAL EQUIPMENT",description:"MOUSE",quantity:"1",serialNo:"NONE",model:"",location:"ACCOUNTS OFFICE",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:483,category:"GENERAL EQUIPMENT",description:"MOUSE",quantity:"1",serialNo:"NONE",model:"",location:"ACCOUNTS OFFICE",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:484,category:"GENERAL EQUIPMENT",description:"HPLASERJET PRINTER",quantity:"1",serialNo:"NONE",model:"",location:"ACCOUNTS OFFICE",dateAcquired:"28TH JUNE 2024",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:485,category:"GENERAL EQUIPMENT",description:"HPLASERJET PRINTER",quantity:"1",serialNo:"NONE",model:"",location:"ACCOUNTS OFFICE",dateAcquired:"-",status:"NON-FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:486,category:"GENERAL EQUIPMENT",description:"SAFE",quantity:"1",serialNo:"NONE",model:"",location:"ACCOUNTS OFFICE",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:487,category:"GENERAL EQUIPMENT",description:"TABLES",quantity:"2",serialNo:"NONE",model:"",location:"ACCOUNTS OFFICE",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:488,category:"GENERAL EQUIPMENT",description:"CHAIRS",quantity:"3",serialNo:"NONE",model:"",location:"ACCOUNTS OFFICE",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:489,category:"GENERAL EQUIPMENT",description:"STEEL CABINET",quantity:"1",serialNo:"N/A",model:"",location:"ACCOUNTS OFFICE",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:490,category:"GENERAL EQUIPMENT",description:"STEEL CABINET",quantity:"1",serialNo:"NONE",model:"",location:"ACCOUNTS OFFICE",dateAcquired:"26TH JUNE 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:491,category:"GENERAL EQUIPMENT",description:"ECOSYS M4125idn PRINTER",quantity:"1",serialNo:"Q7A9411284",model:"1203NP3NLO",location:"SECRETARY OFFICE",dateAcquired:"-",status:"FUNCTIONAl",ownership:"FACILITY OWNED",notes:""},
{id:492,category:"GENERAL EQUIPMENT",description:"MONITOR",quantity:"1",serialNo:"3cQ9220021",model:"",location:"SECRETARY OFFICE",dateAcquired:"-",status:"FUNCTIONAl",ownership:"FACILITY OWNED",notes:""},
{id:493,category:"GENERAL EQUIPMENT",description:"KEYBOARD",quantity:"1",serialNo:"NONE",model:"",location:"SECRETARY OFFICE",dateAcquired:"-",status:"FUNCTIONAl",ownership:"FACILITY OWNED",notes:""},
{id:494,category:"GENERAL EQUIPMENT",description:"KEYBOARD",quantity:"1",serialNo:"B93AB0AS95-CJG",model:"9109",location:"SECRETARY OFFICE",dateAcquired:"-",status:"NON-FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:495,category:"GENERAL EQUIPMENT",description:"UPS",quantity:"1",serialNo:"BV1000-MSX",model:"",location:"SECRETARY OFFICE",dateAcquired:"-",status:"FUNCTIONAl",ownership:"FACILITY OWNED",notes:""},
{id:496,category:"GENERAL EQUIPMENT",description:"UPS",quantity:"1",serialNo:"2419065 25431",model:"ME-650-VU",location:"SECRETARY OFFICE",dateAcquired:"-",status:"NON-FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:497,category:"GENERAL EQUIPMENT",description:"CPU",quantity:"1",serialNo:"NONE",model:"",location:"SECRETARY OFFICE",dateAcquired:"-",status:"FUNCTIONAl",ownership:"FACILITY OWNED",notes:""},
{id:498,category:"GENERAL EQUIPMENT",description:"TABLE",quantity:"1",serialNo:"NONE",model:"",location:"SECRETARY OFFICE",dateAcquired:"-",status:"FUNCTIONAl",ownership:"FACILITY OWNED",notes:""},
{id:499,category:"GENERAL EQUIPMENT",description:"CHAIRS",quantity:"1",serialNo:"NONE",model:"",location:"SECRETARY OFFICE",dateAcquired:"-",status:"FUNCTIONAl",ownership:"FACILITY OWNED",notes:""},
{id:500,category:"GENERAL EQUIPMENT",description:"LANDLINE",quantity:"1",serialNo:"NONE",model:"",location:"SECRETARY OFFICE",dateAcquired:"-",status:"NON-FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:501,category:"GENERAL EQUIPMENT",description:"EXTENSION",quantity:"1",serialNo:"NONE",model:"",location:"SECRETARY OFFICE",dateAcquired:"-",status:"FUNCTIONAl",ownership:"FACILITY OWNED",notes:""},
{id:502,category:"GENERAL EQUIPMENT",description:"SHOE RACKS",quantity:"2",serialNo:"NONE",model:"",location:"HDU",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:503,category:"GENERAL EQUIPMENT",description:"OFFICE CHAIRS",quantity:"1",serialNo:"NONE",model:"",location:"HDU",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:504,category:"GENERAL EQUIPMENT",description:"BENCH",quantity:"2",serialNo:"NONE",model:"",location:"HDU",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:505,category:"GENERAL EQUIPMENT",description:"OFFICE TABLE",quantity:"1",serialNo:"NONE",model:"",location:"HDU",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:506,category:"GENERAL EQUIPMENT",description:"CABINETS",quantity:"2",serialNo:"NONE",model:"",location:"HDU",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:507,category:"GENERAL EQUIPMENT",description:"PEDDLE BINS",quantity:"2",serialNo:"NONE",model:"",location:"HDU",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:508,category:"GENERAL EQUIPMENT",description:"MICROWAVE",quantity:"1",serialNo:"D/202204011401",model:"MNMMWDSPR2023S",location:"HDU",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:509,category:"GENERAL EQUIPMENT",description:"ROOM HEATER",quantity:"1",serialNo:"NONE",model:"",location:"HDU",dateAcquired:"6TH MAY 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:510,category:"GENERAL EQUIPMENT",description:"BEDSIDE LOCKER",quantity:"4",serialNo:"NONE",model:"",location:"HDU",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:511,category:"GENERAL EQUIPMENT",description:"WATER KETTLE",quantity:"1",serialNo:"06179-10879",model:"RM-115",location:"HDU",dateAcquired:"5TH JAN 2026",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:512,category:"GENERAL EQUIPMENT",description:"PAPER PUNCH",quantity:"1",serialNo:"NONE",model:"",location:"HDU",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:513,category:"GENERAL EQUIPMENT",description:"STAPPLER",quantity:"1",serialNo:"NONE",model:"",location:"HDU",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:514,category:"GENERAL EQUIPMENT",description:"TAIFACARE TABLET +POWERBANK",quantity:"1",serialNo:"359199780 876337",model:"",location:"HDU",dateAcquired:"12TH NOV 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:515,category:"GENERAL EQUIPMENT",description:"THERMOGUN",quantity:"1",serialNo:"NONE",model:"",location:"HDU",dateAcquired:"30TH MAY 2022",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:516,category:"GENERAL EQUIPMENT",description:"BED",quantity:"36",serialNo:"NONE",model:"",location:"MALE WARD",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:517,category:"GENERAL EQUIPMENT",description:"BEDSIDE LOCKERS",quantity:"35",serialNo:"NONE",model:"",location:"MALE WARD",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:518,category:"GENERAL EQUIPMENT",description:"CABINET",quantity:"4",serialNo:"NONE",model:"",location:"MALE WARD",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:519,category:"GENERAL EQUIPMENT",description:"BENCHES",quantity:"2",serialNo:"NONE",model:"",location:"MALE WARD",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:520,category:"GENERAL EQUIPMENT",description:"PAPER PUNCH",quantity:"1",serialNo:"NONE",model:"",location:"MALE WARD",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:521,category:"GENERAL EQUIPMENT",description:"DRUG TROLLEY",quantity:"2",serialNo:"NONE",model:"",location:"MALE WARD",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:522,category:"GENERAL EQUIPMENT",description:"DRESSING TROLLEY",quantity:"2",serialNo:"NONE",model:"",location:"MALE WARD",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:523,category:"GENERAL EQUIPMENT",description:"LANDLINE",quantity:"1",serialNo:"NONE",model:"",location:"MALE WARD",dateAcquired:"-",status:"NON-FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:524,category:"GENERAL EQUIPMENT",description:"STOOL",quantity:"1",serialNo:"NONE",model:"",location:"MALE WARD",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:525,category:"GENERAL EQUIPMENT",description:"LINEN TROLLEY",quantity:"1",serialNo:"NONE",model:"",location:"MALE WARD",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:526,category:"GENERAL EQUIPMENT",description:"TAIFACRE TABLET+POERBANK",quantity:"",serialNo:"359199780 612443",model:"",location:"MALE WARD",dateAcquired:"12TH NOV 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:527,category:"GENERAL EQUIPMENT",description:"TAIFACARE TABLET +POWERBANK",quantity:"1",serialNo:"359199780 881196",model:"",location:"MALE WARD",dateAcquired:"12TH NOV 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:528,category:"GENERAL EQUIPMENT",description:"TAIFACARE TABLET+POWERBANK",quantity:"1",serialNo:"359199780 877491",model:"",location:"MALE WARD",dateAcquired:"12TH NOV 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:529,category:"GENERAL EQUIPMENT",description:"PEDDLE BINS",quantity:"",serialNo:"NONE",model:"",location:"MALE WARD",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:530,category:"GENERAL EQUIPMENT",description:"CABINET",quantity:"1",serialNo:"NONE",model:"",location:"LABORATORY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:531,category:"GENERAL EQUIPMENT",description:"CHAIRS",quantity:"3",serialNo:"NONE",model:"",location:"LABORATORY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:532,category:"GENERAL EQUIPMENT",description:"PLASTIC CHAIRS",quantity:"2",serialNo:"NONE",model:"",location:"LABORATORY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:533,category:"GENERAL EQUIPMENT",description:"STOOL",quantity:"4",serialNo:"NONE",model:"",location:"LABORATORY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:534,category:"GENERAL EQUIPMENT",description:"TAIFACARE TABLETS + POWER BANK",quantity:"1",serialNo:"359199780 759061",model:"",location:"LABORATORY",dateAcquired:"12TH NOV 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:535,category:"GENERAL EQUIPMENT",description:"EXTENSION",quantity:"1",serialNo:"NONE",model:"",location:"LABORATORY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:536,category:"GENERAL EQUIPMENT",description:"PAPER PUNCH",quantity:"1",serialNo:"NONE",model:"",location:"LABORATORY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:537,category:"GENERAL EQUIPMENT",description:"LANDLINE",quantity:"1",serialNo:"NONE",model:"",location:"LABORATORY",dateAcquired:"-",status:"NON-FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:538,category:"GENERAL EQUIPMENT",description:"LABORATORY CHAIRS",quantity:"6",serialNo:"",model:"",location:"LABORATORY",dateAcquired:"17TH APRIL 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:539,category:"GENERAL EQUIPMENT",description:"PEDDLE BINS",quantity:"3",serialNo:"NONE",model:"",location:"LABORATORY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:540,category:"GENERAL EQUIPMENT",description:"FRIDGE",quantity:"1",serialNo:"1CAP0057KE",model:"VIDECOM",location:"PHARMACY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:541,category:"GENERAL EQUIPMENT",description:"FREEZER",quantity:"1",serialNo:"NONE",model:"RS-19DR4ME",location:"PHARMACY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:542,category:"GENERAL EQUIPMENT",description:"POS PRINTER THERMOROLL",quantity:"1",serialNo:"A160HU0A161078",model:"",location:"PHARMACY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:543,category:"GENERAL EQUIPMENT",description:"CPU",quantity:"1",serialNo:"CZC7108Z23",model:"X3KK8IE/BH5",location:"PHARMACY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:544,category:"GENERAL EQUIPMENT",description:"CABINET",quantity:"6",serialNo:"NONE",model:"",location:"PHARMACY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:545,category:"GENERAL EQUIPMENT",description:"CLOCK",quantity:"1",serialNo:"NONE",model:"",location:"PHARMACY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:546,category:"GENERAL EQUIPMENT",description:"LANDLINE",quantity:"1",serialNo:"NONE",model:"",location:"PHARMACY",dateAcquired:"-",status:"NON FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:547,category:"GENERAL EQUIPMENT",description:"MONITOR",quantity:"1",serialNo:"NONE",model:"",location:"PHARMACY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:548,category:"GENERAL EQUIPMENT",description:"KEYBOARD",quantity:"1",serialNo:"NONE",model:"HP",location:"PHARMACY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:549,category:"GENERAL EQUIPMENT",description:"MOUSE",quantity:"1",serialNo:"NONE",model:"",location:"PHARMACY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:550,category:"GENERAL EQUIPMENT",description:"PAPER PUNCH",quantity:"1",serialNo:"NONE",model:"",location:"PHARMACY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:551,category:"GENERAL EQUIPMENT",description:"FRIDGE",quantity:"1",serialNo:"BE03L SEONO 0QJN4 20007",model:"HYC-940",location:"PHARMACY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:552,category:"GENERAL EQUIPMENT",description:"TAIFACARE TABLET +POWERBANK",quantity:"1",serialNo:"359199780 693906",model:"",location:"PHARMACY",dateAcquired:"12TH NOV 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:553,category:"GENERAL EQUIPMENT",description:"STAPLER",quantity:"2",serialNo:"NONE",model:"",location:"PHARMACY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:554,category:"GENERAL EQUIPMENT",description:"CHAIR",quantity:"3",serialNo:"NONE",model:"",location:"PHARMACY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:555,category:"GENERAL EQUIPMENT",description:"TABLE",quantity:"1",serialNo:"NONE",model:"",location:"PHARMACY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:556,category:"GENERAL EQUIPMENT",description:"PLASTIC CHAIRS",quantity:"2",serialNo:"NONE",model:"",location:"REVENUE",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:557,category:"GENERAL EQUIPMENT",description:"OFFICE CHAIRS",quantity:"2",serialNo:"NONE",model:"",location:"REVENUE",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:558,category:"GENERAL EQUIPMENT",description:"TABLE",quantity:"1",serialNo:"NONE",model:"",location:"REVENUE",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:559,category:"GENERAL EQUIPMENT",description:"CABINETS",quantity:"2",serialNo:"NONE",model:"",location:"REVENUE",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:560,category:"GENERAL EQUIPMENT",description:"UPS",quantity:"1",serialNo:"NONE",model:"",location:"REVENUE",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:561,category:"GENERAL EQUIPMENT",description:"CPU",quantity:"2",serialNo:"NONE",model:"",location:"REVENUE",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:562,category:"GENERAL EQUIPMENT",description:"MONITORS",quantity:"2",serialNo:"NONE",model:"",location:"REVENUE",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:563,category:"GENERAL EQUIPMENT",description:"KEYBOARDS",quantity:"2",serialNo:"NONE",model:"",location:"REVENUE",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:564,category:"GENERAL EQUIPMENT",description:"PRINTER",quantity:"1",serialNo:"NONE",model:"HP LASERJETMFP227SDN",location:"REVENUE",dateAcquired:"14TH DEC 2023",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:565,category:"GENERAL EQUIPMENT",description:"PRINTER(POS PRINTER)",quantity:"2",serialNo:"NONE",model:"",location:"REVENUE",dateAcquired:"-",status:"NON FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:566,category:"GENERAL EQUIPMENT",description:"SERVER",quantity:"1",serialNo:"NONE",model:"",location:"REVENUE",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:567,category:"GENERAL EQUIPMENT",description:"LANDLINE",quantity:"1",serialNo:"NONE",model:"",location:"REVENUE",dateAcquired:"-",status:"NON FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:568,category:"GENERAL EQUIPMENT",description:"EXTENSION CABLE",quantity:"2",serialNo:"NONE",model:"",location:"REVENUE",dateAcquired:"-",status:"NON FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:569,category:"GENERAL EQUIPMENT",description:"TAIFACARE TABLET +POWERBANK",quantity:"1",serialNo:"359199780 678626",model:"",location:"REVENUE",dateAcquired:"12TH NOV 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:570,category:"GENERAL EQUIPMENT",description:"FINGER PRINT SCANNER",quantity:"2",serialNo:"DXOOE003671",model:"",location:"REVENUE",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:571,category:"GENERAL EQUIPMENT",description:"STAPPLER",quantity:"1",serialNo:"NONE",model:"",location:"REVENUE",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:572,category:"GENERAL EQUIPMENT",description:"MONITOR",quantity:"1",serialNo:"3Q3110GTL",model:"",location:"REVENUE",dateAcquired:"28TH JUNE 2024",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:573,category:"GENERAL EQUIPMENT",description:"CENTRAL PROCESSING UNIT",quantity:"",serialNo:"CDN23D1516",model:"",location:"REVENUE",dateAcquired:"28TH JUNE 2024",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:574,category:"GENERAL EQUIPMENT",description:"MOUSE",quantity:"1",serialNo:"928926001",model:"",location:"REVENUE",dateAcquired:"28TH JUNE 2024",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:575,category:"GENERAL EQUIPMENT",description:"KEYBOARD",quantity:"1",serialNo:"BGMCHOBTJFV3BF",model:"",location:"REVENUE",dateAcquired:"28TH JUNE 2024",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:576,category:"GENERAL EQUIPMENT",description:"UPS",quantity:"1",serialNo:"240201M0850LOO697",model:"",location:"REVENUE",dateAcquired:"28TH JUNE 2024",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:577,category:"GENERAL EQUIPMENT",description:"MONITOR",quantity:"1",serialNo:"3QQ2061SZF",model:"",location:"LABORATORY",dateAcquired:"28TH JUNE 2024",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:578,category:"GENERAL EQUIPMENT",description:"CENTRAL PROCESSING UNIT",quantity:"1",serialNo:"CDN23D1534",model:"",location:"LABORATORY",dateAcquired:"28TH JUNE 2024",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:579,category:"GENERAL EQUIPMENT",description:"MOUSE",quantity:"1",serialNo:"928926001",model:"",location:"LABORATORY",dateAcquired:"28TH JUNE 2024",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:580,category:"GENERAL EQUIPMENT",description:"KEYBOARD",quantity:"1",serialNo:"BGMCHOBTJFV381",model:"",location:"LABORATORY",dateAcquired:"28TH JUNE 2024",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:581,category:"GENERAL EQUIPMENT",description:"UPS",quantity:"1",serialNo:"240201MO85L00184",model:"",location:"LABORATORY",dateAcquired:"28TH JUNE 2024",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:582,category:"GENERAL EQUIPMENT",description:"MONITOR",quantity:"1",serialNo:"3CQ2061JJI",model:"",location:"C/O PEADS",dateAcquired:"28TH JUNE 2024",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:583,category:"GENERAL EQUIPMENT",description:"CENTRAL PROCESSING UNIT",quantity:"1",serialNo:"CDN23D1524",model:"",location:"C/O PEADS",dateAcquired:"28TH JUNE 2024",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:584,category:"GENERAL EQUIPMENT",description:"MOUSE",quantity:"1",serialNo:"928926001",model:"",location:"C/O PEADS",dateAcquired:"28TH JUNE 2024",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:585,category:"GENERAL EQUIPMENT",description:"KEYBOARD",quantity:"1",serialNo:"BGMCHOBTJFV3B9",model:"",location:"C/O PEADS",dateAcquired:"28TH JUNE 2024",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:586,category:"GENERAL EQUIPMENT",description:"UPS",quantity:"1",serialNo:"240201M0850LOO184",model:"",location:"C/O PEADS",dateAcquired:"28TH JUNE 2024",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:587,category:"GENERAL EQUIPMENT",description:"MONITOR",quantity:"1",serialNo:"3CQ13412TK",model:"",location:"C/O OPD",dateAcquired:"28TH JUNE 2024",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:588,category:"GENERAL EQUIPMENT",description:"CENTRAL PROCESSING UNIT",quantity:"1",serialNo:"CDN23D1515",model:"",location:"C/O OPD",dateAcquired:"28TH JUNE 2024",status:"FUNCTINAL",ownership:"FACILITY OWNED",notes:""},
{id:589,category:"GENERAL EQUIPMENT",description:"MOUSE",quantity:"1",serialNo:"928926001",model:"",location:"C/O OPD",dateAcquired:"28TH JUNE 2024",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:590,category:"GENERAL EQUIPMENT",description:"KEYBOARD",quantity:"1",serialNo:"BGMCHOBTJFV2R4",model:"",location:"C/O OPD",dateAcquired:"28TH JUNE 2024",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:591,category:"GENERAL EQUIPMENT",description:"UPS",quantity:"1",serialNo:"240201M0850L00182",model:"",location:"C/O OPD",dateAcquired:"28TH JUNE 2024",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:592,category:"GENERAL EQUIPMENT",description:"MONITOR",quantity:"1",serialNo:"3CQ2061RRN",model:"",location:"ADMINS OFFICE",dateAcquired:"28TH JUNE 2024",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:593,category:"GENERAL EQUIPMENT",description:"CENTRAL PROCESSING UNIT",quantity:"1",serialNo:"CDN23D1539",model:"",location:"ADMINS OFFICE",dateAcquired:"28TH JUNE 2024",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:594,category:"GENERAL EQUIPMENT",description:"MOUSE",quantity:"1",serialNo:"968926001",model:"",location:"ADMINS OFFICE",dateAcquired:"28TH JUNE 2024",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:595,category:"GENERAL EQUIPMENT",description:"KEYBOARD",quantity:"1",serialNo:"BGMCHOBTJFV3BC",model:"",location:"ADMINS OFFICE",dateAcquired:"28TH JUNE 2024",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:596,category:"GENERAL EQUIPMENT",description:"UPS",quantity:"1",serialNo:"240201M0850LOO183",model:"",location:"ADMINS OFFICE",dateAcquired:"28TH JUNE 2024",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:597,category:"GENERAL EQUIPMENT",description:"UPS",quantity:"1",serialNo:"24020IM0850LOO162",model:"MAVERIC 850",location:"DENTAL",dateAcquired:"28TH JUNE 2024",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:598,category:"GENERAL EQUIPMENT",description:"CPU",quantity:"1",serialNo:"CND23DI1530",model:"HP ELITE DESK 800G3SFF",location:"DENTAL",dateAcquired:"28TH JUNE 2024",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:599,category:"GENERAL EQUIPMENT",description:"MONITOR",quantity:"1",serialNo:"3CQ311OGVB",model:"HPP204V",location:"DENTAL",dateAcquired:"28TH JUNE 2024",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:600,category:"GENERAL EQUIPMENT",description:"MOUSE",quantity:"1",serialNo:"928926-001",model:"TPC-P001M",location:"DENTAL",dateAcquired:"28TH JUNE 2024",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:601,category:"GENERAL EQUIPMENT",description:"KEYBOARD",quantity:"1",serialNo:"BGMCHOBTJFW2R3",model:"TPCPOOIK",location:"DENTAL",dateAcquired:"30TH MAY 222",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:602,category:"GENERAL EQUIPMENT",description:"MONITOR",quantity:"1",serialNo:"3CQ206152C",model:"",location:"MCI",dateAcquired:"28TH JUNE 2024",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:603,category:"GENERAL EQUIPMENT",description:"CENTRAL PROCESSING UNIT",quantity:"1",serialNo:"CDN23D1540",model:"",location:"MCI",dateAcquired:"28TH JUNE 2024",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:604,category:"GENERAL EQUIPMENT",description:"MOUSE",quantity:"1",serialNo:"928926001",model:"",location:"MCI",dateAcquired:"28TH JUNE 2024",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:605,category:"GENERAL EQUIPMENT",description:"KEYBOARD",quantity:"1",serialNo:"BGMCHOBTJFV3BA",model:"",location:"MCI",dateAcquired:"28TH JUNE 2024",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:606,category:"GENERAL EQUIPMENT",description:"UPS",quantity:"1",serialNo:"240201M0850LOO163",model:"",location:"MCI",dateAcquired:"28TH JUNE 2024",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:607,category:"GENERAL EQUIPMENT",description:"MONITOR",quantity:"1",serialNo:"3CQ90",model:"",location:"PROCUREMENT",dateAcquired:"28TH JUNE 2024",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:608,category:"GENERAL EQUIPMENT",description:"CENTRAL PROCESSING UNIT",quantity:"1",serialNo:"CDND23D1538",model:"",location:"PROCUREMENT",dateAcquired:"28TH JUNE 2024",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:609,category:"GENERAL EQUIPMENT",description:"MOUSE",quantity:"1",serialNo:"928926001",model:"",location:"PROCUREMENT",dateAcquired:"28TH JUNE 2024",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:610,category:"GENERAL EQUIPMENT",description:"KEYBOARD",quantity:"1",serialNo:"BGMCHOBTJVFV3B5",model:"",location:"PROCUREMENT",dateAcquired:"28TH JUNE 2024",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:611,category:"GENERAL EQUIPMENT",description:"UPS",quantity:"1",serialNo:"240201M0850L00700",model:"",location:"PROCUREMENT",dateAcquired:"28TH JUNE 2024",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:612,category:"GENERAL EQUIPMENT",description:"MONITOR",quantity:"1",serialNo:"3CQ2061SZD",model:"",location:"NURSING MANAGER OFFICE",dateAcquired:"28TH JUNE 2024",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:613,category:"GENERAL EQUIPMENT",description:"CENTRAL PROCESSING UNIT",quantity:"1",serialNo:"CDN23D1517",model:"",location:"NURSING MANAGER OFFICE",dateAcquired:"28TH JUNE 2024",status:"FUNCTINAL",ownership:"FACILITY OWNED",notes:""},
{id:614,category:"GENERAL EQUIPMENT",description:"MOUSE",quantity:"1",serialNo:"928926001",model:"",location:"NURSING MANAGER OFFICE",dateAcquired:"28TH JUNE 2024",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:615,category:"GENERAL EQUIPMENT",description:"KEYBOARD",quantity:"1",serialNo:"BGMCHOBTJFV3BC",model:"",location:"NURSING MANAGER OFFICE",dateAcquired:"28TH JUNE 2024",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:616,category:"GENERAL EQUIPMENT",description:"UPS",quantity:"1",serialNo:"240201M0850L00161",model:"",location:"NURSING MANAGER OFFICE",dateAcquired:"28TH JUNE 2024",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:617,category:"GENERAL EQUIPMENT",description:"MONITOR",quantity:"1",serialNo:"3CQ2061RSC",model:"",location:"RECORDS",dateAcquired:"28TH JUNE 2024",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:618,category:"GENERAL EQUIPMENT",description:"CENTRAL PROCESSING UNIT",quantity:"1",serialNo:"CDND23D1537",model:"",location:"RECORDS",dateAcquired:"28TH JUNE 2024",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:619,category:"GENERAL EQUIPMENT",description:"MOUSE",quantity:"1",serialNo:"928926001",model:"",location:"RECORDS",dateAcquired:"28TH JUNE 2024",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:620,category:"GENERAL EQUIPMENT",description:"KEYBOARD",quantity:"1",serialNo:"BGMCHOBTJFV3BB",model:"",location:"RECORDS",dateAcquired:"28TH JUNE 2024",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:621,category:"GENERAL EQUIPMENT",description:"UPS",quantity:"1",serialNo:"240201M0850L00213",model:"",location:"RECORDS",dateAcquired:"28TH JUNE 2024",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:622,category:"GENERAL EQUIPMENT",description:"MONITOR",quantity:"1",serialNo:"3CQ1340RIJ",model:"",location:"RADIOLOGY.",dateAcquired:"28TH JUNE 2024",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:623,category:"GENERAL EQUIPMENT",description:"CENTRAL PROCESSING UNIT",quantity:"1",serialNo:"CDND23D1528",model:"",location:"RADIOLOGY.",dateAcquired:"28TH JUNE 2024",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:624,category:"GENERAL EQUIPMENT",description:"MOUSE",quantity:"1",serialNo:"928926001",model:"",location:"RADIOLOGY.",dateAcquired:"28TH JUNE 2024",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:625,category:"GENERAL EQUIPMENT",description:"KEYBOARD",quantity:"1",serialNo:"BGMCHOBTJFV2R2",model:"",location:"RADIOLOGY.",dateAcquired:"28TH JUNE 2024",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:626,category:"GENERAL EQUIPMENT",description:"UPS",quantity:"1",serialNo:"240201M0850L00164",model:"",location:"RADIOLOGY.",dateAcquired:"28TH JUNE 2024",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:627,category:"GENERAL EQUIPMENT",description:"WALL CLOCK",quantity:"1",serialNo:"NONE",model:"",location:"REVENUE",dateAcquired:"-",status:"NON-FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:628,category:"GENERAL EQUIPMENT",description:"LAND LINE",quantity:"1",serialNo:"NONE",model:"",location:"MORGUE",dateAcquired:"-",status:"NON FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:629,category:"GENERAL EQUIPMENT",description:"TAIFACRE TABLET+POWERBANK",quantity:"1",serialNo:"359299780 816622",model:"",location:"MORGUE",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:630,category:"GENERAL EQUIPMENT",description:"WALL CLOCK",quantity:"1",serialNo:"NONE",model:"",location:"MORGUE",dateAcquired:"-",status:"NON FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:631,category:"GENERAL EQUIPMENT",description:"STOOL",quantity:"1",serialNo:"NONE",model:"",location:"MORGUE",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:632,category:"GENERAL EQUIPMENT",description:"TABLE",quantity:"1",serialNo:"NONE",model:"",location:"MORGUE",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:633,category:"GENERAL EQUIPMENT",description:"CABINET",quantity:"1",serialNo:"NONE",model:"",location:"MORGUE",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:634,category:"GENERAL EQUIPMENT",description:"CODENSING UNIT WITH ACCESSORIES",quantity:"4",serialNo:"NONE",model:"",location:"MORGUE",dateAcquired:"12TH APRIL 2022",status:"2 FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:635,category:"GENERAL EQUIPMENT",description:"WATER DISPENSER",quantity:"1",serialNo:"03555/10253",model:"RM/419",location:"THEATRE",dateAcquired:"-",status:"NON FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:636,category:"GENERAL EQUIPMENT",description:"STOOL",quantity:"5",serialNo:"NONE",model:"",location:"THEATRE",dateAcquired:"-",status:"FUNCTION",ownership:"FACILITY OWNED",notes:""},
{id:637,category:"GENERAL EQUIPMENT",description:"CHAIRS",quantity:"1",serialNo:"NONE",model:"",location:"THEATRE",dateAcquired:"-",status:"FUNCTION",ownership:"FACILITY OWNED",notes:""},
{id:638,category:"GENERAL EQUIPMENT",description:"FRIDGE",quantity:"1",serialNo:"008KR00017",model:"LG-GR-0515F",location:"THEATRE",dateAcquired:"-",status:"FUNCTION",ownership:"FACILITY OWNED",notes:""},
{id:639,category:"GENERAL EQUIPMENT",description:"METALLIC CABINET",quantity:"2",serialNo:"NONE",model:"",location:"THEATRE",dateAcquired:"-",status:"FUNCTION",ownership:"FACILITY OWNED",notes:""},
{id:640,category:"GENERAL EQUIPMENT",description:"PLASTIC CHAIRS",quantity:"4",serialNo:"NONE",model:"",location:"THEATRE",dateAcquired:"-",status:"FUNCTION",ownership:"FACILITY OWNED",notes:""},
{id:641,category:"GENERAL EQUIPMENT",description:"TAIFACARE TABLETS + POWER BANK",quantity:"1",serialNo:"359199780 879042",model:"",location:"THEATRE",dateAcquired:"12TH NOV 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:642,category:"GENERAL EQUIPMENT",description:"TAIFACARE TABLET +POWERBANK",quantity:"1",serialNo:"359199780 790595",model:"",location:"THEATRE",dateAcquired:"12TH NOV 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:643,category:"GENERAL EQUIPMENT",description:"WOODEN CABINET",quantity:"1",serialNo:"NONE",model:"",location:"THEATRE",dateAcquired:"-",status:"FUNCTION",ownership:"FACILITY OWNED",notes:""},
{id:644,category:"GENERAL EQUIPMENT",description:"LAND LINE",quantity:"1",serialNo:"AX400TL",model:"AMPEX",location:"THEATRE",dateAcquired:"-",status:"NON FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:645,category:"GENERAL EQUIPMENT",description:"UPS",quantity:"1",serialNo:"NONE",model:"",location:"THEATRE",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:646,category:"GENERAL EQUIPMENT",description:"METALIC CABINET",quantity:"1",serialNo:"NONE",model:"",location:"THEATRE",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:647,category:"GENERAL EQUIPMENT",description:"ELECTRIC KETTLE",quantity:"1",serialNo:"SG-HHB2516",model:"",location:"THEATRE",dateAcquired:"19TH SEPT 2024",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:648,category:"GENERAL EQUIPMENT",description:"MICROWAVE",quantity:"1",serialNo:"",model:"",location:"THEATRE",dateAcquired:"19TH SEPT 2024",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:649,category:"GENERAL EQUIPMENT",description:"TABLES",quantity:"3",serialNo:"NONE",model:"",location:"THEATRE",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:650,category:"GENERAL EQUIPMENT",description:"GENERATOR",quantity:"1",serialNo:"NONE",model:"",location:"THEATRE",dateAcquired:"-",status:"NON-FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:651,category:"GENERAL EQUIPMENT",description:"CPU",quantity:"1",serialNo:"SG4424PZOY",model:"",location:"RECORDS",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:652,category:"GENERAL EQUIPMENT",description:"CPU",quantity:"1",serialNo:"4CE80533VN",model:"HP800",location:"RECORDS",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:653,category:"GENERAL EQUIPMENT",description:"CPU",quantity:"1",serialNo:"SGH702SY912",model:"HP800",location:"RECORDS",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:654,category:"GENERAL EQUIPMENT",description:"UPS",quantity:"1",serialNo:"9B2309A21353",model:"BV000I-MSX",location:"RECORDS",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:655,category:"GENERAL EQUIPMENT",description:"UPS",quantity:"1",serialNo:"NONE",model:"BV000I-MSX",location:"RECORDS",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:656,category:"GENERAL EQUIPMENT",description:"MONITOR",quantity:"1",serialNo:"6CM9380443",model:"HP",location:"RECORDS",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:657,category:"GENERAL EQUIPMENT",description:"MONITOR",quantity:"1",serialNo:"3CQ80906KO",model:"HP",location:"RECORDS",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:658,category:"GENERAL EQUIPMENT",description:"MONITOR",quantity:"1",serialNo:"3CQ8030PKO",model:"HP",location:"RECORDS",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:659,category:"GENERAL EQUIPMENT",description:"KEYBOARD",quantity:"1",serialNo:"803181-001",model:"HPKBAR211",location:"RECORDS",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:660,category:"GENERAL EQUIPMENT",description:"KEYBOARD",quantity:"1",serialNo:"NONE",model:"PR11OIU",location:"RECORDS",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:661,category:"GENERAL EQUIPMENT",description:"KEYBOARD",quantity:"1",serialNo:"697737-001",model:"",location:"RECORDS",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:662,category:"GENERAL EQUIPMENT",description:"MOUSE",quantity:"3",serialNo:"NONE",model:"",location:"RECORDS",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:663,category:"GENERAL EQUIPMENT",description:"LANDLINE",quantity:"1",serialNo:"NONE",model:"",location:"RECORDS",dateAcquired:"-",status:"NON-FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:664,category:"GENERAL EQUIPMENT",description:"CHAIRS",quantity:"4",serialNo:"NONE",model:"",location:"RECORDS",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:665,category:"GENERAL EQUIPMENT",description:"VACCUM CLEANER",quantity:"1",serialNo:"AVCWD18120637",model:"AVC-WD1812",location:"RECORDS",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:666,category:"GENERAL EQUIPMENT",description:"STOOL",quantity:"1",serialNo:"NONE",model:"",location:"RECORDS",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:667,category:"GENERAL EQUIPMENT",description:"PAPER PUNCH",quantity:"1",serialNo:"NONE",model:"",location:"RECORDS",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:668,category:"GENERAL EQUIPMENT",description:"WALL CLOCK",quantity:"1",serialNo:"NONE",model:"",location:"RECORDS",dateAcquired:"-",status:"NON-FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:669,category:"GENERAL EQUIPMENT",description:"CALCULATOR",quantity:"1",serialNo:"NONE",model:"",location:"RECORDS",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:670,category:"GENERAL EQUIPMENT",description:"STAPLER",quantity:"1",serialNo:"NONE",model:"",location:"RECORDS",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:671,category:"GENERAL EQUIPMENT",description:"TAIFACARE TABLETS + POWER BANK",quantity:"1",serialNo:"352199780 701220",model:"",location:"RECORDS",dateAcquired:"12TH NOV 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:672,category:"GENERAL EQUIPMENT",description:"CABINNET",quantity:"4",serialNo:"NONE",model:"",location:"RECORDS",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:673,category:"GENERAL EQUIPMENT",description:"MONITOR",quantity:"1",serialNo:"CND650213BY7",model:"LITO6HP",location:"PITC",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:674,category:"GENERAL EQUIPMENT",description:"MONITOR",quantity:"1",serialNo:"CNWDCYJF",model:"DEL",location:"PITC",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:675,category:"GENERAL EQUIPMENT",description:"KEYBOARD",quantity:"1",serialNo:"QM378H-715881",model:"KB1421",location:"PITC",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:676,category:"GENERAL EQUIPMENT",description:"KEYBOARD",quantity:"1",serialNo:"CN-08VXM3-M6D00",model:"KB216D1",location:"PITC",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:677,category:"GENERAL EQUIPMENT",description:"MOUSE",quantity:"1",serialNo:"NONE",model:"",location:"PITC",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:678,category:"GENERAL EQUIPMENT",description:"UPS",quantity:"1",serialNo:"9B2314A00416",model:"BV1000MSX",location:"PITC",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:679,category:"GENERAL EQUIPMENT",description:"CPU",quantity:"1",serialNo:"OUTPLEX-3080",model:"DEL",location:"PITC",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:680,category:"GENERAL EQUIPMENT",description:"TABLES",quantity:"2",serialNo:"NONE",model:"",location:"PITC",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:681,category:"GENERAL EQUIPMENT",description:"STEEL CABINET",quantity:"1",serialNo:"NONE",model:"",location:"PITC",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:682,category:"GENERAL EQUIPMENT",description:"STAMP",quantity:"1",serialNo:"NONE",model:"",location:"PITC",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:683,category:"GENERAL EQUIPMENT",description:"COMPUTER TABLETS",quantity:"1",serialNo:"3521280611 51919",model:"",location:"PITC",dateAcquired:"19TH NOV 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:684,category:"GENERAL EQUIPMENT",description:"CHAIRS",quantity:"1",serialNo:"NONE",model:"",location:"PITC",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:685,category:"GENERAL EQUIPMENT",description:"PEDDLE BINS",quantity:"2",serialNo:"NONE",model:"",location:"PITC",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:686,category:"GENERAL EQUIPMENT",description:"MONITOR",quantity:"1",serialNo:"CNC1211S8Q",model:"HP-V221VB",location:"OPD CO",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:687,category:"GENERAL EQUIPMENT",description:"MONITOR",quantity:"1",serialNo:"NONE",model:"",location:"OPD CO",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:688,category:"GENERAL EQUIPMENT",description:"CPU",quantity:"1",serialNo:"IFZ04UT",model:"HP",location:"OPD CO",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:689,category:"GENERAL EQUIPMENT",description:"CPU",quantity:"1",serialNo:"NONE",model:"",location:"OPD CO",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:690,category:"GENERAL EQUIPMENT",description:"UPS",quantity:"2",serialNo:"2419055 25400",model:"UPS-650",location:"OPD CO",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:691,category:"GENERAL EQUIPMENT",description:"KEYBOARD",quantity:"2",serialNo:"PR1101U",model:"",location:"OPD CO",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:692,category:"GENERAL EQUIPMENT",description:"MOUSE",quantity:"2",serialNo:"NONE",model:"",location:"OPD CO",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:693,category:"GENERAL EQUIPMENT",description:"TABLES",quantity:"3",serialNo:"NONE",model:"",location:"OPD CO",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:694,category:"GENERAL EQUIPMENT",description:"COMPUTER TABLETS",quantity:"1",serialNo:"3521280611 49590",model:"",location:"OPD/CONSULTATION",dateAcquired:"19TH NOV 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:695,category:"GENERAL EQUIPMENT",description:"TAIFACARE TABLETS + POWER BANK",quantity:"1",serialNo:"359199780 529027",model:"",location:"OPD/CONSULTATION",dateAcquired:"12TH NOV 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:696,category:"GENERAL EQUIPMENT",description:"TAIFACARE TABLETS + POWER BANK",quantity:"1",serialNo:"359199780 661366",model:"",location:"OPD/CONSULTATION",dateAcquired:"12TH NOV 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:697,category:"GENERAL EQUIPMENT",description:"CHAIRS",quantity:"5",serialNo:"NONE",model:"",location:"OPD CO",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:698,category:"GENERAL EQUIPMENT",description:"CHAIRS",quantity:"1",serialNo:"NONE",model:"",location:"PLASTER ROOM",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:699,category:"GENERAL EQUIPMENT",description:"CABINET",quantity:"2",serialNo:"NONE",model:"",location:"PLASTER ROOM",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:700,category:"GENERAL EQUIPMENT",description:"TABLES",quantity:"1",serialNo:"NONE",model:"",location:"PLASTER ROOM",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:701,category:"GENERAL EQUIPMENT",description:"STOOL",quantity:"1",serialNo:"NONE",model:"",location:"PLASTER ROOM",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:702,category:"GENERAL EQUIPMENT",description:"TAIFACARE TABLET + POWER BANK",quantity:"1",serialNo:"359199780 501786",model:"",location:"PLASTER ROOM",dateAcquired:"12TH NOV 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:703,category:"GENERAL EQUIPMENT",description:"SOCKET",quantity:"1",serialNo:"NONE",model:"",location:"PLASTER ROOM",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:704,category:"GENERAL EQUIPMENT",description:"WASHING MACHINE",quantity:"1",serialNo:"810228063",model:"",location:"LAUNDRY",dateAcquired:"16TH DEC 2021",status:"NOT-FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:705,category:"GENERAL EQUIPMENT",description:"DRIER",quantity:"1",serialNo:"81022 96605",model:"",location:"LAUNDRY",dateAcquired:"16TH DEC 2021",status:"NOT-FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:706,category:"GENERAL EQUIPMENT",description:"DRIER",quantity:"1",serialNo:"NONE",model:"",location:"LAUNDRY",dateAcquired:"-",status:"NOT-FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:707,category:"GENERAL EQUIPMENT",description:"CLOTHES CABINET",quantity:"2",serialNo:"NONE",model:"",location:"LAUNDRY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:708,category:"GENERAL EQUIPMENT",description:"TABLE",quantity:"1",serialNo:"NONE",model:"",location:"LAUNDRY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:709,category:"GENERAL EQUIPMENT",description:"CHAIRS",quantity:"3",serialNo:"NONE",model:"",location:"LAUNDRY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:710,category:"GENERAL EQUIPMENT",description:"TROLLEY",quantity:"1",serialNo:"NONE",model:"",location:"LAUNDRY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:711,category:"GENERAL EQUIPMENT",description:"LASERJET 1320 PRINTER",quantity:"1",serialNo:"CNMJB12714",model:"",location:"ADMINISTRATORS OFFICE",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:712,category:"GENERAL EQUIPMENT",description:"UPS",quantity:"1",serialNo:"NONE",model:"",location:"ADMINISTRATORS OFFICE",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:713,category:"GENERAL EQUIPMENT",description:"CCTV SCREEN+REMOTE",quantity:"1",serialNo:"NONE",model:"VITRON",location:"ADMINISTRATORS OFFICE",dateAcquired:"2023",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:714,category:"GENERAL EQUIPMENT",description:"CHAIR",quantity:"3",serialNo:"NONE",model:"",location:"ADMINISTRATORS OFFICE",dateAcquired:"2023",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:715,category:"GENERAL EQUIPMENT",description:"TABLE",quantity:"1",serialNo:"NONE",model:"",location:"ADMINISTRATORS OFFICE",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:716,category:"GENERAL EQUIPMENT",description:"LANDLINE",quantity:"1",serialNo:"NONE",model:"",location:"ADMINISTRATORS OFFICE",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:717,category:"GENERAL EQUIPMENT",description:"LOCKABLE METALLIC CABINET",quantity:"1",serialNo:"NONE",model:"",location:"ADMINISTRATORS OFFICE",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:718,category:"GENERAL EQUIPMENT",description:"STAPLER",quantity:"1",serialNo:"NONE",model:"",location:"ADMINISTRATORS OFFICE",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:719,category:"GENERAL EQUIPMENT",description:"PAPER PUNCH",quantity:"1",serialNo:"NONE",model:"",location:"ADMINISTRATORS OFFICE",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:720,category:"GENERAL EQUIPMENT",description:"BOOKSHELF",quantity:"1",serialNo:"NONE",model:"",location:"ADMINISTRATORS OFFICE",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:721,category:"GENERAL EQUIPMENT",description:"KEY BOX SHELF-LOCKABLE",quantity:"1",serialNo:"NONE",model:"",location:"ADMINISTRATORS OFFICE",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:722,category:"GENERAL EQUIPMENT",description:"SERVER",quantity:"1",serialNo:"NONE",model:"",location:"ADMINISTRATORS OFFICE",dateAcquired:"2023",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:723,category:"GENERAL EQUIPMENT",description:"SERVER CABINET",quantity:"1",serialNo:"NONE",model:"",location:"ADMINISTRATORS OFFICE",dateAcquired:"2023",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:724,category:"GENERAL EQUIPMENT",description:"LOCKABLE METALLIC CABINET",quantity:"1",serialNo:"NONE",model:"",location:"NURSING OFFICE",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:725,category:"GENERAL EQUIPMENT",description:"CHAIR",quantity:"1",serialNo:"NONE",model:"",location:"NURSING OFFICE",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:726,category:"GENERAL EQUIPMENT",description:"PAPER PUNCH",quantity:"1",serialNo:"NONE",model:"",location:"NURSING OFFICE",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:727,category:"GENERAL EQUIPMENT",description:"STAPLER",quantity:"1",serialNo:"NONE",model:"",location:"NURSING OFFICE",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:728,category:"GENERAL EQUIPMENT",description:"TABLE",quantity:"1",serialNo:"NONE",model:"",location:"NURSING OFFICE",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:729,category:"GENERAL EQUIPMENT",description:"WOODEN CABINETS",quantity:"2",serialNo:"NONE",model:"",location:"NURSING OFFICE",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:730,category:"GENERAL EQUIPMENT",description:"HP LAPTOP",quantity:"1",serialNo:"5CG2113ZSV",model:"",location:"ADMINISTRATORS OFFICE",dateAcquired:"26TH FEB 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:731,category:"GENERAL EQUIPMENT",description:"ESPON XP-410 PRINTER",quantity:"1",serialNo:"S52P083945",model:"C462K",location:"MEDICAL SUPERINTENDENT OFFICE",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:732,category:"GENERAL EQUIPMENT",description:"CCTV SCREEN+REMOTE",quantity:"1",serialNo:"NONE",model:"VITRON",location:"MEDICAL SUPERINTENDENT OFFICE",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:733,category:"GENERAL EQUIPMENT",description:"TABLE",quantity:"1",serialNo:"NONE",model:"",location:"MEDICAL SUPERINTENDENT OFFICE",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:734,category:"GENERAL EQUIPMENT",description:"CHAIRS",quantity:"3",serialNo:"NONE",model:"",location:"MEDICAL SUPERINTENDENT OFFICE",dateAcquired:"15TH DEC 2021",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:735,category:"GENERAL EQUIPMENT",description:"BOOKSHELF",quantity:"1",serialNo:"NONE",model:"",location:"MEDICAL SUPERINTENDENT OFFICE",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:736,category:"GENERAL EQUIPMENT",description:"MOUSE",quantity:"1",serialNo:"NONE",model:"",location:"MEDICAL SUPERINTENDENT OFFICE",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:737,category:"GENERAL EQUIPMENT",description:"TABLES",quantity:"4",serialNo:"NONE",model:"",location:"CASUALTY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:738,category:"GENERAL EQUIPMENT",description:"BEDS",quantity:"2",serialNo:"NONE",model:"",location:"CASUALTY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:739,category:"GENERAL EQUIPMENT",description:"WATER DISPENSER",quantity:"1",serialNo:"",model:"",location:"CASUALTY",dateAcquired:"25TH NOV 2024",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:740,category:"GENERAL EQUIPMENT",description:"LANDLINE",quantity:"1",serialNo:"NONE",model:"",location:"CASUALTY",dateAcquired:"-",status:"NON-FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:741,category:"GENERAL EQUIPMENT",description:"MONITOR",quantity:"1",serialNo:"NONE",model:"HP",location:"CASUALTY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:742,category:"GENERAL EQUIPMENT",description:"MONITOR",quantity:"1",serialNo:"3CQ2350B8P",model:"HPT19B",location:"CASUALTY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:743,category:"GENERAL EQUIPMENT",description:"MOUSE",quantity:"1",serialNo:"NONE",model:"",location:"CASUALTY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:744,category:"GENERAL EQUIPMENT",description:"KEYBOARD",quantity:"1",serialNo:"NONE",model:"",location:"CASUALTY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:745,category:"GENERAL EQUIPMENT",description:"KEYBOARD",quantity:"1",serialNo:"NONE",model:"KUY1468",location:"CASUALTY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:746,category:"GENERAL EQUIPMENT",description:"CPU",quantity:"1",serialNo:"6CF44AV",model:"HP-PRODEX400GGMT",location:"CASUALTY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:747,category:"GENERAL EQUIPMENT",description:"CPU",quantity:"1",serialNo:"4CE020384D",model:"HPPRODEX",location:"CASUALTY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:748,category:"GENERAL EQUIPMENT",description:"UPS",quantity:"2",serialNo:"35700",model:"",location:"CASUALTY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:749,category:"GENERAL EQUIPMENT",description:"WALL CLOCK",quantity:"1",serialNo:"NONE",model:"",location:"CASUALTY",dateAcquired:"-",status:"NON-FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:750,category:"GENERAL EQUIPMENT",description:"BED SIDE LOCKERS",quantity:"1",serialNo:"NONE",model:"",location:"CASUALTY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:751,category:"GENERAL EQUIPMENT",description:"CHAIRS",quantity:"5",serialNo:"NONE",model:"",location:"CASUALTY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:752,category:"GENERAL EQUIPMENT",description:"PEDDLE BINS",quantity:"8",serialNo:"NONE",model:"",location:"CASUALTY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:753,category:"GENERAL EQUIPMENT",description:"CABINET",quantity:"2",serialNo:"NONE",model:"",location:"CASUALTY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:754,category:"GENERAL EQUIPMENT",description:"STOOL",quantity:"4",serialNo:"NONE",model:"",location:"CASUALTY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:755,category:"GENERAL EQUIPMENT",description:"KEROSINE LAMP",quantity:"1",serialNo:"NONE",model:"",location:"CASUALTY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:756,category:"GENERAL EQUIPMENT",description:"WOODEN CABINET",quantity:"2",serialNo:"NONE",model:"",location:"CASUALTY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:757,category:"GENERAL EQUIPMENT",description:"DRESSING TROLLEY",quantity:"1",serialNo:"NONE",model:"",location:"CASUALTY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:758,category:"GENERAL EQUIPMENT",description:"TAIFACARE TABLET + POWER BANK",quantity:"1",serialNo:"359199780 825417",model:"",location:"CASUALTY",dateAcquired:"12TH NOV 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:759,category:"GENERAL EQUIPMENT",description:"TAIFACARE TABLET + POWER BANK",quantity:"1",serialNo:"359199780 725989",model:"",location:"CASUALTY",dateAcquired:"12TH NOV 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:760,category:"GENERAL EQUIPMENT",description:"TAIFACARE TABLET + POWER BANK",quantity:"1",serialNo:"359199780 726516",model:"",location:"CASUALTY",dateAcquired:"12TH NOV 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:761,category:"GENERAL EQUIPMENT",description:"TABLE",quantity:"1",serialNo:"NONE",model:"",location:"REGISTRY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:762,category:"GENERAL EQUIPMENT",description:"WOODEN CABINET",quantity:"1",serialNo:"NONE",model:"",location:"REGISTRY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:763,category:"GENERAL EQUIPMENT",description:"METALLIC CABINET",quantity:"2",serialNo:"NONE",model:"",location:"REGISTRY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:764,category:"GENERAL EQUIPMENT",description:"PAPER PUNCH",quantity:"1",serialNo:"NONE",model:"",location:"REGISTRY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:765,category:"GENERAL EQUIPMENT",description:"STAPLER",quantity:"1",serialNo:"NONE",model:"",location:"REGISTRY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:766,category:"GENERAL EQUIPMENT",description:"SAFE BOX",quantity:"1",serialNo:"NONE",model:"",location:"REGISTRY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:767,category:"GENERAL EQUIPMENT",description:"CHAIR",quantity:"1",serialNo:"NONE",model:"",location:"REGISTRY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:768,category:"GENERAL EQUIPMENT",description:"BUILT-IN SHELF",quantity:"1",serialNo:"NONE",model:"",location:"REGISTRY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:769,category:"GENERAL EQUIPMENT",description:"MONITOR",quantity:"1",serialNo:"3CQ8511HIG",model:"HPV197",location:"REGISTRY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:770,category:"GENERAL EQUIPMENT",description:"KEYBOARD",quantity:"1",serialNo:"NONE",model:"PR11010",location:"REGISTRY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:771,category:"GENERAL EQUIPMENT",description:"MOUSE",quantity:"1",serialNo:"NONE",model:"",location:"REGISTRY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:772,category:"GENERAL EQUIPMENT",description:"CALCULATOR",quantity:"1",serialNo:"NONE",model:"",location:"REGISTRY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:773,category:"GENERAL EQUIPMENT",description:"LANDLINE",quantity:"1",serialNo:"NONE",model:"",location:"REGISTRY",dateAcquired:"-",status:"NON-FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:774,category:"GENERAL EQUIPMENT",description:"CPU",quantity:"1",serialNo:"NONE",model:"",location:"REGISTRY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:775,category:"GENERAL EQUIPMENT",description:"BLENDER",quantity:"1",serialNo:"SG-BLO7PP-968564",model:"",location:"KITCHEN",dateAcquired:"6TH FEB 2023",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:776,category:"GENERAL EQUIPMENT",description:"FRIDGE",quantity:"1",serialNo:"GR-M342VML",model:"",location:"KITCHEN",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:777,category:"GENERAL EQUIPMENT",description:"COLD ROOM COMPRESSION UNIT",quantity:"1",serialNo:"NONE",model:"",location:"KITCHEN",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:778,category:"GENERAL EQUIPMENT",description:"FOOD TROLLEY",quantity:"1",serialNo:"NONE",model:"",location:"KITCHEN",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:779,category:"GENERAL EQUIPMENT",description:"FOOD TROLLEY",quantity:"1",serialNo:"N/A",model:"",location:"KITCHEN",dateAcquired:"3RD MARCH 2021",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:780,category:"GENERAL EQUIPMENT",description:"FOOD TROLLEY",quantity:"1",serialNo:"N/A",model:"",location:"KITCHEN",dateAcquired:"21ST OCT 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:781,category:"GENERAL EQUIPMENT",description:"HEAVY DUTY WEIGHING SCALE",quantity:"1",serialNo:"",model:"",location:"KITCHEN STORE",dateAcquired:"",status:"NOT-FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:782,category:"GENERAL EQUIPMENT",description:"DIGITAL WEIGHNIG SCALE",quantity:"1",serialNo:"",model:"",location:"KITCEN STORE",dateAcquired:"20TH JUNE 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:783,category:"GENERAL EQUIPMENT",description:"SAMNSUNG TV 55 INCH (BOARD ROOM)",quantity:"1",serialNo:"NONE",model:"",location:"HMU",dateAcquired:"2023",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:784,category:"GENERAL EQUIPMENT",description:"43 INCH TV           (LABOLATORY)",quantity:"1",serialNo:"NONE",model:"",location:"HMU",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:785,category:"GENERAL EQUIPMENT",description:"TELEVISION TV             (OPD)",quantity:"1",serialNo:"NONE",model:"",location:"HMU",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:786,category:"GENERAL EQUIPMENT",description:"(FEMALE/MALE DPT)",quantity:"1",serialNo:"NONE",model:"",location:"HMU",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:787,category:"GENERAL EQUIPMENT",description:"FIRE EXTINGUISHERS (POWDER)",quantity:"3",serialNo:"NONE",model:"",location:"HOSP MAITENENCE",dateAcquired:"8TH JUNE 2023",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:788,category:"GENERAL EQUIPMENT",description:"FIRE EXTINGUISHER                                  (WATER)",quantity:"8",serialNo:"NONE",model:"",location:"HOSP MAITENENCE",dateAcquired:"8TH JUNE 2023",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:789,category:"GENERAL EQUIPMENT",description:"CCTV",quantity:"1",serialNo:"8K0L57FPAGBAF211-A-S5",model:"DH-IPC-HFW1430S1-A-F5",location:"KITCHEN",dateAcquired:"2023",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:790,category:"GENERAL EQUIPMENT",description:"CCTV",quantity:"1",serialNo:"8K0L57FPAGADE321-A-S5",model:"DH-IPC-HFW1430S1-A-F5",location:"CLOTHLINE  AREA/MAINTENANCE",dateAcquired:"2023",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:791,category:"GENERAL EQUIPMENT",description:"CCTV",quantity:"1",serialNo:"8K0C57FPAG2E5351-A-S5",model:"DH-IPC-HFW1430S1-A-F5",location:"LAUNDRY",dateAcquired:"2023",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:792,category:"GENERAL EQUIPMENT",description:"CCTV",quantity:"1",serialNo:"8K0C57FPAG2E5351-A-S5",model:"DH-IPC-HFW1430S1-A-F5",location:"MAINGATE",dateAcquired:"2023",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:793,category:"GENERAL EQUIPMENT",description:"CCTV",quantity:"1",serialNo:"8K0L57FPAGADE321-A-S5",model:"DH-IPC-HFW1430S1-A-F5",location:"DRUG STORE GATE",dateAcquired:"2023",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:794,category:"GENERAL EQUIPMENT",description:"CCTV",quantity:"1",serialNo:"8K0C57FPAGGBOC951-1-S5",model:"DH-IPC-HFW1430S1-A-F5",location:"MATERNITY ENTRANCE",dateAcquired:"2023",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:795,category:"GENERAL EQUIPMENT",description:"CTV",quantity:"1",serialNo:"8F005BOPAGA82E94",model:"DH-IPC-HFW1430S1-A-F5",location:"OUTSIDE RADIOLOGY",dateAcquired:"2023",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:796,category:"GENERAL EQUIPMENT",description:"CCTV",quantity:"1",serialNo:"8f005b0pag584ff4",model:"DH-IPC-HFW1430S1-A-F5",location:"WARDS ENTRANCE",dateAcquired:"2023",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:797,category:"GENERAL EQUIPMENT",description:"CCTV",quantity:"1",serialNo:"8KOC57PAGL522221-A-S5",model:"DH-IPC-HFW1430S1-A-F5",location:"THEATRE DISPATCH",dateAcquired:"2023",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:798,category:"GENERAL EQUIPMENT",description:"CCTV",quantity:"1",serialNo:"8K0C57FPAG061DAI-1-S5",model:"DH-IPC-HFW1430S1-A-F5",location:"AMBULANCE PARKING",dateAcquired:"2023",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:799,category:"GENERAL EQUIPMENT",description:"CCTV",quantity:"1",serialNo:"8F005B0PAG7C7C54",model:"DH-IPC-HFW1430S1-A-F5",location:"KITCHEN OFFICES",dateAcquired:"2023",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:800,category:"GENERAL EQUIPMENT",description:"CCTV",quantity:"1",serialNo:"8F005B0PAG5C2E94",model:"DH-IPC-HFW1430S1-A-F5",location:"MALE WARD EXIT",dateAcquired:"2023",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:801,category:"GENERAL EQUIPMENT",description:"CCTV",quantity:"1",serialNo:"8F005B0PAG2AB714",model:"DH-IPC-HFW1430S1-A-F5",location:"THEATRE ENTRANCE",dateAcquired:"2023",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:802,category:"GENERAL EQUIPMENT",description:"CCTV",quantity:"1",serialNo:"8K0C57FPAGF75EI-A-S5",model:"DH-IPC-HFW1430S1-A-F5",location:"KITCHEN ENTRANCE",dateAcquired:"2023",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:803,category:"GENERAL EQUIPMENT",description:"CCTV",quantity:"1",serialNo:"8K005B0PAG0F8AF4",model:"DH-IPC-HFW1430S1-A-F5",location:"RADIOLOGY WAITING AREA",dateAcquired:"2023",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:804,category:"GENERAL EQUIPMENT",description:"CCTV",quantity:"1",serialNo:"8K0C57FPAG761AE1-A-S5",model:"DH-IPC-HFW1430S1-A-F5",location:"EMERGENCY AREA",dateAcquired:"2023",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:805,category:"GENERAL EQUIPMENT",description:"CCTV",quantity:"1",serialNo:"8K0C57FPAG364",model:"DH-IPC-HFW1430S1-A-F5",location:"INSIDE DRUG STORE/PROCUREMENT",dateAcquired:"2023",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:806,category:"GENERAL EQUIPMENT",description:"CCTV",quantity:"1",serialNo:"8K0C57FPAG3A47B1-A-S5",model:"DH-IPC-HFW1430S1-A-F5",location:"MORTUARY ENTRANCE",dateAcquired:"2023",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:807,category:"GENERAL EQUIPMENT",description:"CCTV",quantity:"1",serialNo:"8K0C57PFA2B0701A-S5",model:"DH-IPC-HFW1430S1-A-F5",location:"MORTUARY RECEPTION",dateAcquired:"2023",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:808,category:"GENERAL EQUIPMENT",description:"CCTV",quantity:"1",serialNo:"8K0C57FPAGF90E21-1-S5",model:"DH-IPC-HFW1430S1-A-F5",location:"MAIN PARKING",dateAcquired:"2023",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:809,category:"GENERAL EQUIPMENT",description:"CCTV",quantity:"1",serialNo:"8F005B0PAGA6B344",model:"DH-IPC-HFW1430S1-A-F5",location:"INSIDE INJECTION ROOM",dateAcquired:"2023",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:810,category:"GENERAL EQUIPMENT",description:"CCTV",quantity:"1",serialNo:"8KOC57PAGL522221-A-S5",model:"DH-IPC-HFW1430S1-A-F5",location:"DRUG STORE ENTRANCE",dateAcquired:"2023",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:811,category:"GENERAL EQUIPMENT",description:"CCTV",quantity:"1",serialNo:"8K0C57FPAGFA0F61-A-S5",model:"DH-IPC-HFW1430S1-A-F5",location:"IPC",dateAcquired:"2023",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:812,category:"GENERAL EQUIPMENT",description:"CCTV",quantity:"1",serialNo:"8F005B0PAG5DDA44",model:"DH-IPC-HFW1430S1-A-F5",location:"RECORDS",dateAcquired:"2023",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:813,category:"GENERAL EQUIPMENT",description:"CCTV",quantity:"1",serialNo:"8F005B0PAGDD1E24",model:"DH-IPC-HFW1430S1-A-F5",location:"OUTPATIENT RECEPTION",dateAcquired:"2023",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:814,category:"GENERAL EQUIPMENT",description:"CCTV",quantity:"1",serialNo:"8K0C57FPAG0240D1-A-S5",model:"DH-IPC-HFW1430S1-A-F5",location:"MCH",dateAcquired:"2023",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:815,category:"GENERAL EQUIPMENT",description:"CCTV",quantity:"1",serialNo:"8F005BOPAG9E6F14",model:"DH-IPC-HFW1430S1-A-F5",location:"PHARMACY",dateAcquired:"2023",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:816,category:"GENERAL EQUIPMENT",description:"CCTV",quantity:"1",serialNo:"8K0C575PAGD36471-A-S5",model:"DH-IPC-HFW1430S1-A-F5",location:"OUTSIDE LABORATORY",dateAcquired:"2023",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:817,category:"GENERAL EQUIPMENT",description:"CCTV",quantity:"1",serialNo:"8K0C575PAGA52E71-A-S5",model:"DH-IPC-HFW1430S1-A-F5",location:"VCT AREA",dateAcquired:"2023",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:818,category:"GENERAL EQUIPMENT",description:"CCTV",quantity:"1",serialNo:"8K0C57FPAGE00451-A-S5",model:"DH-IPC-HFW1430S1-A-F5",location:"OXYGEN PLANT",dateAcquired:"2023",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:819,category:"GENERAL EQUIPMENT",description:"ALLUMINIUM LADDER",quantity:"1",serialNo:"NONE",model:"",location:"MAINTENANCE",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:820,category:"GENERAL EQUIPMENT",description:"CHAIRS",quantity:"5",serialNo:"NONE",model:"",location:"MAINTENANCE",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:821,category:"GENERAL EQUIPMENT",description:"TABLE",quantity:"1",serialNo:"NONE",model:"",location:"MAINTENANCE",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:822,category:"GENERAL EQUIPMENT",description:"LANDLINE",quantity:"1",serialNo:"NONE",model:"N/A",location:"OCC.THERAPY",dateAcquired:"-",status:"NON-FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:823,category:"GENERAL EQUIPMENT",description:"HEAT GUN",quantity:"1",serialNo:"",model:"",location:"OCC.THERAPY",dateAcquired:"8TH APRIL 2021",status:"",ownership:"FACILITY OWNED",notes:""},
{id:824,category:"GENERAL EQUIPMENT",description:"CABINET",quantity:"1",serialNo:"NONE",model:"N/A",location:"OCC.THERAPY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:825,category:"GENERAL EQUIPMENT",description:"TABLE",quantity:"",serialNo:"NONE",model:"N/A",location:"OCC.THERAPY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:826,category:"GENERAL EQUIPMENT",description:"TAIFACRE TABLET+POWERBANK",quantity:"1",serialNo:"359199780",model:"N/A",location:"OCC.THERAPY",dateAcquired:"12TH NOV 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:827,category:"GENERAL EQUIPMENT",description:"DUMB BELLS 1 KG",quantity:"1",serialNo:"N/A",model:"N/A",location:"OCC.THERAPY",dateAcquired:"15TH DEC 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:828,category:"GENERAL EQUIPMENT",description:"DUMB BELLS  2KG",quantity:"1",serialNo:"N/A",model:"N/A",location:"OCC.THERAPY",dateAcquired:"15TH DEC 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:829,category:"GENERAL EQUIPMENT",description:"DUMB BELLS 3 KG",quantity:"1",serialNo:"N/A",model:"N/A",location:"OCC.THERAPY",dateAcquired:"15TH DEC 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:830,category:"GENERAL EQUIPMENT",description:"DUMB BELLS 4 KG",quantity:"1",serialNo:"N/A",model:"N/A",location:"OCC.THERAPY",dateAcquired:"15TH DEC 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:831,category:"GENERAL EQUIPMENT",description:"PEDDLE  BINS",quantity:"1",serialNo:"NONE",model:"",location:"OCC.THERAPY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:832,category:"GENERAL EQUIPMENT",description:"CHAIRS",quantity:"2",serialNo:"NONE",model:"",location:"OCC.THERAPY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:833,category:"GENERAL EQUIPMENT",description:"LASERJET PRO MFP 4103fdw PRINTER",quantity:"1",serialNo:"CNCRRDW55H",model:"2Z629A",location:"PROCUREMENT",dateAcquired:"28TH JUNE 2024",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:834,category:"GENERAL EQUIPMENT",description:"STEEL CABINET LOCKABLE",quantity:"2",serialNo:"NONE",model:"",location:"PROCUREMENT",dateAcquired:"26TH JUNE 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:835,category:"GENERAL EQUIPMENT",description:"TABLES",quantity:"3",serialNo:"NONE",model:"",location:"PROCUREMENT",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:836,category:"GENERAL EQUIPMENT",description:"CHAIRS",quantity:"4",serialNo:"NONE",model:"",location:"PROCUREMENT",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:837,category:"GENERAL EQUIPMENT",description:"STAPLER",quantity:"2",serialNo:"NONE",model:"",location:"PROCUREMENT",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:838,category:"GENERAL EQUIPMENT",description:"PAPER PUNCH",quantity:"2",serialNo:"NONE",model:"",location:"PROCUREMENT",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:839,category:"GENERAL EQUIPMENT",description:"STAPLER HEAVY DUTY",quantity:"1",serialNo:"NONE",model:"",location:"PROCUREMENT",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:840,category:"GENERAL EQUIPMENT",description:"EXTENSION",quantity:"2",serialNo:"NONE",model:"",location:"PROCUREMENT",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:841,category:"GENERAL EQUIPMENT",description:"TAIFACARE TABLET+POWERBANK",quantity:"1",serialNo:"359199780 720634",model:"",location:"PROCUREMENT",dateAcquired:"12TH NOV 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:842,category:"GENERAL EQUIPMENT",description:"DESKTOP",quantity:"1",serialNo:"NONE",model:"",location:"PROCUREMENT",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:843,category:"GENERAL EQUIPMENT",description:"BICYCLE",quantity:"1",serialNo:"NONE",model:"",location:"PHYSIO",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:844,category:"GENERAL EQUIPMENT",description:"FREEZER",quantity:"1",serialNo:"NONE",model:"",location:"PHYSIO",dateAcquired:"-",status:"NON FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:845,category:"GENERAL EQUIPMENT",description:"PEDDLE BIN",quantity:"2",serialNo:"NONE",model:"",location:"PHYSIO",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:846,category:"GENERAL EQUIPMENT",description:"TABLE",quantity:"2",serialNo:"NONE",model:"",location:"PHYSIO",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:847,category:"GENERAL EQUIPMENT",description:"CHAIRS",quantity:"2",serialNo:"NONE",model:"",location:"PHYSIO",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:848,category:"GENERAL EQUIPMENT",description:"TAIFACARE TABLET + POWER BANK",quantity:"1",serialNo:"359199780 845589",model:"",location:"PHYSIOTHERAPY",dateAcquired:"12TH NOV 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:849,category:"GENERAL EQUIPMENT",description:"MIRROR",quantity:"1",serialNo:"NONE",model:"",location:"PHYSIO",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:850,category:"GENERAL EQUIPMENT",description:"EXAMINATION COUCH",quantity:"2",serialNo:"NONE",model:"",location:"PHYSIO",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:851,category:"GENERAL EQUIPMENT",description:"CABINET",quantity:"2",serialNo:"NONE",model:"",location:"PHYSIO",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:852,category:"GENERAL EQUIPMENT",description:"MINI DENTAL CHAIR",quantity:"1",serialNo:"NONE",model:"",location:"DENTAL",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:853,category:"GENERAL EQUIPMENT",description:"OFFICE CHAIRS",quantity:"2",serialNo:"NONE",model:"",location:"DENTAL",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:854,category:"GENERAL EQUIPMENT",description:"TABLE",quantity:"1",serialNo:"NONE",model:"",location:"DENTAL",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:855,category:"GENERAL EQUIPMENT",description:"CABINET",quantity:"1",serialNo:"NONE",model:"",location:"DENTAL",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:856,category:"GENERAL EQUIPMENT",description:"COUCH",quantity:"1",serialNo:"NONE",model:"",location:"DENTAL",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:857,category:"GENERAL EQUIPMENT",description:"PEDAL PINS",quantity:"3",serialNo:"NONE",model:"",location:"DENTAL",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:858,category:"GENERAL EQUIPMENT",description:"TAIFACARE TABLETS + POWER BANK",quantity:"1",serialNo:"359199780 777824",model:"",location:"DENTAL",dateAcquired:"12TH NOV 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:859,category:"GENERAL EQUIPMENT",description:"CABINET",quantity:"1",serialNo:"NONE",model:"",location:"DENTAL",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:860,category:"GENERAL EQUIPMENT",description:"BED COUCH",quantity:"1",serialNo:"NONE",model:"",location:"X-RAY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:861,category:"GENERAL EQUIPMENT",description:"OFFICE CHAIRS",quantity:"7",serialNo:"NONE",model:"",location:"X-RAY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:862,category:"GENERAL EQUIPMENT",description:"BOOK SHELVES",quantity:"2",serialNo:"NONE",model:"",location:"X-RAY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:863,category:"GENERAL EQUIPMENT",description:"METALLIC BENCH",quantity:"1",serialNo:"NONE",model:"",location:"X-RAY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:864,category:"GENERAL EQUIPMENT",description:"WOODEN BENCH",quantity:"2",serialNo:"NONE",model:"",location:"X-RAY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:865,category:"GENERAL EQUIPMENT",description:"OFFICE TABLE",quantity:"2",serialNo:"NONE",model:"",location:"X-RAY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:866,category:"GENERAL EQUIPMENT",description:"WOODEN CABINET",quantity:"1",serialNo:"NONE",model:"",location:"X-RAY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:867,category:"GENERAL EQUIPMENT",description:"KICK STOOL",quantity:"1",serialNo:"NONE",model:"",location:"X-RAY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:868,category:"GENERAL EQUIPMENT",description:"TAIFA CARE TABLET + POWER BANK",quantity:"1",serialNo:"359199780 815392",model:"",location:"X-RAY",dateAcquired:"12TH NOV 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:869,category:"GENERAL EQUIPMENT",description:"SHELVE",quantity:"1",serialNo:"NONE",model:"",location:"X-RAY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:870,category:"GENERAL EQUIPMENT",description:"STAPLER",quantity:"1",serialNo:"NONE",model:"",location:"X-RAY",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:871,category:"GENERAL EQUIPMENT",description:"EXAMINATION COUCH",quantity:"5",serialNo:"NONE",model:"",location:"MCH",dateAcquired:"23RD JUNE 2021",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:872,category:"GENERAL EQUIPMENT",description:"CABINET",quantity:"4",serialNo:"NONE",model:"",location:"MCH",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:873,category:"GENERAL EQUIPMENT",description:"TROLLEY",quantity:"1",serialNo:"NONE",model:"",location:"MCH",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:874,category:"GENERAL EQUIPMENT",description:"CHAIRS",quantity:"6",serialNo:"NONE",model:"",location:"MCH",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:875,category:"GENERAL EQUIPMENT",description:"TAIFACARE TABLETS + POWER BANK",quantity:"1",serialNo:"359199780 602295",model:"",location:"MCH",dateAcquired:"12TH NOV 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:876,category:"GENERAL EQUIPMENT",description:"TAIFACARE TABLET + POWER BANK",quantity:"1",serialNo:"359199780 740970",model:"",location:"MCH",dateAcquired:"12TH NOV 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:877,category:"GENERAL EQUIPMENT",description:"TAIFACARE TABLETS + POWER BANK",quantity:"1",serialNo:"359199780 670250",model:"",location:"MCH",dateAcquired:"12TH NOV 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:878,category:"GENERAL EQUIPMENT",description:"TABLE",quantity:"4",serialNo:"NONE",model:"",location:"MCH",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:879,category:"GENERAL EQUIPMENT",description:"MONITOR",quantity:"2",serialNo:"CN0255NN",model:"E19204(DEELL)",location:"MCH",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:880,category:"GENERAL EQUIPMENT",description:"KEYBOARD",quantity:"1",serialNo:"10Z0085D",model:"KB/421",location:"MCH",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:881,category:"GENERAL EQUIPMENT",description:"KEYBOARD",quantity:"1",serialNo:"BGCAF0A9HBDT5L",model:"KU-1516",location:"MCH",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:882,category:"GENERAL EQUIPMENT",description:"PEDDLE BINS",quantity:"7",serialNo:"NONE",model:"",location:"MCH",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:883,category:"GENERAL EQUIPMENT",description:"CPU",quantity:"1",serialNo:"NONE",model:"D29M",location:"MCH",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:884,category:"GENERAL EQUIPMENT",description:"FRIDGE",quantity:"1",serialNo:"TCW40R",model:"",location:"MCH",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:885,category:"GENERAL EQUIPMENT",description:"ROOM HEATER",quantity:"1",serialNo:"NONE",model:"",location:"MCH",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:886,category:"GENERAL EQUIPMENT",description:"BENCH",quantity:"4",serialNo:"NONE",model:"",location:"MCH",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:887,category:"GENERAL EQUIPMENT",description:"GENERATOR",quantity:"1",serialNo:"NONE",model:"",location:"POWER HOUSE",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:888,category:"GENERAL EQUIPMENT",description:"AMBULANCE 253A",quantity:"1",serialNo:"NONE",model:"",location:"TRANSPORT",dateAcquired:"2024",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:889,category:"GENERAL EQUIPMENT",description:"LAND CRUISER GK888",quantity:"1",serialNo:"",model:"",location:"TRANSPORT",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:890,category:"GENERAL EQUIPMENT",description:"DOUBLE CABIN GK248G",quantity:"1",serialNo:"NONE",model:"",location:"TRANSPORT",dateAcquired:"-",status:"NOT FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:891,category:"GENERAL EQUIPMENT",description:"MOTOR CYCLE GKB 266C",quantity:"1",serialNo:"NONE",model:"",location:"TRANSPORT",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:892,category:"GENERAL EQUIPMENT",description:"UPS BACKUP",quantity:"1",serialNo:"9B2319A04988",model:"BV6501-MSX",location:"ICT OFFICE",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:893,category:"GENERAL EQUIPMENT",description:"UPS BACKUP",quantity:"1",serialNo:"S-RMU1200",model:"2404012647",location:"ICT OFFICE",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:894,category:"GENERAL EQUIPMENT",description:"NETWORK CABINET",quantity:"1",serialNo:"NONE",model:"",location:"ICT OFFICE",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:895,category:"GENERAL EQUIPMENT",description:"NETWORK SWITCH MICRITIK",quantity:"1",serialNo:"CSS32624G-2S+RM",model:"",location:"ICT OFFICE",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:896,category:"GENERAL EQUIPMENT",description:"NETWORK SWITCH",quantity:"2",serialNo:"NONE",model:"HUAWEI",location:"ICT OFFICE",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:897,category:"GENERAL EQUIPMENT",description:"POE ADAPTER 24V MICROTIK ROUTER1",quantity:"1",serialNo:"HF009A70MQS",model:"ROUTER BOAED 95IUI",location:"ICT OFFICE",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:898,category:"GENERAL EQUIPMENT",description:"TABLE",quantity:"1",serialNo:"N/A",model:"",location:"ICT OFFICE",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:899,category:"GENERAL EQUIPMENT",description:"CHAIRS",quantity:"1",serialNo:"NONE",model:"",location:"ICT OFFICE",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:900,category:"GENERAL EQUIPMENT",description:"DESKTOP",quantity:"1",serialNo:"CNP413V0P6",model:"HP-P0T0K",location:"ICT OFFICE",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:901,category:"GENERAL EQUIPMENT",description:"TRANSCEND PORTABLE HARD DRIVE 1 TB",quantity:"1",serialNo:"J41045-1469",model:"TSATSJ25M3S",location:"ICT OFFICE",dateAcquired:"18TH SEPT 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:902,category:"GENERAL EQUIPMENT",description:"UPS",quantity:"1",serialNo:"9B2319A04989",model:"BV6501-M&X",location:"BILLING OFFICE",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:903,category:"GENERAL EQUIPMENT",description:"CPU",quantity:"1",serialNo:"4CE8060TWZ",model:"1QN87EA=BHS",location:"BILLING OFFICE",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:904,category:"GENERAL EQUIPMENT",description:"MONITOR",quantity:"1",serialNo:"7510160840",model:"AL1717F",location:"BILLING OFFICE",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:905,category:"GENERAL EQUIPMENT",description:"KEYBOARD",quantity:"1",serialNo:"NONE",model:"PRIIOIU",location:"BILLING OFFICE",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:906,category:"GENERAL EQUIPMENT",description:"MOUSE",quantity:"1",serialNo:"NONE",model:"",location:"BILLING OFFICE",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:907,category:"GENERAL EQUIPMENT",description:"PRINTER-HPLASERJET M236SDW-1",quantity:"1",serialNo:"NONE",model:"",location:"BILLING OFFICE",dateAcquired:"14TH DEC 2023",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:908,category:"GENERAL EQUIPMENT",description:"STAPPLER",quantity:"1",serialNo:"NONE",model:"",location:"BILLING OFFICE",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:909,category:"GENERAL EQUIPMENT",description:"CHAIRS",quantity:"1",serialNo:"NONE",model:"",location:"BILLING OFFICE",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:910,category:"GENERAL EQUIPMENT",description:"TABLE",quantity:"1",serialNo:"NONE",model:"",location:"BILLING OFFICE",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:911,category:"GENERAL EQUIPMENT",description:"CALCULATOR",quantity:"1",serialNo:"NONE",model:"",location:"BILLING OFFICE",dateAcquired:"-",status:"NON-FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:912,category:"GENERAL EQUIPMENT",description:"TAIFACARE TABLET +POWERBANK",quantity:"1",serialNo:"359199780 806268",model:"",location:"BILLING OFFICE",dateAcquired:"12TH NOV 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:913,category:"GENERAL EQUIPMENT",description:"STOOL",quantity:"1",serialNo:"NONE",model:"",location:"BILLING OFFICE",dateAcquired:"-",status:"",ownership:"FACILITY OWNED",notes:""},
{id:914,category:"GENERAL EQUIPMENT",description:"MONITOR",quantity:"1",serialNo:"CNC229Q91Q",model:"B5MI3AA",location:"SOCIAL WORKER OFFICE",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:915,category:"GENERAL EQUIPMENT",description:"KEYBOARD",quantity:"1",serialNo:"NONE",model:"",location:"SOCIAL WORKER OFFICE",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:916,category:"GENERAL EQUIPMENT",description:"MOUSE",quantity:"1",serialNo:"NONE",model:"",location:"SOCIAL WORKER OFFICE",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:917,category:"GENERAL EQUIPMENT",description:"CPU",quantity:"1",serialNo:"NONE",model:"C70",location:"SOCIAL WORKER OFFICE",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:918,category:"GENERAL EQUIPMENT",description:"CHAIR",quantity:"1",serialNo:"NONE",model:"",location:"SOCIAL WORKER OFFICE",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:919,category:"GENERAL EQUIPMENT",description:"TABLE",quantity:"1",serialNo:"NONE",model:"",location:"SOCIAL WORKER OFFICE",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:920,category:"GENERAL EQUIPMENT",description:"PAPER PUNCH",quantity:"1",serialNo:"NONE",model:"",location:"SOCIAL WORKER OFFICE",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:921,category:"GENERAL EQUIPMENT",description:"TABLET COMPUTERS",quantity:"1",serialNo:"3521280611 49673",model:"",location:"STORE",dateAcquired:"19TH NOV 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:922,category:"GENERAL EQUIPMENT",description:"TABLET COMPUTERS",quantity:"1",serialNo:"3521280611 49632",model:"",location:"STORE",dateAcquired:"19TH NOV 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:923,category:"GENERAL EQUIPMENT",description:"TABLET COMPUTERS",quantity:"1",serialNo:"3521280611 48485",model:"",location:"STORE",dateAcquired:"19TH NOV 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:924,category:"GENERAL EQUIPMENT",description:"TABLET COMPUTERS",quantity:"1",serialNo:"3521280611 49814",model:"",location:"STORE",dateAcquired:"19TH NOV 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:925,category:"GENERAL EQUIPMENT",description:"ELECTRIC HEATER",quantity:"1",serialNo:"",model:"AFH-Q2BAR",location:"STORE",dateAcquired:"5TH FEB 2026",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:926,category:"GENERAL EQUIPMENT",description:"RIPPLE MATRESS",quantity:"2",serialNo:"",model:"",location:"STORE",dateAcquired:"5TH FEB 2026",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:927,category:"GENERAL EQUIPMENT",description:"TABLET COMPUTERS",quantity:"1",serialNo:"3521280611 54038",model:"",location:"MCH/MCI",dateAcquired:"19TH NOV 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:928,category:"GENERAL EQUIPMENT",description:"LASER JET PRINTER",quantity:"1",serialNo:"CNCRRDW5C8",model:"SHNGC-1801-02",location:"RADIOLOGY",dateAcquired:"28TH JUNE 2024",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:929,category:"GENERAL EQUIPMENT",description:"ELECTRIC KETTLE",quantity:"1",serialNo:"07076|12157",model:"",location:"F/WARD",dateAcquired:"",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:930,category:"GENERAL EQUIPMENT",description:"HP LAPTOP",quantity:"1",serialNo:"5CG2113ZC8",model:"",location:"ADMINS OFFICE",dateAcquired:"26TH FEB 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:931,category:"GENERAL EQUIPMENT",description:"HP LAPTOP",quantity:"1",serialNo:"5CG2113ZSV",model:"",location:"ACCOUNTS OFFICE",dateAcquired:"26TH FEB 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:932,category:"GENERAL EQUIPMENT",description:"SECUGEN HAMSTER PLUS BIOMETRIC SCANNER",quantity:"1",serialNo:"H39250200525",model:"",location:"BILLING",dateAcquired:"15TH AUG 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:933,category:"GENERAL EQUIPMENT",description:"SECUGEN HAMSTER PLUS BIOMETRIC SCANNER",quantity:"1",serialNo:"H392502005214",model:"",location:"CASHPOINT",dateAcquired:"15TH AUG 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:934,category:"GENERAL EQUIPMENT",description:"SECUGEN HAMSTER PLUS BIOMETRIC SCANNER",quantity:"1",serialNo:"H39250200507",model:"",location:"CASHPOINT",dateAcquired:"15TH AUG 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:935,category:"GENERAL EQUIPMENT",description:"SECUGEN HAMSTER PLUS BIOMETRIC SCANNER",quantity:"1",serialNo:"H39250200508",model:"",location:"CASHPOINT",dateAcquired:"15TH AUG 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:936,category:"GENERAL EQUIPMENT",description:"SECUGEN BIOMETRIC SCANNER HU20-AL   TYPE C",quantity:"1",serialNo:"H59250400189",model:"",location:"BILLING",dateAcquired:"2ND SEPT 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:937,category:"GENERAL EQUIPMENT",description:"TABLETS",quantity:"1",serialNo:"351228066114 9814",model:"",location:"STORES",dateAcquired:"19TH NOV 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:938,category:"GENERAL EQUIPMENT",description:"TABLET",quantity:"1",serialNo:"35122806114 8485",model:"",location:"CHEST CLINIC",dateAcquired:"19TH NOV 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:939,category:"GENERAL EQUIPMENT",description:"TABLET",quantity:"1",serialNo:"35212806114 9632",model:"",location:"STORES",dateAcquired:"19TH NOV 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:940,category:"GENERAL EQUIPMENT",description:"TABLET",quantity:"1",serialNo:"35122806114 9673",model:"",location:"STORES",dateAcquired:"19TH NOV 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:941,category:"GENERAL EQUIPMENT",description:"TABLET",quantity:"1",serialNo:"35212806115 1919",model:"",location:"PITC",dateAcquired:"19TH NOV 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:942,category:"GENERAL EQUIPMENT",description:"TABLET",quantity:"1",serialNo:"35212806114 9590",model:"",location:"OPD",dateAcquired:"19TH NOV 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:943,category:"GENERAL EQUIPMENT",description:"TABLET",quantity:"1",serialNo:"35212806115 4038",model:"",location:"MCI",dateAcquired:"19TH NOV 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:944,category:"GENERAL EQUIPMENT",description:"ELECTRIC KETTLE",quantity:"1",serialNo:"06706|13089",model:"",location:"DEPUTY MEDSUP",dateAcquired:"3RD FEB 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:945,category:"GENERAL EQUIPMENT",description:"MICROWAVE",quantity:"1",serialNo:"06928|2039",model:"RM/459",location:"DEPUTY MEDSUP",dateAcquired:"3RD FEB 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:946,category:"GENERAL EQUIPMENT",description:"STAPLER HEAVY DUTY",quantity:"1",serialNo:"NONE",model:"",location:"ACCOUNTS",dateAcquired:"-",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:947,category:"GENERAL EQUIPMENT",description:"TAIFACARE TABLETS + POWER BANK",quantity:"1",serialNo:"359199780 756414",model:"",location:"CCC",dateAcquired:"12TH NOV 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:948,category:"GENERAL EQUIPMENT",description:"TAIFACRE TABLET+POWERBANK",quantity:"1",serialNo:"359199780 682016",model:"",location:"NUTRITION",dateAcquired:"12TH NOV 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:949,category:"GENERAL EQUIPMENT",description:"TAIFACARE TABLET+POWERBANK",quantity:"1",serialNo:"359199780 694300",model:"",location:"SOCIAL WORKER OFFICE",dateAcquired:"12TH NOV 2025",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:950,category:"GENERAL EQUIPMENT",description:"METALLIC POLES STREET LIGHTS",quantity:"17",serialNo:"",model:"",location:"",dateAcquired:"",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""},
{id:951,category:"GENERAL EQUIPMENT",description:"FLOOD LIGHTS",quantity:"11",serialNo:"",model:"",location:"",dateAcquired:"",status:"FUNCTIONAL",ownership:"FACILITY OWNED",notes:""}
];

function seedAssets() {
  const existing = db.get('assets').value();
  if (!existing || existing.length === 0) {
    db.set('assets', SEED_ASSETS).write();
    // Seed categories
    db.set('assetCategories', [
      { id: 1, name: 'MEDICAL EQUIPMENT' },
      { id: 2, name: 'GENERAL EQUIPMENT' }
    ]).write();
    console.log('Assets seeded:', SEED_ASSETS.length, 'records');
  }
}


db.defaults({
  _seq: { users: 0, departments: 0, items: 0, inventory: 0, receipts: 0, issues: 0, purchases: 0, activities: 0 },
  users: [], departments: [], items: [], inventory: [],
  receipts: [], issues: [], purchases: [], activities: [], assets: [], assetCategories: []
}).write();

// DATA RECOVERY: try all known paths and print whichever has data
const pathsToTry = [
  "/app/data/store.json",
  process.env.DATA_PATH,
  path.join(__dirname, "store.json"),
  path.join(__dirname, "..", "data", "store.json"),
].filter(Boolean);



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
  editCatalog: true,
  editPurchases: true,
  editIssues: true,
  viewActivityLogs: true,
  manageUsers: true,
  manageAssets: true,
  manageDigitalForms: true
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
      editCatalog: true,
      editPurchases: true,
      editIssues: true,
      viewActivityLogs: false,
      manageUsers: false,
      manageAssets: true,
      manageDigitalForms: false
    };
  }
  return {
    viewDashboard: true,
    issueItems: true,
    manageCatalog: false,
    manageDepartments: false,
    manageInventory: false,
    editCatalog: false,
    editPurchases: false,
    editIssues: false,
    managePurchases: false,
    viewReports: false,
    exportData: false,
    deleteTransactions: false,
    viewActivityLogs: false,
    manageUsers: false,
    manageAssets: false,
  manageDigitalForms: false
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
    editCatalog: permissions.editCatalog !== undefined ? !!permissions.editCatalog : defaults.editCatalog,
    editPurchases: permissions.editPurchases !== undefined ? !!permissions.editPurchases : defaults.editPurchases,
    editIssues: permissions.editIssues !== undefined ? !!permissions.editIssues : defaults.editIssues,
    viewActivityLogs: permissions.viewActivityLogs !== undefined ? !!permissions.viewActivityLogs : defaults.viewActivityLogs,
    manageUsers: permissions.manageUsers !== undefined ? !!permissions.manageUsers : defaults.manageUsers,
    viewAssets: permissions.viewAssets !== undefined ? !!permissions.viewAssets : defaults.viewAssets,
    manageAssets: permissions.manageAssets !== undefined ? !!permissions.manageAssets : defaults.manageAssets,
    manageDigitalForms: permissions.manageDigitalForms !== undefined ? !!permissions.manageDigitalForms : defaults.manageDigitalForms
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

function seedAdmin() {
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
}

function runMigrations() {
  for (const user of db.get("users").value()) {
    const perms = user.permissions || {};
    const updates = {};
    if (perms.editCatalog === undefined) updates["permissions.editCatalog"] = user.role === "admin" || user.role === "manager";
    if (perms.editPurchases === undefined) updates["permissions.editPurchases"] = user.role === "admin" || user.role === "manager";
    if (perms.editIssues === undefined) updates["permissions.editIssues"] = user.role === "admin" || user.role === "manager";
    if (perms.manageAssets === undefined) updates["permissions.manageAssets"] = user.role === "admin" || user.role === "manager";
    if (perms.manageDigitalForms === undefined) updates["permissions.manageDigitalForms"] = user.role === "admin";
    if (Object.keys(updates).length) {
      const newPerms = {
        ...perms,
        editCatalog: perms.editCatalog !== undefined ? perms.editCatalog : (user.role === "admin" || user.role === "manager"),
        editPurchases: perms.editPurchases !== undefined ? perms.editPurchases : (user.role === "admin" || user.role === "manager"),
        editIssues: perms.editIssues !== undefined ? perms.editIssues : (user.role === "admin" || user.role === "manager"),
        manageAssets: perms.manageAssets !== undefined ? perms.manageAssets : (user.role === "admin" || user.role === "manager"),
        manageDigitalForms: perms.manageDigitalForms !== undefined ? perms.manageDigitalForms : (user.role === "admin"),
      };
      db.get("users").find({ id: user.id }).assign({ permissions: newPerms }).write();
    }
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
const allowedOrigins = (process.env.FRONTEND_URL || "http://localhost:5173").split(",").map(s=>s.trim());
app.use(cors({
  credentials: true,
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.some(o => origin.startsWith(o))) return cb(null, true);
    cb(new Error("Not allowed by CORS"));
  }
}));
app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(compression());
const isProd = process.env.NODE_ENV === "production";
app.use(session({
  secret: process.env.SESSION_SECRET || "dev-secret-store-2024",
  resave: false, saveUninitialized: false, rolling: true,
  cookie: {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    maxAge: 86400000 * 30
  }
}));

function requireAuth(req,res,next){ if(!req.session.userId) return res.status(401).json({error:"Unauthorized"}); next(); }
function requireAdmin(req,res,next){ if(!req.session.userId) return res.status(401).json({error:"Unauthorized"}); if(req.session.role!=="admin") return res.status(403).json({error:"Forbidden"}); next(); }
function requirePermission(perm){
  return (req,res,next)=>{
    if(!req.session.userId) return res.status(401).json({error:"Unauthorized"});
    // Always re-read from DB so permission changes take effect without re-login
    const user = db.get("users").find({id: req.session.userId}).value();
    if(!user) return res.status(401).json({error:"Unauthorized"});
    const perms = normalizePermissions(user.role, user.permissions);
    if(user.role==="admin" || perms[perm]) return next();
    return res.status(403).json({error:"Forbidden"});
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
// Keepalive endpoint — touches Supabase Storage to prevent free-tier auto-pause
app.get("/api/keepalive", async (req, res) => {
  try {
    if (supabase) {
      await supabase.storage.from(BUCKET).list("", { limit: 1 });
    }
    res.json({ ok: true, time: new Date().toISOString() });
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
});

app.get("/api/auth/me",(req,res)=>{
  if(!req.session.userId) return res.status(401).json({error:"Unauthorized"});
  const user=db.get("users").find({id:req.session.userId}).value();
  if(!user) return res.status(401).json({error:"Unauthorized"});
  const freshPerms = normalizePermissions(user.role, user.permissions);
  res.json({id:user.id,username:user.username,fullName:user.fullName,role:user.role,permissions:freshPerms});
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
app.patch("/api/departments/:id",requirePermission("manageDepartments"),(req,res)=>{
  const id=Number(req.params.id);
  const {name}=req.body;
  if(!name||!name.trim()) return res.status(400).json({error:"Name required"});
  const trimmed=name.trim().toUpperCase();
  const existing=db.get("departments").find({id}).value();
  if(!existing) return res.status(404).json({error:"Not found"});
  const conflict=db.get("departments").find({name:trimmed}).value();
  if(conflict && conflict.id!==id) return res.status(400).json({error:"A department with that name already exists"});
  db.get("departments").find({id}).assign({name:trimmed,slug:slugify(trimmed)}).write();
  logActivity(req,"RENAME_DEPARTMENT","DEPARTMENT",id,{from:existing.name,to:trimmed});
  res.json(db.get("departments").find({id}).value());
});

app.delete("/api/departments/:id", requirePermission("manageDepartments"), (req, res) => {
  const id = Number(req.params.id);
  const dept = db.get("departments").find({ id }).value();
  if (!dept) return res.status(404).json({ error: "Department not found" });
  const hasInventory = db.get("inventory").filter({ departmentId: id }).value().length > 0;
  const hasIssues    = db.get("issues").filter({ departmentId: id }).value().length > 0;
  const hasReceipts  = db.get("receipts").filter({ departmentId: id }).value().length > 0;
  if (hasInventory || hasIssues || hasReceipts) {
    return res.status(400).json({ error: "Cannot delete — department has existing inventory, issues, or receipts. Remove those records first." });
  }
  db.get("departments").remove({ id }).write();
  logActivity(req, "DELETE_DEPARTMENT", "DEPARTMENT", id, { name: dept.name });
  res.status(204).send();
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

app.patch("/api/issues/:id", requirePermission("editIssues"), (req, res) => {
  const id = Number(req.params.id);
  const row = db.get("issues").find({ id });
  if (!row.value()) return res.status(404).json({ error: "Issue not found" });
  const { quantity, folioNo, s11No, issuedAt, note, departmentId, itemId } = req.body;
  const updates = {};
  if (quantity !== undefined) updates.quantity = Number(quantity);
  if (folioNo !== undefined) updates.folioNo = folioNo || null;
  if (s11No !== undefined) updates.s11No = s11No || null;
  if (issuedAt !== undefined) updates.issuedAt = issuedAt;
  if (note !== undefined) updates.note = note || null;
  if (departmentId !== undefined) updates.departmentId = Number(departmentId);
  if (itemId !== undefined) updates.itemId = Number(itemId);
  row.assign(updates).write();
  logActivity(req, "UPDATE_ISSUE", "ISSUE", id, updates);
  res.json(row.value());
});

app.delete("/api/issues/:id",requirePermission("deleteTransactions"),(req,res)=>{ const id=Number(req.params.id); db.get("issues").remove({id}).write(); logActivity(req, "DELETE_ISSUE", "ISSUE", id, null); res.status(204).send(); });

// PURCHASES
app.get("/api/purchases",requirePermission("managePurchases"),(req,res)=>{
  const itemId=req.query.itemId?Number(req.query.itemId):null;
  const itemMap=getItemMap();
  // Support ?from=YYYY-MM-DD&to=YYYY-MM-DD OR ?month=YYYY-MM
  let start, end;
  if (req.query.from && req.query.to) {
    start = req.query.from;
    end = req.query.to;
  } else if (req.query.month) {
    const r = monthRange(req.query.month); start = r.start; end = r.end;
  } else {
    const r = monthRange(currentMonth()); start = r.start; end = r.end;
  }
  let rows=db.get("purchases").value();
  if(itemId) rows=rows.filter(r=>r.itemId===itemId);
  if(start) rows=rows.filter(r=>r.purchasedAt>=start&&r.purchasedAt<=end);
  rows=rows.sort((a,b)=>b.purchasedAt.localeCompare(a.purchasedAt)||b.id-a.id);
  res.json(rows.map(r=>({...r,item:itemMap.get(r.itemId)})));
});
app.post("/api/purchases",requirePermission("managePurchases"),(req,res)=>{
  const {supplier,itemId,quantity,unitPrice,purchasedAt,note,invoiceNo}=req.body;
  if(!supplier||!String(supplier).trim()) return res.status(400).json({error:"Supplier is required"});
  if(!invoiceNo||!String(invoiceNo).trim()) return res.status(400).json({error:"Invoice number is required"});
  const {batchNo,expiryDate}=req.body;
  const row={id:nextId("purchases"),supplier:String(supplier).trim().toUpperCase(),itemId,quantity,unitPrice:Number(unitPrice),invoiceNo:invoiceNo||null,purchasedAt,batchNo:batchNo||null,expiryDate:expiryDate||null,note:note||null};
  db.get("purchases").push(row).write();
  logActivity(req, "CREATE_PURCHASE", "PURCHASE", row.id, { supplier, itemId, quantity, invoiceNo: row.invoiceNo });
  res.status(201).json(row);
});

app.patch("/api/purchases/:id", requirePermission("editPurchases"), (req, res) => {
  const id = Number(req.params.id);
  const row = db.get("purchases").find({ id });
  if (!row.value()) return res.status(404).json({ error: "Purchase not found" });
  const { supplier, invoiceNo, quantity, unitPrice, purchasedAt, batchNo, expiryDate, note } = req.body;
  const updates = {};
  if (supplier !== undefined) updates.supplier = String(supplier).trim().toUpperCase();
  if (invoiceNo !== undefined) updates.invoiceNo = invoiceNo || null;
  if (quantity !== undefined) updates.quantity = Number(quantity);
  if (unitPrice !== undefined) updates.unitPrice = Number(unitPrice);
  if (purchasedAt !== undefined) updates.purchasedAt = purchasedAt;
  if (batchNo !== undefined) updates.batchNo = batchNo || null;
  if (expiryDate !== undefined) updates.expiryDate = expiryDate || null;
  if (note !== undefined) updates.note = note || null;
  row.assign(updates).write();
  logActivity(req, "UPDATE_PURCHASE", "PURCHASE", id, updates);
  res.json(row.value());
});

app.delete("/api/purchases/:id",requirePermission("deleteTransactions"),(req,res)=>{ const id=Number(req.params.id); db.get("purchases").remove({id}).write(); logActivity(req, "DELETE_PURCHASE", "PURCHASE", id, null); res.status(204).send(); });

// DASHBOARD

// ── Settings ─────────────────────────────────────────────────────────────
const DEFAULT_SETTINGS = {
  // Session & Security
  inactivityTimeoutMinutes: 1,
  warningBeforeSeconds: 10,
  sessionDurationDays: 30,
  maxLoginAttempts: 5,
  // Branding
  hospitalName: "Mukurweini Hospital Stores",
  facilityCode: "",
  countyName: "",
  subCountyName: "",
  // Stock & Alerts
  lowStockDefaultThreshold: 10,
  enableLowStockEmailAlert: false,
  alertEmailAddress: "",
  // Issue Rules
  issueDays: ["TUESDAY","FRIDAY"],
  requireFolioPerItem: true,
  requireS11PerVoucher: true,
  allowIssueOnNonScheduledDays: true,
  maxIssueQuantityPerItem: 0,
  // Purchases
  defaultCurrency: "KES",
  requireInvoiceNumber: true,
  requireSupplierName: true,
  // Reports & Exports
  reportChargeItem: "2211002",
  responsibleOfficer: "",
  storeOfficerTitle: "Store Officer",
  reportingOfficerTitle: "Reporting Officer",
  financialYear: "2025/2026",
  allowDataExports: true,
  exportIncludeZeroStock: false,
  // Appearance
  appLogo: "Building2",
  appTheme: "indigo",
  sidebarStyle: "default",
  loginEffect: "split",
  shuffleEffect: false,
  shuffleIntervalSeconds: 30,
  allowSelfRegistration: false,
  selfRegistrationNote: "New accounts require admin approval before login.",
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
  res.json({
    hospitalName:s.hospitalName,
    facilityCode:s.facilityCode,
    countyName:s.countyName,
    subCountyName:s.subCountyName,
    inactivityTimeoutMinutes:s.inactivityTimeoutMinutes,
    warningBeforeSeconds:s.warningBeforeSeconds,
    defaultCurrency:s.defaultCurrency||"KES",
    financialYear:s.financialYear,
    issueDays:s.issueDays,
    appTheme:s.appTheme||'indigo',
    appLogo:s.appLogo||'Building2',
    loginEffect:s.loginEffect||'split',
    shuffleEffect:s.shuffleEffect||false,
    shuffleIntervalSeconds:s.shuffleIntervalSeconds||30,
    allowSelfRegistration:s.allowSelfRegistration||false,
    selfRegistrationNote:s.selfRegistrationNote||'',
  });
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
  const settings=getSettings();
  const CHARGE=settings.reportChargeItem||"2211002";
  const OFFICER=settings.responsibleOfficer||"";
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
      commodity.rows.push({rowType:"opening",month,date:start,units:openingQty,unitPrice:openingPrice||null,openingTotalCost:openingPrice?openingQty*openingPrice:null,additionsUnits:null,additionsUnitCost:null,itemsIssued:null,balance:openingQty,chargeItem:CHARGE,responsibleOfficer:OFFICER,remarks:"Opening balance"});
      let runBal=openingQty;
      for(const p of monthPurchases){
        const price=Number(p.unitPrice||0);
        runBal+=Number(p.quantity||0);
        lastPrice.set(item.id,price||lastPrice.get(item.id)||0);
        commodity.rows.push({rowType:"additions",month,date:p.purchasedAt,units:null,unitPrice:price||null,openingTotalCost:null,additionsUnits:Number(p.quantity||0),additionsUnitCost:price?Number(p.quantity||0)*price:null,itemsIssued:null,balance:runBal,chargeItem:CHARGE,responsibleOfficer:OFFICER,remarks:p.note||(p.supplier?"From "+p.supplier:"Additions")});
      }
      commodity.rows.push({rowType:"closing",month,date:lastDay,units:null,unitPrice:null,openingTotalCost:null,additionsUnits:null,additionsUnitCost:null,itemsIssued:totalIssued||null,balance:closingBalance,chargeItem:CHARGE,responsibleOfficer:OFFICER,remarks:"Closing balance"});
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
      const rawName = c.itemDescription.replace(/[\/:*?\[\]\\]/g, '').trim().slice(0, 24);
      const sheetName = rawName ? rawName + " (" + c.itemId + ")" : "Item " + c.itemId;
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
        const rowNum = ws.rowCount + 1;
        // Use formulas for calculated columns
        const openingCostVal = isO && r.units != null && r.unitPrice != null
          ? { formula: "B"+rowNum+"*C"+rowNum, result: r.openingTotalCost || 0 }
          : "";
        const costOfAddVal = isA && r.additionsUnits != null && r.unitPrice != null
          ? { formula: "E"+rowNum+"*C"+rowNum, result: r.additionsUnitCost || 0 }
          : "";
        // Balance formula: opening = units, additions = prev_H + E, closing = prev_H - G
        let balanceVal;
        if(isO){ balanceVal = r.units != null ? r.units : r.balance; }
        else if(isA){ balanceVal = { formula: "H"+(rowNum-1)+"+E"+rowNum, result: r.balance }; }
        else if(isC){ balanceVal = { formula: "H"+(rowNum-1)+"-G"+rowNum, result: r.balance }; }
        else { balanceVal = r.balance; }
        const row = ws.addRow([
          r.date,
          r.units != null ? r.units : "",
          r.unitPrice != null ? r.unitPrice : "",
          openingCostVal,
          r.additionsUnits != null ? r.additionsUnits : "",
          costOfAddVal,
          r.itemsIssued != null ? r.itemsIssued : "",
          balanceVal,
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


app.get("/api/export/purchases.csv", requirePermission("exportData"), (req, res) => {
  const start = req.query.from || (currentMonth() + "-01");
  const end = req.query.to || new Date().toISOString().slice(0,10);
  const rows = db.get("purchases").filter(p => p.purchasedAt >= start && p.purchasedAt <= end)
    .orderBy("purchasedAt","asc").value();
  const lines = [["Date","Supplier","Invoice No","Item","Unit","Qty","Unit Price","Total","Batch No","Expiry Date","Note"].map(csvEscape).join(",")];
  for (const p of rows) {
    const item = db.get("items").find({id:p.itemId}).value();
    const total = Number(p.quantity) * Number(p.unitPrice);
    lines.push([p.purchasedAt, p.supplier||"", p.invoiceNo||"", item?.description||"", item?.unit||"", p.quantity, p.unitPrice, total.toFixed(2), p.batchNo||"", p.expiryDate||"", p.note||""].map(csvEscape).join(","));
  }
  res.setHeader("Content-Type","text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="purchases_${start}_to_${end}.csv"`);
  res.send(lines.join("\n"));
});

app.get("/api/export/purchases.xlsx", requirePermission("exportData"), async (req, res) => {
  try {
    const ExcelJS = require("exceljs");
    const start = req.query.from || (currentMonth() + "-01");
    const end = req.query.to || new Date().toISOString().slice(0,10);
    const rows = db.get("purchases").filter(p => p.purchasedAt >= start && p.purchasedAt <= end)
      .orderBy("purchasedAt","asc").value();
    const wb = new ExcelJS.Workbook();
    wb.creator = "Mukurweini Hospital Stores";
    const ws = wb.addWorksheet("Purchases");
    const s = getSettings();

    // Title
    ws.addRow([s.hospitalName || "Hospital Stores"]).getCell(1).font = {bold:true,size:14,color:{argb:"FF4F46E5"}};
    ws.addRow([`Purchases: ${start} to ${end}`]).getCell(1).font = {italic:true,color:{argb:"FF6B7280"}};
    ws.addRow([]);

    const headers = ["Date","Supplier","Invoice No","Item","Unit","Qty","Unit Price (KES)","Total (KES)","Batch No","Expiry Date","Note"];
    const hRow = ws.addRow(headers);
    hRow.eachCell(cell => {
      cell.font = {bold:true,color:{argb:"FFFFFFFF"}};
      cell.fill = {type:"pattern",pattern:"solid",fgColor:{argb:"FF4F46E5"}};
      cell.alignment = {horizontal:"center"};
    });

    let grandTotal = 0;
    rows.forEach((p, i) => {
      const item = db.get("items").find({id:p.itemId}).value();
      const total = Number(p.quantity) * Number(p.unitPrice);
      grandTotal += total;
      const row = ws.addRow([
        p.purchasedAt, p.supplier||"", p.invoiceNo||"",
        item?.description||"", item?.unit||"",
        p.quantity, Number(p.unitPrice), total,
        p.batchNo||"", p.expiryDate||"", p.note||""
      ]);
      row.eachCell((cell,ci) => {
        cell.fill = {type:"pattern",pattern:"solid",fgColor:{argb: i%2===0?"FFFFFFFF":"FFF5F3FF"}};
        if(ci >= 7) cell.numFmt = "#,##0.00";
        if(ci === 2) { // check expiry
          if(p.expiryDate) {
            const exp = new Date(p.expiryDate);
            const now = new Date();
            const daysLeft = Math.floor((exp.getTime()-now.getTime())/(1000*60*60*24));
            if(daysLeft < 0) cell.fill = {type:"pattern",pattern:"solid",fgColor:{argb:"FFFEE2E2"}};
            else if(daysLeft < 90) cell.fill = {type:"pattern",pattern:"solid",fgColor:{argb:"FFFEF3C7"}};
          }
        }
      });
      // expired expiry date — red
      if(p.expiryDate) {
        const exp = new Date(p.expiryDate);
        const daysLeft = Math.floor((exp.getTime()-new Date().getTime())/(1000*60*60*24));
        const expCell = row.getCell(10);
        if(daysLeft < 0) expCell.font = {bold:true,color:{argb:"FFDC2626"}};
        else if(daysLeft < 90) expCell.font = {bold:true,color:{argb:"FFD97706"}};
      }
    });

    // Grand total row
    const totalRow = ws.addRow(["","","","","","GRAND TOTAL","",grandTotal,"","",""]);
    totalRow.getCell(6).font = {bold:true};
    totalRow.getCell(8).font = {bold:true,color:{argb:"FF4F46E5"}};
    totalRow.getCell(8).numFmt = "#,##0.00";

    ws.columns = [{width:12},{width:20},{width:15},{width:35},{width:8},{width:8},{width:16},{width:16},{width:14},{width:14},{width:25}];

    const buffer = await wb.xlsx.writeBuffer();
    res.setHeader("Content-Type","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="purchases_${start}_to_${end}.xlsx"`);
    res.setHeader("Content-Length", buffer.length);
    res.end(buffer);
  } catch(err) {
    console.error("Purchases Excel error:", err);
    res.status(500).json({error:"Export failed: "+err.message});
  }
});

// ── Feature 8: Stock Valuation Report ────────────────────────────────────
app.get("/api/reports/stock-valuation", requirePermission("viewReports"), (req, res) => {
  // asAt: calculate stock as at this date (default: today)
  const asAt = req.query.asAt || new Date().toISOString().slice(0,10);
  const asAtEnd = asAt + "T23:59:59"; // include full day
  const items = db.get("items").orderBy("description","asc").value();
  const allPurchases = db.get("purchases").value();
  const allIssues = db.get("issues").value();
  const rows = [];
  let grandTotal = 0;
  const s = getSettings();
  for (const item of items) {
    // Calculate stock as at the chosen date
    const openingQty = Number(item.quantity) || 0;
    const purchasedUpTo = allPurchases.filter(p => p.itemId === item.id && p.purchasedAt <= asAt);
    const issuedUpTo = allIssues.filter(i => i.itemId === item.id && i.issuedAt <= asAt);
    const totalPurchased = purchasedUpTo.reduce((s,p) => s + Number(p.quantity||0), 0);
    const totalIssued = issuedUpTo.reduce((s,i) => s + Number(i.quantity||0), 0);
    const stockAsAt = openingQty + totalPurchased - totalIssued;
    // Get latest unit price from purchases up to asAt date
    const lastPurchase = purchasedUpTo.sort((a,b) => b.purchasedAt.localeCompare(a.purchasedAt))[0];
    const unitPrice = lastPurchase ? Number(lastPurchase.unitPrice) : 0;
    const value = stockAsAt > 0 ? stockAsAt * unitPrice : 0;
    grandTotal += value;
    const thr = item.lowStockThreshold != null ? Number(item.lowStockThreshold) : (s.lowStockDefaultThreshold||10);
    rows.push({
      itemId: item.id,
      description: item.description,
      unit: item.unit,
      currentStock: stockAsAt,
      unitPrice,
      totalValue: value,
      lastPurchaseDate: lastPurchase?.purchasedAt || null,
      lastSupplier: lastPurchase?.supplier || null,
      stockStatus: stockAsAt <= 0 ? "OUT" : stockAsAt <= thr ? "LOW" : "OK",
      threshold: thr,
    });
  }
  res.json({
    rows,
    grandTotal,
    asAt,
    generatedAt: new Date().toISOString(),
    currency: s.defaultCurrency || "KES"
  });
});

app.get("/api/export/stock-valuation.xlsx", requirePermission("exportData"), async (req, res) => {
  try {
    const ExcelJS = require("exceljs");
    const data = await new Promise((resolve) => {
      const asAt = req.query.asAt || new Date().toISOString().slice(0,10);
      const items = db.get("items").orderBy("description","asc").value();
      const allPurchases = db.get("purchases").value();
      const allIssues = db.get("issues").value();
      const s = getSettings();
      const rows = [];
      let grandTotal = 0;
      for (const item of items) {
        const openingQty = Number(item.quantity) || 0;
        const purchasedUpTo = allPurchases.filter(p => p.itemId===item.id && p.purchasedAt<=asAt);
        const issuedUpTo = allIssues.filter(i => i.itemId===item.id && i.issuedAt<=asAt);
        const stockAsAt = openingQty + purchasedUpTo.reduce((s,p)=>s+Number(p.quantity||0),0) - issuedUpTo.reduce((s,i)=>s+Number(i.quantity||0),0);
        const lastPurchase = purchasedUpTo.sort((a,b)=>b.purchasedAt.localeCompare(a.purchasedAt))[0];
        const unitPrice = lastPurchase ? Number(lastPurchase.unitPrice) : 0;
        const value = stockAsAt > 0 ? stockAsAt * unitPrice : 0;
        grandTotal += value;
        const thr = item.lowStockThreshold != null ? Number(item.lowStockThreshold) : (s.lowStockDefaultThreshold||10);
        rows.push({description:item.description,unit:item.unit,currentStock:stockAsAt,unitPrice,totalValue:value,lastPurchaseDate:lastPurchase?.purchasedAt||"-",lastSupplier:lastPurchase?.supplier||"-",stockStatus:stockAsAt<=0?"OUT":stockAsAt<=thr?"LOW":"OK"});
      }
      resolve({rows,grandTotal,asAt,currency:s.defaultCurrency||"KES",hospitalName:s.hospitalName,officer:s.responsibleOfficer});
    });
    const {rows,grandTotal,currency,hospitalName,officer} = data;
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Stock Valuation");
    ws.addRow([hospitalName]).getCell(1).font={bold:true,size:14,color:{argb:"FF4F46E5"}};
    ws.addRow(["Stock Valuation Report — As at " + (data.asAt||new Date().toISOString().slice(0,10))]).getCell(1).font={italic:true};
    if(officer) ws.addRow(["Responsible Officer: " + officer]).getCell(1).font={italic:true,color:{argb:"FF6B7280"}};
    ws.addRow([]);
    const hRow = ws.addRow(["#","Item Description","Unit","Stock Qty","Unit Price ("+currency+")","Total Value ("+currency+")","Last Purchase","Supplier","Status"]);
    hRow.eachCell(cell=>{cell.font={bold:true,color:{argb:"FFFFFFFF"}};cell.fill={type:"pattern",pattern:"solid",fgColor:{argb:"FF4F46E5"}};cell.alignment={horizontal:"center"};});
    rows.forEach((r,i)=>{
      const row = ws.addRow([i+1,r.description,r.unit,r.currentStock,r.unitPrice,r.totalValue,r.lastPurchaseDate,r.lastSupplier,r.stockStatus]);
      const bg = i%2===0?"FFFFFFFF":"FFF8FAFF";
      row.eachCell((cell,ci)=>{
        cell.fill={type:"pattern",pattern:"solid",fgColor:{argb:bg}};
        if(ci>=5&&ci<=6){cell.numFmt="#,##0.00";cell.alignment={horizontal:"right"};}
        if(ci===4){cell.alignment={horizontal:"right"};}
      });
      // Status color
      const stCell=row.getCell(9);
      if(r.stockStatus==="OUT"){stCell.font={bold:true,color:{argb:"FFDC2626"}};stCell.fill={type:"pattern",pattern:"solid",fgColor:{argb:"FFFEE2E2"}};}
      else if(r.stockStatus==="LOW"){stCell.font={bold:true,color:{argb:"FFD97706"}};stCell.fill={type:"pattern",pattern:"solid",fgColor:{argb:"FFFEF3C7"}};}
      else{stCell.font={bold:true,color:{argb:"FF059669"}};stCell.fill={type:"pattern",pattern:"solid",fgColor:{argb:"FFD1FAE5"}};}
      // Value color
      if(r.totalValue>0) row.getCell(6).font={bold:true,color:{argb:"FF4F46E5"}};
    });
    // Grand total
    const gt=ws.addRow(["","","","GRAND TOTAL","",grandTotal,"","",""]);
    gt.getCell(4).font={bold:true};
    gt.getCell(6).font={bold:true,color:{argb:"FF4F46E5"},size:12};
    gt.getCell(6).numFmt="#,##0.00";
    ws.columns=[{width:5},{width:38},{width:8},{width:12},{width:18},{width:18},{width:14},{width:22},{width:10}];
    const buffer = await wb.xlsx.writeBuffer();
    res.setHeader("Content-Type","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition",'attachment; filename="stock_valuation_'+new Date().toISOString().slice(0,10)+'.xlsx"');
    res.setHeader("Content-Length",buffer.length);
    res.end(buffer);
  } catch(err) {
    console.error("Valuation Excel error:",err);
    res.status(500).json({error:"Export failed: "+err.message});
  }
});

// ── Feature 6: Backup & Restore ──────────────────────────────────────────
app.get("/api/admin/backup", requirePermission("manageUsers"), (req, res) => {
  const data = db.getState();
  const json = JSON.stringify(data, null, 2);
  const date = new Date().toISOString().slice(0,10);
  res.setHeader("Content-Type","application/json");
  res.setHeader("Content-Disposition", `attachment; filename="storemonitor_backup_${date}.json"`);
  res.send(json);
});

app.post("/api/admin/restore", requirePermission("manageUsers"), (req, res) => {
  try {
    const data = req.body;
    if (!data || !data.users || !data.items) return res.status(400).json({error:"Invalid backup file — missing required collections"});
    // Validate collections
    const required = ["users","departments","items","purchases","issues","receipts","inventory"];
    for (const key of required) {
      if (!Array.isArray(data[key])) return res.status(400).json({error:`Invalid backup: '${key}' must be an array`});
    }
    db.setState(data).write();
    logActivity(req,"RESTORE_BACKUP","SYSTEM",null,{restoredAt:new Date().toISOString()});
    res.json({success:true,message:"Backup restored successfully. Please refresh the app."});
  } catch(err) {
    res.status(500).json({error:"Restore failed: "+err.message});
  }
});


// ── Self Registration (if enabled in settings) ────────────────────────────
app.post("/api/auth/register",(req,res)=>{
  const s=getSettings();
  if(!s.allowSelfRegistration) return res.status(403).json({error:"Self-registration is disabled"});
  const {username,password,fullName}=req.body;
  if(!username||!password||!fullName) return res.status(400).json({error:"All fields are required"});
  if(password.length<6) return res.status(400).json({error:"Password must be at least 6 characters"});
  if(db.get("users").find({username}).value()) return res.status(400).json({error:"Username already taken"});
  const hash=bcrypt.hashSync(password,10);
  const defaultPerms={viewDashboard:true,manageDepartments:false,manageCatalog:false,managePurchases:false,issueItems:true,viewReports:false,exportData:false,manageUsers:false,deleteTransactions:false,manageInventory:false};
  const user={id:nextId("users"),username:username.trim(),passwordHash:hash,fullName:fullName.trim(),role:"staff",permissions:defaultPerms,createdAt:new Date().toISOString()};
  db.get("users").push(user).write();
  logActivity(req,"SELF_REGISTER","USER",user.id,{username:user.username});
  res.status(201).json({success:true,message:"Account created. Please wait for admin approval before logging in."});
});

// ── Forgot Password (admin resets — no email yet) ─────────────────────────
app.post("/api/auth/forgot-password",(req,res)=>{
  const {username}=req.body;
  if(!username) return res.status(400).json({error:"Username is required"});
  const user=db.get("users").find({username}).value();
  if(!user) return res.status(404).json({error:"No account found with that username"});
  // Generate a temporary reset token stored in db
  const token=Math.random().toString(36).slice(2)+Math.random().toString(36).slice(2);
  const expires=new Date(Date.now()+3600000).toISOString(); // 1 hour
  db.get("users").find({username}).assign({resetToken:token,resetExpires:expires}).write();
  // In a real system, email the token. Here we return it so admin can relay it.
  res.json({success:true,message:"Token generated.",resetToken:token,username,expiresIn:"1 hour"});
});

app.patch("/api/auth/reset-password",(req,res)=>{
  const {username,token,newPassword}=req.body;
  if(!username||!token||!newPassword) return res.status(400).json({error:"Missing fields"});
  if(newPassword.length<6) return res.status(400).json({error:"Password must be at least 6 characters"});
  const user=db.get("users").find({username}).value();
  if(!user||user.resetToken!==token) return res.status(400).json({error:"Invalid or expired reset token"});
  if(user.resetExpires&&new Date(user.resetExpires)<new Date()) return res.status(400).json({error:"Reset token has expired"});
  const hash=bcrypt.hashSync(newPassword,10);
  db.get("users").find({username}).assign({passwordHash:hash,resetToken:null,resetExpires:null}).write();
  res.json({success:true,message:"Password reset successfully. You can now log in."});
});


// ── Units Management ──────────────────────────────────────────────────────
app.get("/api/catalog/units", requirePermission("manageCatalog"), (req, res) => {
  const items = db.get("items").value();
  const unitMap = new Map();
  for (const item of items) {
    const u = (item.unit || "").trim().toUpperCase();
    if (!u) continue;
    if (!unitMap.has(u)) unitMap.set(u, []);
    unitMap.get(u).push({ id: item.id, description: item.description });
  }
  const units = Array.from(unitMap.entries())
    .sort((a,b) => a[0].localeCompare(b[0]))
    .map(([unit, items]) => ({ unit, itemCount: items.length, items }));
  res.json(units);
});

app.patch("/api/catalog/units/:unit", requirePermission("manageCatalog"), (req, res) => {
  const oldUnit = decodeURIComponent(req.params.unit).toUpperCase();
  const newUnit = String(req.body.newUnit || "").trim().toUpperCase();
  if (!newUnit) return res.status(400).json({ error: "New unit name is required" });
  if (newUnit === oldUnit) return res.status(400).json({ error: "New unit is the same as old unit" });
  const items = db.get("items").filter(i => (i.unit||"").toUpperCase() === oldUnit).value();
  if (!items.length) return res.status(404).json({ error: "Unit not found" });
  for (const item of items) {
    db.get("items").find({ id: item.id }).assign({ unit: newUnit }).write();
  }
  logActivity(req, "RENAME_UNIT", "CATALOG", null, { oldUnit, newUnit, affectedItems: items.length });
  res.json({ success: true, oldUnit, newUnit, affectedItems: items.length });
});

app.delete("/api/catalog/units/:unit", requirePermission("manageCatalog"), (req, res) => {
  const unit = decodeURIComponent(req.params.unit).toUpperCase();
  const items = db.get("items").filter(i => (i.unit||"").toUpperCase() === unit).value();
  if (!items.length) return res.status(404).json({ error: "Unit not found" });
  // Clear unit from all items (set to empty string so admin must fix)
  for (const item of items) {
    db.get("items").find({ id: item.id }).assign({ unit: "" }).write();
  }
  logActivity(req, "DELETE_UNIT", "CATALOG", null, { unit, affectedItems: items.length });
  res.json({ success: true, unit, affectedItems: items.length });
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

// Patch adapter so every write syncs to Supabase in background
const _origWrite = adapter.write.bind(adapter);
adapter.write = function(data) {
  const result = _origWrite(data);
  syncToSupabase();
  return result;
};

// Download latest data from Supabase, then start server
downloadFromSupabase().finally(() => {
  // Re-read db after potential Supabase restore
  db.read();
  // Ensure assets keys exist after Supabase restore (in case old store.json lacks them)
  if (!db.get('assets').value()) db.set('assets', []).write();
  if (!db.get('assetCategories').value()) db.set('assetCategories', []).write();
  runMigrations();
  seedAdmin();
  seedAssets();
  
// ─────────────────────────────────────────────────────────────────────────
// ASSET REGISTER ROUTES
// ─────────────────────────────────────────────────────────────────────────

// List all assets (with optional filters)
app.get('/api/assets', requireAuth, (req, res) => {
  let assets = db.get('assets').value() || [];
  const { category, location, status, search } = req.query;
  if (category) assets = assets.filter(a => a.category === category);
  if (location) assets = assets.filter(a => a.location === location);
  if (status)   assets = assets.filter(a => a.status && a.status.toLowerCase().includes(status.toLowerCase()));
  if (search)   {
    const q = search.toLowerCase();
    assets = assets.filter(a =>
      (a.description||'').toLowerCase().includes(q) ||
      (a.serialNo||'').toLowerCase().includes(q) ||
      (a.model||'').toLowerCase().includes(q) ||
      (a.location||'').toLowerCase().includes(q)
    );
  }
  res.json(assets);
});

// Get single asset
app.get('/api/assets/:id', requireAuth, (req, res) => {
  const asset = db.get('assets').find({ id: Number(req.params.id) }).value();
  if (!asset) return res.status(404).json({ error: 'Asset not found' });
  res.json(asset);
});

// Add asset
app.post('/api/assets', requirePermission('manageAssets'), (req, res) => {
  const { description, category, quantity, serialNo, model, location, dateAcquired, status, ownership, notes } = req.body;
  if (!description || !category) return res.status(400).json({ error: 'description and category required' });
  const assets = db.get('assets').value() || [];
  const id = assets.length > 0 ? Math.max(...assets.map(a => a.id)) + 1 : 1;
  const asset = { id, description, category, quantity: quantity||'1', serialNo: serialNo||'', model: model||'', location: location||'', dateAcquired: dateAcquired||'', status: status||'FUNCTIONAL', ownership: ownership||'FACILITY OWNED', notes: notes||'' };
  db.get('assets').push(asset).write();
  logActivity(req, 'ADD_ASSET', 'ASSET', id, { description, category });
  res.status(201).json(asset);
});

// Edit asset
app.patch('/api/assets/:id', requirePermission('manageAssets'), (req, res) => {
  const id = Number(req.params.id);
  const asset = db.get('assets').find({ id }).value();
  if (!asset) return res.status(404).json({ error: 'Asset not found' });
  const allowed = ['description','category','quantity','serialNo','model','location','dateAcquired','status','ownership','notes'];
  const updates = {};
  allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });
  db.get('assets').find({ id }).assign(updates).write();
  const updated = db.get('assets').find({ id }).value();
  logActivity(req, 'EDIT_ASSET', 'ASSET', id, updates);
  res.json(updated);
});

// Delete asset
app.delete('/api/assets/:id', requirePermission('manageAssets'), (req, res) => {
  const id = Number(req.params.id);
  const asset = db.get('assets').find({ id }).value();
  if (!asset) return res.status(404).json({ error: 'Asset not found' });
  db.get('assets').remove({ id }).write();
  logActivity(req, 'DELETE_ASSET', 'ASSET', id, { description: asset.description });
  res.status(204).send();
});

// Move asset to another location/category
app.patch('/api/assets/:id/move', requirePermission('manageAssets'), (req, res) => {
  const id = Number(req.params.id);
  const { location, category } = req.body;
  const asset = db.get('assets').find({ id }).value();
  if (!asset) return res.status(404).json({ error: 'Asset not found' });
  const updates = {};
  if (location !== undefined) updates.location = location;
  if (category !== undefined) updates.category = category;
  db.get('assets').find({ id }).assign(updates).write();
  logActivity(req, 'MOVE_ASSET', 'ASSET', id, { from: { location: asset.location, category: asset.category }, to: updates });
  res.json(db.get('assets').find({ id }).value());
});

// Asset categories CRUD
app.get('/api/asset-categories', requireAuth, (req, res) => {
  res.json(db.get('assetCategories').value() || []);
});

app.post('/api/asset-categories', requirePermission('manageAssets'), (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const cats = db.get('assetCategories').value() || [];
  if (cats.find(c => c.name.toLowerCase() === name.toLowerCase()))
    return res.status(409).json({ error: 'Category already exists' });
  const id = cats.length > 0 ? Math.max(...cats.map(c => c.id)) + 1 : 1;
  const cat = { id, name: name.toUpperCase() };
  db.get('assetCategories').push(cat).write();
  res.status(201).json(cat);
});

app.patch('/api/asset-categories/:id', requirePermission('manageAssets'), (req, res) => {
  const id = Number(req.params.id);
  const { name } = req.body;
  const cat = db.get('assetCategories').find({ id }).value();
  if (!cat) return res.status(404).json({ error: 'Category not found' });
  db.get('assetCategories').find({ id }).assign({ name: name.toUpperCase() }).write();
  // Also update all assets in that category
  db.get('assets').filter({ category: cat.name }).each(a => { a.category = name.toUpperCase(); }).write();
  res.json(db.get('assetCategories').find({ id }).value());
});

app.delete('/api/asset-categories/:id', requirePermission('manageAssets'), (req, res) => {
  const id = Number(req.params.id);
  const cat = db.get('assetCategories').find({ id }).value();
  if (!cat) return res.status(404).json({ error: 'Category not found' });
  const hasAssets = db.get('assets').filter({ category: cat.name }).value().length > 0;
  if (hasAssets) return res.status(400).json({ error: 'Cannot delete — category has assets. Move or delete them first.' });
  db.get('assetCategories').remove({ id }).write();
  res.status(204).send();
});

// Export assets as CSV
app.get('/api/assets/export/csv', requireAuth, (req, res) => {
  const assets = db.get('assets').value() || [];
  const rows = [
    ['ID','Category','Description','Quantity','Serial No','Model','Location','Date Acquired','Status','Ownership','Notes'],
    ...assets.map(a => [a.id,a.category,a.description,a.quantity,a.serialNo,a.model,a.location,a.dateAcquired,a.status,a.ownership,a.notes].map(v => `"${(v||'').replace(/"/g,'""')}"`))
  ];
  res.setHeader('Content-Type','text/csv');
  res.setHeader('Content-Disposition','attachment; filename="asset-register.csv"');
  res.send(rows.map(r => r.join(',')).join('\n'));
});

// Export assets as XLSX
app.get('/api/assets/export/xlsx', requireAuth, async (req, res) => {
  try {
    const ExcelJS = require('exceljs');
    const assets = db.get('assets').value() || [];
    const cats = [...new Set(assets.map(a => a.category))];
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Mukurweini Hospital Stores';

    // Summary sheet
    const summary = wb.addWorksheet('Summary');
    summary.addRow(['MUKURWEINI SUB-COUNTY HOSPITAL ASSET REGISTER']);
    summary.addRow(['Category','Total Assets','Functional','Non-Functional']);
    cats.forEach(cat => {
      const catAssets = assets.filter(a => a.category === cat);
      const functional = catAssets.filter(a => (a.status||'').toLowerCase().includes('functional') && !(a.status||'').toLowerCase().includes('non')).length;
      summary.addRow([cat, catAssets.length, functional, catAssets.length - functional]);
    });

    // One sheet per category
    cats.forEach(cat => {
      const catAssets = assets.filter(a => a.category === cat);
      const sheetName = cat.slice(0, 29);
      const ws = wb.addWorksheet(sheetName);
      const hdr = ws.addRow(['#','Description','Qty','Serial No','Model','Location','Date Acquired','Status','Ownership','Notes']);
      hdr.font = { bold: true };
      hdr.fill = { type:'pattern', pattern:'solid', fgColor:{ argb:'FF0F766E' } };
      hdr.font = { bold: true, color:{ argb:'FFFFFFFF' } };
      catAssets.forEach((a, i) => {
        ws.addRow([i+1, a.description, a.quantity, a.serialNo, a.model, a.location, a.dateAcquired, a.status, a.ownership, a.notes]);
      });
      ws.columns = [4,36,6,18,14,24,18,18,18,20].map(w => ({ width: w }));
    });

    res.setHeader('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition','attachment; filename="asset-register.xlsx"');
    const buffer = await wb.xlsx.writeBuffer();
    res.setHeader('Content-Length', buffer.length);
    res.end(buffer);
  } catch(e) {
    console.error('Asset XLSX export error:', e);
    res.status(500).json({ error: 'Export failed: ' + e.message });
  }
});


// ── DIGITAL FORMS (CCTV LOGS) ─────────────────────────────────────────────
const CCTV_DAILY_SEED    = [{"id":1,"date":"2026-02-02","cameraStatus":"ALL CAMERAS OPERATIONAL","nvrStatus":"NVR RECORDING - OK","checkedBy":"FACILITY IN-CHARGE","ictOfficer":"ALICE WERU","remarks":""},{"id":2,"date":"2026-02-03","cameraStatus":"CAMERA 3 OFFLINE - REPORTED","nvrStatus":"NVR RECORDING - OK","checkedBy":"FACILITY IN-CHARGE","ictOfficer":"JOHN MWENDA","remarks":""},{"id":3,"date":"2026-02-04","cameraStatus":"ALL CAMERAS OPERATIONAL","nvrStatus":"NVR RECORDING - OK","checkedBy":"SECURITY OFFICER - PETER KAMAU","ictOfficer":"JOHN MWENDA","remarks":""},{"id":4,"date":"2026-02-05","cameraStatus":"ALL CAMERAS OPERATIONAL","nvrStatus":"NVR RECORDING - OK","checkedBy":"FACILITY IN-CHARGE","ictOfficer":"JOHN MWENDA","remarks":""},{"id":5,"date":"2026-02-06","cameraStatus":"ALL CAMERAS OPERATIONAL","nvrStatus":"NVR RECORDING - OK","checkedBy":"SECURITY OFFICER - PETER KAMAU","ictOfficer":"ALICE WERU","remarks":""},{"id":6,"date":"2026-02-09","cameraStatus":"ALL CAMERAS OPERATIONAL","nvrStatus":"NVR STORAGE 85% - ALERT SENT","checkedBy":"FACILITY IN-CHARGE","ictOfficer":"ALICE WERU","remarks":""},{"id":7,"date":"2026-02-10","cameraStatus":"CAMERA 3 OFFLINE - REPORTED","nvrStatus":"NVR STORAGE 85% - ALERT SENT","checkedBy":"SECURITY OFFICER - SARAH NJOKI","ictOfficer":"JOHN MWENDA","remarks":"Minor dust cleaned from lens"},{"id":8,"date":"2026-02-11","cameraStatus":"ALL CAMERAS OPERATIONAL","nvrStatus":"NVR RECORDING - OK","checkedBy":"SECURITY OFFICER - SARAH NJOKI","ictOfficer":"ALICE WERU","remarks":""},{"id":9,"date":"2026-02-12","cameraStatus":"ALL CAMERAS OPERATIONAL","nvrStatus":"NVR RECORDING - OK","checkedBy":"SECURITY OFFICER - SARAH NJOKI","ictOfficer":"JOHN MWENDA","remarks":""},{"id":10,"date":"2026-02-13","cameraStatus":"ALL CAMERAS OPERATIONAL","nvrStatus":"NVR RECORDING - OK","checkedBy":"FACILITY IN-CHARGE","ictOfficer":"JOHN MWENDA","remarks":""},{"id":11,"date":"2026-02-16","cameraStatus":"ALL CAMERAS OPERATIONAL","nvrStatus":"NVR STORAGE 85% - ALERT SENT","checkedBy":"SECURITY OFFICER - SARAH NJOKI","ictOfficer":"JOHN MWENDA","remarks":""},{"id":12,"date":"2026-02-17","cameraStatus":"ALL CAMERAS OPERATIONAL","nvrStatus":"NVR RECORDING - OK","checkedBy":"SECURITY OFFICER - SARAH NJOKI","ictOfficer":"ALICE WERU","remarks":""},{"id":13,"date":"2026-02-18","cameraStatus":"CAMERA 7 BLURRY - CLEANED","nvrStatus":"NVR STORAGE 85% - ALERT SENT","checkedBy":"SECURITY OFFICER - SARAH NJOKI","ictOfficer":"ALICE WERU","remarks":""},{"id":14,"date":"2026-02-19","cameraStatus":"CAMERA 7 BLURRY - CLEANED","nvrStatus":"NVR RECORDING - OK","checkedBy":"FACILITY IN-CHARGE","ictOfficer":"JOHN MWENDA","remarks":""},{"id":15,"date":"2026-02-20","cameraStatus":"CAMERA 3 OFFLINE - REPORTED","nvrStatus":"NVR STORAGE 85% - ALERT SENT","checkedBy":"SECURITY OFFICER - SARAH NJOKI","ictOfficer":"ALICE WERU","remarks":""},{"id":16,"date":"2026-02-23","cameraStatus":"ALL CAMERAS OPERATIONAL","nvrStatus":"NVR STORAGE 85% - ALERT SENT","checkedBy":"FACILITY IN-CHARGE","ictOfficer":"ALICE WERU","remarks":""},{"id":17,"date":"2026-02-24","cameraStatus":"ALL CAMERAS OPERATIONAL","nvrStatus":"NVR STORAGE 85% - ALERT SENT","checkedBy":"SECURITY OFFICER - PETER KAMAU","ictOfficer":"ALICE WERU","remarks":""},{"id":18,"date":"2026-02-25","cameraStatus":"ALL CAMERAS OPERATIONAL","nvrStatus":"NVR STORAGE 85% - ALERT SENT","checkedBy":"FACILITY IN-CHARGE","ictOfficer":"ALICE WERU","remarks":""},{"id":19,"date":"2026-02-26","cameraStatus":"ALL CAMERAS OPERATIONAL","nvrStatus":"NVR RECORDING - OK","checkedBy":"FACILITY IN-CHARGE","ictOfficer":"ALICE WERU","remarks":"Minor dust cleaned from lens"},{"id":20,"date":"2026-02-27","cameraStatus":"CAMERA 3 OFFLINE - REPORTED","nvrStatus":"NVR STORAGE 85% - ALERT SENT","checkedBy":"FACILITY IN-CHARGE","ictOfficer":"ALICE WERU","remarks":""},{"id":21,"date":"2026-03-02","cameraStatus":"ALL CAMERAS OPERATIONAL","nvrStatus":"NVR RECORDING - OK","checkedBy":"SECURITY OFFICER - SARAH NJOKI","ictOfficer":"JOHN MWENDA","remarks":""},{"id":22,"date":"2026-03-03","cameraStatus":"CAMERA 3 OFFLINE - REPORTED","nvrStatus":"NVR RECORDING - OK","checkedBy":"SECURITY OFFICER - PETER KAMAU","ictOfficer":"JOHN MWENDA","remarks":""},{"id":23,"date":"2026-03-04","cameraStatus":"CAMERA 3 OFFLINE - REPORTED","nvrStatus":"NVR STORAGE 85% - ALERT SENT","checkedBy":"FACILITY IN-CHARGE","ictOfficer":"ALICE WERU","remarks":""},{"id":24,"date":"2026-03-05","cameraStatus":"ALL CAMERAS OPERATIONAL","nvrStatus":"NVR RECORDING - OK","checkedBy":"FACILITY IN-CHARGE","ictOfficer":"ALICE WERU","remarks":""},{"id":25,"date":"2026-03-06","cameraStatus":"ALL CAMERAS OPERATIONAL","nvrStatus":"NVR RECORDING - OK","checkedBy":"FACILITY IN-CHARGE","ictOfficer":"JOHN MWENDA","remarks":""},{"id":26,"date":"2026-03-09","cameraStatus":"ALL CAMERAS OPERATIONAL","nvrStatus":"NVR RECORDING - OK","checkedBy":"FACILITY IN-CHARGE","ictOfficer":"ALICE WERU","remarks":"Minor dust cleaned from lens"},{"id":27,"date":"2026-03-10","cameraStatus":"ALL CAMERAS OPERATIONAL","nvrStatus":"NVR STORAGE 85% - ALERT SENT","checkedBy":"SECURITY OFFICER - SARAH NJOKI","ictOfficer":"JOHN MWENDA","remarks":""},{"id":28,"date":"2026-03-11","cameraStatus":"CAMERA 7 BLURRY - CLEANED","nvrStatus":"NVR STORAGE 85% - ALERT SENT","checkedBy":"FACILITY IN-CHARGE","ictOfficer":"JOHN MWENDA","remarks":""},{"id":29,"date":"2026-03-12","cameraStatus":"CAMERA 7 BLURRY - CLEANED","nvrStatus":"NVR STORAGE 85% - ALERT SENT","checkedBy":"SECURITY OFFICER - PETER KAMAU","ictOfficer":"ALICE WERU","remarks":""},{"id":30,"date":"2026-03-13","cameraStatus":"ALL CAMERAS OPERATIONAL","nvrStatus":"NVR RECORDING - OK","checkedBy":"FACILITY IN-CHARGE","ictOfficer":"ALICE WERU","remarks":""},{"id":31,"date":"2026-03-16","cameraStatus":"ALL CAMERAS OPERATIONAL","nvrStatus":"NVR RECORDING - OK","checkedBy":"SECURITY OFFICER - SARAH NJOKI","ictOfficer":"JOHN MWENDA","remarks":"Minor dust cleaned from lens"},{"id":32,"date":"2026-03-17","cameraStatus":"ALL CAMERAS OPERATIONAL","nvrStatus":"NVR RECORDING - OK","checkedBy":"SECURITY OFFICER - PETER KAMAU","ictOfficer":"ALICE WERU","remarks":""},{"id":33,"date":"2026-03-18","cameraStatus":"ALL CAMERAS OPERATIONAL","nvrStatus":"NVR STORAGE 85% - ALERT SENT","checkedBy":"SECURITY OFFICER - PETER KAMAU","ictOfficer":"ALICE WERU","remarks":""},{"id":34,"date":"2026-03-19","cameraStatus":"CAMERA 3 OFFLINE - REPORTED","nvrStatus":"NVR RECORDING - OK","checkedBy":"FACILITY IN-CHARGE","ictOfficer":"ALICE WERU","remarks":""},{"id":35,"date":"2026-03-20","cameraStatus":"ALL CAMERAS OPERATIONAL","nvrStatus":"NVR STORAGE 85% - ALERT SENT","checkedBy":"FACILITY IN-CHARGE","ictOfficer":"ALICE WERU","remarks":""},{"id":36,"date":"2026-03-23","cameraStatus":"CAMERA 7 BLURRY - CLEANED","nvrStatus":"NVR RECORDING - OK","checkedBy":"FACILITY IN-CHARGE","ictOfficer":"ALICE WERU","remarks":"Minor dust cleaned from lens"},{"id":37,"date":"2026-03-24","cameraStatus":"CAMERA 3 OFFLINE - REPORTED","nvrStatus":"NVR RECORDING - OK","checkedBy":"SECURITY OFFICER - SARAH NJOKI","ictOfficer":"JOHN MWENDA","remarks":""},{"id":38,"date":"2026-03-25","cameraStatus":"CAMERA 3 OFFLINE - REPORTED","nvrStatus":"NVR STORAGE 85% - ALERT SENT","checkedBy":"SECURITY OFFICER - PETER KAMAU","ictOfficer":"JOHN MWENDA","remarks":""},{"id":39,"date":"2026-03-26","cameraStatus":"ALL CAMERAS OPERATIONAL","nvrStatus":"NVR STORAGE 85% - ALERT SENT","checkedBy":"SECURITY OFFICER - PETER KAMAU","ictOfficer":"JOHN MWENDA","remarks":""},{"id":40,"date":"2026-03-27","cameraStatus":"ALL CAMERAS OPERATIONAL","nvrStatus":"NVR STORAGE 85% - ALERT SENT","checkedBy":"SECURITY OFFICER - SARAH NJOKI","ictOfficer":"ALICE WERU","remarks":""},{"id":41,"date":"2026-03-30","cameraStatus":"CAMERA 3 OFFLINE - REPORTED","nvrStatus":"NVR RECORDING - OK","checkedBy":"SECURITY OFFICER - PETER KAMAU","ictOfficer":"ALICE WERU","remarks":""},{"id":42,"date":"2026-03-31","cameraStatus":"CAMERA 3 OFFLINE - REPORTED","nvrStatus":"NVR RECORDING - OK","checkedBy":"SECURITY OFFICER - PETER KAMAU","ictOfficer":"ALICE WERU","remarks":""},{"id":43,"date":"2026-04-01","cameraStatus":"ALL CAMERAS OPERATIONAL","nvrStatus":"NVR RECORDING - OK","checkedBy":"FACILITY IN-CHARGE","ictOfficer":"JOHN MWENDA","remarks":""},{"id":44,"date":"2026-04-02","cameraStatus":"ALL CAMERAS OPERATIONAL","nvrStatus":"NVR RECORDING - OK","checkedBy":"SECURITY OFFICER - SARAH NJOKI","ictOfficer":"ALICE WERU","remarks":""},{"id":45,"date":"2026-04-03","cameraStatus":"ALL CAMERAS OPERATIONAL","nvrStatus":"NVR STORAGE 85% - ALERT SENT","checkedBy":"SECURITY OFFICER - PETER KAMAU","ictOfficer":"JOHN MWENDA","remarks":""},{"id":46,"date":"2026-04-06","cameraStatus":"CAMERA 3 OFFLINE - REPORTED","nvrStatus":"NVR RECORDING - OK","checkedBy":"SECURITY OFFICER - PETER KAMAU","ictOfficer":"ALICE WERU","remarks":""},{"id":47,"date":"2026-04-07","cameraStatus":"ALL CAMERAS OPERATIONAL","nvrStatus":"NVR RECORDING - OK","checkedBy":"FACILITY IN-CHARGE","ictOfficer":"JOHN MWENDA","remarks":"Minor dust cleaned from lens"},{"id":48,"date":"2026-04-08","cameraStatus":"ALL CAMERAS OPERATIONAL","nvrStatus":"NVR RECORDING - OK","checkedBy":"SECURITY OFFICER - PETER KAMAU","ictOfficer":"JOHN MWENDA","remarks":""},{"id":49,"date":"2026-04-09","cameraStatus":"ALL CAMERAS OPERATIONAL","nvrStatus":"NVR RECORDING - OK","checkedBy":"SECURITY OFFICER - PETER KAMAU","ictOfficer":"ALICE WERU","remarks":""},{"id":50,"date":"2026-04-10","cameraStatus":"CAMERA 3 OFFLINE - REPORTED","nvrStatus":"NVR RECORDING - OK","checkedBy":"SECURITY OFFICER - PETER KAMAU","ictOfficer":"ALICE WERU","remarks":""},{"id":51,"date":"2026-04-13","cameraStatus":"ALL CAMERAS OPERATIONAL","nvrStatus":"NVR RECORDING - OK","checkedBy":"SECURITY OFFICER - SARAH NJOKI","ictOfficer":"ALICE WERU","remarks":""},{"id":52,"date":"2026-04-14","cameraStatus":"CAMERA 7 BLURRY - CLEANED","nvrStatus":"NVR STORAGE 85% - ALERT SENT","checkedBy":"SECURITY OFFICER - PETER KAMAU","ictOfficer":"JOHN MWENDA","remarks":""},{"id":53,"date":"2026-04-15","cameraStatus":"ALL CAMERAS OPERATIONAL","nvrStatus":"NVR RECORDING - OK","checkedBy":"FACILITY IN-CHARGE","ictOfficer":"ALICE WERU","remarks":""},{"id":54,"date":"2026-04-16","cameraStatus":"ALL CAMERAS OPERATIONAL","nvrStatus":"NVR STORAGE 85% - ALERT SENT","checkedBy":"SECURITY OFFICER - PETER KAMAU","ictOfficer":"JOHN MWENDA","remarks":""},{"id":55,"date":"2026-04-17","cameraStatus":"ALL CAMERAS OPERATIONAL","nvrStatus":"NVR RECORDING - OK","checkedBy":"FACILITY IN-CHARGE","ictOfficer":"JOHN MWENDA","remarks":""},{"id":56,"date":"2026-04-20","cameraStatus":"ALL CAMERAS OPERATIONAL","nvrStatus":"NVR STORAGE 85% - ALERT SENT","checkedBy":"FACILITY IN-CHARGE","ictOfficer":"JOHN MWENDA","remarks":""},{"id":57,"date":"2026-04-21","cameraStatus":"ALL CAMERAS OPERATIONAL","nvrStatus":"NVR RECORDING - OK","checkedBy":"SECURITY OFFICER - SARAH NJOKI","ictOfficer":"JOHN MWENDA","remarks":""},{"id":58,"date":"2026-04-22","cameraStatus":"CAMERA 7 BLURRY - CLEANED","nvrStatus":"NVR STORAGE 85% - ALERT SENT","checkedBy":"SECURITY OFFICER - SARAH NJOKI","ictOfficer":"ALICE WERU","remarks":"Minor dust cleaned from lens"},{"id":59,"date":"2026-04-23","cameraStatus":"CAMERA 7 BLURRY - CLEANED","nvrStatus":"NVR RECORDING - OK","checkedBy":"SECURITY OFFICER - SARAH NJOKI","ictOfficer":"JOHN MWENDA","remarks":"Minor dust cleaned from lens"},{"id":60,"date":"2026-04-24","cameraStatus":"ALL CAMERAS OPERATIONAL","nvrStatus":"NVR RECORDING - OK","checkedBy":"SECURITY OFFICER - PETER KAMAU","ictOfficer":"JOHN MWENDA","remarks":""},{"id":61,"date":"2026-04-27","cameraStatus":"CAMERA 3 OFFLINE - REPORTED","nvrStatus":"NVR RECORDING - OK","checkedBy":"SECURITY OFFICER - PETER KAMAU","ictOfficer":"JOHN MWENDA","remarks":""},{"id":62,"date":"2026-04-28","cameraStatus":"CAMERA 3 OFFLINE - REPORTED","nvrStatus":"NVR RECORDING - OK","checkedBy":"FACILITY IN-CHARGE","ictOfficer":"ALICE WERU","remarks":""},{"id":63,"date":"2026-04-29","cameraStatus":"ALL CAMERAS OPERATIONAL","nvrStatus":"NVR RECORDING - OK","checkedBy":"FACILITY IN-CHARGE","ictOfficer":"ALICE WERU","remarks":""},{"id":64,"date":"2026-04-30","cameraStatus":"ALL CAMERAS OPERATIONAL","nvrStatus":"NVR STORAGE 85% - ALERT SENT","checkedBy":"SECURITY OFFICER - SARAH NJOKI","ictOfficer":"JOHN MWENDA","remarks":""},{"id":65,"date":"2026-05-01","cameraStatus":"ALL CAMERAS OPERATIONAL","nvrStatus":"NVR STORAGE 85% - ALERT SENT","checkedBy":"SECURITY OFFICER - SARAH NJOKI","ictOfficer":"ALICE WERU","remarks":""},{"id":66,"date":"2026-05-04","cameraStatus":"CAMERA 7 BLURRY - CLEANED","nvrStatus":"NVR STORAGE 85% - ALERT SENT","checkedBy":"FACILITY IN-CHARGE","ictOfficer":"ALICE WERU","remarks":""},{"id":67,"date":"2026-05-05","cameraStatus":"CAMERA 7 BLURRY - CLEANED","nvrStatus":"NVR RECORDING - OK","checkedBy":"SECURITY OFFICER - PETER KAMAU","ictOfficer":"ALICE WERU","remarks":""},{"id":68,"date":"2026-05-06","cameraStatus":"ALL CAMERAS OPERATIONAL","nvrStatus":"NVR RECORDING - OK","checkedBy":"SECURITY OFFICER - SARAH NJOKI","ictOfficer":"JOHN MWENDA","remarks":""},{"id":69,"date":"2026-05-07","cameraStatus":"CAMERA 7 BLURRY - CLEANED","nvrStatus":"NVR STORAGE 85% - ALERT SENT","checkedBy":"FACILITY IN-CHARGE","ictOfficer":"ALICE WERU","remarks":""},{"id":70,"date":"2026-05-08","cameraStatus":"ALL CAMERAS OPERATIONAL","nvrStatus":"NVR RECORDING - OK","checkedBy":"SECURITY OFFICER - PETER KAMAU","ictOfficer":"JOHN MWENDA","remarks":""},{"id":71,"date":"2026-05-11","cameraStatus":"CAMERA 3 OFFLINE - REPORTED","nvrStatus":"NVR RECORDING - OK","checkedBy":"SECURITY OFFICER - SARAH NJOKI","ictOfficer":"JOHN MWENDA","remarks":""},{"id":72,"date":"2026-05-12","cameraStatus":"ALL CAMERAS OPERATIONAL","nvrStatus":"NVR RECORDING - OK","checkedBy":"SECURITY OFFICER - SARAH NJOKI","ictOfficer":"JOHN MWENDA","remarks":""},{"id":73,"date":"2026-05-13","cameraStatus":"CAMERA 3 OFFLINE - REPORTED","nvrStatus":"NVR STORAGE 85% - ALERT SENT","checkedBy":"FACILITY IN-CHARGE","ictOfficer":"JOHN MWENDA","remarks":""},{"id":74,"date":"2026-05-14","cameraStatus":"ALL CAMERAS OPERATIONAL","nvrStatus":"NVR RECORDING - OK","checkedBy":"FACILITY IN-CHARGE","ictOfficer":"JOHN MWENDA","remarks":""},{"id":75,"date":"2026-05-15","cameraStatus":"CAMERA 3 OFFLINE - REPORTED","nvrStatus":"NVR STORAGE 85% - ALERT SENT","checkedBy":"SECURITY OFFICER - PETER KAMAU","ictOfficer":"ALICE WERU","remarks":"Minor dust cleaned from lens"},{"id":76,"date":"2026-05-18","cameraStatus":"CAMERA 7 BLURRY - CLEANED","nvrStatus":"NVR RECORDING - OK","checkedBy":"FACILITY IN-CHARGE","ictOfficer":"JOHN MWENDA","remarks":""},{"id":77,"date":"2026-05-19","cameraStatus":"ALL CAMERAS OPERATIONAL","nvrStatus":"NVR RECORDING - OK","checkedBy":"SECURITY OFFICER - PETER KAMAU","ictOfficer":"ALICE WERU","remarks":""},{"id":78,"date":"2026-05-20","cameraStatus":"ALL CAMERAS OPERATIONAL","nvrStatus":"NVR RECORDING - OK","checkedBy":"SECURITY OFFICER - SARAH NJOKI","ictOfficer":"JOHN MWENDA","remarks":""},{"id":79,"date":"2026-05-21","cameraStatus":"CAMERA 3 OFFLINE - REPORTED","nvrStatus":"NVR RECORDING - OK","checkedBy":"SECURITY OFFICER - SARAH NJOKI","ictOfficer":"ALICE WERU","remarks":""},{"id":80,"date":"2026-05-22","cameraStatus":"CAMERA 7 BLURRY - CLEANED","nvrStatus":"NVR RECORDING - OK","checkedBy":"FACILITY IN-CHARGE","ictOfficer":"ALICE WERU","remarks":""},{"id":81,"date":"2026-05-25","cameraStatus":"ALL CAMERAS OPERATIONAL","nvrStatus":"NVR RECORDING - OK","checkedBy":"SECURITY OFFICER - PETER KAMAU","ictOfficer":"JOHN MWENDA","remarks":""},{"id":82,"date":"2026-05-26","cameraStatus":"CAMERA 7 BLURRY - CLEANED","nvrStatus":"NVR STORAGE 85% - ALERT SENT","checkedBy":"FACILITY IN-CHARGE","ictOfficer":"ALICE WERU","remarks":"Minor dust cleaned from lens"},{"id":83,"date":"2026-05-27","cameraStatus":"ALL CAMERAS OPERATIONAL","nvrStatus":"NVR RECORDING - OK","checkedBy":"SECURITY OFFICER - SARAH NJOKI","ictOfficer":"ALICE WERU","remarks":""},{"id":84,"date":"2026-05-28","cameraStatus":"ALL CAMERAS OPERATIONAL","nvrStatus":"NVR RECORDING - OK","checkedBy":"SECURITY OFFICER - SARAH NJOKI","ictOfficer":"JOHN MWENDA","remarks":""},{"id":85,"date":"2026-05-29","cameraStatus":"ALL CAMERAS OPERATIONAL","nvrStatus":"NVR RECORDING - OK","checkedBy":"FACILITY IN-CHARGE","ictOfficer":"JOHN MWENDA","remarks":""},{"id":86,"date":"2026-06-01","cameraStatus":"ALL CAMERAS OPERATIONAL","nvrStatus":"NVR RECORDING - OK","checkedBy":"FACILITY IN-CHARGE","ictOfficer":"ALICE WERU","remarks":""},{"id":87,"date":"2026-06-02","cameraStatus":"ALL CAMERAS OPERATIONAL","nvrStatus":"NVR RECORDING - OK","checkedBy":"FACILITY IN-CHARGE","ictOfficer":"ALICE WERU","remarks":""},{"id":88,"date":"2026-06-03","cameraStatus":"CAMERA 7 BLURRY - CLEANED","nvrStatus":"NVR RECORDING - OK","checkedBy":"FACILITY IN-CHARGE","ictOfficer":"ALICE WERU","remarks":""},{"id":89,"date":"2026-06-04","cameraStatus":"CAMERA 3 OFFLINE - REPORTED","nvrStatus":"NVR RECORDING - OK","checkedBy":"FACILITY IN-CHARGE","ictOfficer":"ALICE WERU","remarks":""},{"id":90,"date":"2026-06-05","cameraStatus":"CAMERA 3 OFFLINE - REPORTED","nvrStatus":"NVR RECORDING - OK","checkedBy":"SECURITY OFFICER - SARAH NJOKI","ictOfficer":"JOHN MWENDA","remarks":""},{"id":91,"date":"2026-06-08","cameraStatus":"CAMERA 3 OFFLINE - REPORTED","nvrStatus":"NVR RECORDING - OK","checkedBy":"FACILITY IN-CHARGE","ictOfficer":"ALICE WERU","remarks":""},{"id":92,"date":"2026-06-09","cameraStatus":"ALL CAMERAS OPERATIONAL","nvrStatus":"NVR STORAGE 85% - ALERT SENT","checkedBy":"FACILITY IN-CHARGE","ictOfficer":"ALICE WERU","remarks":""},{"id":93,"date":"2026-06-10","cameraStatus":"CAMERA 3 OFFLINE - REPORTED","nvrStatus":"NVR RECORDING - OK","checkedBy":"SECURITY OFFICER - SARAH NJOKI","ictOfficer":"ALICE WERU","remarks":"Minor dust cleaned from lens"},{"id":94,"date":"2026-06-11","cameraStatus":"CAMERA 3 OFFLINE - REPORTED","nvrStatus":"NVR RECORDING - OK","checkedBy":"SECURITY OFFICER - PETER KAMAU","ictOfficer":"JOHN MWENDA","remarks":"Minor dust cleaned from lens"},{"id":95,"date":"2026-06-12","cameraStatus":"ALL CAMERAS OPERATIONAL","nvrStatus":"NVR STORAGE 85% - ALERT SENT","checkedBy":"SECURITY OFFICER - SARAH NJOKI","ictOfficer":"JOHN MWENDA","remarks":""},{"id":96,"date":"2026-06-15","cameraStatus":"ALL CAMERAS OPERATIONAL","nvrStatus":"NVR STORAGE 85% - ALERT SENT","checkedBy":"FACILITY IN-CHARGE","ictOfficer":"ALICE WERU","remarks":""},{"id":97,"date":"2026-06-16","cameraStatus":"CAMERA 3 OFFLINE - REPORTED","nvrStatus":"NVR STORAGE 85% - ALERT SENT","checkedBy":"FACILITY IN-CHARGE","ictOfficer":"JOHN MWENDA","remarks":""},{"id":98,"date":"2026-06-17","cameraStatus":"ALL CAMERAS OPERATIONAL","nvrStatus":"NVR RECORDING - OK","checkedBy":"SECURITY OFFICER - PETER KAMAU","ictOfficer":"JOHN MWENDA","remarks":""},{"id":99,"date":"2026-06-18","cameraStatus":"ALL CAMERAS OPERATIONAL","nvrStatus":"NVR RECORDING - OK","checkedBy":"SECURITY OFFICER - PETER KAMAU","ictOfficer":"JOHN MWENDA","remarks":""},{"id":100,"date":"2026-06-19","cameraStatus":"ALL CAMERAS OPERATIONAL","nvrStatus":"NVR RECORDING - OK","checkedBy":"SECURITY OFFICER - PETER KAMAU","ictOfficer":"ALICE WERU","remarks":""},{"id":101,"date":"2026-06-22","cameraStatus":"ALL CAMERAS OPERATIONAL","nvrStatus":"NVR RECORDING - OK","checkedBy":"SECURITY OFFICER - SARAH NJOKI","ictOfficer":"ALICE WERU","remarks":""},{"id":102,"date":"2026-06-23","cameraStatus":"ALL CAMERAS OPERATIONAL","nvrStatus":"NVR RECORDING - OK","checkedBy":"SECURITY OFFICER - PETER KAMAU","ictOfficer":"ALICE WERU","remarks":""},{"id":103,"date":"2026-06-24","cameraStatus":"CAMERA 3 OFFLINE - REPORTED","nvrStatus":"NVR RECORDING - OK","checkedBy":"FACILITY IN-CHARGE","ictOfficer":"ALICE WERU","remarks":""},{"id":104,"date":"2026-06-25","cameraStatus":"CAMERA 7 BLURRY - CLEANED","nvrStatus":"NVR RECORDING - OK","checkedBy":"SECURITY OFFICER - PETER KAMAU","ictOfficer":"ALICE WERU","remarks":""},{"id":105,"date":"2026-06-26","cameraStatus":"CAMERA 7 BLURRY - CLEANED","nvrStatus":"NVR RECORDING - OK","checkedBy":"FACILITY IN-CHARGE","ictOfficer":"JOHN MWENDA","remarks":"Minor dust cleaned from lens"},{"id":106,"date":"2026-06-29","cameraStatus":"CAMERA 3 OFFLINE - REPORTED","nvrStatus":"NVR RECORDING - OK","checkedBy":"FACILITY IN-CHARGE","ictOfficer":"JOHN MWENDA","remarks":""},{"id":107,"date":"2026-06-30","cameraStatus":"ALL CAMERAS OPERATIONAL","nvrStatus":"NVR RECORDING - OK","checkedBy":"SECURITY OFFICER - SARAH NJOKI","ictOfficer":"ALICE WERU","remarks":""},{"id":108,"date":"2026-07-01","cameraStatus":"ALL CAMERAS OPERATIONAL","nvrStatus":"NVR RECORDING - OK","checkedBy":"SECURITY OFFICER - PETER KAMAU","ictOfficer":"ALICE WERU","remarks":""},{"id":109,"date":"2026-07-02","cameraStatus":"ALL CAMERAS OPERATIONAL","nvrStatus":"NVR RECORDING - OK","checkedBy":"FACILITY IN-CHARGE","ictOfficer":"ALICE WERU","remarks":""},{"id":110,"date":"2026-07-03","cameraStatus":"CAMERA 7 BLURRY - CLEANED","nvrStatus":"NVR RECORDING - OK","checkedBy":"SECURITY OFFICER - SARAH NJOKI","ictOfficer":"ALICE WERU","remarks":""},{"id":111,"date":"2026-07-06","cameraStatus":"ALL CAMERAS OPERATIONAL","nvrStatus":"NVR STORAGE 85% - ALERT SENT","checkedBy":"SECURITY OFFICER - SARAH NJOKI","ictOfficer":"JOHN MWENDA","remarks":""},{"id":112,"date":"2026-07-07","cameraStatus":"ALL CAMERAS OPERATIONAL","nvrStatus":"NVR RECORDING - OK","checkedBy":"SECURITY OFFICER - SARAH NJOKI","ictOfficer":"ALICE WERU","remarks":""},{"id":113,"date":"2026-07-08","cameraStatus":"ALL CAMERAS OPERATIONAL","nvrStatus":"NVR STORAGE 85% - ALERT SENT","checkedBy":"SECURITY OFFICER - SARAH NJOKI","ictOfficer":"JOHN MWENDA","remarks":""},{"id":114,"date":"2026-07-09","cameraStatus":"ALL CAMERAS OPERATIONAL","nvrStatus":"NVR RECORDING - OK","checkedBy":"SECURITY OFFICER - SARAH NJOKI","ictOfficer":"JOHN MWENDA","remarks":"Minor dust cleaned from lens"},{"id":115,"date":"2026-07-10","cameraStatus":"ALL CAMERAS OPERATIONAL","nvrStatus":"NVR STORAGE 85% - ALERT SENT","checkedBy":"SECURITY OFFICER - SARAH NJOKI","ictOfficer":"JOHN MWENDA","remarks":"Minor dust cleaned from lens"},{"id":116,"date":"2026-07-13","cameraStatus":"ALL CAMERAS OPERATIONAL","nvrStatus":"NVR RECORDING - OK","checkedBy":"SECURITY OFFICER - PETER KAMAU","ictOfficer":"ALICE WERU","remarks":""},{"id":117,"date":"2026-07-14","cameraStatus":"ALL CAMERAS OPERATIONAL","nvrStatus":"NVR RECORDING - OK","checkedBy":"SECURITY OFFICER - SARAH NJOKI","ictOfficer":"ALICE WERU","remarks":""},{"id":118,"date":"2026-07-15","cameraStatus":"ALL CAMERAS OPERATIONAL","nvrStatus":"NVR RECORDING - OK","checkedBy":"FACILITY IN-CHARGE","ictOfficer":"JOHN MWENDA","remarks":""},{"id":119,"date":"2026-07-16","cameraStatus":"CAMERA 7 BLURRY - CLEANED","nvrStatus":"NVR STORAGE 85% - ALERT SENT","checkedBy":"FACILITY IN-CHARGE","ictOfficer":"JOHN MWENDA","remarks":""}];
const CCTV_WEEKLY_SEED   = [{"id":1,"date":"2026-02-03","recordingVerified":true,"storageSpaceGb":135,"networkConnectivity":"STABLE","firmwareUpdated":false,"conductedBy":"ICT DEPARTMENT","ictOfficer":"JOHN MWENDA","remarks":""},{"id":2,"date":"2026-02-10","recordingVerified":true,"storageSpaceGb":184,"networkConnectivity":"STABLE","firmwareUpdated":false,"conductedBy":"ICT DEPARTMENT","ictOfficer":"JOHN MWENDA","remarks":""},{"id":3,"date":"2026-02-17","recordingVerified":true,"storageSpaceGb":308,"networkConnectivity":"STABLE","firmwareUpdated":false,"conductedBy":"ICT DEPARTMENT","ictOfficer":"JOHN MWENDA","remarks":""},{"id":4,"date":"2026-02-24","recordingVerified":true,"storageSpaceGb":279,"networkConnectivity":"STABLE","firmwareUpdated":false,"conductedBy":"ICT DEPARTMENT","ictOfficer":"ALICE WERU","remarks":""},{"id":5,"date":"2026-03-03","recordingVerified":false,"storageSpaceGb":323,"networkConnectivity":"INTERMITTENT","firmwareUpdated":false,"conductedBy":"ICT DEPARTMENT","ictOfficer":"JOHN MWENDA","remarks":"Cleared old recordings to free space"},{"id":6,"date":"2026-03-10","recordingVerified":true,"storageSpaceGb":427,"networkConnectivity":"STABLE","firmwareUpdated":false,"conductedBy":"ICT DEPARTMENT","ictOfficer":"JOHN MWENDA","remarks":""},{"id":7,"date":"2026-03-17","recordingVerified":false,"storageSpaceGb":309,"networkConnectivity":"STABLE","firmwareUpdated":false,"conductedBy":"ICT DEPARTMENT","ictOfficer":"ALICE WERU","remarks":"Cleared old recordings to free space"},{"id":8,"date":"2026-03-24","recordingVerified":false,"storageSpaceGb":370,"networkConnectivity":"STABLE","firmwareUpdated":false,"conductedBy":"ICT DEPARTMENT","ictOfficer":"ALICE WERU","remarks":""},{"id":9,"date":"2026-03-31","recordingVerified":false,"storageSpaceGb":198,"networkConnectivity":"STABLE","firmwareUpdated":false,"conductedBy":"ICT DEPARTMENT","ictOfficer":"ALICE WERU","remarks":""},{"id":10,"date":"2026-04-07","recordingVerified":false,"storageSpaceGb":358,"networkConnectivity":"STABLE","firmwareUpdated":true,"conductedBy":"ICT DEPARTMENT","ictOfficer":"ALICE WERU","remarks":""},{"id":11,"date":"2026-04-14","recordingVerified":true,"storageSpaceGb":164,"networkConnectivity":"STABLE","firmwareUpdated":true,"conductedBy":"ICT DEPARTMENT","ictOfficer":"JOHN MWENDA","remarks":""},{"id":12,"date":"2026-04-21","recordingVerified":false,"storageSpaceGb":292,"networkConnectivity":"STABLE","firmwareUpdated":false,"conductedBy":"ICT DEPARTMENT","ictOfficer":"ALICE WERU","remarks":"Cleared old recordings to free space"},{"id":13,"date":"2026-04-28","recordingVerified":true,"storageSpaceGb":301,"networkConnectivity":"STABLE","firmwareUpdated":false,"conductedBy":"ICT DEPARTMENT","ictOfficer":"ALICE WERU","remarks":""},{"id":14,"date":"2026-05-05","recordingVerified":true,"storageSpaceGb":163,"networkConnectivity":"STABLE","firmwareUpdated":false,"conductedBy":"ICT DEPARTMENT","ictOfficer":"ALICE WERU","remarks":""},{"id":15,"date":"2026-05-12","recordingVerified":true,"storageSpaceGb":363,"networkConnectivity":"INTERMITTENT","firmwareUpdated":false,"conductedBy":"ICT DEPARTMENT","ictOfficer":"ALICE WERU","remarks":""},{"id":16,"date":"2026-05-19","recordingVerified":true,"storageSpaceGb":270,"networkConnectivity":"STABLE","firmwareUpdated":false,"conductedBy":"ICT DEPARTMENT","ictOfficer":"JOHN MWENDA","remarks":""},{"id":17,"date":"2026-05-26","recordingVerified":true,"storageSpaceGb":362,"networkConnectivity":"INTERMITTENT","firmwareUpdated":false,"conductedBy":"ICT DEPARTMENT","ictOfficer":"ALICE WERU","remarks":""},{"id":18,"date":"2026-06-02","recordingVerified":true,"storageSpaceGb":300,"networkConnectivity":"INTERMITTENT","firmwareUpdated":false,"conductedBy":"ICT DEPARTMENT","ictOfficer":"ALICE WERU","remarks":""},{"id":19,"date":"2026-06-09","recordingVerified":true,"storageSpaceGb":218,"networkConnectivity":"STABLE","firmwareUpdated":false,"conductedBy":"ICT DEPARTMENT","ictOfficer":"JOHN MWENDA","remarks":"Cleared old recordings to free space"},{"id":20,"date":"2026-06-16","recordingVerified":false,"storageSpaceGb":261,"networkConnectivity":"INTERMITTENT","firmwareUpdated":false,"conductedBy":"ICT DEPARTMENT","ictOfficer":"ALICE WERU","remarks":""},{"id":21,"date":"2026-06-23","recordingVerified":true,"storageSpaceGb":271,"networkConnectivity":"STABLE","firmwareUpdated":false,"conductedBy":"ICT DEPARTMENT","ictOfficer":"ALICE WERU","remarks":"Cleared old recordings to free space"},{"id":22,"date":"2026-06-30","recordingVerified":true,"storageSpaceGb":260,"networkConnectivity":"STABLE","firmwareUpdated":true,"conductedBy":"ICT DEPARTMENT","ictOfficer":"ALICE WERU","remarks":""},{"id":23,"date":"2026-07-07","recordingVerified":true,"storageSpaceGb":446,"networkConnectivity":"STABLE","firmwareUpdated":false,"conductedBy":"ICT DEPARTMENT","ictOfficer":"JOHN MWENDA","remarks":""},{"id":24,"date":"2026-07-14","recordingVerified":false,"storageSpaceGb":365,"networkConnectivity":"STABLE","firmwareUpdated":false,"conductedBy":"ICT DEPARTMENT","ictOfficer":"JOHN MWENDA","remarks":""}];
const CCTV_FOOTAGE_SEED  = [{"id":1,"date":"2026-02-14","facility":"MUKURWEINI SUB-COUNTY HOSPITAL","reason":"Investigation of missing equipment from store","footageDate":"2026-02-12","authorizedBy":"FACILITY IN-CHARGE","retrievedBy":"JOHN MWENDA","ictOfficer":"JOHN MWENDA","witness":"SECURITY OFFICER"},{"id":2,"date":"2026-02-28","facility":"MUKURWEINI SUB-COUNTY HOSPITAL","reason":"Verification of access times - HR request","footageDate":"2026-02-25","authorizedBy":"FACILITY IN-CHARGE","retrievedBy":"ALICE WERU","ictOfficer":"ALICE WERU","witness":"HR OFFICER"},{"id":3,"date":"2026-03-15","facility":"MUKURWEINI SUB-COUNTY HOSPITAL","reason":"Patient complaint - alleged staff misconduct","footageDate":"2026-03-14","authorizedBy":"MEDICAL SUPERINTENDENT","retrievedBy":"JOHN MWENDA","ictOfficer":"JOHN MWENDA","witness":"SECURITY OFFICER"},{"id":4,"date":"2026-04-03","facility":"MUKURWEINI SUB-COUNTY HOSPITAL","reason":"Theft investigation - pharmacy corridor","footageDate":"2026-04-01","authorizedBy":"FACILITY IN-CHARGE","retrievedBy":"JOHN MWENDA","ictOfficer":"JOHN MWENDA","witness":"POLICE OFFICER - OB NO 045/2026"},{"id":5,"date":"2026-04-22","facility":"MUKURWEINI SUB-COUNTY HOSPITAL","reason":"Routine quality audit","footageDate":"2026-04-20","authorizedBy":"COUNTY ICT AUDITOR","retrievedBy":"ALICE WERU","ictOfficer":"ALICE WERU","witness":"FACILITY IN-CHARGE"},{"id":6,"date":"2026-05-10","facility":"MUKURWEINI SUB-COUNTY HOSPITAL","reason":"Accident verification - parking area incident","footageDate":"2026-05-09","authorizedBy":"FACILITY IN-CHARGE","retrievedBy":"ALICE WERU","ictOfficer":"ALICE WERU","witness":"SECURITY OFFICER"},{"id":7,"date":"2026-06-05","facility":"MUKURWEINI SUB-COUNTY HOSPITAL","reason":"Staff attendance verification - disciplinary case","footageDate":"2026-06-03","authorizedBy":"MEDICAL SUPERINTENDENT","retrievedBy":"JOHN MWENDA","ictOfficer":"JOHN MWENDA","witness":"HR OFFICER"},{"id":8,"date":"2026-07-02","facility":"MUKURWEINI SUB-COUNTY HOSPITAL","reason":"Vandalism report - male ward window","footageDate":"2026-07-01","authorizedBy":"FACILITY IN-CHARGE","retrievedBy":"ALICE WERU","ictOfficer":"ALICE WERU","witness":"SECURITY OFFICER"}];
const CCTV_INCIDENT_SEED = [{"id":1,"dateTime":"2026-02-19 14:30","natureOfIncident":"Camera 5 (Maternity corridor) went offline unexpectedly","reportedBy":"SECURITY OFFICER","ictOfficer":"JOHN MWENDA","actionTaken":"ICT Officer notified. Power adapter replaced. Camera restored by 16:00.","status":"RESOLVED"},{"id":2,"dateTime":"2026-03-08 08:15","natureOfIncident":"NVR showing storage full warning - recording paused","reportedBy":"FACILITY IN-CHARGE","ictOfficer":"JOHN MWENDA","actionTaken":"ICT Officer cleared old footage. Recording resumed.","status":"RESOLVED"},{"id":3,"dateTime":"2026-04-01 23:50","natureOfIncident":"Suspected tampering - Camera 2 angle shifted at main entrance","reportedBy":"NIGHT SECURITY OFFICER","ictOfficer":"ALICE WERU","actionTaken":"Camera repositioned and secured. Reported to Security and HR.","status":"UNDER INVESTIGATION"},{"id":4,"dateTime":"2026-05-20 11:00","natureOfIncident":"Power outage - UPS failure caused 2-hour recording gap","reportedBy":"JOHN MWENDA","ictOfficer":"JOHN MWENDA","actionTaken":"UPS battery replaced. Generator backup configured.","status":"RESOLVED"},{"id":5,"dateTime":"2026-06-17 09:30","natureOfIncident":"Remote access credentials expired - county monitoring disrupted","reportedBy":"COUNTY ICT TEAM","ictOfficer":"ALICE WERU","actionTaken":"Credentials renewed and remote VPN reconfigured.","status":"RESOLVED"},{"id":6,"dateTime":"2026-07-10 16:45","natureOfIncident":"Camera 9 (Pharmacy) lens cracked - possible vandalism","reportedBy":"SECURITY OFFICER","ictOfficer":"JOHN MWENDA","actionTaken":"Camera covered and reported. Replacement ordered.","status":"PENDING"}];

function seedCCTV(){
  if(!db.get('cctvDaily').value())    { db.set('cctvDaily',    CCTV_DAILY_SEED).write();    console.log('CCTV daily seeded:',    CCTV_DAILY_SEED.length); }
  if(!db.get('cctvWeekly').value())   { db.set('cctvWeekly',   CCTV_WEEKLY_SEED).write();   console.log('CCTV weekly seeded:',   CCTV_WEEKLY_SEED.length); }
  if(!db.get('cctvFootage').value())  { db.set('cctvFootage',  CCTV_FOOTAGE_SEED).write();  console.log('CCTV footage seeded:',  CCTV_FOOTAGE_SEED.length); }
  if(!db.get('cctvIncident').value()) { db.set('cctvIncident', CCTV_INCIDENT_SEED).write(); console.log('CCTV incident seeded:', CCTV_INCIDENT_SEED.length); }
  if(!db.get('ictOfficers').value())  {
    db.set('ictOfficers', [
      { id: 1, name: 'JOHN MWENDA' },
      { id: 2, name: 'ALICE WERU' },
      { id: 3, name: 'COUNTY ICT TEAM' }
    ]).write();
    console.log('ICT officers seeded: 3');
  }
}
seedCCTV();
backfillMissingDailyLogs();

// ICT OFFICERS CRUD
app.get('/api/ict-officers', requireAuth, (req, res) => {
  res.json(db.get('ictOfficers').value() || []);
});
app.post('/api/ict-officers', requirePermission('manageDigitalForms'), (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'name required' });
  const list = db.get('ictOfficers').value() || [];
  if (list.find(o => o.name.toLowerCase() === name.trim().toLowerCase()))
    return res.status(409).json({ error: 'Officer already exists' });
  const id = list.length ? Math.max(...list.map(o => o.id)) + 1 : 1;
  const officer = { id, name: name.trim().toUpperCase() };
  db.get('ictOfficers').push(officer).write();
  res.status(201).json(officer);
});
app.patch('/api/ict-officers/:id', requirePermission('manageDigitalForms'), (req, res) => {
  const id = Number(req.params.id);
  const { name } = req.body;
  const officer = db.get('ictOfficers').find({ id }).value();
  if (!officer) return res.status(404).json({ error: 'Officer not found' });
  db.get('ictOfficers').find({ id }).assign({ name: (name||'').trim().toUpperCase() }).write();
  res.json(db.get('ictOfficers').find({ id }).value());
});
app.delete('/api/ict-officers/:id', requirePermission('manageDigitalForms'), (req, res) => {
  const id = Number(req.params.id);
  const officer = db.get('ictOfficers').find({ id }).value();
  if (!officer) return res.status(404).json({ error: 'Officer not found' });
  db.get('ictOfficers').remove({ id }).write();
  res.status(204).send();
});


function nextCCTVId(col){ const items = db.get(col).value() || []; return items.length ? Math.max(...items.map(i => i.id)) + 1 : 1; }

// Each log type's primary date field used for range filtering
const CCTV_DATE_FIELD = { cctvDaily: 'date', cctvWeekly: 'date', cctvFootage: 'date', cctvIncident: 'dateTime' };

function filterByDateRange(rows, field, from, to) {
  let out = rows;
  if (from) out = out.filter(r => (r[field] || '').slice(0,10) >= from);
  if (to)   out = out.filter(r => (r[field] || '').slice(0,10) <= to);
  return out;
}

// ── AUTO-FILL MISSED DAILY CHECKLIST DAYS ─────────────────────────────────
// If a day passes with no daily checklist entry, backfill it the next time
// the server starts or the daily log is fetched, so no day is ever silently skipped.
function backfillMissingDailyLogs() {
  const rows = db.get('cctvDaily').value() || [];
  const todayStr = new Date().toISOString().slice(0, 10);

  const existingDates = new Set(rows.map(r => r.date));
  let lastDate;
  if (rows.length) {
    lastDate = rows.map(r => r.date).sort().slice(-1)[0];
  } else {
    // Nothing seeded yet — nothing to backfill against, skip
    return;
  }

  let cursor = new Date(lastDate);
  cursor.setDate(cursor.getDate() + 1);
  const today = new Date(todayStr);

  const toInsert = [];
  while (cursor < today) {
    const dateStr = cursor.toISOString().slice(0, 10);
    if (!existingDates.has(dateStr)) {
      toInsert.push({
        date: dateStr,
        cameraStatus: "NOT CHECKED - AUTO-FILLED",
        nvrStatus: "NOT CHECKED - AUTO-FILLED",
        checkedBy: "SYSTEM",
        ictOfficer: "",
        remarks: "No entry was made for this date. Automatically filled by the system."
      });
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  if (toInsert.length) {
    let nextId = rows.length ? Math.max(...rows.map(r => r.id)) + 1 : 1;
    toInsert.forEach(row => { row.id = nextId++; });
    db.get('cctvDaily').push(...toInsert).write();
    console.log(`Auto-filled ${toInsert.length} missed daily checklist day(s)`);
  }
}

// ── CCTV ROUTES ───────────────────────────────────────────────────────────
['daily','weekly','footage','incident'].forEach(kind => {
  const col = 'cctv' + kind.charAt(0).toUpperCase() + kind.slice(1);
  const dateField = CCTV_DATE_FIELD[col];

  app.get(`/api/cctv/${kind}`, requireAuth, (req, res) => {
    if (kind === 'daily') backfillMissingDailyLogs();
    let rows = db.get(col).value() || [];
    rows = filterByDateRange(rows, dateField, req.query.from, req.query.to);
    res.json(rows.slice().sort((a,b) => (b[dateField]||'').localeCompare(a[dateField]||'')));
  });

  app.post(`/api/cctv/${kind}`, requirePermission('manageDigitalForms'), (req, res) => {
    const row = { id: nextCCTVId(col), ...req.body };
    db.get(col).push(row).write();
    logActivity(req, 'ADD_CCTV_' + kind.toUpperCase(), 'CCTV', row.id, {});
    res.status(201).json(row);
  });

  app.patch(`/api/cctv/${kind}/:id`, requirePermission('manageDigitalForms'), (req, res) => {
    const id = Number(req.params.id);
    const row = db.get(col).find({ id }).value();
    if (!row) return res.status(404).json({ error: 'Not found' });
    db.get(col).find({ id }).assign(req.body).write();
    logActivity(req, 'EDIT_CCTV_' + kind.toUpperCase(), 'CCTV', id, req.body);
    res.json(db.get(col).find({ id }).value());
  });

  app.delete(`/api/cctv/${kind}/:id`, requirePermission('manageDigitalForms'), (req, res) => {
    const id = Number(req.params.id);
    const row = db.get(col).find({ id }).value();
    if (!row) return res.status(404).json({ error: 'Not found' });
    db.get(col).remove({ id }).write();
    logActivity(req, 'DELETE_CCTV_' + kind.toUpperCase(), 'CCTV', id, {});
    res.status(204).send();
  });
});

// EXPORT EXCEL — all entries, all 4 sheets, no filtering applied
app.get('/api/cctv/export/xlsx', requireAuth, async (req, res) => {
  try {
    const ExcelJS = require('exceljs');
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Mukurweini Hospital Stores';
    const teal = { argb: 'FF0F766E' }, white = { argb: 'FFFFFFFF' };
    const hdrStyle = (row) => { row.font = { bold: true, color: white }; row.fill = { type: 'pattern', pattern: 'solid', fgColor: teal }; };

    const daily = db.get('cctvDaily').value() || [];
    const ws1 = wb.addWorksheet('Daily Checklist');
    ws1.addRow(['MUKURWEINI HOSPITAL - DAILY CCTV CHECKLIST LOG']);
    ws1.getRow(1).font = { bold: true, size: 12 };
    hdrStyle(ws1.addRow(['#','Date','Camera Status','NVR/DVR Status','Checked By','ICT Officer','Remarks']));
    daily.slice().sort((a,b)=>a.date.localeCompare(b.date)).forEach((r,i) => {
      ws1.addRow([i+1, r.date, r.cameraStatus, r.nvrStatus, r.checkedBy, r.ictOfficer||'', r.remarks]);
    });
    ws1.columns = [4,14,32,26,24,20,30].map(w => ({ width: w }));

    const weekly = db.get('cctvWeekly').value() || [];
    const ws2 = wb.addWorksheet('Weekly Maintenance');
    ws2.addRow(['MUKURWEINI HOSPITAL - WEEKLY CCTV MAINTENANCE LOG']);
    ws2.getRow(1).font = { bold: true, size: 12 };
    hdrStyle(ws2.addRow(['#','Date','Recording OK','Storage (GB free)','Network','Firmware Updated','Conducted By','ICT Officer','Remarks']));
    weekly.slice().sort((a,b)=>a.date.localeCompare(b.date)).forEach((r,i) => {
      ws2.addRow([i+1, r.date, r.recordingVerified?'YES':'NO', r.storageSpaceGb, r.networkConnectivity, r.firmwareUpdated?'YES':'NO', r.conductedBy, r.ictOfficer||'', r.remarks]);
    });
    ws2.columns = [4,14,14,16,14,18,20,20,34].map(w => ({ width: w }));

    const footage = db.get('cctvFootage').value() || [];
    const ws3 = wb.addWorksheet('Footage Access Log');
    ws3.addRow(['MUKURWEINI HOSPITAL - FOOTAGE ACCESS LOG']);
    ws3.getRow(1).font = { bold: true, size: 12 };
    hdrStyle(ws3.addRow(['#','Date','Facility','Reason','Footage Date','Authorized By','Retrieved By','ICT Officer','Witness']));
    footage.slice().sort((a,b)=>a.date.localeCompare(b.date)).forEach((r,i) => {
      ws3.addRow([i+1, r.date, r.facility, r.reason, r.footageDate, r.authorizedBy, r.retrievedBy, r.ictOfficer||'', r.witness]);
    });
    ws3.columns = [4,14,28,40,14,24,20,20,24].map(w => ({ width: w }));

    const incident = db.get('cctvIncident').value() || [];
    const ws4 = wb.addWorksheet('Incident Reports');
    ws4.addRow(['MUKURWEINI HOSPITAL - CCTV INCIDENT LOG']);
    ws4.getRow(1).font = { bold: true, size: 12 };
    hdrStyle(ws4.addRow(['#','Date & Time','Nature of Incident','Reported By','ICT Officer','Action Taken','Status']));
    incident.slice().sort((a,b)=>a.dateTime.localeCompare(b.dateTime)).forEach((r,i) => {
      ws4.addRow([i+1, r.dateTime, r.natureOfIncident, r.reportedBy, r.ictOfficer||'', r.actionTaken, r.status]);
    });
    ws4.columns = [4,18,44,22,20,48,18].map(w => ({ width: w }));

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="cctv-logs.xlsx"');
    const buffer = await wb.xlsx.writeBuffer();
    res.setHeader('Content-Length', buffer.length);
    res.end(buffer);
  } catch (e) {
    console.error('CCTV export error:', e);
    res.status(500).json({ error: 'Export failed: ' + e.message });
  }
});

app.listen(PORT, () => {
    console.log(`\n✅ Store Monitor API running → http://localhost:${PORT}`);
    console.log(`   Data: ${dataPath}`);
    console.log(`   Supabase sync: ${supabase ? "enabled" : "disabled"}\n`);
  });
});
