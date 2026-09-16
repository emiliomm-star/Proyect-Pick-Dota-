// Shared visual tokens. Dark theme, tuned to feel at home next to Dota 2.

export const colors = {
  bg: '#0f1419',
  surface: '#171e26',
  surfaceAlt: '#1e2731',
  border: '#2b3742',
  text: '#e6edf3',
  textMuted: '#8b98a5',
  accent: '#c23c2a', // Dota red
  ally: '#3fb950', // green for your team
  enemy: '#e5534b', // red for the enemy
  neutral: '#d29922',
  positive: '#3fb950',
  negative: '#e5534b',
} as const;

export const radius = { sm: 6, md: 10, lg: 14 } as const;
export const spacing = (n: number) => n * 4;

/** Colors/labels for the 4 primary-attribute sections of the hero grid (like Dota's own hero-select screen). */
export const attrColors: Record<'str' | 'agi' | 'int' | 'all', string> = {
  str: '#e0605c',
  agi: '#4fbf6d',
  int: '#4fa3e0',
  all: '#c9a53b',
};

export const attrLabels: Record<'str' | 'agi' | 'int' | 'all', string> = {
  str: 'Fuerza',
  agi: 'Agilidad',
  int: 'Inteligencia',
  all: 'Universal',
};

export const roleColors: Record<string, string> = {
  Carry: '#e5a03d',
  Support: '#57a6e0',
  Nuker: '#c56bd6',
  Disabler: '#e0673f',
  Durable: '#6bbf59',
  Initiator: '#d6564b',
  Escape: '#4bc0c8',
  Pusher: '#b0b84b',
  Jungler: '#7aa35a',
};
