import { TokenType }  from "./TokenType.ts";

export type literal = string | number;

export class Token {
    readonly type: TokenType;
    readonly lexeme: string;
    readonly literal: ?literal;
    readonly line: number;

    constructor(type: TokenType, lexeme: string, literal: ?literal, line: number) {
        this.type = type;
        this.lexeme = lexeme;
        this.literal = literal;
        this.line = line;
    }

    public toString(): string {
        return `${this.type} ${this.lexeme} ${}`
    }
}