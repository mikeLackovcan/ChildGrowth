import type { ImageSourcePropType } from 'react-native';

export type FighterPart = 'head' | 'torso' | 'hips' | 'upperArm' | 'forearm' | 'hand' | 'thigh' | 'shin' | 'boot';
export type AtlasRegion = readonly [number, number, number, number];
export type BoneAnchors = readonly [number, number, number, number];
export interface FighterAtlas {
  source: ImageSourcePropType;
  size: number;
  neckColor?: string;
  accessories?: 'dominus' | 'wizard' | 'unicorn' | 'dragon';
  head?: { width: number; height: number; top: number };
  combatHead?: { source: ImageSourcePropType; size: number; region: AtlasRegion; neckX: number };
  anchors?: Partial<Record<FighterPart, BoneAnchors>>;
  regions: Record<FighterPart, AtlasRegion>;
}

// Rectangles are measured against the original, inspected PNG (not a resized
// preview). Keep sources static so Expo bundles every offline texture.
export const FIGHTER_ATLASES: Partial<Record<string, FighterAtlas>> = {
  roblox_noob: {
    source: require('../assets/fighter-atlases/noob-v2.png'),
    size: 1254, neckColor: '#e6b829',
    anchors: { upperArm: [0.55, 0.17, 0.48, 0.85] },
    regions: {
      head: [88, 120, 277, 260], torso: [449, 128, 359, 269], hips: [898, 116, 305, 150],
      upperArm: [133, 455, 195, 340], forearm: [550, 462, 155, 334], hand: [927, 493, 244, 281],
      thigh: [120, 830, 213, 365], shin: [540, 832, 178, 363], boot: [881, 884, 339, 306],
    },
  },
  roblox_ninja: {
    source: require('../assets/fighter-atlases/ninja-v1.png'), size: 1254,
    head: { width: 44, height: 48, top: -26 },
    anchors: { upperArm: [0.44, 0.15, 0.56, 0.85], forearm: [0.45, 0.15, 0.58, 0.86] },
    regions: {
      head: [70, 105, 300, 312], torso: [439, 53, 377, 382], hips: [849, 144, 374, 282],
      upperArm: [114, 468, 228, 339], forearm: [530, 474, 215, 345], hand: [890, 502, 276, 302],
      thigh: [92, 828, 254, 379], shin: [517, 831, 227, 379], boot: [865, 904, 348, 292],
    },
  },
  roblox_builderman: {
    source: require('../assets/fighter-atlases/builderman-v1.png'), size: 1254,
    head: { width: 47, height: 64, top: -44 },
    anchors: { upperArm: [0.61, 0.15, 0.41, 0.85] },
    regions: {
      head: [72, 44, 320, 405], torso: [456, 46, 350, 384], hips: [848, 144, 357, 285],
      upperArm: [114, 462, 227, 343], forearm: [527, 465, 200, 339], hand: [902, 496, 260, 301],
      thigh: [91, 812, 245, 407], shin: [510, 811, 233, 411], boot: [851, 872, 359, 332],
    },
  },
  roblox_bacon_hair: {
    source: require('../assets/fighter-atlases/bacon-v1.png'), size: 1254,
    head: { width: 46, height: 64, top: -42 },
    anchors: { upperArm: [0.64, 0.16, 0.39, 0.85] },
    regions: {
      head: [70, 22, 312, 396], torso: [444, 65, 390, 355], hips: [890, 132, 338, 302],
      upperArm: [135, 470, 194, 324], forearm: [543, 464, 174, 339], hand: [918, 522, 249, 278],
      thigh: [106, 826, 228, 392], shin: [535, 826, 205, 392], boot: [881, 892, 338, 330],
    },
  },
  roblox_guest: {
    source: require('../assets/fighter-atlases/guest-v1.png'), size: 1254,
    head: { width: 46, height: 59, top: -37 },
    regions: {
      head: [92, 38, 310, 338], torso: [445, 35, 362, 388], hips: [861, 141, 349, 271],
      upperArm: [120, 442, 217, 356], forearm: [526, 442, 205, 355], hand: [909, 474, 266, 298],
      thigh: [102, 816, 241, 410], shin: [514, 817, 219, 408], boot: [842, 888, 389, 307],
    },
  },
  roblox_flamingo: {
    source: require('../assets/fighter-atlases/flamingo-v1.png'), size: 1254,
    head: { width: 53, height: 62, top: -40 },
    anchors: { upperArm: [0.62, 0.16, 0.37, 0.84] },
    regions: {
      head: [36, 47, 388, 405], torso: [432, 78, 420, 349], hips: [861, 123, 379, 304],
      upperArm: [104, 479, 222, 326], forearm: [556, 460, 154, 358], hand: [940, 484, 223, 326],
      thigh: [84, 824, 244, 377], shin: [542, 829, 179, 369], boot: [881, 925, 328, 280],
    },
  },
  roblox_dominus: {
    accessories: 'dominus',
    source: require('../assets/fighter-atlases/dominus-v1.png'), size: 1254, neckColor: '#b58c37',
    head: { width: 50, height: 66, top: -44 },
    anchors: { upperArm: [0.58, 0.18, 0.44, 0.83] },
    regions: {
      head: [41, 0, 355, 430], torso: [465, 45, 356, 377], hips: [860, 88, 381, 330],
      upperArm: [106, 447, 248, 354], forearm: [537, 448, 208, 355], hand: [901, 465, 288, 335],
      thigh: [119, 819, 228, 399], shin: [543, 822, 194, 398], boot: [902, 861, 302, 331],
    },
  },
  roblox_wizard: {
    accessories: 'wizard',
    source: require('../assets/fighter-atlases/wizard-v1.png'), size: 1254,
    head: { width: 64, height: 66, top: -44 },
    anchors: { upperArm: [0.55, 0.17, 0.48, 0.84] },
    regions: {
      head: [24, 28, 451, 435], torso: [492, 109, 332, 358], hips: [889, 168, 354, 287],
      upperArm: [113, 488, 245, 341], forearm: [537, 487, 199, 346], hand: [900, 521, 286, 299],
      thigh: [145, 840, 220, 373], shin: [540, 839, 204, 375], boot: [896, 915, 319, 286],
    },
  },
  roblox_cyber: {
    source: require('../assets/fighter-atlases/cyber-v1.png'), size: 1254, neckColor: '#536775',
    head: { width: 46, height: 52, top: -30 },
    anchors: { upperArm: [0.67, 0.17, 0.39, 0.85], forearm: [0.43, 0.16, 0.56, 0.86] },
    regions: {
      head: [60, 48, 337, 349], torso: [455, 26, 354, 397], hips: [849, 161, 379, 252],
      // The generated first arm cell includes an elbow and lower arm. Use only
      // its upper shell; the independently rigged forearm comes from cell five.
      upperArm: [111, 417, 254, 254], forearm: [525, 432, 195, 399], hand: [881, 497, 315, 307],
      thigh: [125, 830, 213, 221], shin: [550, 839, 171, 395], boot: [864, 901, 348, 306],
    },
  },
  roblox_unicorn: {
    accessories: 'unicorn',
    source: require('../assets/fighter-atlases/unicorn-v1.png'), size: 1254, neckColor: '#bca5d6',
    head: { width: 48, height: 72, top: -50 },
    anchors: { upperArm: [0.61, 0.14, 0.43, 0.88], forearm: [0.47, 0.14, 0.55, 0.88] },
    regions: {
      head: [57, 12, 350, 490], torso: [447, 122, 384, 365], hips: [844, 184, 383, 281],
      upperArm: [129, 516, 195, 323], forearm: [548, 516, 175, 324], hand: [913, 554, 233, 292],
      thigh: [140, 848, 197, 358], shin: [546, 849, 185, 357], boot: [894, 937, 317, 258],
    },
  },
  roblox_dragon: {
    accessories: 'dragon',
    source: require('../assets/fighter-atlases/dragon-v1.png'), size: 1254, neckColor: '#326386',
    head: { width: 47, height: 70, top: -48 },
    anchors: { upperArm: [0.68, 0.18, 0.53, 0.90], forearm: [0.57, 0.13, 0.58, 0.90] },
    regions: {
      head: [67, 0, 331, 489], torso: [439, 88, 386, 403], hips: [848, 228, 361, 258],
      upperArm: [125, 483, 232, 366], forearm: [550, 501, 174, 349], hand: [958, 540, 234, 297],
      thigh: [138, 851, 204, 376], shin: [546, 849, 187, 383], boot: [903, 904, 319, 307],
    },
  },
  roblox_bloxy: {
    source: require('../assets/fighter-atlases/bloxy-v1.png'), size: 1254, neckColor: '#d69c26',
    head: { width: 49, height: 64, top: -42 },
    anchors: { upperArm: [0.40, 0.16, 0.53, 0.88] },
    regions: {
      head: [57, 9, 354, 442], torso: [459, 68, 338, 384], hips: [863, 187, 345, 250],
      upperArm: [130, 468, 199, 358], forearm: [538, 465, 184, 359], hand: [910, 542, 270, 278],
      thigh: [136, 835, 207, 376], shin: [539, 839, 184, 382], boot: [860, 947, 344, 264],
    },
  },
};

