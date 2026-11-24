export class ContentError extends Error {
  readonly issues: string[];

  constructor(issues: string[]) {
    super(`[PlasmaArena] נתונים לא תקינים:\n- ${issues.join("\n- ")}`);
    this.name = "ContentError";
    this.issues = issues;
  }
}
