export type ActionResult<T = undefined> = { ok: boolean; message?: string; data?: T; fieldErrors?: Record<string, string> };
export const ok = <T,>(message?: string, data?: T): ActionResult<T> => ({ ok: true, message, data });
export const fail = (message: string, fieldErrors?: Record<string, string>): ActionResult<never> => ({ ok: false, message, fieldErrors });
