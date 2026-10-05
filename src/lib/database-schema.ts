import type { Database } from "./database.types";

// Keep schema explicit at callers while using the standard generated database types.
export type Tables<
  Schema extends keyof Database,
  Name extends keyof (Database[Schema]["Tables"] & Database[Schema]["Views"]),
> = (Database[Schema]["Tables"] & Database[Schema]["Views"])[Name] extends { Row: infer Row }
  ? Row
  : never;
