import type { ClimateRule } from '../../types';

export const BING_SHEN_CLIMATE_RULES: ClimateRule[] = [
  {
    id: 'shen-month-bing-wu-xin-first',
    label: '丙日申月先壬后辛规则',
    description: '丙火生申月，金旺火衰，传统多以壬水通根、辛金发源，先后有序。',
    priority: 120,
    months: ['申'],
    dayMasters: ['火'],
    dayStems: ['丙'],
    usefulWuxing: '水',
    favorableOrder: ['水', '金'],
    hint: '丙火申月，先壬后辛',
  },
];
