import type { ClimateRule } from '../../types';

export const GENG_SHEN_CLIMATE_RULES: ClimateRule[] = [
  {
    id: 'shen-month-geng-jia-bing-first',
    label: '庚日申月丁甲丙先庚规则',
    description:
      '庚金生申月，秋金得令，传统多先丁火锻炼，次甲木裁抑，丙火为佐，较一般秋金喜水更合原法。',
    priority: 120,
    months: ['申'],
    dayMasters: ['金'],
    dayStems: ['庚'],
    usefulWuxing: '火',
    favorableOrder: ['火', '木'],
    hint: '庚金申月，先丁次甲，丙火为佐',
  },
  {
    id: 'shen-month-geng-ding-jia-visible',
    label: '庚日申月丁甲两透青云规则',
    description: '庚金生申月，专用丁火煅炼，次取甲木引丁；丁甲两透，定步青云。',
    priority: 123,
    months: ['申'],
    dayMasters: ['金'],
    dayStems: ['庚'],
    requiredVisibleStems: ['丁', '甲'],
    usefulWuxing: '火',
    favorableOrder: ['火', '木'],
    traceHints: ['取用层次:丁甲两透', '成格层次:定步青云'],
    hint: '庚金申月丁甲两透，定步青云',
  },
  {
    id: 'shen-month-geng-ding-jia',
    label: '庚日申月丁甲并用规则',
    description:
      '庚金生申月，金旺得令，丁火炼金为用，甲木引丁为佐。丁甲两透，科甲定然，不宜仍按秋金清润一概论之。',
    priority: 119,
    months: ['申'],
    dayMasters: ['金'],
    dayStems: ['庚'],
    usefulWuxing: '火',
    favorableOrder: ['火', '木'],
    hint: '庚金申月，丁火炼金，甲木引丁，丁甲两透科甲',
  },
];
