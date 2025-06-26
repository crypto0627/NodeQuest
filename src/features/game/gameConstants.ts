// src/features/game/gameConstants.ts
export const STATE = {
  COUNTDOWN: 'COUNTDOWN',
  PLAYING: 'PLAYING',
  GAMEOVER: 'GAMEOVER',
  WIN: 'WIN',
} as const;

export type GameState = (typeof STATE)[keyof typeof STATE]; 