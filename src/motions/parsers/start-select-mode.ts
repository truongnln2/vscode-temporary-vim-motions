import { left, right } from "fp-ts/lib/Either";
import { none } from "fp-ts/lib/Option";
import { AwaitLastVimMotion, MotionParser } from "../shared";

export interface StartSelectModeMotion extends AwaitLastVimMotion {
  type: "start-select-mode";
}

export const parseStartSelectModeMotion: MotionParser<StartSelectModeMotion> = (
  s,
) => {
  if (s.length === 0 ||
    s[0].toLowerCase() !== 'v') {
    return left(none);
  }
  
  const motion: StartSelectModeMotion = {
    type: "start-select-mode",
    requireAwait: "yes"
  };

  return right({
    motion,
    unmatchedInput: s.slice(1),
  });
};
