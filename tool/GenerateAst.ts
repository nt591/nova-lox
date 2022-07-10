class GenerateAst {
  public static async main(): Promise<void> {
    const args = Deno.args;
    if (args.length !== 1) {
      console.error("Usage: generate_ast <output directory>");
      Deno.exit(64);
    }

    const outputDir: string = args[0];
    await this.defineAst(outputDir, "Expr", [
      "Assign   # name : Token, value : Expr",
      "Binary   # left : Expr, operator : Token, right : Expr",
      "Grouping # expression : Expr",
      "Literal  # value : string | number | boolean | null",
      "Logical # left : Expr, operator : Token, right : Expr",
      "Unary    # operator : Token, right : Expr",
      "Variable # name : Token",
    ], ["import { Token } from './Token.ts';"]);

    await this.defineAst(outputDir, "Stmt", [
      "Block      # statements : Array<Stmt>",
      "Expression # expression : Expr",
      "If         # condition : Expr, thenBranch : Stmt, elseBranch : Stmt | null",
      "Print      # expression : Expr",
      "Var        # name : Token, initializer : Expr | null",
      "While      # condition : Expr, body : Stmt",
    ], [
      "import { Expr } from './Expr.ts';",
      "import { Token } from './Token.ts';",
    ]);
  }

  private static async defineAst(
    outputDir: string,
    baseName: string,
    types: Array<string>,
    imports: Array<string>,
  ): Promise<void> {
    try {
      await Deno.mkdir(outputDir);
    } catch {
      //swallow error if exists
    }
    const path = outputDir + "/" + baseName + ".ts";
    await Deno.create(path);

    const encoder = new TextEncoder();

    // import types
    for (const impt of imports) {
      await this.appendToFile(
        encoder,
        impt,
        path,
      );
    }

    await this.appendToFile(
      encoder,
      `export abstract class ${baseName} {`,
      path,
    );
    // base accept method for abstract class
    await this.appendToFile(
      encoder,
      "  abstract accept<R>(visitor: Visitor<R>) : R;",
      path,
    );
    await this.appendToFile(encoder, "}", path);

    // write visitor
    await this.defineVisitor(encoder, path, baseName, types);

    // write AST classes
    for (const type of types) {
      const [className, fields] = type.split("#");
      await this.defineType(
        path,
        encoder,
        baseName,
        className.trim(),
        fields.trim(),
      );
    }

    await this.appendToFile(encoder, "", path);
  }

  private static async defineType(
    path: string,
    encoder: TextEncoder,
    baseName: string,
    className: string,
    fields: string,
  ) {
    await this.appendToFile(
      encoder,
      `export class ${className} extends ${baseName} {`,
      path,
    );

    // fields
    const fieldList = fields.split(", ");
    for (const field of fieldList) {
      await this.appendToFile(encoder, `  readonly ${field};`, path);
    }

    // constructor: start
    await this.appendToFile(encoder, `  constructor(${fields}) {`, path);

    // forced super call
    await this.appendToFile(encoder, "    super();", path);

    // store fields
    for (const field of fieldList) {
      const name = field.split(" : ")[0];
      await this.appendToFile(encoder, `    this.${name} = ${name};`, path);
    }
    await this.appendToFile(encoder, "  }", path);
    // constructor: end

    // override Visitor pattern
    await this.appendToFile(encoder, "", path);
    await this.appendToFile(
      encoder,
      `  accept<R>(visitor: Visitor<R>) : R {`,
      path,
    );
    await this.appendToFile(
      encoder,
      `    return visitor.visit${className}${baseName}(this);`,
      path,
    );
    await this.appendToFile(encoder, `  }`, path);

    await this.appendToFile(encoder, "}", path);
  }

  private static async defineVisitor(
    encoder: TextEncoder,
    path: string,
    baseName: string,
    types: Array<string>,
  ): Promise<void> {
    await this.appendToFile(encoder, "export interface Visitor<R> {", path);

    for (const type of types) {
      const typename = type.split("#")[0].trim();
      const visitorMethodName =
        `  visit${typename}${baseName}(${baseName.toLowerCase()} : ${typename}) : R;`;
      await this.appendToFile(encoder, visitorMethodName, path);
    }

    await this.appendToFile(encoder, "}", path);
  }

  private static async appendToFile(
    encoder: TextEncoder,
    data: string,
    path: string,
  ): Promise<void> {
    await Deno.writeFile(path, encoder.encode(`${data}\n`), { append: true });
  }
}

await GenerateAst.main();
