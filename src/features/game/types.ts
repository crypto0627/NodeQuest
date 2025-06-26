import type * as THREE from 'three';

export type LaserType = 'H' | 'V' | 'MOVE' | 'ROTATE' | 'BLINK' | 'THICK' | 'CROSS';

export interface LaserObj {
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