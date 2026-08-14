// PostgREST returns an embedded to-one relation as a plain object, but the
// generated types (and some client versions) model every embed as an array.
// Normalize either shape to a single value so callers don't have to guess.
export function embeddedOne<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}
