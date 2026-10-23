/* UNT Juntos — prototipo funcional (sin servidor).
   Los datos se guardan en el navegador (localStorage), así que cada persona
   ve sus propios grupos. Sirve para la prueba de usuario del curso. */

const ZONAS = [
  "El Porvenir", "La Esperanza", "Florencia de Mora", "Alto Trujillo",
  "Trujillo Centro", "Víctor Larco", "Huanchaco", "Moche", "Laredo", "Salaverry"
];
const HORAS = [
  "7:00 a. m.", "8:00 a. m.", "10:00 a. m.", "12:00 p. m.", "1:00 p. m.",
  "1:15 p. m.", "3:00 p. m.", "5:00 p. m.", "7:00 p. m.", "9:00 p. m."
];
const PUNTOS = [
  "Puerta principal UNT (Av. Juan Pablo II)",
  "Puerta de Ingeniería",
  "Paradero Av. América Sur",
  "Puerta de Medicina",
  "Biblioteca Central"
];
const MAPS = {
  "Puerta principal UNT (Av. Juan Pablo II)": "Universidad Nacional de Trujillo, Av. Juan Pablo II, Trujillo",
  "Puerta de Ingeniería": "Facultad de Ingeniería Universidad Nacional de Trujillo",
  "Paradero Av. América Sur": "Av. América Sur, Trujillo",
  "Puerta de Medicina": "Facultad de Medicina Universidad Nacional de Trujillo",
  "Biblioteca Central": "Biblioteca Central Universidad Nacional de Trujillo"
};
const COLORS = ["#1E4FD8", "#FF7A1A", "#18A957", "#7B4DFF", "#E8457C", "#0FA3B1"];
const NOMBRES = ["Ana", "Luis", "Rosa", "Diego", "Carla", "Jorge", "Lucía", "Marco", "Sofía", "Pedro", "Valeria", "Kevin"];

const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

/* ---------- Almacenamiento seguro ---------- */
const store = {
  get(k, d) { try { const v = localStorage.getItem("untj:" + k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem("untj:" + k, JSON.stringify(v)); } catch {} }
};

/* ---------- Datos de ejemplo ---------- */
function seedGroups() {
  const groups = [];
  let id = 1;
  ZONAS.forEach((zona, zi) => {
    HORAS.forEach((hora, hi) => {
      if ((zi + hi) % 3 === 2) return; // no todas las combinaciones tienen grupo
      const cupos = 4 + ((zi + hi) % 2);
      const ocupados = Math.min(cupos, 1 + ((zi * 3 + hi) % (cupos + 1)));
      const miembros = Array.from({ length: ocupados }, (_, i) => NOMBRES[(zi + hi + i * 5) % NOMBRES.length]);
      groups.push({
        id: id++, zona, hora,
        punto: PUNTOS[(zi + hi) % PUNTOS.length],
        cupos, miembros,
        color: COLORS[(zi + hi) % COLORS.length]
      });
    });
  });
  return groups;
}

let state = {
  user: store.get("user", null),
  groups: store.get("groups", null) || seedGroups(),
  joined: store.get("joined", []),
  chats: store.get("chats", {}),
  current: null
};
function save() {
  store.set("user", state.user);
  store.set("groups", state.groups);
  store.set("joined", state.joined);
  store.set("chats", state.chats);
}

/* ---------- Utilidades ---------- */
function fillSelect(sel, items, value, first) {
  sel.innerHTML = (first ? `<option value="">${first}</option>` : "") +
    items.map((i) => `<option${i === value ? " selected" : ""}>${i}</option>`).join("");
}
function initials(n) { return n.trim().charAt(0).toUpperCase(); }
function colorFor(n) { let h = 0; for (const c of n) h = (h * 31 + c.charCodeAt(0)) >>> 0; return COLORS[h % COLORS.length]; }
function isNight(h) { return /p\. m\./.test(h) && (parseInt(h) >= 7 && parseInt(h) !== 12); }
function nameFromEmail(e) {
  const u = e.split("@")[0].replace(/[._\d]+/g, " ").trim();
  return u ? u.split(" ")[0].replace(/^./, (c) => c.toUpperCase()) : "Estudiante";
}
let toastT;
function toast(msg) {
  const t = $("#toast"); t.textContent = msg; t.classList.add("show");
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("show"), 2200);
}
function escapeHtml(s) { return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }

