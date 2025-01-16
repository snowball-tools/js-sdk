export const ExtendedJSON = {
  stringify: (obj: any) => JSON.stringify(obj, (_, v) => (typeof v === 'bigint' ? v.toString() + 'n' : v)),

  parse: (str: string) =>
    JSON.parse(str, (_, v) =>
      typeof v === 'string' && v.endsWith('n') && /^[0-9]+n$/.test(v) ? BigInt(v.slice(0, -1)) : v,
    ),
}
