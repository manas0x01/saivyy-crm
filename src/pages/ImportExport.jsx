import React, { useState, useRef, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Upload, Download, FileSpreadsheet, CheckCircle, FileDown, Database, Users, Crown, ArrowRight
} from "lucide-react";
import * as XLSX from "xlsx";
import { T } from "../tokens";
import { useCrm } from "../store/CrmContext";
import { useAuth } from "../store/AuthContext";
import { useToast } from "../components/ToastContext";
import { FormField, Input } from "../components/Modal";
import { bulkCreateLeads } from "../services/api";

// Case-insensitive flexible key locator
function findRowValue(row, possibleKeys, fallbackIndex = -1) {
  if (!row || typeof row !== "object") return "";
  const rowKeys = Object.keys(row);

  for (const p of possibleKeys) {
    const pClean = p.toLowerCase().replace(/[^a-z0-9]/g, "");
    const matchedKey = rowKeys.find(k => k.trim().toLowerCase().replace(/[^a-z0-9]/g, "") === pClean);
    if (matchedKey !== undefined) {
      const v = row[matchedKey];
      if (v !== undefined && v !== null && String(v).trim() !== "" && String(v).trim() !== "0") {
        return String(v).trim();
      }
    }
  }

  const fuzzyKey = rowKeys.find(k => {
    const clean = k.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
    return possibleKeys.some(p => {
      const pClean = p.toLowerCase().replace(/[^a-z0-9]/g, "");
      // Only fuzzy match when column name and key are close in length (within 5 chars)
      // This prevents "business" matching "businessdetails" (a long descriptive column)
      if (Math.abs(clean.length - pClean.length) > 5) return false;
      return clean.includes(pClean) || pClean.includes(clean);
    });
  });

  if (fuzzyKey !== undefined) {
    const v = row[fuzzyKey];
    if (v !== undefined && v !== null && String(v).trim() !== "" && String(v).trim() !== "0") {
      return String(v).trim();
    }
  }

  if (fallbackIndex >= 0 && rowKeys[fallbackIndex] !== undefined) {
    const v = row[rowKeys[fallbackIndex]];
    if (v !== undefined && v !== null) return String(v).trim();
  }
  return "";
}

