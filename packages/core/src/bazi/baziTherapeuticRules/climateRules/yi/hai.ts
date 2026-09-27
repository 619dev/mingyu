import type { ClimateRule } from '../../types';

export const YI_HAI_CLIMATE_RULES: ClimateRule[] = [
  {
    id: 'hai-month-yi-bing-gui-first',
    label: '乙日亥月先丙后癸规则',
    description: '乙木生亥月，水冷木寒，传统多以丙火解冻、癸水滋扶，先暖后润。',
    priority: 121,
    months: ['亥'],
    dayMasters: ['木'],
    dayStems: ['乙'],
    usefulWuxing: '火',
    favorableOrder: ['火', '水'],
    hint: '乙木亥月，先丙后癸',
  },
];
