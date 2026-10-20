// Procedural 3D scenes for the app's artwork: cars, helmets, circuits and the news cover.
// Bundled by render.mjs and run in headless Chromium; every model here is built from
// primitives in code, so the renders are original artwork.
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const canvas = document.getElementById("c");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
// Neutral tone mapping keeps livery colours saturated (ACES washes reds towards pink).
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setClearColor(0x000000, 0);

const pmrem = new THREE.PMREMGenerator(renderer);
const envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

/* ---------- shared helpers ---------- */

const paint = (color, extra = {}) =>
  new THREE.MeshPhysicalMaterial({ color, metalness: 0.05, roughness: 0.42, clearcoat: 0.8, clearcoatRoughness: 0.08, ...extra });
const carbon = () => new THREE.MeshPhysicalMaterial({ color: 0x0d0d0f, metalness: 0.3, roughness: 0.5, clearcoat: 0.25, clearcoatRoughness: 0.35, envMapIntensity: 0.35 });
const rubber = () => new THREE.MeshStandardMaterial({ color: 0x151515, metalness: 0, roughness: 0.85 });

function stage({ width, height, fov = 28, camera: camPos, target, keyLight = [6, 9, 5], shadowSize = 8 }) {
  renderer.setSize(width, height, false);
  const scene = new THREE.Scene();
  scene.environment = envMap;
  scene.environmentIntensity = 0.55;
  const camera = new THREE.PerspectiveCamera(fov, width / height, 0.1, 200);
  camera.position.set(...camPos);
  camera.lookAt(new THREE.Vector3(...target));

  const key = new THREE.DirectionalLight(0xffffff, 2.8);
  key.position.set(...keyLight);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.radius = 8;
  key.shadow.blurSamples = 16;
  const s = shadowSize;
  Object.assign(key.shadow.camera, { left: -s, right: s, top: s, bottom: -s, near: 0.5, far: 60 });
  key.shadow.bias = -0.0004;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xdfe6f0, 0.7);
  rim.position.set(-6, 4, -6);
  scene.add(rim);
  scene.add(new THREE.AmbientLight(0xffffff, 0.15));

  // Transparent floor that only receives the soft contact shadow.
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.ShadowMaterial({ opacity: 0.38 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  return { scene, camera };
}

const shadowed = (mesh) => {
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
};

/**
 * Lofts a smooth body through superellipse cross-sections placed along x.
 * Each section: { x, hw (half width), yb (bottom), yt (top), z (centre), n (squareness) }.
 */
function loft(sections, segments = 28) {
  const positions = [];
  const indices = [];
  const ring = (s) => {
    const pts = [];
    const cy = (s.yt + s.yb) / 2;
    const ry = (s.yt - s.yb) / 2;
    const n = s.n ?? 2.6;
    for (let i = 0; i < segments; i++) {
      const t = (i / segments) * Math.PI * 2;
      const c = Math.cos(t);
      const si = Math.sin(t);
      const z = (s.z ?? 0) + s.hw * Math.sign(c) * Math.abs(c) ** (2 / n);
      const y = cy + ry * Math.sign(si) * Math.abs(si) ** (2 / n);
      pts.push([s.x, y, z]);
    }
    return pts;
  };
  sections.forEach((s) => ring(s).forEach((p) => positions.push(...p)));
  for (let k = 0; k < sections.length - 1; k++) {
    for (let i = 0; i < segments; i++) {
      const a = k * segments + i;
      const b = k * segments + ((i + 1) % segments);
      const c = (k + 1) * segments + i;
      const d = (k + 1) * segments + ((i + 1) % segments);
      indices.push(a, c, b, b, c, d);
    }
  }
  // Caps at both ends.
  for (const k of [0, sections.length - 1]) {
    const centre = positions.length / 3;
    const s = sections[k];
    positions.push(s.x, (s.yt + s.yb) / 2, s.z ?? 0);
    for (let i = 0; i < segments; i++) {
      const a = k * segments + i;
      const b = k * segments + ((i + 1) % segments);
      if (k === 0) indices.push(centre, a, b);
      else indices.push(centre, b, a);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/** Airfoil section extruded across the car's width (z). */
function wing({ chord, thickness, span, camber = 0.25 }) {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.bezierCurveTo(chord * 0.25, thickness * (1 + camber * 3), chord * 0.7, thickness * (1 + camber * 2), chord, thickness * camber);
  shape.bezierCurveTo(chord * 0.7, -thickness * 0.2, chord * 0.3, -thickness * 0.4, 0, 0);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: span, bevelEnabled: false, curveSegments: 16 });
  geo.translate(-chord / 2, 0, -span / 2);
  return geo;
}

function box(w, h, d, material) {
  const geo = new THREE.BoxGeometry(w, h, d, 1, 1, 1);
  return shadowed(new THREE.Mesh(geo, material));
}

function tube(points, radius, material, closed = false) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)), closed, "catmullrom", 0.5);
  return shadowed(new THREE.Mesh(new THREE.TubeGeometry(curve, 64, radius, 12, closed), material));
}

