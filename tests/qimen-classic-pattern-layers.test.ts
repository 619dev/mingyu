import assert from 'node:assert/strict';
import test from 'node:test';
import type { QimenJiuGongGe } from '../packages/core/src/types/divination';
import { getClassicPatterns } from '../packages/core/src/divination/algorithms/qimen/helpers/classic-patterns';
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
