import { HEAVENLY_STEMS, getBranchIndex } from '../ganzhi';
import type { JinkoujueFourPosition } from '../types/divination';

/** 五子元遁：甲己还加甲，乙庚丙作初，丙辛从戊起，丁壬庚子居，戊癸何方发，壬子是真途。 */
const WUZI_YUAN_STEM: Record<string, string> = {
  甲: '甲',
  己: '甲',
  乙: '丙',
  庚: '丙',
  丙: '戊',
  辛: '戊',
  丁: '庚',
  壬: '庚',
  戊: '壬',
  癸: '壬',
};

export function getYuanStemOnBranch(dayStem: string, branch: string): string {
  const startStem = WUZI_YUAN_STEM[dayStem];
  if (!startStem) {
    throw new Error(`无法识别日干 "${dayStem}" 的五子元遁起干。`);
  }
  const startStemIndex = HEAVENLY_STEMS.indexOf(startStem as (typeof HEAVENLY_STEMS)[number]);
  const branchIndex = getBranchIndex(branch);
  if (startStemIndex < 0 || branchIndex < 0) {
    throw new Error(`五子元遁计算失败：日干 ${dayStem}，地支 ${branch}`);
  }
  return HEAVENLY_STEMS[(startStemIndex + branchIndex) % HEAVENLY_STEMS.length];
}

export function formatJinkoujuePositionPromptText(
  position: Pick<
    JinkoujueFourPosition,
    | 'name'
    | 'branch'
    | 'stem'
    | 'god'
    | 'element'
    | 'elementBasis'
    | 'yinYang'
    | 'seasonState'
    | 'isVoid'
    | 'stemElement'
  >,
): string {
  return [
    `${position.name}${position.stem || ''}${position.branch}`,
    position.god ? `乘${position.god}` : '',
    `${position.yinYang}${position.element}（按${position.elementBasis}）`,
    position.stemElement && position.elementBasis !== '人元干'
      ? `遁干${position.stem}属${position.stemElement}`
      : '',
    `月令${position.seasonState}`,
    position.elementBasis === '人元干' ? '' : position.isVoid ? '旬空' : '不空',
  ]
    .filter(Boolean)
    .join('；');
}
