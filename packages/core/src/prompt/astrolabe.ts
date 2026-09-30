import type { AstrolabeData, AstrolabeSynastryData } from '../types/divination';
import { formatAstrolabeAspectSections } from '../divination/astrolabe-chart-facts';
import { formatFixedTimezoneOffset } from '../calendar/civil-time';
import { formatPromptCurrentTime } from './current-time';
import { buildPromptGuidance, buildPromptTask } from './guidance';
import { buildPromptSchoolSection } from './schools';
import { buildPromptDocument, buildPromptSection, joinPromptSections } from './sections';
import type { PromptBuildOptions, PromptDocument } from './types';
import {
  buildPromptSelectionTask,
  getPromptSelectionSection,
  type PromptSelection,
} from './framework';

export const ASTROLABE_PROMPT_TOPICS = [
  'life',
  'career',
  'job-change',
  'startup-partnership',
  'investment-partnership',
  'wealth',
  'relationship',
  'relationship-push',
  'relationship-decision',
  'reconciliation-decision',
  'marriage',
  'children',
  'family',
  'home-move',
  'settle-relocate',
  'social',
  'emotion',
  'growth',
  'talent',
  'health',
  'study',
  'study-advance',
  'exam-landing',
  'recent',
  'chat',
] as const;

export type AstrolabePromptTopic = (typeof ASTROLABE_PROMPT_TOPICS)[number];

const TOPIC_LABELS: Record<AstrolabePromptTopic, string> = {
  life: '整体人生',
  career: '事业',
  'job-change': '换工作',
  'startup-partnership': '创业合作',
  'investment-partnership': '投资合作',
  wealth: '财富',
  relationship: '关系',
  'relationship-push': '关系推进',
  'relationship-decision': '关系去留',
  'reconciliation-decision': '复合判断',
  marriage: '婚恋',
  children: '子女',
  family: '家庭',
  'home-move': '搬家置业',
  'settle-relocate': '定居换城',
  social: '人际',
  emotion: '情绪',
  growth: '成长',
  talent: '天赋',
  health: '健康',
  study: '学业',
  'study-advance': '考证进修',
  'exam-landing': '考试上岸',
  recent: '近期',
  chat: '自由问答',
};

function formatPoint(point: AstrolabeData['planets'][number]) {
  const dignity = point.dignityLabel ? `，${point.dignityLabel}` : '';
  return `${point.label}${point.formatted}${point.house > 0 ? `，第${point.house}宫` : ''}${point.retrograde ? '，逆行' : ''}${dignity}`;
}

function formatCoordinateAccuracy(accuracy: string | undefined) {
  switch (accuracy) {
    case 'administrative-center':
      return '出生坐标精度：行政中心位置';
    case 'province-approximation':
      return '出生坐标精度：省级近似位置';
    case 'mixed':
      return '出生坐标精度：部分坐标采用地点近似值';
    default:
      return '';
  }
}

function formatAstrolabePatterns(patterns: string[]) {
  const parsed = patterns.map((name) => {
    const match = /^([^（]+)（([^，）]+)(?:，([^）]+))?）$/.exec(name);
    return {
      name,
      kind: match?.[1],
      members: match?.[2].split('、') ?? [],
      detail: match?.[3],
    };
  });
  const sameMembers = (first: string[], second: string[]) =>
    first.length === second.length && first.every((member) => second.includes(member));
  const signGroups = parsed.filter((item) => item.kind === '同星座星群');
  return parsed
    .filter(
      (item) =>
        item.kind !== '同星座星群' ||
        !parsed.some(
          (other) => other.kind === '同宫星群' && sameMembers(item.members, other.members),
        ),
    )
    .map((item) => {
      if (item.kind !== '同宫星群') return item.name;
      const sign = signGroups.find((other) => sameMembers(item.members, other.members));
      return sign?.detail && item.detail
        ? `同宫同星座星群（${item.members.join('、')}，${sign.detail}，${item.detail}）`
        : item.name;
    });
}

