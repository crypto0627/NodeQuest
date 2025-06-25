'use client';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import RewardModal from './RewardModal';

export default function GameCanvas() {
  const ref = useRef<HTMLDivElement>(null);
  const [bossAlive, setBossAlive] = useState(true);
  const [bossHP, setBossHP] = useState(10);

  useEffect(() => {
    if (!ref.current) return;
    const w = window.innerWidth, h = window.innerHeight;
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-w/2,w/2,h/2,-h/2,1,1000);
    camera.position.z = 500;
    const renderer = new THREE.WebGLRenderer({ alpha:true });
    renderer.setSize(w,h);
    ref.current.appendChild(renderer.domElement);
    const loader = new THREE.TextureLoader();
    const playerTex = loader.load('/sprites/player.png');
    playerTex.repeat.set(0.25,1);
    const bossTex = loader.load('/sprites/boss.png');
    bossTex.repeat.set(0.25,1);
    const bgTex = loader.load('/sprites/bg.png');
    const bgMat = new THREE.SpriteMaterial({ map: bgTex });
    const bg = new THREE.Sprite(bgMat);
    bg.scale.set(w*1.2, h*1.2, 1);
    bg.position.set(0, 0, -200);
    scene.add(bg);

    const PLAYER_Y = -h/2 + 80;
    const BOSS_Y = h/2 - 120;

    const playerMat = new THREE.SpriteMaterial({ map: playerTex });
    const player = new THREE.Sprite(playerMat);
    player.scale.set(100,100,1);
    player.position.y = PLAYER_Y;
    scene.add(player);

    const bossMat = new THREE.SpriteMaterial({ map: bossTex });
    const boss = new THREE.Sprite(bossMat);
    boss.scale.set(200,200,1);
    boss.position.y = BOSS_Y;
    scene.add(boss);

    // Anim frames
    let frameP=0, frameB=0;
    const animInterval = setInterval(()=>{
      frameP=(frameP+1)%4; playerMat.map!.offset.x = frameP*0.25;
      frameB=(frameB+1)%4; bossMat.map!.offset.x = frameB*0.25;
    }, 150);

    const bullets: THREE.Sprite[] = [];
    const hitTexts: THREE.Sprite[] = [];
    let vx=0, canShoot=true;
    let hp = 10;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code==='ArrowLeft') vx = -8;
      if (e.code==='ArrowRight') vx = 8;
      if (e.code==='Space' && canShoot && bossAlive) {
        canShoot=false;
        shoot();
        setTimeout(()=> canShoot=true, 300);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    
    const handleKeyUp = (e: KeyboardEvent) => {
      if (['ArrowLeft','ArrowRight'].includes(e.code)) vx=0;
    };
    window.addEventListener('keyup', handleKeyUp);

    function shoot(){
      const bm = new THREE.SpriteMaterial({
        map: loader.load('/sprites/player.png')
      });
      const b = new THREE.Sprite(bm);
      b.scale.set(10,20,1);
      b.position.set(player.position.x, player.position.y+60,0);
      scene.add(b); bullets.push(b);
    }

    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      player.position.x += vx;
      if (player.position.x < -w/2 + 50) player.position.x = -w/2 + 50;
      if (player.position.x > w/2 - 50) player.position.x = w/2 - 50;
      
      for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        b.position.y += 6;
        const dx = Math.abs(b.position.x - boss.position.x);
        const dy = b.position.y - boss.position.y;
        if (bossAlive && dx<100 && dy > -100){
          hp--; setBossHP(hp);
          scene.remove(b); bullets.splice(i,1);

          // 閃光特效
          const flash = new THREE.Mesh(
            new THREE.CircleGeometry(20,16),
            new THREE.MeshBasicMaterial({ color:0xffffdd, transparent:true, opacity:0.8 })
          );
          flash.position.set(boss.position.x, boss.position.y,0);
          scene.add(flash);
          setTimeout(()=> scene.remove(flash),100);

          // 傷害數字
          const ctxC = document.createElement('canvas');
          ctxC.width=64; ctxC.height=32;
          const ctx = ctxC.getContext('2d')!;
          ctx.fillStyle='yellow'; ctx.font='24px Arial';
          ctx.fillText('-1',10,24);
          const hitTex = new THREE.CanvasTexture(ctxC);
          const hit = new THREE.Sprite(new THREE.SpriteMaterial({ map: hitTex }));
          hit.position.set(boss.position.x, boss.position.y,0);
          hit.scale.set(30,15,1);
          hit.userData = { life:1.0 };
          scene.add(hit); hitTexts.push(hit);

          if (hp <= 0){
            setBossAlive(false);
            scene.remove(boss);
          }
        }else if (b.position.y > h/2 + 50){
          scene.remove(b); bullets.splice(i,1);
        }
      }

      for (let i = hitTexts.length - 1; i >= 0; i--) {
        const ht = hitTexts[i];
        ht.position.y += 1;
        ht.material.opacity = ht.userData.life;
        ht.userData.life -= 0.02;
        if (ht.userData.life <= 0){
          scene.remove(ht); hitTexts.splice(i,1);
        }
      }

      renderer.render(scene, camera);
    };
    animate();

    const resize = () => {
      const W=window.innerWidth, H=window.innerHeight;
      camera.left=-W/2; camera.right=W/2;
      camera.top=H/2; camera.bottom=-H/2;
      camera.updateProjectionMatrix();
      renderer.setSize(W,H);
      bg.scale.set(W*1.2,H*1.2,1);
      // Note: player and boss Y positions are not updated on resize
    };
    window.addEventListener('resize', resize);

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      clearInterval(animInterval);
      cancelAnimationFrame(animationFrameId);
      ref.current?.removeChild(renderer.domElement);
    };
  }, []);

  return <>
    <div ref={ref} style={{ position:'relative' }}/>
    {!bossAlive && <RewardModal />}
    <div style={{
      position:'absolute', top:20, left:'50%', transform:'translateX(-50%)',
      width:'40%', height:'24px', border:'2px solid #fff'
    }}>
      <div style={{
        width: `${(bossHP/10)*100}%`, height:'100%', background:'red'
      }} />
    </div>
    <div style={{
      position:'absolute', top:10, left:10, color:'#fff'
    }}>←→ 移動｜空白鍵 射擊</div>
  </>;
}
