import { AVAILABLE_AVATARS } from '../constants/fighters';
import { attackCapsule, attackSpec, capsuleContact, fighterBody, fighterPose, FIGHT_DT, FIGHT_HZ, hurtCapsules, isAttack, Point, PoseContext, RIG_SCALE } from './fighterRigging';

export type FighterAction = 'idle' | 'walk' | 'takeoff' | 'jump' | 'land' | 'block' | 'jab' | 'kick' | 'special' | 'hit' | 'ko' | 'victory';
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
  poseContext: PoseContext;
  recoil: number;
  bufferedAction: { attack?: AttackAction; jump?: boolean; frames: number } | null;
  footwork: {
    feet: [Point, Point]; next: 0 | 1;
    step: null | { leg: 0 | 1; from: Point; to: Point; elapsed: number; duration: number };
  };
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
export const INPUT_BUFFER_FRAMES = 7;

const isLocked = (action: FighterAction) => isAttack(action) || action === 'hit' || action === 'ko' || action === 'victory' || action === 'takeoff' || action === 'land';
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

function freshFighter(id: string, x: number, facing: -1 | 1, rounds = 0): RealTimeFighter {
  const fighter: RealTimeFighter = { id, hp: 100, energy: 0, x, y: 0, velocityY: 0, facing, action: 'idle', actionElapsed: 0, attackConnected: false, combo: 0, comboTimer: 0, rounds, poseContext: {}, recoil: 0, bufferedAction: null, footwork: { feet: [{ x: 0, y: 0 }, { x: 0, y: 0 }], next: 1, step: null } };
  resetFighterFootwork(fighter);
  return fighter;
}

/** Also used when a training scene teleports a fighter to a new position. */
export function resetFighterFootwork(fighter: RealTimeFighter) {
  const body = fighterBody(fighter.id);
  const foot = (side: number) => ({ x: fighter.x + side * body.stance * body.height * RIG_SCALE * fighter.facing, y: -5 * body.height * RIG_SCALE });
  fighter.footwork = { feet: [foot(1), foot(-1)], next: 1, step: null };
  updateFootContext(fighter);
}

function updateFootContext(fighter: RealTimeFighter) {
  fighter.poseContext = { ...fighter.poseContext, feet: fighter.footwork.feet.map(p => ({ x: (p.x - fighter.x) / RIG_SCALE * fighter.facing, y: p.y / RIG_SCALE })) as [Point, Point] };
}

function changeAction(fighter: RealTimeFighter, action: FighterAction) {
  if (fighter.action === action) return;
  const previous = fighterPose(fighter).targets;
  fighter.action = action;
  fighter.actionElapsed = 0;
  fighter.poseContext = { ...fighter.poseContext, previous, transition: 0 };
}

function advanceFootwork(fighter: RealTimeFighter, dt: number, dx: number) {
  if (fighter.y > 0 || fighter.action === 'ko') return;
  const body = fighterBody(fighter.id);
  let { feet, step, next } = fighter.footwork;
  feet = [{ ...feet[0] }, { ...feet[1] }];
  const moving = fighter.action === 'walk' && Math.abs(dx) > 0.00001;
  const canStep = fighter.action === 'walk' || fighter.action === 'idle' || fighter.action === 'victory';
  // Finish an in-flight step when an attack interrupts walking. Cancelling it
  // here would leave the supporting boot hovering for the whole attack.
  if (!canStep && step) step = { ...step, to: { ...step.to, x: feet[step.leg].x }, duration: Math.min(step.duration, step.elapsed + 0.05) };
  const desired = (leg: number, forecast = 0): Point => ({ x: fighter.x + (leg === 0 ? 1 : -1) * body.stance * body.height * RIG_SCALE * fighter.facing + forecast, y: -5 * body.height * RIG_SCALE });
  if (!step && canStep) {
    const leg = moving ? next : Math.abs(feet[0].x - desired(0).x) > Math.abs(feet[1].x - desired(1).x) ? 0 : 1;
    if (moving || Math.abs(feet[leg].x - desired(leg).x) > 0.1 || feet[leg].y < desired(leg).y - 0.1) {
      const duration = moving ? 0.15 + body.weight * 0.025 : 0.14;
      step = { leg, from: feet[leg], to: desired(leg, moving ? dx / dt * duration : 0), elapsed: 0, duration };
    }
  }
  if (step) {
    step = { ...step, elapsed: Math.min(step.duration, step.elapsed + dt) };
    const t = step.elapsed / step.duration;
    const ease = t * t * (3 - 2 * t);
    feet[step.leg] = { x: step.from.x + (step.to.x - step.from.x) * ease, y: step.from.y + (step.to.y - step.from.y) * ease - Math.sin(t * Math.PI) * (moving ? 2.6 : 1.5) };
    fighter.poseContext = { ...fighter.poseContext, stridePhase: (step.leg + t) / 2, moveDirection: Math.sign(dx) * fighter.facing };
    if (t === 1) { next = (1 - step.leg) as 0 | 1; step = null; }
  }
  fighter.footwork = { feet, next, step };
  updateFootContext(fighter);
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
  fighters.forEach((fighter, index) => { fighter.bufferedAction = null; fighter.recoil = 0; changeAction(fighter, fighter.hp === 0 ? 'ko' : index === winner ? 'victory' : 'idle'); });
  const matchOver = winner !== null && fighters[winner].rounds >= MAX_ROUNDS_WON;
  return { ...state, fighters, phase: matchOver ? 'matchOver' : 'roundOver', phaseTime: matchOver ? 0 : 2.1, winner };
}

