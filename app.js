/* =========================================================
   Radar Vial v4 — Panel de cámaras de tráfico y webcams públicas
   Fuentes:
   - Iowa DOT (EE. UU.): datos abiertos oficiales (instantáneas + HLS)
   - Live-Environment-Streams: +5.000 webcams públicas de 98 países
   - Cámaras públicas de Argentina (Telpin / SkylineWebcams)
   - Cámaras añadidas por el usuario
   ========================================================= */
"use strict";

const API_URL =
  "https://services.arcgis.com/8lRhdTsQyJpO52F1/arcgis/rest/services/Traffic_Cameras_View/FeatureServer/0/query" +
  "?where=1%3D1&outFields=*&f=json&orderByFields=FID&resultRecordCount=1000&resultOffset=";

const LOCAL_DATA = "camaras.json";
const STORAGE_KEY = "***";
const PAGE_SIZE = 24;

/* ---------- Dataset mundial (se carga en vivo, con fuentes de respaldo) ---------- */
const FUENTES_MUNDO = [
  "https://raw.githubusercontent.com/william-ricchiuti/Live-Environment-Streams/HEAD/data/",
  "https://cdn.jsdelivr.net/gh/william-ricchiuti/Live-Environment-Streams@HEAD/data/",
  "https://fastly.jsdelivr.net/gh/william-ricchiuti/Live-Environment-Streams@HEAD/data/",
  "https://gcore.jsdelivr.net/gh/william-ricchiuti/Live-Environment-Streams@HEAD/data/",
  "https://api.allorigins.win/raw?url=" +
    encodeURIComponent("https://raw.githubusercontent.com/william-ricchiuti/Live-Environment-Streams/HEAD/data/"),
];
let fuenteMundoOk = -1;   // índice de la fuente que funciona en esta red
const VERSION = "v4";

const PAISES_MUNDO = {
  AL: "Albania", AT: "Austria", AU: "Australia", AW: "Aruba", BA: "Bosnia y Herzegovina",
  BB: "Barbados", BE: "Bélgica", BG: "Bulgaria", BL: "San Bartolomé", BM: "Bermudas",
  BO: "Bolivia", BQ: "Caribe Neerlandés", BR: "Brasil", BZ: "Belice", CA: "Canadá",
  CH: "Suiza", CL: "Chile", CN: "China", CR: "Costa Rica", CV: "Cabo Verde",
  CW: "Curazao", CY: "Chipre", CZ: "Chequia", DE: "Alemania", DO: "República Dominicana",
  EC: "Ecuador", EE: "Estonia", EG: "Egipto", ES: "España", FI: "Finlandia",
  FO: "Islas Feroe", FR: "Francia", GB: "Reino Unido", GD: "Granada", GP: "Guadalupe",
  GR: "Grecia", GT: "Guatemala", GY: "Guyana", HR: "Croacia", HU: "Hungría",
  ID: "Indonesia", IE: "Irlanda", IL: "Israel", IN: "India", IR: "Irán",
  IS: "Islandia", IT: "Italia", JM: "Jamaica", JO: "Jordania", JP: "Japón",
  KE: "Kenia", KG: "Kirguistán", KR: "Corea del Sur", KY: "Islas Caimán", KZ: "Kazajistán",
  LK: "Sri Lanka", LT: "Lituania", LU: "Luxemburgo", LV: "Letonia", MA: "Marruecos",
  MQ: "Martinica", MT: "Malta", MV: "Maldivas", MX: "México", MY: "Malasia",
  NA: "Namibia", NL: "Países Bajos", NO: "Noruega", NZ: "Nueva Zelanda", PE: "Perú",
  PH: "Filipinas", PL: "Polonia", PR: "Puerto Rico", PT: "Portugal", RO: "Rumanía",
  RU: "Rusia", SC: "Seychelles", SG: "Singapur", SI: "Eslovenia", SM: "San Marino",
  SX: "San Martín", TC: "Islas Turcas y Caicos", TH: "Tailandia", TR: "Turquía",
  TT: "Trinidad y Tobago", TW: "Taiwán", TZ: "Tanzania", US: "Estados Unidos",
  UY: "Uruguay", VE: "Venezuela", VG: "Islas Vírgenes Británicas",
  VI: "Islas Vírgenes de EE. UU.", VN: "Vietnam", XK: "Kosovo",
  ZA: "Sudáfrica", ZM: "Zambia",
};

const TIPOS_TRADUCIDOS = {
  beach: "Playa", coastal: "Costera", urban: "Urbana", city: "Ciudad",
  mountain: "Montaña", traffic: "Tráfico", waterway: "Río / lago", nature: "Naturaleza",
  road: "Carretera", harbour: "Puerto", island: "Isla", desert: "Desierto",
  ski: "Esquí", wildlife: "Fauna", night: "Nocturna", weather: "Meteorología",
  river: "Río", lake: "Lago", forest: "Bosque", countryside: "Rural",
};

const FUENTES_TRADUCIDAS = {
  skylinewebcams: "SkylineWebcams", balticlivecam: "BalticLiveCam",
  opencctv: "OpenCCTV", worldviewstream: "WorldViewStream", youtube: "YouTube",
};

