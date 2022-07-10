import { Token } from "./Token.ts";
import {
  Assign,
  Binary,
  Expr,
  Grouping,
  Literal,
  Logical,
  Unary,
  Variable,
} from "./Expr.ts";
import { TokenType } from "./TokenType.ts";
import { Nova } from "./Nova.ts";
import { Block, Expression, If, Print, Stmt, Var, While } from "./Stmt.ts";

/* RULES FOR PRODUCTION
program        → declaration * EOF ;
declaration    → varDecl
               | statement ;
varDecl        → "var" IDENTIFIER ( "=" expression)? ";" ;
statement      → exprStmt
               | forStmt
               | ifStmt
               | printStmt
               | whileStmt
               | block ;
forStmt        → "for" "(" (varDecl | exprStmt | ";")
                  expression? ":"
                  expression? ")" statement;
whileStmt      → "while" "(" expression ")" statement;
ifStmt         → "if" "(" expression ")" statement
                ( "else" statement )? ;
block          → "{" declaration* "}" ;
exprStmt       → expression ";" ;
printStmt      → "print" expression ";" ;
expression     → assignment ;
assignment     → IDENTIFIER "=" assignment
               | logic_or ;
logic_or       → logic_and ( "or" logic_and )* ;
logic_and      → equality ( "and" equality )* ;
equality       → comparison ( ( "!=" | "==" ) comparison )* ;
comparison     → term ( ( ">" | ">=" | "<" | "<=" ) term )* ;
term           → factor ( ( "-" | "+" ) factor )* ;
factor         → unary ( ( "/" | "*" ) unary )* ;
unary          → ( "!" | "-" ) unary
               | primary ;
primary        → NUMBER | STRING | "true" | "false" | "nil"
               | "(" expression ")" | IDENTIFIER;
*/
export class Parser {
  private readonly tokens: Array<Token>;
  private current = 0;

  constructor(tokens: Array<Token>) {
    this.tokens = tokens;
  }

  /* entry point to parsing */
  parse(): Array<Stmt> {
    const statements: Array<Stmt> = [];
    while (!this.isAtEnd()) {
      const decl = this.declaration();
      if (decl === null) continue;
      statements.push(decl);
    }

    return statements;
  }

  /* expression -> assignment */
  private expression(): Expr {
    return this.assignment();
  }

  /* declaration -> varDecl | statement; */
  private declaration(): Stmt | null {
    try {
      if (this.match(TokenType.VAR)) return this.varDeclaration();
      return this.statement();
    } catch {
      this.synchronize();
      return null;
    }
  }
  /* statement -> exprStmt | printStmt;
     exprStmt -> expression ";" ;
     printStmt -> "print" expression ";" ;
  */
  private statement(): Stmt {
    if (this.match(TokenType.FOR)) return this.forStatement();
    if (this.match(TokenType.IF)) return this.ifStatement();
    if (this.match(TokenType.PRINT)) return this.printStatement();
    if (this.match(TokenType.WHILE)) return this.whileStatement();
    if (this.match(TokenType.LEFT_BRACE)) return new Block(this.block());
    return this.expressionStatement();
  }

  /*
    "for" works by just manually constructing a while loop node prefixed by an initializer
    ex, transform looks like

       for (var a = 0; i < 10, i++) {foobar}
       becomes

       var a = 0
       while (i < 10) {
        foobar
        i++
       }
  */
  private forStatement(): Stmt {
    // desugar for statement into while, rather than implement new nodes
    this.consume(TokenType.LEFT_PAREN, "Expect '(' after 'for'.");
    let initializer: Stmt | null;
    if (this.match(TokenType.SEMICOLON)) {
      // elide initializer, eg "for (; i < 10; i++) {}"
      initializer = null;
    } else if (this.match(TokenType.VAR)) {
      // initializer is a variable
      initializer = this.varDeclaration();
    } else {
      initializer = this.expressionStatement();
    }

    // condition, middle part of "for" param list
    let condition: Expr | null = null;
    // if next element isn't semi colon, it MUST be the expression to check condition
    if (!this.check(TokenType.SEMICOLON)) {
      condition = this.expression();
    }
    this.consume(TokenType.SEMICOLON, "Expect ';' after loop condition.");

    // increment clause, last element, the usual i++ stuff
    let increment: Expr | null = null;
    // if the next element isn't closing paren, MUST be expression to trigger increment
    if (!this.check(TokenType.RIGHT_PAREN)) {
      increment = this.expression();
    }
    this.consume(TokenType.RIGHT_PAREN, "Expect ')' after for loop clauses.");

    let body = this.statement();

    // if there's an increment clause, we run it after the body of the for loop
    if (increment !== null) {
      body = new Block([body, new Expression(increment)]);
    }

    // condition specifies the loop condition. If we don't have one, replace with new
    condition ??= new Literal(true);
    body = new While(condition, body);

    /* run initializer once, if it exists, by just making a block where first node is init and second is while loop
       ex, transform looks like

       for (var a = 0; i < 10, i++) {foobar}
       becomes

       var a = 0
       while (i < 10) {
        foobar
        i++
       }
    */

    if (initializer !== null) {
      body = new Block([initializer, body]);
    }

    return body;
  }

