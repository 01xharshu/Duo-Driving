import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { CAR_CATALOG } from '../data/cars.js';
import {
  buildRealisticCar,
  createPoliceCruiserMesh,
  drawDashboardDisplay
} from '../three/carBuilder.js';
import { buildCityWorld } from '../three/worldBuilder.js';

export default function GameCanvas({
  phase,
  selectedCarIdx,
  carColor,
  cameraMode,
  settings,
  soundEngine,
  initialSpawn,
  resetSignal,
  repairSignal,
  touchControlsRef,
  playerSnapshotRef,
  onToggleCamera,
  onHudUpdate,
  onCrashDeath,
  onToast
}) {
  const canvasRef = useRef(null);

  const propsRef = useRef({
    phase,
    selectedCarIdx,
    carColor,
    cameraMode,
    settings,
    onToggleCamera,
    onHudUpdate,
    onCrashDeath,
    onToast
  });

  useEffect(() => {
    propsRef.current = {
      phase,
      selectedCarIdx,
      carColor,
      cameraMode,
      settings,
      onToggleCamera,
      onHudUpdate,
      onCrashDeath,
      onToast
    };
  }, [
    phase,
    selectedCarIdx,
    carColor,
    cameraMode,
    settings,
    onToggleCamera,
    onHudUpdate,
    onCrashDeath,
    onToast
  ]);

  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const worldRef = useRef(null);
  const playerCarObjRef = useRef(null);
  const garageCarObjRef = useRef(null);
  const policeUnitsRef = useRef([]);
  const particlesRef = useRef([]);

  const simRef = useRef({
    x: 0,
    y: 0,
    z: 40,
    heading: 0,
    speed: 0,
    steerAngle: 0,
    pitch: 0,
    roll: 0,
    wheelSpin: 0,
    health: 100,
    maxHealth: 100,
    nitro: 100,
    wanted: 0,
    wantedTimer: 0,
    casualties: 0,
    dead: false
  });

  const rebuildCars = (carIdx, colorHex) => {
    const scene = sceneRef.current;
    if (!scene) return;

    if (playerCarObjRef.current) scene.remove(playerCarObjRef.current.mesh);
    if (garageCarObjRef.current) scene.remove(garageCarObjRef.current.mesh);

    const spec = CAR_CATALOG[carIdx];
    const playerBuilt = buildRealisticCar(spec, colorHex, true);
    playerBuilt.mesh.position.set(simRef.current.x, simRef.current.y, simRef.current.z);
    playerBuilt.mesh.rotation.y = simRef.current.heading;
    scene.add(playerBuilt.mesh);
    playerCarObjRef.current = playerBuilt;

    const garageBuilt = buildRealisticCar(spec, colorHex, false);
    garageBuilt.mesh.position.set(0, 0.05, 40);
    garageBuilt.mesh.visible = false;
    scene.add(garageBuilt.mesh);
    garageCarObjRef.current = garageBuilt;
  };

  const syncPoliceUnits = () => {
    const scene = sceneRef.current;
    if (!scene) return;
    const wanted = simRef.current.wanted;
    const targetCount = wanted > 0 ? Math.min(4, wanted + 1) : 0;

    while (policeUnitsRef.current.length < targetCount) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 68 + Math.random() * 25;
      const sx = Math.max(-210, Math.min(230, simRef.current.x + Math.cos(angle) * dist));
      const sz = Math.max(-270, Math.min(210, simRef.current.z + Math.sin(angle) * dist));

      const mesh = createPoliceCruiserMesh();
      mesh.position.set(sx, 0, sz);
      scene.add(mesh);

      policeUnitsRef.current.push({
        mesh,
        x: sx,
        z: sz,
        heading: 0,
        speed: 0
      });
    }

    while (policeUnitsRef.current.length > targetCount) {
      const unit = policeUnitsRef.current.pop();
      scene.remove(unit.mesh);
    }
  };

  useEffect(() => {
    rebuildCars(selectedCarIdx, carColor);
  }, [selectedCarIdx, carColor]);

  useEffect(() => {
    if (cameraRef.current) {
      cameraRef.current.fov = settings.fov;
      cameraRef.current.updateProjectionMatrix();
    }
    if (rendererRef.current) {
      rendererRef.current.shadowMap.enabled = settings.gfx >= 2;
      rendererRef.current.setPixelRatio(
        settings.gfx === 1 ? 1 : Math.min(window.devicePixelRatio, 2)
      );
    }
  }, [settings.fov, settings.gfx]);

  useEffect(() => {
    if (resetSignal === 0) return;
    const spec = CAR_CATALOG[propsRef.current.selectedCarIdx];
    Object.assign(simRef.current, {
      x: 0,
      y: 0,
      z: 40,
      heading: 0,
      speed: 0,
      steerAngle: 0,
      pitch: 0,
      roll: 0,
      health: spec.armor,
      maxHealth: spec.armor,
      nitro: 100,
      wanted: 0,
      wantedTimer: 0,
      dead: false
    });
    syncPoliceUnits();
    propsRef.current.onHudUpdate({
      health: spec.armor,
      maxHealth: spec.armor,
      nitro: 100,
      wanted: 0
    });
  }, [resetSignal]);

  useEffect(() => {
    if (!initialSpawn) return;
    const spec = CAR_CATALOG[propsRef.current.selectedCarIdx];
    Object.assign(simRef.current, {
      x: initialSpawn.x ?? 0,
      y: initialSpawn.y ?? 0,
      z: initialSpawn.z ?? 40,
      heading: initialSpawn.heading ?? 0,
      speed: 0,
      steerAngle: 0,
      pitch: 0,
      roll: 0,
      health: Math.max(25, initialSpawn.health ?? spec.armor),
      maxHealth: spec.armor,
      nitro: initialSpawn.nitro ?? 100,
      wanted: initialSpawn.wanted ?? 0,
      wantedTimer: initialSpawn.wanted > 0 ? 18 : 0,
      casualties: initialSpawn.casualties ?? 0,
      dead: false
    });
    syncPoliceUnits();
    propsRef.current.onHudUpdate({
      health: simRef.current.health,
      maxHealth: simRef.current.maxHealth,
      nitro: simRef.current.nitro,
      wanted: simRef.current.wanted
    });
  }, [initialSpawn]);

  useEffect(() => {
    if (repairSignal === 0) return;
    const sim = simRef.current;
    sim.health = sim.maxHealth;
    sim.nitro = 100;
    sim.speed = 0;
    if (worldRef.current && worldRef.current.getSurfaceHeightAt(sim.x, sim.z) < -1.0) {
      sim.x = 0;
      sim.y = 0;
      sim.z = 40;
    }
    propsRef.current.onHudUpdate({
      health: sim.health,
      maxHealth: sim.maxHealth,
      nitro: sim.nitro,
      wanted: sim.wanted
    });
  }, [repairSignal]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance'
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#8ED6FF');
    scene.fog = new THREE.FogExp2('#9CE0FF', 0.0016);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      propsRef.current.settings.fov,
      window.innerWidth / window.innerHeight,
      0.12,
      950
    );
    cameraRef.current = camera;

    const hemiLight = new THREE.HemisphereLight('#FFFFFF', '#7EC850', 0.95);
    hemiLight.position.set(0, 120, 0);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight('#FFFBEB', 1.25);
    sunLight.position.set(140, 220, 110);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 20;
    sunLight.shadow.camera.far = 650;
    const d = 240;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    sunLight.shadow.bias = -0.0005;
    scene.add(sunLight);

    const world = buildCityWorld(scene);
    worldRef.current = world;

    rebuildCars(propsRef.current.selectedCarIdx, propsRef.current.carColor);

    const particleGeo = new THREE.SphereGeometry(0.28, 6, 6);
    const spawnBurst = (x, y, z, colorHex, count = 12, speedScale = 6) => {
      const mat = new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 0.9 });
      for (let i = 0; i < count; i++) {
        const m = new THREE.Mesh(particleGeo, mat);
        m.position.set(x, y, z);
        scene.add(m);
        particlesRef.current.push({
          mesh: m,
          vx: (Math.random() - 0.5) * speedScale,
          vy: 1.5 + Math.random() * speedScale,
          vz: (Math.random() - 0.5) * speedScale,
          life: 0.65 + Math.random() * 0.45
        });
      }
    };

    const triggerDeath = (badge, title, reason) => {
      const sim = simRef.current;
      if (sim.dead) return;
      sim.dead = true;
      sim.speed = 0;
      soundEngine.playImpact(1.6, propsRef.current.settings.masterVol);
      spawnBurst(sim.x, sim.y + 1.0, sim.z, '#EF4444', 24, 9);
      spawnBurst(sim.x, sim.y + 1.2, sim.z, '#1E293B', 18, 6);
      setTimeout(() => {
        if (simRef.current.dead) {
          propsRef.current.onCrashDeath({ badge, title, reason });
        }
      }, 650);
    };

    const keys = { up: false, down: false, left: false, right: false, brake: false, nitro: false };
    const onKeyDown = (e) => {
      const k = e.key.toLowerCase();
      if (k === 'w' || e.key === 'ArrowUp') keys.up = true;
      if (k === 's' || e.key === 'ArrowDown') keys.down = true;
      if (k === 'a' || e.key === 'ArrowLeft') keys.left = true;
      if (k === 'd' || e.key === 'ArrowRight') keys.right = true;
      if (e.key === ' ') keys.brake = true;
      if (e.key === 'Shift') keys.nitro = true;

      if (propsRef.current.phase === 'playing') {
        if (k === 'c' || k === 'v') propsRef.current.onToggleCamera();
        if (k === 'r') {
          const sim = simRef.current;
          sim.health = sim.maxHealth;
          sim.nitro = 100;
          sim.speed = 0;
          if (world.getSurfaceHeightAt(sim.x, sim.z) < -1.0) {
            sim.x = 0;
            sim.y = 0;
            sim.z = 40;
          }
          propsRef.current.onHudUpdate({
            health: sim.health,
            maxHealth: sim.maxHealth,
            nitro: sim.nitro,
            wanted: sim.wanted
          });
          propsRef.current.onToast('Vehicle Repaired!');
        }
      }
    };

    const onKeyUp = (e) => {
      const k = e.key.toLowerCase();
      if (k === 'w' || e.key === 'ArrowUp') keys.up = false;
      if (k === 's' || e.key === 'ArrowDown') keys.down = false;
      if (k === 'a' || e.key === 'ArrowLeft') keys.left = false;
      if (k === 'd' || e.key === 'ArrowRight') keys.right = false;
      if (e.key === ' ') keys.brake = false;
      if (e.key === 'Shift') keys.nitro = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', onResize);

    const clock = new THREE.Clock();
    let lastDashUpdate = 0;
    let lastHudSync = 0;
    let rafId = 0;

    const animate = () => {
      rafId = requestAnimationFrame(animate);
      const dt = Math.min(0.05, clock.getDelta());
      const elapsed = clock.getElapsedTime();
      const { phase: curPhase, selectedCarIdx: curCarIdx, cameraMode: curCam, settings: curSettings } =
        propsRef.current;

      // Water & Repair Pad Animation
      world.waterMat.emissiveIntensity = 0.2 + Math.sin(elapsed * 2.4) * 0.08;
      world.canalWaterMesh.position.y = -1.65 + Math.sin(elapsed * 2.0) * 0.05;
      world.harborMesh.position.y = -1.65 + Math.cos(elapsed * 1.8) * 0.05;
      world.repairPads.forEach((pad) => {
        pad.mesh.rotation.z = elapsed * 1.4;
      });

      // Update Burst Particles
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const pt = particlesRef.current[i];
        pt.life -= dt;
        pt.mesh.position.x += pt.vx * dt;
        pt.mesh.position.y += pt.vy * dt;
        pt.mesh.position.z += pt.vz * dt;
        pt.vy -= 12 * dt;
        pt.mesh.material.opacity = Math.max(0, pt.life);
        if (pt.life <= 0) {
          scene.remove(pt.mesh);
          particlesRef.current.splice(i, 1);
        }
      }

      const playerObj = playerCarObjRef.current;
      const garageObj = garageCarObjRef.current;

      if (curPhase === 'garage') {
        if (playerObj) playerObj.mesh.visible = false;
        if (garageObj) {
          garageObj.mesh.visible = true;
          garageObj.mesh.rotation.y = elapsed * 0.65;
        }
        camera.position.set(4.6, 2.2, 44.6);
        camera.lookAt(0, 0.85, 40);
        soundEngine.update(0, false, 0, elapsed, curSettings, false);
      } else if (curPhase === 'playing' || curPhase === 'wasted') {
        if (garageObj) garageObj.mesh.visible = false;
        if (playerObj) playerObj.mesh.visible = true;

        const sim = simRef.current;
        const spec = CAR_CATALOG[curCarIdx];
        const touch = touchControlsRef.current;

        const gasPressed = keys.up || touch.up;
        const brakePressed = keys.down || touch.down;
        const leftPressed = keys.left || touch.left;
        const rightPressed = keys.right || touch.right;
        const nitroPressed = (keys.nitro || touch.nitro) && gasPressed && sim.nitro > 1 && !sim.dead;

        if (!sim.dead) {
          if (nitroPressed) {
            sim.nitro = Math.max(0, sim.nitro - 26 * dt);
          } else {
            sim.nitro = Math.min(100, sim.nitro + 9 * dt);
          }

          const forwardInput = (gasPressed ? 1 : 0) - (brakePressed ? 1 : 0);
          const accelMult = nitroPressed ? 1.55 : 1.0;
          let targetPitch = 0;

          if (forwardInput > 0) {
            sim.speed += spec.accel * accelMult * dt;
            targetPitch = nitroPressed ? 0.036 : 0.022;
          } else if (forwardInput < 0) {
            if (sim.speed > 1.5) {
              sim.speed -= spec.accel * 1.9 * dt;
              targetPitch = -0.035;
            } else {
              sim.speed -= spec.accel * 0.65 * dt;
            }
          } else {
            sim.speed *= Math.pow(0.38, dt);
            if (Math.abs(sim.speed) < 0.15) sim.speed = 0;
          }

          if (keys.brake) {
            sim.speed *= Math.pow(0.06, dt);
            targetPitch = -0.04;
          }

          const maxUnits = spec.maxSpeed * 0.36 * (nitroPressed ? 1.24 : 1.0);
          sim.speed = Math.max(-maxUnits * 0.42, Math.min(maxUnits, sim.speed));

          const steerInput = (leftPressed ? 1 : 0) - (rightPressed ? 1 : 0);
          const maxSteer = 0.52 * curSettings.steerSens;
          const targetSteer = steerInput * maxSteer;
          sim.steerAngle += (targetSteer - sim.steerAngle) * Math.min(1, dt * 10);

          const speedFactor = Math.min(1, Math.abs(sim.speed) / 14);
          const reverseSign = sim.speed >= -0.1 ? 1 : -1;
          sim.heading += sim.steerAngle * spec.handling * speedFactor * reverseSign * dt;

          const targetRoll = -sim.steerAngle * speedFactor * 0.085;
          sim.pitch += (targetPitch - sim.pitch) * Math.min(1, dt * 8);
          sim.roll += (targetRoll - sim.roll) * Math.min(1, dt * 8);

          const vx = -Math.sin(sim.heading) * sim.speed;
          const vz = -Math.cos(sim.heading) * sim.speed;
          const clampedX = Math.max(-245, Math.min(295, sim.x + vx * dt));
          const clampedZ = Math.max(-295, Math.min(225, sim.z + vz * dt));

          let collided = false;
          const carRadius = 1.45;
          for (let i = 0; i < world.colliders.length; i++) {
            const c = world.colliders[i];
            if (
              clampedX + carRadius > c.minX &&
              clampedX - carRadius < c.maxX &&
              clampedZ + carRadius > c.minZ &&
              clampedZ - carRadius < c.maxZ
            ) {
              collided = true;
              break;
            }
          }

          if (collided) {
            const impactSpeed = Math.abs(sim.speed);
            if (impactSpeed > 12) {
              const dmg = Math.round((impactSpeed - 10) * 1.15);
              sim.health = Math.max(0, sim.health - dmg);
              soundEngine.playImpact(Math.min(1.5, impactSpeed / 32), curSettings.masterVol);
              spawnBurst(sim.x, sim.y + 0.8, sim.z, '#FACC15', 10, 6);
              propsRef.current.onHudUpdate({
                health: sim.health,
                maxHealth: sim.maxHealth,
                nitro: sim.nitro,
                wanted: sim.wanted
              });
              if (sim.health <= 0) {
                triggerDeath(
                  'Fatal Collision',
                  'WRECKED!',
                  'High-speed structural impact destroyed your vehicle.'
                );
              }
            }
            sim.speed = -sim.speed * 0.35;
          } else {
            sim.x = clampedX;
            sim.z = clampedZ;
          }

          // Check Repair Pit-Stop Pads
          for (let i = 0; i < world.repairPads.length; i++) {
            const pad = world.repairPads[i];
            if (Math.hypot(sim.x - pad.x, sim.z - pad.z) < 3.6 && sim.health < sim.maxHealth) {
              sim.health = sim.maxHealth;
              sim.nitro = 100;
              spawnBurst(sim.x, sim.y + 0.6, sim.z, '#22C55E', 14, 5);
              propsRef.current.onToast('Pit Stop: Hull & Nitro Restored!');
            }
          }

          const groundY = world.getSurfaceHeightAt(sim.x, sim.z);
          sim.y += (groundY - sim.y) * Math.min(1, dt * 14);

          if (groundY < -1.2) {
            spawnBurst(sim.x, 0.2, sim.z, '#38BDF8', 22, 7);
            sim.health = 0;
            propsRef.current.onHudUpdate({
              health: 0,
              maxHealth: sim.maxHealth,
              nitro: sim.nitro,
              wanted: sim.wanted
            });
            triggerDeath(
              'Submerged in Water',
              'DROWNED!',
              'Your engine flooded after plunging into deep water.'
            );
          }
        }

        playerSnapshotRef.current = {
          x: sim.x,
          y: sim.y,
          z: sim.z,
          heading: sim.heading,
          health: sim.health,
          nitro: sim.nitro,
          wanted: sim.wanted,
          casualties: sim.casualties
        };

        if (playerObj) {
          playerObj.mesh.position.set(sim.x, sim.y, sim.z);
          playerObj.mesh.rotation.set(sim.pitch, sim.heading, sim.roll, 'YXZ');

          sim.wheelSpin -= sim.speed * dt * 2.4;
          playerObj.refs.wheels.forEach((w) => {
            if (w.isFront) w.pivot.rotation.y = sim.steerAngle * 0.7;
            w.spin.rotation.x = sim.wheelSpin;
          });

          if (playerObj.refs.steeringWheel) {
            playerObj.refs.steeringWheel.rotation.z = sim.steerAngle * 3.2;
          }

          const speedKmh = Math.abs(sim.speed) * 2.8;
          const gearIdx =
            sim.speed < -0.5
              ? 'R'
              : speedKmh < 3
              ? 'N'
              : String(Math.min(6, Math.floor(speedKmh / 30) + 1));

          if (playerObj.refs.gearStick) {
            playerObj.refs.gearStick.rotation.x =
              sim.speed < -0.5 ? 0.28 : speedKmh > 3 ? -0.22 : 0;
          }

          const braking = brakePressed || keys.brake;
          playerObj.refs.brakeLights.forEach((bl) => {
            bl.material.emissiveIntensity = braking ? 2.4 : 0.5;
          });

          playerObj.refs.nitroFlames.forEach((fl) => {
            fl.visible = nitroPressed;
            if (nitroPressed) {
              fl.scale.set(1, 0.8 + Math.random() * 0.5, 1);
            }
          });

          if (elapsed - lastDashUpdate > 0.05) {
            lastDashUpdate = elapsed;
            const healthPct = (sim.health / sim.maxHealth) * 100;
            drawDashboardDisplay(
              playerObj.refs.dashCtx,
              playerObj.refs.dashTexture,
              speedKmh,
              gearIdx,
              healthPct,
              sim.wanted,
              sim.nitro
            );
          }
        }

        if (elapsed - lastHudSync > 0.12) {
          lastHudSync = elapsed;
          propsRef.current.onHudUpdate({
            health: sim.health,
            maxHealth: sim.maxHealth,
            nitro: sim.nitro,
            wanted: sim.wanted
          });
        }

        // Pedestrians & Wanted Star Trigger
        for (let i = 0; i < world.pedestrians.length; i++) {
          const ped = world.pedestrians[i];
          if (!ped.alive) {
            ped.respawnTimer -= dt;
            ped.mesh.position.x += ped.vx * dt;
            ped.mesh.position.y = Math.max(0.2, ped.mesh.position.y + ped.vy * dt);
            ped.vy -= 18 * dt;
            ped.mesh.position.z += ped.vz * dt;
            ped.mesh.rotation.x = Math.PI / 2;
            if (ped.respawnTimer <= 0) {
              ped.alive = true;
              ped.mesh.rotation.set(0, 0, 0);
              ped.mesh.position.y = 0;
            }
            continue;
          }

          ped.progress += (ped.dir * ped.speed * dt) / 140;
          if (ped.progress > 1) {
            ped.progress = 1;
            ped.dir = -1;
          }
          if (ped.progress < 0) {
            ped.progress = 0;
            ped.dir = 1;
          }

          const nx = ped.route.x1 + (ped.route.x2 - ped.route.x1) * ped.progress;
          const nz = ped.route.z1 + (ped.route.z2 - ped.route.z1) * ped.progress;
          const dx = nx - ped.mesh.position.x;
          const dz = nz - ped.mesh.position.z;

          ped.mesh.position.set(nx, 0, nz);
          if (Math.hypot(dx, dz) > 0.001) {
            ped.mesh.rotation.y = Math.atan2(dx, dz);
          }

          ped.walkCycle += dt * ped.speed * 4.2;
          const swing = Math.sin(ped.walkCycle) * 0.55;
          ped.mesh.userData.leftLeg.rotation.x = swing;
          ped.mesh.userData.rightLeg.rotation.x = -swing;
          ped.mesh.userData.leftArm.rotation.x = -swing * 0.8;
          ped.mesh.userData.rightArm.rotation.x = swing * 0.8;

          const distToCar = Math.hypot(nx - sim.x, nz - sim.z);
          if (!sim.dead && distToCar < 1.85 && Math.abs(sim.speed) > 3.5) {
            ped.alive = false;
            ped.respawnTimer = 10;
            ped.vx = -Math.sin(sim.heading) * Math.abs(sim.speed) * 0.7;
            ped.vy = 6.5;
            ped.vz = -Math.cos(sim.heading) * Math.abs(sim.speed) * 0.7;

            sim.casualties += 1;
            sim.wanted = Math.min(5, Math.max(1, sim.wanted + 1));
            sim.wantedTimer = 22;

            soundEngine.playImpact(0.75, curSettings.masterVol);
            spawnBurst(nx, 1.0, nz, '#EF4444', 14, 5);
            syncPoliceUnits();
            propsRef.current.onHudUpdate({
              health: sim.health,
              maxHealth: sim.maxHealth,
              nitro: sim.nitro,
              wanted: sim.wanted
            });
            propsRef.current.onToast(`Pedestrian Hit! Wanted Level ${sim.wanted} ★`);
          }
        }

        // Police Pursuit AI
        let closestCopDist = 999;
        for (let i = 0; i < policeUnitsRef.current.length; i++) {
          const cop = policeUnitsRef.current[i];
          const toPlayerX = sim.x - cop.x;
          const toPlayerZ = sim.z - cop.z;
          const dist = Math.hypot(toPlayerX, toPlayerZ);
          if (dist < closestCopDist) closestCopDist = dist;

          const desiredHeading = Math.atan2(-toPlayerX, -toPlayerZ);
          let diff = desiredHeading - cop.heading;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          cop.heading += Math.max(-2.6 * dt, Math.min(2.6 * dt, diff));

          const copMaxSpeed = 42 + sim.wanted * 3.5;
          cop.speed += (copMaxSpeed - cop.speed) * Math.min(1, dt * 2.5);

          cop.x += -Math.sin(cop.heading) * cop.speed * dt;
          cop.z += -Math.cos(cop.heading) * cop.speed * dt;
          const copY = Math.max(0, world.getSurfaceHeightAt(cop.x, cop.z));

          cop.mesh.position.set(cop.x, copY, cop.z);
          cop.mesh.rotation.y = cop.heading;

          const flash = Math.sin(elapsed * 16 + i) > 0;
          cop.mesh.userData.redLight.material.color.setHex(flash ? 0xef4444 : 0x450a0a);
          cop.mesh.userData.blueLight.material.color.setHex(!flash ? 0x3b82f6 : 0x172554);

          if (!sim.dead && dist < 2.65) {
            sim.health = Math.max(0, sim.health - 22 * dt);
            if (Math.random() < 0.15) {
              soundEngine.playImpact(0.6, curSettings.masterVol);
              spawnBurst((sim.x + cop.x) * 0.5, 0.9, (sim.z + cop.z) * 0.5, '#38BDF8', 5, 4);
            }
            if (sim.health <= 0) {
              triggerDeath(
                'Pursuit Immobilized',
                'BUSTED & WRECKED!',
                'Police cruisers rammed and disabled your vehicle.'
              );
            }
          }
        }

        if (sim.wanted > 0 && !sim.dead) {
          if (closestCopDist > 95) {
            sim.wantedTimer -= dt;
            if (sim.wantedTimer <= 0) {
              sim.wanted = 0;
              syncPoliceUnits();
              propsRef.current.onToast('Escaped the Police!');
            }
          } else {
            sim.wantedTimer = 16;
          }
        }

        // Camera Positioning (Cockpit POV with visible Interior & In-Dash Speedometer)
        const sinH = Math.sin(sim.heading);
        const cosH = Math.cos(sim.heading);

        if (curCam === 'cockpit') {
          const localX = -0.44;
          const localY = 1.25;
          const localZ = 0.16;
          const worldCamX = sim.x + localX * cosH + localZ * sinH;
          const worldCamZ = sim.z - localX * sinH + localZ * cosH;
          camera.position.set(worldCamX, sim.y + localY, worldCamZ);

          const lookDist = 14;
          camera.lookAt(worldCamX - sinH * lookDist, sim.y + 0.58, worldCamZ - cosH * lookDist);
        } else if (curCam === 'hood') {
          const worldCamX = sim.x - sinH * 0.4;
          const worldCamZ = sim.z - cosH * 0.4;
          camera.position.set(worldCamX, sim.y + 1.38, worldCamZ);
          camera.lookAt(sim.x - sinH * 18, sim.y + 1.0, sim.z - cosH * 18);
        } else {
          const chaseDist = 7.2 + Math.min(2.2, Math.abs(sim.speed) * 0.04);
          const targetCamX = sim.x + sinH * chaseDist;
          const targetCamZ = sim.z + cosH * chaseDist;
          const targetCamY = sim.y + 3.1;
          camera.position.lerp(new THREE.Vector3(targetCamX, targetCamY, targetCamZ), Math.min(1, dt * 9));
          camera.lookAt(sim.x - sinH * 8, sim.y + 1.1, sim.z - cosH * 8);
        }

        soundEngine.update(
          Math.abs(sim.speed) * 2.8,
          !sim.dead,
          sim.wanted,
          elapsed,
          curSettings,
          nitroPressed
        );
      } else {
        const orbitAngle = elapsed * 0.14;
        camera.position.set(Math.sin(orbitAngle) * 65, 24, 40 + Math.cos(orbitAngle) * 65);
        camera.lookAt(0, 4, -20);
        soundEngine.update(0, false, 0, elapsed, curSettings, false);
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
    };
  }, [soundEngine]);

  return <canvas ref={canvasRef} id="game-canvas" />;
}
