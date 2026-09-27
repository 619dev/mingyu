import type { ClimateRule } from '../../types';

export const DING_SHEN_CLIMATE_RULES: ClimateRule[] = [
  {
    id: 'shen-month-ding-geng-jia-first',
    label: '丁日申月先庚后甲规则',
    description: '丁火生申月，金旺火衰，传统多以庚金发源、甲木生扶，先后有序。',
    priority: 119,
    months: ['申'],
    dayMasters: ['火'],
    dayStems: ['丁'],
    usefulWuxing: '金',
    favorableOrder: ['金', '木'],
    hint: '丁火申月，先庚后甲',
  },
];
