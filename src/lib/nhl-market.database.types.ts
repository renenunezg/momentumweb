// Generated from nhl.market_snapshots by Supabase postgres-meta.
import type { Json } from "./database.types";

export type NhlMarketDatabase = {
  nhl: {
    Tables: {
      market_snapshots: {
        Row: {
          away_price: number | null
          away_puck_price: number | null
          fetched_at: string
          game_id: string
          home_price: number | null
          home_puck_price: number | null
          over_price: number | null
          provider_key: string
          provider_last_update: string | null
          puck_line: number | null
          quote_verifications: NonNullable<Json>
          total_line: number | null
          under_price: number | null
        }
        Insert: {
          away_price?: number | null
          away_puck_price?: number | null
          fetched_at: string
          game_id: string
          home_price?: number | null
          home_puck_price?: number | null
          over_price?: number | null
          provider_key: string
          provider_last_update?: string | null
          puck_line?: number | null
          quote_verifications?: NonNullable<Json>
          total_line?: number | null
          under_price?: number | null
        }
        Update: {
          away_price?: number | null
          away_puck_price?: number | null
          fetched_at?: string
          game_id?: string
          home_price?: number | null
          home_puck_price?: number | null
          over_price?: number | null
          provider_key?: string
          provider_last_update?: string | null
          puck_line?: number | null
          quote_verifications?: NonNullable<Json>
          total_line?: number | null
          under_price?: number | null
        }
        Relationships: []
      }
    }
  }
};
