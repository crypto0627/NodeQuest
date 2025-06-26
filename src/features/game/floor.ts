import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export const FLOOR_LENGTH = 80;
export const FLOOR_COUNT = 3;

export function createInfiniteFloor(scene: THREE.Scene, world: CANNON.World) {
  // 新的透明網格地板材質
  const floorMatCanvas = document.createElement('canvas');
  floorMatCanvas.width = 128; floorMatCanvas.height = 128;
  const fctx = floorMatCanvas.getContext('2d')!;
  fctx.fillStyle = 'rgba(10, 15, 30, 0.4)'; // 半透明基底
  fctx.fillRect(0, 0, 128, 128);
  fctx.strokeStyle = '#00fff7bb'; // 霓虹青色網格
  fctx.lineWidth = 2;
  fctx.shadowColor = '#00fff7';
  fctx.shadowBlur = 8;
  for (let i = 0; i <= 128; i += 32) {
    fctx.beginPath(); fctx.moveTo(i, 0); fctx.lineTo(i, 128); fctx.stroke();
    fctx.beginPath(); fctx.moveTo(0, i); fctx.lineTo(128, i); fctx.stroke();
  }
  const floorTex = new THREE.CanvasTexture(floorMatCanvas);
  floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
  floorTex.repeat.set(12, 12);
  
  const floorMat = new THREE.MeshPhysicalMaterial({
    map: floorTex,
    transparent: true,
    metalness: 0.5,
    roughness: 0.4,
    reflectivity: 0.6,
    envMapIntensity: 1.5,
  });
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
  return { floorMeshes, floorBodies };
} 