/* ---------- Navegación ---------- */
function show(screen) {
  $$(".screen").forEach((s) => (s.hidden = s.dataset.screen !== screen));
  $("#tabbar").hidden = screen === "login";
  $$(".tabbar button").forEach((b) => b.classList.toggle("active", b.dataset.tab === screen || (screen === "grupo" && b.dataset.tab === "mis")));
  const active = document.querySelector(`[data-screen="${screen}"]`);
  if (active) active.scrollTop = 0;
  window.scrollTo(0, 0);
}

/* ---------- Pantalla 1 · Inicio ---------- */
fillSelect($("#zona"), ZONAS, "", "Elige tu zona");
fillSelect($("#hora"), HORAS, "", "Elige una hora");

$("#login-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const email = $("#email").value.trim().toLowerCase();
  const pass = $("#password").value;
  const zona = $("#zona").value;
  const hora = $("#hora").value;
  const err = $("#login-error");
  if (!/^[^\s@]+@unitru\.edu\.pe$/.test(email)) return (err.textContent = "Usa tu correo institucional @unitru.edu.pe");
  if (pass.length < 4) return (err.textContent = "Escribe tu contraseña (mínimo 4 caracteres)");
  if (!zona) return (err.textContent = "Elige tu zona de residencia");
  if (!hora) return (err.textContent = "Elige tu hora de salida habitual");
  err.textContent = "";
  state.user = { email, nombre: nameFromEmail(email), zona, hora };
  save();
  enterApp();
});

function enterApp() {
  fillSelect($("#f-zona"), ZONAS, state.user.zona);
  fillSelect($("#f-hora"), ["Todas", ...HORAS], state.user.hora);
  $("#hello").textContent = `Hola, ${state.user.nombre} 👋`;
  renderList();
  show("buscar");
}

/* ---------- Pantalla 2 · Buscar ---------- */
function groupCard(g, { mine = false } = {}) {
  const full = g.miembros.length >= g.cupos;
  const joined = state.joined.includes(g.id);
  const seats = Array.from({ length: g.cupos }, (_, i) => `<span class="seat${i < g.miembros.length ? "" : " free"}"></span>`).join("");
  const libres = g.cupos - g.miembros.length;
  let action;
  if (joined) action = `<button class="join" data-open="${g.id}">Ver grupo</button>`;
  else if (full) action = `<button class="join" disabled>Lleno</button>`;
  else action = `<button class="join" data-join="${g.id}">Unirme</button>`;
  return `
    <article class="group${full && !joined ? " full" : ""}" style="--accent:${g.color}">
      <h3>${g.zona} · ${g.hora}
        ${joined ? '<span class="tag mine">Tu grupo</span>' : isNight(g.hora) ? '<span class="tag night">Nocturno</span>' : ""}
      </h3>
      <div class="meta">
        <span>📍 Punto de encuentro: <b>${g.punto}</b></span>
        <span>👥 ${g.miembros.length} de ${g.cupos} lugares ocupados${!full ? ` · ${libres} libre${libres > 1 ? "s" : ""}` : ""}</span>
      </div>
      <div class="group-foot"><div class="seats">${seats}</div>${action}</div>
    </article>`;
}

