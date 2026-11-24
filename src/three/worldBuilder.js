import * as THREE from 'three';

export const CANAL_Z = -90;
export const CANAL_HALF_W = 24;
export const HARBOR_X = 270;

export const ROAD_X_COORDS = [-160, 0, 160];
export const ROAD_Z_COORDS = [-200, 40, 180];
const ROAD_WIDTH = 22;

const BUILDING_PALETTE = [
  { wall: '#FFF7ED', trim: '#FB923C', roof: '#EA580C' },
  { wall: '#EFF6FF', trim: '#38BDF8', roof: '#0284C7' },
  { wall: '#F0FDF4', trim: '#4ADE80', roof: '#16A34A' },
  { wall: '#FEFCE8', trim: '#FACC15', roof: '#CA8A04' },
  { wall: '#FDF2F8', trim: '#F472B6', roof: '#DB2777' },
  { wall: '#F5F3FF', trim: '#A78BFA', roof: '#7C3AED' }
];

const PED_SHIRTS = ['#38BDF8', '#F43F5E', '#A855F7', '#F59E0B', '#10B981', '#EC4899', '#6366F1'];
const PED_PANTS = ['#1E293B', '#334155', '#1D4ED8', '#78350F', '#475569'];
const SKIN_TONES = ['#FDE68A', '#FDBA74', '#D97706', '#92400E', '#FED7AA'];

function createWindowTexture(wallHex, trimHex) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d');
  ctx.fillStyle = wallHex;
  ctx.fillRect(0, 0, 256, 256);

  ctx.fillStyle = trimHex;
  ctx.fillRect(0, 0, 256, 16);
  ctx.fillRect(0, 120, 256, 12);
  ctx.fillRect(0, 240, 256, 16);

  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 3; col++) {
      const wx = 24 + col * 78;
      const wy = 28 + row * 124;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(wx - 3, wy - 3, 56, 74);
      const grad = ctx.createLinearGradient(wx, wy, wx + 50, wy + 68);
      grad.addColorStop(0, '#BAE6FD');
      grad.addColorStop(1, '#38BDF8');
      ctx.fillStyle = grad;
      ctx.fillRect(wx, wy, 50, 68);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function createPedestrianMesh(seed) {
  const ped = new THREE.Group();
  const shirtMat = new THREE.MeshStandardMaterial({ color: PED_SHIRTS[seed % PED_SHIRTS.length], roughness: 0.7 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: PED_PANTS[seed % PED_PANTS.length], roughness: 0.8 });
  const skinMat = new THREE.MeshStandardMaterial({ color: SKIN_TONES[seed % SKIN_TONES.length], roughness: 0.6 });

  const legGeo = new THREE.BoxGeometry(0.22, 0.75, 0.24);
  const leftLeg = new THREE.Mesh(legGeo, pantsMat);
  leftLeg.position.set(-0.15, 0.38, 0);
  leftLeg.castShadow = true;
  const rightLeg = new THREE.Mesh(legGeo, pantsMat);
  rightLeg.position.set(0.15, 0.38, 0);
  rightLeg.castShadow = true;

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.72, 0.3), shirtMat);
  torso.position.y = 1.1;
  torso.castShadow = true;

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.23, 12, 12), skinMat);
  head.position.y = 1.68;
  head.castShadow = true;

  const armGeo = new THREE.BoxGeometry(0.16, 0.62, 0.18);
  const leftArm = new THREE.Mesh(armGeo, skinMat);
  leftArm.position.set(-0.38, 1.1, 0);
  const rightArm = new THREE.Mesh(armGeo, skinMat);
  rightArm.position.set(0.38, 1.1, 0);

  ped.add(leftLeg, rightLeg, torso, head, leftArm, rightArm);
  ped.userData = { leftLeg, rightLeg, leftArm, rightArm };
  return ped;
}