/* ---------------- Cámaras públicas de Argentina ---------------- */
const CAMARAS_ARGENTINA = [
  { id: "ar-01", nombre: "Pinamar — Bunge y Libertador (tráfico)", ruta: "Bunge / Libertador",
    region: "Buenos Aires", tipo: "Tráfico", lat: -37.1081, lon: -56.8598,
    imagen: "", video: "https://wowza.telpin.com.ar:1935/camara-fuente/smil:camara-fuente.smil/playlist.m3u8",
    web: "", fuente: "Municipalidad de Pinamar (Telpin)" },
  { id: "ar-02", nombre: "Pinamar — Muelle", ruta: "Costanera",
    region: "Buenos Aires", tipo: "Costera", lat: -37.11, lon: -56.8455,
    imagen: "", video: "https://wowza.telpin.com.ar:1935/camara-muelle/muelle.stream_720p/playlist.m3u8",
    web: "", fuente: "Municipalidad de Pinamar (Telpin)" },
  { id: "ar-03", nombre: "Pinamar — Bunge y el Mar (domo)", ruta: "Bunge",
    region: "Buenos Aires", tipo: "Costera", lat: -37.1083, lon: -56.8472,
    imagen: "", video: "https://wowza.telpin.com.ar:1935/camara-bypdomo/smil:camara-bypdomo.smil/playlist.m3u8",
    web: "", fuente: "Municipalidad de Pinamar (Telpin)" },
  { id: "ar-04", nombre: "Pinamar — Playas del Norte (Botavara)", ruta: "Costanera",
    region: "Buenos Aires", tipo: "Costera", lat: -37.095, lon: -56.848,
    imagen: "", video: "https://wowza.telpin.com.ar:1935/camara-botavara/smil:camara-botavara.smil/playlist.m3u8",
    web: "", fuente: "Municipalidad de Pinamar (Telpin)" },
  { id: "ar-05", nombre: "Ostende — La Rambla", ruta: "Rambla",
    region: "Buenos Aires", tipo: "Costera", lat: -37.138, lon: -56.865,
    imagen: "", video: "https://wowza.telpin.com.ar:1935/camara-rambla/smil:camara-rambla.smil/playlist.m3u8",
    web: "", fuente: "Municipalidad de Ostende (Telpin)" },
  { id: "ar-06", nombre: "Buenos Aires — Obelisco", ruta: "Av. 9 de Julio",
    region: "Ciudad de Buenos Aires", tipo: "Urbana", lat: -34.6037, lon: -58.3816,
    imagen: "", video: "", web: "https://www.skylinewebcams.com/es/webcam/argentina/buenos-aires/buenos-aires/obelisco.html",
    fuente: "SkylineWebcams" },
  { id: "ar-07", nombre: "Buenos Aires — Panorama de la ciudad", ruta: "",
    region: "Ciudad de Buenos Aires", tipo: "Urbana", lat: -34.6037, lon: -58.3816,
    imagen: "", video: "", web: "https://www.skylinewebcams.com/es/webcam/argentina/buenos-aires/buenos-aires/buenos-aires.html",
    fuente: "SkylineWebcams" },
  { id: "ar-08", nombre: "Necochea — Playa", ruta: "",
    region: "Buenos Aires", tipo: "Costera", lat: -38.55, lon: -58.74,
    imagen: "", video: "", web: "https://www.skylinewebcams.com/es/webcam/argentina/buenos-aires/necochea/necochea.html",
    fuente: "SkylineWebcams" },
  { id: "ar-09", nombre: "Pinamar — Playa", ruta: "",
    region: "Buenos Aires", tipo: "Costera", lat: -37.10, lon: -56.86,
    imagen: "", video: "", web: "https://www.skylinewebcams.com/es/webcam/argentina/buenos-aires/pinamar/pinamar-beach.html",
    fuente: "SkylineWebcams" },
  { id: "ar-10", nombre: "Costa Atlántica — Villa Gesell y Pinamar (directo)", ruta: "",
    region: "Buenos Aires", tipo: "Costera", lat: -37.33888, lon: -57.03914,
    imagen: "", video: "", web: "https://www.youtube.com/watch?v=2u4GnVNtlsY",
    fuente: "YouTube (directo)" },
  { id: "ar-11", nombre: "Cipolletti — Panorama", ruta: "",
    region: "Río Negro", tipo: "Urbana", lat: -38.933, lon: -67.994,
    imagen: "", video: "", web: "https://www.skylinewebcams.com/es/webcam/argentina/rio-negro-province/cipolletti/panorama.html",
    fuente: "SkylineWebcams" },
  { id: "ar-12", nombre: "San Rafael — Cañón del Atuel", ruta: "",
    region: "Mendoza", tipo: "Naturaleza", lat: -34.62, lon: -68.33,
    imagen: "", video: "", web: "https://www.skylinewebcams.com/es/webcam/argentina/provincia-de-mendoza/san-rafael/canon-del-atuel.html",
    fuente: "SkylineWebcams" },
  { id: "ar-13", nombre: "San Rafael — Valle Grande (Río Atuel)", ruta: "",
    region: "Mendoza", tipo: "Naturaleza", lat: -34.93, lon: -68.62,
    imagen: "", video: "", web: "https://www.skylinewebcams.com/es/webcam/argentina/provincia-de-mendoza/san-rafael/valle-grande-rio-atuel.html",
    fuente: "SkylineWebcams" },
  { id: "ar-14", nombre: "Tolhuin — Panorama", ruta: "",
    region: "Tierra del Fuego", tipo: "Urbana", lat: -54.51, lon: -67.2,
    imagen: "", video: "", web: "https://www.skylinewebcams.com/es/webcam/argentina/tierra-del-fuego/tolhuin/tolhuin.html",
    fuente: "SkylineWebcams" },
  { id: "ar-15", nombre: "Ushuaia — Panorama", ruta: "",
    region: "Tierra del Fuego", tipo: "Urbana", lat: -54.8, lon: -68.3,
    imagen: "", video: "", web: "https://www.skylinewebcams.com/es/webcam/argentina/tierra-del-fuego/ushuaia/ushuaia.html",
    fuente: "SkylineWebcams" },
  { id: "ar-16", nombre: "Ushuaia — Plaza Islas Malvinas", ruta: "",
    region: "Tierra del Fuego", tipo: "Urbana", lat: -54.8, lon: -68.3,
    imagen: "", video: "", web: "https://www.skylinewebcams.com/es/webcam/argentina/tierra-del-fuego/ushuaia/plaza-islas-malvinas.html",
    fuente: "SkylineWebcams" },
  { id: "ar-17", nombre: "Ushuaia — Tren del Fin del Mundo", ruta: "",
    region: "Tierra del Fuego", tipo: "Turismo", lat: -54.83, lon: -68.49,
    imagen: "", video: "", web: "https://www.skylinewebcams.com/es/webcam/argentina/tierra-del-fuego/ushuaia/tren-del-fin-del-mundo.html",
    fuente: "SkylineWebcams" },
];

const BANDERAS = {
  "Argentina": "🇦🇷",
  "Estados Unidos": "🇺🇸",
};

const state = {
  camaras: [],
  mundo: [],
  filtradas: [],
  propias: [],
  favoritos: [],
  mostradas: PAGE_SIZE,
  intervalo: 45000,
  temporizador: null,
  mapa: null,
  marcadores: null,
  cargando: false,
  calidadImagen: "auto",
  ultimaCarga: null,
  usuario: null,
  filtroCercania: false,
  radioCercaniaKm: 120,
  ordenActual: "pais",
  vistaActual: "todas",
};

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

/* ---------------- Utilidades ---------------- */

function escapeHtml(txt) {
  return String(txt ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function esStream(url) {
  return /\.m3u8(\?|$)/i.test(url || "");
}

function esUrlValida(url) {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return ["http:", "https:"].includes(parsed.protocol);
  } catch {
    return false;
  }
}

function conCacheBuster(url) {
  if (!url) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}_rv=${Date.now()}`;
}

function banderaCod(cod) {
  if (!cod || cod.length !== 2) return "🌍";
  return String.fromCodePoint(
    ...[...cod.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)
  );
}

function bandera(pais) {
  return BANDERAS[pais] || "🌍";
}

function traducirTipo(t) {
  if (!t) return "";
  return TIPOS_TRADUCIDOS[String(t).toLowerCase()] || String(t);
}

function traducirFuente(f) {
  if (!f) return "Webcam pública";
  return FUENTES_TRADUCIDAS[String(f).toLowerCase()] || String(f);
}

function guardarPropias() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.propias));
}

function guardarFavoritos() {
  localStorage.setItem("radar-vial-favoritos", JSON.stringify(state.favoritos));
}

function exportarFavoritos() {
  if (!state.favoritos.length) {
    setStatus("Todavía no tienes cámaras guardadas");
    return;
  }

  const contenido = JSON.stringify({ favoritos: state.favoritos }, null, 2);
  const blob = new Blob([contenido], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = "radar-vial-favoritos.json";
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  URL.revokeObjectURL(url);
  setStatus(`Se exportaron ${state.favoritos.length} favoritos`);
}

function exportarMisCamaras() {
  if (!state.propias.length) {
    setStatus("Todavía no has añadido cámaras propias");
    return;
  }

  const contenido = JSON.stringify({ camaras: state.propias }, null, 2);
  const blob = new Blob([contenido], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = "radar-vial-mis-camaras.json";
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  URL.revokeObjectURL(url);
  setStatus(`Se exportaron ${state.propias.length} cámaras personales`);
}

function importarFavoritosDesdeArchivo(archivo) {
  if (!archivo) return;

  const lector = new FileReader();
  lector.onload = () => {
    try {
      const datos = JSON.parse(String(lector.result || "{}"));
      const lista = Array.isArray(datos?.favoritos) ? datos.favoritos : Array.isArray(datos) ? datos : [];
      state.favoritos = [...new Set(lista.map(String))];
      guardarFavoritos();
      renderizarTarjetas();
      aplicarFiltros();
      setStatus(`Se importaron ${state.favoritos.length} favoritos`);
    } catch {
      setStatus("El archivo de favoritos no tiene un formato válido");
    }
  };
  lector.readAsText(archivo);
}

function importarMisCamarasDesdeArchivo(archivo) {
  if (!archivo) return;

  const lector = new FileReader();
  lector.onload = () => {
    try {
      const datos = JSON.parse(String(lector.result || "{}"));
      const lista = Array.isArray(datos?.camaras) ? datos.camaras : Array.isArray(datos) ? datos : [];

      const normalizadas = lista
        .filter((c) => c && (c.nombre || c.url || c.web || c.video || c.imagen))
        .map((c) => ({
          id: c.id || `propia-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          nombre: String(c.nombre || "Cámara personal").trim(),
          ruta: String(c.ruta || "").trim(),
          region: String(c.region || "Mis cámaras").trim(),
          tipo: String(c.tipo || "Personalizada").trim(),
          pais: String(c.pais || "Argentina").trim(),
          lat: Number.isFinite(Number(c.lat)) ? Number(c.lat) : null,
          lon: Number.isFinite(Number(c.lon)) ? Number(c.lon) : null,
          imagen: c.imagen || "",
          video: c.video || "",
          web: c.web || "",
          fuente: c.fuente || "Añadida por el usuario",
          propia: true,
        }))
        .filter((c) => c.nombre && (c.imagen || c.video || c.web));

      state.propias = normalizadas;
      guardarPropias();
      refrescarVista();
      setStatus(`Se importaron ${state.propias.length} cámaras personales`);
    } catch {
      setStatus("El archivo de cámaras personales no tiene un formato válido");
    }
  };
  lector.readAsText(archivo);
}

