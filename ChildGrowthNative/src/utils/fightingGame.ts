import { AVAILABLE_AVATARS } from '../constants/fighters';
import { attackCapsule, attackSpec, capsulesOverlap, FIGHT_DT, FIGHT_HZ, hurtCapsules, isAttack } from './fighterRigging';

export type FighterAction = 'idle' | 'walk' | 'jump' | 'block' | 'jab' | 'kick' | 'special' | 'hit' | 'ko';
export type AttackAction = Extract<FighterAction, 'jab' | 'kick' | 'special'>;

export interface FightInput {
  move: -1 | 0 | 1;
  block: boolean;
  jump?: boolean;
  attack?: AttackAction;
}

export interface RealTimeFighter {
  id: string;
  hp: number;
  energy: number;
  x: number;
  y: number;
  velocityY: number;
  facing: -1 | 1;
  action: FighterAction;
  actionElapsed: number;
  attackConnected: boolean;
  combo: number;
  comboTimer: number;
  rounds: number;
}

export interface FightEvent {
  serial: number;
  attacker: 0 | 1;
  defender: 0 | 1;
  damage: number;
  blocked: boolean;
  action: AttackAction;
  combo: number;
  x: number;
  y: number;
}

export interface RealTimeFight {
  fighters: [RealTimeFighter, RealTimeFighter];
  phase: 'countdown' | 'fighting' | 'roundOver' | 'matchOver';
  phaseTime: number;
  round: number;
  timeLeft: number;
  winner: 0 | 1 | null;
  event: FightEvent | null;
  eventSerial: number;
  remainder: number;
  pendingInputs: [FightInput, FightInput];
  hitstop: number;
}

const ROUND_SECONDS = 60;
const MAX_ROUNDS_WON = 2;
const EMPTY_INPUT: FightInput = { move: 0, block: false };

const isLocked = (action: FighterAction) => isAttack(action) || action === 'hit' || action === 'ko';
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

function freshFighter(id: string, x: number, facing: -1 | 1, rounds = 0): RealTimeFighter {
  return { id, hp: 100, energy: 0, x, y: 0, velocityY: 0, facing, action: 'idle', actionElapsed: 0, attackConnected: false, combo: 0, comboTimer: 0, rounds };
}

export function newRealTimeFight(first: string, second: string): RealTimeFight {
  return {
    fighters: [freshFighter(first, 22, 1), freshFighter(second, 78, -1)],
    phase: 'countdown',
    phaseTime: 2.4,
    round: 1,
    timeLeft: ROUND_SECONDS,
    winner: null,
    event: null,
    eventSerial: 0,
    remainder: 0,
    pendingInputs: [{ ...EMPTY_INPUT }, { ...EMPTY_INPUT }],
    hitstop: 0,
  };
}

function fighterSpeed(id: string) {
  const speed = (AVAILABLE_AVATARS.find(fighter => fighter.id === id) || AVAILABLE_AVATARS[0]).speed;
  return 18 + clamp(speed, 10, 70) * 0.12;
}

function fighterDamage(id: string) {
  const attack = (AVAILABLE_AVATARS.find(fighter => fighter.id === id) || AVAILABLE_AVATARS[0]).attack;
  return clamp((attack - 15) * 0.035, 0, 2.5);
}

function startNextRound(state: RealTimeFight): RealTimeFight {
  const rounds: [number, number] = [state.fighters[0].rounds, state.fighters[1].rounds];
  return {
    ...state,
    fighters: [freshFighter(state.fighters[0].id, 22, 1, rounds[0]), freshFighter(state.fighters[1].id, 78, -1, rounds[1])],
    phase: 'countdown',
    phaseTime: 2.4,
    round: state.round + 1,
    timeLeft: ROUND_SECONDS,
    winner: null,
    event: null,
    hitstop: 0,
  };
}

function finishRound(state: RealTimeFight, winner: 0 | 1 | null): RealTimeFight {
  const fighters: [RealTimeFighter, RealTimeFighter] = [{ ...state.fighters[0] }, { ...state.fighters[1] }];
  if (winner !== null) fighters[winner].rounds += 1;
  fighters.forEach(fighter => { fighter.action = fighter.hp === 0 ? 'ko' : 'idle'; fighter.actionElapsed = 0; });
  const matchOver = winner !== null && fighters[winner].rounds >= MAX_ROUNDS_WON;
  return { ...state, fighters, phase: matchOver ? 'matchOver' : 'roundOver', phaseTime: matchOver ? 0 : 2.1, winner };
}

function beginAction(fighter: RealTimeFighter, input: FightInput) {
  if (isLocked(fighter.action)) return;
  if (input.attack && (input.attack !== 'special' || fighter.energy >= 100) && fighter.y === 0) {
    fighter.action = input.attack;
    fighter.actionElapsed = 0;
    fighter.attackConnected = false;
    if (input.attack === 'special') fighter.energy = 0;
    return;
  }
  if (input.jump && fighter.y === 0) {
    fighter.velocityY = 48;
    fighter.action = 'jump';
    fighter.actionElapsed = 0;
    return;
  }
  if (input.block && fighter.y === 0 && fighter.action !== 'block') {
    fighter.action = 'block';
    fighter.actionElapsed = 0;
  }
}

