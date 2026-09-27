import type { ClimateRule } from '../../types';

export const BING_CHOU_CLIMATE_RULES: ClimateRule[] = [
  {
    id: 'chou-month-bing-wu-xin-first',
    label: '丙日丑月壬水为尊戊土为佐规则',
    description:
      '丙火生丑月，湿寒交加，《穷通宝鉴》三冬丙火以壬水为尊、戊土制水为佐，壬戊相配方显丙火之光。',
    priority: 121,
    months: ['丑'],
    dayMasters: ['火'],
    dayStems: ['丙'],
    usefulWuxing: '水',
    favorableOrder: ['水', '土'],
    hint: '丙火丑月，壬水为尊，戊土为佐',
  },
];
