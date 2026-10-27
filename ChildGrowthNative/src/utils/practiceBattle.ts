export interface Combatant { hp: number; attack: number; speed: number }
export interface PracticeState { playerHP: number; rivalHP: number; turn: number; skillReadyAt: number; log: string; finished: boolean }
export type Move = 'attack' | 'guard' | 'skill';
export function newPractice(player: Combatant, rival: Combatant): PracticeState {
  return { playerHP: player.hp, rivalHP: rival.hp, turn: 0, skillReadyAt: 0, log: 'Choose your first move.', finished: false };
}
export function practiceTurn(state: PracticeState, move: Move, player: Combatant, rival: Combatant): PracticeState {
  if (state.finished || (move === 'skill' && state.turn < state.skillReadyAt)) return state;
  // A predictable, local turn-based training mode. No coins or losses of owned items.
  const rivalGuarding = state.turn % 3 === 2;
  const damage = move === 'guard' ? 0 : Math.round(player.attack * (move === 'skill' ? 1.6 : 1) * (rivalGuarding ? 0.5 : 1));
  const rivalHP = Math.max(0, state.rivalHP - damage);
  const incoming = rivalHP === 0 ? 0 : Math.round(rival.attack * (state.turn % 3 === 1 ? 1.3 : 0.8) * (move === 'guard' ? 0.25 : 1));
  const playerHP = Math.max(0, state.playerHP - incoming);
  const finished = playerHP === 0 || rivalHP === 0;
  return { playerHP, rivalHP, turn: state.turn + 1, skillReadyAt: move === 'skill' ? state.turn + 3 : state.skillReadyAt,
    finished, log: finished ? rivalHP === 0 ? 'You won! Great practice.' : 'Good effort. Try guarding before the rival’s strong attack.' : `${move === 'guard' ? 'You guarded' : `You dealt ${damage} damage`}. Rival dealt ${incoming}.${rivalGuarding ? ' Rival guarded this turn.' : ''}` };
}
