import * as THREE from 'three';
import type { LaserType, LaserObj } from './types';

export function createLaserLayout(scene: THREE.Scene) {
  const lasers: LaserObj[] = [];

  const createLaser = (
    type: LaserType,
    position: THREE.Vector3,
    options: Partial<LaserObj> & { rotation?: THREE.Euler, scale?: THREE.Vector3 } = {}
  ) => {
    let mesh: THREE.Mesh | undefined = undefined;
    let crossPair: THREE.Mesh | undefined = undefined;
    let glow: THREE.Mesh | undefined = undefined;
    let endSpheres: [THREE.Mesh, THREE.Mesh] | undefined = undefined;
    let crossEndSpheres: [THREE.Mesh, THREE.Mesh] | undefined = undefined;
    
    const laserMat = new THREE.MeshPhysicalMaterial({ color: '#ff2222', emissive: 0xff2222, emissiveIntensity: 1.5, transparent: true, opacity: 0.8, metalness: 0.7, roughness: 0.1, transmission: 0.7, thickness: 1.5, clearcoat: 1, clearcoatRoughness: 0.1 });
    const glowMat = new THREE.MeshBasicMaterial({ color: '#ff2222', transparent: true, opacity: 0.18 });
    const sphereMat = new THREE.MeshPhysicalMaterial({ color: '#ff5555', emissive: 0xff2222, emissiveIntensity: 2.5, transparent: true, opacity: 0.85, metalness: 0.8, roughness: 0.1, transmission: 0.9, thickness: 2, clearcoat: 1 });
    
    const geoMap: { [key in LaserType]?: { geo: THREE.CylinderGeometry, glowGeo: THREE.CylinderGeometry, length: number } } = {
      H: { geo: new THREE.CylinderGeometry(0.14, 0.14, 10, 32, 1, true), glowGeo: new THREE.CylinderGeometry(0.25, 0.25, 10.2, 32, 1, true), length: 10 },
      V: { geo: new THREE.CylinderGeometry(0.14, 0.14, 6, 32, 1, true), glowGeo: new THREE.CylinderGeometry(0.25, 0.25, 6.2, 32, 1, true), length: 6 },
      MOVE: { geo: new THREE.CylinderGeometry(0.14, 0.14, 8, 32, 1, true), glowGeo: new THREE.CylinderGeometry(0.25, 0.25, 8.2, 32, 1, true), length: 8 },
      ROTATE: { geo: new THREE.CylinderGeometry(0.14, 0.14, 9, 32, 1, true), glowGeo: new THREE.CylinderGeometry(0.25, 0.25, 9.2, 32, 1, true), length: 9 },
      BLINK: { geo: new THREE.CylinderGeometry(0.14, 0.14, 10, 32, 1, true), glowGeo: new THREE.CylinderGeometry(0.25, 0.25, 10.2, 32, 1, true), length: 10 },
      THICK: { geo: new THREE.CylinderGeometry(0.14, 0.14, 10, 32, 1, true), glowGeo: new THREE.CylinderGeometry(0.25, 0.25, 10.2, 32, 1, true), length: 10 },
      CROSS: { geo: new THREE.CylinderGeometry(0.14, 0.14, 8, 32, 1, true), glowGeo: new THREE.CylinderGeometry(0.25, 0.25, 8.2, 32, 1, true), length: 8 },
    };

    const spec = geoMap[type];
    if (!spec) return;

    mesh = new THREE.Mesh(spec.geo, laserMat.clone());
    mesh.position.copy(position);
    if (options.rotation) mesh.rotation.copy(options.rotation);
    if (options.scale) mesh.scale.copy(options.scale);

    glow = new THREE.Mesh(spec.glowGeo, glowMat.clone());
    glow.position.copy(mesh.position);
    glow.rotation.copy(mesh.rotation);
    glow.scale.copy(mesh.scale);
    scene.add(glow);

    const s1 = new THREE.Mesh(new THREE.SphereGeometry(0.28, 20, 20), sphereMat.clone());
    const s2 = new THREE.Mesh(new THREE.SphereGeometry(0.28, 20, 20), sphereMat.clone());
    const halfLen = spec.length / 2;
    const axis = (type === 'H' || options.rotation?.z === Math.PI/2) ? new THREE.Vector3(1,0,0) : new THREE.Vector3(0,1,0);
    s1.position.copy(position).addScaledVector(axis.clone().applyEuler(mesh.rotation), -halfLen);
    s2.position.copy(position).addScaledVector(axis.clone().applyEuler(mesh.rotation), halfLen);
    scene.add(s1, s2);
    endSpheres = [s1, s2];

    if (type === 'CROSS') {
      crossPair = new THREE.Mesh(spec.geo, laserMat.clone());
      crossPair.position.copy(position);
      crossPair.rotation.z = 0;
      scene.add(crossPair);

      const cs1 = new THREE.Mesh(new THREE.SphereGeometry(0.28, 20, 20), sphereMat.clone());
      const cs2 = new THREE.Mesh(new THREE.SphereGeometry(0.28, 20, 20), sphereMat.clone());
      cs1.position.copy(position).addScaledVector(new THREE.Vector3(1,0,0), -halfLen);
      cs2.position.copy(position).addScaledVector(new THREE.Vector3(1,0,0), halfLen);
      scene.add(cs1, cs2);
      crossEndSpheres = [cs1, cs2];
    }
    
    scene.add(mesh);
    lasers.push({
      mesh, type,
      baseX: position.x, baseY: position.y, z: position.z,
      speed: 0.8 + Math.random() * 0.7,
      range: 2 + Math.random() * 2,
      phase: Math.random() * Math.PI * 2,
      thickBase: 0.14,
      crossPair, glow, endSpheres, crossEndSpheres,
      ...options,
    });
  };
  
  // 區域化佈局
  const zones = [
    { type: 'GATE' as const, z: -40, startZ: -40, endZ: -40, count: 1 },
    { type: 'WAVE_TUNNEL' as const, startZ: -100, endZ: -240, count: 12 },
    { type: 'SIDE_CRUSHERS' as const, startZ: -280, endZ: -420, count: 6 },
    { type: 'ROTATING_BLADES'as const, startZ: -480, endZ: -640, count: 8 },
    { type: 'BLINK_MAZE' as const, startZ: -700, endZ: -860, count: 18 },
    { type: 'FINAL_GAUNTLET' as const, startZ: -920, endZ: -1060, count: 15 },
  ];

  zones.forEach(zone => {
    const zStep = (zone.endZ - zone.startZ) / (zone.count || 1);
    switch(zone.type) {
      case 'GATE':
        createLaser('V', new THREE.Vector3(-3.5, 3.5, zone.z));
        createLaser('V', new THREE.Vector3(3.5, 3.5, zone.z));
        createLaser('H', new THREE.Vector3(0, 5, zone.z), { rotation: new THREE.Euler(0, 0, Math.PI/2) });
        break;
      case 'WAVE_TUNNEL':
        for (let i=0; i<zone.count; i++) {
          const z = zone.startZ + i * zStep;
          createLaser('H', new THREE.Vector3(0, 3.5, z), { rotation: new THREE.Euler(0,0,Math.PI/2), speed: 1.2, range: 4, phase: i*0.8 });
        }
        break;
      case 'SIDE_CRUSHERS':
        for (let i=0; i<zone.count; i++) {
          const z = zone.startZ + i * zStep;
          const side = i%2 === 0 ? 1 : -1;
          createLaser('V', new THREE.Vector3(side * 6, 3, z), { speed: 1.5, range: 4, phase: i * Math.PI });
        }
        break;
      case 'ROTATING_BLADES':
        for (let i=0; i<zone.count; i++) {
          const z = zone.startZ + i * zStep;
          createLaser('ROTATE', new THREE.Vector3(0, 3, z), { speed: 0.6 + Math.random()*0.4, phase: i*Math.PI/2 });
        }
        break;
      case 'BLINK_MAZE':
         for (let i=0; i<zone.count; i++) {
          const z = zone.startZ + i * zStep;
          const x = (i%3 - 1) * 3.5; // -3.5, 0, 3.5
          createLaser('BLINK', new THREE.Vector3(x, 3.5, z), { phase: i*0.4 });
        }
        break;
      case 'FINAL_GAUNTLET':
        for (let i=0; i<zone.count; i++) {
          const z = zone.startZ + i*zStep + Math.random()*zStep*0.5;
          const type: LaserType = (['MOVE','CROSS','THICK'])[i%3] as LaserType;
          const x = (Math.random() - 0.5) * 6;
          const y = 2 + Math.random() * 2;
          createLaser(type, new THREE.Vector3(x, y, z), { speed: 1.5 + Math.random(), range: 3 + Math.random()*2 });
        }
        break;
    }
  });

  return lasers;
} 