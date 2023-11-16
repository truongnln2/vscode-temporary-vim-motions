import { MotionParser } from "../shared";
import { BasicMotion, parseBasicMotion } from "./basic";
import { FindCharacterMotion, parseFindCharacterMotion } from "./character";
import {
  StartEndOfLineMotion,
  parseStartEndOfLineMotion,
} from "./start-end-of-line";
import { StartSelectModeMotion, parseStartSelectModeMotion } from "./start-select-mode";
import { WordBoundaryMotion, parseWordBoundaryMotion } from "./word-boundary";

export type VimMotion =
  | BasicMotion
  | StartEndOfLineMotion
  | WordBoundaryMotion
  | FindCharacterMotion
  | StartSelectModeMotion;

export const parsers: MotionParser<VimMotion>[] = [
  parseBasicMotion,
  parseFindCharacterMotion,
  parseStartEndOfLineMotion,
  parseWordBoundaryMotion,
  parseStartSelectModeMotion,
];
