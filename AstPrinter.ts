import { Visitor, Binary, Grouping, Literal, Unary, Expr } from './Expr.ts';

export class AstPrinter implements Visitor<string> {
  print(expr: Expr | null) : string {
    if (expr === null) return "";
    return expr.accept(this);
  }

  visitBinaryExpr(expr : Binary) : string {
    return this.parenthesize(expr.operator.lexeme, expr.left, expr.right);
  }

  visitGroupingExpr(expr: Grouping) : string {
    return this.parenthesize("group", expr.expression);
  }

  visitLiteralExpr(expr: Literal) : string {
    return expr.value?.toString() ?? "nil";
  }

  visitUnaryExpr(expr: Unary) : string {
    return this.parenthesize(expr.operator.lexeme, expr.right);
  }

  private parenthesize(name: string, ...exprs: Array<Expr>) : string {
    let string = "";
    string += "(";
    string += name;

    for (const expr of exprs) {
      string += " ";
      string += expr.accept(this);
    }

    string += ")";

    return string;
  }
}