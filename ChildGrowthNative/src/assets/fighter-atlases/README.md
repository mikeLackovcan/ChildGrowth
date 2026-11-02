# Articulated photographic-material skins

These transparent RGBA atlases are actual runtime assets, not concept mockups.
`fighterAtlases.ts` records the inspected source dimensions and per-part crops.
`TexturedFighterSkin.tsx` maps the pieces onto the shared combat skeleton. Weapon
sockets, foot anchors and hit detection remain in `fighterRigging.ts`.

Generated with the built-in image generation tool on 2026-10-30, using the
existing character portraits as identity/material references. Originals were
preserved; these are new versioned assets. Their photographic look comes from
baked lighting/materials, not a dynamically lit 3D mesh. Do not claim otherwise.

## Sources

### Opponent-facing heads (2026-11-01)

The built-in image-generation tool produced `heads-classic-right-v1.png` and
`heads-fantasy-right-v1.png`, with six right-facing heads each. Exact generation
and spacing-edit prompts are saved in `combat-head-prompts.json`. Runtime crops
and neck anchors are in `fighterAtlases.ts`; body textures and hitboxes are
unchanged. The parent rig mirrors these heads with the fighter's facing.
Explorer retains its original vector costume. `facing.html` in the diagnostic
gallery shows both directions; this is not a native-device verification.

- `noob-v1.png`: reference `../images/roblox_noob.png`; original generated image `exec-87b60c38-aa70-4851-91db-d3f693ca3286.png`.
- `ninja-v1.png`: reference `../images/roblox_ninja.png`; original `exec-29d1d7cf-0338-4611-a61c-b4974913b184.png`.
- `builderman-v1.png`: reference `../images/roblox_builderman.png`; original `exec-f626c5a7-8dec-4964-babb-f19a2c77ff9c.png`.
- `bacon-v1.png`: reference `../images/roblox_bacon_hair.png`; original `exec-03530173-9758-498d-859e-948ef9bdcda0.png`.
- `guest-v1.png`: reference `../images/roblox_guest.png`; original `exec-1b7ba83c-d6d6-4e02-a888-a504df51afa8.png`.
- `flamingo-v1.png`: reference `../images/roblox_flamingo.png`; original `exec-42fca0b7-ce66-427d-971f-8b9664b5630a.png`.

- `dominus-v1.png`: reference `../images/roblox_dominus.png`; original `exec-92bb5d57-f9dc-4575-b837-d7e3749d5842.png`.
- `wizard-v1.png`: reference `../images/roblox_wizard.png`; original `exec-61f21a6c-7cf3-4665-9260-63bd4593d4ee.png`.
- `cyber-v1.png`: reference `../images/roblox_cyber.png`; original `exec-a96f6ff7-a11a-468a-893c-4b2e4799ef6a.png`.

Exact fantasy generation prompts are in `fantasy-generation-prompts.json`.
`accessories-v1.png` supplies Dominus wings/cape, Wizard robe, Unicorn wings
and flowing mane/tail, and Dragon wings. These are layered behind the rig with
joint attachments and restrained pose-driven sway (disabled by Reduce Motion).
The built-in generation prompt and original filename are in `accessory-prompt.json`.
Polygon masks isolate neighboring accessory silhouettes within the shared atlas.

- `unicorn-v1.png`: reference `../images/roblox_unicorn.png`; original `exec-238b7686-7a49-45ec-b105-a860ed7d0fa3.png`.
- `dragon-v1.png`: reference `../images/roblox_dragon.png`; original `exec-093030b3-e614-436b-987f-f73066c7b1c8.png`.
- `bloxy-v1.png`: reference `../images/roblox_bloxy.png`; original `exec-c34d1244-a107-4ad8-8331-7df23f6e5a00.png`.

The last three were generated with the built-in tool on 2026-10-31. Their
exact prompt set is in `final-roster-prompts.json`.

All twelve outputs are 1254 × 1254, with alpha. Inspect actual dimensions rather
than assuming the requested generation dimensions. Keep portrait/costume
fallbacks for characters without an authored atlas; never recolor Noob to stand
in for the rest of the roster.

## Generation prompts

The exact full prompts for Bacon Hair, Guest and Flamingo are saved in
`next-generation-prompts.json`. Flamingo intentionally follows the human toy
portrait with sunglasses and pink clothing, not the earlier bird-shaped skin.

### Noob (full prompt)

