import React, { useEffect, useRef, useState } from 'react';
import mapboxgl, { CustomLayerInterface, LngLatLike } from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

interface MapComponentProps {
  onStartLaserGame?: () => void;
}

/**
 * A custom Mapbox GL layer to render a 3D model with Three.js.
 */
class ThreeJSModelLayer implements CustomLayerInterface {
    id: string;
    type: 'custom' = 'custom';
    renderingMode: '3d' | '2d' = '3d';

    private map?: mapboxgl.Map;
    private renderer?: THREE.WebGLRenderer;
    private scene: THREE.Scene;
    private camera: THREE.Camera;
    private modelTransform: {
        translateX: number;
        translateY: number;
        translateZ: number;
        rotateX: number;
        rotateY: number;
        rotateZ: number;
        scale: number;
    };

    constructor(id: string, modelOrigin: LngLatLike, modelAltitude: number) {
        this.id = id;
        this.scene = new THREE.Scene();
        this.camera = new THREE.Camera();

        const modelRotate = [Math.PI / 2, Math.PI, 0];
        const modelAsMercatorCoordinate = mapboxgl.MercatorCoordinate.fromLngLat(
            modelOrigin,
            modelAltitude
        );

        this.modelTransform = {
            translateX: modelAsMercatorCoordinate.x,
            translateY: modelAsMercatorCoordinate.y,
            translateZ: modelAsMercatorCoordinate.z,
            rotateX: modelRotate[0],
            rotateY: modelRotate[1],
            rotateZ: modelRotate[2],
            scale: modelAsMercatorCoordinate.meterInMercatorCoordinateUnits() * 45,
        };
    }

    onAdd(map: mapboxgl.Map, gl: WebGLRenderingContext) {
        this.map = map;
        this.renderer = new THREE.WebGLRenderer({
            canvas: map.getCanvas(),
            context: gl,
            antialias: true,
        });
        this.renderer.autoClear = false;

        const directionalLight = new THREE.DirectionalLight(0xffffff, 2.5);
        directionalLight.position.set(0, -1, 1);
        this.scene.add(directionalLight);

        const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
        this.scene.add(ambientLight);

        const loader = new GLTFLoader();
        loader.load('/sprites/base_basic_pbr.glb', (gltf) => {
            this.scene.add(gltf.scene);
        });
    }

    render(gl: WebGLRenderingContext, matrix: number[]) {
        const { rotateX, rotateY, rotateZ, translateX, translateY, translateZ, scale } = this.modelTransform;

        const rotationX = new THREE.Matrix4().makeRotationX(rotateX);
        const rotationY = new THREE.Matrix4().makeRotationY(rotateY);
        const rotationZ = new THREE.Matrix4().makeRotationZ(rotateZ);

        const m = new THREE.Matrix4().fromArray(matrix);
        const l = new THREE.Matrix4()
            .makeTranslation(translateX, translateY, translateZ)
            .scale(new THREE.Vector3(scale, -scale, scale))
            .multiply(rotationX)
            .multiply(rotationY)
            .multiply(rotationZ);

        this.camera.projectionMatrix.copy(m).multiply(l);
        if (this.renderer) {
          this.renderer.resetState();
          this.renderer.render(this.scene, this.camera);
        }
        this.map?.triggerRepaint();
    }
}