function cargarPropias() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    state.propias = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(state.propias)) state.propias = [];
  } catch {
    state.propias = [];
  }
}

function cargarFavoritos() {
  try {
    const raw = localStorage.getItem("radar-vial-favoritos");
    const lista = raw ? JSON.parse(raw) : [];
    state.favoritos = Array.isArray(lista) ? lista.map(String) : [];
  } catch {
    state.favoritos = [];
  }
}

function esFavorita(id) {
  return state.favoritos.includes(String(id));
}

function normalizarTexto(value) {
  return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function claveUnicaCamara(c) {
  if (!c) return "";
  const latLon = (c.lat != null && c.lon != null)
    ? `${Number(c.lat).toFixed(4)}:${Number(c.lon).toFixed(4)}`
    : "";

  return [
    normalizarTexto(c.nombre),
    normalizarTexto(c.ruta),
    normalizarTexto(c.region),
    normalizarTexto(c.pais),
    latLon,
    normalizarTexto(c.video || c.web || c.imagen || ""),
  ].filter(Boolean).join("|");
}

function deduplicarCamaras(lista) {
  const mapa = new Map();
  for (const cam of lista || []) {
    if (!cam) continue;
    const clave = claveUnicaCamara(cam);
    if (!clave) continue;
    if (!mapa.has(clave)) mapa.set(clave, cam);
  }
  return [...mapa.values()];
}

/* ---------------- Interfaz extra (insertada por JS) ---------------- */

function inyectarInterfaz() {
  const estilos = document.createElement("style");
  estilos.textContent = `
    .grupo-pais {
      grid-column: 1 / -1;
      margin: 14px 0 2px;
      padding: 10px 14px;
      font-size: 15px;
      letter-spacing: 0.4px;
      background: var(--panel-2);
      border: 1px solid var(--line);
      border-radius: 12px;
      display: flex;
      align-items: center;
      gap: 9px;
    }
    .grupo-pais small { color: var(--muted); font-weight: 400; font-size: 12px; }
    .thumb-web {
      display: grid;
      place-items: center;
      gap: 6px;
      color: var(--muted);
      background:
        radial-gradient(600px 200px at 30% 0%, rgba(76,141,255,0.18), transparent 60%),
        var(--panel-2);
      font-size: 13px;
    }
    .thumb-web .globo { font-size: 38px; opacity: 0.9; }
  `;
  document.head.appendChild(estilos);

  const barra = document.querySelector(".toolbar");
  const sel = document.createElement("select");
  sel.id = "filtro-pais";
  sel.setAttribute("aria-label", "Filtrar por país");
  sel.innerHTML = '<option value="">Todos los países</option>';
  barra.insertBefore(sel, $("#filtro-region"));

  const stat = document.createElement("div");
  stat.className = "stat";
  stat.innerHTML = '<b id="stat-paises">0</b><span>Países</span>';
  document.querySelector(".stats").appendChild(stat);
}

/* ---------------- Carga de datos ---------------- */

async function cargarDatos() {
  if (state.cargando) return;
  state.cargando = true;
  setStatus("Cargando cámaras…");

  let usa = [];

  // 1) API oficial de EE. UU. en vivo (CORS abierto)
  try {
    let offset = 0;
    for (let i = 0; i < 6; i++) {
      const resp = await fetch(API_URL + offset);
      if (!resp.ok) throw new Error("HTTP " + resp.status);
      const datos = await resp.json();
      const feats = datos.features || [];
      usa = usa.concat(feats.map(convertirFeature).filter(Boolean));
      if (feats.length < 1000) break;
      offset += feats.length;
    }
  } catch (err) {
    console.warn("API de EE. UU. no disponible, usando copia local:", err);
  }

  // 2) Respaldo: copia local del dataset de EE. UU.
  if (!usa.length) {
    try {
      const resp = await fetch(LOCAL_DATA);
      const datos = await resp.json();
      usa = (datos.camaras || []).map((c) => ({
        ...c,
        pais: c.pais || "Estados Unidos",
        web: c.web || "",
      }));
    } catch (err) {
      console.error("No se pudo cargar la copia local:", err);
    }
  }

  cargarPropias();
  state.usa = usa;
  refrescarVista();
  setStatus(usa.length
    ? `${VERSION} · Datos oficiales actualizados · ${new Date().toLocaleTimeString("es-ES")}`
    : "Sin conexión con la fuente de datos");
  state.cargando = false;

  // 3) Dataset mundial (se carga aparte y va refrescando la vista)
  cargarCamaraDelMundo();
}

function refrescarVista() {
  const argentina = CAMARAS_ARGENTINA.map((c) => ({
    ...c,
    pais: c.pais || "Argentina",
    propia: false,
  }));
  state.camaras = deduplicarCamaras([
    ...state.propias,
    ...argentina,
    ...state.mundo,
    ...(state.usa || []),
  ]);
  poblarFiltros();
  aplicarFiltros();
}

function convertirFeature(f) {
  const a = f.attributes || {};
  const imagen = a.ImageURL || "";
  if (!imagen && !a.VideoURL) return null;
  return {
    id: String(a.device_id || a.FID || Math.random().toString(36).slice(2)),
    nombre: a.Desc_ || a.ImageName || "Cámara de tráfico",
    ruta: a.Route || "",
    region: a.REGION || "",
    tipo: a.Type || "",
    lat: a.latitude ?? null,
    lon: a.longitude ?? null,
    imagen,
    video: a.VideoURL || "",
    web: "",
    fuente: "Iowa DOT (IADOT)",
    pais: "Estados Unidos",
    propia: false,
  };
}

/* ---------------- Dataset mundial (98 países) ---------------- */

async function cargarCamaraDelMundo() {
  const codigos = Object.keys(PAISES_MUNDO).filter((c) => c !== "AR");
  const TAM_LOTE = 12;
  const vistas = new Set();

  for (let i = 0; i < codigos.length; i += TAM_LOTE) {
    const lote = codigos.slice(i, i + TAM_LOTE);
    const resultados = await Promise.all(
      lote.map(async (cod) => {
        try {
          const datos = await obtenerJsonMundo(cod);
          if (!datos) return [];
          return (datos.features || []).map((f) => convertirWebcam(f, cod, vistas)).filter(Boolean);
        } catch {
          return [];
        }
      })
    );

    const nuevas = resultados.flat();
    state.mundo = deduplicarCamaras([...state.mundo, ...nuevas]);
    const hechos = Math.min(i + TAM_LOTE, codigos.length);
    setStatus(`${VERSION} · Cargando cámaras del mundo… (${hechos}/${codigos.length} países · ${state.mundo.length.toLocaleString("es-ES")} cámaras)`);
    refrescarVista();
  }

  if (!state.mundo.length) {
    setStatus(`⚠️ ${VERSION}: no se pudo cargar el dataset mundial desde esta red (prueba otra conexión o recarga)`);
    return;
  }

  setStatus(`${VERSION} · Datos actualizados · ${new Date().toLocaleTimeString("es-ES")} · ` +
    `${state.mundo.length.toLocaleString("es-ES")} webcams de ${Object.keys(PAISES_MUNDO).length} países`);
}

/* Descarga el JSON de un país probando las fuentes en orden:
   primero la que ya funcionó, luego las de respaldo.
   Cada intento se corta a los 10 s para no bloquearse si la red "cuelga". */
async function obtenerJsonMundo(cod) {
  const orden = fuenteMundoOk >= 0
    ? [fuenteMundoOk, ...FUENTES_MUNDO.map((_, i) => i).filter((i) => i !== fuenteMundoOk)]
    : FUENTES_MUNDO.map((_, i) => i);

  for (const idx of orden) {
    try {
      const control = new AbortController();
      const reloj = setTimeout(() => control.abort(), 10000);
      const base = FUENTES_MUNDO[idx];
      const destino = base.endsWith("=")
        ? base + encodeURIComponent(cod + ".json")   // proxy allorigins
        : base + cod + ".json";
      const resp = await fetch(destino, { signal: control.signal });
      clearTimeout(reloj);
      if (!resp.ok) continue;
      const datos = await resp.json();
      if (datos && Array.isArray(datos.features)) {
        if (fuenteMundoOk !== idx) {
          fuenteMundoOk = idx;
          console.info("[Radar Vial] Fuente mundial activa:", base);
        }
        return datos;
      }
    } catch {
      // probamos con la siguiente fuente
    }
  }
  return null;
}

function convertirWebcam(f, cod, vistas) {
  const p = f.properties || {};
  const g = f.geometry || {};
  const co = g.coordinates || [];
  if (p.status && p.status !== "active") return null;

  const url = p.url || "";
  if (!url || vistas.has(url)) return null;
  vistas.add(url);

  const tipo = p.url_type || "";
  const pais = PAISES_MUNDO[cod] || cod;
  if (!BANDERAS[pais]) BANDERAS[pais] = banderaCod(cod);

  return {
    id: `mundo-${cod}-${String(p.name || vistas.size).toLowerCase().replace(/\W+/g, "-").slice(0, 42)}`,
    nombre: p.name || p.display_name || "Webcam pública",
    ruta: "",
    region: p.display_name || pais,
    tipo: traducirTipo(p.scene_type || p.environment),
    lat: co[1] ?? null,
    lon: co[0] ?? null,
    imagen: "",
    video: tipo === "hls" ? url : "",
    web: tipo === "hls" ? "" : url,
    fuente: traducirFuente(p.source_family),
    pais,
    propia: false,
  };
}

function setStatus(texto) {
  const el = $("#estado-datos");
  if (el) el.textContent = texto;
}

function ajustarCalidadImagen(url) {
  if (!url || state.calidadImagen === "auto") return url;
  if (!/\.(jpe?g|png|webp|gif)(\?|$)/i.test(url)) return url;

  const calidadMap = { baja: "?quality=low", media: "?quality=medium", alta: "?quality=high" };
  const sufijo = calidadMap[state.calidadImagen] || "";
  return `${url}${url.includes("?") ? "&" : "?"}${sufijo.replace(/^\?/, "")}`;
}

/* ---------------- Filtros ---------------- */

function poblarFiltros() {
  const selPais = $("#filtro-pais");
  const selRegion = $("#filtro-region");
  const selTipo = $("#filtro-tipo");

  const paisSel = selPais.value || "";
  const regionSel = selRegion.value || "";
  const tipoSel = selTipo.value || "";

  const camarasActivas = paisSel ? state.camaras.filter((c) => c.pais === paisSel) : state.camaras;
  const paises = [...new Set(state.camaras.map((c) => c.pais).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "es"));
  const regiones = [...new Set(camarasActivas.map((c) => c.region).filter(Boolean))].sort();
  const tipos = [...new Set(camarasActivas.map((c) => c.tipo).filter(Boolean))].sort();

  selPais.innerHTML = '<option value="">Todos los países</option>' +
    paises.map((p) => `<option value="${escapeHtml(p)}">${bandera(p)} ${escapeHtml(p)}</option>`).join("");
  selRegion.innerHTML = '<option value="">Todas las zonas</option>' +
    regiones.map((r) => `<option value="${escapeHtml(r)}">${escapeHtml(r)}</option>`).join("");
  selTipo.innerHTML = '<option value="">Todos los tipos</option>' +
    tipos.map((t) => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join("");

  // Mantiene la selección del usuario entre recargas
  if (paisSel) selPais.value = paisSel;
  if (regionSel && regiones.includes(regionSel)) selRegion.value = regionSel;
  else selRegion.value = "";
  if (tipoSel && tipos.includes(tipoSel)) selTipo.value = tipoSel;
  else selTipo.value = "";
}

function distanciaKm(aLat, aLon, bLat, bLon) {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLon = ((bLon - aLon) * Math.PI) / 180;
  const lat1 = (aLat * Math.PI) / 180;
  const lat2 = (bLat * Math.PI) / 180;
  const seno = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(seno), Math.sqrt(1 - seno));
}

function actualizarBotonUbicacion() {
  const btn = $("#btn-mi-ubicacion");
  if (!btn) return;
  const activo = state.filtroCercania && !!state.usuario;
  btn.textContent = activo ? "📍 Cerca de mí · activado" : "📍 Cerca de mí";
  btn.classList.toggle("btn-primary", activo);
}

function aplicarOrden(camaras) {
  const ordenar = $("#orden-camaras")?.value || state.ordenActual || "pais";
  state.ordenActual = ordenar;

  if (ordenar === "cercanas" && state.usuario) {
    return [...camaras].sort((a, b) => {
      const da = coordenadasValidas(a.lat, a.lon) ? distanciaKm(state.usuario.lat, state.usuario.lon, a.lat, a.lon) : Number.POSITIVE_INFINITY;
      const db = coordenadasValidas(b.lat, b.lon) ? distanciaKm(state.usuario.lat, state.usuario.lon, b.lat, b.lon) : Number.POSITIVE_INFINITY;
      return da - db || (a.pais || "").localeCompare(b.pais || "", "es") || (a.nombre || "").localeCompare(b.nombre || "", "es");
    });
  }

  if (ordenar === "region") {
    return [...camaras].sort((a, b) =>
      (a.region || "").localeCompare(b.region || "", "es") ||
      (a.pais || "").localeCompare(b.pais || "", "es") ||
      (a.nombre || "").localeCompare(b.nombre || "", "es"));
  }

  if (ordenar === "nombre") {
    return [...camaras].sort((a, b) => (a.nombre || "").localeCompare(b.nombre || "", "es") ||
      (a.pais || "").localeCompare(b.pais || "", "es"));
  }

  return [...camaras].sort((a, b) =>
    (a.pais || "").localeCompare(b.pais || "", "es") ||
    (a.region || "").localeCompare(b.region || "", "es") ||
    (a.nombre || "").localeCompare(b.nombre || "", "es"));
}

function aplicarFiltros() {
  poblarFiltros();

  const q = ($("#buscar").value || "").trim().toLowerCase();
  const pais = $("#filtro-pais").value;
  const region = $("#filtro-region").value;
  const tipo = $("#filtro-tipo").value;
  const soloVideo = $("#filtro-video").checked;
  const soloFavoritos = $("#filtro-favoritos").checked;
  const vista = $("#vista-camaras")?.value || state.vistaActual || "todas";
  const cerca = state.filtroCercania && state.usuario;

  state.vistaActual = vista;

  state.filtradas = aplicarOrden(
    state.camaras.filter((c) => {
      if (pais && c.pais !== pais) return false;
      if (region && c.region !== region) return false;
      if (tipo && c.tipo !== tipo) return false;
      if (soloVideo && !c.video) return false;
      if (soloFavoritos && !esFavorita(c.id)) return false;
      if (vista === "mis" && !c.propia) return false;
      if (vista === "favoritas" && !esFavorita(c.id)) return false;
      if (vista === "directo" && !c.video) return false;
      if (cerca) {
        if (!coordenadasValidas(c.lat, c.lon)) return false;
        const distancia = distanciaKm(state.usuario.lat, state.usuario.lon, c.lat, c.lon);
        if (distancia > state.radioCercaniaKm) return false;
      }
      if (q) {
        const heno = `${c.nombre} ${c.ruta} ${c.region} ${c.tipo} ${c.pais}`.toLowerCase();
        if (!heno.includes(q)) return false;
      }
      return true;
    })
  );

  state.mostradas = PAGE_SIZE;
  renderizarTarjetas();
  renderizarMapa();
  actualizarEstadisticas();
}

/* ---------------- Estadísticas ---------------- */

function actualizarEstadisticas() {
  const total = state.filtradas.length;
  const conVideo = state.filtradas.filter((c) => c.video).length;
  const cercanas = state.usuario && state.filtroCercania
    ? state.filtradas.filter((c) => coordenadasValidas(c.lat, c.lon)).length
    : 0;

  $("#stat-total").textContent = total.toLocaleString("es-ES");
  $("#stat-video").textContent = conVideo.toLocaleString("es-ES");
  $("#stat-zonas").textContent = new Set(state.filtradas.map((c) => c.region).filter(Boolean)).size;
  const elPaises = $("#stat-paises");
  if (elPaises) elPaises.textContent = new Set(state.filtradas.map((c) => c.pais).filter(Boolean)).size;

  $("#summary-favoritas").textContent = state.favoritos.length.toLocaleString("es-ES");
  $("#summary-mis").textContent = state.propias.length.toLocaleString("es-ES");
  $("#summary-directo").textContent = state.camaras.filter((c) => c.video).length.toLocaleString("es-ES");
  $("#summary-cercanas").textContent = cercanas.toLocaleString("es-ES");
}
/* ---------------- Tarjetas ---------------- */

function renderizarTarjetas() {
  const grid = $("#rejilla");
  const visibles = state.filtradas.slice(0, state.mostradas);

  if (!state.camaras.length && state.cargando) {
    grid.innerHTML = `<div class="empty">
      <p><b>Cargando cámaras…</b></p>
      <p>Estamos reuniendo fuentes oficiales y webcams del mundo.</p>
    </div>`;
    $("#btn-mas").style.display = "none";
    return;
  }

  if (!visibles.length) {
    const vista = state.vistaActual || "todas";
    const textoVista = {
      todas: "Prueba a quitar filtros o añade tu propia cámara.",
      mis: "Todavía no has añadido cámaras propias. Usa el botón + Añadir cámara para crear tu panel personalizado.",
      favoritas: "Todavía no has guardado ninguna cámara como favorita. Haz clic en ☆ Guardar sobre cualquier tarjeta.",
      directo: "No hay cámaras en directo con los filtros actuales. Prueba a quitar el filtro de solo directo.",
    }[vista] || "Prueba a quitar filtros o cambia la vista de cámaras.";

    grid.innerHTML = `<div class="empty">
      <p><b>No hay cámaras que coincidan con la búsqueda.</b></p>
      <p>${textoVista}</p>
      ${vista !== "todas" ? '<button class="btn btn-primary" id="btn-reset-vista">Volver a todas</button>' : ""}
    </div>`;

    const btnReset = document.getElementById("btn-reset-vista");
    if (btnReset) {
      btnReset.addEventListener("click", () => {
        $("#vista-camaras").value = "todas";
        state.vistaActual = "todas";
        localStorage.setItem("radar-vial-vista", "todas");
        aplicarFiltros();
      });
    }

    $("#btn-mas").style.display = "none";
    return;
  }

  let html = "";
  let paisActual = null;
  visibles.forEach((c) => {
    if (c.pais !== paisActual) {
      paisActual = c.pais;
      const total = state.filtradas.filter((x) => x.pais === paisActual).length;
      html += `<h2 class="grupo-pais">${bandera(paisActual)} ${escapeHtml(paisActual || "Sin país")}
        <small>· ${total.toLocaleString("es-ES")} cámaras</small></h2>`;
    }
    html += tarjetaHtml(c);
  });
  grid.innerHTML = html;

  $("#btn-mas").style.display =
    state.filtradas.length > state.mostradas ? "inline-block" : "none";

  grid.querySelectorAll("img.instantanea").forEach((img) => {
    img.addEventListener("error", () => {
      img.closest(".thumb")?.classList.add("failed");
    });
    img.addEventListener("load", () => {
      img.closest(".thumb")?.classList.remove("failed");
    });
  });

  observarImagenes();
}

function tarjetaHtml(c) {
  const id = escapeHtml(c.id);
  const tieneVideo = Boolean(c.video);
  const tieneImagen = Boolean(c.imagen);
  const tieneWeb = Boolean(c.web);
  const favorita = esFavorita(c.id);

  const imagenSrc = ajustarCalidadImagen(c.imagen);
  const miniatura = tieneImagen
    ? `<div class="thumb">
         <img class="instantanea" alt="Instantánea de ${escapeHtml(c.nombre)}"
              src="${escapeHtml(imagenSrc)}" loading="lazy" data-raw="${escapeHtml(imagenSrc)}">
         <div class="badge"><span class="dot"></span> ${tieneVideo ? "En vivo" : "Instantánea"}</div>
         <div class="err">⚠️ Cámara no disponible en este momento</div>
       </div>`
    : `<div class="thumb thumb-web">
         <div class="globo">🌐</div>
         <div>${tieneVideo ? "Transmisión en directo" : "Enlace a la cámara oficial"}</div>
       </div>`;

  return `
  <article class="card" data-id="${id}">
    ${miniatura}
    <div class="card-body">
      <h3>${escapeHtml(c.nombre)}</h3>
      <div class="chips">
        <span class="chip">${bandera(c.pais)} ${escapeHtml(c.pais || "—")}</span>
        ${c.ruta ? `<span class="chip route">🛣️ ${escapeHtml(c.ruta)}</span>` : ""}
        ${c.region ? `<span class="chip">${escapeHtml(c.region)}</span>` : ""}
        ${c.tipo ? `<span class="chip">${escapeHtml(c.tipo)}</span>` : ""}
        ${c.propia ? `<span class="chip custom">⭐ Mi cámara</span>` : ""}
      </div>
      <div class="card-actions">
        ${tieneVideo
          ? `<button class="btn btn-primary" data-accion="video" data-id="${id}">▶ Ver en vivo</button>`
          : ""}
        ${tieneImagen
          ? `<button class="btn" data-accion="imagen" data-id="${id}">🔍 Ampliar</button>`
          : ""}
        ${tieneWeb
          ? `<button class="btn" data-accion="web" data-id="${id}">🔗 Abrir cámara</button>`
          : ""}
        ${c.lat != null && c.lon != null
          ? `<button class="btn" data-accion="mapa" data-id="${id}">📍 Mapa</button>`
          : ""}
        <button class="btn ${favorita ? "btn-primary" : ""}" data-accion="favorito" data-id="${id}">
          ${favorita ? "★ Guardada" : "☆ Guardar"}
        </button>
        ${c.propia
          ? `<button class="btn btn-ghost" data-accion="borrar" data-id="${id}">🗑️</button>`
          : ""}
      </div>
    </div>
  </article>`;
}

/* ---------------- Refresco de instantáneas ---------------- */

let visorImagenes = null;

function observarImagenes() {
  if (!("IntersectionObserver" in window)) return;
  visorImagenes?.disconnect();
  visorImagenes = new IntersectionObserver((entradas) => {
    entradas.forEach((e) => {
      if (e.isIntersecting) e.target.dataset.visible = "1";
      else delete e.target.dataset.visible;
    });
  }, { rootMargin: "80px" });

  $$("#rejilla img.instantanea").forEach((img) => visorImagenes.observe(img));
}

function refrescarInstantaneas() {
  if (state.intervalo <= 0) return;
  $$("#rejilla img.instantanea[data-visible='1']").forEach((img) => {
    const raw = img.dataset.raw;
    if (raw) img.src = conCacheBuster(raw);
  });

  const grande = $("#imagen-grande");
  if (grande && grande.dataset.raw) {
    grande.src = conCacheBuster(grande.dataset.raw);
  }
}

function programarRefresco() {
  clearInterval(state.temporizador);
  if (state.intervalo > 0) {
    state.temporizador = setInterval(refrescarInstantaneas, state.intervalo);
  }
}

/* ---------------- Mapa ---------------- */

function coordenadasValidas(lat, lon) {
  return Number.isFinite(lat) && Number.isFinite(lon) &&
    lat >= -90 && lat <= 90 &&
    lon >= -180 && lon <= 180;
}

function renderizarMapa() {
  if (!state.mapa) {
    state.mapa = L.map("mapa", {
      scrollWheelZoom: true,
      worldCopyJump: true,
      attributionControl: true,
    }).setView([20, 0], 2);

    const capaCalle = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
      detectRetina: true,
    });

    const capaSatelite = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
      attribution: 'Tiles &copy; Esri',
      maxZoom: 19,
      detectRetina: true,
    });

    const capaOscura = L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      maxZoom: 19,
      subdomains: "abcd",
      detectRetina: true,
    });

    const capaTopografica = L.tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", {
      attribution: 'Map data: &copy; OpenStreetMap contributors, SRTM | Map style: &copy; OpenTopoMap',
      maxZoom: 17,
      detectRetina: true,
    });

    state.capasBase = {
      "Calles": capaCalle,
      "Satelital": capaSatelite,
      "Topográfico": capaTopografica,
    };

    state.capaActiva = "Calles";
    state.layerControl = L.control.layers(state.capasBase, null, {
      collapsed: false,
      position: "topright",
    }).addTo(state.mapa);

    L.control.scale({ metric: true, imperial: false, position: "bottomleft" }).addTo(state.mapa);

    function aplicarTemaMapa() {
      const contenedor = state.mapa?.getContainer();
      if (!contenedor) return;
      contenedor.classList.toggle("map-dark", Boolean(state.mapaDarkMode));
    }

    function sincronizarControlCapas(nombre) {
      const radios = Array.from(document.querySelectorAll(".leaflet-control-layers-selector"));
      radios.forEach((input) => {
        const label = input.closest("label");
        const texto = label ? label.textContent.trim() : "";
        input.checked = texto === nombre;
      });
    }

    function cambiarCapaBase(nombre) {
      if (!state.capasBase || !state.capasBase[nombre]) return;
      Object.keys(state.capasBase).forEach((key) => {
        if (state.mapa.hasLayer(state.capasBase[key])) state.mapa.removeLayer(state.capasBase[key]);
      });
      state.capasBase[nombre].addTo(state.mapa);
      state.capaActiva = nombre;
      sincronizarControlCapas(nombre);
    }

    state.mapa.on("baselayerchange", (ev) => {
      state.capaActiva = ev.name;
      sincronizarControlCapas(ev.name);
    });

    cambiarCapaBase(state.capaActiva);
    state.mapa.whenReady(() => state.mapa.invalidateSize());

    state.marcadores = L.markerClusterGroup({
      chunkedLoading: true,
      maxClusterRadius: 45,
      showCoverageOnHover: false,
    });
    state.mapa.addLayer(state.marcadores);

    state.mapaDarkMode = false;
    const mapaNode = state.mapa.getContainer();
    if (mapaNode) mapaNode.classList.remove("map-dark");
  }

  state.mapa.invalidateSize();

  state.marcadores.clearLayers();

  const conCoords = state.filtradas.filter((c) => coordenadasValidas(c.lat, c.lon));
  const maxMarcadores = 700;
  const paso = Math.max(1, Math.ceil(conCoords.length / maxMarcadores));
  const muestra = paso > 1 ? conCoords.filter((_, i) => i % paso === 0).slice(0, maxMarcadores) : conCoords.slice(0, maxMarcadores);

  muestra.forEach((c) => {
    const marca = L.marker([c.lat, c.lon]);
    marca.bindPopup(`
      <div style="min-width:210px">
        <b>${escapeHtml(c.nombre)}</b><br>
        <span style="color:#667">${bandera(c.pais)} ${escapeHtml(c.region || "")}</span>
        ${c.imagen
          ? `<img src="${escapeHtml(c.imagen)}" style="width:100%;border-radius:8px;margin:8px 0"
               onerror="this.style.display='none'">`
          : ""}
        ${c.video
          ? `<button onclick="window.abrirStreamPorId('${escapeHtml(c.id)}')"
               style="width:100%;padding:8px;border-radius:8px;border:0;background:#35d0a5;font-weight:700;cursor:pointer">
               ▶ Ver en vivo</button>`
          : ""}
        ${c.web
          ? `<button onclick="window.open('${escapeHtml(c.web)}','_blank','noopener,noreferrer')"
               style="width:100%;padding:8px;border-radius:8px;border:0;background:#4c8dff;color:#fff;font-weight:700;cursor:pointer">
               🔗 Abrir cámara</button>`
          : ""}
      </div>`);
    state.marcadores.addLayer(marca);
  });

  if (!muestra.length) return;
  if (muestra.length === 1) {
    state.mapa.setView([muestra[0].lat, muestra[0].lon], 10, { animate: false });
    return;
  }

  const grupo = L.featureGroup(state.marcadores.getLayers());
  if (grupo.getLayers().length) {
    state.mapa.fitBounds(grupo.getBounds().pad(0.2), { maxZoom: 11, animate: false });
  }
}