/** Rounded tyre from a lathed cross-section, with rim and a coloured sidewall band. */
function wheel(radius, width, band) {
  const group = new THREE.Group();
  const r0 = radius * 0.62;
  const profile = [];
  const steps = 14;
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI;
    const bulge = Math.sin(t);
    profile.push(new THREE.Vector2(r0 + (radius - r0) * (0.55 + 0.45 * bulge), (i / steps - 0.5) * width * (0.92 + 0.08 * bulge)));
  }
  const tyre = shadowed(new THREE.Mesh(new THREE.LatheGeometry(profile, 64), rubber()));
  tyre.rotation.x = Math.PI / 2;
  group.add(tyre);
  for (const side of [-1, 1]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.82, radius * 0.025, 8, 64), new THREE.MeshStandardMaterial({ color: band, roughness: 0.5 }));
    ring.position.z = side * width * 0.47;
    group.add(ring);
    const rim = new THREE.Mesh(
      new THREE.CylinderGeometry(r0 * 0.98, r0 * 0.98, 0.02, 40),
      new THREE.MeshPhysicalMaterial({ color: 0x2a2a2e, metalness: 0.9, roughness: 0.3 }),
    );
    rim.rotation.x = Math.PI / 2;
    rim.position.z = side * width * 0.42;
    group.add(rim);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(r0 * 0.25, r0 * 0.25, 0.04, 24), new THREE.MeshStandardMaterial({ color: 0x999999, metalness: 1, roughness: 0.25 }));
    hub.rotation.x = Math.PI / 2;
    hub.position.z = side * width * 0.45;
    group.add(hub);
  }
  return group;
}

/* ---------- car ---------- */

