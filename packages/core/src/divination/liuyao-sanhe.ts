import { SANHE_GROUPS } from '../ganzhi';

/** 按动爻、暗动爻及其变爻，复算月建或日辰触发的三合局。 */
export function getLiuyaoSanheWithTrigger(
  activeBranches: readonly string[],
  triggerBranch: string,
  triggerLabel: '日辰' | '月建',
): { group: string; members: string[]; description: string } | null {
  const activeBranchSet = new Set(activeBranches);
  for (const [group, members] of Object.entries(SANHE_GROUPS)) {
    if (!members.includes(triggerBranch)) continue;
    const requiredYaoBranches = members.filter((member) => member !== triggerBranch);
    if (requiredYaoBranches.every((member) => activeBranchSet.has(member))) {
      return {
        group,
        members,
        description: `${triggerLabel}${triggerBranch}引动三合${group}，三合局成，事势增强`,
      };
    }
  }
  return null;
}
