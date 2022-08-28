import Interpreter from "./Interpreter.ts";
interface NovaCallable {
  arity() : int;
  call(interpreter: Interpreter, args: NovaObject[]): NovaObject;
}