function beginAction(fighter: RealTimeFighter, input: FightInput) {
  // One recent intention, not an attack queue. It expires in simulation frames
  // and freezes during hitstop, so early taps never become surprise attacks.
  if (input.attack || input.jump) fighter.bufferedAction = { attack: input.attack, jump: !input.attack && input.jump, frames: INPUT_BUFFER_FRAMES };
  const buffered = fighter.bufferedAction;
  if (buffered) fighter.bufferedAction = buffered.frames > 1 ? { ...buffered, frames: buffered.frames - 1 } : null;
  // Holding guard cancels a queued offensive action immediately.
  if (input.block) { fighter.bufferedAction = null; if (!isLocked(fighter.action) && fighter.y === 0) changeAction(fighter, 'block'); return; }
  if (isLocked(fighter.action)) return;
  if (buffered?.attack && (buffered.attack !== 'special' || fighter.energy >= 100) && fighter.y === 0) {
    changeAction(fighter, buffered.attack);
    fighter.bufferedAction = null;
    fighter.attackConnected = false;
    if (buffered.attack === 'special') fighter.energy = 0;
    return;
  }
  if (buffered?.jump && fighter.y === 0) {
    fighter.bufferedAction = null;
    changeAction(fighter, 'takeoff');
    return;
  }
  if (input.block && fighter.y === 0 && fighter.action !== 'block') {
    changeAction(fighter, 'block');
  }
}

/** Clear both render-frame edges and the short simulation buffer on pause/blur. */
export function clearFightInputs(state: RealTimeFight): RealTimeFight {
  return { ...state, pendingInputs: [{ ...EMPTY_INPUT }, { ...EMPTY_INPUT }], fighters: state.fighters.map(f => ({ ...f, bufferedAction: null })) as [RealTimeFighter, RealTimeFighter] };
}

function advanceRecoil(fighter: RealTimeFighter, dt: number) {
  if (Math.abs(fighter.recoil) < 0.001) { fighter.recoil = 0; return; }
  const shift = fighter.recoil * (1 - Math.exp(-dt / 0.065));
  const oldX = fighter.x;
  fighter.x = clamp(fighter.x + shift, 7, 93);
  fighter.recoil = fighter.x === 7 || fighter.x === 93 ? 0 : fighter.recoil - shift;
  // Recoil is a planted slide, not a step. Move the anchors with the body.
  fighter.footwork = { ...fighter.footwork, step: null, feet: fighter.footwork.feet.map(p => ({ ...p, x: p.x + fighter.x - oldX })) as [Point, Point] };
  updateFootContext(fighter);
}

function advanceFighter(fighter: RealTimeFighter, input: FightInput, dt: number) {
  const previousAction = fighter.action;
  fighter.actionElapsed += dt;
  fighter.poseContext = { ...fighter.poseContext, transition: Math.min(1, (fighter.poseContext.transition ?? 1) + dt / 0.08) };
  fighter.comboTimer = Math.max(0, fighter.comboTimer - dt);
  if (fighter.comboTimer === 0) fighter.combo = 0;

  if (fighter.action === 'takeoff' && fighter.actionElapsed + 1e-8 >= 0.1) {
    changeAction(fighter, 'jump');
    fighter.velocityY = 48;
  }
  if (fighter.y > 0 || fighter.velocityY > 0) {
    fighter.y = Math.max(0, fighter.y + fighter.velocityY * dt - 0.5 * 105 * dt * dt);
    fighter.velocityY -= 105 * dt;
    if (fighter.y === 0) {
      fighter.velocityY = 0;
      changeAction(fighter, 'land');
      resetFighterFootwork(fighter);
    }
  }

  if (isAttack(previousAction) && fighter.actionElapsed * FIGHT_HZ + 1e-8 >= attackSpec(fighter.id, previousAction).total) {
    changeAction(fighter, fighter.y > 0 ? 'jump' : 'idle');
  } else if (previousAction === 'hit' && fighter.actionElapsed >= 0.34) {
    changeAction(fighter, fighter.y > 0 ? 'jump' : 'idle');
  } else if (previousAction === 'land' && fighter.actionElapsed + 1e-8 >= 0.18) {
    changeAction(fighter, 'idle');
  }

  if (!isLocked(fighter.action)) {
    if (input.block && fighter.y === 0) {
      changeAction(fighter, 'block');
    } else if (fighter.y > 0) {
      changeAction(fighter, 'jump');
    } else if (input.move !== 0) {
      changeAction(fighter, 'walk');
      fighter.x = clamp(fighter.x + input.move * fighterSpeed(fighter.id) * dt, 7, 93);
    } else {
      changeAction(fighter, 'idle');
    }
  }
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
    if (capsule) {
      contact = hurt.map(target => capsuleContact(capsule, target)).find(p => p !== null) ?? null;
      if (contact) break;
    }
  }
  if (!contact) return;

  const blocked = defender.action === 'block' && Math.sign(attacker.x - defender.x) === defender.facing;
  const rawDamage = attack.damage + fighterDamage(attacker.id);
  const damage = Math.max(1, Math.round(rawDamage * (blocked ? 0.25 : 1)));
  return { attackerIndex, defenderIndex, action: attacker.action, attack, damage, blocked, x: contact.x, y: contact.y };
}