const MapComponent: React.FC<MapComponentProps> = ({ onStartLaserGame }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const playerMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const [playerPosition, setPlayerPosition] = useState<[number, number]>([121.566972, 25.040472] as [number, number]); // [lng, lat]
  const [loading, setLoading] = useState(false);
  const [showLoading, setShowLoading] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [hasTriggeredChallenge, setHasTriggeredChallenge] = useState(false);
  const [coordInput, setCoordInput] = useState('');
  const [coordError, setCoordError] = useState<string | null>(null);
  const [mapView, setMapView] = useState<'top-down' | 'angled'>('top-down');

  // 台北101座標
  const TAIPEI101: [number, number] = [121.564444, 25.033611];
  // 計算經緯度距離（公尺）
  function getDistance(p1: number[], p2: number[]) {
    const [lng1, lat1] = p1;
    const [lng2, lat2] = p2;
    const toRad = (d: number) => d * Math.PI / 180;
    const R = 6371000; // 地球半徑(m)
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng/2)**2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  // 監控 player 是否靠近 101
  useEffect(() => {
    const dist = getDistance(playerPosition, TAIPEI101);
    if (dist < 80 && !hasTriggeredChallenge) {
      setHasTriggeredChallenge(true);
      setShowLoading(true);
      setTimeout(() => {
        setShowLoading(false);
        setShowDialog(true);
      }, 1000);
    }
    if (dist >= 80 && hasTriggeredChallenge) {
      setHasTriggeredChallenge(false);
    }
  }, [playerPosition, hasTriggeredChallenge]);

  // Dialog 按下確認
  const handleStartLaserGame = () => {
    setShowDialog(false);
    if (onStartLaserGame) {
      onStartLaserGame();
    } else {
      alert('Start LaserGame Challenge！(Please connect to LaserCorridorGame)');
    }
  };

  const handleFlyTo = () => {
    setCoordError(null);
    const parts = coordInput.split(',').map(s => s.trim());
    if (parts.length !== 2) {
      setCoordError('Invalid format. Use: lng, lat');
      return;
    }

    const lng = parseFloat(parts[0]);
    const lat = parseFloat(parts[1]);

    if (isNaN(lng) || isNaN(lat) || lng < -180 || lng > 180 || lat < -90 || lat > 90) {
      setCoordError('Invalid coordinates.');
      return;
    }

    const newPosition: [number, number] = [lng, lat];
    mapRef.current?.flyTo({ center: newPosition, zoom: 15, speed: 1.5 });
    setPlayerPosition(newPosition);
    if (playerMarkerRef.current) {
      playerMarkerRef.current.setLngLat(newPosition);
    }
    setCoordInput('');
  };

  type MoveDirection = 'up' | 'down' | 'left' | 'right';

  const movePlayer = (direction: MoveDirection) => {
    setPlayerPosition(([lng, lat]) => {
      const step = 0.0007;
      let newLng = lng, newLat = lat;
      switch (direction) {
        case 'up':    newLat += step; break;
        case 'down':  newLat -= step; break;
        case 'left':  newLng -= step; break;
        case 'right': newLng += step; break;
      }
      if (playerMarkerRef.current) playerMarkerRef.current.setLngLat([newLng, newLat]);
      mapRef.current?.setCenter([newLng, newLat]);
      return [newLng, newLat];
    });
  };

  const moveIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const handleMoveStart = (direction: MoveDirection, e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    if (moveIntervalRef.current) clearInterval(moveIntervalRef.current);
    movePlayer(direction);
    moveIntervalRef.current = setInterval(() => movePlayer(direction), 100);
  };

  const handleMoveEnd = () => {
    if (moveIntervalRef.current) {
      clearInterval(moveIntervalRef.current);
      moveIntervalRef.current = null;
    }
  };

  const handleRotate = (direction: 'left' | 'right') => {
    if (!mapRef.current) return;
    const currentBearing = mapRef.current.getBearing();
    const newBearing = direction === 'left' ? currentBearing - 15 : currentBearing + 15;
    mapRef.current.easeTo({
      bearing: newBearing,
      duration: 500,
    });
  };

  useEffect(() => {
    if (!mapRef.current) return;

    const targetOptions = {
      duration: 1500,
      pitch: mapView === 'angled' ? 75 : 0,
      bearing: mapView === 'angled' ? -20 : 0,
    };
    mapRef.current.easeTo(targetOptions);
  }, [mapView]);

  useEffect(() => {
    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

    mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current!,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [121.566972, 25.040472],
      zoom: 9,
      pitch: 0,
      bearing: 0
    });

    mapRef.current.on('load', () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const lng = pos.coords.longitude;
            const lat = pos.coords.latitude;
            mapRef.current?.setCenter([lng, lat]);
            if (markerRef.current) markerRef.current.remove();
            markerRef.current = new mapboxgl.Marker({ color: '#39ff14' })
              .setLngLat([lng, lat])
              .addTo(mapRef.current!);
            setPlayerPosition([lng, lat]);
            if (playerMarkerRef.current) playerMarkerRef.current.remove();
            playerMarkerRef.current = new mapboxgl.Marker({ color: '#39ff14' })
              .setLngLat([lng, lat])
              .setPopup(new mapboxgl.Popup({ offset: 25 }).setText('You'))
              .addTo(mapRef.current!);
          },
          (err) => {
            if (playerMarkerRef.current) playerMarkerRef.current.remove();
            playerMarkerRef.current = new mapboxgl.Marker({ color: '#39ff14' })
              .setLngLat([-74.5, 40])
              .setPopup(new mapboxgl.Popup({ offset: 25 }).setText('You'))
              .addTo(mapRef.current!);
          },
          { enableHighAccuracy: true }
        );
      } else {
        if (playerMarkerRef.current) playerMarkerRef.current.remove();
        playerMarkerRef.current = new mapboxgl.Marker({ color: '#39ff14' })
          .setLngLat([-74.5, 40])
          .setPopup(new mapboxgl.Popup({ offset: 25 }).setText('You'))
          .addTo(mapRef.current!);
      }
      
      const customLayer = new ThreeJSModelLayer('3d-model', TAIPEI101, 0);
      mapRef.current!.addLayer(customLayer);
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      let direction: MoveDirection | null = null;
      switch (e.key.toLowerCase()) {
        case 'arrowup': case 'w': direction = 'up'; break;
        case 'arrowdown': case 's': direction = 'down'; break;
        case 'arrowleft': case 'a': direction = 'left'; break;
        case 'arrowright': case 'd': direction = 'right'; break;
      }
      if (direction) {
        movePlayer(direction);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      mapRef.current?.remove();
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleLocate = () => {
    if (!navigator.geolocation || !mapRef.current) return;
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lng = pos.coords.longitude;
        const lat = pos.coords.latitude;
        mapRef.current?.flyTo({ center: [lng, lat], zoom: 15 });
        if (markerRef.current) markerRef.current.remove();
        markerRef.current = new mapboxgl.Marker({ color: '#39ff14' })
          .setLngLat([lng, lat])
          .addTo(mapRef.current!);
        setLoading(false);
      },
      (err) => {
        setLoading(false);
        alert('Can not postion');
      },
      { enableHighAccuracy: true }
    );
  };

  return (
    <>
      <div
        ref={mapContainerRef}
        className="fixed top-0 left-0 w-screen h-screen z-0"
      />
      {/* UI Elements */}
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={coordInput}
            onChange={(e) => {
              setCoordInput(e.target.value);
              if (coordError) setCoordError(null);
            }}
            onKeyDown={(e) => { if (e.key === 'Enter') handleFlyTo() }}
            placeholder="e.g., 121.56, 25.03"
            className="w-48 rounded-lg bg-black/60 px-4 py-2 text-white backdrop-blur-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#39ff14]"
          />
          <button
            onClick={handleFlyTo}
            className="rounded-lg bg-[#222] px-5 py-2 font-bold text-[#39ff14] transition-colors hover:bg-[#39ff14] hover:text-[#222]"
          >
            Fly
          </button>
        </div>
        {coordError && (
          <div className="mt-1 rounded-md bg-red-900/80 px-3 py-1 text-sm text-white backdrop-blur-sm">
            {coordError}
          </div>
        )}
      </div>
      <button
        onClick={handleLocate}
        disabled={loading}
        className={`
          fixed top-6 right-6 z-10
          bg-[#222] text-[#39ff14] border-2 border-[#39ff14] rounded-lg
          px-5 py-2 font-bold text-lg cursor-pointer shadow-[0_2px_12px_#0008]
          transition-colors duration-200
          hover:bg-[#39ff14] hover:text-[#222]
          disabled:opacity-60 disabled:cursor-not-allowed
        `}
      >
        {loading ? 'Locating...' : 'Return to my location'}
      </button>
      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-10 grid w-48 grid-cols-3 grid-rows-3 gap-2 sm:left-12 sm:-translate-x-0">
        <button onMouseDown={e => handleMoveStart('up', e)} onMouseUp={handleMoveEnd} onMouseLeave={handleMoveEnd} onTouchStart={e => handleMoveStart('up', e)} onTouchEnd={handleMoveEnd} className="col-start-2 row-start-1 rounded-xl bg-black/40 p-4 text-white backdrop-blur-sm active:bg-white/20">↑</button>
        <button onMouseDown={e => handleMoveStart('left', e)} onMouseUp={handleMoveEnd} onMouseLeave={handleMoveEnd} onTouchStart={e => handleMoveStart('left', e)} onTouchEnd={handleMoveEnd} className="col-start-1 row-start-2 rounded-xl bg-black/40 p-4 text-white backdrop-blur-sm active:bg-white/20">←</button>
        <button onMouseDown={e => handleMoveStart('down', e)} onMouseUp={handleMoveEnd} onMouseLeave={handleMoveEnd} onTouchStart={e => handleMoveStart('down', e)} onTouchEnd={handleMoveEnd} className="col-start-2 row-start-2 rounded-xl bg-black/40 p-4 text-white backdrop-blur-sm active:bg-white/20">↓</button>
        <button onMouseDown={e => handleMoveStart('right', e)} onMouseUp={handleMoveEnd} onMouseLeave={handleMoveEnd} onTouchStart={e => handleMoveStart('right', e)} onTouchEnd={handleMoveEnd} className="col-start-3 row-start-2 rounded-xl bg-black/40 p-4 text-white backdrop-blur-sm active:bg-white/20">→</button>
      </div>
      {/* View Control Buttons */}
      <div className="fixed bottom-10 right-10 z-10 flex flex-col items-end gap-2">
        <button
          onClick={() => setMapView(v => v === 'top-down' ? 'angled' : 'top-down')}
          className={`
            w-full bg-[#222] text-[#39ff14] border-2 border-[#39ff14] rounded-lg
            px-5 py-2 font-bold text-lg cursor-pointer shadow-[0_2px_12px_#0008]
            transition-colors duration-200
            hover:bg-[#39ff14] hover:text-[#222]
          `}
        >
          Toggle View
        </button>
        <div className="flex gap-2">
          <button
            onClick={() => handleRotate('left')}
            className={`
              bg-[#222] text-[#39ff14] border-2 border-[#39ff14] rounded-lg
              px-4 py-2 font-bold text-lg cursor-pointer shadow-[0_2px_12px_#0008]
              transition-colors duration-200
              hover:bg-[#39ff14] hover:text-[#222]
            `}
          >
            &lt;
          </button>
          <button
            onClick={() => handleRotate('right')}
            className={`
              bg-[#222] text-[#39ff14] border-2 border-[#39ff14] rounded-lg
              px-4 py-2 font-bold text-lg cursor-pointer shadow-[0_2px_12px_#0008]
              transition-colors duration-200
              hover:bg-[#39ff14] hover:text-[#222]
            `}
          >
            &gt;
          </button>
        </div>
      </div>
      {showLoading && (
        <div className="fixed top-0 left-0 w-screen h-screen z-20 flex items-center justify-center bg-black/20">
          <div
            className="w-16 h-16 border-[7px] border-[#39ff14] border-t-[#222] rounded-full animate-spin"
            style={{
              borderTopColor: '#222',
              borderWidth: 7,
            }}
          />
        </div>
      )}
      {showDialog && (
        <div className="fixed top-0 left-0 w-screen h-screen z-30 flex items-center justify-center bg-black/40">
          <div
            className="bg-[#181c24] rounded-2xl px-10 py-8 shadow-[0_2px_32px_#39ff1488] border-[2.5px] border-[#39ff14] text-center min-w-[320px]"
          >
            <div className="text-2xl text-[#39ff14] font-bold mb-4">Taipei 101 Challenge</div>
            <div className="text-lg text-white mb-7">
              You have arrived at Taipei 101. Would you like to start the LaserGame challenge?
            </div>
            <button
              onClick={handleStartLaserGame}
              className="text-lg px-8 py-2 rounded-lg border-none bg-gradient-to-r from-[#39ff14] to-[#00fff7] text-[#222] font-bold cursor-pointer mr-4"
            >
              Start Challenge
            </button>
            <button
              onClick={() => setShowDialog(false)}
              className="text-lg px-8 py-2 rounded-lg border-none bg-[#222] text-white font-bold cursor-pointer border-l-2 border-[#39ff14]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default MapComponent;