import type { ClimateRule } from '../../types';

export const DING_HAI_CLIMATE_RULES: ClimateRule[] = [
  {
    id: 'hai-month-ding-geng-jia-first',
    label: '丁日亥月先庚后甲规则',
    description: '丁火生亥月，水冷火寒，传统多以庚金发源、甲木生扶，先后有序。',
    priority: 119,
    months: ['亥'],
    dayMasters: ['火'],
    dayStems: ['丁'],
    usefulWuxing: '金',
    favorableOrder: ['金', '木'],
    hint: '丁火亥月，先庚后甲',
  },
];
