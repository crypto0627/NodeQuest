import * as THREE from 'three';

export function createCyberpunkBackground(scene: THREE.Scene, END_Z: number) {
  // 1. 霓虹漸層背景
  const bgGeo = new THREE.PlaneGeometry(120, 320);
  const bgCanvas = document.createElement('canvas');
  bgCanvas.width = 32; bgCanvas.height = 512;
  const bgCtx = bgCanvas.getContext('2d')!;
  const grad = bgCtx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, '#2a1a4d'); // 深紫
  grad.addColorStop(0.25, '#1a2a4d'); // 藍
  grad.addColorStop(0.5, '#1ad1ff'); // 青
  grad.addColorStop(0.7, '#ff4de6'); // 粉
  grad.addColorStop(1, '#0a0a1a'); // 黑
  bgCtx.fillStyle = grad;
  bgCtx.fillRect(0, 0, 32, 512);
  const bgTex = new THREE.CanvasTexture(bgCanvas);
  const bgMat = new THREE.MeshBasicMaterial({ map: bgTex, depthWrite: false });
  const bgMesh = new THREE.Mesh(bgGeo, bgMat);
  bgMesh.position.set(0, 50, -90);
  scene.add(bgMesh);

  // 2. 多層動態霓虹光條
  const neonStripes: THREE.Mesh[] = [];
  const neonStripeColors = ['#00fff7', '#ff00e6', '#ffe066', '#00ff99', '#ff4de6', '#1ad1ff', '#39ff14', '#ff2222'];
  for (let i = 0; i < 12; i++) {
    const stripeGeo = new THREE.PlaneGeometry(60 + Math.random()*20, 1.2 + Math.random() * 1.2);
    const color = neonStripeColors[i % neonStripeColors.length];
    const stripeMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.13 + Math.random() * 0.18 });
    const stripe = new THREE.Mesh(stripeGeo, stripeMat);
    stripe.position.set(0, 16 + i * 7 + Math.random()*6, -89 + i * 0.3);
    stripe.rotation.z = (i % 2 === 0 ? 1 : -1) * (Math.PI / 16 + Math.random() * 0.2);
    scene.add(stripe);
    neonStripes.push(stripe);
  }

  // 3. 動態粒子亮點+流星
  const neonParticleGeo = new THREE.BufferGeometry();
  const neonParticleCount = 120;
  const neonParticlePositions = new Float32Array(neonParticleCount * 3);
  for (let i = 0; i < neonParticleCount; i++) {
    neonParticlePositions[i * 3] = (Math.random() - 0.5) * 120;
    neonParticlePositions[i * 3 + 1] = Math.random() * 100 + 10;
    neonParticlePositions[i * 3 + 2] = -80 + Math.random() * 80;
  }
  neonParticleGeo.setAttribute('position', new THREE.BufferAttribute(neonParticlePositions, 3));
  const neonParticleMat = new THREE.PointsMaterial({ color: 0xffe066, size: 1.5, transparent: true, opacity: 0.8 });
  const neonParticles = new THREE.Points(neonParticleGeo, neonParticleMat);
  scene.add(neonParticles);
  // 流星
  const meteorGeo = new THREE.CylinderGeometry(0.08, 0.01, 2.5, 8);
  const meteorMat = new THREE.MeshBasicMaterial({ color: '#fff', transparent: true, opacity: 0.7 });
  const meteors: THREE.Mesh[] = [];
  for (let i = 0; i < 3; i++) {
    const meteor = new THREE.Mesh(meteorGeo, meteorMat);
    meteor.position.set(-60 + Math.random()*120, 80 + Math.random()*40, -60 + Math.random()*60);
    meteor.rotation.z = Math.PI/2 + Math.random()*0.5;
    scene.add(meteor);
    meteors.push(meteor);
  }

  // 4. 城市剪影
  const cityColorsNear = ['#2a1a4d', '#1a2a4d', '#00fff7'];
  const cityColorsFar = ['#22223a', '#1a1a2a', '#1a2a4d'];
  for (let side of [-1, 1]) { // -1:左, 1:右
    let z = 0;
    let layer = 0;
    while (z > END_Z - 10) {
      const isNear = layer % 2 === 0;
      const w = 2.5 + Math.random() * 3.5;
      const h = 8 + Math.random() * (isNear ? 18 : 12);
      const x = side * (10.5 + Math.random() * 1.5 + (isNear ? 0 : 2));
      const y = h / 2 + 0.5;
      const zz = z - Math.random() * 4 + (isNear ? 0 : -2);
      const color = isNear ? cityColorsNear[Math.floor(Math.random()*cityColorsNear.length)] : cityColorsFar[Math.floor(Math.random()*cityColorsFar.length)];
      const cityMat = new THREE.MeshStandardMaterial({ color, emissive: isNear ? 0x00fff7 : 0x22223a, emissiveIntensity: isNear ? 0.12 : 0.04, metalness: 0.3, roughness: 0.7, transparent: true, opacity: isNear ? 0.92 : 0.7 });
      const cityGeo = new THREE.BoxGeometry(w, h, 1.2);
      const cityMesh = new THREE.Mesh(cityGeo, cityMat);
      cityMesh.position.set(x, y, zz);
      scene.add(cityMesh);
      // 加窗戶
      if (isNear) {
        for (let j = 0; j < Math.floor(h/2); j++) {
          if (Math.random() < 0.5) continue;
          const winW = 0.3 + Math.random() * 0.3;
          const winH = 0.5 + Math.random() * 0.3;
          const winY = y - h/2 + 1 + j*2;
          const winColor = Math.random() > 0.5 ? '#ffe066' : '#00fff7';
          const winMat = new THREE.MeshBasicMaterial({ color: winColor, transparent: true, opacity: 0.7 });
          const winGeo = new THREE.PlaneGeometry(winW, winH);
          const winMesh = new THREE.Mesh(winGeo, winMat);
          winMesh.position.set(x + (side*0.7 + (Math.random()-0.5)*0.5), winY, zz+0.7);
          winMesh.userData = { flicker: Math.random() > 0.7 };
          scene.add(winMesh);
        }
      }
      // 加光暈
      if (isNear && Math.random() > 0.7) {
        const glowGeo = new THREE.PlaneGeometry(w*1.2, h*0.5);
        const glowMat = new THREE.MeshBasicMaterial({ color: '#00fff7', transparent: true, opacity: 0.12 });
        const glowMesh = new THREE.Mesh(glowGeo, glowMat);
        glowMesh.position.set(x, y+h*0.25, zz+0.8);
        scene.add(glowMesh);
      }
      z -= 10 + Math.random() * 5;
      layer++;
    }
  }

  // 動態地板光紋
  const floorGlowGeo = new THREE.PlaneGeometry(20, 80);
  const floorGlowMat = new THREE.MeshBasicMaterial({ color: '#39ff14', transparent: true, opacity: 0.08 });
  const floorGlow = new THREE.Mesh(floorGlowGeo, floorGlowMat);
  floorGlow.rotation.x = -Math.PI/2;
  floorGlow.position.set(0, 0.02, -40);
  scene.add(floorGlow);

  return { bgMesh, neonStripes, neonParticles, meteors, floorGlow };
} 