function buildCar({ primary, secondary, accent }) {
  const car = new THREE.Group();
  const body = paint(primary);
  const second = paint(secondary);
  const cf = carbon();

  // Monocoque, nose and engine cover as one sculpted loft.
  car.add(
    shadowed(
      new THREE.Mesh(
        loft([
          { x: 2.82, hw: 0.05, yb: 0.2, yt: 0.25 },
          { x: 2.45, hw: 0.1, yb: 0.18, yt: 0.34 },
          { x: 1.75, hw: 0.17, yb: 0.17, yt: 0.48 },
          { x: 1.05, hw: 0.27, yb: 0.15, yt: 0.62 },
          { x: 0.5, hw: 0.31, yb: 0.14, yt: 0.62 },
          { x: 0.05, hw: 0.32, yb: 0.14, yt: 0.8 },
          { x: -0.3, hw: 0.29, yb: 0.14, yt: 0.96 },
          { x: -0.75, hw: 0.24, yb: 0.14, yt: 0.84 },
          { x: -1.5, hw: 0.18, yb: 0.14, yt: 0.6 },
          { x: -2.1, hw: 0.1, yb: 0.17, yt: 0.44 },
          { x: -2.45, hw: 0.06, yb: 0.21, yt: 0.34 },
        ]),
        body,
      ),
    ),
  );

  // Sidepods with undercut, one each side.
  for (const side of [-1, 1]) {
    car.add(
      shadowed(
        new THREE.Mesh(
          loft([
            { x: 0.95, hw: 0.2, yb: 0.24, yt: 0.46, z: side * 0.52, n: 3 },
            { x: 0.55, hw: 0.28, yb: 0.15, yt: 0.5, z: side * 0.56, n: 3 },
            { x: -0.3, hw: 0.27, yb: 0.12, yt: 0.44, z: side * 0.55, n: 3 },
            { x: -1.1, hw: 0.2, yb: 0.12, yt: 0.32, z: side * 0.46, n: 3 },
            { x: -1.75, hw: 0.08, yb: 0.14, yt: 0.22, z: side * 0.32, n: 3 },
          ]),
          body,
        ),
      ),
    );
    // Livery flash along the sidepod.
    const flash = box(1.6, 0.05, 0.02, second);
    flash.position.set(-0.25, 0.36, side * 0.835);
    flash.rotation.z = -0.06;
    car.add(flash);
    // Inlet mouth.
    const inlet = box(0.04, 0.18, 0.32, cf);
    inlet.position.set(0.96, 0.36, side * 0.52);
    car.add(inlet);
  }

  // Engine-cover fin in the secondary colour.
  const finShape = new THREE.Shape();
  finShape.moveTo(-0.25, 0.9);
  finShape.lineTo(-2.2, 0.62);
  finShape.lineTo(-2.2, 0.4);
  finShape.lineTo(-0.6, 0.78);
  finShape.closePath();
  const fin = shadowed(new THREE.Mesh(new THREE.ExtrudeGeometry(finShape, { depth: 0.025, bevelEnabled: false }), second));
  fin.position.z = -0.0125;
  car.add(fin);

  // Floor and plank.
  const floorShape = new THREE.Shape();
  floorShape.moveTo(1.45, -0.32);
  floorShape.lineTo(0.9, -0.8);
  floorShape.lineTo(-1.4, -0.82);
  floorShape.lineTo(-2.3, -0.5);
  floorShape.lineTo(-2.3, 0.5);
  floorShape.lineTo(-1.4, 0.82);
  floorShape.lineTo(0.9, 0.8);
  floorShape.lineTo(1.45, 0.32);
  floorShape.closePath();
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.9, metalness: 0, envMapIntensity: 0.1 });
  const floor = shadowed(new THREE.Mesh(new THREE.ExtrudeGeometry(floorShape, { depth: 0.03, bevelEnabled: false }), floorMat));
  floor.rotation.x = Math.PI / 2;
  floor.position.y = 0.12;
  car.add(floor);

  // Cockpit opening, driver helmet and halo.
  const cockpit = shadowed(new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.6 })));
  cockpit.scale.set(0.42, 0.05, 0.2);
  cockpit.position.set(0.62, 0.63, 0);
  car.add(cockpit);
  const helmet = shadowed(new THREE.Mesh(new THREE.SphereGeometry(0.13, 32, 24), paint(accent)));
  helmet.position.set(0.42, 0.72, 0);
  car.add(helmet);
  const visor = new THREE.Mesh(new THREE.SphereGeometry(0.132, 32, 12, -0.9, 1.8, 1.25, 0.45), new THREE.MeshPhysicalMaterial({ color: 0x111111, metalness: 0.9, roughness: 0.05 }));
  visor.position.copy(helmet.position);
  car.add(visor);
  const haloMat = paint(secondary === "#FFFFFF" ? primary : 0x111111);
  car.add(tube([[0.25, 0.86, -0.27], [0.62, 0.9, -0.26], [0.86, 0.86, -0.12], [0.9, 0.85, 0], [0.86, 0.86, 0.12], [0.62, 0.9, 0.26], [0.25, 0.86, 0.27]], 0.025, haloMat));
  car.add(tube([[0.9, 0.85, 0], [1.02, 0.72, 0], [1.08, 0.62, 0]], 0.03, haloMat));

  // Front wing: mainplane, two flaps, endplates.
  const fwMain = shadowed(new THREE.Mesh(wing({ chord: 0.42, thickness: 0.03, span: 1.9 }), cf));
  fwMain.position.set(2.75, 0.08, 0);
  car.add(fwMain);
  for (const [i, mat] of [[0, body], [1, second]]) {
    const flap = shadowed(new THREE.Mesh(wing({ chord: 0.22, thickness: 0.025, span: 1.75 - i * 0.2 }), mat));
    flap.position.set(2.62 - i * 0.12, 0.14 + i * 0.06, 0);
    flap.rotation.z = 0.32 + i * 0.18;
    car.add(flap);
  }
  for (const side of [-1, 1]) {
    const ep = box(0.5, 0.2, 0.02, cf);
    ep.position.set(2.72, 0.15, side * 0.95);
    car.add(ep);
    const tip = box(0.5, 0.05, 0.024, second);
    tip.position.set(2.72, 0.26, side * 0.95);
    car.add(tip);
  }

  // Rear wing: endplates, mainplane, flap, beam wing and pylon.
  for (const side of [-1, 1]) {
    const ep = box(0.55, 0.66, 0.025, cf);
    ep.position.set(-2.38, 0.72, side * 0.56);
    car.add(ep);
    const tip = box(0.55, 0.12, 0.03, second);
    tip.position.set(-2.38, 1.0, side * 0.56);
    car.add(tip);
  }
  const rwMain = shadowed(new THREE.Mesh(wing({ chord: 0.42, thickness: 0.05, span: 1.1 }), body));
  rwMain.position.set(-2.35, 0.86, 0);
  rwMain.rotation.z = 0.1;
  car.add(rwMain);
  const rwFlap = shadowed(new THREE.Mesh(wing({ chord: 0.24, thickness: 0.035, span: 1.1 }), second));
  rwFlap.position.set(-2.5, 1.0, 0);
  rwFlap.rotation.z = 0.45;
  car.add(rwFlap);
  const beam = shadowed(new THREE.Mesh(wing({ chord: 0.28, thickness: 0.03, span: 0.9 }), cf));
  beam.position.set(-2.3, 0.42, 0);
  car.add(beam);
  const pylon = box(0.18, 0.5, 0.03, cf);
  pylon.position.set(-2.28, 0.62, 0);
  car.add(pylon);
  const diffuser = box(0.5, 0.12, 1.0, cf);
  diffuser.position.set(-2.3, 0.18, 0);
  car.add(diffuser);

  // Wheels and suspension.
  const wheels = [
    { x: 1.78, z: 0.86, r: 0.36, w: 0.34 },
    { x: -1.8, z: 0.84, r: 0.37, w: 0.42 },
  ];
  for (const { x, z, r, w } of wheels) {
    for (const side of [-1, 1]) {
      const wh = wheel(r, w, 0xf2c200);
      wh.position.set(x, r, side * z);
      car.add(wh);
      for (const [y0, y1] of [[0.4, 0.42], [0.22, 0.3]]) {
        car.add(tube([[x + (x > 0 ? -0.25 : 0.25), y0, side * 0.2], [x, y1, side * (z - w / 2)]], 0.014, cf));
      }
    }
  }
  return car;
}

