import { Binary, Expr, Grouping, Literal, Unary, Visitor } from "./Expr.ts";
import { Token } from "./Token.ts";
import { TokenType } from "./TokenType.ts";
import { RuntimeError } from "./RuntimeError.ts";
import { Nova } from "./Nova.ts";

type NovaObject = unknown;

export class Interpreter implements Visitor<NovaObject> {
  interpret(expression: Expr | null): void {
    if (expression === null) return;
    try {
      const val = this.evaluate(expression);
      console.log(this.stringify(val));
    } catch (e) {
      Nova.runtimeError(e);
    }
  }

  visitLiteralExpr(expr: Literal): NovaObject {
    return expr.value;
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
