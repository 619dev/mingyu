import type { ClimateRule } from '../../types';

export const JI_YIN_CLIMATE_RULES: ClimateRule[] = [
  {
    id: 'yin-month-ji-bing-jia-first',
    label: '己日寅月先丙后甲规则',
    description: '己土生寅月，春寒未尽，传统多以丙火暖局、甲木疏土，先后有序。',
    priority: 119,
    months: ['寅'],
    dayMasters: ['土'],
    dayStems: ['己'],
    usefulWuxing: '火',
    favorableOrder: ['火', '木'],
    hint: '己土寅月，先丙后甲',
  },
];