/* ---------- helmet ---------- */

function liveryTexture({ primary, secondary, accent, number }) {
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 512;
  const g = c.getContext("2d");
  g.fillStyle = primary;
  g.fillRect(0, 0, 1024, 512);
  // Diagonal livery sweeps and a crown ring.
  g.fillStyle = secondary;
  for (const offset of [0, 512]) {
    g.beginPath();
    g.moveTo(offset + 60, 512);
    g.lineTo(offset + 260, 150);
    g.lineTo(offset + 330, 150);
    g.lineTo(offset + 150, 512);
    g.fill();
  }
  g.fillRect(0, 300, 1024, 46);
  g.fillStyle = accent;
  g.fillRect(0, 346, 1024, 10);
  g.fillRect(0, 70, 1024, 18);
  if (number) {
    g.font = "bold 150px 'Helvetica Neue', Arial, sans-serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.lineWidth = 10;
    g.strokeStyle = secondary;
    g.fillStyle = accent;
    // Number on both sides of the shell.
    for (const x of [256 + 128, 768 + 128]) {
      g.strokeText(number, x, 230);
      g.fillText(number, x, 230);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function buildHelmet(livery) {
  const helmet = new THREE.Group();
  const shellMat = new THREE.MeshPhysicalMaterial({ map: liveryTexture(livery), metalness: 0.1, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.04, envMapIntensity: 0.6 });
  // Shell: an elongated dome that wraps low at the back and sides.
  const shell = shadowed(new THREE.Mesh(new THREE.SphereGeometry(1, 96, 64, 0, Math.PI * 2, 0, Math.PI * 0.72), shellMat));
  shell.scale.set(1.12, 0.98, 0.95);
  helmet.add(shell);
  // Chin bar wrapping the front, below the visor.
  const chin = shadowed(new THREE.Mesh(new THREE.SphereGeometry(1, 64, 32, -1.1, 2.2, Math.PI * 0.6, Math.PI * 0.28), shellMat));
  chin.scale.set(1.14, 1.0, 0.97);
  helmet.add(chin);
  // Visor across the front: dark, mirrored, faintly iridescent.
  const visor = new THREE.Mesh(
    new THREE.SphereGeometry(1.015, 64, 24, -0.95, 1.9, Math.PI * 0.4, Math.PI * 0.19),
    new THREE.MeshPhysicalMaterial({ color: 0x08080c, metalness: 0.95, roughness: 0.03, iridescence: 1, iridescenceIOR: 1.7, clearcoat: 1, envMapIntensity: 1.2 }),
  );
  visor.scale.copy(shell.scale);
  helmet.add(visor);
  // Visor seal trim.
  const seal = new THREE.Mesh(
    new THREE.SphereGeometry(1.018, 64, 4, -0.97, 1.94, Math.PI * 0.59, Math.PI * 0.015),
    new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.5 }),
  );
  seal.scale.copy(shell.scale);
  helmet.add(seal);
  // Neck opening rim.
  const rim = shadowed(new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.08, 16, 64), new THREE.MeshStandardMaterial({ color: 0x0e0e0e, roughness: 0.7 })));
  rim.rotation.x = Math.PI / 2;
  rim.scale.set(1.2, 1.0, 1);
  rim.position.y = -0.66;
  helmet.add(rim);
  // Rear spoiler on top of the shell.
  const sp = new THREE.Shape();
  sp.moveTo(0, 0);
  sp.lineTo(0.42, 0.06);
  sp.lineTo(0.46, 0.18);
  sp.lineTo(0.04, 0.1);
  sp.closePath();
  const spoiler = shadowed(new THREE.Mesh(new THREE.ExtrudeGeometry(sp, { depth: 0.8, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02 }), paint(livery.secondary)));
  spoiler.position.set(0.72, 0.62, -0.4);
  spoiler.rotation.z = Math.PI - 0.55;
  helmet.add(spoiler);
  // Sphere seam (phi = 0) points at -x; turn so the visor faces three-quarters to camera.
  helmet.rotation.y = Math.PI / 2 + 0.75;
  helmet.position.y = 0.8;
  return helmet;
}