function applyContact(state: RealTimeFight, hit: NonNullable<ReturnType<typeof findContact>>) {
  const { attackerIndex, defenderIndex, attack, damage, blocked, action, x, y } = hit;
  const attacker = state.fighters[attackerIndex], defender = state.fighters[defenderIndex];
  attacker.attackConnected = true;
  defender.hp = Math.max(0, defender.hp - damage);
  attacker.energy = clamp(attacker.energy + attack.energy, 0, 100);
  defender.energy = clamp(defender.energy + (blocked ? 10 : 6), 0, 100);
  const direction = attacker.x < defender.x ? 1 : -1;
  defender.recoil += direction * attack.knockback * (blocked ? 0.35 : 1);
  if (!blocked && defender.hp > 0) {
    defender.bufferedAction = null;
    changeAction(defender, 'hit');
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
    const fighters = current.fighters.map(f => {
      const y = Math.max(0, f.y + f.velocityY * dt - 0.5 * 105 * dt * dt);
      const next = { ...f, y, velocityY: y === 0 ? 0 : f.velocityY - 105 * dt, actionElapsed: Math.min(1.5, f.actionElapsed + dt), poseContext: { ...f.poseContext, transition: Math.min(1, (f.poseContext.transition ?? 1) + dt / 0.08) } };
      advanceFootwork(next, dt, 0);
      return next;
    }) as [RealTimeFighter, RealTimeFighter];
    current = { ...current, fighters };
  }
  if (current.phase === 'matchOver') return current;
  if (current.phase === 'roundOver') {
    const phaseTime = current.phaseTime - dt;
    return phaseTime <= 1e-8 ? startNextRound(current) : { ...current, phaseTime };
  }
  if (current.phase === 'countdown') {
    const phaseTime = current.phaseTime - dt;
    const fighters = current.fighters.map(f => ({ ...f, actionElapsed: f.actionElapsed + dt })) as [RealTimeFighter, RealTimeFighter];
    return phaseTime <= 1e-8 ? { ...current, fighters, phase: 'fighting', phaseTime: 0 } : { ...current, fighters, phaseTime };
  }
  if (current.hitstop > 0) return { ...current, hitstop: current.hitstop - 1 };

  const next: RealTimeFight = { ...current, fighters: [{ ...current.fighters[0] }, { ...current.fighters[1] }] };
  next.timeLeft = Math.max(0, next.timeLeft - dt);

  beginAction(next.fighters[0], inputs[0] || EMPTY_INPUT);
  beginAction(next.fighters[1], inputs[1] || EMPTY_INPUT);
  advanceFighter(next.fighters[0], inputs[0] || EMPTY_INPUT, dt);
  advanceFighter(next.fighters[1], inputs[1] || EMPTY_INPUT, dt);
  next.fighters.forEach(fighter => advanceRecoil(fighter, dt));

  const leftFirst = next.fighters[0].x <= next.fighters[1].x;
  next.fighters[0].facing = leftFirst ? 1 : -1;
  next.fighters[1].facing = leftFirst ? -1 : 1;
  if (Math.abs(next.fighters[0].x - next.fighters[1].x) < 11) {
    const middle = (next.fighters[0].x + next.fighters[1].x) / 2;
    next.fighters[0].x = clamp(middle + (leftFirst ? -5.5 : 5.5), 7, 93);
    next.fighters[1].x = clamp(middle + (leftFirst ? 5.5 : -5.5), 7, 93);
  }
  next.fighters.forEach((fighter, i) => advanceFootwork(fighter, dt, fighter.x - current.fighters[i].x));

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
  const pending = inputs.map((input, i) => ({ ...input, attack: current.phase === 'fighting' ? input.attack || current.pendingInputs[i].attack : undefined, jump: current.phase === 'fighting' && (input.jump || current.pendingInputs[i].jump) })) as [FightInput, FightInput];
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
