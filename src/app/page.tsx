'use client'
import dynamic from "next/dynamic";
import LaserCorridorGame from "@/components/LaserCorridorGame";
import { useState } from 'react';

const MapWithNoSSR = dynamic(() => import('@/components/Mapbox'), {
  ssr: false
});
export default function Home() {
  const [showLaserGame, setShowLaserGame] = useState(false);
  const [gameKey, setGameKey] = useState(0);
  const handleRestart = () => setGameKey(k => k + 1);
  return (
    <>
      {!showLaserGame && (
        <MapWithNoSSR onStartLaserGame={() => setShowLaserGame(true)} />
      )}
      {showLaserGame && (
        <LaserCorridorGame key={gameKey} onClose={() => setShowLaserGame(false)} onRestart={handleRestart} />
      )}
    </>
  )
}