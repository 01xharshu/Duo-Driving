import * as THREE from 'three';
import { BlockerBox, BlockerKind, PhysicsState } from './wasmPhysics';

export type CameraMode = 'chase' | 'top' | 'pov';

export interface RendererInfo {
  backend: 'WebGPU' | 'WebGL2';
  fps: number;
}

export interface CityLayoutData {
  roadCoords: number[];
  roadWidth: number;
  worldHalf: number;
  blockers: BlockerBox[];
}

interface TrafficLightBulbs {
  red: THREE.MeshStandardMaterial;
  yellow: THREE.MeshStandardMaterial;
  green: THREE.MeshStandardMaterial;
  axis: 'ns' | 'ew';
}

export class OpenWorldRenderer {
  private container: HTMLElement;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private backendLabel: 'WebGPU' | 'WebGL2' = 'WebGL2';

  private carRoot!: THREE.Group;
  private carBodyGroup!: THREE.Group;
  private steeringWheel!: THREE.Mesh;
  private speedNeedle!: THREE.Mesh;
  private wheels: THREE.Group[] = [];
  private frontWheelPivots: THREE.Group[] = [];
  private skidParticles: THREE.Mesh[] = [];
  private skidIdx = 0;

  private trafficBulbs: TrafficLightBulbs[] = [];
  private signalTimer = 0;

  private cameraMode: CameraMode = 'chase';
  private currentCamPos = new THREE.Vector3(0, 8, -14);
  private currentCamLook = new THREE.Vector3(0, 1.5, 10);
  private shakeIntensity = 0;

  // City Grid Constants: 5x5 avenues (-160, -80, 0, 80, 160)
  public readonly roadCoords = [-160, -80, 0, 80, 160];
  public readonly roadWidth = 18;
  public readonly worldHalf = 240;
  public blockers: BlockerBox[] = [];

  constructor(container: HTMLElement) {
    this.container = container;
    this.generateCityWorldData();
  }

  public getCityLayout(): CityLayoutData {
    return {
      roadCoords: this.roadCoords,
      roadWidth: this.roadWidth,
      worldHalf: this.worldHalf,
      blockers: this.blockers
    };
  }

  private generateCityWorldData(): void {
    const items: BlockerBox[] = [];

    // 1. Perimeter Highway Barrier Walls around [-240..240]
    const arenaHalf = 239;
    const wallSeg = 20;
    for (let pos = -arenaHalf; pos <= arenaHalf; pos += wallSeg) {
      items.push(this.makeBox(pos, 2.2, -arenaHalf, wallSeg, 4.4, 3, 0x475966, 'wall'));
      items.push(this.makeBox(pos, 2.2, arenaHalf, wallSeg, 4.4, 3, 0x475966, 'wall'));
      items.push(this.makeBox(-arenaHalf, 2.2, pos, 3, 4.4, wallSeg, 0x475966, 'wall'));
      items.push(this.makeBox(arenaHalf, 2.2, pos, 3, 4.4, wallSeg, 0x475966, 'wall'));
    }

    // 2. City Blocks between avenues:
    // Zone centers between [-240, -160, -80, 0, 80, 160, 240] -> -200, -120, -40, 40, 120, 200
    const zoneEdges = [-232, ...this.roadCoords, 232];
    const buildingColors = [
      0xf4f1ea, // Warm Limestone
      0xe3edf5, // Sky Glass Tower
      0xfce7c8, // Terracotta Sand
      0xe6f4ea, // Mint Concrete
      0xfbe4e6, // Coral Plaza
      0xede7f6, // Lavender Office
      0xdce4ec  // Steel Blue Highrise
    ];

    let seed = 90210;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };

    const halfRoad = this.roadWidth / 2;
    const sidewalkPad = 4.5; // Sidewalk margin from road edge

    for (let ix = 0; ix < zoneEdges.length - 1; ix++) {
      for (let iz = 0; iz < zoneEdges.length - 1; iz++) {
        const minZoneX = zoneEdges[ix] + (ix === 0 ? 4 : halfRoad + sidewalkPad);
        const maxZoneX = zoneEdges[ix + 1] - (ix + 1 === zoneEdges.length - 1 ? 4 : halfRoad + sidewalkPad);
        const minZoneZ = zoneEdges[iz] + (iz === 0 ? 4 : halfRoad + sidewalkPad);
        const maxZoneZ = zoneEdges[iz + 1] - (iz + 1 === zoneEdges.length - 1 ? 4 : halfRoad + sidewalkPad);

        const zoneW = maxZoneX - minZoneX;
        const zoneD = maxZoneZ - minZoneZ;
        if (zoneW < 14 || zoneD < 14) continue;

        const cx = (minZoneX + maxZoneX) / 2;
        const cz = (minZoneZ + maxZoneZ) / 2;

        // Designate 6 lively Open-Air Street Markets in central quadrants
        const isMarketDistrict =
          (Math.abs(cx) === 40 && Math.abs(cz) === 40) ||
          (cx === 120 && cz === -40) ||
          (cx === -120 && cz === 40);

        if (isMarketDistrict) {
          // Central Market Pavilion + Perimeter Colorful Market Stalls (solid AABB blockers)
          items.push(this.makeBox(cx, 3.2, cz, 16, 6.4, 16, 0xff9600, 'market'));

          const stallColors = [0xff4b4b, 0x58cc02, 0x1cb0f6, 0xffc800, 0xce82ff];
          const offsets = [
            [-16, -16], [0, -18], [16, -16],
            [-18, 0],             [18, 0],
            [-16, 16],  [0, 18],  [16, 16]
          ];
          offsets.forEach(([ox, oz], idx) => {
            const sx = cx + ox;
            const sz = cz + oz;
            if (sx > minZoneX + 3 && sx < maxZoneX - 3 && sz > minZoneZ + 3 && sz < maxZoneZ - 3) {
              items.push(
                this.makeBox(sx, 1.7, sz, 6.2, 3.4, 5.2, stallColors[idx % stallColors.length], 'market')
              );
            }
          });
        } else {
          // Subdivide block into 2x2 architectural buildings with alleys between them
          const subCols = zoneW > 38 ? 2 : 1;
          const subRows = zoneD > 38 ? 2 : 1;
          const alley = 4.5;
          const cellW = (zoneW - alley * (subCols - 1)) / subCols;
          const cellD = (zoneD - alley * (subRows - 1)) / subRows;

          for (let sc = 0; sc < subCols; sc++) {
            for (let sr = 0; sr < subRows; sr++) {
              const bx = minZoneX + cellW / 2 + sc * (cellW + alley);
              const bz = minZoneZ + cellD / 2 + sr * (cellD + alley);
              const bw = Math.max(8, cellW * (0.82 + rand() * 0.14));
              const bd = Math.max(8, cellD * (0.82 + rand() * 0.14));
              const bh = 10 + Math.floor(rand() * 28);
              const col = buildingColors[Math.floor(rand() * buildingColors.length)];
              items.push(this.makeBox(bx, bh / 2, bz, bw, bh, bd, col, 'building'));
            }
          }
        }
      }
    }

