import type { ClimateRule } from '../../types';

export const GUI_SHEN_CLIMATE_RULES: ClimateRule[] = [
  {
    id: 'shen-month-gui-bing-xin-first',
    label: '癸日申月先丙后辛规则',
    description: '癸水生申月，金白水清，传统多以丙火调候、辛金发源，先后有序。',
    priority: 120,
    months: ['申'],
    dayMasters: ['水'],
    dayStems: ['癸'],
    usefulWuxing: '火',
    favorableOrder: ['火', '金'],
    hint: '癸水申月，先丙后辛',
  },
];