export function formatAstrolabeForPrompt(data: AstrolabeData) {
  const gender = data.birth.gender ? `${data.birth.gender}；` : '';
  return [
    `出生信息：${data.birth.name}；${gender}${data.birth.dateTime}；位置${data.birth.location}；时区UTC${formatFixedTimezoneOffset(data.birth.timezone)}`,
    data.birth.latitude !== undefined && data.birth.longitude !== undefined
      ? `出生坐标：纬度${data.birth.latitude}°，经度${data.birth.longitude}°${data.birth.timeZoneId ? `；时区${data.birth.timeZoneId}` : ''}`
      : data.birth.timeZoneId
        ? `时区：${data.birth.timeZoneId}`
        : '',
    formatCoordinateAccuracy(data.birth.coordinateAccuracy),
    data.houseSystem
      ? `宫位制：${data.houseSystem === 'whole_sign' ? '整宫制' : '普拉西德斯宫制（Placidus）'}`
      : '',
    data.dayChart === undefined ? '' : `昼夜盘：${data.dayChart ? '昼盘' : '夜盘'}`,
    ...(data.ephemerisWarnings ?? []).map((warning) => `星历精度：${warning}`),
    data.birth.isTrueSolarTime && data.birth.trueSolarDateTime
      ? `出生时间校正：当地钟表时间${data.birth.standardDateTime || data.birth.dateTime}；真太阳时${data.birth.trueSolarDateTime}（传统时间参考）；星盘依据当地钟表时间对应的出生瞬间计算`
      : '',
    `元素分布：${
      Object.entries(data.summary.elements)
        .map(([key, values]) => `${key}${values.join('、')}`)
        .join('；') || '未记录'
    }`,
    `模式分布：${
      Object.entries(data.summary.modalities)
        .map(([key, values]) => `${key}${values.join('、')}`)
        .join('；') || '未记录'
    }`,
    data.summary.patternBasis === 'ten-main-bodies-selected-aspects' && data.summary.patterns.length
      ? `十大星体格局：${formatAstrolabePatterns(data.summary.patterns).join('、')}`
      : '',
    ...data.angles.map((point) => `${point.label}：${point.formatted}`),
    data.houses?.length
      ? `十二宫宫头：${data.houses.map((point) => `${point.label} ${point.formatted}`).join('；')}`
      : '',
    '星体位置：',
    ...data.planets.map((item) => `  ${formatPoint(item)}`),
    ...formatAstrolabeAspectSections(data.aspects, [...data.planets, ...data.angles]),
  ]
    .filter(Boolean)
    .join('\n');
}

export interface AstrolabePromptOptions extends PromptBuildOptions {
  chart: AstrolabeData;
  schools?: readonly string[];
  topic?: AstrolabePromptTopic;
  selection?: PromptSelection;
}

export function buildAstrolabePromptDocument(options: AstrolabePromptOptions): PromptDocument {
  const topic = options.topic ?? 'life';
  const question = options.question?.trim() || `请围绕${TOPIC_LABELS[topic]}解读这份星盘。`;
  const task = buildPromptTask(
    `请依据星体、宫位、相位和盘面证据，重点分析${TOPIC_LABELS[topic]}并回答问题。`,
    'astrolabe',
  );
  const user = joinPromptSections([
    buildPromptGuidance('astrolabe'),
    buildPromptSection('当前时间', formatPromptCurrentTime(options.currentTime)),
    buildPromptSection('星盘资料', formatAstrolabeForPrompt(options.chart)),
    buildPromptSchoolSection('astrolabe', options.schools),
    options.selection
      ? buildPromptSection('解读选择', getPromptSelectionSection(options.selection))
      : '',
    buildPromptSection(
      '任务',
      options.selection ? buildPromptSelectionTask(task, options.selection) : task,
    ),
    buildPromptSection('问题', question),
  ]);
  return buildPromptDocument(user);
}

export function buildAstrolabePrompt(options: AstrolabePromptOptions) {
  return buildAstrolabePromptDocument(options).text;
}

