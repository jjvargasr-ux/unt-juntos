/* UNT Juntos — prototipo local de interfaz.
   Para sincronización real entre usuarios se requiere backend y base de datos. */
const DISTRITOS = [
  "Alto Trujillo", "El Porvenir", "Florencia de Mora", "Huanchaco",
  "La Esperanza", "Laredo", "Moche", "Poroto", "Salaverry", "Simbal",
  "Trujillo", "Víctor Larco Herrera"
];
const PUNTOS = [
  "Puerta principal UNT (Av. Juan Pablo II)", "Puerta de Ingeniería",
  "Paradero Av. América Sur", "Puerta de Medicina", "Biblioteca Central",
  "Parque Primavera", "Plaza de Armas de Laredo", "Parque principal de Laredo"
];
const COLORS = ["#1E4FD8", "#FF7A1A", "#18A957", "#7B4DFF", "#E8457C", "#0FA3B1"];
const NOMBRES = ["Ana", "Luis", "Rosa", "Diego", "Carla", "Jorge", "Lucía", "Marco", "Sofía", "Pedro", "Valeria", "Kevin"];
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);
const store = {
  get(k, d) { try { const v = localStorage.getItem("untj:" + k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem("untj:" + k, JSON.stringify(v)); } catch {} }
};
const HORAS = Array.from({ length: 18 }, (_, i) => {
  const h24 = i + 4, suffix = h24 < 12 ? "a. m." : "p. m.", h12 = h24 % 12 || 12;
  return `${h12}:00 ${suffix}`;
});
const CUSTOM = "Elegir la hora...";
function timeOptions(sel, value = "") {
  sel.innerHTML = `<option value="">Selecciona una hora</option>` + HORAS.map(h => `<option value="${h}">${h}</option>`).join("") + `<option value="${CUSTOM}">${CUSTOM}</option>`;
  if (value && HORAS.includes(value)) sel.value = value;
  else if (value) { sel.value = CUSTOM; }
}
function formatTime(v) {
  if (!v) return "";
  const [hh, mm] = v.split(":").map(Number), suffix = hh < 12 ? "a. m." : "p. m.", h = hh % 12 || 12;
  return `${h}:${String(mm).padStart(2,"0")} ${suffix}`;
}
function bindCustomTime(select, input, current = "") {
  timeOptions(select, current);
  input.hidden = select.value !== CUSTOM;
  if (current && !HORAS.includes(current)) input.value = to24(current);
  select.addEventListener("change", () => { input.hidden = select.value !== CUSTOM; if (select.value === CUSTOM) input.focus(); });
}
function to24(label) {
  const m = label.match(/(\d{1,2}):(\d{2})\s*(a\. m\.|p\. m\.)/i);
  if (!m) return "";
  let h = +m[1] % 12; if (m[3].toLowerCase().startsWith("p") ) h += 12;
  return `${String(h).padStart(2,"0")}:${m[2]}`;
}
function selectedTime(select, input) {
  if (select.value === CUSTOM) return formatTime(input.value);
  return select.value;
}
function fillDistrictSelect(select, selected = "") {
  select.innerHTML = `<option value="">Selecciona un distrito</option>` +
    DISTRITOS.map(d => `<option value="${escapeHtml(d)}">${escapeHtml(d)}</option>`).join("");
  select.value = DISTRITOS.includes(selected) ? selected : "";
}
function fillZones() {
  ["#zona", "#c-zona", "#edit-zona", "#f-zona"].forEach(id => fillDistrictSelect($(id)));
  $("#puntos-sugeridos").innerHTML = PUNTOS.map(p => `<option value="${escapeHtml(p)}"></option>`).join("");
}
function normalizeDistrict(value = "") {
  const v = String(value).toLowerCase();
  if (DISTRITOS.includes(value)) return value;
  if (v.includes("laredo")) return "Laredo";
  if (v.includes("esperanza")) return "La Esperanza";
  if (v.includes("porvenir")) return "El Porvenir";
  if (v.includes("florencia")) return "Florencia de Mora";
  if (v.includes("huanchaco")) return "Huanchaco";
  if (v.includes("moche")) return "Moche";
  if (v.includes("salaverry")) return "Salaverry";
  if (v.includes("alto trujillo")) return "Alto Trujillo";
  if (v.includes("víctor larco") || v.includes("victor larco") || v.includes("golf") || v.includes("california")) return "Víctor Larco Herrera";
  if (v.includes("poroto")) return "Poroto";
  if (v.includes("simbal")) return "Simbal";
  return "Trujillo";
}
function initials(n) { return (n || "?").trim().charAt(0).toUpperCase(); }
function colorFor(n) { let h = 0; for (const c of n) h = (h * 31 + c.charCodeAt(0)) >>> 0; return COLORS[h % COLORS.length]; }
function isNight(h) { return /p\. m\./.test(h) && parseInt(h) >= 7 && parseInt(h) !== 12; }
function nameFromEmail(e) { const u = e.split("@")[0].replace(/[._\d]+/g, " ").trim(); return u ? u.split(" ")[0].replace(/^./, c => c.toUpperCase()) : "Estudiante"; }
function escapeHtml(s) { return String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
let toastT;
function toast(msg) { const t=$("#toast"); t.textContent=msg; t.classList.add("show"); clearTimeout(toastT); toastT=setTimeout(()=>t.classList.remove("show"),2500); }
function seedGroups() {
  const samples = [
    ["Laredo", "7:00 a. m.", "Plaza de Armas de Laredo", 4, ["María", "José"]],
    ["Trujillo", "7:00 a. m.", "Parque Primavera", 4, ["Ana", "Luis", "Rosa"]],
    ["La Esperanza", "8:00 a. m.", "Paradero Av. América Sur", 5, ["Diego", "Carla"]],
    ["Moche", "6:00 a. m.", "Parque principal de Moche", 4, ["Marco"]],
    ["Trujillo", "9:00 a. m.", "Plaza de Armas de Trujillo", 4, ["Sofía", "Pedro"]]
  ];
  return samples.map((x,i)=>({id:i+1,zona:x[0],hora:x[1],punto:x[2],cupos:x[3],miembros:x[4],color:COLORS[i],creado:false}));
}
let state = {
  user: store.get("user", null), groups: store.get("groups", null) || seedGroups(),
  joined: store.get("joined", []), chats: store.get("chats", {}), current: null
};
if (state.user) state.user.zona = normalizeDistrict(state.user.zona);
state.groups.forEach(g => { g.zona = normalizeDistrict(g.zona); });
function save() { store.set("user",state.user); store.set("groups",state.groups); store.set("joined",state.joined); store.set("chats",state.chats); }
function show(screen) {
  $$(".screen").forEach(s => s.hidden = s.dataset.screen !== screen);
  $("#tabbar").hidden = screen === "login";
  $$(".tabbar button").forEach(b => b.classList.toggle("active",b.dataset.tab===screen || (screen==="grupo"&&b.dataset.tab==="mis")));
  const active=document.querySelector(`[data-screen="${screen}"]`); if(active) active.scrollTop=0;
  window.scrollTo(0,0);
}
function setupTimeFields() {
  bindCustomTime($("#hora"),$("#hora-custom"));
  bindCustomTime($("#c-hora"),$("#c-hora-custom"));
  bindCustomTime($("#edit-hora"),$("#edit-hora-custom"));
  bindCustomTime($("#edit-g-hora"),$("#edit-g-hora-custom"));
}
fillZones(); setupTimeFields();

/* Inicio de sesión con correo institucional. */
$("#login-form").addEventListener("submit", e => {
  e.preventDefault();
  const email=$("#email").value.trim().toLowerCase(), zona=$("#zona").value.trim(), hora=selectedTime($("#hora"),$("#hora-custom")), err=$("#login-error");
  if (!/^[^\s@]+@unitru\.edu\.pe$/.test(email)) return err.textContent="Usa tu correo institucional @unitru.edu.pe";
  if (!zona) return err.textContent="Selecciona tu distrito";
  if (!hora) return err.textContent="Selecciona o escribe tu hora aproximada de salida";
  err.textContent="";
  state.user={email,nombre:nameFromEmail(email),zona,hora}; save(); enterApp();

});
function enterApp() {
  fillDistrictSelect($("#f-zona"), state.user.zona);
  $("#f-hora").innerHTML=`<option>Todas</option>`+HORAS.map(h=>`<option>${h}</option>`).join("")+`<option>${CUSTOM}</option>`;
  $("#f-hora").value="Todas";
  $("#hello").textContent=`Hola, ${state.user.nombre} 👋`;
  renderList(); show("buscar");
}
function groupCard(g) {
  const full=g.miembros.length>=g.cupos, joined=state.joined.includes(g.id), libres=Math.max(0,g.cupos-g.miembros.length);
  const seats=Array.from({length:g.cupos},(_,i)=>`<span class="seat${i<g.miembros.length?"":" free"}"></span>`).join("");
  const action=joined?`<button class="join" data-open="${g.id}">Ver grupo</button>`:full?`<button class="join" disabled>Lleno</button>`:`<button class="join" data-join="${g.id}">Unirme</button>`;
  return `<article class="group${full&&!joined?" full":""}" style="--accent:${g.color||COLORS[0]}">
    <h3>${escapeHtml(g.zona)} <span class="tag">${escapeHtml(g.hora)}</span>${joined?'<span class="tag mine">Tu grupo</span>':isNight(g.hora)?'<span class="tag night">Nocturno</span>':""}</h3>
    <div class="meta"><span>📍 Punto de encuentro: <b>${escapeHtml(g.punto)}</b></span>
    <span>👥 ${g.miembros.length} integrantes de ${g.cupos}</span><span>🪑 ${libres} ${libres===1?"cupo disponible":"cupos disponibles"}</span>
    <span>🕒 Salida aproximada: <b>${escapeHtml(g.hora)}</b></span><span>📍 Distrito: <b>${escapeHtml(g.zona)}</b></span></div>
    <div class="group-foot"><div class="seats">${seats}</div>${action}</div></article>`;
}
function renderList() {
  const zona=$("#f-zona").value, hora=$("#f-hora").value;
  const res=state.groups.filter(g=>(g.zona===zona)&& (hora==="Todas"||hora===CUSTOM||g.hora===hora)).sort((a,b)=>HORAS.indexOf(a.hora)-HORAS.indexOf(b.hora));
  $("#count").textContent=res.length?`${res.length} grupo${res.length>1?"s":""} encontrado${res.length>1?"s":""}`:"";
  $("#lista").innerHTML=res.length?res.map(groupCard).join(""):`<div class="empty card"><b>Aún no hay grupos en ${escapeHtml(zona)} a esa hora</b>Crea uno e invita a otros estudiantes a coordinarse.<button class="btn btn-primary" data-crear>Crear grupo</button></div>`;
}
$("#f-zona").addEventListener("change",renderList); $("#f-hora").addEventListener("change",renderList);
document.addEventListener("click",e=>{const j=e.target.closest("[data-join]");if(j)return joinGroup(+j.dataset.join);const o=e.target.closest("[data-open]");if(o)return openGroup(+o.dataset.open,false);if(e.target.closest("[data-crear]"))openCrear();});
function joinGroup(id) {
  const g=state.groups.find(x=>x.id===id); if(!g||g.miembros.length>=g.cupos)return toast("Ese grupo ya está lleno");
  if(!g.miembros.includes(state.user.nombre))g.miembros.push(state.user.nombre);
  if(!state.joined.includes(id))state.joined.push(id);
  state.chats[id] ||= [{from:"UNT Juntos",text:`¡Bienvenido/a ${state.user.nombre}! Coordina con tu grupo.`}];
  save(); openGroup(id,true);
}
function openGroup(id,fresh) {
  const g=state.groups.find(x=>x.id===id);if(!g)return;state.current=id;
  $("#success-banner").querySelector("h3").textContent=fresh?"¡Te uniste al grupo!":"Tu grupo de viaje";
  $("#success-banner").querySelector(".check").style.display=fresh?"":"none";
  $("#g-sub").textContent=`${g.zona} · Grupo ${g.id}`; $("#g-hora").textContent=g.hora;
  $("#g-punto").textContent=g.punto; $("#g-destino").textContent="Universidad Nacional de Trujillo";
  $("#g-map").href="https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(g.punto+", "+g.zona+", La Libertad, Perú");
  $("#g-int-title").textContent=`Integrantes (${g.miembros.length} de ${g.cupos})`;
  const mem=g.miembros.map(n=>`<div class="member"><div class="avatar" style="background:${colorFor(n)}">${initials(n)}</div>${n===state.user.nombre&&state.joined.includes(g.id)?"Tú":escapeHtml(n)}</div>`);
  for(let i=g.miembros.length;i<g.cupos;i++)mem.push('<div class="member"><div class="avatar free">+</div>Libre</div>');
  $("#g-members").innerHTML=mem.join(""); show("grupo");
}
$("#btn-back").addEventListener("click",()=>{renderList();show("buscar");});
$("#btn-salir").addEventListener("click",()=>{const g=state.groups.find(x=>x.id===state.current);if(!g)return;const i=g.miembros.lastIndexOf(state.user.nombre);if(i>-1)g.miembros.splice(i,1);state.joined=state.joined.filter(x=>x!==g.id);if(g.creado&&!g.miembros.length)state.groups=state.groups.filter(x=>x.id!==g.id);save();renderList();show("buscar");toast("Saliste del grupo");});
function renderMis(){const mine=state.groups.filter(g=>state.joined.includes(g.id));$("#mis-lista").innerHTML=mine.length?mine.map(groupCard).join(""):'<div class="empty card"><b>Todavía no te uniste a ningún grupo</b>Busca compañeros en la pestaña Buscar.</div>';}
function renderPerfil(){const u=state.user;$("#perfil-avatar").textContent=initials(u.nombre);$("#perfil-avatar").style.background=colorFor(u.nombre);$("#perfil-nombre").textContent=u.nombre;$("#perfil-correo").textContent=u.email;$("#perfil-zona").textContent=u.zona;$("#perfil-hora").textContent=u.hora;}
$("#btn-editar-perfil").addEventListener("click",()=>{ fillDistrictSelect($("#edit-zona"), state.user.zona); bindCustomTime($("#edit-hora"),$("#edit-hora-custom"),state.user.hora); openSheet("perfil-edit"); });
$("#perfil-edit-form").addEventListener("submit",e=>{e.preventDefault();const zona=$("#edit-zona").value,hora=selectedTime($("#edit-hora"),$("#edit-hora-custom"));if(!zona||!hora)return toast("Selecciona tu distrito y la hora");state.user.zona=zona;state.user.hora=hora;save();closeSheet("perfil-edit");renderPerfil();fillDistrictSelect($("#f-zona"), zona);renderList();toast("Perfil actualizado");});
$("#btn-editar-grupo").addEventListener("click",()=>{const g=state.groups.find(x=>x.id===state.current);if(!g)return;bindCustomTime($("#edit-g-hora"),$("#edit-g-hora-custom"),g.hora);$("#edit-g-punto").value=g.punto;openSheet("grupo-edit");});
$("#grupo-edit-form").addEventListener("submit",e=>{e.preventDefault();const g=state.groups.find(x=>x.id===state.current);if(!g)return;const hora=selectedTime($("#edit-g-hora"),$("#edit-g-hora-custom")),punto=$("#edit-g-punto").value.trim();if(!hora||!punto)return toast("Completa la hora y el punto de encuentro");g.hora=hora;g.punto=punto;save();closeSheet("grupo-edit");openGroup(g.id,false);toast("Coordinación actualizada");});
$("#btn-logout").addEventListener("click",()=>{state.user=null;save();$("#login-form").reset();setupTimeFields();show("login");});
$$(".tabbar button").forEach(b=>b.addEventListener("click",()=>{const t=b.dataset.tab;if(t==="buscar")renderList();if(t==="mis")renderMis();if(t==="perfil")renderPerfil();show(t);}));
function openSheet(id){$("#"+id).hidden=false;$("#"+id+"-backdrop").hidden=false;}
function closeSheet(id){$("#"+id).hidden=true;$("#"+id+"-backdrop").hidden=true;}
[["chat","chat-close"],["crear","crear-close"],["perfil-edit","perfil-edit-close"],["grupo-edit","grupo-edit-close"],["ayuda","ayuda-close"]].forEach(([id,btn])=>{$("#"+btn).addEventListener("click",()=>closeSheet(id));$("#"+id+"-backdrop").addEventListener("click",()=>closeSheet(id));});
function renderChat(){const msgs=state.chats[state.current]||[];$("#messages").innerHTML=msgs.map(m=>`<div class="msg${m.from===state.user.nombre?" me":""}"><small>${escapeHtml(m.from)}</small>${escapeHtml(m.text)}</div>`).join("");$("#messages").scrollTop=$("#messages").scrollHeight;}
function sendMsg(text){if(!text.trim())return;(state.chats[state.current]||=[]).push({from:state.user.nombre,text:text.trim()});save();renderChat();}
$("#btn-chat").addEventListener("click",()=>{renderChat();openSheet("chat");});
$("#quick").addEventListener("click",e=>{const b=e.target.closest("button");if(b)sendMsg(b.textContent);});
$("#composer").addEventListener("submit",e=>{e.preventDefault();sendMsg($("#msg").value);$("#msg").value="";});
function openCrear(){ fillDistrictSelect($("#c-zona"), $("#f-zona").value||state.user.zona);bindCustomTime($("#c-hora"),$("#c-hora-custom"),state.user.hora);$("#c-punto").value="";openSheet("crear"); }
$("#btn-crear").addEventListener("click",openCrear);
$("#crear-form").addEventListener("submit",e=>{e.preventDefault();const zona=$("#c-zona").value,hora=selectedTime($("#c-hora"),$("#c-hora-custom")),punto=$("#c-punto").value.trim();if(!zona||!hora||!punto)return toast("Selecciona el distrito, la hora y el punto de encuentro");const id=Math.max(0,...state.groups.map(g=>g.id))+1;const g={id,zona,hora,punto,cupos:+$("#c-cupos").value,miembros:[],color:COLORS[id%COLORS.length],creado:true};state.groups.push(g);save();closeSheet("crear");fillDistrictSelect($("#f-zona"), zona);$("#f-hora").value="Todas";joinGroup(id);toast("Grupo creado");});
$("#btn-ayuda").addEventListener("click",()=>openSheet("ayuda"));
if(state.user)enterApp();else show("login");
