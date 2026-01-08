// Radar menu with clickable aircraft targets.
// Click opens an in-page overlay panel. No new tabs/pages.

const canvas = document.getElementById("radar");
const ctx = canvas.getContext("2d", { alpha: true });
const tooltip = document.getElementById("tooltip");

const panel = document.getElementById("panel");
const panelContent = document.getElementById("panelContent");
const closePanel = document.getElementById("closePanel");

let w = 0, h = 0, cx = 0, cy = 0, radius = 0;
let sweep = 0;                 // radians
let last = performance.now();
let mouse = { x: -9999, y: -9999, inside: false };
let hovered = null;

// Panel content
const contentMap = {
  ABOUT: `
    <h1>About</h1>
    <p>
      We are a family-run business built on a shared passion for aviation, technology and precision.
      What began as a hands-on project at the kitchen table has grown into a dedicated flight radar
      platform designed to deliver accurate, real-time aircraft tracking.
    </p>
  `,
  PRODUCT: `
    <h1>Product</h1>
    <p>
      Our platform enables aircraft tracking in environments where traditional cellular coverage
      is unavailable or unreliable. By operating independently of mobile networks, the system
      continues to deliver real-time positional awareness across remote, regional and offshore
      airspace.
    </p>
    <p>
      This capability is critical for aviation operations that extend beyond populated areas,
      including rural flights, maritime corridors, low-altitude operations and long-range routes
      where cellular infrastructure does not exist.
    </p>
    <p>
      The system ingests and processes aircraft signals directly, transforming them into a clear,
      intuitive radar-style interface that provides continuous situational awareness without
      reliance on ground-based cellular connectivity.
    </p>
    <p>
      Designed with reliability at its core, the platform supports live tracking, historical
      playback and data export, allowing users to monitor movements, analyse patterns and make
      informed operational decisions even in disconnected environments.
    </p>
  `,
  APPLICATIONS: `
    <h1>Applications</h1>
    <p>Insert video demo</p>
  `,
  "REGISTER YOUR INTEREST": `
    <h1>Register your interest</h1>
    <p class="panel__intro">
      Leave your details below and we’ll be in touch with further information.
    </p>

    <form id="interestForm" class="interest-form">
      <div class="field">
        <label>Full name</label>
        <input name="name" placeholder="Alex Smith" required />
      </div>

      <div class="field">
        <label>Email</label>
        <input type="email" name="email" placeholder="alex@email.com" required />
      </div>

      <div class="field">
        <label>Phone number</label>
        <input type="tel" name="phone" placeholder="+61 412 345 678" />
      </div>

      <div class="field">
        <label>Country</label>
        <input name="country" placeholder="Australia" />
      </div>

      <button class="cta-btn" type="submit">Register interest</button>
      <div id="formStatus" class="form-status" aria-live="polite"></div>
    </form>
  `,
  SUPPORT: `
    <h1>Support</h1>
    <p>Dedicated support is provided to ensure continuity of service and operational reliability.</p>
    <p>Our team offers assistance across onboarding, system configuration and ongoing use.</p>
    <p>
      For support enquiries, please contact us at
      <a href="mailto:absflightradar@gmail.com" class="support-link">absflightradar@gmail.com</a>.
    </p>
  `,
  CONTACT: `
    <h1>Contact</h1>
    <p>
      For general enquiries, please contact us at
      <a href="mailto:absflightradar@gmail.com" class="support-link">absflightradar@gmail.com</a>.
    </p>
  `,
};

// Targets on radar
const targets = [
  { id: "about", label: "ABOUT", r: 0.68, a: 250, type: "jet" },
  { id: "product", label: "PRODUCT", r: 0.78, a: 330, type: "jet4" },
  { id: "applications", label: "APPLICATIONS", r: 0.75, a: 45, type: "jet2" },
  { id: "contact", label: "CONTACT", r: 0.80, a: 190, type: "heli" },
  { id: "support", label: "SUPPORT", r: 0.50, a: 140, type: "jet3" },
  { id: "register", label: "REGISTER YOUR INTEREST", r: 0.0, a: 90, type: "heli2" },
];