function irAMapaGlobal() {
  if (!state.mapa) return;
  state.mapa.setView([20, 0], 2, { animate: true });
}

/* ---------------- Modales: stream / imagen ---------------- */

let hlsActivo = null;

function buscarCamara(id) {
  return state.camaras.find((c) => String(c.id) === String(id));
}

function abrirStream(id) {
  const c = buscarCamara(id);
  if (!c || !c.video) return;

  $("#titulo-modal").textContent = c.nombre;
  $("#subtitulo-modal").textContent =
    [c.pais, c.ruta && `Ruta ${c.ruta}`, c.region, c.fuente].filter(Boolean).join(" · ");

  const video = $("#reproductor");
  $("#imagen-grande").style.display = "none";
  video.style.display = "block";

  if (hlsActivo) { hlsActivo.destroy(); hlsActivo = null; }
  video.removeAttribute("src");
  video.load();

  if (video.canPlayType("application/vnd.apple.mpegurl")) {
    video.src = c.video; // Safari / iOS: HLS nativo
    video.play().catch(() => {});
  } else if (window.Hls && Hls.isSupported()) {
    hlsActivo = new Hls({ lowLatencyMode: true });
    hlsActivo.loadSource(c.video);
    hlsActivo.attachMedia(video);
    hlsActivo.on(Hls.Events.MANIFEST_PARSED, () => video.play().catch(() => {}));
    hlsActivo.on(Hls.Events.ERROR, (_, datos) => {
      if (datos.fatal) $("#nota-stream").textContent =
        "⚠️ No se pudo cargar el flujo en vivo. Puede estar caído o requerir otra conexión.";
    });
  } else {
    $("#nota-stream").textContent = "Tu navegador no soporta reproducción HLS.";
  }

  $("#nota-stream").textContent =
    `Fuente del flujo: ${c.video} — transmisión pública de ${c.fuente || "organismo oficial"}.`;
  abrirModal();
}

