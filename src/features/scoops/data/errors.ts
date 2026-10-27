/** A rule the player can hear. `detail` is for the server log, not the screen. */
export class ScoopsRuleError extends Error {
  readonly status: number;
  readonly kidMessage: string;

  constructor(status: number, kidMessage: string, detail?: string) {
    super(detail ?? kidMessage);
    this.name = "ScoopsRuleError";
    this.status = status;
    this.kidMessage = kidMessage;
  }
}
