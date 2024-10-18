import Schema, { Rule } from "async-validator";

export class Validator extends Schema {
  private constructor(descriptor: Record<string, Rule>) {
    super(descriptor);
  }

  static factory<FormType>(descriptor: Record<keyof FormType, Rule>) {
    return new Validator(descriptor);
  }
}
