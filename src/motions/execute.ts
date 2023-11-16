import { commands, TextEditor, Position  } from "vscode";
import { VimMotion } from "./parsers";
import { WordBoundaryVariant } from "./parsers/word-boundary";
import { FindCharacterMotion } from "./parsers/character";

export const restoreInitialPosition = async (editor: TextEditor,initialPosition: Position) => {
  await commands.executeCommand("cancelSelection");
  const currentPos = editor.selection.active;
  const vertical = currentPos.line - initialPosition.line;
  const horizontal = currentPos.character - initialPosition.character;
  if (vertical > 0) {
    await commands.executeCommand("cursorMove", {
      to: 'up',
      value: vertical,
    });
  }
  if (vertical < 0) {
    await commands.executeCommand("cursorMove", {
      to: 'down',
      value: Math.abs(vertical),
    });
  }
  if (horizontal > 0) {
    await commands.executeCommand("cursorMove", {
      to: 'left',
      value: horizontal,
    });
  }
  if (horizontal < 0) {
    await commands.executeCommand("cursorMove", {
      to: 'right',
      value: Math.abs(horizontal),
    });
  }
};

const moveToFoundCharacter = (
  editor: TextEditor,
  selectMode: boolean,
  motion: FindCharacterMotion,
):Thenable<unknown> => {
  const currentLine = editor.selection.active;
  const lineText = editor.document.lineAt(currentLine.line).text;
  const initialCharacterIndex = currentLine.character;
  let destinationCharacterIndex = initialCharacterIndex;

  for (let i = 0; i < motion.times; i++) {
    const nextIndex =
      motion.direction === "forward"
        ? lineText.indexOf(
            motion.character,
            destinationCharacterIndex + 1,
          )
        : lineText.lastIndexOf(
            motion.character,
            destinationCharacterIndex - 1,
          );

    if (nextIndex === -1) {
      console.log(
        `Could not find character ${motion.character} times ${motion.times}`,
      );
      return Promise.resolve();
    }

    destinationCharacterIndex = nextIndex;
  }

  return commands.executeCommand("cursorMove", {
    to: "right",
    // NOTE: VSCode understands that move right -5 == move left 5
    value: destinationCharacterIndex - initialCharacterIndex,
    select: selectMode,
  });
};

export const executeMotions = (editor: TextEditor) => async (
  motions: VimMotion[],
  initialPosition?: Position,
): Promise<void> => {
  let lastCommand: Thenable<unknown> = Promise.resolve();
  if (initialPosition) {
    await restoreInitialPosition(editor, initialPosition);
  }
  let selectMode = false;

  console.log();
  for (const motion of motions) {
    if (motion.requireAwait || selectMode) {
      await lastCommand;
    }
    
    lastCommand = (() => {
      let command = '';
      switch (motion.type) {
        case "basic":
          return commands.executeCommand("cursorMove", {
            to: motion.direction,
            value: motion.lines,
            select: selectMode,
          });

        case "start-end-line":
          command = "cursor" + (motion.variant === "end" ? "End" : "Home");
          if (selectMode) {
            command += 'Select';
          }
          return commands.executeCommand(command);

        case "word-boundary":
          const commandsForVariants: Record<WordBoundaryVariant, string> = {
            [WordBoundaryVariant.back]: "cursorWordLeft",
            [WordBoundaryVariant.end]: "cursorWordEndRight",
            [WordBoundaryVariant.word]: "cursorWordRight",
          };
          command = commandsForVariants[motion.variant];
          if (selectMode) {
            command += 'Select';
          }
          return Array.from({ length: motion.times }).reduce<Thenable<unknown>>(
            () => commands.executeCommand(command),
            Promise.resolve(),
          );

        case "find-character":
          return moveToFoundCharacter(editor, selectMode, motion);

        case "start-select-mode":
          selectMode = true;
          return Promise.resolve();
      }
    })();
  }

  await lastCommand;
};
