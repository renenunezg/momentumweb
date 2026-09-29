// Generated from production cfb.team_ratings column metadata after migration 014.
export type CfbRatingsDatabase = {
  cfb: {
    Tables: {
      team_ratings: {
        Row: {
          season: number;
          week: number;
          as_of: string;
          model_version: string;
          team_id: number;
          team: string;
          conference: string | null;
          classification: string | null;
          offense_points: number | null;
          defense_points: number | null;
          power_rating: number;
          scoring_environment: number | null;
          expected_possessions: number | null;
          power_rating_sd: number | null;
          missing_input_count: number | null;
          market_rating: number | null;
          market_rating_sd: number | null;
          market_rating_games: number | null;
        };
        Insert: {
          season: number;
          week: number;
          as_of: string;
          model_version: string;
          team_id: number;
          team: string;
          conference?: string | null;
          classification?: string | null;
          offense_points?: number | null;
          defense_points?: number | null;
          power_rating: number;
          scoring_environment?: number | null;
          expected_possessions?: number | null;
          power_rating_sd?: number | null;
          missing_input_count?: number | null;
          market_rating?: number | null;
          market_rating_sd?: number | null;
          market_rating_games?: number | null;
        };
        Update: {
          season?: number;
          week?: number;
          as_of?: string;
          model_version?: string;
          team_id?: number;
          team?: string;
          conference?: string | null;
          classification?: string | null;
          offense_points?: number | null;
          defense_points?: number | null;
          power_rating?: number;
          scoring_environment?: number | null;
          expected_possessions?: number | null;
          power_rating_sd?: number | null;
          missing_input_count?: number | null;
          market_rating?: number | null;
          market_rating_sd?: number | null;
          market_rating_games?: number | null;
        };
        Relationships: [];
      };
    };
  };
};