function formatSynastryFacts(
  data: AstrolabeSynastryData,
  chart1: AstrolabeData,
  chart2: AstrolabeData,
) {
  const position = (chart: AstrolabeData, name: string) => {
    const point = [...chart.planets, ...chart.angles].find((item) => item.name === name);
    return point
      ? `（${point.formatted}${point.house > 0 ? `，自身本命第${point.house}宫` : ''}）`
      : '';
  };
  const aspects = data.aspects.map(
    (item) =>
      `  第一人${item.person1}的${item.point1}${position(chart1, item.point1Name)}与第二人${item.person2}的${item.point2}${position(chart2, item.point2Name)}：${item.type}，目标角${item.exactAngle}°，实际夹角${item.actualAngle.toFixed(2)}°，偏差${item.orb.toFixed(2)}°，容许偏差上限${item.allowedOrb}°，${item.closeness}。`,
  );
  const overlays = data.houseOverlays.map(
    (item) =>
      `  ${item.visitorPerson === 'person1' ? '第一人' : '第二人'}${item.visitor}的${item.point}${position(item.visitorPerson === 'person1' ? chart1 : chart2, item.pointName)}落入${item.ownerPerson === 'person1' ? '第一人' : '第二人'}${item.owner}的本命盘第${item.house}宫。`,
  );
  const overlayCoverage = data.counterEvidenceFacts.find((item) => item.type === '跨盘落宫覆盖');
  return [
    data.receptionSummary ?? '',
    aspects.length
      ? `【跨盘相位】\n本次命中${data.summaryFact.matchedAspectCount}项，列出${aspects.length}项。\n${aspects.join('\n')}`
      : '【跨盘相位】\n本次所选计算点未见容许度内的主要相位。',
    overlays.length
      ? `【跨盘落宫】\n${overlays.join('\n')}${overlayCoverage?.status === '资料不足' ? '\n至少一方宫头资料无效，以上仅为可定位方向。' : ''}`
      : `【跨盘落宫】\n${overlayCoverage?.status === '已关闭' ? '本次未启用跨盘落宫计算。' : overlayCoverage?.status === '资料不足' ? '宫头资料不足，无法定位跨盘落宫。' : '本次所选计算点未形成可定位落宫。'}`,
  ]
    .filter(Boolean)
    .join('\n\n');
}

export interface AstrolabeSynastryPromptOptions extends PromptBuildOptions {
  chart1: AstrolabeData;
  chart2: AstrolabeData;
  synastry: AstrolabeSynastryData;
  schools?: readonly string[];
  selection?: PromptSelection;
}

export function buildAstrolabeSynastryPromptDocument(
  options: AstrolabeSynastryPromptOptions,
): PromptDocument {
  const question =
    options.question?.trim() || '请分析双方互动主轴、互补点、张力点与需要结合现实核对的部分。';
  const factSources = [
    '双方本命盘',
    ...(options.synastry.aspects.length ? ['已列跨盘相位'] : []),
    ...(options.synastry.houseOverlays.length ? ['已列跨盘落宫'] : []),
    ...(options.synastry.receptions?.length ? ['已列古典接纳与互溶'] : []),
  ].join('、');
  const task = buildPromptTask(
    `请依据${factSources}分析互动主轴、互补点与张力点，逐项列出对应证据，再回答问题。`,
    'astrolabe-synastry',
  );
  const user = joinPromptSections([
    buildPromptGuidance('astrolabe-synastry'),
    buildPromptSection('当前时间', formatPromptCurrentTime(options.currentTime)),
    buildPromptSection('第一人本命盘', formatAstrolabeForPrompt(options.chart1)),
    buildPromptSection('第二人本命盘', formatAstrolabeForPrompt(options.chart2)),
    buildPromptSection(
      '跨盘资料',
      formatSynastryFacts(options.synastry, options.chart1, options.chart2),
    ),
    buildPromptSchoolSection('astrolabe', options.schools),
    options.selection
      ? buildPromptSection('解读选择', getPromptSelectionSection(options.selection))
      : '',
    buildPromptSection(
      '任务',
      options.selection ? buildPromptSelectionTask(task, options.selection) : task,
    ),
    buildPromptSection('问题', question),
  ]);
  return buildPromptDocument(user);
}

export function buildAstrolabeSynastryPrompt(options: AstrolabeSynastryPromptOptions) {
  return buildAstrolabeSynastryPromptDocument(options).text;
}
