import type { ClimateRule } from '../../types';

export const DING_WEI_CLIMATE_RULES: ClimateRule[] = [
  {
    id: 'wei-month-ding-geng-jia-first',
    label: '丁日未月先庚后甲规则',
    description: '丁火生未月，火气余烈，传统多以庚金发源、甲木生扶，先后有序。',
    priority: 119,
    months: ['未'],
    dayMasters: ['火'],
    dayStems: ['丁'],
    usefulWuxing: '金',
    favorableOrder: ['金', '木'],
    hint: '丁火未月，先庚后甲',
  },
];