export function buildCityWorld(scene) {
  const colliders = [];
  const bridges = [];
  const pedestrians = [];
  const repairPads = [];

  // Water System (Canal + Waterfront Harbor)
  const waterGroup = new THREE.Group();
  scene.add(waterGroup);

  const waterMat = new THREE.MeshStandardMaterial({
    color: '#0EA5E9',
    emissive: '#0284C7',
    emissiveIntensity: 0.22,
    roughness: 0.18,
    metalness: 0.55,
    transparent: true,
    opacity: 0.92
  });

  const canalWaterGeo = new THREE.PlaneGeometry(760, CANAL_HALF_W * 2, 48, 12);
  canalWaterGeo.rotateX(-Math.PI / 2);
  const canalWaterMesh = new THREE.Mesh(canalWaterGeo, waterMat);
  canalWaterMesh.position.set(-40, -1.65, CANAL_Z);
  waterGroup.add(canalWaterMesh);

  const basinMat = new THREE.MeshStandardMaterial({ color: '#0369A1', roughness: 0.9 });
  const canalFloor = new THREE.Mesh(new THREE.PlaneGeometry(760, CANAL_HALF_W * 2 + 8), basinMat);
  canalFloor.rotation.x = -Math.PI / 2;
  canalFloor.position.set(-40, -3.4, CANAL_Z);
  waterGroup.add(canalFloor);

  const wallMat = new THREE.MeshStandardMaterial({ color: '#CBD5E1', roughness: 0.7 });
  [-1, 1].forEach((side) => {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(760, 3.6, 2.2), wallMat);
    wall.position.set(-40, -1.6, CANAL_Z + side * (CANAL_HALF_W + 1));
    wall.receiveShadow = true;
    waterGroup.add(wall);
  });

  const harborGeo = new THREE.PlaneGeometry(340, 820, 24, 48);
  harborGeo.rotateX(-Math.PI / 2);
  const harborMesh = new THREE.Mesh(harborGeo, waterMat);
  harborMesh.position.set(HARBOR_X + 170, -1.65, 0);
  waterGroup.add(harborMesh);

  const seawall = new THREE.Mesh(new THREE.BoxGeometry(3, 3.8, 820), wallMat);
  seawall.position.set(HARBOR_X, -1.6, 0);
  waterGroup.add(seawall);

  // Bright Green Land Plates
  const grassMat = new THREE.MeshStandardMaterial({ color: '#65D143', roughness: 0.85 });
  const southLand = new THREE.Mesh(new THREE.BoxGeometry(660, 3.4, 340), grassMat);
  southLand.position.set(-60, -1.7, 104);
  southLand.receiveShadow = true;
  scene.add(southLand);

  const northLand = new THREE.Mesh(new THREE.BoxGeometry(660, 3.4, 240), grassMat);
  northLand.position.set(-60, -1.7, -234);
  northLand.receiveShadow = true;
  scene.add(northLand);

  // Roads, Wide White Strips, Zebra Crossings & Bridges
  const roadGroup = new THREE.Group();
  scene.add(roadGroup);

  const asphaltMat = new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.82 });
  const sidewalkMat = new THREE.MeshStandardMaterial({ color: '#E2E8F0', roughness: 0.75 });
  const whiteLineMat = new THREE.MeshBasicMaterial({ color: '#FFFFFF' });
  const yellowLineMat = new THREE.MeshBasicMaterial({ color: '#FACC15' });

  function createZebraCrossing(x, z, horizontal) {
    const group = new THREE.Group();
    const stripes = 6;
    for (let i = 0; i < stripes; i++) {
      const offset = (i - (stripes - 1) / 2) * 3.1;
      const w = horizontal ? 4.4 : 1.7;
      const d = horizontal ? 1.7 : 4.4;
      const stripe = new THREE.Mesh(new THREE.PlaneGeometry(w, d), whiteLineMat);
      stripe.rotation.x = -Math.PI / 2;
      stripe.position.set(horizontal ? 0 : offset, 0.04, horizontal ? offset : 0);
      group.add(stripe);
    }
    group.position.set(x, 0.02, z);
    roadGroup.add(group);
  }

  function buildElevatedBridge(centerX, zStart, zEnd, halfWidth, peakY) {
    bridges.push({ x: centerX, zStart, zEnd, halfWidth, peakY });

    const segments = 24;
    const totalLen = zEnd - zStart;
    const stepZ = totalLen / segments;
    const deckMat = new THREE.MeshStandardMaterial({ color: '#475569', roughness: 0.75 });
    const railMat = new THREE.MeshStandardMaterial({ color: '#F59E0B', roughness: 0.4, metalness: 0.3 });
    const archMat = new THREE.MeshStandardMaterial({ color: '#38BDF8', roughness: 0.35, metalness: 0.4 });

    for (let i = 0; i < segments; i++) {
      const t0 = i / segments;
      const t1 = (i + 1) / segments;
      const tMid = (t0 + t1) * 0.5;
      const y0 = Math.sin(t0 * Math.PI) * peakY;
      const y1 = Math.sin(t1 * Math.PI) * peakY;
      const yMid = (y0 + y1) * 0.5;
      const slopeAngle = Math.atan2(y1 - y0, stepZ);
      const segHyp = Math.hypot(stepZ, y1 - y0) + 0.15;

      const deck = new THREE.Mesh(new THREE.BoxGeometry(halfWidth * 2 + 2, 0.7, segHyp), deckMat);
      deck.position.set(centerX, yMid - 0.3, zStart + tMid * totalLen);
      deck.rotation.x = -slopeAngle;
      deck.castShadow = true;
      deck.receiveShadow = true;
      roadGroup.add(deck);

      [-halfWidth + 0.9, halfWidth - 0.9].forEach((ex) => {
        const strip = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.08, segHyp), whiteLineMat);
        strip.position.set(centerX + ex, yMid + 0.07, zStart + tMid * totalLen);
        strip.rotation.x = -slopeAngle;
        roadGroup.add(strip);
      });

      [-halfWidth - 0.6, halfWidth + 0.6].forEach((rx) => {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.05, segHyp), railMat);
        rail.position.set(centerX + rx, yMid + 0.5, zStart + tMid * totalLen);
        rail.rotation.x = -slopeAngle;
        rail.castShadow = true;
        roadGroup.add(rail);
      });
    }

    [-halfWidth - 0.6, halfWidth + 0.6].forEach((rx) => {
      const archCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(centerX + rx, 0.4, zStart + 4),
        new THREE.Vector3(centerX + rx, peakY + 7.5, (zStart + zEnd) * 0.5),
        new THREE.Vector3(centerX + rx, 0.4, zEnd - 4)
      ]);
      const archGeo = new THREE.TubeGeometry(archCurve, 24, 0.45, 8, false);
      const archMesh = new THREE.Mesh(archGeo, archMat);
      archMesh.castShadow = true;
      roadGroup.add(archMesh);
    });
  }

  ROAD_X_COORDS.forEach((rx) => {
    const sLen = 296;
    const sRoad = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_WIDTH, sLen), asphaltMat);
    sRoad.rotation.x = -Math.PI / 2;
    sRoad.position.set(rx, 0.02, 92);
    sRoad.receiveShadow = true;
    roadGroup.add(sRoad);

    const nLen = 186;
    const nRoad = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_WIDTH, nLen), asphaltMat);
    nRoad.rotation.x = -Math.PI / 2;
    nRoad.position.set(rx, 0.02, -217);
    nRoad.receiveShadow = true;
    roadGroup.add(nRoad);

    [92, -217].forEach((segZ, idx) => {
      const len = idx === 0 ? sLen : nLen;
      [-ROAD_WIDTH / 2 + 0.85, ROAD_WIDTH / 2 - 0.85].forEach((edgeOffset) => {
        const edgeStrip = new THREE.Mesh(new THREE.PlaneGeometry(0.65, len), whiteLineMat);
        edgeStrip.rotation.x = -Math.PI / 2;
        edgeStrip.position.set(rx + edgeOffset, 0.035, segZ);
        roadGroup.add(edgeStrip);
      });

      [-ROAD_WIDTH / 2 - 2.4, ROAD_WIDTH / 2 + 2.4].forEach((swOffset) => {
        const sw = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.24, len), sidewalkMat);
        sw.position.set(rx + swOffset, 0.12, segZ);
        sw.receiveShadow = true;
        roadGroup.add(sw);
      });

      const startZ = segZ - len / 2 + 4;
      const endZ = segZ + len / 2 - 4;
      for (let dz = startZ; dz < endZ; dz += 10) {
        const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.45, 4.5), yellowLineMat);
        dash.rotation.x = -Math.PI / 2;
        dash.position.set(rx, 0.035, dz);
        roadGroup.add(dash);
      }
    });

    buildElevatedBridge(rx, -124, -56, ROAD_WIDTH / 2, 5.2);
  });

  ROAD_Z_COORDS.forEach((rz) => {
    const ewLen = 470;
    const ewRoad = new THREE.Mesh(new THREE.PlaneGeometry(ewLen, ROAD_WIDTH), asphaltMat);
    ewRoad.rotation.x = -Math.PI / 2;
    ewRoad.position.set(-15, 0.025, rz);
    ewRoad.receiveShadow = true;
    roadGroup.add(ewRoad);

    [-ROAD_WIDTH / 2 + 0.85, ROAD_WIDTH / 2 - 0.85].forEach((edgeOffset) => {
      const edgeStrip = new THREE.Mesh(new THREE.PlaneGeometry(ewLen, 0.65), whiteLineMat);
      edgeStrip.rotation.x = -Math.PI / 2;
      edgeStrip.position.set(-15, 0.04, rz + edgeOffset);
      roadGroup.add(edgeStrip);
    });

    [-0.35, 0.35].forEach((cOffset) => {
      const centerLine = new THREE.Mesh(new THREE.PlaneGeometry(ewLen, 0.35), yellowLineMat);
      centerLine.rotation.x = -Math.PI / 2;
      centerLine.position.set(-15, 0.04, rz + cOffset);
      roadGroup.add(centerLine);
    });

    ROAD_X_COORDS.forEach((rx) => {
      createZebraCrossing(rx, rz - ROAD_WIDTH / 2 - 3.2, false);
      createZebraCrossing(rx, rz + ROAD_WIDTH / 2 + 3.2, false);
      createZebraCrossing(rx - ROAD_WIDTH / 2 - 3.2, rz, true);
      createZebraCrossing(rx + ROAD_WIDTH / 2 + 3.2, rz, true);
    });
  });

  // Glowing Green Pit-Stop Repair Pads
  const padLocations = [
    [-160, 110],
    [160, 110],
    [0, -200]
  ];
  padLocations.forEach(([px, pz]) => {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(2.6, 3.6, 28),
      new THREE.MeshBasicMaterial({ color: '#22C55E', side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(px, 0.06, pz);
    roadGroup.add(ring);
    repairPads.push({ x: px, z: pz, mesh: ring });
  });

  // Bright, Proportionate Buildings & Trees
  const cityGroup = new THREE.Group();
  scene.add(cityGroup);

  const buildingTextures = BUILDING_PALETTE.map((p) => createWindowTexture(p.wall, p.trim));
  const blocks = [
    { x: -215, z: -15, w: 28, d: 24, h: 12, p: 0 },
    { x: -215, z: 95, w: 30, d: 26, h: 15, p: 1 },
    { x: -215, z: 135, w: 26, d: 22, h: 10, p: 2 },
    { x: -105, z: -15, w: 32, d: 24, h: 14, p: 3 },
    { x: -55, z: -15, w: 28, d: 24, h: 11, p: 4 },
    { x: -105, z: 95, w: 30, d: 28, h: 18, p: 5 },
    { x: -55, z: 95, w: 28, d: 26, h: 13, p: 0 },
    { x: -80, z: 140, w: 36, d: 24, h: 12, p: 2 },
    { x: 55, z: -15, w: 30, d: 24, h: 13, p: 1 },
    { x: 105, z: -15, w: 32, d: 24, h: 16, p: 2 },
    { x: 55, z: 95, w: 28, d: 26, h: 12, p: 4 },
    { x: 105, z: 95, w: 32, d: 28, h: 19, p: 3 },
    { x: 80, z: 140, w: 34, d: 24, h: 11, p: 5 },
    { x: 215, z: -15, w: 26, d: 24, h: 12, p: 0 },
    { x: 215, z: 95, w: 28, d: 28, h: 14, p: 1 },
    { x: 215, z: 140, w: 26, d: 24, h: 10, p: 4 },
    { x: -105, z: -155, w: 32, d: 24, h: 14, p: 2 },
    { x: -55, z: -155, w: 28, d: 24, h: 12, p: 5 },
    { x: 55, z: -155, w: 30, d: 24, h: 15, p: 0 },
    { x: 105, z: -155, w: 32, d: 24, h: 13, p: 1 },
    { x: -80, z: -245, w: 36, d: 26, h: 16, p: 3 },
    { x: 80, z: -245, w: 36, d: 26, h: 14, p: 4 }
  ];

  blocks.forEach((b) => {
    const pal = BUILDING_PALETTE[b.p];
    const tex = buildingTextures[b.p];
    const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.65 });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(b.w, b.h, b.d), mat);
    mesh.position.set(b.x, b.h / 2, b.z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    cityGroup.add(mesh);

    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(b.w + 1.2, 0.9, b.d + 1.2),
      new THREE.MeshStandardMaterial({ color: pal.roof, roughness: 0.6 })
    );
    roof.position.set(b.x, b.h + 0.45, b.z);
    roof.castShadow = true;
    cityGroup.add(roof);

    const awning = new THREE.Mesh(
      new THREE.BoxGeometry(b.w * 0.65, 0.6, 2.2),
      new THREE.MeshStandardMaterial({ color: pal.trim, roughness: 0.5 })
    );
    awning.position.set(b.x, 3.3, b.z + b.d / 2 + 1.0);
    cityGroup.add(awning);

    colliders.push({
      minX: b.x - b.w / 2 - 0.8,
      maxX: b.x + b.w / 2 + 0.8,
      minZ: b.z - b.d / 2 - 0.8,
      maxZ: b.z + b.d / 2 + 0.8
    });
  });

  const trunkMat = new THREE.MeshStandardMaterial({ color: '#92400E', roughness: 0.9 });
  const leafMat1 = new THREE.MeshStandardMaterial({ color: '#22C55E', roughness: 0.7 });
  const leafMat2 = new THREE.MeshStandardMaterial({ color: '#84CC16', roughness: 0.7 });

  const treeSpots = [
    [-24, 14], [24, 14], [-24, 66], [24, 66],
    [-136, 14], [-136, 66], [136, 14], [136, 66],
    [-80, 15], [80, 15], [-80, 68], [80, 68],
    [-24, -140], [24, -140], [-136, -140], [136, -140],
    [248, 10], [248, 70], [248, 130], [248, -35]
  ];

  treeSpots.forEach(([tx, tz], idx) => {
    const tree = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.5, 2.6, 8), trunkMat);
    trunk.position.y = 1.3;
    trunk.castShadow = true;
    tree.add(trunk);

    const crown = new THREE.Mesh(new THREE.DodecahedronGeometry(2.3, 1), idx % 2 === 0 ? leafMat1 : leafMat2);
    crown.position.y = 3.8;
    crown.castShadow = true;
    tree.add(crown);

    tree.position.set(tx, 0, tz);
    cityGroup.add(tree);

    colliders.push({
      minX: tx - 0.9,
      maxX: tx + 0.9,
      minZ: tz - 0.9,
      maxZ: tz + 0.9
    });
  });

  // Animated Pedestrians
  const routes = [
    { x1: -146, z1: -30, x2: -146, z2: 190 },
    { x1: -14, z1: -30, x2: -14, z2: 190 },
    { x1: 14, z1: -30, x2: 14, z2: 190 },
    { x1: 146, z1: -30, x2: 146, z2: 190 },
    { x1: -180, z1: 26, x2: 180, z2: 26 },
    { x1: -180, z1: 54, x2: 180, z2: 54 },
    { x1: -180, z1: 166, x2: 180, z2: 166 },
    { x1: -14, z1: -260, x2: -14, z2: -140 },
    { x1: 14, z1: -260, x2: 14, z2: -140 }
  ];

  for (let i = 0; i < 34; i++) {
    const r = routes[i % routes.length];
    const t = (i * 0.29) % 1;
    const x = r.x1 + (r.x2 - r.x1) * t;
    const z = r.z1 + (r.z2 - r.z1) * t;
    const mesh = createPedestrianMesh(i);
    mesh.position.set(x, 0, z);
    scene.add(mesh);

    pedestrians.push({
      mesh,
      route: r,
      progress: t,
      dir: i % 2 === 0 ? 1 : -1,
      speed: 2.1 + (i % 4) * 0.45,
      walkCycle: i * 1.1,
      alive: true,
      respawnTimer: 0,
      vx: 0,
      vy: 0,
      vz: 0
    });
  }

  function getSurfaceHeightAt(x, z) {
    for (let i = 0; i < bridges.length; i++) {
      const b = bridges[i];
      if (Math.abs(x - b.x) <= b.halfWidth + 1.1 && z >= b.zStart && z <= b.zEnd) {
        const t = (z - b.zStart) / (b.zEnd - b.zStart);
        return Math.sin(t * Math.PI) * b.peakY;
      }
    }
    if (Math.abs(z - CANAL_Z) < CANAL_HALF_W || x > HARBOR_X) {
      return -2.4;
    }
    return 0;
  }

  return {
    colliders,
    pedestrians,
    repairPads,
    waterMat,
    canalWaterMesh,
    harborMesh,
    getSurfaceHeightAt
  };
}
