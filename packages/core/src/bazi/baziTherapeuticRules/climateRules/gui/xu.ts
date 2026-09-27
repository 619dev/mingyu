import type { ClimateRule } from '../../types';

export const GUI_XU_CLIMATE_RULES: ClimateRule[] = [
  {
    id: 'xu-month-gui-bing-xin-first',
    label: '癸日戌月先丙后辛规则',
    description: '癸水生戌月，秋深金衰，传统多以丙火调候、辛金发源，先后有序。',
    priority: 120,
    months: ['戌'],
    dayMasters: ['水'],
    dayStems: ['癸'],
    usefulWuxing: '火',
    favorableOrder: ['火', '金'],
    hint: '癸水戌月，先丙后辛',
  },
];
