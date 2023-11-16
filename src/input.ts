import { isLeft } from "fp-ts/lib/Either";
import { isSome, none } from "fp-ts/lib/Option";
import { Disposable, TextEditor, window, Position } from "vscode";
import {
  HierarchicalDisposer,
  withChildDisposer,
} from "./hierarchical-disposer";
import { Highlighter } from "./highlight";
import { parseVimMotions } from "./motions";
import { executeMotions, restoreInitialPosition } from "./motions/execute";
import { VimMotion } from "./motions/parsers";
import { useDelayPromiseCaller } from "./utils";

export async function processVimMotionInput({
  disposer: parentDisposer,
  editor,
  highlighter,
  delayTypingSetting,
}: {
  disposer: HierarchicalDisposer;
  editor: TextEditor;
  highlighter: Highlighter;
  delayTypingSetting?: number;
}) {
  return withChildDisposer(parentDisposer, (disposer) => {
    const input = new VimMotionInput({
      executeMotions: executeMotions(editor),
      highlighter,
      delayTypingSetting,
    });
    disposer.add(input);

    return input.show();
  });
}
type PromiseVoid = Promise<void>;
class VimMotionInput implements Disposable {
  private readonly inputBox = window.createInputBox();
  private readonly highlighter: Highlighter;
  private readonly donePromise: Promise<boolean>;
  private readonly executeMotions: (
    motions: VimMotion[],
    initialPosition?: Position
  ) => Promise<void>;
  private initialPos: Position | undefined;
  private currentEditor: TextEditor | undefined;

  public dispose: Disposable["dispose"];

  constructor({
    executeMotions,
    highlighter,
    delayTypingSetting,
  }: {
    executeMotions: (motions: VimMotion[], initialPosition?: Position) => PromiseVoid;
    highlighter: Highlighter;
    delayTypingSetting?: number;
  }) {
    const disposer = new HierarchicalDisposer(none);
    this.dispose = disposer.dispose.bind(disposer);
    disposer.add(this.inputBox);
    this.inputBox.prompt = "Enter a vim motion";
    this.inputBox.placeholder = "For example: 10j";

    this.initialPos = new Position(0, 0);

    disposer.add(this.inputBox.onDidChangeValue(this.onInputValueChange));

    this.highlighter = highlighter;
    let delayTyping = 300;
    if (delayTypingSetting) {
      delayTyping = delayTypingSetting;
    }
    this.executeMotions = useDelayPromiseCaller(delayTyping, executeMotions);

    this.donePromise = new Promise<boolean>((resolve) => {
      let accepted = false;

      disposer.add(
        this.inputBox.onDidHide(() => {
          if (!accepted && this.currentEditor && this.initialPos) {
            const pos = this.initialPos;
            this.initialPos = undefined;
            restoreInitialPosition(this.currentEditor, pos);
          }
          resolve(accepted);
        }),
      );
      disposer.add(
        this.inputBox.onDidAccept(() => {
          accepted = true;
          this.inputBox.hide();
        }),
      );
    });
  }

  async show() {
    this.currentEditor = window.activeTextEditor;
    this.inputBox.show();
    if (this.currentEditor) {
      this.initialPos = this.currentEditor.selection.active;
    }

    return this.donePromise;
  }

  private onInputValueChange = async (s: string) => {
    await this.parseAndExecuteMotions(s.trim());
    this.highlighter.highlight();
  };

  private parseAndExecuteMotions = async (input: string) => {
    const result = parseVimMotions(input);
    this.inputBox.validationMessage = undefined;
    this.highlighter.highlight();

    if (isLeft(result)) {
      if (isSome(result.left)) {
        this.inputBox.validationMessage = result.left.value.message;
      }

      return;
    }

    await this.executeMotions(
      result.right.motion,
      this.initialPos
    );
    // this.inputBox.value = result.right.unmatchedInput;
  };
}
