export const removeEmpty = <T extends Record<any, any>>(obj: T): T =>
  Object.fromEntries(
    Object.entries(obj).filter(
      ([, value]) =>
        value !== undefined && !(typeof value === 'number' && isNaN(value))
    )
  ) as T;
