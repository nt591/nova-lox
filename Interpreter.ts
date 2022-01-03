import { Binary, Expr, Grouping, Literal, Unary, Visitor } from './Expr.ts';
import { TokenType } from "./TokenType.ts";
type NovaObject = unknown;

export class Interpreter implements Visitor<NovaObject> {
  visitLiteralExpr(expr: Literal) : NovaObject {
    return expr.value;
  }
  
  visitGroupingExpr(expr: Grouping) : NovaObject {
    return this.evaluate(expr.expression);
  }

  visitUnaryExpr(expr: Unary) : NovaObject {
    const right = this.evaluate(expr.right);
    switch (expr.operator.type) {
      case TokenType.BANG:
        return !this.isTruthy(right);
      case TokenType.MINUS:
        return <number>(right) * -1;
    }

    // unreachable
    return null;
  }

  visitBinaryExpr(expr: Binary) : NovaObject {
    // evalates left to right
    const left = this.evaluate(expr.left);
    const right = this.evaluate(expr.right);

    switch (expr.operator.type) {
      // comparison
      case TokenType.GREATER:
        return <number>left > <number>right;
      case TokenType.GREATER_EQUAL:
        return <number>left >= <number>right;
      case TokenType.LESS:
        return <number>left < <number>right;
      case TokenType.LESS_EQUAL:
        return <number>left <= <number>right;
      
      // equality
      case TokenType.BANG_EQUAL: return !this.isEqual(left, right);
      case TokenType.EQUAL_EQUAL: return this.isEqual(left, right);

      // reductions
      case TokenType.MINUS:
        return <number>left - <number>right;
      case TokenType.SLASH:
        return <number>left / <number>right;
      case TokenType.STAR:
        return <number>left * <number>right;
      case TokenType.PLUS:
        // handle overloads for string and numbers
        if (left instanceof String && right instanceof String) {
          return <string>left + <string>right;
        }

        if (left instanceof Number && right instanceof Number) {
          return <number>left + <number>right;
        }

        break;
    }

    //unreachable
    return null;
  }

  private evaluate(expr: Expr) : NovaObject {
    return expr.accept(this);
  }

  private isTruthy(obj : NovaObject) : boolean {
    if (obj === null) return false;
    if (obj instanceof Boolean) return <boolean>(obj);
    return true;
  }

  private isEqual(left: NovaObject, right: NovaObject) : boolean {
    return left === right;
  }
}