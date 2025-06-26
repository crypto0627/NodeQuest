'use client';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import RewardModal from './RewardModal';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';

import { STATE, GameState } from '../features/game/gameConstants';
import { createCyberpunkBackground } from '../features/game/cyberpunkBackground';
import { createInfiniteFloor, FLOOR_COUNT, FLOOR_LENGTH } from '../features/game/floor';
import { createPlayer } from '../features/game/player';
import { createLaserLayout } from '../features/game/laserLayout';
import { LaserObj } from '../features/game/types';

export default function LaserCorridorGame({ onClose, onRestart }: { onClose?: () => void, onRestart?: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [gameState, setGameState] = useState<GameState>(STATE.COUNTDOWN);
  const [countdown, setCountdown] = useState(5);

  // 終點 z 座標
  const END_Z = -1080;

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
    // --- Scene and World Setup ---
    const scene = new THREE.Scene();
    scene.background = null;
    const world = new CANNON.World();
    world.gravity.set(0, -9.82, 0);
    const timeStep = 1 / 60;
    
    // --- Camera and Renderer ---
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
    camera.position.set(0, 5, 10);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(ref.current.clientWidth, ref.current.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    while (ref.current.firstChild) ref.current.removeChild(ref.current.firstChild);
    ref.current.appendChild(renderer.domElement);
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));

    // --- Game Elements Creation ---
    const backgroundElements = createCyberpunkBackground(scene, END_Z);
    const { floorMeshes, floorBodies } = createInfiniteFloor(scene, world);
    const { playerHolder, playerBody } = createPlayer(scene, world);
    const lasers = createLaserLayout(scene);
    
    // --- Lighting ---
    const amb = new THREE.AmbientLight(0x99aaff, 0.8);
    const dir = new THREE.DirectionalLight(0xaaaaff, 1.5);
    dir.position.set(5, 10, 5);
    dir.castShadow = true;
    scene.add(amb, dir);

    // --- Finish Line ---
    const endBarGeo = new THREE.PlaneGeometry(16, 0.7);
    const endBarMat = new THREE.MeshPhysicalMaterial({ color: '#39ff14', transparent: true, opacity: 0.95, emissive: 0x39ff14, emissiveIntensity: 2.5, metalness: 0.7, roughness: 0.1 });
    const endBar = new THREE.Mesh(endBarGeo, endBarMat);
    endBar.position.set(0, 1.1, END_Z);
    endBar.rotation.x = -Math.PI/2.1;
    scene.add(endBar);
    const endBarGlowGeo = new THREE.PlaneGeometry(18, 1.5);
    const endBarGlowMat = new THREE.MeshBasicMaterial({ color: '#39ff14', transparent: true, opacity: 0.18 });
    const endBarGlow = new THREE.Mesh(endBarGlowGeo, endBarGlowMat);
    endBarGlow.position.set(0, 1.1, END_Z+0.1);
    endBarGlow.rotation.x = -Math.PI/2.1;
    scene.add(endBarGlow);

    // --- Controls ---
    const keys: { [key: string]: boolean } = {};
    const handleKeyDown = (e: KeyboardEvent) => keys[e.key.toLowerCase()] = true;
    const handleKeyUp = (e: KeyboardEvent) => keys[e.key.toLowerCase()] = false;
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // --- Animation Loop ---
    let animationFrameId: number;
    let last = performance.now();
    let jumpCount = 0;
    const MAX_JUMP = 2;

    function animate(now: number) {
      const dt = (now - last) / 1000;
      last = now;

      // Game Logic
      if (gameState === STATE.PLAYING) {
        world.step(timeStep, dt);

        // Player movement
        playerBody.velocity.z = -36;
        playerBody.velocity.x *= 0.9;
        if (keys['a'] || keys['arrowleft']) playerBody.velocity.x = -5;
        if (keys['d'] || keys['arrowright']) playerBody.velocity.x = 5;
        if (keys[' '] && jumpCount < MAX_JUMP) {
          playerBody.velocity.y = 4.5;
          jumpCount++;
          keys[' '] = false;
        }
        if (playerBody.position.y <= 2.01 && Math.abs(playerBody.velocity.y) < 0.05) {
          jumpCount = 0;
        }
        if (playerBody.position.x > 4.5) playerBody.position.x = 4.5;
        if (playerBody.position.x < -4.5) playerBody.position.x = -4.5;

        // Sync player model and camera
        playerHolder.position.copy(playerBody.position as unknown as THREE.Vector3);
        camera.position.set(playerBody.position.x, playerBody.position.y + 5, playerBody.position.z + 8);
        camera.lookAt(playerHolder.position);
        
        // Infinite floor
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

        // Collision detection & Game State change
        for (const l of lasers) {
          if (playerHolder.position.distanceTo(l.mesh.position) < 1.1) {
            setGameState(STATE.GAMEOVER);
            break;
          }
        }
        if (playerBody.position.y < -10) {
          setGameState(STATE.GAMEOVER);
        }
        if (playerBody.position.z < END_Z) {
          setGameState(STATE.WIN);
        }
      }

      // Visual Animations
      // Player
      playerHolder.scale.y = 1 + 0.08 * Math.sin(now * 0.008);
      playerHolder.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          (child.material as THREE.MeshPhysicalMaterial).emissiveIntensity = 2.0 + 1.5 * Math.sin(now * 0.005);
        }
      });
      // Background
      backgroundElements.bgMesh.position.z = camera.position.z - 120;
      backgroundElements.neonStripes.forEach((stripe, i) => {
        (stripe.material as THREE.MeshBasicMaterial).opacity = 0.13 + 0.18 * Math.abs(Math.sin(now*0.001 + i));
        stripe.position.x = Math.sin(now*0.0007 + i) * 2.5;
      });
      backgroundElements.neonParticles.material.opacity = 0.7 + 0.3 * Math.abs(Math.sin(now*0.001));
      backgroundElements.meteors.forEach((meteor, i) => {
        meteor.position.x += 0.7 + i*0.2;
        meteor.position.y -= 0.5 + i*0.1;
        if (meteor.position.x > 70 || meteor.position.y < 0) {
          meteor.position.x = -60 + Math.random()*120;
          meteor.position.y = 80 + Math.random()*40;
        }
      });
      scene.traverse(obj => {
        if (obj instanceof THREE.Mesh && obj.userData && obj.userData.flicker) {
          const mat = obj.material as THREE.MeshBasicMaterial | THREE.MeshPhysicalMaterial;
          mat.opacity = 0.4 + 0.6 * Math.abs(Math.sin(now*0.002 + obj.position.y));
        }
      });
      backgroundElements.floorGlow.material.opacity = 0.08 + 0.08 * Math.abs(Math.sin(now*0.0012));

      // Lasers
      lasers.forEach((l: LaserObj) => {
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
            l.mesh.position.y = Math.max(1.2, l.mesh.position.y);
            if (l.glow) { l.glow.position.copy(l.mesh.position); l.glow.rotation.copy(l.mesh.rotation); }
            if (l.endSpheres) {
              const halfLen = (l.mesh.geometry as THREE.CylinderGeometry).parameters.height / 2;
              l.endSpheres[0].position.copy(l.mesh.position).add(new THREE.Vector3(halfLen, 0, 0).applyEuler(l.mesh.rotation));
              l.endSpheres[1].position.copy(l.mesh.position).add(new THREE.Vector3(-halfLen, 0, 0).applyEuler(l.mesh.rotation));
            }
            break;
          case 'V':
            l.mesh.position.x = l.baseX + Math.sin(now * 0.001 * l.speed! + l.phase!) * l.range!;
            if (l.glow) { l.glow.position.copy(l.mesh.position); }
            if (l.endSpheres) {
              const halfLen = (l.mesh.geometry as THREE.CylinderGeometry).parameters.height / 2;
              l.endSpheres[0].position.set(l.mesh.position.x, l.mesh.position.y-halfLen, l.mesh.position.z);
              l.endSpheres[1].position.set(l.mesh.position.x, l.mesh.position.y+halfLen, l.mesh.position.z);
            }
            break;
          case 'MOVE':
            l.mesh.position.x = l.baseX + Math.sin(now * 0.001 * l.speed! + l.phase!) * l.range! * 0.7;
            l.mesh.position.y = l.baseY + Math.cos(now * 0.001 * l.speed! + l.phase!) * l.range! * 0.4;
            l.mesh.position.y = Math.max(1.2, l.mesh.position.y);
            if (l.glow) { l.glow.position.copy(l.mesh.position); }
            if (l.endSpheres) {
               const halfLen = (l.mesh.geometry as THREE.CylinderGeometry).parameters.height / 2;
              l.endSpheres[0].position.set(l.mesh.position.x, l.mesh.position.y-halfLen, l.mesh.position.z);
              l.endSpheres[1].position.set(l.mesh.position.x, l.mesh.position.y+halfLen, l.mesh.position.z);
            }
            break;
          case 'ROTATE':
            l.mesh.rotation.z = now * 0.001 * l.speed! + l.phase!;
            if (l.glow) { l.glow.position.copy(l.mesh.position); l.glow.rotation.copy(l.mesh.rotation); }
            if (l.endSpheres) {
              const halfLen = (l.mesh.geometry as THREE.CylinderGeometry).parameters.height / 2;
              const p1 = new THREE.Vector3(0, halfLen, 0).applyEuler(l.mesh.rotation);
              const p2 = new THREE.Vector3(0, -halfLen, 0).applyEuler(l.mesh.rotation);
              l.endSpheres[0].position.copy(l.mesh.position).add(p1);
              l.endSpheres[1].position.copy(l.mesh.position).add(p2);
            }
            break;
          case 'BLINK':
            const blinkOn = Math.sin(now * 0.006 + l.phase!) > 0;
            l.mesh.visible = blinkOn;
            if (l.glow) l.glow.visible = blinkOn;
            if (l.endSpheres) {
              l.endSpheres[0].visible = blinkOn;
              l.endSpheres[1].visible = blinkOn;
            }
            break;
          case 'THICK':
            const thick = l.thickBase! + 0.18 * Math.abs(Math.sin(now * 0.002 + l.phase!));
            l.mesh.scale.x = thick / l.thickBase!;
            l.mesh.scale.z = thick / l.thickBase!;
            if (l.glow) { l.glow.position.copy(l.mesh.position); l.glow.scale.copy(l.mesh.scale); }
            if (l.endSpheres) {
              const halfLen = (l.mesh.geometry as THREE.CylinderGeometry).parameters.height / 2;
              l.endSpheres[0].position.set(l.mesh.position.x, l.mesh.position.y-halfLen, l.mesh.position.z);
              l.endSpheres[1].position.set(l.mesh.position.x, l.mesh.position.y+halfLen, l.mesh.position.z);
            }
            break;
          case 'CROSS':
            l.mesh.position.y = l.baseY + Math.sin(now * 0.001 * l.speed! + l.phase!) * 0.7;
            if (l.crossPair) {
              l.crossPair.position.x = l.baseX + Math.sin(now * 0.001 * l.speed! + l.phase! * 1.5) * 2.5;
              if (l.crossEndSpheres) {
                const halfLen = (l.crossPair.geometry as THREE.CylinderGeometry).parameters.height / 2;
                l.crossEndSpheres[0].position.set(l.crossPair.position.x-halfLen, l.crossPair.position.y, l.crossPair.position.z);
                l.crossEndSpheres[1].position.set(l.crossPair.position.x+halfLen, l.crossPair.position.y, l.crossPair.position.z);
              }
            }
            if (l.glow) { l.glow.position.copy(l.mesh.position); }
            if (l.endSpheres) {
              const halfLen = (l.mesh.geometry as THREE.CylinderGeometry).parameters.height / 2;
              l.endSpheres[0].position.set(l.mesh.position.x, l.mesh.position.y-halfLen, l.mesh.position.z);
              l.endSpheres[1].position.set(l.mesh.position.x, l.mesh.position.y+halfLen, l.mesh.position.z);
            }
            break;
        }
      });
      
      composer.render();
      animationFrameId = requestAnimationFrame(animate);
    }
    animate(last);
    
    // --- Event Listeners and Cleanup ---
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
      if (ref.current) {
        ref.current.removeChild(renderer.domElement);
      }
    };
  }, [gameState]);

  // --- UI ---
  const handleRestart = () => {
    setGameState(STATE.COUNTDOWN);
    setCountdown(5);
  };
  
  if (gameState === 'WIN') {
    return <RewardModal onClose={onClose} onRestart={onRestart} />;
  }

  return (
    <div className="fixed top-0 left-0 w-screen h-screen z-50 bg-black" style={{ overflow: 'hidden' }}>
      <button
        onClick={onClose}
        className="absolute top-6 right-8 z-[100] bg-transparent border-none text-white text-[2.2rem] font-bold cursor-pointer transition-colors duration-200 hover:text-[#00fff7] focus:outline-none"
        aria-label="Close game"
      >
        ×
      </button>
      <div ref={ref} className="relative w-full h-full"></div>
      {gameState === STATE.COUNTDOWN && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[72px] text-[#39ff14] bg-[rgba(20,30,60,0.7)] rounded-3xl px-8 py-2 shadow-[0_2px_32px_#39ff1488,0_0_64px_#00fff7] border-[3px] border-solid border-[#39ff14] text-center font-extrabold tracking-wider transition-all duration-200 animate-countdown-glow [text-shadow:0_0_24px_#39ff14,0_0_48px_#00fff7]">
          {countdown === 0 ? 'GO!' : countdown}
        </div>
      )}
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