  private ifStatement(): Stmt {
    this.consume(TokenType.LEFT_PAREN, "Expect '(' after 'if'.");
    const condition: Expr = this.expression();
    this.consume(TokenType.RIGHT_PAREN, "Expect '(' after if condition.");

    const thenBranch = this.statement();
    const elseBranch: Stmt | null = this.match(TokenType.ELSE)
      ? this.statement()
      : null;

    return new If(condition, thenBranch, elseBranch);
  }
  private printStatement(): Stmt {
    const value: Expr = this.expression();
    this.consume(TokenType.SEMICOLON, "Expect ';' after value.");
    return new Print(value);
  }

  private expressionStatement(): Stmt {
    const expr: Expr = this.expression();
    this.consume(TokenType.SEMICOLON, "Expect ';' after expression.");
    return new Expression(expr);
  }

  private block(): Array<Stmt> {
    const statements: Array<Stmt> = [];
    while (!this.check(TokenType.RIGHT_BRACE) && !this.isAtEnd()) {
      const decl = this.declaration();
      if (decl === null) continue;
      statements.push(decl);
    }

    this.consume(TokenType.RIGHT_BRACE, "Expect '}' after block");
    return statements;
  }

  private assignment(): Expr {
    const expr = this.or();
    if (this.match(TokenType.EQUAL)) {
      const equals: Token = this.previous();
      const value = this.assignment();
      if (expr instanceof Variable) {
        const name: Token = expr.name;
        return new Assign(name, value);
      }

      this.error(equals, "Invalid assignment target.");
    }

    return expr;
  }

  private or(): Expr {
    let expr: Expr = this.and();
    while (this.match(TokenType.OR)) {
      const operator: Token = this.previous();
      const right = this.and();
      expr = new Logical(expr, operator, right);
    }

    return expr;
  }

  private and(): Expr {
    let expr = this.equality();
    while (this.match(TokenType.AND)) {
      const operator: Token = this.previous();
      const right = this.equality();
      expr = new Logical(expr, operator, right);
    }

    return expr;
  }

  private varDeclaration(): Stmt {
    const name: Token = this.consume(
      TokenType.IDENTIFIER,
      "Expect variable name.",
    );
    let initializer: Expr | null = null;
    if (this.match(TokenType.EQUAL)) {
      initializer = this.expression();
    }
    this.consume(TokenType.SEMICOLON, "Expect ';' after variable declaration.");
    return new Var(name, initializer);
  }

  private whileStatement(): Stmt {
    this.consume(TokenType.LEFT_PAREN, "Expect '(' after 'while'.");
    const condition = this.expression();
    this.consume(TokenType.RIGHT_PAREN, "Expect ')' after condition.");
    const body = this.statement();

    return new While(condition, body);
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
  private comparison(): Expr {
    let expr = this.term();

    while (
      this.match(
        TokenType.GREATER,
        TokenType.GREATER_EQUAL,
        TokenType.LESS,
        TokenType.LESS_EQUAL,
      )
    ) {
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
  private term(): Expr {
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
  private factor(): Expr {
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
  private unary(): Expr {
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
  private primary(): Expr {
    if (this.match(TokenType.FALSE)) return new Literal(false);
    if (this.match(TokenType.TRUE)) return new Literal(true);
    if (this.match(TokenType.NIL)) return new Literal(null);

    if (this.match(TokenType.NUMBER, TokenType.STRING)) {
      return new Literal(this.previous().literal);
    }

    if (this.match(TokenType.IDENTIFIER)) {
      return new Variable(this.previous());
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
  private consume(type: TokenType, message: string): Token {
    if (this.check(type)) return this.advance();

    throw this.error(this.peek(), message);
  }

  private error(token: Token, message: string): ParseError {
    Nova.errorAtToken(token, message);
    return new ParseError();
  }

  /* synchronize the parser state back into something valid. Throw away current (busted) token, then:
     walk forward while we're not at the end
     if we see a semicolon, we know the statement is over so we can go back to parsing.
     else, if the next token is a special keyword that indicates the start of a new statement, so go back.
     else, consume the next token and keep going until the end
  */
  private synchronize(): void {
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

class ParseError extends Error {}
