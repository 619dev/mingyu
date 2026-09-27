import type { ClimateRule } from '../../types';

export const WU_HAI_CLIMATE_RULES: ClimateRule[] = [
  {
    id: 'hai-month-wu-bing-jia-first',
    label: '戊日亥月先丙后甲规则',
    description: '戊土生亥月，水冷土寒，传统多以丙火暖局、甲木疏土，先后有序。',
    priority: 120,
    months: ['亥'],
    dayMasters: ['土'],
    dayStems: ['戊'],
    usefulWuxing: '火',
    favorableOrder: ['火', '木'],
    hint: '戊土亥月，先丙后甲',
  },
];
