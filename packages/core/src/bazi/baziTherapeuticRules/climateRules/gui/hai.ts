import type { ClimateRule } from '../../types';

export const GUI_HAI_CLIMATE_RULES: ClimateRule[] = [
  {
    id: 'hai-month-gui-bing-xin-first',
    label: '癸日亥月先丙后辛规则',
    description: '癸水生亥月，水冷金寒，传统多以丙火解冻、辛金发源，先后有序。',
    priority: 121,
    months: ['亥'],
    dayMasters: ['水'],
    dayStems: ['癸'],
    usefulWuxing: '火',
    favorableOrder: ['火', '金'],
    hint: '癸水亥月，先丙后辛',
  },
];
