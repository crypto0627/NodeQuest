import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export function createPlayer(scene: THREE.Scene, world: CANNON.World) {
  const playerHolder = new THREE.Group();
  scene.add(playerHolder);

  const placeholderMat = new THREE.MeshPhysicalMaterial({ color: 0xcccccc, metalness: 0.8, roughness: 0.2 });
  const placeholderGeo = new THREE.CapsuleGeometry(0.5, 0.8, 4, 8);
  const placeholderMesh = new THREE.Mesh(placeholderGeo, placeholderMat);
  playerHolder.add(placeholderMesh);

  const playerBody = new CANNON.Body({ mass: 5, fixedRotation: true });
  const playerShape = new CANNON.Box(new CANNON.Vec3(0.5, 0.9, 0.5));
  playerBody.addShape(playerShape);
  playerBody.position.set(0, 2, 0);
  world.addBody(playerBody);

  const loader = new GLTFLoader();
  loader.load(
    '/sprites/base_basic_pbr.glb',
    (gltf) => {
      playerHolder.remove(placeholderMesh);
      placeholderMesh.geometry.dispose();

      const model = gltf.scene;
      // 旋轉模型使其朝前 (-Z)
      model.rotation.y = Math.PI;
      
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const scale = 1.8 / size.y;
      model.scale.set(scale, scale, scale);

      const center = box.getCenter(new THREE.Vector3());
      model.position.sub(center.multiplyScalar(scale));

      // 為模型的所有網格啟用陰影投射
      model.traverse(function (child) {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true;
        }
      });
      playerHolder.add(model);
    },
    undefined,
    (error) => {
      console.error('Error loading player model, using placeholder.', error);
    }
  );
  return { playerHolder, playerBody };
}