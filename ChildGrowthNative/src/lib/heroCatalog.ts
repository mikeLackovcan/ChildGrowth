import { normalizeAvatarId } from './brandMigration';

// IDs are durable: renaming or repricing never removes existing ownership.
export const HEROES = [
  { id: 'quest_champ', name: 'Quest Champ', price: 0, color: '#245FE5', personality: 'Your original champ' },
  { id: 'quest_sprout', name: 'Dash', price: 0, color: '#3270EB', personality: 'Ready for adventure' },
  { id: 'quest_ember', name: 'Ember', price: 100, color: '#B54536', personality: 'A little spark of joy' },
  { id: 'quest_drift', name: 'Sky', price: 150, color: '#30669C', personality: 'Dreams big' },
  { id: 'quest_forge', name: 'Bolt', price: 200, color: '#8F6418', personality: 'Always ready to help' },
  { id: 'quest_coral', name: 'Coco', price: 250, color: '#AC416B', personality: 'Kind at heart' },
  { id: 'quest_dusk', name: 'Luna', price: 300, color: '#7855B5', personality: 'Calm and curious' },
  { id: 'quest_jade', name: 'Jade', price: 400, color: '#267454', personality: 'Loves to explore' },
  { id: 'quest_nova', name: 'Nova', price: 500, color: '#525DB0', personality: 'Full of bright ideas' },
  { id: 'quest_pulse', name: 'Kai', price: 600, color: '#187389', personality: 'One step at a time' },
  { id: 'quest_prism', name: 'Ruby', price: 700, color: '#935BA1', personality: 'Makes every day colorful' },
  { id: 'quest_frost', name: 'Lumi', price: 800, color: '#2D7581', personality: 'A cheerful friend' },
  { id: 'quest_sunrise', name: 'Sunny', price: 1000, color: '#856014', personality: 'Brings a little sunshine' },
];

export function heroFor(id = 'default') {
  return HEROES.find(hero => hero.id === normalizeAvatarId(id)) || HEROES[0];
}
