import type { ClimateRule } from '../../types';

export const JIA_ZI_CLIMATE_RULES: ClimateRule[] = [
  {
    id: 'zi-month-jia-bing-gui-first',
    label: '甲日子月先丙后癸规则',
    description: '甲木生子月，寒冬木冻，传统多以丙火解冻、癸水滋扶，先暖后润。',
    priority: 121,
    months: ['子'],
    dayMasters: ['木'],
    dayStems: ['甲'],
    usefulWuxing: '火',
    favorableOrder: ['火', '水'],
    hint: '甲木子月，先丙后癸',
  },
];
