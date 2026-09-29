import type { LiurenData, LiurenTransmission } from '../../../types/divination';
import { getDivinationTime, TimeManager } from '../../../calendar/timeManager';
import { DEFAULT_CHINA_TIMEZONE_HOURS } from '../../../calendar/civil-time';
import { getVoidBranches } from '../../../calendar/lunar';
import { SolarTerm, SolarTime } from 'tyme4ts';
import { getBranchWuxing, getSeasonState } from '../../../ganzhi';
import {
  buildHeavenlyPlate,
  DAYTIME_BRANCHES,
  DIZHI,
  describeRelation,
  getDayStemResidence,
  getNoblemanBranch,
  getPlateItemByBranch,
  getUnderByUpper,
  getUpperByUnder,
  TIANJIANG_ATTRIBUTES,
  type TianJiangName,
} from './helpers/plate';
import { buildFourLessons, resolveInitialTransmission } from './helpers/lessons';
import { resolveLiurenClassicalRules } from './helpers/classical-rules';
import {
  buildLiurenFocusEvidence,
  buildLiurenTimingEvidence,
  buildTransmissionDetail,
  buildTransmissionNote,
  getLiurenGuaTiFacts,
  getPatternTag,
  getTransmissionPattern,
} from './helpers/transmission';
import { analyzeLiurenEvidence } from '../../liuren-evidence';
import { buildShenShaFacts } from './helpers/shensha';

const MONTH_LEADER_BY_ZHONGQI: Record<string, string> = {
  雨水: '亥',
  春分: '戌',
  谷雨: '酉',
  小满: '申',
  夏至: '未',
  大暑: '午',
  处暑: '巳',
  秋分: '辰',
  霜降: '卯',
  小雪: '寅',
  冬至: '丑',
  大寒: '子',
};

function getMonthLeaderByZhongqi(timestamp: number) {
  // tyme4ts 的中气时刻以东八区钟表表达；月将必须按真实交节瞬时点切换。
  const currentParts = TimeManager.getWallClockParts(
    new Date(timestamp),
    DEFAULT_CHINA_TIMEZONE_HOURS * 60,
  );
  const currentTime = SolarTime.fromYmdHms(
    currentParts.year,
    currentParts.month,
    currentParts.day,
    currentParts.hour,
    currentParts.minute,
    currentParts.second,
  );
  const currentJulianDay = currentTime.getJulianDay().getDay();
  const year = currentParts.year;
  // 历表从公元 1 年起；该年大寒前沿用上一冬至的丑将。
  let activeZhongqi: string | undefined = year === 1 ? '冬至' : undefined;
  let activeJulianDay = Number.NEGATIVE_INFINITY;

  for (const scanYear of [year, year + 1]) {
    const firstIndex = scanYear === 1 ? 2 : 0;
    const lastIndex = scanYear === year ? 22 : 0;
    for (let termIndex = firstIndex; termIndex <= lastIndex; termIndex += 2) {
      const term = SolarTerm.fromIndex(scanYear, termIndex);
      // 与 tyme4ts 的 SolarTime#getTerm 保持同一整秒边界口径，避免把
      // 节气原始小数 JD 与用户输入的整秒时刻直接比较而错后一秒。
      const termJulianDay = term.getJulianDay().getSolarTime().getJulianDay().getDay();
      if (termJulianDay <= currentJulianDay && termJulianDay > activeJulianDay) {
        activeJulianDay = termJulianDay;
        activeZhongqi = term.getName();
      }
    }
  }

  if (!activeZhongqi) {
    throw new Error('大六壬历表无法定位占时之前已交的中气。');
  }
  const monthLeader = MONTH_LEADER_BY_ZHONGQI[activeZhongqi];
  if (!monthLeader) {
    throw new Error(`找不到中气 "${activeZhongqi}" 对应的大六壬月将。`);
  }
  return monthLeader;
}

