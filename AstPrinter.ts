import * as Expr from './Expr.ts';

class AstPrinter implements Expr.Visitor<string> {
  print(expr: Expr.Expr) : string {
    return expr.accept(this);
  }

  visitBinaryExpr(expr : Expr.Binary) : string {
    return this.parenthesize(expr.operator.lexeme, expr.left, expr.right);
  }

  visitGroupingExpr(expr: Expr.Grouping) : string {
    return this.parenthesize("group", expr.expression);
  }

  visitLiteralExpr(expr: Expr.Literal) : string {
    return expr.value?.toString() ?? "nil";
  }

  visitUnaryExpr(expr: Expr.Unary) : string {
    return this.parenthesize(expr.operator.lexeme, expr.right);
  }

  private parenthesize(name: string, ...exprs: Array<Expr.Expr>) : string {
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