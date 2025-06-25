'use client';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import RewardModal from './RewardModal';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';

// 遊戲狀態
const STATE = {
  COUNTDOWN: 'COUNTDOWN',
  PLAYING: 'PLAYING',
  GAMEOVER: 'GAMEOVER',
  WIN: 'WIN',
} as const;

type GameState = typeof STATE[keyof typeof STATE];

export default function LaserCorridorGame({ onClose, onRestart }: { onClose?: () => void, onRestart?: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [gameState, setGameState] = useState<GameState>(STATE.COUNTDOWN);
  const [countdown, setCountdown] = useState(5);
  const [showReward, setShowReward] = useState(false);

  // 終點 z 座標
  const END_Z = -1080;
  const END_LASER = END_Z - 10;

  // 倒數計時
  useEffect(() => {
    if (gameState !== STATE.COUNTDOWN) return;
    if (countdown === 0) {
      setGameState(STATE.PLAYING);
      return;
    }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [gameState, countdown]);

  useEffect(() => {
    if (!ref.current) return;
    // --- THREE.js & CANNON.js 初始化 ---
    const scene = new THREE.Scene();
    scene.background = null;
    // --- Cyberpunk 背景 ---
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
    // 4. 城市剪影（多層次，窗戶閃爍，延伸到終點）
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
    // 5. 地面 perspective 網格線+動態光紋
    const gridLines: THREE.LineSegments[] = [];
    const gridMat = new THREE.LineBasicMaterial({ color: '#00fff7', transparent: true, opacity: 0.18 });
    const gridGeo = new THREE.BufferGeometry();
    const gridVerts: number[] = [];
    for (let i = -10; i <= 10; i++) {
      gridVerts.push(i, 0.01, 0, i, 0.01, -240);
    }
    for (let i = 0; i >= END_Z; i -= 8) {
      gridVerts.push(-10, 0.01, i, 10, 0.01, i);
    }
    gridGeo.setAttribute('position', new THREE.Float32BufferAttribute(gridVerts, 3));
    const grid = new THREE.LineSegments(gridGeo, gridMat);
    scene.add(grid);
    gridLines.push(grid);
    // 動態地板光紋
    const floorGlowGeo = new THREE.PlaneGeometry(20, 80);
    const floorGlowMat = new THREE.MeshBasicMaterial({ color: '#39ff14', transparent: true, opacity: 0.08 });
    const floorGlow = new THREE.Mesh(floorGlowGeo, floorGlowMat);
    floorGlow.rotation.x = -Math.PI/2;
    floorGlow.position.set(0, 0.02, -40);
    scene.add(floorGlow);
    // --- END Cyberpunk 背景 ---
    // 相機
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
    camera.position.set(0, 5, 10);
    camera.lookAt(new THREE.Vector3(0, 0, 0));
    // 渲染器
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(ref.current.clientWidth, ref.current.clientHeight);
    renderer.shadowMap.enabled = true;
    while (ref.current.firstChild) ref.current.removeChild(ref.current.firstChild);
    ref.current.appendChild(renderer.domElement);
    // 後處理
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    // 物理世界
    const world = new CANNON.World();
    world.gravity.set(0, -9.82, 0);
    const timeStep = 1 / 60;
    // 地板（無限延伸）
    const FLOOR_LENGTH = 80;
    const FLOOR_COUNT = 3;
    const floorMatCanvas = document.createElement('canvas');
    floorMatCanvas.width = 64; floorMatCanvas.height = 64;
    const fctx = floorMatCanvas.getContext('2d')!;
    fctx.fillStyle = '#3366ff'; fctx.fillRect(0, 0, 64, 64);
    fctx.fillStyle = '#fff3';
    for (let i = 0; i < 8; i++) fctx.fillRect(i * 8, 0, 4, 64);
    const floorTex = new THREE.CanvasTexture(floorMatCanvas);
    floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
    floorTex.repeat.set(10, 16);
    const floorMat = new THREE.MeshPhysicalMaterial({ map: floorTex, roughness: 0.2, metalness: 0.2, clearcoat: 0.5, clearcoatRoughness: 0.2, reflectivity: 0.3 });
    const floorGeo = new THREE.PlaneGeometry(20, FLOOR_LENGTH);
    const floorMeshes: THREE.Mesh[] = [];
    const floorBodies: CANNON.Body[] = [];
    for (let i = 0; i < FLOOR_COUNT; i++) {
      const mesh = new THREE.Mesh(floorGeo, floorMat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.receiveShadow = true;
      mesh.position.z = -i * FLOOR_LENGTH;
      scene.add(mesh);
      floorMeshes.push(mesh);
      const body = new CANNON.Body({ mass: 0 });
      body.addShape(new CANNON.Plane());
      body.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
      body.position.z = -i * FLOOR_LENGTH;
      world.addBody(body);
      floorBodies.push(body);
    }
    // Player: CapsuleGeometry + neon 邊緣 + 動態色彩
    const playerGeo = new THREE.CapsuleGeometry(0.5, 0.5, 8, 16);
    const playerMat = new THREE.MeshPhysicalMaterial({ color: 0x00ff99, metalness: 0.7, roughness: 0.18, clearcoat: 0.8, clearcoatRoughness: 0.1, emissive: 0x00fff7, emissiveIntensity: 0.25 });
    const playerMesh = new THREE.Mesh(playerGeo, playerMat);
    playerMesh.castShadow = true;
    playerMesh.position.y = 1.1;
    scene.add(playerMesh);
    const playerBody = new CANNON.Body({ mass: 5, fixedRotation: true });
    playerBody.addShape(new CANNON.Box(new CANNON.Vec3(0.5, 1.1, 0.5)));
    playerBody.position.set(0, 2, 0);
    world.addBody(playerBody);
    // 光源
    const amb = new THREE.AmbientLight(0x99aaff, 0.8);
    const dir = new THREE.DirectionalLight(0xaaaaff, 1.5);
    dir.position.set(5, 10, 5);
    dir.castShadow = true;
    scene.add(amb, dir);
    // 複雜雷射型態（全部紅色星際戰艦風格）
    type LaserType = 'H' | 'V' | 'MOVE' | 'ROTATE' | 'BLINK' | 'THICK' | 'CROSS';
    interface LaserObj {
      mesh: THREE.Mesh;
      type: LaserType;
      baseX: number;
      baseY: number;
      z: number;
      speed?: number;
      range?: number;
      phase?: number;
      thickBase?: number;
      crossPair?: THREE.Mesh;
      glow?: THREE.Mesh;
      endSpheres?: [THREE.Mesh, THREE.Mesh];
      crossEndSpheres?: [THREE.Mesh, THREE.Mesh];
    }
    const lasers: LaserObj[] = [];
    const LASER_COUNT = 40;
    for (let i = 0; i < LASER_COUNT; i++) {
      // 均勻分布雷射在 -40 ~ END_LASER
      const z = -40 + (END_LASER + 40) * (i / (LASER_COUNT - 1));
      const baseY = 1.2 + Math.random() * 1.0;
      const type: LaserType = (['H','V','MOVE','ROTATE','BLINK','THICK','CROSS'])[i%7] as LaserType;
      let mesh: THREE.Mesh | undefined = undefined;
      let crossPair: THREE.Mesh | undefined = undefined;
      let glow: THREE.Mesh | undefined = undefined;
      let endSpheres: [THREE.Mesh, THREE.Mesh] | undefined = undefined;
      let crossEndSpheres: [THREE.Mesh, THREE.Mesh] | undefined = undefined;
      // 束身材質
      const laserMat = new THREE.MeshPhysicalMaterial({ color: '#ff2222', emissive: 0xff2222, emissiveIntensity: 1.5, transparent: true, opacity: 0.8, metalness: 0.7, roughness: 0.1, transmission: 0.7, thickness: 1.5, clearcoat: 1, clearcoatRoughness: 0.1 });
      // 外發光
      const glowMat = new THREE.MeshBasicMaterial({ color: '#ff2222', transparent: true, opacity: 0.18 });
      // 端點能量球材質
      const sphereMat = new THREE.MeshPhysicalMaterial({ color: '#ff5555', emissive: 0xff2222, emissiveIntensity: 2.5, transparent: true, opacity: 0.85, metalness: 0.8, roughness: 0.1, transmission: 0.9, thickness: 2, clearcoat: 1 });
      switch(type) {
        case 'H':
          mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 10, 32, 1, true), laserMat.clone());
          mesh.position.set(0, baseY, z);
          mesh.rotation.z = Math.PI / 2;
          glow = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 10.2, 32, 1, true), glowMat.clone());
          glow.position.copy(mesh.position);
          glow.rotation.copy(mesh.rotation);
          scene.add(glow);
          // 端點能量球
          const s1 = new THREE.Mesh(new THREE.SphereGeometry(0.28, 20, 20), sphereMat.clone());
          const s2 = new THREE.Mesh(new THREE.SphereGeometry(0.28, 20, 20), sphereMat.clone());
          s1.position.set(-5, baseY, z);
          s2.position.set(5, baseY, z);
          scene.add(s1, s2);
          endSpheres = [s1, s2];
          break;
        case 'V':
          mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 6, 32, 1, true), laserMat.clone());
          mesh.position.set(-4 + Math.random() * 8, baseY, z);
          glow = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 6.2, 32, 1, true), glowMat.clone());
          glow.position.copy(mesh.position);
          scene.add(glow);
          // 端點能量球
          const sv1 = new THREE.Mesh(new THREE.SphereGeometry(0.28, 20, 20), sphereMat.clone());
          const sv2 = new THREE.Mesh(new THREE.SphereGeometry(0.28, 20, 20), sphereMat.clone());
          sv1.position.set(mesh.position.x, baseY-3, z);
          sv2.position.set(mesh.position.x, baseY+3, z);
          scene.add(sv1, sv2);
          endSpheres = [sv1, sv2];
          break;
        case 'MOVE':
          mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 8, 32, 1, true), laserMat.clone());
          mesh.position.set(-3 + Math.random() * 6, baseY, z);
          glow = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 8.2, 32, 1, true), glowMat.clone());
          glow.position.copy(mesh.position);
          scene.add(glow);
          // 端點能量球
          const sm1 = new THREE.Mesh(new THREE.SphereGeometry(0.28, 20, 20), sphereMat.clone());
          const sm2 = new THREE.Mesh(new THREE.SphereGeometry(0.28, 20, 20), sphereMat.clone());
          sm1.position.set(mesh.position.x, baseY-4, z);
          sm2.position.set(mesh.position.x, baseY+4, z);
          scene.add(sm1, sm2);
          endSpheres = [sm1, sm2];
          break;
        case 'ROTATE':
          mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 9, 32, 1, true), laserMat.clone());
          mesh.position.set(0, baseY, z);
          glow = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 9.2, 32, 1, true), glowMat.clone());
          glow.position.copy(mesh.position);
          scene.add(glow);
          // 端點能量球
          const sr1 = new THREE.Mesh(new THREE.SphereGeometry(0.28, 20, 20), sphereMat.clone());
          const sr2 = new THREE.Mesh(new THREE.SphereGeometry(0.28, 20, 20), sphereMat.clone());
          sr1.position.set(0, baseY-4.5, z);
          sr2.position.set(0, baseY+4.5, z);
          scene.add(sr1, sr2);
          endSpheres = [sr1, sr2];
          break;
        case 'BLINK':
          mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 10, 32, 1, true), laserMat.clone());
          mesh.position.set(0, baseY, z);
          glow = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 10.2, 32, 1, true), glowMat.clone());
          glow.position.copy(mesh.position);
          scene.add(glow);
          // 端點能量球
          const sb1 = new THREE.Mesh(new THREE.SphereGeometry(0.28, 20, 20), sphereMat.clone());
          const sb2 = new THREE.Mesh(new THREE.SphereGeometry(0.28, 20, 20), sphereMat.clone());
          sb1.position.set(0, baseY-5, z);
          sb2.position.set(0, baseY+5, z);
          scene.add(sb1, sb2);
          endSpheres = [sb1, sb2];
          break;
        case 'THICK':
          mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 10, 32, 1, true), laserMat.clone());
          mesh.position.set(0, baseY, z);
          glow = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 10.2, 32, 1, true), glowMat.clone());
          glow.position.copy(mesh.position);
          scene.add(glow);
          // 端點能量球
          const st1 = new THREE.Mesh(new THREE.SphereGeometry(0.28, 20, 20), sphereMat.clone());
          const st2 = new THREE.Mesh(new THREE.SphereGeometry(0.28, 20, 20), sphereMat.clone());
          st1.position.set(0, baseY-5, z);
          st2.position.set(0, baseY+5, z);
          scene.add(st1, st2);
          endSpheres = [st1, st2];
          break;
        case 'CROSS':
          mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 8, 32, 1, true), laserMat.clone());
          mesh.position.set(0, baseY, z);
          crossPair = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 8, 32, 1, true), laserMat.clone());
          crossPair.position.set(0, baseY, z);
          crossPair.rotation.z = 0;
          scene.add(crossPair);
          glow = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 8.2, 32, 1, true), glowMat.clone());
          glow.position.copy(mesh.position);
          scene.add(glow);
          // 端點能量球
          const sc1 = new THREE.Mesh(new THREE.SphereGeometry(0.28, 20, 20), sphereMat.clone());
          const sc2 = new THREE.Mesh(new THREE.SphereGeometry(0.28, 20, 20), sphereMat.clone());
          sc1.position.set(0, baseY-4, z);
          sc2.position.set(0, baseY+4, z);
          scene.add(sc1, sc2);
          endSpheres = [sc1, sc2];
          // crossPair 端點
          const csc1 = new THREE.Mesh(new THREE.SphereGeometry(0.28, 20, 20), sphereMat.clone());
          const csc2 = new THREE.Mesh(new THREE.SphereGeometry(0.28, 20, 20), sphereMat.clone());
          csc1.position.set(-4, baseY, z);
          csc2.position.set(4, baseY, z);
          scene.add(csc1, csc2);
          crossEndSpheres = [csc1, csc2];
          break;
      }
      if (!mesh) continue;
      scene.add(mesh);
      lasers.push({
        mesh,
        type,
        baseX: mesh.position.x,
        baseY,
        z,
        speed: 0.8 + Math.random() * 0.7,
        range: 2 + Math.random() * 2,
        phase: Math.random() * Math.PI * 2,
        thickBase: 0.14,
        crossPair,
        glow,
        endSpheres,
        crossEndSpheres
      });
    }
    // 螢光綠終點光條
    const endBarGeo = new THREE.PlaneGeometry(16, 0.7);
    const endBarMat = new THREE.MeshPhysicalMaterial({ color: '#39ff14', transparent: true, opacity: 0.95, emissive: 0x39ff14, emissiveIntensity: 2.5, metalness: 0.7, roughness: 0.1 });
    const endBar = new THREE.Mesh(endBarGeo, endBarMat);
    endBar.position.set(0, 1.1, END_Z);
    endBar.rotation.x = -Math.PI/2.1;
    scene.add(endBar);
    // 螢光綠 glow
    const endBarGlowGeo = new THREE.PlaneGeometry(18, 1.5);
    const endBarGlowMat = new THREE.MeshBasicMaterial({ color: '#39ff14', transparent: true, opacity: 0.18 });
    const endBarGlow = new THREE.Mesh(endBarGlowGeo, endBarGlowMat);
    endBarGlow.position.set(0, 1.1, END_Z+0.1);
    endBarGlow.rotation.x = -Math.PI/2.1;
    scene.add(endBarGlow);
    // Controls
    const keys: { [key: string]: boolean } = {};
    const handleKeyDown = (e: KeyboardEvent) => keys[e.key.toLowerCase()] = true;
    const handleKeyUp = (e: KeyboardEvent) => keys[e.key.toLowerCase()] = false;
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    let isGameEnded = false;
    let animationFrameId: number;
    let last = performance.now();
    // 多段跳狀態
    let jumpCount = 0;
    const MAX_JUMP = 2;
    function animate(now: number) {
      const dt = (now - last) / 1000;
      last = now;
      // 遊戲狀態
      if (gameState === STATE.PLAYING) {
        world.step(timeStep, dt);
        // 玩家自動往前（速度更快）
        playerBody.velocity.z = -36;
        playerBody.velocity.x *= 0.9;
        // 左右移動
        if (keys['a'] || keys['arrowleft']) playerBody.velocity.x = -5;
        if (keys['d'] || keys['arrowright']) playerBody.velocity.x = 5;
        // 多段跳
        if (keys[' '] && jumpCount < MAX_JUMP) {
          playerBody.velocity.y = 4.5;
          jumpCount++;
          keys[' '] = false; // 防止長按連跳
        }
        // 落地偵測（y接近地面且速度很小）
        if (playerBody.position.y <= 2.01 && Math.abs(playerBody.velocity.y) < 0.05) {
          jumpCount = 0;
        }
        // 邊界
        if (playerBody.position.x > 4.5) playerBody.position.x = 4.5;
        if (playerBody.position.x < -4.5) playerBody.position.x = -4.5;
        // Player動畫
        const pulse = 1 + 0.08 * Math.sin(now * 0.008);
        playerMesh.scale.set(pulse, pulse, pulse);
        const color = new THREE.Color();
        color.setHSL(0.4 + 0.1 * Math.sin(now * 0.001), 0.8, 0.6);
        (playerMesh.material as THREE.MeshPhysicalMaterial).color = color;
        (playerMesh.material as THREE.MeshPhysicalMaterial).emissive = color.clone().lerp(new THREE.Color(0xffffff), 0.3);
        playerMesh.position.copy(playerBody.position as unknown as THREE.Vector3);
        camera.position.set(playerBody.position.x, playerBody.position.y + 5, playerBody.position.z + 8);
        camera.lookAt(playerMesh.position);
        // 地板無限延伸：根據玩家z軸動態平移地板
        for (let i = 0; i < FLOOR_COUNT; i++) {
          let mesh = floorMeshes[i];
          let body = floorBodies[i];
          if (playerBody.position.z - mesh.position.z < -FLOOR_LENGTH / 2) {
            mesh.position.z -= FLOOR_COUNT * FLOOR_LENGTH;
            body.position.z = mesh.position.z;
          }
          if (playerBody.position.z - mesh.position.z > FLOOR_LENGTH * 1.5) {
            mesh.position.z += FLOOR_COUNT * FLOOR_LENGTH;
            body.position.z = mesh.position.z;
          }
        }
        // 複雜雷射動畫
        lasers.forEach((l) => {
          // 動態發光強度與透明度
          const pulse = 1.2 + 0.5 * Math.abs(Math.sin(now * 0.002 + l.phase!));
          (l.mesh.material as THREE.MeshPhysicalMaterial).emissiveIntensity = pulse;
          (l.mesh.material as THREE.MeshPhysicalMaterial).opacity = 0.7 + 0.2 * Math.abs(Math.sin(now * 0.003 + l.phase!));
          if (l.glow) (l.glow.material as THREE.MeshBasicMaterial).opacity = 0.13 + 0.09 * Math.abs(Math.sin(now * 0.002 + l.phase!));
          if (l.endSpheres) {
            (l.endSpheres[0].material as THREE.MeshPhysicalMaterial).emissiveIntensity = 2.2 + 1.2 * Math.abs(Math.sin(now * 0.004 + l.phase!));
            (l.endSpheres[1].material as THREE.MeshPhysicalMaterial).emissiveIntensity = 2.2 + 1.2 * Math.abs(Math.sin(now * 0.004 + l.phase!));
          }
          if (l.crossEndSpheres) {
            (l.crossEndSpheres[0].material as THREE.MeshPhysicalMaterial).emissiveIntensity = 2.2 + 1.2 * Math.abs(Math.sin(now * 0.004 + l.phase!));
            (l.crossEndSpheres[1].material as THREE.MeshPhysicalMaterial).emissiveIntensity = 2.2 + 1.2 * Math.abs(Math.sin(now * 0.004 + l.phase!));
          }
          switch(l.type) {
            case 'H':
              l.mesh.position.y = l.baseY + Math.sin(now * 0.001 * l.speed! + l.phase!) * l.range! * 0.5;
              l.mesh.position.y = Math.max(1.2, Math.min(2.2, l.mesh.position.y));
              l.mesh.position.z = l.z;
              if (l.glow) { l.glow.position.copy(l.mesh.position); l.glow.rotation.copy(l.mesh.rotation); }
              if (l.endSpheres) {
                l.endSpheres[0].position.set(-5, l.mesh.position.y, l.mesh.position.z);
                l.endSpheres[1].position.set(5, l.mesh.position.y, l.mesh.position.z);
              }
              break;
            case 'V':
              l.mesh.position.x = l.baseX + Math.sin(now * 0.001 * l.speed! + l.phase!) * l.range!;
              l.mesh.position.z = l.z;
              l.mesh.position.y = l.baseY;
              if (l.glow) { l.glow.position.copy(l.mesh.position); }
              if (l.endSpheres) {
                l.endSpheres[0].position.set(l.mesh.position.x, l.baseY-3, l.mesh.position.z);
                l.endSpheres[1].position.set(l.mesh.position.x, l.baseY+3, l.mesh.position.z);
              }
              break;
            case 'MOVE':
              l.mesh.position.x = l.baseX + Math.sin(now * 0.001 * l.speed! + l.phase!) * l.range! * 0.7;
              l.mesh.position.y = l.baseY + Math.cos(now * 0.001 * l.speed! + l.phase!) * l.range! * 0.4;
              l.mesh.position.y = Math.max(1.2, Math.min(2.2, l.mesh.position.y));
              l.mesh.position.z = l.z;
              if (l.glow) { l.glow.position.copy(l.mesh.position); }
              if (l.endSpheres) {
                l.endSpheres[0].position.set(l.mesh.position.x, l.mesh.position.y-4, l.mesh.position.z);
                l.endSpheres[1].position.set(l.mesh.position.x, l.mesh.position.y+4, l.mesh.position.z);
              }
              break;
            case 'ROTATE':
              l.mesh.position.z = l.z;
              l.mesh.position.y = l.baseY;
              l.mesh.rotation.y = now * 0.001 * l.speed! + l.phase!;
              if (l.glow) { l.glow.position.copy(l.mesh.position); l.glow.rotation.copy(l.mesh.rotation); }
              if (l.endSpheres) {
                l.endSpheres[0].position.set(0, l.baseY-4.5, l.mesh.position.z);
                l.endSpheres[1].position.set(0, l.baseY+4.5, l.mesh.position.z);
              }
              break;
            case 'BLINK':
              l.mesh.position.z = l.z;
              l.mesh.position.y = l.baseY;
              const blink = Math.abs(Math.sin(now * 0.003 + l.phase!));
              (l.mesh.material as THREE.MeshPhysicalMaterial).opacity = 0.3 + 0.7 * blink;
              if (l.glow) { l.glow.position.copy(l.mesh.position); }
              if (l.endSpheres) {
                l.endSpheres[0].position.set(0, l.baseY-5, l.mesh.position.z);
                l.endSpheres[1].position.set(0, l.baseY+5, l.mesh.position.z);
              }
              break;
            case 'THICK':
              l.mesh.position.z = l.z;
              l.mesh.position.y = l.baseY;
              const thick = l.thickBase! + 0.18 * Math.abs(Math.sin(now * 0.002 + l.phase!));
              l.mesh.scale.x = thick / 0.14;
              l.mesh.scale.y = 1;
              l.mesh.scale.z = thick / 0.14;
              if (l.glow) { l.glow.position.copy(l.mesh.position); l.glow.scale.x = l.mesh.scale.x*1.1; l.glow.scale.z = l.mesh.scale.z*1.1; }
              if (l.endSpheres) {
                l.endSpheres[0].position.set(0, l.baseY-5, l.mesh.position.z);
                l.endSpheres[1].position.set(0, l.baseY+5, l.mesh.position.z);
              }
              break;
            case 'CROSS':
              l.mesh.position.z = l.z;
              l.mesh.position.y = l.baseY + Math.sin(now * 0.001 * l.speed! + l.phase!) * 0.7;
              if (l.crossPair) {
                l.crossPair.position.z = l.z;
                l.crossPair.position.y = l.baseY;
                l.crossPair.position.x = l.baseX + Math.sin(now * 0.001 * l.speed! + l.phase!) * 2.5;
                if (l.crossEndSpheres) {
                  l.crossEndSpheres[0].position.set(l.crossPair.position.x-4, l.crossPair.position.y, l.crossPair.position.z);
                  l.crossEndSpheres[1].position.set(l.crossPair.position.x+4, l.crossPair.position.y, l.crossPair.position.z);
                }
              }
              if (l.glow) { l.glow.position.copy(l.mesh.position); }
              if (l.endSpheres) {
                l.endSpheres[0].position.set(0, l.mesh.position.y-4, l.mesh.position.z);
                l.endSpheres[1].position.set(0, l.mesh.position.y+4, l.mesh.position.z);
              }
              break;
          }
        });
        // 碰撞偵測
        for (const l of lasers) {
          if (playerMesh.position.distanceTo(l.mesh.position) < 1.1) {
            setGameState(STATE.GAMEOVER);
            isGameEnded = true;
            break;
          }
        }
        if (playerBody.position.y < -10) {
          setGameState(STATE.GAMEOVER);
          isGameEnded = true;
        }
        // 到達終點
        if (playerBody.position.z < END_Z) {
          setGameState(STATE.WIN);
          setShowReward(true);
        }
      }
      // 霓虹光條動態閃爍/移動
      neonStripes.forEach((stripe, i) => {
        (stripe.material as THREE.MeshBasicMaterial).opacity = 0.13 + 0.18 * Math.abs(Math.sin(now*0.001 + i));
        stripe.position.x = Math.sin(now*0.0007 + i) * 2.5;
      });
      // 粒子閃爍
      neonParticles.material.opacity = 0.7 + 0.3 * Math.abs(Math.sin(now*0.001));
      // 流星動態
      meteors.forEach((meteor, i) => {
        meteor.position.x += 0.7 + i*0.2;
        meteor.position.y -= 0.5 + i*0.1;
        if (meteor.position.x > 70 || meteor.position.y < 0) {
          meteor.position.x = -60 + Math.random()*120;
          meteor.position.y = 80 + Math.random()*40;
        }
      });
      // 城市窗戶閃爍
      scene.traverse(obj => {
        if (obj instanceof THREE.Mesh && obj.userData && obj.userData.flicker) {
          const mat = obj.material as THREE.MeshBasicMaterial | THREE.MeshPhysicalMaterial;
          mat.opacity = 0.4 + 0.6 * Math.abs(Math.sin(now*0.002 + obj.position.y));
        }
      });
      // 地板光紋動態
      floorGlow.material.opacity = 0.08 + 0.08 * Math.abs(Math.sin(now*0.0012));
      composer.render();
      animationFrameId = requestAnimationFrame(animate);
    }
    animate(last);
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      composer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      ref.current?.removeChild(renderer.domElement);
    };
  }, [gameState]);

  // UI
  const handleRestart = () => {
    setGameState(STATE.COUNTDOWN);
    setCountdown(5);
    setShowReward(false);
  };

  return (
    <div className="fixed top-0 left-0 w-screen h-screen z-50 bg-black" style={{ overflow: 'hidden' }}>
      {/* Close Button at top right */}
      <button
        onClick={onClose}
        className="absolute top-6 right-8 z-[100] bg-transparent border-none text-white text-[2.2rem] font-bold cursor-pointer transition-colors duration-200 hover:text-[#00fff7] focus:outline-none"
        aria-label="Close game"
        tabIndex={0}
      >
        ×
      </button>
      <div ref={ref} className="relative w-full h-full"></div>
      {/* 倒數 */}
      {gameState === STATE.COUNTDOWN && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[72px] text-[#39ff14] bg-[rgba(20,30,60,0.7)] rounded-3xl px-8 py-2 shadow-[0_2px_32px_#39ff1488,0_0_64px_#00fff7] border-[3px] border-solid border-[#39ff14] text-center font-extrabold tracking-wider transition-all duration-200 animate-countdown-glow [text-shadow:0_0_24px_#39ff14,0_0_48px_#00fff7]">
          {countdown === 0 ? 'GO!' : countdown}
        </div>
      )}
      {/* 結束提示 */}
      {gameState === STATE.GAMEOVER && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[48px] text-white bg-[rgba(30,10,10,0.8)] rounded-2xl px-8 py-2 shadow-[0_2px_24px_#000a] border-[2px] border-solid border-[#fff4] text-center font-bold [text-shadow:0_0_16px_#ff00e6,0_0_32px_#00fff7]">
          Game Over
          <div className="mt-6">
            <button
              onClick={handleRestart}
              className="text-[24px] px-6 py-1.5 rounded-[10px] border-none bg-gradient-to-r from-[#00fff7] to-[#ff00e6] text-white font-bold cursor-pointer shadow-[0_2px_8px_#0005] transition-colors duration-200 [text-shadow:0_0_8px_#fff] hover:from-[#ff00e6] hover:to-[#00fff7] focus:outline-none"
              style={{ background: 'linear-gradient(90deg,#00fff7,#ff00e6)' }}
              onMouseOver={e => (e.currentTarget.style.background='linear-gradient(90deg,#ff00e6,#00fff7)')}
              onMouseOut={e => (e.currentTarget.style.background='linear-gradient(90deg,#00fff7,#ff00e6)')}
            >
              Restart
            </button>
          </div>
        </div>
      )}
      {gameState === STATE.WIN && <RewardModal onClose={onClose} onRestart={onRestart} />}
      {/* 終點提示 */}
      {gameState === STATE.PLAYING && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-[30px] text-[20px] text-[#00ffcc] bg-[rgba(0,40,40,0.4)] rounded-lg px-5 py-1 border border-solid border-[#fff2] shadow-[0_2px_12px_#0006] font-semibold">
          Reach the finish line to win!
        </div>
      )}
      <style>{`
        @keyframes countdown-glow {
          0% { box-shadow: 0 2px 32px #39ff1488, 0 0 64px #00fff7; }
          100% { box-shadow: 0 2px 64px #39ff14cc, 0 0 128px #00fff7; }
        }
      `}</style>
    </div>
  );
}