import type { ClimateRule } from '../../types';

export const JIA_SHEN_CLIMATE_RULES: ClimateRule[] = [
  {
    id: 'shen-month-jia-bing-gui-first',
    label: '甲日申月先丙后癸规则',
    description: '甲木生申月，金旺木弱，传统多以丙火制金、癸水滋扶，先后有序。',
    priority: 120,
    months: ['申'],
    dayMasters: ['木'],
    dayStems: ['甲'],
    usefulWuxing: '火',
    favorableOrder: ['火', '水'],
    hint: '甲木申月，先丙后癸',
  },
];
