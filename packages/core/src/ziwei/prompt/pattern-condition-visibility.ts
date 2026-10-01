import type { PalaceFact, PatternFact } from '../../types/analysis';

/** 判断命中条件是否只是在复述已展示宫位中的同宫星曜。 */
export function isRepeatedZiweiCoLocationCondition(
  pattern: Pick<PatternFact, 'palace_indexes' | 'palace_names' | 'star_names'>,
  condition: string,
  displayedPalaces: readonly PalaceFact[],
) {
  const match = /^(.+?)(?:同守|同坐|同宫)(.+宫)?$/u.exec(condition);
  if (!match) return false;

  const starText = match[1];
  const conditionStars = [...new Set(pattern.star_names)]
    .filter((name) => starText.includes(name))
    .sort((left, right) => starText.indexOf(left) - starText.indexOf(right));
  if (
    conditionStars.length < 2 ||
    starText.replace(/[、，,与和及\s]/gu, '') !== conditionStars.join('')
  ) {
    return false;
  }

  const palaceName = match[2]?.replace(/宫$/u, '');
  if (palaceName && !pattern.palace_names.some((name) => name.replace(/宫$/u, '') === palaceName)) {
    return false;
  }
  if (!palaceName && (pattern.palace_indexes.length !== 1 || pattern.palace_names.length !== 1)) {
    return false;
  }

  const targetPalaces = pattern.palace_indexes
    .map((index) =>
      displayedPalaces.find(
        (palace) =>
          palace.index === index &&
          palace.name.replace(/宫$/u, '') ===
            (palaceName ?? pattern.palace_names[0].replace(/宫$/u, '')),
      ),
    )
    .filter((palace): palace is PalaceFact => Boolean(palace));
  if (targetPalaces.length !== 1) return false;

  const palaceStars = new Set(
    [
      ...targetPalaces[0].major_stars,
      ...targetPalaces[0].minor_stars,
      ...targetPalaces[0].other_stars,
    ].map((star) => star.name),
  );
  return conditionStars.every((name) => palaceStars.has(name));
}

const EARTHLY_BRANCHES = '子丑寅卯辰巳午未申酉戌亥';

function normalizePalaceName(name: string) {
  return name.replace(/宫$/u, '');
}

function getPatternPalace(
  pattern: Pick<PatternFact, 'palace_indexes' | 'palace_names'>,
  palaceName: string,
  displayedPalaces: readonly PalaceFact[],
) {
  const normalizedName = normalizePalaceName(palaceName);
  const matchingIndexes = pattern.palace_names.flatMap((name, index) =>
    normalizePalaceName(name) === normalizedName ? [pattern.palace_indexes[index]] : [],
  );
  if (matchingIndexes.length !== 1 || matchingIndexes[0] === undefined) return undefined;

  return displayedPalaces.find(
    (palace) =>
      palace.index === matchingIndexes[0] && normalizePalaceName(palace.name) === normalizedName,
  );
}

function getConditionStars(starText: string, patternStars: readonly string[]) {
  const stars = patternStars
    .filter((name) => starText.includes(name))
    .sort((left, right) => starText.indexOf(left) - starText.indexOf(right));
  if (!stars.length) return undefined;

  const remainder = [...stars]
    .sort((left, right) => right.length - left.length)
    .reduce((text, name) => text.replace(name, ''), starText)
    .replace(/[、，,与和及\s]/gu, '');
  return remainder ? undefined : stars;
}

function isRepeatedSinglePalacePositionCondition(
  pattern: Pick<PatternFact, 'palace_indexes' | 'palace_names' | 'star_names'>,
  condition: string,
  displayedPalaces: readonly PalaceFact[],
) {
  for (const palaceName of pattern.palace_names) {
    const normalizedName = normalizePalaceName(palaceName);
    const suffix = [
      `守${normalizedName}宫`,
      `守${normalizedName}`,
      `坐${normalizedName}宫`,
      `坐${normalizedName}`,
    ]
      .sort((left, right) => right.length - left.length)
      .find((value) => condition.endsWith(value));
    if (!suffix) continue;

    const palace = getPatternPalace(pattern, palaceName, displayedPalaces);
    if (!palace) continue;

    let prefix = condition.slice(0, -suffix.length);
    let requiredBranch: string | undefined;
    const branchMatch = new RegExp(`在([${EARTHLY_BRANCHES}])宫`, 'u').exec(prefix);
    if (branchMatch) {
      requiredBranch = branchMatch[1];
      prefix = prefix.replace(branchMatch[0], '');
    }
    if (requiredBranch && palace.earthly_branch !== requiredBranch) continue;

    let requiredBrightness: string | undefined;
    const brightnessMatch = /以[“「"]?([^”」"]+)[”」"]?亮度/u.exec(prefix);
    if (brightnessMatch) {
      requiredBrightness = brightnessMatch[1];
      prefix = prefix.replace(brightnessMatch[0], '');
    }

    const conditionStars = getConditionStars(prefix, pattern.star_names);
    if (!conditionStars) continue;

    const palaceStars = [...palace.major_stars, ...palace.minor_stars, ...palace.other_stars];
    if (
      conditionStars.every((name) => {
        const star = palaceStars.find((item) => item.name === name);
        return Boolean(star) && (!requiredBrightness || star?.brightness === requiredBrightness);
      })
    ) {
      return true;
    }
  }

  return false;
}

/** 判断格局条件是否已由当前展示宫位中的星曜位置和明确属性完整表达。 */
export function isZiweiConditionRestatedByPalaces(
  pattern: Pick<PatternFact, 'palace_indexes' | 'palace_names' | 'star_names'>,
  condition: string,
  displayedPalaces: readonly PalaceFact[],
) {
  return (
    isRepeatedZiweiCoLocationCondition(pattern, condition, displayedPalaces) ||
    isRepeatedSinglePalacePositionCondition(pattern, condition, displayedPalaces)
  );
}
