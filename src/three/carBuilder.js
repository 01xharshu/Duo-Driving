import * as THREE from 'three';

export function drawDashboardDisplay(dashCtx, dashTexture, speedKmh, gearLabel, healthPct, wantedStars, nitroPct = 100) {
  if (!dashCtx || !dashTexture) return;

  dashCtx.fillStyle = '#0F172A';
  dashCtx.fillRect(0, 0, 512, 256);

  // Outer neon bezel
  dashCtx.strokeStyle = wantedStars > 0 ? '#EF4444' : '#38BDF8';
  dashCtx.lineWidth = 8;
  dashCtx.strokeRect(8, 8, 496, 240);

  // Analog Arc Tachometer on Left
  const cx = 135;
  const cy = 138;
  const r = 84;
  dashCtx.beginPath();
  dashCtx.arc(cx, cy, r, Math.PI * 0.78, Math.PI * 2.22);
  dashCtx.strokeStyle = '#334155';
  dashCtx.lineWidth = 16;
  dashCtx.stroke();

  const rpmFrac = Math.min(1, (speedKmh % 48) / 48 + (speedKmh > 10 ? 0.25 : 0.08));
  dashCtx.beginPath();
  dashCtx.arc(cx, cy, r, Math.PI * 0.78, Math.PI * (0.78 + 1.44 * rpmFrac));
  dashCtx.strokeStyle = rpmFrac > 0.82 ? '#EF4444' : '#22C55E';
  dashCtx.lineWidth = 16;
  dashCtx.stroke();

  dashCtx.fillStyle = '#94A3B8';
  dashCtx.font = 'bold 18px sans-serif';
  dashCtx.textAlign = 'center';
  dashCtx.fillText('RPM', cx, cy + 44);

  // Gear Indicator
  dashCtx.fillStyle = '#FACC15';
  dashCtx.font = '900 44px sans-serif';
  dashCtx.fillText(gearLabel, cx, cy + 12);

  // Digital Speedometer
  dashCtx.fillStyle = '#FFFFFF';
  dashCtx.font = '900 84px sans-serif';
  dashCtx.textAlign = 'center';
  dashCtx.fillText(String(Math.round(speedKmh)), 340, 134);

  dashCtx.fillStyle = '#38BDF8';
  dashCtx.font = '800 22px sans-serif';
  dashCtx.fillText('KM/H', 340, 166);

  // Hull, Nitro & Wanted status
  dashCtx.fillStyle = healthPct > 40 ? '#4ADE80' : '#F87171';
  dashCtx.font = 'bold 19px sans-serif';
  dashCtx.textAlign = 'left';
  dashCtx.fillText('HULL ' + Math.round(healthPct) + '%', 242, 214);

  if (wantedStars > 0) {
    dashCtx.fillStyle = '#EF4444';
    dashCtx.textAlign = 'right';
    dashCtx.fillText('★'.repeat(wantedStars), 484, 214);
  } else {
    dashCtx.fillStyle = '#38BDF8';
    dashCtx.textAlign = 'right';
    dashCtx.fillText('N2O ' + Math.round(nitroPct) + '%', 484, 214);
  }

  dashTexture.needsUpdate = true;
}