/* ---------- circuit ---------- */

function parsePath(d) {
  return d
    .replace(/[MZ]/g, "")
    .split("L")
    .map((p) => p.trim().split(/\s+/).map(Number));
}

function buildTrack(shape) {
  const pts = parsePath(shape.d);
  const scale = 10 / 1000;
  const cx = shape.w / 2;
  const cy = shape.h / 2;
  const path = pts.map(([x, y]) => new THREE.Vector3((x - cx) * scale, 0, (y - cy) * scale));
  const curve = new THREE.CatmullRomCurve3(path, true, "centripetal");
  const N = 900;
  const samples = curve.getSpacedPoints(N);
  const group = new THREE.Group();

  const ribbon = (halfWidth, y, height) => {
    const positions = [];
    const indices = [];
    for (let i = 0; i <= N; i++) {
      const p = samples[i % N];
      const t = curve.getTangentAt((i % N) / N);
      const n = new THREE.Vector3(-t.z, 0, t.x).normalize();
      const l = p.clone().addScaledVector(n, halfWidth);
      const r = p.clone().addScaledVector(n, -halfWidth);
      positions.push(l.x, y + height, l.z, r.x, y + height, r.z, l.x, y, l.z, r.x, y, r.z);
    }
    for (let i = 0; i < N; i++) {
      const a = i * 4;
      const b = (i + 1) * 4;
      indices.push(a, b, a + 1, a + 1, b, b + 1); // top
      indices.push(a + 2, a, b + 2, a, b, b + 2); // outer wall
      indices.push(a + 1, b + 1, a + 3, a + 3, b + 1, b + 3); // inner wall
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  };

  group.add(shadowed(new THREE.Mesh(ribbon(0.3, 0, 0.2), new THREE.MeshPhysicalMaterial({ color: 0x2b2b2e, roughness: 0.75, metalness: 0.1, clearcoat: 0.3 }))));
  for (const off of [0.26, -0.26]) {
    const line = [];
    for (let i = 0; i <= N; i++) {
      const p = samples[i % N];
      const t = curve.getTangentAt((i % N) / N);
      const n = new THREE.Vector3(-t.z, 0, t.x).normalize();
      line.push(p.clone().addScaledVector(n, off).setY(0.205));
    }
    const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(line, true), N, 0.022, 6, true);
    group.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.5 })));
  }
  // Chequered start/finish strip.
  const start = samples[0];
  const t0 = curve.getTangentAt(0);
  const cells = 6;
  for (let i = 0; i < cells; i++) {
    for (let j = 0; j < 2; j++) {
      const cell = new THREE.Mesh(
        new THREE.BoxGeometry(0.07, 0.014, 0.6 / cells),
        new THREE.MeshStandardMaterial({ color: (i + j) % 2 ? 0x111111 : 0xffffff, roughness: 0.4 }),
      );
      cell.position.copy(start).setY(0.208);
      cell.rotation.y = -Math.atan2(t0.z, t0.x);
      cell.translateX((j - 0.5) * 0.07);
      cell.translateZ(-0.3 + (i + 0.5) * (0.6 / cells));
      group.add(cell);
    }
  }
  // Red start beacon so the line reads at small sizes.
  const beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.04, 32), new THREE.MeshStandardMaterial({ color: 0xec1c0e, emissive: 0xec1c0e, emissiveIntensity: 0.6 }));
  beacon.position.copy(start).setY(0.24);
  group.add(beacon);
  return group;
}

