// ShieldAI — Content Safety Dashboard v2.0

let sessionStats = { total: 0, flagged: 0, safe: 0, totalScore: 0 };
let historyData = [];
let trendData = [];
let lastResultData = null;
let isDark = true;

const RISK_WORDS = {
  hate: ["hate","kill","die","stupid","idiot","racist","discriminate","worthless","trash","loser","scum","nazi","bigot","slur"],
  harm: ["suicide","self-harm","cutting","overdose","hurt myself","end my life","worthless","hopeless","give up"],
  sexual: ["porn","nude","explicit","xxx","sexual","nsfw","erotic"],
  violence: ["fight","attack","weapon","gun","bomb","stab","shoot","blood","murder","assault","threat","beat","punch"]
};

const CATEGORY_COLORS = {
  Hate: "#ef4444",
  SelfHarm: "#f97316",
  Sexual: "#ec4899",
  Violence: "#eab308"
};

document.addEventListener("DOMContentLoaded", () => {
  wireNavTabs();
  wireTheme();
  wireButtons();
  updateStats();
});

// THEME
function wireTheme() {
  const saved = localStorage.getItem("shieldai_theme");
  if (saved === "light") applyTheme(false);
  document.getElementById("themeToggle").addEventListener("click", () => applyTheme(isDark));
}
function applyTheme(toLight) {
  isDark = !toLight;
  document.body.classList.toggle("light-mode", toLight);
  document.getElementById("themeToggle").textContent = toLight ? "🌙" : "☀️";
  localStorage.setItem("shieldai_theme", toLight ? "light" : "dark");
}

// NAV TABS
function wireNavTabs() {
  document.querySelectorAll(".nav-tab").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".nav-tab").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".tab-pane").forEach(p => p.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById(btn.dataset.tab).classList.add("active");
    });
  });
}

// BUTTONS
function wireButtons() {
  document.getElementById("testConnectionBtn").addEventListener("click", testConnection);
  document.getElementById("exportJsonBtn").addEventListener("click", exportJson);
  document.getElementById("exportPdfBtn").addEventListener("click", exportPdf);
  document.getElementById("copyResultBtn").addEventListener("click", copyResult);
  document.getElementById("clearAllBtn").addEventListener("click", clearAll);
}

// MODE
function setMode(mode) {
  document.getElementById("textSection").style.display = mode === "text" ? "block" : "none";
  document.getElementById("imageSection").style.display = mode === "image" ? "block" : "none";
  document.getElementById("textModeBtn").classList.toggle("active", mode === "text");
  document.getElementById("imageModeBtn").classList.toggle("active", mode === "image");
  document.getElementById("resultSection").style.display = "none";
  document.getElementById("highlightPreview").style.display = "none";
}

function updateCharCount() {
  const text = document.getElementById("textInput").value;
  document.getElementById("charCount").textContent = `${text.length.toLocaleString()} / 10,000`;
}

function updateBatchCount() {
  const lines = document.getElementById("batchInput").value.split("\n").filter(l => l.trim());
  document.getElementById("batchCount").textContent = `${lines.length} item${lines.length !== 1 ? "s" : ""}`;
}

// WORD HIGHLIGHT PREVIEW
function previewHighlight() {
  const text = document.getElementById("textInput").value.trim();
  if (!text) { alert("Please enter text first."); return; }

  const words = text.split(/(\s+)/);
  const highlighted = words.map(word => {
    const lower = word.toLowerCase().replace(/[^a-z\s]/g, "");
    for (const [cat, list] of Object.entries(RISK_WORDS)) {
      if (list.some(w => lower.includes(w))) {
        const cls = `hl-${cat}`;
        const label = cat.charAt(0).toUpperCase() + cat.slice(1);
        return `<span class="${cls}" title="Potential ${label} content">${escapeHtml(word)}</span>`;
      }
    }
    return escapeHtml(word);
  }).join("");

  document.getElementById("highlightBox").innerHTML = highlighted || "<em style='color:var(--text3)'>No risky words detected in preview</em>";
  document.getElementById("highlightPreview").style.display = "block";
}

