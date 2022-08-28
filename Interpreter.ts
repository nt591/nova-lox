import {
  Assign,
  Binary,
  Call,
  Expr,
  Grouping,
  Literal,
  Logical,
  Unary,
  Variable,
  Visitor as ExprVisitor,
} from "./Expr.ts";
import {
  Block,
  Expression,
  If,
  Print,
  Stmt,
  Var,
  Visitor as StmtVisitor,
  While,
} from "./Stmt.ts";
import { Token } from "./Token.ts";
import { TokenType } from "./TokenType.ts";
import { RuntimeError } from "./RuntimeError.ts";
import { Nova } from "./Nova.ts";
import { Environment } from "./Environment.ts";
import { NovaObject } from "./NovaObject.ts";
import { NovaCallable } from "./NovaCallable.ts";

export class Interpreter implements ExprVisitor<NovaObject>, StmtVisitor<void> {
  #environment = new Environment(null);

  interpret(statements: Array<Stmt>): void {
    try {
      for (const statement of statements) {
        this.execute(statement);
      }
    } catch (e) {
      Nova.runtimeError(e);
    }
  }

  visitExpressionStmt(stmt: Expression): void {
    this.evaluate(stmt.expression);
  }

  visitIfStmt(stmt: If): void {
    if (this.isTruthy(this.evaluate(stmt.condition))) {
      this.execute(stmt.thenBranch);
    } else if (stmt.elseBranch !== null) {
      this.execute(stmt.elseBranch);
    }
  }

  visitPrintStmt(stmt: Print): void {
    const value: NovaObject = this.evaluate(stmt.expression);
    console.log(this.stringify(value));
  }

  visitVarStmt(stmt: Var): void {
    let val = null;
    if (stmt.initializer != null) {
      val = this.evaluate(stmt.initializer);
    }
    this.#environment.define(stmt.name.lexeme, val);
  }

  visitWhileStmt(stmt: While): void {
    // run as long as condition is truthy
    while (this.isTruthy(this.evaluate(stmt.condition))) {
      this.execute(stmt.body);
    }
  }

  visitAssignExpr(expr: Assign): unknown {
    const value = this.evaluate(expr.value);
    this.#environment.assign(expr.name, value);
    return value;
  }

  visitLiteralExpr(expr: Literal): NovaObject {
    return expr.value;
  }

  visitLogicalExpr(expr: Logical): NovaObject {
    const left: NovaObject = this.evaluate(expr.left);
    if (expr.operator.type === TokenType.OR) {
      if (this.isTruthy(left)) return left;
    } else {
      // and
      if (!this.isTruthy(left)) return left;
    }

    return this.evaluate(expr.right);
  }

  visitGroupingExpr(expr: Grouping): NovaObject {
    return this.evaluate(expr.expression);
  }

  visitUnaryExpr(expr: Unary): NovaObject {
    const right = this.evaluate(expr.right);
    switch (expr.operator.type) {
      case TokenType.BANG:
        return !this.isTruthy(right);
      case TokenType.MINUS:
        this.checkNumberOperand(expr.operator, right);
        return <number> (right) * -1;
    }

    // unreachable
    return null;
  }

  visitVariableExpr(expr: Variable): unknown {
    return this.#environment.get(expr.name);
  }

  visitBlockStmt(stmt: Block): void {
    this.executeBlock(stmt.statements, new Environment(this.#environment));
  }

  visitBinaryExpr(expr: Binary): NovaObject {
    // evalates left to right
    const left = this.evaluate(expr.left);
    const right = this.evaluate(expr.right);

    switch (expr.operator.type) {
      // comparison
      case TokenType.GREATER:
        this.checkNumberOperands(expr.operator, left, right);
        return <number> left > <number> right;
      case TokenType.GREATER_EQUAL:
        this.checkNumberOperands(expr.operator, left, right);
        return <number> left >= <number> right;
      case TokenType.LESS:
        this.checkNumberOperands(expr.operator, left, right);
        return <number> left < <number> right;
      case TokenType.LESS_EQUAL:
        this.checkNumberOperands(expr.operator, left, right);
        return <number> left <= <number> right;

      // equality

      case TokenType.BANG_EQUAL:
        return !this.isEqual(left, right);
      case TokenType.EQUAL_EQUAL:
        return this.isEqual(left, right);

      // reductions

      case TokenType.MINUS:
        this.checkNumberOperands(expr.operator, left, right);
        return <number> left - <number> right;
      case TokenType.SLASH:
        this.checkNumberOperands(expr.operator, left, right);
        return <number> left / <number> right;
      case TokenType.STAR:
        this.checkNumberOperands(expr.operator, left, right);
        return <number> left * <number> right;
      case TokenType.PLUS:
        // handle overloads for string and numbers
        if (typeof left === "string" && typeof right === "string") {
          return <string> left + <string> right;
        }

        if (typeof left === "number" && typeof right === "number") {
          return <number> left + <number> right;
        }

        throw new RuntimeError(
          expr.operator,
          "Operands must be two numbers or two strings.",
        );
    }

    //unreachable
    return null;
  }

  visitCallExpr(expr: Call): NovaObject {
    const callee = this.evaluate(expr.callee);

    const args: NovaObject[] = [];
    for (const arg of expr.args) {
      args.push(this.evaluate());
    }

    // ensure that the callee isn't a weird type, eg a string
    if (!(callee instanceof LoxCallable)) {
      throw new RuntimeError(expr.paren, "Can only call functions and classes");
    }
    const fn: NovaCallable = callee as NovaCallable;
    // ensure that we have the correct number of arguments to call the function
    if (args.length != fn.arity()) {
      throw new RuntimeError(expr.paren, `Expected ${fn.arity()} arguments but got ${args.length}.`)
    }
    return fn.call(this, args);
  }

  private checkNumberOperand(operator: Token, operand: NovaObject): void {
    if (typeof operand === "number") return;
    throw new RuntimeError(operator, "Operand must be a number.");
  }

  private checkNumberOperands(
    operator: Token,
    left: NovaObject,
    right: NovaObject,
  ): void {
    if (typeof left === "number" && typeof right === "number") return;
    throw new RuntimeError(operator, "Operands must be numbers.");
  }

  private evaluate(expr: Expr): NovaObject {
    return expr.accept(this);
  }

  private execute(stmt: Stmt): void {
    stmt.accept(this);
  }

  executeBlock(statements: Array<Stmt>, environment: Environment) {
    const previous: Environment = this.#environment;
    try {
      this.#environment = environment;
      for (const statement of statements) {
        this.execute(statement);
      }
    } finally {
      this.#environment = previous;
    }
  }

  private isTruthy(obj: NovaObject): boolean {
    if (obj === null) return false;
    if (typeof obj === "boolean") return <boolean> (obj);
    return true;
  }

  private isEqual(left: NovaObject, right: NovaObject): boolean {
    return left === right;
  }

  private stringify(obj: NovaObject): string {
    if (obj === null) return "nil";
    if (typeof obj === "number") {
      // handle converting 2.0 -> "2"
      let text = String(obj);
      if (text.endsWith(".0")) {
        text = text.substring(0, text.length - 2);
      }
      return text;
    }
    return String(obj);
  }
}
