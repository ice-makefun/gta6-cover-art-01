// Colour grades for Neon Coast Cover Studio: each grade tints the photos with
// a sunset / neon wash and sets the caption palette. No image assets involved.

export const GRADES = [
  {
    id: 'neon-sunset',
    name: 'Neon Sunset',
    blurb: 'Magenta sky, orange horizon',
    sky: '#ff2975',
    horizon: '#ff9a3d',
    deep: '#2b1155',
    accent: '#ffd319',
    titleFrom: '#ffd319',
    titleTo: '#ff2975',
    scriptColor: '#2de2ff',
  },
  {
    id: 'vice-nights',
    name: 'Vice Nights',
    blurb: 'Deep purple streets, cyan neon',
    sky: '#8c1eff',
    horizon: '#2de2ff',
    deep: '#12082e',
    accent: '#ff2975',
    titleFrom: '#2de2ff',
    titleTo: '#ff2975',
    scriptColor: '#ffd319',
  },
  {
    id: 'golden-hour',
    name: 'Golden Hour',
    blurb: 'Warm amber light, soft pink',
    sky: '#ff9a3d',
    horizon: '#ffd319',
    deep: '#4a1e0b',
    accent: '#ff2975',
    titleFrom: '#fff3b0',
    titleTo: '#ff7a18',
    scriptColor: '#ff2975',
  },
  {
    id: 'hot-pink',
    name: 'Hot Pink',
    blurb: 'All pink, all night',
    sky: '#ff2975',
    horizon: '#ff5e8a',
    deep: '#33001b',
    accent: '#ffd319',
    titleFrom: '#ffd319',
    titleTo: '#ff2e88',
    scriptColor: '#ffffff',
  },
  {
    id: 'teal-dusk',
    name: 'Teal Dusk',
    blurb: 'Cool teal sea at dusk',
    sky: '#0fb5a6',
    horizon: '#2de2ff',
    deep: '#062a33',
    accent: '#ff9a3d',
    titleFrom: '#a5f3fc',
    titleTo: '#0fb5a6',
    scriptColor: '#ff9a3d',
  },
];

export function gradeById(id) {
  return GRADES.find((g) => g.id === id) ?? GRADES[0];
}