// IMAGE PREVIEW
function previewImage(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const img = document.getElementById("previewImg");
    img.src = e.target.result;
    img.style.display = "block";
    document.getElementById("dropzoneContent").style.display = "none";
  };
  reader.readAsDataURL(file);
}

function clearImage() {
  document.getElementById("imageInput").value = "";
  document.getElementById("previewImg").style.display = "none";
  document.getElementById("dropzoneContent").style.display = "block";
}

// TEST CONNECTION
async function testConnection() {
  const dot = document.getElementById("statusDot");
  const label = document.getElementById("statusLabel");
  dot.className = "status-dot testing";
  label.textContent = "Testing...";
  try {
    const res = await fetch("/api/test");
    const data = await res.json();
    if (res.ok && data.ok) {
      dot.className = "status-dot connected";
      label.textContent = "Connected ✓";
    } else {
      dot.className = "status-dot failed";
      label.textContent = `Failed (${res.status})`;
    }
  } catch {
    dot.className = "status-dot failed";
    label.textContent = "Connection failed";
  }
}

// ANALYZE TEXT
async function analyzeText() {
  const text = document.getElementById("textInput").value.trim();
  if (!text) { alert("Please enter text to analyze."); return; }
  showLoading("Analyzing text with Azure AI...", "Sending to content safety model...");
  try {
    const res = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "text", text })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Analysis failed");
    hideLoading();
    showResult("Text", text.substring(0, 80) + (text.length > 80 ? "…" : ""), data.scores);
    addToHistory("📝 Text", text.substring(0, 60) + (text.length > 60 ? "…" : ""), data.scores);
    addToTrend(data.scores);
    updateSessionStats(data.scores);
  } catch (err) {
    hideLoading();
    showError(err.message);
  }
}

// ANALYZE IMAGE
async function analyzeImage() {
  const imageInput = document.getElementById("imageInput");
  if (!imageInput.files.length) { alert("Please upload an image."); return; }
  const file = imageInput.files[0];
  showLoading("Analyzing image with Azure AI...", "Processing visual content...");
  try {
    const base64 = await fileToBase64(file);
    const res = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "image", imageBase64: base64.split(",")[1], imageType: file.type })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Analysis failed");
    hideLoading();
    showResult("Image", `[Image: ${file.name}]`, data.scores);
    addToHistory("🖼️ Image", `[Image: ${file.name}]`, data.scores);
    addToTrend(data.scores);
    updateSessionStats(data.scores);
  } catch (err) {
    hideLoading();
    showError(err.message);
  }
}

// BATCH
async function analyzeBatch() {
  const lines = document.getElementById("batchInput").value.split("\n").filter(l => l.trim());
  if (!lines.length) { alert("Please enter at least one line."); return; }
  const btn = document.getElementById("batchAnalyzeBtn");
  btn.disabled = true;
  btn.textContent = "⏳ Analyzing...";
  const container = document.getElementById("batchResults");
  container.innerHTML = `<div class="loading-card"><div class="loading-spinner"></div><div class="loading-text">Analyzing ${lines.length} items...</div></div>`;
  const results = [];
  for (let i = 0; i < lines.length; i++) {
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "text", text: lines[i] })
      });
      const data = await res.json();
      results.push({ text: lines[i], scores: data.scores, ok: res.ok });
    } catch {
      results.push({ text: lines[i], scores: null, ok: false });
    }
  }
  btn.disabled = false;
  btn.innerHTML = "<span>📦</span> Analyze All";
  renderBatchResults(results);
  results.forEach(r => { if (r.ok && r.scores) { addToHistory("📦 Batch", r.text.substring(0, 40), r.scores); addToTrend(r.scores); updateSessionStats(r.scores); } });
}