/* ------------------------- sizing ------------------------- */
function resize(){
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  w = canvas.clientWidth;
  h = canvas.clientHeight;
  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  cx = w / 2;
  cy = h / 2;
  radius = Math.min(w, h) * 0.42;
}
window.addEventListener("resize", resize);
resize();

/* ---------------------- interaction ----------------------- */
canvas.addEventListener("mousemove", (e) => {
  const r = canvas.getBoundingClientRect();
  mouse.x = e.clientX - r.left;
  mouse.y = e.clientY - r.top;
  mouse.inside = true;
});

canvas.addEventListener("mouseleave", () => {
  mouse.inside = false;
  hovered = null;
  hideTooltip();
});

canvas.addEventListener("click", () => {
  if (!hovered) return;
  openPanel(hovered.label);
});

closePanel.addEventListener("click", () => closePanelNow());
panel.addEventListener("click", (e) => {
  // click outside content closes panel
  if (e.target === panel) closePanelNow();
});

function openPanel(label){
  panelContent.innerHTML = contentMap[label] || "<p>Coming soon</p>";
  panel.classList.remove("hidden");
  panel.setAttribute("aria-hidden", "false");
  wireInterestFormIfPresent();
}

function closePanelNow(){
  panel.classList.add("hidden");
  panel.setAttribute("aria-hidden", "true");
}

/* ----------- form wiring + thank-you screen --------------- */
function wireInterestFormIfPresent(){
  const form = document.getElementById("interestForm");
  if (!form) return;

  // Prevent double-binding if user opens the panel multiple times
  if (form.dataset.wired === "true") return;
  form.dataset.wired = "true";

  form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const data = new FormData(form);

  // Disable button to prevent double-submits
  const btn = form.querySelector('button[type="submit"]');
  if (btn) btn.disabled = true;

  try {
    const res = await fetch("https://formspree.io/f/mzdznjge", {
      method: "POST",
      body: data,
      headers: { "Accept": "application/json" }
    });

    if (!res.ok) throw new Error("Submit failed");

    // ✅ Show thank-you (only after successful submit)
    const name = (data.get("name") || "").toString().trim();
    const email = (data.get("email") || "").toString().trim();
    const phone = (data.get("phone") || "").toString().trim();
    const country = (data.get("country") || "").toString().trim();

    panelContent.innerHTML = `
      <div class="thanks">
        <h1>Thank you for registering your interest!</h1>
        <p class="panel__intro">We appreciate your interest, we’ll be in touch shortly.</p>

        <div class="thanks__card">
          <div><strong>Name:</strong> ${escapeHtml(name || "-")}</div>
          <div><strong>Email:</strong> ${escapeHtml(email || "-")}</div>
          <div><strong>Phone:</strong> ${escapeHtml(phone || "-")}</div>
          <div><strong>Country:</strong> ${escapeHtml(country || "-")}</div>
        </div>

        <div class="thanks__actions">
          <button class="cta-btn" id="backToRadarBtn" type="button">Back to radar</button>
          <button class="btn-secondary" id="submitAnotherBtn" type="button">Submit another</button>
        </div>
      </div>
    `;

    document.getElementById("backToRadarBtn")?.addEventListener("click", () => closePanelNow());
    document.getElementById("submitAnotherBtn")?.addEventListener("click", () => openPanel("REGISTER YOUR INTEREST"));

  } catch (err) {
    // Show an error message (stays on form)
    const status = document.getElementById("formStatus");
    if (status) status.textContent = "Something went wrong. Please try again.";
    if (btn) btn.disabled = false;
  }
});
}