function renderList() {
  const zona = $("#f-zona").value;
  const hora = $("#f-hora").value;
  const res = state.groups
    .filter((g) => g.zona === zona && (hora === "Todas" || g.hora === hora))
    .sort((a, b) => HORAS.indexOf(a.hora) - HORAS.indexOf(b.hora));
  $("#count").textContent = res.length ? `${res.length} grupo${res.length > 1 ? "s" : ""} encontrado${res.length > 1 ? "s" : ""}` : "";
  $("#lista").innerHTML = res.length
    ? res.map((g) => groupCard(g)).join("")
    : `<div class="empty card"><b>Aún no hay grupos a esa hora</b>Crea uno y otros miembros de la UNT de ${zona} podrán unirse.<button class="btn btn-primary" data-crear>Crear grupo</button></div>`;
}
$("#f-zona").addEventListener("change", renderList);
$("#f-hora").addEventListener("change", renderList);

document.addEventListener("click", (e) => {
  const j = e.target.closest("[data-join]");
  if (j) return joinGroup(+j.dataset.join);
  const o = e.target.closest("[data-open]");
  if (o) return openGroup(+o.dataset.open, false);
  if (e.target.closest("[data-crear]")) return openCrear();
});

function joinGroup(id) {
  const g = state.groups.find((x) => x.id === id);
  if (!g || g.miembros.length >= g.cupos) return toast("Ese grupo ya está lleno");
  g.miembros.push(state.user.nombre);
  if (!state.joined.includes(id)) state.joined.push(id);
  if (!state.chats[id]) state.chats[id] = [{ from: g.miembros[0] === state.user.nombre ? "UNT Juntos" : g.miembros[0], text: `¡Bienvenid@ ${state.user.nombre}! Nos vemos en ${g.punto} a las ${g.hora}` }];
  save();
  openGroup(id, true);
}

/* ---------- Pantalla 3 · Mi grupo ---------- */
function openGroup(id, fresh) {
  const g = state.groups.find((x) => x.id === id);
  if (!g) return;
  state.current = id;
  $("#success-banner").querySelector("h3").textContent = fresh ? "¡Te uniste al grupo!" : "Tu grupo de viaje";
  $("#success-banner").querySelector(".check").style.display = fresh ? "" : "none";
  $("#g-sub").textContent = `${g.zona} · Grupo ${g.id}`;
  $("#g-hora").textContent = `${g.hora} (hoy)`;
  $("#g-punto").textContent = g.punto;
  $("#g-destino").textContent = g.zona;
  $("#g-map").href = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(MAPS[g.punto] || g.punto);
  $("#g-int-title").textContent = `Integrantes (${g.miembros.length} de ${g.cupos})`;
  const mem = g.miembros.map((n) => {
    const me = n === state.user.nombre && state.joined.includes(g.id);
    return `<div class="member"><div class="avatar" style="background:${colorFor(n)}">${initials(n)}</div>${me ? "Tú" : escapeHtml(n)}</div>`;
  });
  for (let i = g.miembros.length; i < g.cupos; i++) mem.push(`<div class="member"><div class="avatar free">+</div>Libre</div>`);
  $("#g-members").innerHTML = mem.join("");
  show("grupo");
}
$("#btn-back").addEventListener("click", () => { renderList(); show("buscar"); });
$("#btn-salir").addEventListener("click", () => {
  const g = state.groups.find((x) => x.id === state.current);
  if (!g) return;
  const idx = g.miembros.lastIndexOf(state.user.nombre);
  if (idx > -1) g.miembros.splice(idx, 1);
  state.joined = state.joined.filter((x) => x !== g.id);
  if (g.creado && g.miembros.length === 0) state.groups = state.groups.filter((x) => x.id !== g.id);
  save(); renderList(); show("buscar"); toast("Saliste del grupo");
});

/* ---------- Mis grupos ---------- */
function renderMis() {
  const mine = state.groups.filter((g) => state.joined.includes(g.id));
  $("#mis-lista").innerHTML = mine.length
    ? mine.map((g) => groupCard(g, { mine: true })).join("")
    : `<div class="empty card"><b>Todavía no te uniste a ningún grupo</b>Busca grupos de tu zona y hora en la pestaña Buscar.</div>`;
}