export function buildRealisticCar(carSpec, paintHex, withLiveDashboard = true) {
  const car = new THREE.Group();

  const paintMat = new THREE.MeshStandardMaterial({
    color: paintHex,
    metalness: 0.42,
    roughness: 0.24
  });
  const darkTrimMat = new THREE.MeshStandardMaterial({ color: '#1E293B', roughness: 0.65, metalness: 0.2 });
  const chromeMat = new THREE.MeshStandardMaterial({ color: '#E2E8F0', metalness: 0.85, roughness: 0.15 });
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: '#BAE6FD',
    transparent: true,
    opacity: 0.28,
    roughness: 0.08,
    metalness: 0.1,
    side: THREE.DoubleSide
  });
  const interiorLeatherMat = new THREE.MeshStandardMaterial({ color: '#1E293B', roughness: 0.78 });
  const interiorAccentMat = new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.6 });

  const isHyper = carSpec.bodyStyle === 'hyper';
  const isMuscle = carSpec.bodyStyle === 'muscle';
  const isRoadster = carSpec.bodyStyle === 'roadster';

  const bodyW = isHyper ? 2.12 : 2.04;
  const bodyL = isMuscle ? 4.75 : 4.55;
  const hoodH = isHyper ? 0.56 : 0.66;

  // Chassis
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(bodyW - 0.12, 0.32, bodyL - 0.2), darkTrimMat);
  chassis.position.y = 0.34;
  chassis.castShadow = true;
  car.add(chassis);

  // Front Hood & Fenders
  const frontBody = new THREE.Mesh(new THREE.BoxGeometry(bodyW, hoodH, 1.55), paintMat);
  frontBody.position.set(0, 0.38 + hoodH / 2, -1.42);
  frontBody.castShadow = true;
  frontBody.receiveShadow = true;
  car.add(frontBody);

  if (isMuscle || isHyper) {
    const scoop = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.12, 0.9), darkTrimMat);
    scoop.position.set(0, 0.38 + hoodH + 0.05, -1.35);
    car.add(scoop);
  }

  // Side Doors, Skirts & Rear-View Mirrors
  [-1, 1].forEach((side) => {
    const doorPanel = new THREE.Mesh(new THREE.BoxGeometry(0.16, hoodH + 0.04, 1.85), paintMat);
    doorPanel.position.set(side * (bodyW / 2 - 0.08), 0.38 + hoodH / 2, 0.25);
    doorPanel.castShadow = true;
    car.add(doorPanel);

    const skirt = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 2.7), darkTrimMat);
    skirt.position.set(side * (bodyW / 2 + 0.01), 0.3, 0.1);
    car.add(skirt);

    const mirrorArm = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.08, 0.12), paintMat);
    mirrorArm.position.set(side * (bodyW / 2 + 0.11), 0.38 + hoodH + 0.12, -0.58);
    car.add(mirrorArm);

    const mirrorGlass = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.11), chromeMat);
    mirrorGlass.position.set(side * (bodyW / 2 + 0.14), 0.38 + hoodH + 0.12, -0.51);
    car.add(mirrorGlass);
  });

  // Rear Trunk
  const rearDeck = new THREE.Mesh(new THREE.BoxGeometry(bodyW, hoodH + 0.06, 1.15), paintMat);
  rearDeck.position.set(0, 0.38 + (hoodH + 0.06) / 2, 1.72);
  rearDeck.castShadow = true;
  car.add(rearDeck);

  // Rear Spoiler Wing
  if (!isRoadster) {
    const wingY = 0.38 + hoodH + 0.28;
    const wingBlade = new THREE.Mesh(new THREE.BoxGeometry(bodyW - 0.12, 0.07, 0.28), darkTrimMat);
    wingBlade.position.set(0, wingY, 2.12);
    wingBlade.castShadow = true;
    car.add(wingBlade);

    [-0.65, 0.65].forEach((wx) => {
      const strut = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.24, 0.16), darkTrimMat);
      strut.position.set(wx, wingY - 0.12, 2.12);
      car.add(strut);
    });
  }

  // Grille, Splitter, Headlights & Taillights
  const grille = new THREE.Mesh(new THREE.BoxGeometry(bodyW * 0.62, 0.26, 0.08), darkTrimMat);
  grille.position.set(0, 0.56, -bodyL / 2 + 0.04);
  car.add(grille);

  const splitter = new THREE.Mesh(new THREE.BoxGeometry(bodyW + 0.08, 0.08, 0.25), darkTrimMat);
  splitter.position.set(0, 0.32, -bodyL / 2 + 0.04);
  car.add(splitter);

  const headlightMat = new THREE.MeshStandardMaterial({
    color: '#FFFFFF',
    emissive: '#FEF08A',
    emissiveIntensity: 1.4
  });
  const brakeLightMat = new THREE.MeshStandardMaterial({
    color: '#EF4444',
    emissive: '#DC2626',
    emissiveIntensity: 0.6
  });

  const brakeLights = [];
  [-0.72, 0.72].forEach((lx) => {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.14, 0.08), headlightMat);
    hl.position.set(lx, 0.74, -bodyL / 2 + 0.05);
    car.add(hl);

    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.15, 0.08), brakeLightMat.clone());
    tl.position.set(lx, 0.78, bodyL / 2 - 0.02);
    car.add(tl);
    brakeLights.push(tl);
  });

  // Exhaust Pipes & Nitro Flames
  const nitroFlames = [];
  const flameMat = new THREE.MeshBasicMaterial({
    color: '#38BDF8',
    transparent: true,
    opacity: 0.9
  });
  [-0.55, 0.55].forEach((ex) => {
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.22, 12), chromeMat);
    pipe.rotation.x = Math.PI / 2;
    pipe.position.set(ex, 0.36, bodyL / 2 + 0.02);
    car.add(pipe);

    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.55, 10), flameMat);
    flame.rotation.x = Math.PI / 2;
    flame.position.set(ex, 0.36, bodyL / 2 + 0.38);
    flame.visible = false;
    car.add(flame);
    nitroFlames.push(flame);
  });

  // Cabin Pillars, Windshield & Roof
  const cabinBaseY = 0.38 + hoodH;
  const cabinH = isHyper ? 0.48 : 0.56;

  [-1, 1].forEach((side) => {
    const aPillar = new THREE.Mesh(new THREE.BoxGeometry(0.07, cabinH + 0.06, 0.08), paintMat);
    aPillar.position.set(side * (bodyW / 2 - 0.14), cabinBaseY + cabinH / 2 - 0.02, -0.52);
    aPillar.rotation.x = -0.46;
    car.add(aPillar);
  });

  const windshield = new THREE.Mesh(new THREE.PlaneGeometry(bodyW - 0.28, cabinH + 0.08), glassMat);
  windshield.position.set(0, cabinBaseY + cabinH / 2 - 0.02, -0.52);
  windshield.rotation.x = -0.46;
  car.add(windshield);

  [-0.35, 0.28].forEach((wx) => {
    const wiper = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.025, 0.03), darkTrimMat);
    wiper.position.set(wx, cabinBaseY + 0.05, -0.72);
    wiper.rotation.y = 0.18;
    car.add(wiper);
  });

  if (!isRoadster) {
    const roof = new THREE.Mesh(new THREE.BoxGeometry(bodyW - 0.26, 0.07, 1.35), paintMat);
    roof.position.set(0, cabinBaseY + cabinH, 0.36);
    roof.castShadow = true;
    car.add(roof);

    [-1, 1].forEach((side) => {
      const cPillar = new THREE.Mesh(new THREE.BoxGeometry(0.09, cabinH + 0.04, 0.12), paintMat);
      cPillar.position.set(side * (bodyW / 2 - 0.15), cabinBaseY + cabinH / 2, 1.05);
      cPillar.rotation.x = 0.38;
      car.add(cPillar);
    });
  }

  // Detailed Cockpit Interior
  const interiorGroup = new THREE.Group();
  car.add(interiorGroup);

  const cabinFloor = new THREE.Mesh(new THREE.BoxGeometry(bodyW - 0.32, 0.08, 1.85), interiorLeatherMat);
  cabinFloor.position.set(0, 0.44, 0.22);
  interiorGroup.add(cabinFloor);

  [-0.44, 0.44].forEach((sx) => {
    const seatBase = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.14, 0.52), interiorLeatherMat);
    seatBase.position.set(sx, 0.54, 0.22);
    const seatBack = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.68, 0.14), interiorAccentMat);
    seatBack.position.set(sx, 0.88, 0.46);
    seatBack.rotation.x = -0.15;
    const headrest = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.18, 0.12), interiorLeatherMat);
    headrest.position.set(sx, 1.28, 0.51);
    interiorGroup.add(seatBase, seatBack, headrest);
  });

  // Center Console & Gear Shifter
  const consoleBox = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.28, 1.35), interiorAccentMat);
  consoleBox.position.set(0, 0.58, 0.05);
  interiorGroup.add(consoleBox);

  const gearStick = new THREE.Group();
  gearStick.position.set(0, 0.72, -0.12);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.16, 8), chromeMat);
  shaft.position.y = 0.08;
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.042, 10, 10), paintMat);
  knob.position.y = 0.17;
  gearStick.add(shaft, knob);
  interiorGroup.add(gearStick);

  // Dashboard & Instrument Cluster
  const dashY = cabinBaseY - 0.06;
  const dashMain = new THREE.Mesh(new THREE.BoxGeometry(bodyW - 0.26, 0.28, 0.48), interiorLeatherMat);
  dashMain.position.set(0, dashY, -0.52);
  interiorGroup.add(dashMain);

  const centerScreen = new THREE.Mesh(
    new THREE.BoxGeometry(0.32, 0.18, 0.03),
    new THREE.MeshBasicMaterial({ color: '#0284C7' })
  );
  centerScreen.position.set(0.02, dashY + 0.12, -0.3);
  centerScreen.rotation.x = -0.22;
  interiorGroup.add(centerScreen);

  const clusterHood = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.22, 0.24), interiorAccentMat);
  clusterHood.position.set(-0.44, dashY + 0.14, -0.38);
  interiorGroup.add(clusterHood);

  const dashCanvas = document.createElement('canvas');
  dashCanvas.width = 512;
  dashCanvas.height = 256;
  const dashCtx = dashCanvas.getContext('2d');
  const dashTexture = new THREE.CanvasTexture(dashCanvas);

  const speedoScreen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.46, 0.2),
    new THREE.MeshBasicMaterial({ map: dashTexture })
  );
  speedoScreen.position.set(-0.44, dashY + 0.15, -0.255);
  speedoScreen.rotation.x = -0.16;
  interiorGroup.add(speedoScreen);

  if (withLiveDashboard) {
    drawDashboardDisplay(dashCtx, dashTexture, 0, 'N', 100, 0, 100);
  }

  // Steering Wheel (lowered so in-dash speedometer is completely unobstructed)
  const steeringWheel = new THREE.Group();
  steeringWheel.position.set(-0.44, dashY + 0.01, -0.14);
  steeringWheel.rotation.x = -0.35;

  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.165, 0.022, 10, 28), darkTrimMat);
  const topMarker = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.048, 0.048), paintMat);
  topMarker.position.set(0, 0.165, 0);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.04, 14), interiorAccentMat);
  hub.rotation.x = Math.PI / 2;
  const spokeL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.026, 0.02), chromeMat);
  spokeL.position.set(-0.08, -0.01, 0);
  const spokeR = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.026, 0.02), chromeMat);
  spokeR.position.set(0.08, -0.01, 0);

  steeringWheel.add(rim, topMarker, hub, spokeL, spokeR);
  interiorGroup.add(steeringWheel);

  // Rear-View Mirror
  const cabinMirror = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.07, 0.04), darkTrimMat);
  cabinMirror.position.set(0, cabinBaseY + cabinH - 0.11, -0.34);
  interiorGroup.add(cabinMirror);

  // 4 Alloy Wheels with Brake Calipers
  const wheelPositions = [
    [-bodyW / 2 + 0.04, 0.38, -1.35],
    [bodyW / 2 - 0.04, 0.38, -1.35],
    [-bodyW / 2 + 0.04, 0.38, 1.35],
    [bodyW / 2 - 0.04, 0.38, 1.35]
  ];
  const tireMat = new THREE.MeshStandardMaterial({ color: '#111827', roughness: 0.85 });
  const caliperMat = new THREE.MeshStandardMaterial({ color: '#EF4444', roughness: 0.4 });
  const wheels = [];

  wheelPositions.forEach(([wx, wy, wz], idx) => {
    const wheelPivot = new THREE.Group();
    wheelPivot.position.set(wx, wy, wz);

    const wheelSpinGroup = new THREE.Group();
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.28, 22), tireMat);
    tire.rotation.z = Math.PI / 2;
    tire.castShadow = true;
    wheelSpinGroup.add(tire);

    const rimDisk = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.29, 16), chromeMat);
    rimDisk.rotation.z = Math.PI / 2;
    wheelSpinGroup.add(rimDisk);

    for (let s = 0; s < 5; s++) {
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.04, 0.44), darkTrimMat);
      spoke.rotation.x = (s * Math.PI) / 5;
      wheelSpinGroup.add(spoke);
    }

    const caliper = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.14, 0.14), caliperMat);
    caliper.position.set(wx < 0 ? 0.04 : -0.04, 0.14, 0.12);
    wheelPivot.add(caliper);

    wheelPivot.add(wheelSpinGroup);
    car.add(wheelPivot);
    wheels.push({ pivot: wheelPivot, spin: wheelSpinGroup, isFront: idx < 2 });
  });

  return {
    mesh: car,
    refs: {
      steeringWheel,
      gearStick,
      dashCtx,
      dashTexture,
      wheels,
      brakeLights,
      nitroFlames
    }
  };
}

