import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

interface MapComponentProps {
  onStartLaserGame?: () => void;
}

const MapComponent: React.FC<MapComponentProps> = ({ onStartLaserGame }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const playerMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const [playerPosition, setPlayerPosition] = useState<[number, number]>([-74.5, 40] as [number, number]); // [lng, lat]
  const [loading, setLoading] = useState(false);
  const [showLoading, setShowLoading] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [hasTriggeredChallenge, setHasTriggeredChallenge] = useState(false);

  // 台北101座標
  const TAIPEI101 = [121.564444, 25.033611];
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
  }, [playerPosition]);

  // Dialog 按下確認
  const handleStartLaserGame = () => {
    setShowDialog(false);
    if (onStartLaserGame) {
      onStartLaserGame();
    } else {
      alert('Start LaserGame Challenge！(Please connect to LaserCorridorGame)');
    }
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

  useEffect(() => {
    // Add your Mapbox access token here
    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

    // Initialize the map
    mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current!,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [-74.5, 40], // starting position [lng, lat]
      zoom: 9, // starting zoom
      pitch: 0,
      bearing: 0
    });

    // 等地圖載入後再做定位與 marker
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
            // 設定 player 初始位置
            setPlayerPosition([lng, lat]);
            // 新增 player marker
            if (playerMarkerRef.current) playerMarkerRef.current.remove();
            playerMarkerRef.current = new mapboxgl.Marker({ color: '#39ff14' })
              .setLngLat([lng, lat])
              .setPopup(new mapboxgl.Popup({ offset: 25 }).setText('You'))
              .addTo(mapRef.current!);
          },
          (err) => {
            // 定位失敗，維持預設中心
            // 新增 player marker 在預設中心
            if (playerMarkerRef.current) playerMarkerRef.current.remove();
            playerMarkerRef.current = new mapboxgl.Marker({ color: '#39ff14' })
              .setLngLat([-74.5, 40])
              .setPopup(new mapboxgl.Popup({ offset: 25 }).setText('You'))
              .addTo(mapRef.current!);
          },
          { enableHighAccuracy: true }
        );
      } else {
        // 新增 player marker 在預設中心
        if (playerMarkerRef.current) playerMarkerRef.current.remove();
        playerMarkerRef.current = new mapboxgl.Marker({ color: '#39ff14' })
          .setLngLat([-74.5, 40])
          .setPopup(new mapboxgl.Popup({ offset: 25 }).setText('You'))
          .addTo(mapRef.current!);
      }
      // 新增台北101標點
      new mapboxgl.Marker({ color: '#ff2222' })
        .setLngLat([121.564444, 25.033611])
        .setPopup(new mapboxgl.Popup({ offset: 25 }).setText('Taipei 101'))
        .addTo(mapRef.current!);
    });

    // 監聽鍵盤移動
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

    // Clean up on unmount
    return () => {
      mapRef.current?.remove();
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // 點擊按鈕回到 GPS 位置
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
      {/* On-screen controls for mobile */}
      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-10 grid w-48 grid-cols-3 grid-rows-3 gap-2 sm:left-12 sm:-translate-x-0">
        <button onMouseDown={e => handleMoveStart('up', e)} onMouseUp={handleMoveEnd} onMouseLeave={handleMoveEnd} onTouchStart={e => handleMoveStart('up', e)} onTouchEnd={handleMoveEnd} className="col-start-2 row-start-1 rounded-xl bg-black/40 p-4 text-white backdrop-blur-sm active:bg-white/20">↑</button>
        <button onMouseDown={e => handleMoveStart('left', e)} onMouseUp={handleMoveEnd} onMouseLeave={handleMoveEnd} onTouchStart={e => handleMoveStart('left', e)} onTouchEnd={handleMoveEnd} className="col-start-1 row-start-2 rounded-xl bg-black/40 p-4 text-white backdrop-blur-sm active:bg-white/20">←</button>
        <button onMouseDown={e => handleMoveStart('down', e)} onMouseUp={handleMoveEnd} onMouseLeave={handleMoveEnd} onTouchStart={e => handleMoveStart('down', e)} onTouchEnd={handleMoveEnd} className="col-start-2 row-start-2 rounded-xl bg-black/40 p-4 text-white backdrop-blur-sm active:bg-white/20">↓</button>
        <button onMouseDown={e => handleMoveStart('right', e)} onMouseUp={handleMoveEnd} onMouseLeave={handleMoveEnd} onTouchStart={e => handleMoveStart('right', e)} onTouchEnd={handleMoveEnd} className="col-start-3 row-start-2 rounded-xl bg-black/40 p-4 text-white backdrop-blur-sm active:bg-white/20">→</button>
      </div>
      {/* Loading animation */}
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
      {/* Dialog */}
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