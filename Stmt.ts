import { Expr } from "./Expr.ts";
import { Token } from "./Token.ts";
export abstract class Stmt {
  abstract accept<R>(visitor: Visitor<R>): R;
}
export interface Visitor<R> {
  visitBlockStmt(stmt: Block): R;
  visitExpressionStmt(stmt: Expression): R;
  visitPrintStmt(stmt: Print): R;
  visitVarStmt(stmt: Var): R;
}
export class Block extends Stmt {
  readonly statements: Array<Stmt>;
  constructor(statements: Array<Stmt>) {
    super();
    this.statements = statements;
  }

  accept<R>(visitor: Visitor<R>): R {
    return visitor.visitBlockStmt(this);
  }
}
export class Expression extends Stmt {
  readonly expression: Expr;
  constructor(expression: Expr) {
    super();
    this.expression = expression;
  }

  accept<R>(visitor: Visitor<R>): R {
    return visitor.visitExpressionStmt(this);
  }
}
export class Print extends Stmt {
  readonly expression: Expr;
  constructor(expression: Expr) {
    super();
    this.expression = expression;
  }

  accept<R>(visitor: Visitor<R>): R {
    return visitor.visitPrintStmt(this);
  }
}
export class Var extends Stmt {
  readonly name: Token;
  readonly initializer: Expr | null;
  constructor(name: Token, initializer: Expr | null) {
    super();
    this.name = name;
    this.initializer = initializer;
  }

  accept<R>(visitor: Visitor<R>): R {
    return visitor.visitVarStmt(this);
  }
}