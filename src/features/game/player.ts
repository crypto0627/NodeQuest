import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';

export function createPlayer(scene: THREE.Scene, world: CANNON.World) {
  const playerHolder = new THREE.Group();
  scene.add(playerHolder);

  const placeholderMat = new THREE.MeshPhysicalMaterial({ color: 0x00ff99, metalness: 0.7, roughness: 0.18, emissive: 0x00fff7, emissiveIntensity: 0.25 });
  const placeholderGeo = new THREE.CapsuleGeometry(0.5, 0.8, 4, 8);
  const placeholderMesh = new THREE.Mesh(placeholderGeo, placeholderMat);
  playerHolder.add(placeholderMesh);

  const playerBody = new CANNON.Body({ mass: 5, fixedRotation: true });
  const playerShape = new CANNON.Box(new CANNON.Vec3(0.5, 0.9, 0.5));
  playerBody.addShape(playerShape);
  playerBody.position.set(0, 2, 0);
  world.addBody(playerBody);

  // 玩家模型材質
  const primaryMat = new THREE.MeshPhysicalMaterial({
    color: 0xbbddff, // 淡藍金屬
    metalness: 0.9,
    roughness: 0.2,
    clearcoat: 0.8,
    clearcoatRoughness: 0.2,
  });
  const secondaryMat = new THREE.MeshPhysicalMaterial({
    color: 0x444466, // 深藍灰金屬
    metalness: 0.8,
    roughness: 0.5,
  });
  const emissiveMat = new THREE.MeshPhysicalMaterial({
    color: 0x00fff7, // 青色光暈
    emissive: 0x00fff7,
    emissiveIntensity: 2.5,
    toneMapped: false,
  });

  const loader = new OBJLoader();
  loader.load(
    '/sprites/base.obj',
    (obj) => {
      playerHolder.remove(placeholderMesh);
      placeholderMesh.geometry.dispose();

      const model = obj;
      // 旋轉模型使其朝前 (-Z)
      model.rotation.y = Math.PI;
      
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const scale = 1.8 / size.y;
      model.scale.set(scale, scale, scale);

      const center = box.getCenter(new THREE.Vector3());
      model.position.sub(center.multiplyScalar(scale));

      // 為模型的不同部分上色
      let partIndex = 0;
      model.traverse(function (child) {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true;
          if (partIndex === 0) {
            child.material = primaryMat;
          } else if (partIndex < 4) { // 假設前幾個部分是次要裝飾
            child.material = secondaryMat;
          } else { // 其他部分作為發光細節
            child.material = emissiveMat;
          }
          partIndex++;
        }
      });
      playerHolder.add(model);
    },
    undefined,
    (error) => {
      console.error('Error loading player model, using placeholder.', error);
    }
  );
  return { playerHolder, playerBody, emissiveMat };
} 