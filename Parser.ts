import { Token } from "./Token.ts";
import { Binary, Expr, Grouping, Literal, Unary } from "./Expr.ts";
import { TokenType } from "./TokenType.ts";
import { Nova } from "./Nova.ts";

/* RULES FOR PRODUCTION

expression     → equality ;
equality       → comparison ( ( "!=" | "==" ) comparison )* ;
comparison     → term ( ( ">" | ">=" | "<" | "<=" ) term )* ;
term           → factor ( ( "-" | "+" ) factor )* ;
factor         → unary ( ( "/" | "*" ) unary )* ;
unary          → ( "!" | "-" ) unary
               | primary ;
primary        → NUMBER | STRING | "true" | "false" | "nil"
               | "(" expression ")" ;
*/
export class Parser {
  private readonly tokens: Array<Token>;
  private current = 0;

  constructor(tokens: Array<Token>) {
    this.tokens = tokens;
  }

  /* entry point to parsing */
  parse() : Expr | null{
    try {
      return this.expression();
    } catch (_err: unknown) {
      return null;
    }
  }

  /* expression -> equality */
  private expression(): Expr {
    return this.equality();
  }

  /* equality -> comparison ( ( "!=" | "==") comparison)*
    get the left side expression, look to see if the next token is equality checker,
    and if yes then grab the right side expression. Wrap expression as a binary.
  */
  private equality(): Expr {
    let expr = this.comparison();
    while (this.match(TokenType.BANG_EQUAL, TokenType.EQUAL_EQUAL)) {
      const operator = this.previous();
      const right = this.comparison();
      expr = new Binary(expr, operator, right);
    }
    return expr;
  }

  /* comparison     → term ( ( ">" | ">=" | "<" | "<=" ) term )* ;
    consume the leftside of the comparison. While the next token is a comparator, grab it and the following term, 
    then build a binary expression
  */
  private comparison() : Expr {
    let expr = this.term();

    while (this.match(TokenType.GREATER, TokenType.GREATER_EQUAL, TokenType.LESS, TokenType.LESS_EQUAL)) {
      const operator = this.previous();
      const right = this.term();
      expr = new Binary(expr, operator, right);
    }

    return expr;
  }

  /* term           → factor ( ( "-" | "+" ) factor )* ;
    consume the left side. While the next token is a minus or plus, 
    consume the operator and following factor. 
  */
  private term() : Expr {
    let expr = this.factor();
    while (this.match(TokenType.PLUS, TokenType.MINUS)) {
      const operator = this.previous();
      const right = this.factor();
      expr = new Binary(expr, operator, right);
    }

    return expr;
  }

  /* factor           → unary ( ( "/" | "*" ) unary )* ;
    consume the left side. While the next token is a slash or star, 
    consume the operator and following unary. 
  */
    private factor() : Expr {
      let expr = this.unary();
      while (this.match(TokenType.SLASH, TokenType.STAR)) {
        const operator = this.previous();
        const right = this.unary();
        expr = new Binary(expr, operator, right);
      }
  
      return expr;
    }


  /* unary          → ( "!" | "-" ) unary | primary ;
    if the following token is a unary operator, grab the next term and build a unary expression.
    else, fall to primary production
  */
  private unary() : Expr {
    if (this.match(TokenType.BANG, TokenType.MINUS)) {
      const operator = this.previous();
      const right = this.unary();
      return new Unary(operator, right);
    }

    return this.primary();
  }

  /* primary        → NUMBER | STRING | "true" | "false" | "nil" | "(" expression ")" ;
    Just hardcode checking against these possible literals. If none, look for a paren, grab an expression, 
    verify it closes the paren, then return the new grouping/
  */
 private primary() : Expr  {
   if (this.match(TokenType.FALSE)) return new Literal(false);
   if (this.match(TokenType.TRUE)) return new Literal(true);
   if (this.match(TokenType.NIL)) return new Literal(null);

   if (this.match(TokenType.NUMBER, TokenType.STRING)) {
     return new Literal(this.previous().literal);
   }
   if (this.match(TokenType.LEFT_PAREN)) {
     const expr = this.expression();
     this.consume(TokenType.RIGHT_PAREN, "Expected ')' after expression.");
     return new Grouping(expr);
   }

   throw this.error(this.peek(), "Expected expression.");
 }

  /* if next token is any of the supplied types, consume and continue */
  private match(...types: Array<TokenType>): boolean {
    for (const tokenType of types) {
      if (this.check(tokenType)) {
        this.advance();
        return true;
      }
    }

    return false;
  }

  /* checks the next token is of the right type and moves past it */
  private consume(type: TokenType, message: string)  : Token {
    if (this.check(type)) return this.advance();
    
    throw this.error(this.peek(), message);
  }

  private error(token: Token, message: string) : ParseError {
    Nova.errorAtToken(token, message);
    return new ParseError();
  }

  /* synchronize the parser state back into something valid. Throw away current (busted) token, then:
     walk forward while we're not at the end
     if we see a semicolon, we know the statement is over so we can go back to parsing.
     else, if the next token is a special keyword that indicates the start of a new statement, so go back.
     else, consume the next token and keep going until the end
  */
  private synchronize() : void {
    this.advance();

    while (!this.isAtEnd()) {
      if (this.previous().type === TokenType.SEMICOLON) return;

      switch (this.peek().type) {
        case TokenType.CLASS:
        case TokenType.FUN:
        case TokenType.VAR:
        case TokenType.FOR:
        case TokenType.IF:
        case TokenType.WHILE:
        case TokenType.PRINT:
        case TokenType.RETURN:
          return;
      }

      this.advance();
    }
  }

  private check(type: TokenType): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.current++;
    return this.previous();
  }

  private isAtEnd(): boolean {
    return this.peek().type === TokenType.EOF;
  }

  private peek(): Token {
    const token = this.tokens.at(this.current);
    if (!token) {
      throw new Error(
        `Parser:peek : Parser current idx ${this.current} is greater than token list length ${this.tokens.length}`,
      );
    }
    return token;
  }

  private previous(): Token {
    const token = this.tokens.at(this.current - 1);
    if (!token) {
      throw new Error(
        `Parser#previous : Parser current idx ${this.current} is greater than token list length ${this.tokens.length}`,
      );
    }
    return token;
  }
}

class ParseError extends Error {};