function abrirImagen(id) {
  const c = buscarCamara(id);
  if (!c || !c.imagen) return;

  $("#titulo-modal").textContent = c.nombre;
  $("#subtitulo-modal").textContent =
    [c.pais, c.ruta && `Ruta ${c.ruta}`, c.region, c.fuente].filter(Boolean).join(" · ");

  const video = $("#reproductor");
  if (hlsActivo) { hlsActivo.destroy(); hlsActivo = null; }
  video.pause();
  video.style.display = "none";

  const img = $("#imagen-grande");
  img.style.display = "block";
  img.dataset.raw = c.imagen;
  img.src = conCacheBuster(c.imagen);

  $("#nota-stream").textContent = "La instantánea se actualiza automáticamente cada pocos segundos.";
  abrirModal();
}

function abrirWeb(id) {
  const c = buscarCamara(id);
  if (c && c.web) window.open(c.web, "_blank", "noopener");
}

function abrirModal() {
  const modal = $("#modal");
  modal.classList.add("open");

  // En modo standalone/PWA, el back gesture del sistema solo se comporta
  // como "cerrar modal" si hay una entrada real del historial asociada a "la
  // vista abierta". Por eso usamos una URL hash y no un cierre artificial.
  if (window.location.hash !== "#modal-abierto") {
    window.history.pushState({ modalAbierto: true }, "", "#modal-abierto");
  }

  requestAnimationFrame(() => {
    const primerControl = modal.querySelector("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])");
    if (primerControl) primerControl.focus();
  });
}