/* ---------- Perfil ---------- */
function renderPerfil() {
  const u = state.user;
  $("#perfil-avatar").textContent = initials(u.nombre);
  $("#perfil-avatar").style.background = colorFor(u.nombre);
  $("#perfil-nombre").textContent = u.nombre;
  $("#perfil-correo").textContent = u.email;
  $("#perfil-zona").textContent = u.zona;
  $("#perfil-hora").textContent = u.hora;
}
$("#btn-logout").addEventListener("click", () => {
  state.user = null; save();
  $("#login-form").reset(); show("login");
});

$$(".tabbar button").forEach((b) => b.addEventListener("click", () => {
  const t = b.dataset.tab;
  if (t === "buscar") renderList();
  if (t === "mis") renderMis();
  if (t === "perfil") renderPerfil();
  show(t);
}));

/* ---------- Chat ---------- */
function openSheet(id) { $("#" + id).hidden = false; $("#" + id + "-backdrop").hidden = false; }
function closeSheet(id) { $("#" + id).hidden = true; $("#" + id + "-backdrop").hidden = true; }

function renderChat() {
  const msgs = state.chats[state.current] || [];
  $("#messages").innerHTML = msgs.map((m) =>
    `<div class="msg${m.from === "me" ? " me" : ""}"><small>${escapeHtml(m.from)}</small>${escapeHtml(m.text)}</div>`).join("");
  $("#messages").scrollTop = $("#messages").scrollHeight;
}
function sendMsg(text) {
  if (!text.trim()) return;
  (state.chats[state.current] ||= []).push({ from: "me", text: text.trim() });
  save(); renderChat();
  const g = state.groups.find((x) => x.id === state.current);
  const others = g.miembros.filter((n) => n !== state.user.nombre);
  if (others.length) {
    setTimeout(() => {
      const who = others[Math.floor(Math.random() * others.length)];
      const replies = ["¡Perfecto! 👍", "Ok, te esperamos", "Yo también voy saliendo", "Genial, nos vemos ahí"];
      state.chats[state.current].push({ from: who, text: replies[Math.floor(Math.random() * replies.length)] });
      save(); if (!$("#chat").hidden) renderChat();
    }, 1200);
  }
}
$("#btn-chat").addEventListener("click", () => { renderChat(); openSheet("chat"); });
$("#chat-close").addEventListener("click", () => closeSheet("chat"));
$("#chat-backdrop").addEventListener("click", () => closeSheet("chat"));
$("#quick").addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) sendMsg(b.textContent); });
$("#composer").addEventListener("submit", (e) => { e.preventDefault(); sendMsg($("#msg").value); $("#msg").value = ""; });

/* ---------- Crear grupo ---------- */
function openCrear() {
  fillSelect($("#c-zona"), ZONAS, $("#f-zona").value || state.user.zona);
  const h = $("#f-hora").value;
  fillSelect($("#c-hora"), HORAS, h && h !== "Todas" ? h : state.user.hora);
  fillSelect($("#c-punto"), PUNTOS, PUNTOS[0]);
  openSheet("crear");
}
$("#btn-crear").addEventListener("click", openCrear);
$("#crear-close").addEventListener("click", () => closeSheet("crear"));
$("#crear-backdrop").addEventListener("click", () => closeSheet("crear"));
$("#crear-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const id = Math.max(0, ...state.groups.map((g) => g.id)) + 1;
  const g = {
    id, zona: $("#c-zona").value, hora: $("#c-hora").value, punto: $("#c-punto").value,
    cupos: +$("#c-cupos").value, miembros: [], color: COLORS[id % COLORS.length], creado: true
  };
  state.groups.push(g);
  closeSheet("crear");
  $("#f-zona").value = g.zona; $("#f-hora").value = g.hora;
  joinGroup(id);
  toast("Grupo creado");
});

/* ---------- Inicio ---------- */
if (state.user) enterApp(); else show("login");
