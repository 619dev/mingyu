import type { ClimateRule } from '../../types';

export const GENG_WEI_CLIMATE_RULES: ClimateRule[] = [
  {
    id: 'wei-month-geng-bing-jia-first',
    label: '庚日未月先丙后甲规则',
    description: '庚金生未月，夏土司权，金得火炼，传统以丙火为先、甲木次之，癸水佐之。',
    priority: 121,
    months: ['未'],
    dayMasters: ['金'],
    dayStems: ['庚'],
    usefulWuxing: '火',
    favorableOrder: ['火', '木', '水'],
    hint: '庚金未月，先丙后甲癸',
  },
  {
    id: 'wei-month-geng-jia-ren',
    label: '庚日未月甲壬并用规则',
    description:
      '庚金生未月，土旺金埋，甲木疏土为先，壬水洗金为后。甲壬两透，科甲可期，不宜仍按土旺扶抑泛论。',
    priority: 119,
    months: ['未'],
    dayMasters: ['金'],
    dayStems: ['庚'],
    usefulWuxing: '木',
    favorableOrder: ['木', '水'],
    hint: '庚金未月，甲先疏土，壬后洗金，甲壬两透科甲',
  },
];