function renderBatchResults(results) {
  const container = document.getElementById("batchResults");
  container.innerHTML = results.map((r, i) => {
    if (!r.ok || !r.scores) return `<div class="batch-result-item"><div class="batch-item-header"><span class="batch-item-index">Item ${i+1}</span><span class="result-badge badge-flagged">ERROR</span></div><div style="font-size:12px;color:var(--text2);">${escapeHtml(r.text)}</div></div>`;
    const maxSev = Math.max(...r.scores.map(s => s.severity));
    const isFlagged = maxSev > 0;
    return `<div class="batch-result-item"><div class="batch-item-header"><div><span class="batch-item-index">Item ${i+1}</span><span style="font-size:12px;color:var(--text2);margin-left:8px;">${escapeHtml(r.text.substring(0,50))}${r.text.length>50?"…":""}</span></div><span class="result-badge ${isFlagged?"badge-flagged":"badge-safe"}">${isFlagged?"⚠ FLAGGED":"✓ SAFE"}</span></div><div class="batch-mini-grid">${r.scores.map(s=>{const risk=getRiskInfo(s.severity);return `<div class="batch-mini-card"><div class="batch-mini-cat">${s.category}</div><div class="batch-mini-val ${risk.cls}">${risk.label}</div></div>`;}).join("")}</div></div>`;
  }).join("");
}

// SHOW RESULT
function showResult(type, preview, scores) {
  lastResultData = { type, preview, scores, time: new Date().toLocaleString() };
  const maxSev = Math.max(...scores.map(s => s.severity));
  const isFlagged = maxSev > 0;
  const section = document.getElementById("resultSection");
  section.style.display = "block";

  document.getElementById("overallBadge").className = `result-badge ${isFlagged ? "badge-flagged" : "badge-safe"}`;
  document.getElementById("overallBadge").textContent = isFlagged ? "⚠ FLAGGED" : "✓ SAFE";

  // GAUGE METERS
  document.getElementById("gaugeGrid").innerHTML = scores.map(s => {
    const risk = getRiskInfo(s.severity);
    const pct = s.severity / 6;
    const color = CATEGORY_COLORS[s.category] || "#6366f1";
    // SVG arc gauge (semicircle)
    const r = 36, cx = 45, cy = 44;
    const totalLen = Math.PI * r;
    const fillLen = pct * totalLen;
    return `<div class="gauge-card">
      <div class="gauge-cat">${s.category}</div>
      <div class="gauge-wrap">
        <svg class="gauge-svg" viewBox="0 0 90 50">
          <path class="gauge-track" d="M9,44 A36,36 0 0,1 81,44" />
          <path class="gauge-fill" d="M9,44 A36,36 0 0,1 81,44"
            stroke="${color}"
            stroke-dasharray="${fillLen} ${totalLen}"
            stroke-dashoffset="0"
            style="transition:stroke-dasharray 1s cubic-bezier(0.22,1,0.36,1)"/>
        </svg>
        <div class="gauge-val" style="color:${color}">${s.severity}</div>
      </div>
      <div class="gauge-label ${risk.cls}">${risk.label}</div>
    </div>`;
  }).join("");

  // BAR CHART
  document.getElementById("riskChart").innerHTML = scores.map(s => {
    const risk = getRiskInfo(s.severity);
    const pct = (s.severity / 6) * 100;
    const color = CATEGORY_COLORS[s.category] || "#6366f1";
    return `<div class="chart-row">
      <div class="chart-label">${s.category}</div>
      <div class="chart-track"><div class="chart-fill" style="width:${pct}%;background:${color};"></div></div>
      <div class="chart-val">${s.severity}/6</div>
    </div>`;
  }).join("");

  // RISK CARDS
  document.getElementById("riskGrid").innerHTML = scores.map(s => {
    const risk = getRiskInfo(s.severity);
    const pct = (s.severity / 6) * 100;
    const color = CATEGORY_COLORS[s.category] || "#6366f1";
    return `<div class="risk-card" style="border-color:${s.severity > 0 ? color + "40" : ""}">
      <div class="risk-cat">${s.category}</div>
      <div class="risk-score" style="color:${color}">${s.severity}</div>
      <div class="risk-label ${risk.cls}">${risk.label}</div>
      <div class="risk-bar-track"><div class="risk-bar-fill" style="width:${pct}%;background:${color};"></div></div>
    </div>`;
  }).join("");

  document.getElementById("resultStatus").className = `result-status ${isFlagged ? "status-flagged" : "status-safe"}`;
  document.getElementById("resultStatus").textContent = isFlagged
    ? `🚨 Content flagged! Maximum severity: ${maxSev}/6. Review recommended.`
    : `✅ Content appears safe across all ${scores.length} categories.`;
  document.getElementById("resultMeta").textContent = `Type: ${type} · Analyzed: ${new Date().toLocaleTimeString()} · Categories: ${scores.length}`;

  document.getElementById("exportJsonBtn").disabled = false;
  document.getElementById("exportPdfBtn").disabled = false;
  document.getElementById("copyResultBtn").disabled = false;
}

