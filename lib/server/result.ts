/** Typed result for Server Actions a discriminated union the client narrows on. */
export type Result<T, E = string> = { ok: true; data: T } | { ok: false; error: E };

export const ok = <T>(data: T): Result<T, never> => ({ ok: true, data });
export const err = <E = string>(error: E): Result<never, E> => ({ ok: false, error });
