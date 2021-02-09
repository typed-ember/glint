/**
 * The LSP refers to line/character combinations as positions,
 * while TS uses numeric offsets instead.
 */
export type Position = { line: number; character: number };

export function positionToOffset(contents: string, { line, character }: Position): number {
  const lineStarts = computeLineStarts(contents);
  return lineStarts[line] + character;
}

export function offsetToPosition(contents: string, position: number): Position {
  const lineStarts = computeLineStarts(contents);
  let line = 0;
  while (line + 1 < lineStarts.length && lineStarts[line + 1] <= position) {
    line++;
  }
  const character = position - lineStarts[line];
  return { line, character };
}

export function computeLineStarts(text: string): number[] {
  const result = [];
  let pos = 0;
  let lineStart = 0;
  while (pos < text.length) {
    const ch = text.charCodeAt(pos);
    pos++;
    switch (ch) {
      case 13 /* carriageReturn */:
        if (text.charCodeAt(pos) === 10 /* lineFeed */) {
          pos++;
        }
      // falls through
      case 10 /* lineFeed */:
        result.push(lineStart);
        lineStart = pos;
        break;
      default:
        if (ch > 127 /* maxAsciiCharacter */ && isLineBreak(ch)) {
          result.push(lineStart);
          lineStart = pos;
        }
        break;
    }
  }
  result.push(lineStart);
  return result;
}

function isLineBreak(ch: number): boolean {
  // ES5 7.3:
  // The ECMAScript line terminator characters are listed in Table 3.
  //     Table 3: Line Terminator Characters
  //     Code Unit Value     Name                    Formal Name
  //     \u000A              Line Feed               <LF>
  //     \u000D              Carriage Return         <CR>
  //     \u2028              Line separator          <LS>
  //     \u2029              Paragraph separator     <PS>
  // Only the characters in Table 3 are treated as line terminators. Other new line or line
  // breaking characters are treated as white space but not as line terminators.
  return (
    ch === 10 /* lineFeed */ ||
    ch === 13 /* carriageReturn */ ||
    ch === 8232 /* lineSeparator */ ||
    ch === 8233 /* paragraphSeparator */
  );
}