// TREND DATA
function addToTrend(scores) {
  trendData.push({ time: new Date().toLocaleTimeString(), scores: [...scores] });
  if (trendData.length > 20) trendData.shift();
  renderTrend();
}

function renderTrend() {
  const card = document.getElementById("trendCard");
  if (!trendData.length) {
    card.innerHTML = `<div class="empty-state"><div class="empty-icon">📈</div><div class="empty-text">No trend data yet</div><div class="empty-sub">Analyze some content to see trends here</div></div>`;
    return;
  }

  const cats = ["Hate", "SelfHarm", "Sexual", "Violence"];
  const maxH = 120;

  card.innerHTML = `
    <div class="trend-header">
      <div class="trend-title">Risk Trend — Last ${trendData.length} Scans</div>
      <div class="trend-legend">${cats.map(c => `<div class="trend-leg-item"><div class="trend-leg-dot" style="background:${CATEGORY_COLORS[c]}"></div>${c}</div>`).join("")}</div>
    </div>
    <div class="trend-chart-wrap">
      <div class="trend-chart">
        ${trendData.map((d, i) => `
          <div class="trend-col">
            <div class="trend-bars">
              ${cats.map(cat => {
                const score = (d.scores.find(s => s.category === cat)?.severity || 0);
                const h = Math.max(4, (score / 6) * maxH);
                return `<div class="trend-bar" style="height:${h}px;background:${CATEGORY_COLORS[cat]};" title="${cat}: ${score}"></div>`;
              }).join("")}
            </div>
            <div class="trend-label">${i + 1}</div>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

// LOADING
function showLoading(text, sub) {
  document.getElementById("resultSection").style.display = "none";
  document.getElementById("loadingSection").style.display = "block";
  document.getElementById("loadingStep").textContent = sub || "";
}
function hideLoading() { document.getElementById("loadingSection").style.display = "none"; }
function showError(msg) {
  document.getElementById("resultSection").style.display = "block";
  document.getElementById("gaugeGrid").innerHTML = "";
  document.getElementById("riskGrid").innerHTML = "";
  document.getElementById("riskChart").innerHTML = "";
  document.getElementById("overallBadge").className = "result-badge badge-flagged";
  document.getElementById("overallBadge").textContent = "ERROR";
  document.getElementById("resultStatus").className = "result-status status-flagged";
  document.getElementById("resultStatus").textContent = `❌ Error: ${msg}`;
  document.getElementById("resultMeta").textContent = "";
}

// HISTORY
function addToHistory(type, text, scores) {
  historyData.unshift({ type, text, scores, time: new Date().toLocaleString() });
  if (historyData.length > 50) historyData.pop();
  renderHistory();
}

function renderHistory() {
  const container = document.getElementById("historyContainer");
  if (!historyData.length) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">📂</div><div class="empty-text">No analyses yet</div><div class="empty-sub">Analyze some content to see history here</div></div>`;
    return;
  }
  container.innerHTML = historyData.map(h => {
    const maxSev = h.scores ? Math.max(...h.scores.map(s => s.severity)) : 0;
    const isFlagged = maxSev > 0;
    return `<div class="history-item">
      <div class="history-header">
        <div class="history-type">${h.type}</div>
        <div style="display:flex;gap:8px;align-items:center;">
          <span class="result-badge ${isFlagged?"badge-flagged":"badge-safe"}" style="font-size:9px;padding:3px 8px;">${isFlagged?"FLAGGED":"SAFE"}</span>
          <span class="history-time">${h.time}</span>
        </div>
      </div>
      <div class="history-text">${escapeHtml(h.text)}</div>
      ${h.scores ? `<div class="history-scores">${h.scores.map(s => { const risk = getRiskInfo(s.severity); return `<span class="history-score" style="color:${CATEGORY_COLORS[s.category]}">${s.category}: ${s.severity}</span>`; }).join("")}</div>` : ""}
    </div>`;
  }).join("");
}

