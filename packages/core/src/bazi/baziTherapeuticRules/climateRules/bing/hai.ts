import type { ClimateRule } from '../../types';

export const BING_HAI_CLIMATE_RULES: ClimateRule[] = [
  {
    id: 'hai-month-bing-wu-xin-first',
    label: '丙日亥月壬水为尊戊土为佐规则',
    description:
      '丙火生亥月，水冷火寒，《穷通宝鉴》三冬丙火以壬水为尊、戊土制水为佐，壬戊相配方显丙火之光。',
    priority: 121,
    months: ['亥'],
    dayMasters: ['火'],
    dayStems: ['丙'],
    usefulWuxing: '水',
    favorableOrder: ['水', '土'],
    hint: '丙火亥月，壬水为尊，戊土为佐',
  },
];
