import { TokenType } from "./TokenType.ts";

export type literal = string | number | boolean;

export class Token {
  readonly type: TokenType;
  readonly lexeme: string;
  readonly literal: literal | null;
  readonly line: number;

  constructor(
    type: TokenType,
    lexeme: string,
    literal: literal | null,
    line: number,
  ) {
    this.type = type;
    this.lexeme = lexeme;
    this.literal = literal;
    this.line = line;
  }

  public toString(): string {
    const type = TokenType[this.type];
    return `${type} ${this.lexeme} ${this.literal}`;
  }
}