function advanceFighter(fighter: RealTimeFighter, input: FightInput, dt: number) {
  const previousAction = fighter.action;
  fighter.actionElapsed += dt;
  fighter.comboTimer = Math.max(0, fighter.comboTimer - dt);
  if (fighter.comboTimer === 0) fighter.combo = 0;

  if (fighter.y > 0 || fighter.velocityY > 0) {
    fighter.y = Math.max(0, fighter.y + fighter.velocityY * dt - 0.5 * 105 * dt * dt);
    fighter.velocityY -= 105 * dt;
    if (fighter.y === 0) fighter.velocityY = 0;
  }

  if (isAttack(previousAction) && fighter.actionElapsed * FIGHT_HZ + 1e-8 >= attackSpec(fighter.id, previousAction).total) {
    fighter.action = fighter.y > 0 ? 'jump' : 'idle';
    fighter.actionElapsed = 0;
  } else if (previousAction === 'hit' && fighter.actionElapsed >= 0.34) {
    fighter.action = fighter.y > 0 ? 'jump' : 'idle';
    fighter.actionElapsed = 0;
  }

  if (!isLocked(fighter.action)) {
    if (input.block && fighter.y === 0) {
      fighter.action = 'block';
    } else if (fighter.y > 0) {
      fighter.action = 'jump';
    } else if (input.move !== 0) {
      fighter.action = 'walk';
      fighter.x = clamp(fighter.x + input.move * fighterSpeed(fighter.id) * dt, 7, 93);
    } else {
      fighter.action = 'idle';
    }
  }
  if (fighter.action !== previousAction) fighter.actionElapsed = 0;
}

function findContact(state: RealTimeFight, attackerIndex: 0 | 1) {
  const defenderIndex = (1 - attackerIndex) as 0 | 1;
  const attacker = state.fighters[attackerIndex];
  const defender = state.fighters[defenderIndex];
  if (!isAttack(attacker.action) || attacker.attackConnected) return;
  const attack = attackSpec(attacker.id, attacker.action);
  const facingTarget = Math.sign(defender.x - attacker.x) === attacker.facing;
  if (!facingTarget) return;
  const hurt = hurtCapsules(defender);
  // Four samples per simulation tick (240 Hz sweep approximation) prevent thin
  // blades skipping a target between poses. Active frames, not a distance gate.
  let contact = null;
  for (let sample = 0; sample <= 4; sample++) {
    const time = attacker.actionElapsed - FIGHT_DT + FIGHT_DT * sample / 4;
    const frame = time * FIGHT_HZ;
    if (frame + 1e-8 < attack.startup || frame >= attack.startup + attack.active) continue;
    const capsule = attackCapsule({ ...attacker, actionElapsed: time });
    if (capsule && hurt.some(target => capsulesOverlap(capsule, target))) { contact = capsule; break; }
  }
  if (!contact) return;

  const blocked = defender.action === 'block' && Math.sign(attacker.x - defender.x) === defender.facing;
  const rawDamage = attack.damage + fighterDamage(attacker.id);
  const damage = Math.max(1, Math.round(rawDamage * (blocked ? 0.25 : 1)));
  return { attackerIndex, defenderIndex, action: attacker.action, attack, damage, blocked, x: contact.b.x, y: contact.b.y };
}

function applyContact(state: RealTimeFight, hit: NonNullable<ReturnType<typeof findContact>>) {
  const { attackerIndex, defenderIndex, attack, damage, blocked, action, x, y } = hit;
  const attacker = state.fighters[attackerIndex], defender = state.fighters[defenderIndex];
  attacker.attackConnected = true;
  defender.hp = Math.max(0, defender.hp - damage);
  attacker.energy = clamp(attacker.energy + attack.energy, 0, 100);
  defender.energy = clamp(defender.energy + (blocked ? 10 : 6), 0, 100);
  const direction = attacker.x < defender.x ? 1 : -1;
  defender.x = clamp(defender.x + direction * attack.knockback * (blocked ? 0.35 : 1), 7, 93);
  if (!blocked && defender.hp > 0) {
    defender.action = 'hit';
    defender.actionElapsed = 0;
  }
  if (!blocked) {
    attacker.combo = attacker.comboTimer > 0 ? attacker.combo + 1 : 1;
    attacker.comboTimer = 1.15;
  } else {
    attacker.combo = 0;
    attacker.comboTimer = 0;
  }
  state.eventSerial += 1;
  state.event = { serial: state.eventSerial, attacker: attackerIndex, defender: defenderIndex, damage, blocked, action, combo: attacker.combo, x, y };
  state.hitstop = Math.max(state.hitstop, blocked ? 2 : action === 'special' ? 6 : 3);
}

