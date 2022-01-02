import { literal, Token } from "./Token.ts";
import { TokenType } from "./TokenType.ts";

class Scanner {
  private readonly source: string;
  private readonly tokens: Array<Token> = [];
  private start = 0;
  private current = 0;
  private line = 1;

  constructor(source: string) {
    this.source = source;
  }

  public scanTokens(): Array<Token> {
    while (!this.isAtEnd()) {
      this.start = this.current;
      this.scanToken();
    }

    this.tokens.push(new Token(TokenType.EOF, "", null, this.line));
    return this.tokens;
  }

  private scanToken(): void {
    const c: string = this.advance();
    switch (c) {
      case "(":
        this.addToken(TokenType.LEFT_PAREN);
        break;
      case ")":
        this.addToken(TokenType.RIGHT_PAREN);
        break;
      case "{":
        this.addToken(TokenType.LEFT_BRACE);
        break;
      case "}":
        this.addToken(TokenType.RIGHT_BRACE);
        break;
      case ",":
        this.addToken(TokenType.COMMA);
        break;
      case ".":
        this.addToken(TokenType.DOT);
        break;
      case "-":
        this.addToken(TokenType.MINUS);
        break;
      case "+":
        this.addToken(TokenType.PLUS);
        break;
      case ";":
        this.addToken(TokenType.SEMICOLON);
        break;
      case "*":
        this.addToken(TokenType.STAR);
        break;
      case "!":
        this.addToken(this.match("=") ? TokenType.BANG_EQUAL : TokenType.BANG);
        break;
      case "=":
        this.addToken(
          this.match("=") ? TokenType.EQUAL_EQUAL : TokenType.EQUAL,
        );
        break;
      case "<":
        this.addToken(this.match("=") ? TokenType.LESS_EQUAL : TokenType.LESS);
        break;
      case ">":
        this.addToken(
          this.match("=") ? TokenType.GREATER_EQUAL : TokenType.GREATER,
        );
        break;
      case "/": {
        if (this.match("/")) {
          // a comment runs to the end of the line
          while (this.peek() != "\n" && !this.isAtEnd()) this.advance();
        } else {
          this.addToken(TokenType.SLASH);
        }
        break;
      }
      /* whitespace: start */
      case " ":
      case "\r":
      case "\t":
        // just ignore all whitespace
        break;
      case "\n":
        this.line++;
        break;
      /* whitespace: end */

      // strings always start with a "
      case '"':
        this.string();
        break;
      default:
        if (this.isDigit(c)) {
          this.number();
        } else {
          Nova.error(this.line, "Unexpected character.");
        }
        break;
    }
  }

  private number(): void {
    // consume all the known digits in a row
    while (this.isDigit(this.peek())) this.advance();

    // if we see a period, we have a float so look for fractions.
    // ensure next is a period immediately followed by another digit
    if (this.peek() === "." && this.isDigit(this.peekNext())) {
      // consume '.'
      this.advance();
      while (this.isDigit(this.peek())) this.advance();
    }

    this.addTokenWithLiteral(
      TokenType.NUMBER,
      Number(this.source.slice(this.start, this.current)),
    );
  }

  private string(): void {
    // while the next char isn't a double quote and we aren't at the end, increment our pointer
    while (this.peek() !== '"' && !this.isAtEnd()) {
      if (this.peek() === "\n") this.line++;
      this.advance();
    }

    // at this point, if we're at the end we never terminated the string
    if (this.isAtEnd()) {
      Nova.error(this.line, "Unterminated string.");
      return;
    }

    // capture closing quote
    this.advance();

    // trim surrounding quotes so we don't turn "hello world" into ""hello world""
    const text = this.source.slice(this.start + 1, this.current - 1);
    this.addTokenWithLiteral(TokenType.STRING, text);
  }

  private match(expected: string): boolean {
    if (this.isAtEnd()) return false;
    if (this.source[this.current] != expected) return false;
    this.current++;
    return true;
  }

  private peek(): string {
    if (this.isAtEnd()) return "\0";
    return this.source[this.current];
  }

  private peekNext(): string {
      if (this.current + 1 >= this.source.length) return "\0";
      return this.source[this.current + 1];
  }

  private isDigit(char: string): boolean {
    // todo: cast to number?
    return char >= "0" && char <= "9";
  }
  private isAtEnd(): boolean {
    return this.current >= this.source.length;
  }

  private advance(): string {
    return this.source[this.current++];
  }

  private addToken(type: TokenType): void {
    this.addTokenWithLiteral(type, null);
  }

  private addTokenWithLiteral(type: TokenType, literal: literal | null) {
    const text = this.source.slice(this.start, this.current);
    this.tokens.push(new Token(type, text, literal, this.line));
  }
}
