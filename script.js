/* =========================================================
   script.js
   1) stikalo za svetlo/temno temo
   2) naloži 3D model Toyote GR Yaris (GLB)
   3) ob scrollu avto obrne 0° → 180° in zamenja besedilo
   ========================================================= */

/* ---------------- NASTAVITVE (spreminjaj tukaj) ---------------- */
const CONFIG = {
  // GLB datoteka poleg index.html. GLB = 3D model z barvami in teksturami.
  modelUrl: "toyota-gr-yaris-rally1.glb",

  // Dolžina avta v sceni (pravi GR Yaris Rally1 je dolg ~4,2 m)
  carLength: 4.2,

  // Če model gleda nazaj, ga zavrtimo za 180°
  modelTurnDeg: 0,
};

/* ---------------- 1. TEMA ---------------- */
const root = document.documentElement;
const toggle = document.getElementById("theme-toggle");
const toggleLabel = document.getElementById("theme-label");
const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");

// Katera tema je TRENUTNO vidna? Ročna izbira ima prednost pred sistemom.
function currentTheme() {
  if (root.dataset.theme) return root.dataset.theme;
  return darkQuery.matches ? "dark" : "light";
}

function syncToggle() {
  const theme = currentTheme();
  toggle.dataset.mode = theme;
  toggleLabel.textContent = theme === "dark" ? "Svetlo" : "Temno";
  updateShadow();
}

toggle.addEventListener("click", () => {
  const next = currentTheme() === "dark" ? "light" : "dark";
  root.dataset.theme = next;
  try { localStorage.setItem("tema", next); } catch (e) {}
  syncToggle();
});
darkQuery.addEventListener("change", syncToggle);

/* ---------------- 2. 3D SCENA ---------------- */
const canvas = document.getElementById("car-canvas");
const sceneEl = document.getElementById("scene");
const captions = document.querySelectorAll(".caption");
const statusEl = document.getElementById("load-status");

let renderer, scene, camera, turntable, groundShadow;
let camStart, camEnd, look;

function initScene() {
  // alpha: true = prosojno ozadje, da se vidi CSS (napis, barva podlage)
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  // Pravilne barve tekstur (sRGB) in filmski ton, kot pri fotografiji
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);

  // Odsevi: "virtualna soba", ki se zrcali v laku in steklih
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new THREE.RoomEnvironment(), 0.04).texture;

  // Kamera: na začetku nizko spredaj (kot na posterju), na koncu malo bližje
  camStart = new THREE.Vector3(0, 1.5, 9.4);
  camEnd = new THREE.Vector3(0, 1.9, 7.8);
  look = new THREE.Vector3(0, 1.05, 0);

  // "Studijska" luč od zgoraj, ki meče senco
  const key = new THREE.DirectionalLight(0xffffff, 1.2);
  key.position.set(3, 9, 6);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5 });
  scene.add(key);

  // Nevidna tla, ki pokažejo samo senco pod avtom
  groundShadow = new THREE.Mesh(
    new THREE.PlaneGeometry(30, 30),
    new THREE.ShadowMaterial({ opacity: 0.3 })
  );
  groundShadow.rotation.x = -Math.PI / 2;
  groundShadow.receiveShadow = true;
  scene.add(groundShadow);

  // "Vrtljiva plošča": vanjo damo avto, nato vrtimo samo njo
  turntable = new THREE.Group();
  scene.add(turntable);

  loadCar();
  updateShadow();
  resize();
  new ResizeObserver(resize).observe(canvas);
  requestAnimationFrame(loop);
}

/* ---------- Nalaganje GLB ----------
   GLTFLoader prebere model z vsemi deli, barvami in teksturami.
   Tretji parameter (onProgress) pove, koliko je že prenesenega. */
function loadCar() {
  const loader = new THREE.GLTFLoader();
  const onLoad = (gltf) => {
    turntable.add(prepareCar(gltf.scene));
    statusEl.hidden = true;
  };
  const onError = () => {
    // Najpogostejši razlog: stran je odprta z dvoklikom (file://)
    statusEl.textContent = "Modela ni bilo mogoče naložiti. Odpri stran prek lokalnega strežnika (glej README).";
  };

  // Predogled na claude.ai ne sme naložiti .glb, zato tam model pride
  // kot besedilo (base64) v datoteki model-data.js. Doma tega ne rabiš.
  if (window.MODEL_BASE64) {
    const bytes = Uint8Array.from(atob(window.MODEL_BASE64), (c) => c.charCodeAt(0));
    loader.parse(bytes.buffer, "", onLoad, onError);
    return;
  }

  loader.load(
    CONFIG.modelUrl,
    onLoad,
    (e) => {
      if (e.total) statusEl.textContent = "Nalagam model " + Math.round((e.loaded / e.total) * 100) + " %";
    },
    onError
  );
}

/* ---------- Pripravi model ----------
   Vsak model je drugače velik in postavljen. Zato ga:
   1) povečamo na CONFIG.carLength, 2) postavimo na sredino,
   3) spodnji rob (kolesa) damo na tla, 4) vklopimo sence. */
function prepareCar(model) {
  model.rotation.y = THREE.MathUtils.degToRad(CONFIG.modelTurnDeg);

  let box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  model.scale.multiplyScalar(CONFIG.carLength / Math.max(size.x, size.z));

  box = new THREE.Box3().setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  model.position.x -= center.x;
  model.position.z -= center.z;
  model.position.y -= box.min.y;

  model.traverse((part) => {
    if (part.isMesh) part.castShadow = true;
  });

  // Ovijemo v skupino, da vrtenje ne pokvari zgornjih popravkov
  const car = new THREE.Group();
  car.add(model);
  return car;
}

function updateShadow() {
  if (!groundShadow) return;
  groundShadow.material.opacity = currentTheme() === "dark" ? 0.65 : 0.28;
}

function resize() {
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if (!w || !h) return;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  // Na pokončnem zaslonu (telefon) širši kot, da je bok avta cel viden
  camera.fov = camera.aspect < 0.8 ? 60 : 30;
  camera.updateProjectionMatrix();
}

/* ---------- Scroll → napredek 0 … 1 ---------- */
function scrollProgress() {
  const rect = sceneEl.getBoundingClientRect();
  const total = rect.height - window.innerHeight;
  return clamp(-rect.top / total, 0, 1);
}

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => t * t * (3 - 2 * t);   // mehak začetek in konec

let smooth = 0;
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function loop() {
  smooth = reduceMotion ? scrollProgress() : lerp(smooth, scrollProgress(), 0.1);

  // 0 – 0.8: obrat od 0° (spredaj) do 180° (zadaj)
  const turn = ease(clamp(smooth / 0.8, 0, 1));
  turntable.rotation.y = turn * Math.PI;

  // 0.8 – 1: kamera se malo približa zadku
  const push = ease(clamp((smooth - 0.8) / 0.2, 0, 1));
  camera.position.lerpVectors(camStart, camEnd, push);
  camera.lookAt(look);

  // Katero besedilo pokažemo: spredaj / bok / zadaj
  const phase = turn < 0.22 ? 0 : turn < 0.78 ? 1 : 2;
  captions.forEach((el, i) => el.classList.toggle("is-active", i === phase));

  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}

/* ---------- ZAGON ---------- */
if (window.THREE && THREE.GLTFLoader && THREE.RoomEnvironment) {
  initScene();
} else {
  statusEl.textContent = "3D knjižnica se ni naložila.";
}
syncToggle();
