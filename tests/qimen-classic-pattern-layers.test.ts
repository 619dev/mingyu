import assert from 'node:assert/strict';
import test from 'node:test';
import type { QimenJiuGongGe } from '../packages/core/src/types/divination';
import { getClassicPatterns } from '../packages/core/src/divination/algorithms/qimen/helpers/classic-patterns';
import { detectQimenPatternCombos } from '../packages/core/src/divination/algorithms/qimen/helpers/pattern-combos';
import { getQimenPatternTags } from '../packages/core/src/divination/algorithms/qimen/helpers/patterns';

function palace(heavenStem: string, earthStem: string, door: string, god = ''): QimenJiuGongGe {
  return {
    gong: 1,
    name: '坎一宫',
    direction: '北',
    element: '水',
    tianPan: { star: '', stem: heavenStem },
    diPan: { stem: earthStem },
    renPan: { door },
    shenPan: { god },
  };
}

function baoJianFacts(board: QimenJiuGongGe[]) {
  const tags = getQimenPatternTags({
    zhiFu: '',
    zhiShi: '休门',
    zhiFuLandingPalace: 1,
    zhiShiLandingPalace: 1,
    jiuGongGe: board,
    activeGanForFind: '戊',
  });
  const classics = getClassicPatterns({ jiuGongGe: board, zhiFu: '', zhiShi: '休门' });
  return {
    tags: tags.filter((tag) => tag.startsWith('宝鉴三奇得使')),
    classics: classics.filter((pattern) => pattern.name === '宝鉴三奇得使'),
  };
}

test('宝鉴三奇得使核对值使吉门所加地盘奇，天盘奇不能替代', () => {
  const earthQi = baoJianFacts([palace('戊', '乙', '休门')]);
  assert.deepEqual(earthQi.tags, ['宝鉴三奇得使（值使休门加地盘乙奇（日奇）于坎一宫）']);
  assert.match(earthQi.classics[0]?.summary ?? '', /休门.*地盘乙奇.*坎一宫/);

  const heavenOnly = baoJianFacts([palace('乙', '戊', '休门')]);
  assert.deepEqual(heavenOnly.tags, []);
  assert.deepEqual(heavenOnly.classics, []);
});

test('云遁与鬼遁的事实说明对应实际命中的盘层、奇、门', () => {
  const cloud = getClassicPatterns({
    jiuGongGe: [palace('乙', '辛', '开门')],
    zhiFu: '',
    zhiShi: '',
  }).find((pattern) => pattern.name === '云遁');
  assert.match(cloud?.summary ?? '', /天盘乙奇加地盘辛/);

  const ghost = getClassicPatterns({
    jiuGongGe: [palace('丁', '戊', '休门', '九地')],
    zhiFu: '',
    zhiShi: '',
  }).find((pattern) => pattern.name === '鬼遁');
  assert.match(ghost?.summary ?? '', /丁奇、九地与休门同宫/);
});

test('三奇得使兼临吉门的名称不误作三奇得地', () => {
  const matched = getClassicPatterns({
    jiuGongGe: [palace('乙', '己', '开门')],
    zhiFu: '',
    zhiShi: '',
  });
  assert.ok(matched.some((pattern) => pattern.name === '日奇得使临吉门'));
});

test('单个吉格所在宫逢空时也命中吉格逢空', () => {
  const board = [palace('戊', '己', '开门')];
  const classicPatterns = [
    {
      key: 'pattern:single:1',
      name: '单个吉格',
      tone: 'good' as const,
      score: 5,
      summary: '单个吉格落坎一宫。',
      modern: '单个吉格。',
      palace: 1,
    },
  ];
  const combos = detectQimenPatternCombos({
    jiuGongGe: board,
    classicPatterns,
    voidPalaces: [{ branch: '子', palace: 1, name: '坎一宫' }],
  });
  assert.deepEqual(
    combos.filter((item) => item.key === 'combo:goodVoid:1').map((item) => item.sources),
    [['单个吉格']],
  );
});

test('得使临吉门不与得使本格重复充作三吉聚气', () => {
  const makePattern = (key: string, name: string) => ({
    key,
    name,
    tone: 'good' as const,
    score: 5,
    summary: name,
    modern: name,
    palace: 1,
  });
  const classics = [
    makePattern('pattern:riQiDeShi:1', '日奇得使'),
    makePattern('pattern:deShiPlusGoodDoor:1:乙', '日奇得使临吉门'),
    makePattern('pattern:other:1', '另一独立吉格'),
  ];
  const context = { jiuGongGe: [palace('乙', '己', '开门')], classicPatterns: classics };
  assert.ok(!detectQimenPatternCombos(context).some((item) => item.key === 'combo:triGood:1'));

  const withThird = detectQimenPatternCombos({
    ...context,
    classicPatterns: [...classics, makePattern('pattern:third:1', '第三个独立吉格')],
  });
  assert.deepEqual(withThird.find((item) => item.key === 'combo:triGood:1')?.sources, [
    '日奇得使',
    '另一独立吉格',
    '第三个独立吉格',
  ]);
});

test('丁奇升殿在兑金宫不误称为火的本气之地', () => {
  const dingInDui = { ...palace('丁', '戊', '生门'), gong: 7, name: '兑七宫', element: '金' };
  const pattern = getClassicPatterns({ jiuGongGe: [dingInDui], zhiFu: '', zhiShi: '' }).find(
    (item) => item.name === '丁奇升殿',
  );
  assert.match(pattern?.summary ?? '', /火临兑金，升殿得位/);
  assert.doesNotMatch(pattern?.summary ?? '', /得本气之地/);
});
