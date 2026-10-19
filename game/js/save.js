const KEY = 'gcr_save_v1';

const HERO_IDS = ['knight', 'archer', 'mage', 'thief'];

function fresh() {
  const heroes = {};
  for (const id of HERO_IDS) heroes[id] = { lv: 1, exp: 0, wpn: 0, arm: 0, acc: 0 };
  return {
    gold: 300,
    potions: 3,
    selected: 'knight',
    heroes,
    cleared: {}, // stageId -> highest difficulty index cleared (0..2)
    best: {}, // `${stageId}_${diff}` -> rank letter
    settings: { sfx: 0.8, music: 0.45, shake: true },
  };
}

export const Save = {
  data: fresh(),
  load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const d = JSON.parse(raw);
        const base = fresh();
        Save.data = { ...base, ...d, settings: { ...base.settings, ...(d.settings || {}) } };
        for (const id of HERO_IDS) Save.data.heroes[id] = { ...base.heroes[id], ...(d.heroes?.[id] || {}) };
      }
    } catch (e) {
      Save.data = fresh();
    }
  },
  save() {
    try { localStorage.setItem(KEY, JSON.stringify(Save.data)); } catch (e) { /* storage full / blocked */ }
  },
  hero(id) { return Save.data.heroes[id || Save.data.selected]; },
  reset() { Save.data = fresh(); Save.save(); },
};

export function expToNext(lv) {
  return Math.round(50 * Math.pow(lv, 1.55));
}

export const MAX_LV = 40;
