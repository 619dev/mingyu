import type { ClimateRule } from '../../types';

export const JIA_HAI_CLIMATE_RULES: ClimateRule[] = [
  {
    id: 'hai-month-jia-bing-gui-first',
    label: '甲日亥月先丙后癸规则',
    description: '甲木生亥月，水冷木寒，传统多以丙火解冻、癸水滋扶，先暖后润。',
    priority: 121,
    months: ['亥'],
    dayMasters: ['木'],
    dayStems: ['甲'],
    usefulWuxing: '火',
    favorableOrder: ['火', '水'],
    hint: '甲木亥月，先丙后癸',
  },
];
