import type { ClimateRule } from '../../types';

export const JI_SHEN_CLIMATE_RULES: ClimateRule[] = [
  {
    id: 'shen-month-ji-bing-jia-first',
    label: '己日申月先丙后甲规则',
    description: '己土生申月，秋湿土凉，传统多以丙火暖局、甲木疏土，先后有序。',
    priority: 119,
    months: ['申'],
    dayMasters: ['土'],
    dayStems: ['己'],
    usefulWuxing: '火',
    favorableOrder: ['火', '木'],
    hint: '己土申月，先丙后甲',
  },
];
