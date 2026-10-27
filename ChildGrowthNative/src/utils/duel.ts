export type DuelMove = 'attack' | 'guard' | 'skill';
export interface Skill { damage: number; heal?: number; shield?: number; burn?: number; weaken?: boolean; pierce?: boolean; cost?: number; charge?: number; cooldown?: number }
export const DUEL_SKILLS: Record<string, Skill> = {
  roblox_noob: { damage: 20, shield: 4 },
  roblox_bacon_hair: { damage: 14, burn: 4 },
  roblox_guest: { damage: 10, shield: 12 },
  roblox_builderman: { damage: 0, shield: 25 },
  roblox_flamingo: { damage: 0, heal: 18, weaken: true },
  roblox_ninja: { damage: 24, cooldown: 4 },
  roblox_dominus: { damage: 22, pierce: true },
  roblox_wizard: { damage: 30, cost: 6 },
  roblox_cyber: { damage: 20, charge: 6 },
  roblox_unicorn: { damage: 0, heal: 24 },
  roblox_dragon: { damage: 16, weaken: true },
  roblox_bloxy: { damage: 18, heal: 8 },
};
export interface DuelPlayer { fighter: string; hp: number; shield: number; guarding: boolean; burn: number; burnTurns: number; weakened: boolean; charge: number; readyAt: number }
export interface Duel { players: [DuelPlayer, DuelPlayer]; active: 0 | 1; turn: number; winner: 0 | 1 | null; event: { key: string; actor: number; damage?: number; health?: number } | null }
export function newDuel(a: string, b: string): Duel {
  const player = (fighter: string): DuelPlayer => ({ fighter, hp: 100, shield: 0, guarding: false, burn: 0, burnTurns: 0, weakened: false, charge: 0, readyAt: 0 });
  return { players: [player(a), player(b)], active: 0, turn: 0, winner: null, event: null };
}
export function duelTurn(state: Duel, move: DuelMove): Duel {
  if (state.winner !== null || (move === 'skill' && state.turn < state.players[state.active].readyAt)) return state;
  const next: Duel = { ...state, players: [{ ...state.players[0] }, { ...state.players[1] }] };
  const actor = state.active, target = (1 - actor) as 0 | 1;
  const me = next.players[actor], rival = next.players[target];
  if (me.burnTurns > 0) {
    const damage = Math.min(me.hp, me.burn);
    me.hp -= damage; me.burnTurns--;
    if (!me.hp) {
      next.winner = target; next.turn++; next.active = target;
      next.event = { key: 'arena_damage', actor: target, damage };
      return next;
    }
  }
  me.guarding = move === 'guard';
  let damage = move === 'attack' ? 14 : 0;
  let heal = 0;
  const skill = DUEL_SKILLS[me.fighter] || DUEL_SKILLS.roblox_noob;
  if (move === 'skill') {
    damage = skill.damage; heal = Math.min(skill.heal || 0, 100 - me.hp);
    me.hp += heal; me.hp = Math.max(1, me.hp - (skill.cost || 0));
    me.shield = Math.min(30, me.shield + (skill.shield || 0));
    me.readyAt = state.turn + (skill.cooldown || 6);
    if (skill.burn) { rival.burn = skill.burn; rival.burnTurns = 2; }
    if (skill.weaken) rival.weakened = true;
  }
  if (damage > 0) {
    damage += me.charge; me.charge = 0;
    if (me.weakened) { damage = Math.round(damage * 0.6); me.weakened = false; }
    if (!(move === 'skill' && skill.pierce)) {
      if (rival.guarding) damage = Math.round(damage * 0.25);
      const blocked = Math.min(damage, rival.shield); rival.shield -= blocked; damage -= blocked;
    }
    rival.guarding = false;
    rival.hp = Math.max(0, rival.hp - damage);
  }
  if (move === 'skill' && skill.charge) me.charge = skill.charge;
  next.event = { key: heal ? 'arena_healed' : move === 'guard' || (!damage && skill.shield) ? 'arena_blocked' : 'arena_damage', actor, damage, health: heal };
  if (rival.hp === 0) next.winner = actor;
  next.turn++; next.active = target;
  return next;
}
