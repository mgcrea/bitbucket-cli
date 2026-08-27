import { EXIT } from "../errors.js";
import { loadClack } from "./load.js";

export type SelectOption<T> = { value: T; label: string; hint?: string | undefined };

export type Prompter = {
  text(options: {
    message: string;
    placeholder?: string | undefined;
    /** Returned when the user submits an empty field. Unlike a starting value, it does
     * not have to be deleted before typing something else. */
    defaultValue?: string | undefined;
    validate?: ((value: string) => string | undefined) | undefined;
  }): Promise<string>;
  password(options: {
    message: string;
    validate?: ((value: string) => string | undefined) | undefined;
  }): Promise<string>;
  /** Constrained to string values: clack's Option type is conditional on the value
   * being primitive, which an unresolved generic cannot satisfy. */
  select<T extends string>(options: { message: string; options: SelectOption<T>[] }): Promise<T>;
  confirm(options: { message: string; initialValue?: boolean | undefined }): Promise<boolean>;
  note(message: string, title?: string): Promise<void>;
  /** A line inside clack's gutter, so it does not break the visual flow. */
  message(text: string): Promise<void>;
  warn(text: string): Promise<void>;
  intro(message: string): Promise<void>;
  outro(message: string): Promise<void>;
};

/**
 * Cancelling a prompt is not an error to report, it is the user changing their mind.
 * Exiting 130 matches the shell convention for SIGINT.
 */
const CANCELLED = Symbol("cancelled");

export const createPrompter = async (): Promise<Prompter> => {
  const clack = await loadClack();

  // Every prompt writes to stderr, so `bb ... --json | jq` stays parseable even when a
  // command stops to ask something.
  const common = { output: process.stderr } as const;

  const unwrap = <T>(value: T | symbol): T => {
    if (clack.isCancel(value)) {
      clack.cancel("Cancelled.");
      process.exit(EXIT.interrupted);
    }
    return value as T;
  };

  return {
    async text(options) {
      return unwrap(
        await clack.text({
          ...common,
          message: options.message,
          ...(options.placeholder === undefined ? {} : { placeholder: options.placeholder }),
          ...(options.defaultValue === undefined ? {} : { defaultValue: options.defaultValue }),
          ...(options.validate === undefined
            ? {}
            : { validate: (value: string | undefined) => options.validate?.(value ?? "") }),
        }),
      );
    },
    async password(options) {
      return unwrap(
        await clack.password({
          ...common,
          message: options.message,
          ...(options.validate === undefined
            ? {}
            : { validate: (value: string | undefined) => options.validate?.(value ?? "") }),
        }),
      );
    },
    async select<T extends string>(options: {
      message: string;
      options: SelectOption<T>[];
    }): Promise<T> {
      return unwrap(
        await clack.select({
          ...common,
          message: options.message,
          // Rebuilt rather than spread: `hint` is optional here and required-or-absent
          // under exactOptionalPropertyTypes.
          // clack types an option as `Value extends Primitive ? {...} : {...}`, and
          // TypeScript defers a conditional type on an unresolved generic, so this
          // cannot be proven here even with `T extends string`. The shape is correct.
          options: options.options.map((option) => ({
            value: option.value,
            label: option.label,
            ...(option.hint === undefined ? {} : { hint: option.hint }),
          })) as Parameters<typeof clack.select<T>>[0]["options"],
        }),
      ) as T;
    },
    async confirm(options) {
      return unwrap(
        await clack.confirm({
          ...common,
          message: options.message,
          ...(options.initialValue === undefined ? {} : { initialValue: options.initialValue }),
        }),
      );
    },
    async note(message, title) {
      clack.note(message, title, common);
    },
    async message(text) {
      clack.log.message(text, common);
    },
    async warn(text) {
      clack.log.warn(text, common);
    },
    async intro(message) {
      clack.intro(message, common);
    },
    async outro(message) {
      clack.outro(message, common);
    },
  };
};

export { CANCELLED };