function escapeHtml(str){
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* ---------------------- drawing helpers ------------------- */
function degToRad(deg){ return (deg * Math.PI) / 180; }

function polarToXY(r01, aDeg){
  const a = degToRad(aDeg);
  const rr = radius * r01;
  return { x: cx + Math.cos(a) * rr, y: cy + Math.sin(a) * rr };
}

function fillGlow(alpha){
  ctx.fillStyle = `rgba(105,255,170,${alpha})`;
  ctx.shadowColor = "rgba(105,255,170,0.65)";
  ctx.shadowBlur = 18;
}

function clearWithTrail(){
  ctx.fillStyle = "rgba(6,9,11,0.22)";
  ctx.fillRect(0, 0, w, h);
}

// Simple aircraft silhouettes (stylised) drawn via paths
function drawAircraft(x, y, angle, size, type, isHover){
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  const a = isHover ? 0.95 : 0.7;
  fillGlow(a);
  ctx.strokeStyle = `rgba(105,255,170,${isHover ? 0.95 : 0.55})`;
  ctx.lineWidth = isHover ? 2 : 1;

  ctx.beginPath();

  if (type === "heli") {
    ctx.rect(-size*0.35, -size*0.12, size*0.7, size*0.24);
    ctx.moveTo(-size*0.1, -size*0.28); ctx.lineTo(size*0.1, -size*0.28);
    ctx.moveTo(-size*0.55, -size*0.28); ctx.lineTo(size*0.55, -size*0.28);
    ctx.moveTo(size*0.35, 0); ctx.lineTo(size*0.6, size*0.08);
  } else if (type === "prop") {
    ctx.moveTo(-size*0.55, 0); ctx.lineTo(size*0.6, 0);
    ctx.moveTo(-size*0.1, -size*0.32); ctx.lineTo(size*0.05, 0); ctx.lineTo(-size*0.1, size*0.32);
    ctx.moveTo(-size*0.55, -size*0.18); ctx.lineTo(-size*0.35, 0); ctx.lineTo(-size*0.55, size*0.18);
    ctx.moveTo(size*0.6, -size*0.18); ctx.lineTo(size*0.6, size*0.18);
  } else if (type === "uav") {
    ctx.moveTo(-size*0.6, 0);
    ctx.lineTo(-size*0.1, -size*0.25);
    ctx.lineTo(size*0.6, 0);
    ctx.lineTo(-size*0.1, size*0.25);
    ctx.closePath();
  } else if (type === "center") {
    ctx.arc(0, 0, size*0.55, 0, Math.PI*2);
    ctx.moveTo(-size*0.75, 0); ctx.lineTo(size*0.75, 0);
    ctx.moveTo(0, -size*0.75); ctx.lineTo(0, size*0.75);
  } else {
    ctx.moveTo(-size*0.6, 0);
    ctx.lineTo(size*0.6, 0);
    ctx.moveTo(-size*0.1, -size*0.28); ctx.lineTo(size*0.1, 0); ctx.lineTo(-size*0.1, size*0.28);
    ctx.moveTo(-size*0.55, -size*0.18); ctx.lineTo(-size*0.35, 0); ctx.lineTo(-size*0.55, size*0.18);
  }

  ctx.stroke();
  ctx.restore();
}

function drawRadarGrid(){
  ctx.save();
  ctx.shadowBlur = 0;

  // Outer ring
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI*2);
  ctx.strokeStyle = "rgba(105,255,170,0.32)";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Rings
  for (let i = 1; i <= 3; i++){
    ctx.beginPath();
    ctx.arc(cx, cy, radius * (i/4), 0, Math.PI*2);
    ctx.strokeStyle = "rgba(105,255,170,0.18)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Crosshair
  ctx.beginPath();
  ctx.moveTo(cx - radius, cy); ctx.lineTo(cx + radius, cy);
  ctx.moveTo(cx, cy - radius); ctx.lineTo(cx, cy + radius);
  ctx.strokeStyle = "rgba(105,255,170,0.22)";
  ctx.lineWidth = 1;
  ctx.stroke();

  // Compass markers
  ctx.fillStyle = "rgba(105,255,170,0.6)";
  ctx.font = "12px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.textAlign = "center";
  ctx.fillText("N", cx, cy - radius - 14);
  ctx.fillText("S", cx, cy + radius + 24);
  ctx.textAlign = "left";
  ctx.fillText("E", cx + radius + 14, cy + 4);
  ctx.textAlign = "right";
  ctx.fillText("W", cx - radius - 14, cy + 4);

  ctx.restore();
}

function drawSweep(dt){
  sweep += dt * 0.00045;
  const ang = sweep;

  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
  grad.addColorStop(0.0, "rgba(105,255,170,0.25)");
  grad.addColorStop(1.0, "rgba(105,255,170,0)");

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(ang);

  // sweep line
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(radius, 0);
  ctx.strokeStyle = "rgba(105,255,170,0.85)";
  ctx.lineWidth = 2;
  ctx.shadowColor = "rgba(105,255,170,0.8)";
  ctx.shadowBlur = 20;
  ctx.stroke();

  // sweep cone
  ctx.beginPath();
  ctx.moveTo(0,0);
  ctx.arc(0,0, radius, -0.22, 0.22);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.restore();
}

function drawNoise(){
  ctx.save();
  ctx.shadowBlur = 0;
  for (let i = 0; i < 14; i++){
    const rr = Math.random() * radius;
    const aa = Math.random() * Math.PI * 2;
    const x = cx + Math.cos(aa) * rr;
    const y = cy + Math.sin(aa) * rr;
    ctx.fillStyle = `rgba(105,255,170,${Math.random()*0.08})`;
    ctx.fillRect(x, y, 1.5, 1.5);
  }
  ctx.restore();
}

function findHover(){
  hovered = null;
  const maxHit = 18;

  for (const t of targets){
    const p = polarToXY(t.r, t.a);
    const dx = mouse.x - p.x;
    const dy = mouse.y - p.y;
    const d = Math.hypot(dx, dy);

    if (d <= maxHit){
      hovered = t;
      break;
    }
  }
}

function showTooltip(t, x, y){
  tooltip.textContent = t.label;
  tooltip.style.left = `${x}px`;
  tooltip.style.top  = `${y}px`;
  tooltip.classList.add("show");
  tooltip.setAttribute("aria-hidden", "false");
}

function hideTooltip(){
  tooltip.classList.remove("show");
  tooltip.setAttribute("aria-hidden", "true");
}

function drawTargets(){
  for (const t of targets){
    const p = polarToXY(t.r, t.a);

    const ang = degToRad(t.a) + Math.PI/2;
    const isHover = hovered && hovered.id === t.id;

    const sweepDiff = Math.abs(((sweep % (Math.PI*2)) - degToRad(t.a) + Math.PI*3) % (Math.PI*2) - Math.PI);
    const sweepBoost = Math.max(0, 1 - sweepDiff / 0.45);
    const pulse = 0.18 + sweepBoost * 0.55 + (isHover ? 0.25 : 0);

    ctx.save();
    ctx.shadowColor = "rgba(105,255,170,0.65)";
    ctx.shadowBlur = 18;

    ctx.beginPath();
    ctx.arc(p.x, p.y, isHover ? 5 : 4, 0, Math.PI*2);
    ctx.fillStyle = `rgba(105,255,170,${pulse})`;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(p.x, p.y, isHover ? 18 : 14, 0, Math.PI*2);
    ctx.strokeStyle = `rgba(105,255,170,${isHover ? 0.22 : 0.12})`;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.restore();

    drawAircraft(p.x, p.y, ang, isHover ? 18 : 16, t.type, isHover);

    ctx.save();
    ctx.shadowBlur = 0;
    ctx.font = "12px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.fillStyle = `rgba(230,255,245,${isHover ? 0.92 : 0.42})`;
    ctx.textAlign = "center";
    ctx.fillText(t.label, p.x, p.y + 34);
    ctx.restore();
  }
}

function frame(now){
  const dt = now - last;
  last = now;

  clearWithTrail();
  drawRadarGrid();
  drawSweep(dt);
  drawNoise();

  if (mouse.inside) findHover();
  drawTargets();

  if (hovered && mouse.inside){
    const p = polarToXY(hovered.r, hovered.a);
    showTooltip(hovered, p.x, p.y);
    canvas.style.cursor = "pointer";
  } else {
    hideTooltip();
    canvas.style.cursor = "default";
  }

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
