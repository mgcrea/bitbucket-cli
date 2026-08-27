export const collect = async <T>(source: AsyncIterable<T>, limit?: number): Promise<T[]> => {
  const values: T[] = [];
  for await (const value of source) {
    values.push(value);
    if (limit !== undefined && values.length >= limit) {
      break;
    }
  }
  return values;
};

export const first = async <T>(source: AsyncIterable<T>): Promise<T | undefined> => {
  for await (const value of source) {
    return value;
  }
  return undefined;
};