// STATS
function updateSessionStats(scores) {
  const maxSev = Math.max(...scores.map(s => s.severity));
  sessionStats.total++;
  if (maxSev > 0) sessionStats.flagged++; else sessionStats.safe++;
  sessionStats.totalScore += maxSev;
  document.getElementById("totalScans").textContent = sessionStats.total;
  document.getElementById("flaggedScans").textContent = sessionStats.flagged;
  document.getElementById("safeScans").textContent = sessionStats.safe;
  document.getElementById("avgScore").textContent = (sessionStats.totalScore / sessionStats.total).toFixed(1);
}

function updateStats() {
  document.getElementById("totalScans").textContent = 0;
  document.getElementById("flaggedScans").textContent = 0;
  document.getElementById("safeScans").textContent = 0;
  document.getElementById("avgScore").textContent = "0";
}

// CLEAR ALL
function clearAll() {
  historyData = []; trendData = []; lastResultData = null;
  sessionStats = { total: 0, flagged: 0, safe: 0, totalScore: 0 };
  updateStats(); renderHistory(); renderTrend();
  document.getElementById("resultSection").style.display = "none";
  document.getElementById("batchResults").innerHTML = "";
  document.getElementById("highlightPreview").style.display = "none";
  document.getElementById("exportJsonBtn").disabled = true;
  document.getElementById("exportPdfBtn").disabled = true;
  document.getElementById("copyResultBtn").disabled = true;
}

// COPY RESULT
async function copyResult() {
  if (!lastResultData) return;
  const { type, preview, scores, time } = lastResultData;
  const maxSev = Math.max(...scores.map(s => s.severity));
  const text = [
    `ShieldAI Safety Report`,
    `Time: ${time}`,
    `Type: ${type}`,
    `Content: ${preview}`,
    `Overall: ${maxSev > 0 ? "FLAGGED" : "SAFE"}`,
    ``,
    ...scores.map(s => `${s.category}: ${s.severity}/6 (${getRiskInfo(s.severity).label})`)
  ].join("\n");
  try {
    await navigator.clipboard.writeText(text);
    showToast("✓ Result copied to clipboard!");
  } catch {
    showToast("Failed to copy");
  }
}

// SHARE RESULT
function shareResult() {
  if (!lastResultData) return;
  const { scores } = lastResultData;
  const params = new URLSearchParams();
  scores.forEach(s => params.set(s.category, s.severity));
  const url = `${window.location.origin}${window.location.pathname}?report=${btoa(JSON.stringify(scores))}`;
  navigator.clipboard.writeText(url).then(() => showToast("🔗 Share link copied!")).catch(() => showToast("Failed to copy link"));
}