export function createPoliceCruiserMesh() {
  const cop = new THREE.Group();
  const blackMat = new THREE.MeshStandardMaterial({ color: '#0F172A', roughness: 0.3, metalness: 0.4 });
  const whiteMat = new THREE.MeshStandardMaterial({ color: '#FFFFFF', roughness: 0.3 });
  const glassMat = new THREE.MeshStandardMaterial({ color: '#38BDF8', roughness: 0.2, metalness: 0.5 });

  const lower = new THREE.Mesh(new THREE.BoxGeometry(2.04, 0.65, 4.55), blackMat);
  lower.position.y = 0.68;
  lower.castShadow = true;
  cop.add(lower);

  const doorStripe = new THREE.Mesh(new THREE.BoxGeometry(2.08, 0.62, 1.9), whiteMat);
  doorStripe.position.set(0, 0.68, 0.1);
  cop.add(doorStripe);

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.76, 0.54, 2.0), whiteMat);
  cabin.position.set(0, 1.24, 0.22);
  cabin.castShadow = true;
  cop.add(cabin);

  const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.66, 0.44, 2.04), glassMat);
  windshield.position.set(0, 1.23, 0.22);
  cop.add(windshield);

  const redLight = new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 0.16, 0.26),
    new THREE.MeshBasicMaterial({ color: '#EF4444' })
  );
  redLight.position.set(-0.32, 1.58, 0.2);

  const blueLight = new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 0.16, 0.26),
    new THREE.MeshBasicMaterial({ color: '#3B82F6' })
  );
  blueLight.position.set(0.32, 1.58, 0.2);

  cop.add(redLight, blueLight);

  const tireMat = new THREE.MeshStandardMaterial({ color: '#111827', roughness: 0.85 });
  [
    [-0.98, 0.38, -1.35],
    [0.98, 0.38, -1.35],
    [-0.98, 0.38, 1.35],
    [0.98, 0.38, 1.35]
  ].forEach(([wx, wy, wz]) => {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.28, 16), tireMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(wx, wy, wz);
    cop.add(w);
  });

  cop.userData = { redLight, blueLight };
  return cop;
}
