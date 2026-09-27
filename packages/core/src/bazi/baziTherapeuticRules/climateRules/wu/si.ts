import type { ClimateRule } from '../../types';

export const WU_SI_CLIMATE_RULES: ClimateRule[] = [
  {
    id: 'si-month-wu-gui-bing-first',
    label: '戊日巳月先壬后甲规则',
    description:
      '戊土生巳月，夏燥土焦，《穷通宝鉴》以壬水润燥为先、甲木疏土为佐，戊土高燥喜壬不喜癸。',
    priority: 120,
    months: ['巳'],
    dayMasters: ['土'],
    dayStems: ['戊'],
    usefulWuxing: '水',
    favorableOrder: ['水', '木'],
    hint: '戊土巳月，先壬后甲',
  },
];
