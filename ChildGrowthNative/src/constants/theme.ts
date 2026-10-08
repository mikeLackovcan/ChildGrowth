export type ThemeKey = 'classic' | 'space' | 'fantasy' | 'cyberpunk';

export interface WorldTheme {
  id: ThemeKey;
  name: string;
  icon: string;
  price: number;
  background: string;
  surface: string;
  surface2: string;
  border: string;
  border2: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  accentDim: string;
  amber: string;
  amberDim: string;
  green: string;
  greenDim: string;
  purple: string;
  purpleDim: string;
  primary: string;
  backgroundElement: string;
  backgroundSelected: string;
}

export type ThemeColor = Exclude<keyof WorldTheme, 'price' | 'id'>;

export const WORLD_THEMES: Record<ThemeKey, WorldTheme> = {
  classic: {
    id: 'classic',
    name: 'Classic Quest',
    icon: '⚔️',
    price: 0,
    background: '#121212',
    surface: '#1e1e1e',
    surface2: '#2a2a2a',
    border: '#333333',
    border2: '#444444',
    text: '#FFFFFF',
    textSecondary: '#CCCCCC',
    textMuted: '#AAAAAA',
    accent: '#e8001b',
    accentDim: 'rgba(232,0,27,0.15)',
    primary: '#e8001b',
    backgroundElement: '#1e1e1e',
    backgroundSelected: '#2a2a2a',
    amber: '#ffb300',
    amberDim: 'rgba(255,179,0,0.15)',
    green: '#00e676',
    greenDim: 'rgba(0,230,118,0.15)',
    purple: '#ab47bc',
    purpleDim: 'rgba(171,71,188,0.15)',
  },
  space: {
    id: 'space',
    name: 'Space Odyssey',
    icon: '🚀',
    price: 150,
    background: '#0a0e1a',
    surface: '#12192c',
    surface2: '#1b253e',
    border: '#233254',
    border2: '#2e416d',
    text: '#FFFFFF',
    textSecondary: '#B0C4DE',
    textMuted: '#78909C',
    accent: '#00e5ff',
    accentDim: 'rgba(0,229,255,0.18)',
    primary: '#00e5ff',
    backgroundElement: '#12192c',
    backgroundSelected: '#1b253e',
    amber: '#ffd700',
    amberDim: 'rgba(255,215,0,0.18)',
    green: '#00e676',
    greenDim: 'rgba(0,230,118,0.18)',
    purple: '#b388ff',
    purpleDim: 'rgba(179,136,255,0.18)',
  },
  fantasy: {
    id: 'fantasy',
    name: 'Magic Forest',
    icon: '🌲',
    price: 200,
    background: '#0d1f14',
    surface: '#162e1f',
    surface2: '#20402b',
    border: '#2a5238',
    border2: '#376949',
    text: '#FFFFFF',
    textSecondary: '#C8E6C9',
    textMuted: '#81C784',
    accent: '#00e676',
    accentDim: 'rgba(0,230,118,0.18)',
    primary: '#00e676',
    backgroundElement: '#162e1f',
    backgroundSelected: '#20402b',
    amber: '#ffd54f',
    amberDim: 'rgba(255,213,79,0.18)',
    green: '#69f0ae',
    greenDim: 'rgba(105,240,174,0.18)',
    purple: '#ea80fc',
    purpleDim: 'rgba(234,128,252,0.18)',
  },
  cyberpunk: {
    id: 'cyberpunk',
    name: 'Cyber Neon',
    icon: '⚡',
    price: 300,
    background: '#180024',
    surface: '#28003b',
    surface2: '#3a0054',
    border: '#530078',
    border2: '#7300a6',
    text: '#FFFFFF',
    textSecondary: '#E1BEE7',
    textMuted: '#BA68C8',
    accent: '#ff007f',
    accentDim: 'rgba(255,0,127,0.2)',
    primary: '#ff007f',
    backgroundElement: '#28003b',
    backgroundSelected: '#3a0054',
    amber: '#ffee00',
    amberDim: 'rgba(255,238,0,0.2)',
    green: '#00ffcc',
    greenDim: 'rgba(0,255,204,0.2)',
    purple: '#d500f9',
    purpleDim: 'rgba(213,0,249,0.2)',
  },
};

const defaultColors = WORLD_THEMES.classic;

export const Colors = {
  ...defaultColors,
  primary: defaultColors.accent,
  red: defaultColors.accent,
  redDim: defaultColors.accentDim,
  blue: '#29b6f6',
  blueDim: 'rgba(41,182,246,0.15)',
  tint: defaultColors.accent,
  icon: '#CCCCCC',
  tabIconDefault: '#AAAAAA',
  tabIconSelected: defaultColors.accent,
  backgroundSelected: defaultColors.surface2,
  backgroundElement: defaultColors.surface,
  cardPink: '#2a1a20',
  cardBlue: '#1a2430',
  cardYellow: '#2c2410',
  cardGreen: '#122a1d',
  cardPurple: '#221a2c',
  light: defaultColors,
  dark: defaultColors,
};

export const Spacing = {
  half: 4,
  one: 8,
  two: 12,
  three: 16,
  four: 20,
  five: 24,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const MaxContentWidth = 1200;

export const Fonts = {
  sans: 'Nunito_600SemiBold',
  serif: 'Nunito_700Bold',
  monospace: 'SpaceMono',
  mono: 'SpaceMono',
};

export const Typography = {
  header: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 28,
    color: Colors.text,
  },
  title: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 20,
    color: Colors.text,
  },
  body: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 16,
    color: Colors.text,
  },
  subtitle: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 14,
    color: Colors.textSecondary,
  },
  small: {
    fontFamily: 'Nunito_500Medium',
    fontSize: 12,
    color: Colors.textSecondary,
  },
};

export const Shadows = {
  soft: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 3,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 6,
  },
};

export const Layout = {
  padding: 24,
  borderRadius: 24,
  borderRadiusSmall: 16,
};