/**
 * 生成大六壬完整课盘
 *
 * 按月将加时、天地盘、四课、三传、天将、神煞顺序完成排盘。
 * 支持传入自定义时间，不传则使用当前时间。
 *
 * @param customDate 自定义排盘时间（可选），不传则使用当前时间。
 * @param options.termReferenceDate 真太阳时模式下的实际占时，用于节气和月将。
 * @returns 完整的大六壬课盘数据对象 LiurenData。
 *
 * @example
 * ```ts
 * const result = generateLiuren();
 * // result 包含 fourLessons（四课）、threeTransmissions（三传）等字段
 * ```
 */
export function generateLiuren(
  customDate?: Date,
  options?: { termReferenceDate?: Date },
): LiurenData {
  // 真太阳时只校正日时坐标；节气、年/月柱和月将仍按实际占时交节。
  const { ganzhi, timeInfo, timestamp } = getDivinationTime(
    customDate,
    undefined,
    options?.termReferenceDate,
  );
  const dayStem = ganzhi.day.charAt(0);
  const dayBranch = ganzhi.day.charAt(1);
  const hourStem = ganzhi.hour.charAt(0);
  const hourBranch = ganzhi.hour.charAt(1);
  const dayNight: '昼占' | '夜占' = DAYTIME_BRANCHES.has(hourBranch) ? '昼占' : '夜占';
  const monthLeader = getMonthLeaderByZhongqi(options?.termReferenceDate?.getTime() ?? timestamp);
  const noblemanBranch = getNoblemanBranch(dayStem, dayNight);
  const xunKong = getVoidBranches(ganzhi.day);
  const heavenlyPlate = buildHeavenlyPlate({
    monthLeader,
    divinationBranch: hourBranch,
    noblemanBranch,
    dayNight,
  });
  const noblemanGroundBranch = getUnderByUpper(heavenlyPlate, noblemanBranch);

  const dayStemResidence = getDayStemResidence(dayStem);
  const fourLessons = buildFourLessons({
    heavenlyPlate,
    dayStem,
    dayBranch,
    dayStemResidence,
    xunKong,
  });

  const initialResult = resolveInitialTransmission(fourLessons, {
    dayStem,
    dayBranch,
    dayStemResidence,
    hourStem,
    hourBranch,
    heavenlyPlate,
  });
  const chu = initialResult.initial;
  let zhong: string;
  let mo: string;
  if (initialResult.branches) {
    if (initialResult.branches.length !== 3 || initialResult.branches[0] !== chu) {
      throw new Error(`${initialResult.rule}返回的三传结构不完整或与初传不一致。`);
    }
    [, zhong, mo] = initialResult.branches;
  } else {
    zhong = getUpperByUnder(heavenlyPlate, chu);
    mo = getUpperByUnder(heavenlyPlate, zhong);
  }
  const transmissionPattern = getTransmissionPattern(chu, zhong, mo, initialResult.rule);
  const transmissionBranches = [chu, zhong, mo];
  const transmissionStages: LiurenTransmission['stage'][] = ['初传', '中传', '末传'];
  const threeTransmissions = transmissionBranches.map((branch, index) => {
    const plateItem = getPlateItemByBranch(heavenlyPlate, branch);
    const previousBranch = index === 0 ? fourLessons[0].lower : transmissionBranches[index - 1];
    const relation = describeRelation(branch, previousBranch);
    const wuxing = getBranchWuxing(branch);

    return {
      stage: transmissionStages[index],
      branch,
      god: plateItem.god,
      relation,
      note: buildTransmissionNote(transmissionStages[index], relation),
      wuxing,
      seasonState: getSeasonState(wuxing, ganzhi.month.charAt(1)),
      isVoid: xunKong.includes(branch),
      dayRelation: describeRelation(branch, dayBranch),
    };
  }) satisfies LiurenTransmission[];
  const classicalRules = resolveLiurenClassicalRules(initialResult.rule);

  const transmissionDetail = buildTransmissionDetail(
    initialResult.rule,
    transmissionPattern,
    threeTransmissions,
    classicalRules,
  );

  const patternTags = [
    `${threeTransmissions[0].god}发用`,
    initialResult.tag,
    threeTransmissions.some((item) => xunKong.includes(item.branch)) ? '空亡入传' : '传不逢空',
    getPatternTag(transmissionPattern),
  ];
  const initialGroundBranch = getPlateItemByBranch(heavenlyPlate, chu).under;
  const guaTiFacts = getLiurenGuaTiFacts({
    transmissionBranches,
    initialGroundBranch,
    initialGod: threeTransmissions[0].god,
    yearBranch: ganzhi.year.charAt(1),
    monthBranch: ganzhi.month.charAt(1),
    monthLeader,
    noblemanBranch,
    noblemanGroundBranch,
    fourLessons,
    dayStem,
    dayBranch,
  });
  const guaTi = guaTiFacts.map((fact) => fact.name);
  patternTags.push(...guaTi);

  const lessonSummary = `四课源于日干寄宫${dayStemResidence}与日支${dayBranch}，关系呈${fourLessons
    .map((item) => item.relation)
    .join('、')}，重点先看${initialResult.tag}落点。`;
  const transmissionSummary = `三传${transmissionPattern}，主线依次为${threeTransmissions
    .map((item) => `${item.stage}${item.branch}`)
    .join(' → ')}。`;
  const shenShaFacts = buildShenShaFacts(
    ganzhi.month.charAt(1),
    ganzhi.day.charAt(1),
    ganzhi.day.charAt(0),
  );
  const shenShaSummary = shenShaFacts.map((item) => `${item.name}在${item.target}`);
  const focusEvidence = buildLiurenFocusEvidence({
    rule: initialResult.rule,
    transmissions: threeTransmissions,
    dayStem,
    dayStemResidence,
    dayBranch,
    fourLessons,
  });
  const timingEvidence = buildLiurenTimingEvidence({
    transmissions: threeTransmissions,
    dayBranch,
    monthBranch: ganzhi.month.charAt(1),
  });

  // 为入传天将附加可核验的基础属性。
  const tianJiangProps = threeTransmissions.reduce<
    Record<
      string,
      {
        wuxing: string;
        yinYang: string;
        category: string;
        description?: string;
      }
    >
  >((acc, t) => {
    const attr = TIANJIANG_ATTRIBUTES[t.god as TianJiangName];
    if (attr) {
      acc[t.god] = {
        wuxing: attr.wuxing,
        yinYang: attr.yinYang,
        category: attr.category,
        description: attr.description,
      };
    }
    return acc;
  }, {});

  const result: LiurenData = {
    ganzhi,
    timestamp,
    ...(options?.termReferenceDate
      ? { termReferenceTimestamp: options.termReferenceDate.getTime() }
      : {}),
    dayNight,
    monthLeader,
    divinationBranch: hourBranch,
    noblemanBranch,
    noblemanGroundBranch,
    xunKong,
    transmissionRule: initialResult.rule,
    ordinaryTransmissionAdjudication: initialResult.ordinaryAdjudication,
    transmissionPattern,
    transmissionDetail,
    earthlyPlate: [...DIZHI],
    dayStemResidence,
    heavenlyPlate,
    fourLessons,
    threeTransmissions,
    patternTags,
    classicalRules,
    lessonSummary: `${lessonSummary} 当前节气为${timeInfo.jieQi}。`,
    transmissionSummary,
    guaTi,
    guaTiFacts,
    shenShaSummary,
    shenShaFacts,
    tianJiangProps,
    focusEvidence,
    timingEvidence,
  };
  result.evidenceAnalysis = analyzeLiurenEvidence(result);
  return result;
}

export { analyzeLiurenEvidence } from '../../liuren-evidence';
export {
  getLiurenGuaTiFacts,
  getLiurenTransmissionGuaTi,
  REGISTERED_LIUREN_GUA_TI_COUNT,
} from './helpers/transmission';
export type {
  LiurenCounterEvidenceFact,
  LiurenCounterSummaryFact,
  LiurenEvidenceAnalysis,
  LiurenFocusFact,
  LiurenFocusSummaryFact,
  LiurenLessonEvidence,
  LiurenRelationEvidenceFact,
  LiurenTimingFact,
  LiurenTraditionalFact,
  LiurenTransitionFact,
  LiurenTransmissionEvidence,
  LiurenTransmissionRuleFact,
} from '../../liuren-evidence';