// TOAST
function showToast(msg) {
  const existing = document.querySelector(".toast");
  if (existing) existing.remove();
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// EXPORT JSON
function exportJson() {
  if (!historyData.length) return;
  const blob = new Blob([JSON.stringify({ exported: new Date().toISOString(), stats: sessionStats, history: historyData }, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `shieldai-report-${Date.now()}.json`; a.click();
  URL.revokeObjectURL(url);
}

// EXPORT PDF
function exportPdf() {
  if (!historyData.length) return;
  const win = window.open("", "_blank");
  win.document.write(`<!DOCTYPE html><html><head><title>ShieldAI Report</title>
  <style>body{font-family:sans-serif;padding:30px;color:#0f172a;}h1{color:#6366f1;font-size:26px;margin-bottom:4px;}.meta{font-size:12px;color:#94a3b8;margin-bottom:20px;}.stats{display:flex;gap:20px;padding:14px;background:#f8fafc;border-radius:10px;margin-bottom:20px;}.stat{text-align:center;}.stat-v{font-size:22px;font-weight:800;color:#6366f1;}.stat-k{font-size:10px;color:#94a3b8;}.item{border:1px solid #e2e8f0;border-radius:10px;padding:12px;margin-bottom:10px;}.item-h{display:flex;justify-content:space-between;margin-bottom:6px;font-weight:600;font-size:13px;}.badge{padding:2px 8px;border-radius:999px;font-size:10px;font-weight:700;}.safe{background:#dcfce7;color:#16a34a;}.flagged{background:#fee2e2;color:#dc2626;}.scores{display:flex;gap:6px;flex-wrap:wrap;margin-top:6px;}.score{padding:2px 7px;border-radius:5px;font-size:10px;background:#f1f5f9;color:#475569;}</style>
  </head><body>
  <h1>🛡️ ShieldAI Safety Report</h1>
  <div class="meta">Generated: ${new Date().toLocaleString()} · Built by Aditya Sharma · Guided by Abhimanyu Sharma Sir</div>
  <div class="stats">
    <div class="stat"><div class="stat-v">${sessionStats.total}</div><div class="stat-k">Total</div></div>
    <div class="stat"><div class="stat-v">${sessionStats.flagged}</div><div class="stat-k">Flagged</div></div>
    <div class="stat"><div class="stat-v">${sessionStats.safe}</div><div class="stat-k">Safe</div></div>
    <div class="stat"><div class="stat-v">${(sessionStats.totalScore / (sessionStats.total || 1)).toFixed(1)}</div><div class="stat-k">Avg Risk</div></div>
  </div>
  ${historyData.map(h => { const maxSev = h.scores ? Math.max(...h.scores.map(s => s.severity)) : 0; return `<div class="item"><div class="item-h"><span>${h.type} · ${h.time}</span><span class="badge ${maxSev > 0 ? "flagged" : "safe"}">${maxSev > 0 ? "FLAGGED" : "SAFE"}</span></div><div style="font-size:12px;color:#475569;">${h.text}</div>${h.scores ? `<div class="scores">${h.scores.map(s => `<span class="score">${s.category}: ${s.severity}</span>`).join("")}</div>` : ""}</div>`; }).join("")}
  </body></html>`);
  win.document.close();
  setTimeout(() => win.print(), 500);
}

// HELPERS
function getRiskInfo(severity) {
  if (severity === 0) return { label: "Safe", cls: "safe-color", color: "#22c55e" };
  if (severity <= 2) return { label: "Low Risk", cls: "low-color", color: "#eab308" };
  if (severity <= 4) return { label: "Medium", cls: "medium-color", color: "#f97316" };
  return { label: "High Risk", cls: "high-color", color: "#ef4444" };
}

function fileToBase64(file) {
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = e => res(e.target.result);
    reader.onerror = rej;
    reader.readAsDataURL(file);
  });
}

function escapeHtml(str) {
  return String(str).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
}