Use case: stylized-concept. Asset type: production game texture atlas for a skeletal 2D fighting character. Input image 1 is the character identity and material reference, NOT a layout to preserve. Generate ONE square 1536x1536 transparent PNG atlas with EXACTLY nine isolated toy character components in a precise invisible 3 by 3 equal-cell grid (512px cells). Each object is centered in its own cell with generous transparent margins, no object overlaps another cell. NO assembled character, no text, labels, grid, ground, shadows outside pieces, checkerboard or background. Photorealistic studio product rendering of glossy molded resin/plastic with rounded bevels, subtle microtexture, softbox highlights top-left and restrained cool violet rim light right. Match yellow smiling Noob, rich blue torso and green pants from reference; do not turn into human skin. View is consistent shallow three-quarter facing screen right (mostly frontal, subtle visible side). ROW 1: cell 1 isolated yellow smiling head with short neck peg below and small top stud, polished face and expressive black eyes; cell 2 blue torso/chest, broad beveled shoulders tapering to waist, no head arms or legs, subtle cloth-like microtexture but iconic plain blue; cell 3 green hip/pelvis section with dark slim belt and small golden buckle, no legs. ROW 2: cell 1 isolated yellow upper arm, shoulder at top elbow at bottom, straight vertical relaxed capsule shape rounded at both ends, no hand or sleeve; cell 2 isolated yellow forearm, elbow top wrist bottom, straight vertical rounded cylinder, no hand; cell 3 isolated yellow closed gripping fist with thumb, no weapon, wrist at top, knuckles lower right. ROW 3: cell 1 isolated green thigh, hip top knee bottom, straight vertical, subtle molded trouser seams and beveled rounded geometry; cell 2 isolated green shin, knee top ankle bottom, straight vertical, no foot; cell 3 isolated sturdy dark charcoal boot with subtle yellow trim, ankle at top and toe pointing SCREEN RIGHT, three-quarter side view. All pieces can overlap at joints when assembled, so render rounded clean closed ends with no cutaway holes, no mechanical sockets, no gore. Keep exactly this placement and order. Genuine alpha transparency outside every component. Highly polished materials, not flat vector art.

### Shared prefix for Ninja and Builderman

Use case: stylized-concept. Asset type: transparent PNG texture atlas for an articulated 2D game fighter, photorealistic studio product render with detailed materials, NOT flat vector art. Image 1 is identity/material reference. Make exactly nine separate body components in a square invisible 3x3 grid, evenly spaced, each piece isolated and entirely inside its own cell, generous alpha margins. NO labels, writing, grid lines, background, floor shadows, weapons, or assembled figure. Consistent mostly-frontal shallow three-quarter view facing SCREEN RIGHT. Top-left softbox light and subtle violet rim light on right; real fabric weave, metal hardware and softly beveled molded resin skin. Row1: HEAD including headgear and short neck; TORSO without head or arms, fitted garment chest to waist; HIPS belt and pelvis only, no thighs. Row2: UPPER ARM shoulder top elbow bottom; FOREARM elbow top wrist bottom, no hand; GRIPPING FIST wrist top knuckles down/right, no weapon. Row3: THIGH hip top knee bottom; SHIN knee top ankle bottom, no foot; BOOT ankle top toe pointing RIGHT. All four limb segments straight VERTICAL with clean rounded ends that can overlap joints; no open sockets or disconnected little pegs. Exactly this order. Genuine alpha outside each piece. No text, brands, lettering, watermarks.

Ninja suffix:

Preserve ninja from reference: light tan toy face with expressive black eyes/eyebrows, purple cloth headband without long loose tails, face NOT masked. Black woven martial arts jacket with violet edging, crossed lapels and small violet abstract emblem. Black-purple cloth sleeves, forearm wraps/armor, fingerless dark gloves, dark trousers with violet trim/knee pads, black-violet boots. Rich bright enough detail for a dark stage.

Builderman suffix:

Preserve builder from reference: warm tan friendly toy face, yellow construction hardhat with NO writing. GREY work shirt with brown suspenders and brass buckles, no logos or lettering. Grey upper sleeves, tan bare forearms and tan gripping hands, dark denim trousers with realistic seams, work belt, brown leather work boots. Heavy sturdy proportions. Do not substitute an orange shirt.

## Integration checks

Verified in this development pass:

- All 12 default characters have distinct bundled body atlases; explorer keeps
  its existing vector fallback rather than silently losing the costume.
- 24 offline combat/rigging checks pass, including exact texture joint anchors,
  planted feet, smooth ankle release, weapon sockets and fixed-step simulation.
- Diagnostic gallery renders 144 source-component poses (12 states per fighter).
  This is not equivalent to checking every frame on a native device.
- Live web matches exercised textured fighters, winged Dominus, attacks, guards,
  jumping, and settings pause/resume. Phone-width battle screens were reviewed
  in English, Czech, Spanish and German; large native text remains unverified.
- TypeScript and translation-key/placeholder parity checks pass.
- Expo web export and `expo export --platform ios --platform android` succeed,
  including all 13 new PNG atlases in the native asset manifest. These exports
  are JavaScript/Hermes bundles, not installed native application builds.

Outstanding release checks: physical-device SVG clipping, texture memory,
frame rate, touch multitasking, native large text, and Reduce Motion behavior.
This Mac currently has neither `simctl` nor `adb` available. Do not infer
native-runtime success from the passing bundle or browser checks.

- Verify alpha and each crop on a dark background, including joint overlap.
- Test stance, walk, block, jab, kick, special, jump, landing and KO.
- Keep world-space skeleton invariants independent of image rectangles.
- Atlas bounds/dimensions are covered by `npm run test:fighting`.
- Native rendering/performance still requires a physical-device pass; web
  screenshots alone do not prove native texture clipping or frame rate.