function cerrarModal() {
  const modal = $("#modal");
  if (!modal.classList.contains("open")) return;

  modal.classList.remove("open");
  const video = $("#reproductor");
  video.pause();
  if (hlsActivo) { hlsActivo.destroy(); hlsActivo = null; }
  video.removeAttribute("src");
  video.load();
  const img = $("#imagen-grande");
  delete img.dataset.raw;
  img.style.display = "none";

  // No forzamos un historial "manual" del navegador si el cierre vino por
  // la navegación real del sistema; solo limpiamos el hash si existe.
  if (window.location.hash === "#modal-abierto" && window.history.state && window.history.state.modalAbierto) {
    window.history.back();
  }
}

/* ---------------- Cámaras propias del usuario ---------------- */

function guardarCamaraPropia(evento) {
  evento.preventDefault();
  const nombre = $("#prop-nombre").value.trim();
  const url = $("#prop-url").value.trim();
  const lat = parseFloat($("#prop-lat").value);
  const lon = parseFloat($("#prop-lon").value);

  if (!nombre || !url) {
    $("#prop-error").textContent = "El nombre y la URL son obligatorios.";
    return;
  }

  if (!esUrlValida(url)) {
    $("#prop-error").textContent = "La URL introducida no es válida. Usa una dirección http o https.";
    return;
  }

  const nueva = {
    id: "propia-" + Date.now(),
    nombre,
    ruta: $("#prop-ruta").value.trim(),
    region: "Mis cámaras",
    tipo: "Personalizada",
    pais: "Argentina",
    lat: Number.isFinite(lat) ? lat : null,
    lon: Number.isFinite(lon) ? lon : null,
    imagen: esStream(url) ? "" : url,
    video: esStream(url) ? url : "",
    web: /^https?:\/\/[^/]+\.[a-z]{2,}\/?$/i.test(url) ? url : "",
    fuente: "Añadida por el usuario",
    propia: true,
  };

  if (!nueva.imagen && !nueva.video && !nueva.web) {
    $("#prop-error").textContent = "Introduce una URL válida (imagen .jpg/.png o flujo .m3u8).";
    return;
  }

  if (nueva.web && !esUrlValida(nueva.web)) {
    $("#prop-error").textContent = "La URL de la cámara debe empezar por http o https.";
    return;
  }

  state.propias.push(nueva);
  guardarPropias();
  $("#form-propia").reset();
  $("#prop-error").textContent = "";
  $("#modal-propia").classList.remove("open");
  refrescarVista();
}

