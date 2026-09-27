import type { ClimateRule } from '../../types';

export const DING_SI_CLIMATE_RULES: ClimateRule[] = [
  {
    id: 'si-month-ding-geng-jia-first',
    label: '丁日巳月先庚后甲规则',
    description: '丁火生巳月，火旺金熔，传统多以庚金发源、甲木生扶，先后有序。',
    priority: 119,
    months: ['巳'],
    dayMasters: ['火'],
    dayStems: ['丁'],
    usefulWuxing: '金',
    favorableOrder: ['金', '木'],
    hint: '丁火巳月，先庚后甲',
  },
];
