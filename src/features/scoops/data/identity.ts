import { normalizeNickname, validateNickname } from "@/features/player/types";
import { ScoopsRuleError } from "./errors";

export interface PlayerIdentity {
  id: string;
  displayName: string;
}

/** The scoops user is the nickname they already use in Greta's Games. */
export function playerIdentity(raw: string | null | undefined): PlayerIdentity {
  const displayName = normalizeNickname(raw ?? "");
  const problem = validateNickname(displayName);
  if (problem) throw new ScoopsRuleError(401, "Sign in with your nickname first!", problem);
  return { id: displayName.toLocaleLowerCase(), displayName };
}
