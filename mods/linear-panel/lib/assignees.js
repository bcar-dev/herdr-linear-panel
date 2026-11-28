// Who the assignee picker lists, in blocks. Pure rules with no calls to Herdr, so node can test them (tests/unit)
import { byTitle } from "./listing.js";
import { commonMembers, memberName } from "./teams.js";

// Nobody first, then me and whoever the issues are assigned to now, then the members of the issues' project if they
// share one, then the members of their teams
/**
 * @param {Issue[]} targets
 * @param {Team[]} teams
 * @param {Member[]} projectMembers
 * @param {string} me my user id
 * @returns {{ member: Member | null, group: number, title?: string }[]}
 */
export function assigneeRows(targets, teams, projectMembers, me) {
  const team = commonMembers(teams);
  const self = team.find((member) => member.id === me) ?? targets.find((issue) => issue.assignee?.id === me)?.assignee;
  /** @type {Map<string, Member>} */
  const current = new Map(self ? [[self.id, self]] : []);
  for (const { assignee } of targets) if (assignee) current.set(assignee.id, assignee);
  const seen = new Set(current.keys());
  /** @param {Member[]} members */
  const fresh = (members) => members.filter((member) => !seen.has(member.id) && seen.add(member.id))
    .sort((first, second) => byTitle(memberName(first), memberName(second)));
  return [
    { member: null, group: 0 },
    ...[...current.values()].map((member) => ({ member, group: 0 })),
    ...fresh(projectMembers)
      .map((member) => ({ member, group: 1, title: "Project members" })),
    ...fresh(team)
      .map((member) => ({ member, group: 2, title: "Team members" })),
  ];
}