function fixedTick(current: RealTimeFight, inputs: [FightInput, FightInput]): RealTimeFight {
  const dt = FIGHT_DT;
  if (current.phase === 'matchOver' || current.phase === 'roundOver') {
    const fighters = current.fighters.map(f => ({ ...f, actionElapsed: Math.min(1.5, f.actionElapsed + dt) })) as [RealTimeFighter, RealTimeFighter];
    current = { ...current, fighters };
  }
  if (current.phase === 'matchOver') return current;
  if (current.phase === 'roundOver') {
    const phaseTime = current.phaseTime - dt;
    return phaseTime <= 1e-8 ? startNextRound(current) : { ...current, phaseTime };
  }
  if (current.phase === 'countdown') {
    const phaseTime = current.phaseTime - dt;
    return phaseTime <= 1e-8 ? { ...current, phase: 'fighting', phaseTime: 0 } : { ...current, phaseTime };
  }
  if (current.hitstop > 0) return { ...current, hitstop: current.hitstop - 1 };

  const next: RealTimeFight = { ...current, fighters: [{ ...current.fighters[0] }, { ...current.fighters[1] }] };
  next.timeLeft = Math.max(0, next.timeLeft - dt);

  beginAction(next.fighters[0], inputs[0] || EMPTY_INPUT);
  beginAction(next.fighters[1], inputs[1] || EMPTY_INPUT);
  advanceFighter(next.fighters[0], inputs[0] || EMPTY_INPUT, dt);
  advanceFighter(next.fighters[1], inputs[1] || EMPTY_INPUT, dt);

  const leftFirst = next.fighters[0].x <= next.fighters[1].x;
  next.fighters[0].facing = leftFirst ? 1 : -1;
  next.fighters[1].facing = leftFirst ? -1 : 1;
  if (Math.abs(next.fighters[0].x - next.fighters[1].x) < 11) {
    const middle = (next.fighters[0].x + next.fighters[1].x) / 2;
    next.fighters[0].x = clamp(middle + (leftFirst ? -5.5 : 5.5), 7, 93);
    next.fighters[1].x = clamp(middle + (leftFirst ? 5.5 : -5.5), 7, 93);
  }

  // Resolve both contacts from the same snapshot so player 0 has no priority.
  const hits = [findContact(next, 0), findContact(next, 1)];
  hits.forEach(hit => { if (hit) applyContact(next, hit); });

  if (next.fighters.every(fighter => fighter.hp <= 0)) return finishRound(next, null);
  if (next.fighters[0].hp <= 0) return finishRound(next, 1);
  if (next.fighters[1].hp <= 0) return finishRound(next, 0);
  if (next.timeLeft <= 1e-8) return finishRound(next, next.fighters[0].hp === next.fighters[1].hp ? null : next.fighters[0].hp > next.fighters[1].hp ? 0 : 1);
  return next;
}

export function stepRealTimeFight(current: RealTimeFight, inputs: [FightInput, FightInput], elapsedSeconds: number): RealTimeFight {
  if (!Number.isFinite(elapsedSeconds) || elapsedSeconds < 0) return current;
  // Cap catch-up after backgrounding; normal 30/60/120 Hz rendering is identical.
  let remaining = current.remainder + Math.min(elapsedSeconds, 0.25);
  let next = current;
  const pending = inputs.map((input, i) => ({ ...input, attack: input.attack || current.pendingInputs[i].attack, jump: input.jump || current.pendingInputs[i].jump })) as [FightInput, FightInput];
  let edgesConsumed = false;
  while (remaining + 1e-8 >= FIGHT_DT) {
    const canConsume = next.phase === 'fighting' && next.hitstop === 0;
    const tickInputs = pending.map(input => ({ ...input, attack: edgesConsumed ? undefined : input.attack, jump: !edgesConsumed && input.jump })) as [FightInput, FightInput];
    next = fixedTick(next, tickInputs);
    if (canConsume) edgesConsumed = true;
    remaining -= FIGHT_DT;
  }
  return { ...next, remainder: Math.max(0, remaining), pendingInputs: pending.map(input => ({ ...input, attack: edgesConsumed ? undefined : input.attack, jump: !edgesConsumed && input.jump })) as [FightInput, FightInput] };
}

export function chooseAiInput(state: RealTimeFight): FightInput {
  if (state.phase !== 'fighting') return EMPTY_INPUT;
  const ai = state.fighters[1];
  const player = state.fighters[0];
  const distance = Math.abs(ai.x - player.x);
  const toward = Math.sign(player.x - ai.x) as -1 | 0 | 1;
  if (isLocked(ai.action)) return EMPTY_INPUT;
  if (player.action === 'special' && distance < 28) return { move: 0, block: true };
  if (distance > 16) return { move: toward, block: false, jump: distance > 45 && state.timeLeft % 5 < 0.05 };
  if (ai.energy >= 100) return { move: 0, block: false, attack: 'special' };
  // A training rival should telegraph openings instead of chaining attacks every
  // time an animation ends. This three-second rhythm leaves room to react.
  const beat = Math.floor(state.timeLeft * 3) % 9;
  if (beat <= 1) return { move: 0, block: true };
  if (beat === 3) return { move: 0, block: false, attack: 'jab' };
  if (beat === 6) return { move: 0, block: false, attack: 'kick' };
  return EMPTY_INPUT;
}