// Right-facing art is mirrored by the parent rig when opponents swap sides.
// Asymmetric neck anchors keep hair and helmets from shifting the head pivot.
const classicHeads = require('../assets/fighter-atlases/heads-classic-right-v1.png');
const fantasyHeads = require('../assets/fighter-atlases/heads-fantasy-right-v1.png');
const combatHeads: [string, ImageSourcePropType, AtlasRegion, number][] = [
  ['roblox_ninja', classicHeads, [488, 299, 258, 237], 0.6],
  ['roblox_bacon_hair', classicHeads, [930, 238, 247, 303], 0.49],
  ['roblox_builderman', classicHeads, [74, 751, 269, 304], 0.49],
  ['roblox_guest', classicHeads, [512, 772, 278, 284], 0.43],
  ['roblox_flamingo', classicHeads, [917, 759, 275, 296], 0.48],
  ['roblox_dominus', fantasyHeads, [112, 236, 236, 305], 0.5],
  ['roblox_wizard', fantasyHeads, [498, 249, 284, 288], 0.52],
  ['roblox_cyber', fantasyHeads, [936, 277, 224, 254], 0.47],
  ['roblox_unicorn', fantasyHeads, [88, 731, 276, 332], 0.55],
  ['roblox_dragon', fantasyHeads, [533, 756, 262, 303], 0.43],
  ['roblox_bloxy', fantasyHeads, [933, 769, 226, 293], 0.48],
];
for (const [id, source, region, neckX] of combatHeads) {
  FIGHTER_ATLASES[id]!.combatHead = { source, size: 1254, region, neckX };
}

export function texturedFighterAtlas(id: string, outfit?: string): FighterAtlas | null {
  // Preserve the explorer costume until its corresponding texture exists.
  return outfit === 'explorer' ? null : FIGHTER_ATLASES[id] ?? null;
}