function borrarCamaraPropia(id) {
  state.propias = state.propias.filter((c) => String(c.id) !== String(id));
  guardarPropias();
  refrescarVista();
}

function alternarFavorito(id) {
  const clave = String(id);
  const estaba = state.favoritos.includes(clave);

  state.favoritos = estaba
    ? state.favoritos.filter((item) => item !== clave)
    : [...state.favoritos, clave];

  guardarFavoritos();
  if ($("#filtro-favoritos").checked) {
    aplicarFiltros();
  } else {
    renderizarTarjetas();
  }
}

/* ---------------- Eventos ---------------- */

function registrarEventos() {
  $("#buscar").addEventListener("input", debounce(aplicarFiltros, 250));
  $("#filtro-pais").addEventListener("change", aplicarFiltros);
  $("#filtro-region").addEventListener("change", aplicarFiltros);
  $("#filtro-tipo").addEventListener("change", aplicarFiltros);
  $("#filtro-video").addEventListener("change", aplicarFiltros);
  $("#filtro-favoritos").addEventListener("change", aplicarFiltros);
  $("#orden-camaras").addEventListener("change", (e) => {
    state.ordenActual = e.target.value;
    localStorage.setItem("radar-vial-orden", state.ordenActual);
    aplicarFiltros();
  });
  $("#vista-camaras").addEventListener("change", (e) => {
    state.vistaActual = e.target.value;
    localStorage.setItem("radar-vial-vista", state.vistaActual);
    aplicarFiltros();
  });
  $("#calidad-imagen").addEventListener("change", (e) => {
    state.calidadImagen = e.target.value;
    localStorage.setItem("radar-vial-calidad", state.calidadImagen);
    renderizarTarjetas();
    refrescarInstantaneas();
  });
  $("#btn-limpiar").addEventListener("click", () => {
    $("#buscar").value = "";
    $("#filtro-pais").value = "";
    $("#filtro-region").value = "";
    $("#filtro-tipo").value = "";
    $("#filtro-video").checked = false;
    $("#filtro-favoritos").checked = false;
    $("#vista-camaras").value = "todas";
    state.vistaActual = "todas";
    localStorage.setItem("radar-vial-vista", "todas");
    state.filtroCercania = false;
    actualizarBotonUbicacion();
    aplicarFiltros();
  });

  $("#btn-mi-ubicacion").addEventListener("click", () => {
    if (state.filtroCercania && state.usuario) {
      state.filtroCercania = false;
      actualizarBotonUbicacion();
      setStatus("Cercanía desactivada");
      aplicarFiltros();
      return;
    }

    if (!navigator.geolocation) {
      setStatus("Tu navegador no admite geolocalización");
      return;
    }

    setStatus("Solicitando tu ubicación…");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        state.usuario = {
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
        };
        state.filtroCercania = true;
        $("#orden-camaras").value = "cercanas";
        state.ordenActual = "cercanas";
        actualizarBotonUbicacion();
        setStatus(`Mostrando cámaras a menos de ${state.radioCercaniaKm} km de tu ubicación`);
        if (state.mapa) {
          state.mapa.setView([state.usuario.lat, state.usuario.lon], 8, { animate: true });
        }
        aplicarFiltros();
      },
      () => {
        setStatus("No se pudo acceder a tu ubicación");
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  });

  $("#radio-cercania").addEventListener("change", (e) => {
    state.radioCercaniaKm = Number.parseInt(e.target.value, 10) || 120;
    localStorage.setItem("radar-vial-radio-cercania", String(state.radioCercaniaKm));
    if (state.filtroCercania && state.usuario) {
      setStatus(`Mostrando cámaras a menos de ${state.radioCercaniaKm} km de tu ubicación`);
      aplicarFiltros();
    }
  });

  $("#btn-mapa-global").addEventListener("click", irAMapaGlobal);

  $("#intervalo").addEventListener("change", (e) => {
    state.intervalo = parseInt(e.target.value, 10) || 0;
    programarRefresco();
    refrescarInstantaneas();
  });

  $("#btn-actualizar").addEventListener("click", () => {
    state.mundo = [];
    state.cargando = false;
    cargarDatos();
  });

  $("#btn-exportar-favoritos").addEventListener("click", exportarFavoritos);
  $("#btn-importar-favoritos").addEventListener("click", () => $("#input-importar-favoritos").click());
  $("#input-importar-favoritos").addEventListener("change", (e) => {
    const archivo = e.target.files?.[0];
    importarFavoritosDesdeArchivo(archivo);
    e.target.value = "";
  });

  $("#btn-exportar-mis-camaras").addEventListener("click", exportarMisCamaras);
  $("#btn-importar-mis-camaras").addEventListener("click", () => $("#input-importar-mis-camaras").click());
  $("#input-importar-mis-camaras").addEventListener("change", (e) => {
    const archivo = e.target.files?.[0];
    importarMisCamarasDesdeArchivo(archivo);
    e.target.value = "";
  });

  $("#btn-mas").addEventListener("click", () => {
    state.mostradas += PAGE_SIZE;
    renderizarTarjetas();
  });

  $("#rejilla").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-accion]");
    if (!btn) return;
    const { accion, id } = btn.dataset;
    if (accion === "video") abrirStream(id);
    else if (accion === "imagen") abrirImagen(id);
    else if (accion === "web") abrirWeb(id);
    else if (accion === "mapa") {
      const c = buscarCamara(id);
      if (c && c.lat != null) {
        state.mapa.setView([c.lat, c.lon], 15);
        $("#mapa").scrollIntoView({ behavior: "smooth", block: "center" });
      }
    } else if (accion === "favorito") {
      alternarFavorito(id);
    } else if (accion === "borrar") borrarCamaraPropia(id);
  });

  $("#btn-cerrar-modal").addEventListener("click", () => {
    const modal = $("#modal");
    if (!modal.classList.contains("open")) return;
    cerrarModal();
  });
  $("#modal").addEventListener("click", (e) => {
    if (e.target.id === "modal") cerrarModal();
  });
  window.addEventListener("popstate", () => {
    const modal = $("#modal");
    if (modal.classList.contains("open")) {
      const video = $("#reproductor");
      video.pause();
      if (hlsActivo) { hlsActivo.destroy(); hlsActivo = null; }
      video.removeAttribute("src");
      video.load();
      modal.classList.remove("open");
      const img = $("#imagen-grande");
      delete img.dataset.raw;
      img.style.display = "none";
      return;
    }

    const modalPropia = $("#modal-propia");
    if (modalPropia.classList.contains("open")) {
      modalPropia.classList.remove("open");
    }
  });
  window.addEventListener("hashchange", () => {
    if (window.location.hash !== "#modal-abierto") {
      const modal = $("#modal");
      if (modal.classList.contains("open")) {
        const video = $("#reproductor");
        video.pause();
        if (hlsActivo) { hlsActivo.destroy(); hlsActivo = null; }
        video.removeAttribute("src");
        video.load();
        modal.classList.remove("open");
        const img = $("#imagen-grande");
        delete img.dataset.raw;
        img.style.display = "none";
      }
    }
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      cerrarModal();
      $("#modal-propia").classList.remove("open");
    }
  });

  $("#btn-anadir").addEventListener("click", () => {
    $("#modal-propia").classList.add("open");
    requestAnimationFrame(() => $("#prop-nombre").focus());
  });
  $("#btn-cerrar-propia").addEventListener("click", () => $("#modal-propia").classList.remove("open"));
  $("#form-propia").addEventListener("submit", guardarCamaraPropia);
  $("#modal-propia").addEventListener("click", (e) => {
    if (e.target.id === "modal-propia") $("#modal-propia").classList.remove("open");
  });
}

function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

/* ---------------- Arranque ---------------- */

document.addEventListener("DOMContentLoaded", () => {
  inyectarInterfaz();
  cargarFavoritos();
  registrarEventos();
  programarRefresco();
  actualizarBotonUbicacion();
  const calidad = localStorage.getItem("radar-vial-calidad");
  if (calidad) {
    state.calidadImagen = calidad;
    $("#calidad-imagen").value = calidad;
  }
  const orden = localStorage.getItem("radar-vial-orden");
  if (orden) {
    state.ordenActual = orden;
    $("#orden-camaras").value = orden;
  }
  const radio = localStorage.getItem("radar-vial-radio-cercania");
  if (radio) {
    state.radioCercaniaKm = Number.parseInt(radio, 10) || 120;
    $("#radio-cercania").value = String(state.radioCercaniaKm);
  }
  const vista = localStorage.getItem("radar-vial-vista");
  if (vista) {
    state.vistaActual = vista;
    $("#vista-camaras").value = vista;
  }
  cargarDatos();

  setInterval(() => {
    state.ultimaCarga = new Date();
    cargarDatos();
  }, 30 * 60 * 1000);
});

// Expuesto para los popups del mapa
window.abrirStreamPorId = abrirStream;