    // 3. Street Light Poles along sidewalks & Traffic Light Poles at road intersections
    const poleOffset = halfRoad + 1.35;

    // Traffic lights at all 25 avenue intersections
    for (const rx of this.roadCoords) {
      for (const rz of this.roadCoords) {
        // Place 2 diagonal traffic signal poles per intersection so every approach sees a signal
        items.push(this.makeBox(rx - poleOffset, 3.4, rz - poleOffset, 0.65, 6.8, 0.65, 0x2b343b, 'pole'));
        items.push(this.makeBox(rx + poleOffset, 3.4, rz + poleOffset, 0.65, 6.8, 0.65, 0x2b343b, 'pole'));
      }
    }

    // Street light poles spaced every 40m along road sidewalks (avoiding intersections)
    for (const r of this.roadCoords) {
      for (let d = -200; d <= 200; d += 40) {
        const nearIntersection = this.roadCoords.some((ic) => Math.abs(d - ic) < 16);
        if (nearIntersection) continue;
        items.push(this.makeBox(r - poleOffset, 3.6, d, 0.5, 7.2, 0.5, 0x45525c, 'pole'));
        items.push(this.makeBox(d, 3.6, r + poleOffset, 0.5, 7.2, 0.5, 0x45525c, 'pole'));
      }
    }