/* ---------- chequered flag ---------- */

function buildFlag() {
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 640;
  const g = c.getContext("2d");
  const cell = 128;
  for (let x = 0; x < 8; x++) for (let y = 0; y < 5; y++) {
    g.fillStyle = (x + y) % 2 ? "#141414" : "#F4F4F4";
    g.fillRect(x * cell, y * cell, cell, cell);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const geo = new THREE.PlaneGeometry(6.4, 4, 120, 75);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const k = (x + 3.2) / 6.4;
    pos.setZ(i, Math.sin(x * 1.6 + y * 0.4) * 0.35 * k + Math.sin(x * 3.1 - y * 0.8) * 0.12 * k);
  }
  geo.computeVertexNormals();
  const flag = shadowed(new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.55, sheen: 1, sheenRoughness: 0.5, side: THREE.DoubleSide })));
  return flag;
}

/* ---------- public API used by render.mjs ---------- */

/** Renders, then trims transparent margins so every asset is framed tightly. */
function snapshot(scene, camera, pad = 0.03) {
  renderer.render(scene, camera);
  const w = canvas.width;
  const h = canvas.height;
  const tmp = document.createElement("canvas");
  tmp.width = w;
  tmp.height = h;
  const g = tmp.getContext("2d");
  g.drawImage(canvas, 0, 0);
  const { data } = g.getImageData(0, 0, w, h);
  let x0 = w, y0 = h, x1 = 0, y1 = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > 10) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  const p = Math.round(Math.max(x1 - x0, y1 - y0) * pad);
  x0 = Math.max(0, x0 - p);
  y0 = Math.max(0, y0 - p);
  x1 = Math.min(w - 1, x1 + p);
  y1 = Math.min(h - 1, y1 + p);
  const out = document.createElement("canvas");
  out.width = x1 - x0 + 1;
  out.height = y1 - y0 + 1;
  out.getContext("2d").drawImage(tmp, x0, y0, out.width, out.height, 0, 0, out.width, out.height);
  return out.toDataURL("image/png");
}

window.renderCar = (livery, view = "hero") => {
  const views = {
    hero: { camera: [5.4, 1.55, 6.2], target: [0.1, 0.4, 0] },
    side: { camera: [0.2, 1.2, 11], target: [0, 0.45, 0] },
  };
  const { scene, camera } = stage({ width: 1800, height: 1000, fov: 30, ...views[view], shadowSize: 5 });
  scene.add(buildCar(livery));
  return snapshot(scene, camera);
};

window.renderHelmet = (livery) => {
  const { scene, camera } = stage({ width: 900, height: 900, fov: 30, camera: [3.2, 1.8, 4.4], target: [0, 0.8, 0], shadowSize: 3 });
  scene.add(buildHelmet(livery));
  return snapshot(scene, camera);
};

window.renderTrack = (shape) => {
  const aspect = shape.w / shape.h;
  const width = 1200;
  const height = Math.round(Math.min(1000, Math.max(560, width / aspect)));
  const { scene, camera } = stage({ width, height, fov: 30, camera: [0, 15, 9.5], target: [0, 0, 0.3], keyLight: [4, 12, 6], shadowSize: 8 });
  scene.add(buildTrack(shape));
  // Fit the camera distance to the circuit's footprint.
  const box3 = new THREE.Box3().setFromObject(scene.children.at(-1));
  const size = box3.getSize(new THREE.Vector3());
  const fit = Math.max(size.x / camera.aspect, size.z * 1.25) * 1.35;
  camera.position.set(0, fit * 1.35, fit * 0.85);
  camera.lookAt(0, 0, 0);
  return snapshot(scene, camera);
};

window.renderFlag = () => {
  const { scene, camera } = stage({ width: 1400, height: 700, fov: 30, camera: [1.5, 1.0, 8.5], target: [0.2, 0, 0], keyLight: [3, 6, 8] });
  const flag = buildFlag();
  flag.position.set(0, 2.2, 0);
  flag.rotation.set(-0.1, -0.35, 0.05);
  scene.add(flag);
  scene.children.find((o) => o.material?.isShadowMaterial).visible = false;
  return snapshot(scene, camera);
};

window.ready = true;
