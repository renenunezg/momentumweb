// Generated from sql/003_recommendations.sql using local PostgreSQL column metadata.
export type CfbPicksDatabase = {
  cfb: {
    Tables: {
      recommendations: {
        Row: {
          game_id: number;
          market: string;
          season: number;
          week: number;
          start_date: string;
          home_team: string;
          away_team: string;
          model_version: string;
          forecast_as_of: string;
          home_missing_input_count: number | null;
          away_missing_input_count: number | null;
          policy_version: string;
          decision_at: string;
          published_at: string;
          status: string;
          reason: string;
          selection: string | null;
          side: string | null;
          point: number | null;
          price: number | null;
          provider: string | null;
          provider_key: string | null;
          market_fetched_at: string | null;
          odds_api_event_id: string | null;
          provider_start_date: string | null;
          provider_last_update: string | null;
          match_score: number | null;
          win_probability: number | null;
          push_probability: number | null;
          probability_edge: number | null;
          expected_value_per_unit: number | null;
          stake_units: number;
          model_home_margin: number;
          model_total: number;
          margin_sd: number;
          total_sd: number;
          degrees_of_freedom: number | null;
          outcome: string;
          home_points: number | null;
          away_points: number | null;
          profit_units: number | null;
          graded_at: string | null;
        };
        Insert: Partial<CfbPicksDatabase["cfb"]["Tables"]["recommendations"]["Row"]>;
        Update: Partial<CfbPicksDatabase["cfb"]["Tables"]["recommendations"]["Row"]>;
        Relationships: [];
      };
    };
    Views: {
      recommendation_performance: {
        Row: {
          season: number | null;
          segment_kind: string | null;
          segment: string | null;
          picks: number | null;
          no_plays: number | null;
          pending: number | null;
          wins: number | null;
          losses: number | null;
          pushes: number | null;
          voids: number | null;
          staked_units: number | null;
          profit_units: number | null;
          average_ev: number | null;
          first_decision_at: string | null;
          last_decision_at: string | null;
          last_graded_at: string | null;
          roi: number | null;
          win_rate: number | null;
          thin_sample: boolean | null;
        };
        Relationships: [];
      };
    };
    Functions: Record<string, never>;
  };
};