    this.blockers = items;
  }

  private makeBox(
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    color: number,
    kind: BlockerKind
  ): BlockerBox {
    return {
      x, y, z, w, h, d, color, kind,
      minX: x - w / 2,
      maxX: x + w / 2,
      minZ: z - d / 2,
      maxZ: z + d / 2
    };
  }

  public async init(): Promise<RendererInfo> {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x8be2ff);
    this.scene.fog = new THREE.FogExp2(0x8be2ff, 0.0028);

    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    this.camera = new THREE.PerspectiveCamera(62, width / height, 0.15, 600);

    let initializedWebGPU = false;
    if ('gpu' in navigator && (navigator as unknown as { gpu?: unknown }).gpu) {
      try {
        const webgpuMod = await import('three/webgpu');
        if (webgpuMod && webgpuMod.WebGPURenderer) {
          const gpuRenderer = new webgpuMod.WebGPURenderer({ antialias: true, powerPreference: 'high-performance' });
          await gpuRenderer.init();
          gpuRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
          gpuRenderer.setSize(width, height);
          gpuRenderer.shadowMap.enabled = true;
          this.renderer = gpuRenderer as unknown as THREE.WebGLRenderer;
          this.backendLabel = 'WebGPU';
          initializedWebGPU = true;
        }
      } catch {
        initializedWebGPU = false;
      }
    }

    if (!initializedWebGPU) {
      this.renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: 'high-performance'
      });
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this.renderer.setSize(width, height);
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.08;
      this.backendLabel = 'WebGL2';
    }

    this.container.innerHTML = '';
    this.container.appendChild(this.renderer.domElement);

    this.setupLighting();
    this.buildRealisticCityGroundAndRoads();
    this.buildCityArchitectureAndPoles();
    this.buildDetailedCarWithInterior();
    this.buildDriftSmokePool();

    window.addEventListener('resize', this.onResize);

    return { backend: this.backendLabel, fps: 60 };
  }

  private setupLighting(): void {
    const hemi = new THREE.HemisphereLight(0xffffff, 0x5da832, 1.05);
    this.scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xfff8e7, 1.85);
    sun.position.set(110, 165, 85);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.near = 10;
    sun.shadow.camera.far = 420;
    const d = 185;
    sun.shadow.camera.left = -d;
    sun.shadow.camera.right = d;
    sun.shadow.camera.top = d;
    sun.shadow.camera.bottom = -d;
    sun.shadow.bias = -0.0005;
    this.scene.add(sun);
  }

  /**
   * Generates a crisp high-resolution CanvasTexture for the entire 480x480 city ground:
   * - Lush green park turf & concrete city sidewalks
   * - Multi-lane asphalt avenues with realistic grain
   * - Double yellow center lines, white dashed lane dividers, solid edge lines
   * - White zebra crosswalk stripes and stop bars at every intersection
   */
  private buildRealisticCityGroundAndRoads(): void {
    const size = 2048;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    const worldSpan = this.worldHalf * 2; // 480m
    const toPx = (worldVal: number) => ((worldVal + this.worldHalf) / worldSpan) * size;
    const roadPx = (this.roadWidth / worldSpan) * size;
    const sidewalkPx = ((this.roadWidth + 8) / worldSpan) * size;

    // 1. Base City Grass / Park Turf
    ctx.fillStyle = '#5BB83B';
    ctx.fillRect(0, 0, size, size);

    // Subtle grass texture speckles
    for (let i = 0; i < 14000; i++) {
      ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.04)' : 'rgba(20,60,15,0.05)';
      ctx.fillRect((i * 73) % size, (i * 137) % size, 3, 3);
    }

    // 2. Concrete Sidewalk Pads bordering every avenue
    ctx.fillStyle = '#CBD5E1';
    for (const r of this.roadCoords) {
      const c = toPx(r);
      ctx.fillRect(c - sidewalkPx / 2, 0, sidewalkPx, size);
      ctx.fillRect(0, c - sidewalkPx / 2, size, sidewalkPx);
    }

    // Sidewalk curb lines
    ctx.strokeStyle = '#94A3B8';
    ctx.lineWidth = 2;
    for (const r of this.roadCoords) {
      const c = toPx(r);
      ctx.strokeRect(c - sidewalkPx / 2, 0, sidewalkPx, size);
      ctx.strokeRect(0, c - sidewalkPx / 2, size, sidewalkPx);
    }

    // 3. Dark Asphalt Avenues
    ctx.fillStyle = '#2B323B';
    for (const r of this.roadCoords) {
      const c = toPx(r);
      ctx.fillRect(c - roadPx / 2, 0, roadPx, size);
      ctx.fillRect(0, c - roadPx / 2, size, roadPx);
    }

    // Asphalt micro-aggregate grain
    for (let i = 0; i < 18000; i++) {
      const rx = (i * 97) % size;
      const ry = (i * 193) % size;
      ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.08)';
      ctx.fillRect(rx, ry, 2, 2);
    }

    // 4. White Road Edge Lines & Double Yellow Center Lines (skipping intersections)
    for (const r of this.roadCoords) {
      const c = toPx(r);

      // Solid white shoulder lines
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.fillRect(c - roadPx * 0.44, 0, 2.5, size);
      ctx.fillRect(c + roadPx * 0.44 - 2.5, 0, 2.5, size);
      ctx.fillRect(0, c - roadPx * 0.44, size, 2.5);
      ctx.fillRect(0, c + roadPx * 0.44 - 2.5, size, 2.5);

      // Double yellow center lines between intersections
      const segEdges = [-240, ...this.roadCoords, 240];
      for (let s = 0; s < segEdges.length - 1; s++) {
        const startW = segEdges[s] + (s === 0 ? 0 : this.roadWidth * 0.65);
        const endW = segEdges[s + 1] - (s + 1 === segEdges.length - 1 ? 0 : this.roadWidth * 0.65);
        if (endW <= startW) continue;

        const p1 = toPx(startW);
        const p2 = toPx(endW);

        ctx.fillStyle = '#FFC800';
        // Vertical road double yellow
        ctx.fillRect(c - 3.2, p1, 2.2, p2 - p1);
        ctx.fillRect(c + 1.0, p1, 2.2, p2 - p1);
        // Horizontal road double yellow
        ctx.fillRect(p1, c - 3.2, p2 - p1, 2.2);
        ctx.fillRect(p1, c + 1.0, p2 - p1, 2.2);

        // White dashed lane dividers
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.lineWidth = 2;
        ctx.setLineDash([14, 14]);

        [-roadPx * 0.22, roadPx * 0.22].forEach((laneOff) => {
          ctx.beginPath();
          ctx.moveTo(c + laneOff, p1);
          ctx.lineTo(c + laneOff, p2);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(p1, c + laneOff);
          ctx.lineTo(p2, c + laneOff);
          ctx.stroke();
        });
        ctx.setLineDash([]);
      }
    }

    // 5. Intersection Asphalt Box & Zebra Crosswalks + Stop Bars
    for (const rx of this.roadCoords) {
      for (const rz of this.roadCoords) {
        const cx = toPx(rx);
        const cz = toPx(rz);

        // Clean intersection asphalt square
        ctx.fillStyle = '#2B323B';
        ctx.fillRect(cx - roadPx * 0.46, cz - roadPx * 0.46, roadPx * 0.92, roadPx * 0.92);

        // Zebra crosswalks on all 4 sides of intersection
        ctx.fillStyle = '#F8FAFC';
        const stripeCount = 7;
        const stripeSpan = roadPx * 0.78;
        const step = stripeSpan / stripeCount;
        const zebraDepth = 10;

        for (let k = 0; k < stripeCount; k++) {
          const offset = -stripeSpan / 2 + k * step + step * 0.2;
          const barW = step * 0.56;
          // North & South crosswalks
          ctx.fillRect(cx + offset, cz - roadPx * 0.62, barW, zebraDepth);
          ctx.fillRect(cx + offset, cz + roadPx * 0.62 - zebraDepth, barW, zebraDepth);
          // West & East crosswalks
          ctx.fillRect(cx - roadPx * 0.62, cz + offset, zebraDepth, barW);
          ctx.fillRect(cx + roadPx * 0.62 - zebraDepth, cz + offset, zebraDepth, barW);
        }
      }
    }

    const groundTex = new THREE.CanvasTexture(canvas);
    groundTex.anisotropy = 16;
    groundTex.colorSpace = THREE.SRGBColorSpace;

    const groundMat = new THREE.MeshStandardMaterial({
      map: groundTex,
      roughness: 0.88,
      metalness: 0.04
    });

    const ground = new THREE.Mesh(new THREE.PlaneGeometry(worldSpan, worldSpan), groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);
  }

  /**
   * Renders Buildings (with procedural lit/daylight window facades & rooftop HVAC/helipads),
   * Open-Air Markets (striped awnings, crates, market pavilions),
   * Street Light Poles (curved mast arm + warm glowing street lamp),
   * Traffic Light Poles (cantilever mast + animated Red / Yellow / Green signal lights).
   */
  private buildCityArchitectureAndPoles(): void {
    // Create reusable window facade texture for realistic multi-story buildings
    const winCanvas = document.createElement('canvas');
    winCanvas.width = 256;
    winCanvas.height = 512;
    const wCtx = winCanvas.getContext('2d')!;
    wCtx.fillStyle = '#FFFFFF';
    wCtx.fillRect(0, 0, 256, 512);

    const cols = 4;
    const rows = 8;
    const padX = 14;
    const padY = 14;
    const cellW = 256 / cols;
    const cellH = 512 / rows;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const isWarm = (r * 7 + c * 3) % 5 === 0;
        wCtx.fillStyle = isWarm ? '#FFE89E' : '#2C4966';
        wCtx.fillRect(c * cellW + padX, r * cellH + padY, cellW - padX * 2, cellH - padY * 2);
        // Window frame highlight
        wCtx.strokeStyle = '#94A3B8';
        wCtx.lineWidth = 2;
        wCtx.strokeRect(c * cellW + padX, r * cellH + padY, cellW - padX * 2, cellH - padY * 2);
      }
    }

    const windowTex = new THREE.CanvasTexture(winCanvas);
    windowTex.wrapS = THREE.RepeatWrapping;
    windowTex.wrapT = THREE.RepeatWrapping;
    windowTex.colorSpace = THREE.SRGBColorSpace;

    // Striped canopy texture for market stalls
    const awningCanvas = document.createElement('canvas');
    awningCanvas.width = 128;
    awningCanvas.height = 128;
    const aCtx = awningCanvas.getContext('2d')!;
    for (let i = 0; i < 8; i++) {
      aCtx.fillStyle = i % 2 === 0 ? '#FFFFFF' : '#FF4B4B';
      aCtx.fillRect(i * 16, 0, 16, 128);
    }
    const awningTex = new THREE.CanvasTexture(awningCanvas);
    awningTex.colorSpace = THREE.SRGBColorSpace;

    const unitBox = new THREE.BoxGeometry(1, 1, 1);
    const roofTrimMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.6 });
    const poleMetalMat = new THREE.MeshStandardMaterial({ color: 0x374151, roughness: 0.4, metalness: 0.65 });
    const lampBulbMat = new THREE.MeshStandardMaterial({
      color: 0xfff3b0,
      emissive: 0xffd166,
      emissiveIntensity: 2.2
    });
    const housingMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 });

    const halfRoad = this.roadWidth / 2;
    const poleOffset = halfRoad + 1.35;

    for (const b of this.blockers) {
      if (b.kind === 'building') {
        const texClone = windowTex.clone();
        texClone.needsUpdate = true;
        texClone.repeat.set(Math.max(1, Math.round(b.w / 8)), Math.max(2, Math.round(b.h / 10)));

        const wallMat = new THREE.MeshStandardMaterial({
          color: b.color,
          map: texClone,
          roughness: 0.45,
          metalness: 0.1
        });

        const mesh = new THREE.Mesh(unitBox, wallMat);
        mesh.position.set(b.x, b.y, b.z);
        mesh.scale.set(b.w, b.h, b.d);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.scene.add(mesh);

        // Architectural parapet roof ledge & rooftop HVAC unit
        const ledge = new THREE.Mesh(unitBox, roofTrimMat);
        ledge.position.set(b.x, b.y + b.h / 2 + 0.25, b.z);
        ledge.scale.set(b.w + 0.5, 0.5, b.d + 0.5);
        this.scene.add(ledge);

        const hvac = new THREE.Mesh(unitBox, roofTrimMat);
        hvac.position.set(b.x + b.w * 0.18, b.y + b.h / 2 + 0.9, b.z - b.d * 0.18);
        hvac.scale.set(b.w * 0.28, 0.9, b.d * 0.28);
        this.scene.add(hvac);
      } else if (b.kind === 'market') {
        // Market Stall Base / Pavilion
        const baseMat = new THREE.MeshStandardMaterial({
          color: b.color,
          roughness: 0.55
        });
        const body = new THREE.Mesh(unitBox, baseMat);
        body.position.set(b.x, b.y * 0.65, b.z);
        body.scale.set(b.w, b.h * 0.65, b.d);
        body.castShadow = true;
        body.receiveShadow = true;
        this.scene.add(body);

        // Striped Market Awning Roof
        const canopyMat = new THREE.MeshStandardMaterial({
          map: awningTex,
          color: b.w > 10 ? 0xffc800 : 0xffffff,
          roughness: 0.5
        });
        const canopy = new THREE.Mesh(unitBox, canopyMat);
        canopy.position.set(b.x, b.h * 0.85, b.z);
        canopy.scale.set(b.w + 0.9, 0.45, b.d + 0.9);
        canopy.castShadow = true;
        this.scene.add(canopy);
      } else if (b.kind === 'wall') {
        const wallMat = new THREE.MeshStandardMaterial({
          color: b.color,
          roughness: 0.65
        });
        const wall = new THREE.Mesh(unitBox, wallMat);
        wall.position.set(b.x, b.y, b.z);
        wall.scale.set(b.w, b.h, b.d);
        wall.castShadow = true;
        wall.receiveShadow = true;
        this.scene.add(wall);

        // Yellow/Black hazard top stripe on perimeter barrier
        const stripe = new THREE.Mesh(
          unitBox,
          new THREE.MeshStandardMaterial({ color: 0xffc800, roughness: 0.4 })
        );
        stripe.position.set(b.x, b.h + 0.15, b.z);
        stripe.scale.set(b.w, 0.3, b.d);
        this.scene.add(stripe);
      } else if (b.kind === 'pole') {
        // Check whether this pole is at an intersection (Traffic Light Pole) or mid-block (Road Street Light Pole)
        const nearInterX = this.roadCoords.find((ic) => Math.abs(Math.abs(b.x - ic) - poleOffset) < 0.2);
        const nearInterZ = this.roadCoords.find((ic) => Math.abs(Math.abs(b.z - ic) - poleOffset) < 0.2);
        const isTrafficSignal = nearInterX !== undefined && nearInterZ !== undefined;

        const poleGroup = new THREE.Group();
        poleGroup.position.set(b.x, 0, b.z);

        // Concrete base pedestal
        const base = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.38, 0.55, 10), roofTrimMat);
        base.position.y = 0.275;
        poleGroup.add(base);

        // Vertical steel shaft
        const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.15, b.h, 10), poleMetalMat);
        shaft.position.y = b.h / 2;
        shaft.castShadow = true;
        poleGroup.add(shaft);

        if (isTrafficSignal && nearInterX !== undefined && nearInterZ !== undefined) {
          // Point cantilever arm toward center of intersection
          const dirX = nearInterX - b.x;
          const dirZ = nearInterZ - b.z;
          const angle = Math.atan2(dirX, dirZ);
          poleGroup.rotation.y = angle;

          // Horizontal mast arm extending over the lane
          const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 4.6, 8), poleMetalMat);
          arm.rotation.x = Math.PI / 2;
          arm.position.set(0, b.h - 0.35, 2.2);
          poleGroup.add(arm);

          // Traffic signal housing box
          const box = new THREE.Mesh(new THREE.BoxGeometry(0.52, 1.38, 0.45), housingMat);
          box.position.set(0, b.h - 0.55, 3.8);
          poleGroup.add(box);

          // Red, Yellow, Green emissive signal bulbs
          const redMat = new THREE.MeshStandardMaterial({ color: 0x450a0a, emissive: 0xff2222, emissiveIntensity: 2.2 });
          const yelMat = new THREE.MeshStandardMaterial({ color: 0x422006, emissive: 0xffc800, emissiveIntensity: 0.1 });
          const grnMat = new THREE.MeshStandardMaterial({ color: 0x052e16, emissive: 0x58cc02, emissiveIntensity: 0.1 });

          const bulbGeo = new THREE.SphereGeometry(0.14, 10, 10);
          const redBulb = new THREE.Mesh(bulbGeo, redMat);
          redBulb.position.set(0, b.h - 0.18, 3.56);
          const yelBulb = new THREE.Mesh(bulbGeo, yelMat);
          yelBulb.position.set(0, b.h - 0.55, 3.56);
          const grnBulb = new THREE.Mesh(bulbGeo, grnMat);
          grnBulb.position.set(0, b.h - 0.92, 3.56);

          poleGroup.add(redBulb, yelBulb, grnBulb);

          this.trafficBulbs.push({
            red: redMat,
            yellow: yelMat,
            green: grnMat,
            axis: b.x < nearInterX ? 'ns' : 'ew'
          });
        } else {
          // Road Street Light Pole: orient arm toward nearest avenue center
          let nearestRoadDist = Infinity;
          let targetAngle = 0;
          for (const r of this.roadCoords) {
            if (Math.abs(Math.abs(b.x - r) - poleOffset) < 0.2) {
              nearestRoadDist = 0;
              targetAngle = b.x < r ? Math.PI / 2 : -Math.PI / 2;
              break;
            }
            if (Math.abs(Math.abs(b.z - r) - poleOffset) < 0.2 && nearestRoadDist > 0) {
              targetAngle = b.z < r ? 0 : Math.PI;
            }
          }
          poleGroup.rotation.y = targetAngle;

          // Curved street lamp mast arm
          const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 3.2, 8), poleMetalMat);
          arm.rotation.x = Math.PI / 2.3;
          arm.position.set(0, b.h + 0.15, 1.45);
          poleGroup.add(arm);

          // Luminaire fixture & glowing LED bulb
          const hood = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.14, 0.78), housingMat);
          hood.position.set(0, b.h + 0.42, 2.85);
          poleGroup.add(hood);

          const bulb = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.08, 0.62), lampBulbMat);
          bulb.position.set(0, b.h + 0.34, 2.85);
          poleGroup.add(bulb);
        }

        this.scene.add(poleGroup);
      }
    }
  }

  private buildDetailedCarWithInterior(): void {
    this.carRoot = new THREE.Group();
    this.carBodyGroup = new THREE.Group();
    this.carRoot.add(this.carBodyGroup);

    const paintMat = new THREE.MeshStandardMaterial({
      color: 0x58cc02,
      roughness: 0.25,
      metalness: 0.22
    });
    const darkTrimMat = new THREE.MeshStandardMaterial({
      color: 0x1f2933,
      roughness: 0.65,
      metalness: 0.15
    });
    const seatMat = new THREE.MeshStandardMaterial({
      color: 0x2d3748,
      roughness: 0.75
    });
    const accentYellowMat = new THREE.MeshStandardMaterial({
      color: 0xffc800,
      roughness: 0.3,
      emissive: 0x443300
    });
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xcff4ff,
      transparent: true,
      opacity: 0.22,
      roughness: 0.05,
      metalness: 0.1,
      side: THREE.DoubleSide
    });

    const floorPan = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.36, 4.35), darkTrimMat);
    floorPan.position.set(0, 0.42, 0);
    floorPan.castShadow = true;
    this.carBodyGroup.add(floorPan);

    const hood = new THREE.Mesh(new THREE.BoxGeometry(1.98, 0.34, 1.48), paintMat);
    hood.position.set(0, 0.72, 1.38);
    hood.rotation.x = 0.06;
    hood.castShadow = true;
    this.carBodyGroup.add(hood);

    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.35, 1.46), accentYellowMat);
    stripe.position.set(0, 0.725, 1.38);
    stripe.rotation.x = 0.06;
    this.carBodyGroup.add(stripe);

    const frontBumper = new THREE.Mesh(new THREE.BoxGeometry(2.08, 0.38, 0.35), darkTrimMat);
    frontBumper.position.set(0, 0.46, 2.15);
    this.carBodyGroup.add(frontBumper);

    const headLightMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xfff3b0,
      emissiveIntensity: 1.8
    });
    [-0.68, 0.68].forEach((xPos) => {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.16, 0.12), headLightMat);
      hl.position.set(xPos, 0.68, 2.15);
      this.carBodyGroup.add(hl);
    });

    const trunk = new THREE.Mesh(new THREE.BoxGeometry(1.98, 0.48, 1.05), paintMat);
    trunk.position.set(0, 0.8, -1.62);
    trunk.castShadow = true;
    this.carBodyGroup.add(trunk);

    const wing = new THREE.Mesh(new THREE.BoxGeometry(2.04, 0.08, 0.28), accentYellowMat);
    wing.position.set(0, 1.24, -1.96);
    wing.castShadow = true;
    this.carBodyGroup.add(wing);

    [-0.75, 0.75].forEach((xPos) => {
      const strut = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.24, 0.14), darkTrimMat);
      strut.position.set(xPos, 1.1, -1.94);
      this.carBodyGroup.add(strut);
    });

    const tailMat = new THREE.MeshStandardMaterial({
      color: 0xff4b4b,
      emissive: 0xff2222,
      emissiveIntensity: 1.5
    });
    [-0.66, 0.66].forEach((xPos) => {
      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.16, 0.1), tailMat);
      tl.position.set(xPos, 0.78, -2.14);
      this.carBodyGroup.add(tl);
    });

    [-0.96, 0.96].forEach((xPos) => {
      const door = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.46, 1.92), paintMat);
      door.position.set(xPos, 0.74, -0.15);
      door.castShadow = true;
      this.carBodyGroup.add(door);

      const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.12, 0.16), paintMat);
      mirror.position.set(xPos * 1.14, 1.04, 0.62);
      this.carBodyGroup.add(mirror);
    });

    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.1, 1.65), paintMat);
    roof.position.set(0, 1.52, -0.25);
    roof.castShadow = true;
    this.carBodyGroup.add(roof);

    [-0.84, 0.84].forEach((xPos) => {
      const aPillar = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.66, 0.08), darkTrimMat);
      aPillar.position.set(xPos, 1.24, 0.68);
      aPillar.rotation.x = -0.42;
      this.carBodyGroup.add(aPillar);

      const cPillar = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.62, 0.14), paintMat);
      cPillar.position.set(xPos, 1.24, -1.12);
      cPillar.rotation.x = 0.34;
      this.carBodyGroup.add(cPillar);
    });

    const windshield = new THREE.Mesh(new THREE.PlaneGeometry(1.66, 0.66), glassMat);
    windshield.position.set(0, 1.24, 0.68);
    windshield.rotation.x = -0.42;
    this.carBodyGroup.add(windshield);

    // Cabin Interior
    const dashboard = new THREE.Mesh(new THREE.BoxGeometry(1.76, 0.34, 0.52), darkTrimMat);
    dashboard.position.set(0, 0.88, 0.62);
    this.carBodyGroup.add(dashboard);

    const clusterHood = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.16, 0.24), darkTrimMat);
    clusterHood.position.set(-0.42, 1.06, 0.52);
    this.carBodyGroup.add(clusterHood);

    const dialBg = new THREE.Mesh(
      new THREE.PlaneGeometry(0.4, 0.13),
      new THREE.MeshBasicMaterial({ color: 0x102a38 })
    );
    dialBg.position.set(-0.42, 1.05, 0.398);
    dialBg.rotation.y = Math.PI;
    this.carBodyGroup.add(dialBg);

    this.speedNeedle = new THREE.Mesh(
      new THREE.BoxGeometry(0.018, 0.085, 0.01),
      new THREE.MeshBasicMaterial({ color: 0x58cc02 })
    );
    this.speedNeedle.position.set(-0.42, 1.03, 0.392);
    this.carBodyGroup.add(this.speedNeedle);

    const centerScreen = new THREE.Mesh(
      new THREE.BoxGeometry(0.34, 0.22, 0.04),
      new THREE.MeshBasicMaterial({ color: 0x1cb0f6 })
    );
    centerScreen.position.set(0.02, 1.04, 0.45);
    centerScreen.rotation.x = 0.22;
    this.carBodyGroup.add(centerScreen);

    const shifterBase = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.18, 0.95), darkTrimMat);
    shifterBase.position.set(0, 0.62, 0.05);
    this.carBodyGroup.add(shifterBase);

    const gearKnob = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 12), accentYellowMat);
    gearKnob.position.set(0, 0.78, 0.16);
    this.carBodyGroup.add(gearKnob);

    const steerGroup = new THREE.Group();
    steerGroup.position.set(-0.42, 0.99, 0.31);
    steerGroup.rotation.x = -0.35;

    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.024, 10, 24), darkTrimMat);
    steerGroup.add(rim);

    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.03, 14), accentYellowMat);
    hub.rotation.x = Math.PI / 2;
    steerGroup.add(hub);

    const spokeLeft = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.026, 0.02), darkTrimMat);
    steerGroup.add(spokeLeft);
    const spokeBottom = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.16, 0.02), darkTrimMat);
    spokeBottom.position.y = -0.08;
    steerGroup.add(spokeBottom);

    this.carBodyGroup.add(steerGroup);
    this.steeringWheel = steerGroup as unknown as THREE.Mesh;

    [-0.44, 0.44].forEach((xPos) => {
      const cushion = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.14, 0.54), seatMat);
      cushion.position.set(xPos, 0.62, -0.18);
      this.carBodyGroup.add(cushion);

      const backrest = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.68, 0.14), seatMat);
      backrest.position.set(xPos, 0.96, -0.44);
      backrest.rotation.x = -0.16;
      this.carBodyGroup.add(backrest);

      const headrest = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.18, 0.12), accentYellowMat);
      headrest.position.set(xPos, 1.35, -0.5);
      this.carBodyGroup.add(headrest);
    });

    const wheelPositions: [number, number, number, boolean][] = [
      [-1.04, 0.42, 1.35, true],
      [1.04, 0.42, 1.35, true],
      [-1.04, 0.42, -1.35, false],
      [1.04, 0.42, -1.35, false]
    ];

    const tireGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.3, 20);
    tireGeo.rotateZ(Math.PI / 2);
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x181c20, roughness: 0.85 });

    const rimGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.31, 14);
    rimGeo.rotateZ(Math.PI / 2);

    for (const [wx, wy, wz, isFront] of wheelPositions) {
      const pivot = new THREE.Group();
      pivot.position.set(wx, wy, wz);

      const wheelMeshGroup = new THREE.Group();
      const tire = new THREE.Mesh(tireGeo, tireMat);
      tire.castShadow = true;
      const rimMesh = new THREE.Mesh(rimGeo, accentYellowMat);
      wheelMeshGroup.add(tire, rimMesh);

      pivot.add(wheelMeshGroup);
      this.carRoot.add(pivot);
      this.wheels.push(wheelMeshGroup);
      if (isFront) {
        this.frontWheelPivots.push(pivot);
      }
    }

    this.scene.add(this.carRoot);
  }

  private buildDriftSmokePool(): void {
    const geo = new THREE.SphereGeometry(0.32, 8, 8);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.55
    });

    for (let i = 0; i < 45; i++) {
      const puff = new THREE.Mesh(geo, mat.clone());
      puff.visible = false;
      puff.userData.life = 0;
      this.scene.add(puff);
      this.skidParticles.push(puff);
    }
  }

  public cycleCameraMode(): CameraMode {
    if (this.cameraMode === 'chase') {
      this.cameraMode = 'top';
    } else if (this.cameraMode === 'top') {
      this.cameraMode = 'pov';
    } else {
      this.cameraMode = 'chase';
    }
    return this.cameraMode;
  }

  public setCameraMode(mode: CameraMode): void {
    this.cameraMode = mode;
  }

  public getCameraMode(): CameraMode {
    return this.cameraMode;
  }

  public update(state: PhysicsState, dt: number): void {
    this.carRoot.position.set(state.x, 0, state.z);
    this.carRoot.rotation.y = state.heading;

    const targetRoll = -state.steerAngle * Math.min(1, state.speed / 28) * 0.085;
    this.carBodyGroup.rotation.z += (targetRoll - this.carBodyGroup.rotation.z) * Math.min(1, dt * 10);

    if (this.steeringWheel) {
      this.steeringWheel.rotation.z = -state.steerAngle * 2.4;
    }

    if (this.speedNeedle) {
      const speedNorm = Math.min(1, state.speed / 52);
      this.speedNeedle.rotation.z = 0.8 - speedNorm * 1.6;
    }

    for (const w of this.wheels) {
      w.rotation.x += state.speed * dt * 2.4;
    }
    for (const p of this.frontWheelPivots) {
      p.rotation.y = state.steerAngle;
    }

    // Cycle Traffic Light Signals (Red -> Green -> Yellow)
    this.signalTimer = (this.signalTimer + dt) % 10;
    for (const tl of this.trafficBulbs) {
      const phase = tl.axis === 'ns' ? this.signalTimer : (this.signalTimer + 5) % 10;
      if (phase < 4.2) {
        tl.green.emissiveIntensity = 2.6;
        tl.yellow.emissiveIntensity = 0.05;
        tl.red.emissiveIntensity = 0.05;
      } else if (phase < 5.2) {
        tl.green.emissiveIntensity = 0.05;
        tl.yellow.emissiveIntensity = 2.6;
        tl.red.emissiveIntensity = 0.05;
      } else {
        tl.green.emissiveIntensity = 0.05;
        tl.yellow.emissiveIntensity = 0.05;
        tl.red.emissiveIntensity = 2.6;
      }
    }

    // Spawn drift smoke puffs
    if (state.driftIntensity > 0.28 && state.speed > 6) {
      const sin = Math.sin(state.heading);
      const cos = Math.cos(state.heading);
      const rearOffsets = [-0.85, 0.85];
      for (const side of rearOffsets) {
        const puff = this.skidParticles[this.skidIdx];
        this.skidIdx = (this.skidIdx + 1) % this.skidParticles.length;
        puff.visible = true;
        puff.userData.life = 1.0;
        puff.position.set(
          state.x - sin * 1.45 + cos * side,
          0.25,
          state.z - cos * 1.45 - sin * side
        );
        puff.scale.setScalar(0.65);
      }
    }

    for (const puff of this.skidParticles) {
      if (!puff.visible) continue;
      puff.userData.life -= dt * 2.2;
      if (puff.userData.life <= 0) {
        puff.visible = false;
      } else {
        puff.position.y += dt * 1.2;
        puff.scale.addScalar(dt * 2.4);
        (puff.material as THREE.MeshBasicMaterial).opacity = puff.userData.life * 0.45;
      }
    }

    if (state.impactImpulse > 1.5) {
      this.shakeIntensity = Math.min(0.65, state.impactImpulse * 0.022);
    }
    this.shakeIntensity = Math.max(0, this.shakeIntensity - dt * 2.4);

    this.updateCamera(state, dt);
    this.renderer.render(this.scene, this.camera);
  }

  private updateCamera(state: PhysicsState, dt: number): void {
    const sin = Math.sin(state.heading);
    const cos = Math.cos(state.heading);

    if (this.cameraMode === 'pov') {
      const localEye = new THREE.Vector3(-0.42, 1.18, -0.14);
      localEye.applyAxisAngle(new THREE.Vector3(0, 1, 0), state.heading);
      const eyePos = new THREE.Vector3(state.x + localEye.x, localEye.y, state.z + localEye.z);

      const localTarget = new THREE.Vector3(-0.36 + state.steerAngle * 1.4, 1.08, 12.0);
      localTarget.applyAxisAngle(new THREE.Vector3(0, 1, 0), state.heading);
      const lookTarget = new THREE.Vector3(state.x + localTarget.x, localTarget.y, state.z + localTarget.z);

      this.camera.position.copy(eyePos);
      this.camera.lookAt(lookTarget);
      this.camera.fov = 72 + Math.min(10, state.speed * 0.18);
      this.camera.updateProjectionMatrix();
    } else if (this.cameraMode === 'top') {
      const desiredPos = new THREE.Vector3(
        state.x - sin * 6,
        38 + Math.min(12, state.speed * 0.22),
        state.z - cos * 6
      );
      const desiredLook = new THREE.Vector3(state.x + sin * 6, 0, state.z + cos * 6);

      const lerpAlpha = Math.min(1, dt * 9);
      this.currentCamPos.lerp(desiredPos, lerpAlpha);
      this.currentCamLook.lerp(desiredLook, lerpAlpha);

      this.camera.position.copy(this.currentCamPos);
      this.camera.lookAt(this.currentCamLook);
      this.camera.fov = 56;
      this.camera.updateProjectionMatrix();
    } else {
      const dist = 7.6 + Math.min(2.2, state.speed * 0.04);
      const height = 3.35;
      const desiredPos = new THREE.Vector3(
        state.x - sin * dist,
        height,
        state.z - cos * dist
      );
      const desiredLook = new THREE.Vector3(
        state.x + sin * 6.5,
        1.35,
        state.z + cos * 6.5
      );

      const lerpAlpha = Math.min(1, dt * 11);
      this.currentCamPos.lerp(desiredPos, lerpAlpha);
      this.currentCamLook.lerp(desiredLook, lerpAlpha);

      this.camera.position.copy(this.currentCamPos);
      this.camera.lookAt(this.currentCamLook);
      this.camera.fov = 62 + Math.min(12, state.speed * 0.22);
      this.camera.updateProjectionMatrix();
    }

    if (this.shakeIntensity > 0.001) {
      this.camera.position.x += (Math.random() - 0.5) * this.shakeIntensity;
      this.camera.position.y += (Math.random() - 0.5) * this.shakeIntensity;
    }
  }

  private onResize = (): void => {
    if (!this.container || !this.renderer || !this.camera) return;
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  public dispose(): void {
    window.removeEventListener('resize', this.onResize);
    if (this.renderer) {
      this.renderer.dispose();
    }
  }
}