function parseMaybeNumber(value) {
  if (value === undefined || value === null) return null;
  const cleaned = String(value).replace(/[^0-9.-]/g, "").trim();
  if (cleaned === "") return null;
  const parsed = parseInt(cleaned, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

/**
 * Extracts a valid Indian 10-digit mobile number (starts with 6-9).
 * Returns the clean 10-digit string, or null if it's a landline/invalid.
 */
function normalizeMobile(rawValue) {
  if (rawValue === undefined || rawValue === null) return null;
  const raw = String(rawValue).trim();
  if (!raw) return null;

  // If the cell has multiple numbers (slash or comma separated), try each one
  const parts = raw.split(/[,\/]/);
  for (let part of parts) {
    let p = part.trim();
    if (!p) continue;

    // Strip name/notes after a dash followed by letters (e.g. "9327... - Mr. XYZ")
    p = p.split(/\s*[-–]\s*[A-Za-z]/)[0].trim();

    // Strip common prefixes like "Mob :", "Mobile:", "Ph:"
    p = p.replace(/^(mob(?:ile)?|tel(?:ephone)?|phone|ph|contact)[^0-9+]*/i, '').trim();

    // Keep only digits (drop spaces, dashes, dots, parens, +)
    p = p.replace(/[^\d]/g, '');

    if (!p) continue;

    // Strip country code 91 if present
    if (p.length === 12 && p.startsWith('91')) p = p.slice(2);
    // Strip leading 0 (STD trunk prefix)
    if (p.length === 11 && p.startsWith('0')) p = p.slice(1);

    // Valid Indian mobile: exactly 10 digits, starts with 6, 7, 8, or 9
    if (/^[6-9]\d{9}$/.test(p)) return p;
  }

  return null; // landline, toll-free, short number, or garbage
}

function createLeadId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return `L-${crypto.randomUUID()}`;
  return `L-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export default function ImportExport() {
  const navigate = useNavigate();
  const { state, dispatch, refreshData } = useCrm();
  const { user, fetchOrgMembers } = useAuth();
  const toast = useToast();

  // Fetch employees / org members with login accounts for assignment
  const [orgMembers, setOrgMembers] = useState([]);
  useEffect(() => {
    if (user?.role === "Leader") {
      fetchOrgMembers()
        .then(members => setOrgMembers(members || []))
        .catch(() => {});
    }
  }, [user, fetchOrgMembers]);

  // Unified list of all team leaders, members, and staff for assignment
  const assignableMembers = useMemo(() => {
    const list = [];
    const seen = new Set();

    const addMember = (id, userId, name, email, role, tag) => {
      if (!name) return;
      // Exclude self (since self is selectable via the "Me (Leader)" option)
      if (id === user?.id || userId === user?.id || (email && user?.email && email.toLowerCase() === user.email.toLowerCase())) {
        return;
      }
      const key = (email && email.trim().toLowerCase()) || (userId || id);
      if (seen.has(key)) return;
      seen.add(key);

      const resolvedRole = role || tag || "Member";
      const isLeaderRole = resolvedRole === "Leader" || tag === "Leader" || resolvedRole === "Team Leader" || tag === "Team Leader" || resolvedRole === "Admin";

      list.push({
        id: userId || id,
        rawId: id,
        userId: userId || id,
        name: name.trim(),
        email: email || "",
        role: resolvedRole,
        isLeader: isLeaderRole
      });
    };

    // 1. Add members from state.team (CRM Team Directory)
    (state.team || []).forEach(m => {
      const account = (orgMembers || []).find(u => u.email && m.email && u.email.toLowerCase() === m.email.toLowerCase());
      addMember(m.id, account?.id || m.userId || m.id, m.name, m.email, account?.role || m.role, m.tag);
    });

    // 2. Add members from orgMembers (Backend login accounts)
    (orgMembers || []).forEach(u => {
      addMember(u.id, u.id, u.name, u.email, u.role, u.role);
    });

    return list;
  }, [state.team, orgMembers, user]);


  // Import State
  const [importMode, setImportMode] = useState("file"); // "file" | "text"
  const [fileData, setFileData] = useState(null);
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState([]);
  const [csvText, setCsvText] = useState("");
  const [importedCount, setImportedCount] = useState(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef(null);

  // Assignment: 'self' = keep for leader | <userId> = assign to that employee
  const [assignToUserId, setAssignToUserId] = useState("self");
  // Import Options
  const [importDealValue, setImportDealValue] = useState(""); // blank = read from file
  const [importProbability, setImportProbability] = useState(""); // blank = read from file

  // Read uploaded Excel (.xlsx, .xls) or CSV file
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setImportedCount(null);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const firstSheet = workbook.SheetNames[0];
        const sheet = workbook.Sheets[firstSheet];
        const jsonRows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
        if (jsonRows.length === 0) {
          toast.warning("Selected file is empty or has no readable rows.");
          return;
        }
        setHeaders(Object.keys(jsonRows[0]));
        setFileData(jsonRows);
      } catch (err) {
        toast.error("Error reading Excel/CSV file: " + err.message);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const dt = new DataTransfer();
      dt.items.add(file);
      if (fileInputRef.current) {
        fileInputRef.current.files = dt.files;
        handleFileUpload({ target: { files: dt.files } });
      }
    }
  };

  // Build a lead payload from a row
  const buildLeadPayload = (name, company, row, sourceName) => {
    const rawEmail = findRowValue(row, [
      "email", "emailid", "emailaddress", "email address", "e-mail", "mail", "contactemail", "primaryemail",
    ]);
    // Take only the first address if the cell contains multiple (e.g. "a@b.com, c@d.com")
    const email = rawEmail ? rawEmail.split(/[,;\/]/)[0].trim() : "";
    const rawPhone = findRowValue(row, [
      "phone", "phone no", "phone no.", "phone #", "phone number", "phonenumber",
      "mobile", "mobile no", "mobile no.", "mobile number", "mobilenumber", "mobileno",
      "mobile 1", "mobile1", "mobile 2", "mobile2",
      "telephone", "tel", "tel no", "tel no.", "cell", "cell no", "cell no.", "cellphone",
      "contactno", "contact no", "contact no.", "contact number", "contactnumber", "contact", "whatsapp",
    ]);
    const phone = normalizeMobile(rawPhone) || rawPhone || "";
    const title = findRowValue(row, ["tital", "title", "jobtitle", "designation", "role", "position"]);
    const status = findRowValue(row, ["status", "stage", "leadstatus"]) || "New";
    const priority = findRowValue(row, ["priority", "leadpriority"]) || "Medium";
    const source = findRowValue(row, ["source", "leadsource", "channel"]) || sourceName;
    const industry = findRowValue(row, ["industry", "domain", "sector"]);
    const location = findRowValue(row, ["location", "city", "address", "state"]);

    const fileDealValue = findRowValue(row, ["dealvalue", "value", "amount", "budget", "price"]);
    const rawDealValue = importDealValue.trim() || fileDealValue || "0";
    const dealValueNum = (() => {
      const n = parseMaybeNumber(importDealValue.trim() || fileDealValue);
      return n !== null ? n : 0;
    })();
    const dealValueDisplay = rawDealValue.startsWith("₹") ? rawDealValue : `₹${rawDealValue}`;

    const rawProb = importProbability.trim() || findRowValue(row, ["probability", "prob", "chancetowin", "winrate"]);
    const probability = Math.min(100, Math.max(0, parseMaybeNumber(rawProb) ?? 100));

    // Determine owner display name from assignment
    let ownerName = user?.name || "Leader";
    let targetUserId = assignToUserId === "self" ? (user?.id || null) : assignToUserId;

    if (assignToUserId !== "self") {
      const emp = assignableMembers.find(e => e.id === assignToUserId || e.userId === assignToUserId || e.rawId === assignToUserId);
      if (emp) {
        ownerName = emp.name;
        targetUserId = emp.userId || emp.id;
      }
    }

    const initials = name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) || "LD";
    const ownerInitials = ownerName.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);

    return {
      id: createLeadId(),
      name, company, email, phone, title, status, priority, source,
      owner: ownerName, ownerInitials, initials,
      score: 50, probability,
      dealValue: dealValueDisplay, dealValueNum,
      lastContact: new Date().toISOString(),
      nextFollowup: "Not scheduled",
      created: new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
      industry, location, website: "",
      notes: `Imported via ${sourceName}: ${fileName || "file"} — Assigned to ${ownerName}`,
      // userId: makes local state immediately correct so dashboards update without reload
      userId: targetUserId,
      // assignedUserId: tells the server to authorise storing under a different user
      assignedUserId: assignToUserId === "self" ? null : targetUserId,
    };
  };

  // File import confirm using high-speed atomic batch insert
  const confirmImport = async () => {
    if (!fileData || fileData.length === 0) return toast.warning("No file rows to import", "Import File");
    setImporting(true);
    let batchPayloads = [];
    let skipped = 0;
    const uploadTimestamp = new Date().toISOString();

    for (let i = 0; i < fileData.length; i++) {
      const row = fileData[i];

      // --- Name: try Title+FirstName+LastName combo first (IMS/exhibition format) ---
      const title     = findRowValue(row, ["tital", "title", "salutation", "prefix"]);
      const firstName = findRowValue(row, ["firstname", "first name", "first"]);
      const lastName  = findRowValue(row, ["lastname", "last name", "last"]);
      let name = [title, firstName, lastName].filter(Boolean).join(" ").trim();

      // Fallback: generic name columns
      if (!name) {
        name = findRowValue(row, ["name", "fullname", "leadname", "contact", "person", "customer", "contactperson", "client", "lead"], 0);
      }

      // --- Company: try exhibitor-specific columns first, then generic ---
      const company = (
        findRowValue(row, ["name of exhibitor", "exhibitor", "exhibitorname", "nameofexhibitor"]) ||
        findRowValue(row, ["company", "companyname", "organization", "org", "firm", "account"], 1) ||
        "Direct Client"
      );

      // If name still blank, fallback to company, then email/phone
      if (!name) {
        name = (company !== "Direct Client" ? company : "") ||
               findRowValue(row, ["email", "emailid", "mail"]) ||
               findRowValue(row, ["phone", "mobile"]);
      }

      // Skip rows with no valid phone number (rejects empty, missing, or invalid contacts)
      const rawPhoneVal = findRowValue(row, [
        "phone", "phone no", "phone no.", "phone #", "phone number", "phonenumber",
        "mobile", "mobile no", "mobile no.", "mobile number", "mobilenumber", "mobileno",
        "mobile 1", "mobile1", "mobile 2", "mobile2",
        "telephone", "tel", "tel no", "tel no.", "cell", "cell no", "cell no.", "cellphone",
        "contactno", "contact no", "contact no.", "contact number", "contactnumber", "contact", "whatsapp",
      ]);
      const validPhone = normalizeMobile(rawPhoneVal);
      if (!validPhone) {
        skipped++;
        continue;
      }

      const payload = {
        ...buildLeadPayload(name || "New Lead", company, row, "Excel Import"),
        phone: validPhone,
        uploadedAt: uploadTimestamp,
        batchIndex: batchPayloads.length,
      };
      batchPayloads.push(payload);
    }

    if (batchPayloads.length === 0) {
      setImporting(false);
      return toast.warning("Could not find any readable rows in the uploaded file.", "Empty Data");
    }

    try {
      // Chunk bulk requests in batches of 50 to stay well within Vercel serverless limits
      const CHUNK_SIZE = 50;
      let totalInserted = 0;
      for (let c = 0; c < batchPayloads.length; c += CHUNK_SIZE) {
        const chunk = batchPayloads.slice(c, c + CHUNK_SIZE);
        const res = await bulkCreateLeads(chunk);
        if (res?.error || res?.success === false) {
          throw new Error(res.error || `Server failed while importing batch ${Math.floor(c / CHUNK_SIZE) + 1}.`);
        }
        totalInserted += res?.inserted ?? chunk.length;
      }

      // Refresh from DB so the entire app and Leads view is fully synchronized
      if (refreshData) {
        await refreshData();
      }

      setImportedCount(totalInserted);
      setFileData(null);
      setFileName("");
      toast.success(`Successfully imported ${totalInserted} leads into the CRM!`, "Import Complete");

      // Redirect to Leads page so the user can immediately see the new leads
      setTimeout(() => {
        navigate("/leads");
      }, 700);
    } catch (err) {
      console.error("Import error:", err);
      toast.error(`Import failed: ${err.message || "Network error"}`);
    } finally {
      setImporting(false);
    }
  };

  // Text paste import using batch insert
  const handleTextImport = async () => {
    if (!csvText.trim()) return toast.warning("Paste CSV or tab-separated text first", "Pasted Text");
    setImporting(true);
    const lines = csvText.trim().split("\n");
    let batchPayloads = [];
    let skipped = 0;
    const uploadTimestamp = new Date().toISOString();

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      if (i === 0 && (line.toLowerCase().includes("name") || line.toLowerCase().includes("company"))) continue;
      let parts = [];
      if (line.includes("\t")) parts = line.split("\t");
      else if (line.includes(";")) parts = line.split(";");
      else parts = line.split(",");
      parts = parts.map(p => p.trim().replace(/^"|"$/g, ""));
      let name = parts[0];
      const company = parts[1] || "Direct Client";
      if (!name) {
        name = parts[2] || parts[3] || (company !== "Direct Client" ? company : "");
      }
      const phoneVal = parts[3] || "";
      const validPhone = normalizeMobile(phoneVal);
      if (!validPhone) {
        skipped++;
        continue;
      }
      const rowObj = { Name: name, Company: company, Email: parts[2] || "", Phone: validPhone, Status: parts[4] || "" };
      const payload = {
        ...buildLeadPayload(name || "New Lead", company, rowObj, "Pasted CSV"),
        phone: validPhone,
        uploadedAt: uploadTimestamp,
        batchIndex: batchPayloads.length,
      };
      batchPayloads.push(payload);
    }

    if (batchPayloads.length === 0) {
      setImporting(false);
      return toast.warning("No readable rows found in pasted text.");
    }

    try {
      const CHUNK_SIZE = 50;
      let totalInserted = 0;
      for (let c = 0; c < batchPayloads.length; c += CHUNK_SIZE) {
        const chunk = batchPayloads.slice(c, c + CHUNK_SIZE);
        const res = await bulkCreateLeads(chunk);
        if (res?.error || res?.success === false) {
          throw new Error(res.error || `Server rejected pasted batch ${Math.floor(c / CHUNK_SIZE) + 1}.`);
        }
        totalInserted += res?.inserted ?? chunk.length;
      }

      if (refreshData) {
        await refreshData();
      }
      setImportedCount(totalInserted);
      setCsvText("");
      toast.success(`Successfully imported ${totalInserted} leads into the CRM!`, "Import Complete");
      setTimeout(() => {
        navigate("/leads");
      }, 700);
    } catch (err) {
      toast.error(`Import failed: ${err.message || "Network error"}`);
    } finally {
      setImporting(false);
    }
  };

  // Download Sample Excel Template
  const downloadSampleTemplate = (format = "xlsx") => {
    const sampleData = [
      { "Name": "Anjali Rao", "Company": "Meridian Textiles", "Email": "anjali.rao@meridiantex.in", "Phone": "+91 98200 41123", "Title": "VP Operations", "Status": "Interested", "Priority": "High", "Deal Value": "₹18,40,000", "Probability": "65", "Source": "Referral", "Industry": "Textiles", "Location": "Ahmedabad", "Owner": "" },
      { "Name": "Devraj Shah", "Company": "Orbit Analytics", "Email": "devraj@orbitanalytics.io", "Phone": "+91 90040 88213", "Title": "Head of Growth", "Status": "Meeting Scheduled", "Priority": "High", "Deal Value": "₹9,80,000", "Probability": "48", "Source": "Website", "Industry": "SaaS", "Location": "Bengaluru", "Owner": "" },
      { "Name": "Priya Menon", "Company": "Verona Foods", "Email": "priya.menon@veronafoods.com", "Phone": "+91 99870 55210", "Title": "Procurement Lead", "Status": "Proposal Sent", "Priority": "Medium", "Deal Value": "₹6,20,000", "Probability": "35", "Source": "Outbound", "Industry": "Food & Beverage", "Location": "Pune", "Owner": "" },
    ];
    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Leads Template");
    if (format === "xlsx") XLSX.writeFile(wb, "crm_leads_sample_template.xlsx");
    else XLSX.writeFile(wb, "crm_leads_sample_template.csv", { bookType: "csv" });
    toast.info(`Downloaded sample leads template (${format.toUpperCase()})`, "Template Download");
  };

  const handleExport = (entity, format = "csv") => {
    let data = [];
    if (entity === "leads") data = state.leads;
    else if (entity === "deals") data = state.deals;
    else if (entity === "customers") data = state.customers;
    else if (entity === "companies") data = state.companies;
    else if (entity === "tasks") data = state.tasks;
    else if (entity === "activities") data = state.activities;

    if (!data || data.length === 0) return toast.warning(`No records found in ${entity} to export.`, "Export");
    if (format === "xlsx") {
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, entity.toUpperCase());
      XLSX.writeFile(wb, `saivyy_crm_${entity}.xlsx`);
    } else {
      const keys = Object.keys(data[0]);
      const csvRows = [keys.join(","), ...data.map(row => keys.map(k => `"${String(row[k] || '').replace(/"/g, '""')}"`).join(","))];
      const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `saivyy_crm_${entity}.csv`;
      a.click();
    }
    toast.success(`Exported ${data.length} ${entity} records to ${format.toUpperCase()}`, "Export Ready");
  };

  const handleMasterExport = () => {
    const wb = XLSX.utils.book_new();
    if (state.leads.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(state.leads), "Leads");
    if (state.deals.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(state.deals), "Deals");
    if (state.customers.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(state.customers), "Customers");
    if (state.companies.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(state.companies), "Companies");
    if (state.tasks.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(state.tasks), "Tasks");
    if (state.activities.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(state.activities), "Activities");
    XLSX.writeFile(wb, `saivyy_crm_full_database_backup_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success("Complete CRM SQLite database exported to Excel backup workbook!", "Master Backup");
  };

  return (
    <div className="p-5 flex flex-col gap-5 min-w-0">
      {/* Page Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="crm-display text-[20px] font-semibold flex items-center gap-2" style={{ color: T.ink }}>
            <FileSpreadsheet size={22} style={{ color: T.accent }} /> Import & Export Data Hub
          </h1>
          <p className="text-[13px] mt-0.5" style={{ color: T.inkFaint }}>
            Import Excel (.xlsx, .xls) & CSV spreadsheets · Export full CRM records in CSV or Excel
          </p>
        </div>
        <button
          onClick={handleMasterExport}
          className="crm-focusable flex items-center gap-2 px-3.5 py-2 rounded-lg text-[12.5px] font-semibold shadow-sm"
          style={{ background: T.ink, color: "#fff" }}
        >
          <Database size={15} /> Export Master Database (.xlsx)
        </button>
      </div>

      <div className="grid grid-cols-2 gap-5">
        {/* LEFT: IMPORT LEADS */}
        <div className="crm-card rounded-xl p-5 flex flex-col gap-4" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Upload size={18} style={{ color: T.accent }} />
              <h2 className="crm-display text-[15px] font-semibold" style={{ color: T.ink }}>Import Leads</h2>
            </div>
            <div className="flex items-center gap-1 p-1 rounded-lg" style={{ background: T.lineSoft }}>
              <button
                onClick={() => setImportMode("file")}
                className="crm-focusable px-2.5 py-1 rounded-md text-[11.5px] font-semibold"
                style={{ background: importMode === "file" ? T.surface : "transparent", color: importMode === "file" ? T.ink : T.inkFaint }}
              >
                Excel / CSV File
              </button>
              <button
                onClick={() => setImportMode("text")}
                className="crm-focusable px-2.5 py-1 rounded-md text-[11.5px] font-semibold"
                style={{ background: importMode === "text" ? T.surface : "transparent", color: importMode === "text" ? T.ink : T.inkFaint }}
              >
                Paste Data
              </button>
            </div>
          </div>

          {/* Sample Template Download Bar */}
          <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: T.canvas, border: `1px solid ${T.line}` }}>
            <div className="flex items-center gap-2">
              <FileDown size={15} style={{ color: T.accent }} />
              <span className="text-[12px] font-medium" style={{ color: T.inkSoft }}>Download blank template</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => downloadSampleTemplate("xlsx")} className="crm-focusable text-[11.5px] font-semibold underline" style={{ color: T.accent }}>
                .xlsx template
              </button>
              <span style={{ color: T.inkFaint }}>|</span>
              <button onClick={() => downloadSampleTemplate("csv")} className="crm-focusable text-[11.5px] font-semibold underline" style={{ color: T.accent }}>
                .csv template
              </button>
            </div>
          </div>

          {/* ── ASSIGNMENT PANEL — Leader only ── */}
          {user?.role === 'Leader' && (
          <div className="rounded-lg p-4 flex flex-col gap-3" style={{ background: T.canvas, border: `1px dashed ${T.line}` }}>
            <p className="text-[11.5px] font-semibold uppercase tracking-wide" style={{ color: T.inkFaint }}>
              Assign Imported Leads To
            </p>

            {/* Assignment cards */}
            <div className="grid grid-cols-2 gap-2">
              {/* Option: Keep for self (Leader) */}
              <button
                onClick={() => setAssignToUserId("self")}
                className="flex items-center gap-2.5 p-2.5 rounded-xl border-2 text-left transition-all"
                style={{
                  borderColor: assignToUserId === "self" ? T.accent : T.line,
                  background: assignToUserId === "self" ? T.accentSoft : T.surface,
                }}
              >
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold"
                  style={{ background: T.accent, color: "#fff" }}>
                  <Crown size={14} />
                </div>
                <div>
                  <p className="text-[12px] font-semibold" style={{ color: T.ink }}>Me (Leader)</p>
                  <p className="text-[10.5px]" style={{ color: T.inkFaint }}>{user?.name || "Leader"}</p>
                </div>
                {assignToUserId === "self" && (
                  <CheckCircle size={14} className="ml-auto shrink-0" style={{ color: T.accent }} />
                )}
              </button>

              {/* Employee & Team Leader options */}
              {assignableMembers.map(emp => {
                const ini = emp.name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
                const isSelected = assignToUserId === emp.id || assignToUserId === emp.userId || assignToUserId === emp.rawId;
                const isLeader = emp.isLeader;
                return (
                  <button
                    key={emp.id || emp.rawId}
                    onClick={() => setAssignToUserId(emp.id)}
                    className="flex items-center gap-2.5 p-2.5 rounded-xl border-2 text-left transition-all"
                    style={{
                      borderColor: isSelected ? (isLeader ? T.amber : T.positive) : T.line,
                      background: isSelected ? (isLeader ? T.amberSoft : T.positiveSoft) : T.surface,
                    }}
                  >
                    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold"
                      style={{
                        background: isLeader ? T.amberSoft : T.positive + "25",
                        color: isLeader ? T.amber : T.positive
                      }}>
                      {isLeader ? <Crown size={14} /> : ini}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1">
                        <p className="text-[12px] font-semibold truncate" style={{ color: T.ink }}>{emp.name}</p>
                        {isLeader && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md shrink-0"
                            style={{ background: T.amberSoft, color: T.amber }}>
                            Leader
                          </span>
                        )}
                      </div>
                      <p className="text-[10.5px] truncate" style={{ color: T.inkFaint }}>{emp.role}{emp.email ? ` · ${emp.email}` : ''}</p>
                    </div>
                    {isSelected && (
                      <CheckCircle size={14} className="ml-auto shrink-0" style={{ color: isLeader ? T.amber : T.positive }} />
                    )}
                  </button>
                );
              })}

              {assignableMembers.length === 0 && (
                <div className="col-span-2 text-center py-3 text-[11.5px]" style={{ color: T.inkFaint }}>
                  No team members or team leaders found. Add team members in the Team section first.
                </div>
              )}
            </div>

            {/* Deal Value & Probability overrides */}
            <div className="grid grid-cols-2 gap-3 pt-1 border-t" style={{ borderColor: T.line }}>
              <FormField label="Override Deal Value (₹)">
                <Input
                  value={importDealValue}
                  onChange={e => setImportDealValue(e.target.value)}
                  placeholder="e.g. 18,40,000  (blank = from file)"
                />
              </FormField>
              <FormField label="Override Probability (0–100)">
                <Input
                  value={importProbability}
                  onChange={e => setImportProbability(e.target.value.replace(/[^0-9]/g, ""))}
                  placeholder="e.g. 45  (blank = from file)"
                  type="text"
                />
              </FormField>
            </div>
          </div>
          )} {/* end Leader-only assignment panel */}

          {importMode === "file" ? (
            <div className="flex flex-col gap-3">
              {/* Dropzone */}
              <div
                onDragOver={e => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer"
                style={{ borderColor: T.line, background: T.canvas }}
              >
                <FileSpreadsheet size={36} className="mb-2" style={{ color: T.accent }} />
                <p className="text-[13px] font-semibold" style={{ color: T.ink }}>
                  {fileName || "Click or drag & drop your Excel / CSV file here"}
                </p>
                <p className="text-[11.5px] mt-1" style={{ color: T.inkFaint }}>Supports .xlsx, .xls, .csv</p>
                <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} className="hidden" />
              </div>

              {/* Preview Table */}
              {fileData && fileData.length > 0 && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-semibold" style={{ color: T.positive }}>
                      ✓ {fileData.length} rows loaded
                    </span>
                    <button onClick={() => { setFileData(null); setFileName(""); }} className="text-[11px]" style={{ color: T.negative }}>
                      Clear file
                    </button>
                  </div>
                  <div className="max-h-40 overflow-auto crm-scroll rounded-lg" style={{ border: `1px solid ${T.line}` }}>
                    <table className="w-full text-left border-collapse text-[11.5px]">
                      <thead>
                        <tr style={{ background: T.canvas, borderBottom: `1px solid ${T.line}` }}>
                          {headers.slice(0, 5).map(h => <th key={h} className="p-2 font-semibold" style={{ color: T.inkFaint }}>{h}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {fileData.slice(0, 4).map((row, idx) => (
                          <tr key={idx} style={{ borderBottom: `1px solid ${T.lineSoft}` }}>
                            {headers.slice(0, 5).map(h => <td key={h} className="p-2 truncate max-w-[110px]" style={{ color: T.inkSoft }}>{String(row[h] || "")}</td>)}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <button
                    onClick={confirmImport}
                    disabled={importing}
                    className="crm-focusable py-2.5 rounded-lg text-[13px] font-semibold flex items-center justify-center gap-2"
                    style={{ background: T.accent, color: "#fff", opacity: importing ? 0.7 : 1 }}
                  >
                    <Upload size={14} className={importing ? "animate-spin" : ""} />
                    {importing ? `Importing ${fileData.length} leads…` : `Import ${fileData.length} Leads`}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-[12px]" style={{ color: T.inkFaint }}>
                Paste comma, semicolon, or tab-separated rows:<br />
                <code>Name, Company, Email, Phone, Status</code>
              </p>
              <textarea
                value={csvText}
                onChange={e => setCsvText(e.target.value)}
                placeholder={"Anjali Rao, Meridian Textiles, anjali@merid.in, +91 9820041123\nDevraj Shah, Orbit Analytics, devraj@orbit.io, +91 9004088213"}
                rows={6}
                className="w-full p-3 rounded-lg text-[12.5px] crm-mono outline-none"
                style={{ background: T.canvas, border: `1px solid ${T.line}`, color: T.ink }}
              />
              <button
                onClick={handleTextImport}
                disabled={importing}
                className="crm-focusable py-2.5 rounded-lg text-[13px] font-semibold flex items-center justify-center gap-2"
                style={{ background: T.accent, color: "#fff", opacity: importing ? 0.7 : 1 }}
              >
                <Upload size={14} className={importing ? "animate-spin" : ""} />
                {importing ? "Importing…" : "Import Pasted Leads"}
              </button>
            </div>
          )}

          {importedCount !== null && (
            <div className="p-3.5 rounded-lg flex items-center justify-between gap-3 text-[12.5px]" style={{ background: T.positiveSoft, color: T.positive }}>
              <div className="flex items-center gap-2">
                <CheckCircle size={18} className="shrink-0" />
                <span>
                  <strong>{importedCount} leads</strong> imported successfully!
                  <span className="ml-1">Assigned to{" "}
                    <strong>
                      {assignToUserId === "self"
                        ? `${user?.name || "Leader"} (you)`
                        : (assignableMembers.find(e => e.id === assignToUserId || e.userId === assignToUserId || e.rawId === assignToUserId)?.name || "team member")}
                    </strong>.
                  </span>
                  {importProbability && <span className="ml-1">Probability: <strong>{importProbability}%</strong>.</span>}
                  {importDealValue && <span className="ml-1">Deal value: <strong>₹{importDealValue}</strong>.</span>}
                </span>
              </div>
              <button
                onClick={() => navigate("/leads")}
                className="crm-focusable px-3 py-1.5 rounded-md text-[12px] font-semibold flex items-center gap-1.5 shrink-0 shadow-sm hover:opacity-95"
                style={{ background: T.positive, color: "#fff" }}
              >
                Go to Leads <ArrowRight size={14} />
              </button>
            </div>
          )}
        </div>

        {/* RIGHT: EXPORT ALL DATASETS */}
        <div className="crm-card rounded-xl p-5 flex flex-col gap-4" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
          <div className="flex items-center gap-2">
            <Download size={18} style={{ color: T.positive }} />
            <h2 className="crm-display text-[15px] font-semibold" style={{ color: T.ink }}>Export CRM Datasets</h2>
          </div>
          <p className="text-[12.5px]" style={{ color: T.inkFaint }}>
            Download live records from your SQLite database as UTF-8 CSV or Microsoft Excel (.xlsx).
          </p>

          <div className="flex flex-col gap-3">
            {[
              { id: "leads", label: "Leads Dataset", count: state.leads.length },
              { id: "deals", label: "Deals Dataset", count: state.deals.length },
              { id: "customers", label: "Customers Dataset", count: state.customers.length },
              { id: "companies", label: "Companies Dataset", count: state.companies.length },
              { id: "tasks", label: "Tasks Dataset", count: state.tasks.length },
              { id: "activities", label: "Activities Dataset", count: state.activities.length },
            ].map(item => (
              <div key={item.id} className="flex items-center justify-between p-3 rounded-lg" style={{ background: T.canvas, border: `1px solid ${T.line}` }}>
                <div>
                  <p className="text-[13px] font-semibold" style={{ color: T.ink }}>{item.label}</p>
                  <p className="text-[11.5px]" style={{ color: T.inkFaint }}>{item.count} records available</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleExport(item.id, "csv")}
                    className="crm-focusable px-2.5 py-1.5 rounded-lg text-[11.5px] font-semibold flex items-center gap-1"
                    style={{ background: T.surface, border: `1px solid ${T.line}`, color: T.inkSoft }}
                  >
                    <Download size={12} /> CSV
                  </button>
                  <button
                    onClick={() => handleExport(item.id, "xlsx")}
                    className="crm-focusable px-2.5 py-1.5 rounded-lg text-[11.5px] font-semibold flex items-center gap-1"
                    style={{ background: T.positiveSoft, color: T.positive }}
                  >
                    <FileSpreadsheet size={12} /> Excel (.xlsx)
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Team staff summary */}
          <div className="p-3 rounded-lg flex items-center gap-2 text-[12px]" style={{ background: T.accentSoft, color: T.accent }}>
            <Users size={14} />
            <span>
              <strong>{assignableMembers.length}</strong> team members & leaders available for lead assignment:&nbsp;
              {assignableMembers.slice(0, 4).map(e => e.name).join(", ")}{assignableMembers.length > 4 ? ` +${assignableMembers.length - 4} more` : ""}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
