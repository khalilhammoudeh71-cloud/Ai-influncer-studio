/** Bound session restoration without racing it into an unauthenticated request. */
export async function withDeadline<T>(operation: PromiseLike<T>, message: string, milliseconds = 20000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([Promise.resolve(operation), new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(message)), milliseconds);
    })]);
  } finally { if (timer !== undefined) clearTimeout(timer); }
}
