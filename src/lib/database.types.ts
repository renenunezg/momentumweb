export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  cfb: {
    Tables: {
      backtest_predictions: {
        Row: {
          actual_margin: number | null
          away_points: number | null
          away_team: string
          closing_spread: number | null
          game_id: number
          home_points: number | null
          home_team: string
          margin: number | null
          model_margin: number | null
          neutral_site: boolean | null
          season: number
          season_type: string | null
          week: number
          week_index: number | null
        }
        Insert: {
          actual_margin?: number | null
          away_points?: number | null
          away_team: string
          closing_spread?: number | null
          game_id: number
          home_points?: number | null
          home_team: string
          margin?: number | null
          model_margin?: number | null
          neutral_site?: boolean | null
          season: number
          season_type?: string | null
          week: number
          week_index?: number | null
        }
        Update: {
          actual_margin?: number | null
          away_points?: number | null
          away_team?: string
          closing_spread?: number | null
          game_id?: number
          home_points?: number | null
          home_team?: string
          margin?: number | null
          model_margin?: number | null
          neutral_site?: boolean | null
          season?: number
          season_type?: string | null
          week?: number
          week_index?: number | null
        }
        Relationships: []
      }
      game_projections: {
        Row: {
          as_of: string
          away_classification: string | null
          away_missing_input_count: number | null
          away_qb_out: boolean | null
          away_team: string
          away_team_id: number | null
          conference_game: boolean | null
          degrees_of_freedom: number | null
          distribution: string | null
          expected_away_points: number | null
          expected_home_points: number | null
          game_id: number
          home_classification: string | null
          home_field_points: number | null
          home_margin: number | null
          home_missing_input_count: number | null
          home_qb_out: boolean | null
          home_spread: number | null
          home_team: string
          home_team_id: number | null
          margin_sd: number | null
          margin_total_correlation: number | null
          market_history_home_margin: number | null
          market_history_weight: number | null
          market_home_spread: number | null
          market_informed_away_points: number | null
          market_informed_home_margin: number | null
          market_informed_home_points: number | null
          market_informed_home_spread: number | null
          market_informed_total: number | null
          market_total_weight: number | null
          market_weight: number | null
          model_total: number | null
          model_version: string
          neutral_site: boolean | null
          pure_home_margin: number | null
          pure_home_spread: number | null
          qb_availability_points: number | null
          season: number
          start_date: string | null
          total_sd: number | null
          week: number
        }
        Insert: {
          as_of: string
          away_classification?: string | null
          away_missing_input_count?: number | null
          away_qb_out?: boolean | null
          away_team: string
          away_team_id?: number | null
          conference_game?: boolean | null
          degrees_of_freedom?: number | null
          distribution?: string | null
          expected_away_points?: number | null
          expected_home_points?: number | null
          game_id: number
          home_classification?: string | null
          home_field_points?: number | null
          home_margin?: number | null
          home_missing_input_count?: number | null
          home_qb_out?: boolean | null
          home_spread?: number | null
          home_team: string
          home_team_id?: number | null
          margin_sd?: number | null
          margin_total_correlation?: number | null
          market_history_home_margin?: number | null
          market_history_weight?: number | null
          market_home_spread?: number | null
          market_informed_away_points?: number | null
          market_informed_home_margin?: number | null
          market_informed_home_points?: number | null
          market_informed_home_spread?: number | null
          market_informed_total?: number | null
          market_total_weight?: number | null
          market_weight?: number | null
          model_total?: number | null
          model_version: string
          neutral_site?: boolean | null
          pure_home_margin?: number | null
          pure_home_spread?: number | null
          qb_availability_points?: number | null
          season: number
          start_date?: string | null
          total_sd?: number | null
          week: number
        }
        Update: {
          as_of?: string
          away_classification?: string | null
          away_missing_input_count?: number | null
          away_qb_out?: boolean | null
          away_team?: string
          away_team_id?: number | null
          conference_game?: boolean | null
          degrees_of_freedom?: number | null
          distribution?: string | null
          expected_away_points?: number | null
          expected_home_points?: number | null
          game_id?: number
          home_classification?: string | null
          home_field_points?: number | null
          home_margin?: number | null
          home_missing_input_count?: number | null
          home_qb_out?: boolean | null
          home_spread?: number | null
          home_team?: string
          home_team_id?: number | null
          margin_sd?: number | null
          margin_total_correlation?: number | null
          market_history_home_margin?: number | null
          market_history_weight?: number | null
          market_home_spread?: number | null
          market_informed_away_points?: number | null
          market_informed_home_margin?: number | null
          market_informed_home_points?: number | null
          market_informed_home_spread?: number | null
          market_informed_total?: number | null
          market_total_weight?: number | null
          market_weight?: number | null
          model_total?: number | null
          model_version?: string
          neutral_site?: boolean | null
          pure_home_margin?: number | null
          pure_home_spread?: number | null
          qb_availability_points?: number | null
          season?: number
          start_date?: string | null
          total_sd?: number | null
          week?: number
        }
        Relationships: []
      }
      graded_games: {
        Row: {
          actual_margin: number | null
          actual_total: number | null
          away_classification: string | null
          away_missing_input_count: number | null
          away_points: number | null
          away_team: string | null
          away_team_id: number | null
          closing_source: string | null
          closing_spread: number | null
          closing_total: number | null
          conference_game: boolean | null
          degrees_of_freedom: number | null
          distribution: string | null
          forecast_as_of: string | null
          forecast_market_home_spread: number | null
          forecast_week: number | null
          game_id: number
          graded_at: string | null
          home_classification: string | null
          home_missing_input_count: number | null
          home_points: number | null
          home_team: string | null
          home_team_id: number | null
          home_win_probability: number | null
          margin_sd: number | null
          market_informed_home_margin: number | null
          market_informed_total: number | null
          market_weight: number | null
          model_total: number | null
          model_version: string | null
          n_spread_offers: number | null
          n_total_offers: number | null
          neutral_site: boolean | null
          probability_method: string | null
          pure_home_margin: number | null
          score_source: string | null
          season: number
          season_type: string | null
          source_ingested_at: string | null
          start_date: string | null
          total_sd: number | null
          week: number
        }
        Insert: {
          actual_margin?: number | null
          actual_total?: number | null
          away_classification?: string | null
          away_missing_input_count?: number | null
          away_points?: number | null
          away_team?: string | null
          away_team_id?: number | null
          closing_source?: string | null
          closing_spread?: number | null
          closing_total?: number | null
          conference_game?: boolean | null
          degrees_of_freedom?: number | null
          distribution?: string | null
          forecast_as_of?: string | null
          forecast_market_home_spread?: number | null
          forecast_week?: number | null
          game_id: number
          graded_at?: string | null
          home_classification?: string | null
          home_missing_input_count?: number | null
          home_points?: number | null
          home_team?: string | null
          home_team_id?: number | null
          home_win_probability?: number | null
          margin_sd?: number | null
          market_informed_home_margin?: number | null
          market_informed_total?: number | null
          market_weight?: number | null
          model_total?: number | null
          model_version?: string | null
          n_spread_offers?: number | null
          n_total_offers?: number | null
          neutral_site?: boolean | null
          probability_method?: string | null
          pure_home_margin?: number | null
          score_source?: string | null
          season: number
          season_type?: string | null
          source_ingested_at?: string | null
          start_date?: string | null
          total_sd?: number | null
          week: number
        }
        Update: {
          actual_margin?: number | null
          actual_total?: number | null
          away_classification?: string | null
          away_missing_input_count?: number | null
          away_points?: number | null
          away_team?: string | null
          away_team_id?: number | null
          closing_source?: string | null
          closing_spread?: number | null
          closing_total?: number | null
          conference_game?: boolean | null
          degrees_of_freedom?: number | null
          distribution?: string | null
          forecast_as_of?: string | null
          forecast_market_home_spread?: number | null
          forecast_week?: number | null
          game_id?: number
          graded_at?: string | null
          home_classification?: string | null
          home_missing_input_count?: number | null
          home_points?: number | null
          home_team?: string | null
          home_team_id?: number | null
          home_win_probability?: number | null
          margin_sd?: number | null
          market_informed_home_margin?: number | null
          market_informed_total?: number | null
          market_weight?: number | null
          model_total?: number | null
          model_version?: string | null
          n_spread_offers?: number | null
          n_total_offers?: number | null
          neutral_site?: boolean | null
          probability_method?: string | null
          pure_home_margin?: number | null
          score_source?: string | null
          season?: number
          season_type?: string | null
          source_ingested_at?: string | null
          start_date?: string | null
          total_sd?: number | null
          week?: number
        }
        Relationships: []
      }
      heisman_board: {
        Row: {
          ap_rank: number | null
          as_of: string
          athlete_id: string
          athlete_name: string
          defensive_interceptions: number | null
          games: number
          interceptions: number | null
          model_version: string
          pass_touchdowns: number | null
          pass_yards: number | null
          position: string | null
          predicted_rank: number
          predicted_share: number
          rank_gap: number | null
          receiving_touchdowns: number | null
          receiving_yards: number | null
          rush_touchdowns: number | null
          rush_yards: number | null
          sacks: number | null
          season: number
          tackles: number | null
          team: string
          total_touchdowns: number | null
          value_rank: number | null
          week: number
          win_pct: number | null
        }
        Insert: {
          ap_rank?: number | null
          as_of: string
          athlete_id: string
          athlete_name: string
          defensive_interceptions?: number | null
          games: number
          interceptions?: number | null
          model_version: string
          pass_touchdowns?: number | null
          pass_yards?: number | null
          position?: string | null
          predicted_rank: number
          predicted_share: number
          rank_gap?: number | null
          receiving_touchdowns?: number | null
          receiving_yards?: number | null
          rush_touchdowns?: number | null
          rush_yards?: number | null
          sacks?: number | null
          season: number
          tackles?: number | null
          team: string
          total_touchdowns?: number | null
          value_rank?: number | null
          week: number
          win_pct?: number | null
        }
        Update: {
          ap_rank?: number | null
          as_of?: string
          athlete_id?: string
          athlete_name?: string
          defensive_interceptions?: number | null
          games?: number
          interceptions?: number | null
          model_version?: string
          pass_touchdowns?: number | null
          pass_yards?: number | null
          position?: string | null
          predicted_rank?: number
          predicted_share?: number
          rank_gap?: number | null
          receiving_touchdowns?: number | null
          receiving_yards?: number | null
          rush_touchdowns?: number | null
          rush_yards?: number | null
          sacks?: number | null
          season?: number
          tackles?: number | null
          team?: string
          total_touchdowns?: number | null
          value_rank?: number | null
          week?: number
          win_pct?: number | null
        }
        Relationships: []
      }
      heisman_history: {
        Row: {
          actual_share: number
          actual_winner: string
          actual_winner_predicted_rank: number | null
          actual_winner_predicted_share: number
          actual_winner_team: string
          predicted_winner: string
          predicted_winner_share: number
          predicted_winner_team: string
          season: number
          top_three_hit: boolean
          winner_hit: boolean
          winner_value_rank: number | null
        }
        Insert: {
          actual_share: number
          actual_winner: string
          actual_winner_predicted_rank?: number | null
          actual_winner_predicted_share: number
          actual_winner_team: string
          predicted_winner: string
          predicted_winner_share: number
          predicted_winner_team: string
          season: number
          top_three_hit: boolean
          winner_hit: boolean
          winner_value_rank?: number | null
        }
        Update: {
          actual_share?: number
          actual_winner?: string
          actual_winner_predicted_rank?: number | null
          actual_winner_predicted_share?: number
          actual_winner_team?: string
          predicted_winner?: string
          predicted_winner_share?: number
          predicted_winner_team?: string
          season?: number
          top_three_hit?: boolean
          winner_hit?: boolean
          winner_value_rank?: number | null
        }
        Relationships: []
      }
      live_win_probability: {
        Row: {
          game_id: number
          payload: NonNullable<Json>
          updated_at: string
        }
        Insert: {
          game_id: number
          payload: NonNullable<Json>
          updated_at: string
        }
        Update: {
          game_id?: number
          payload?: NonNullable<Json>
          updated_at?: string
        }
        Relationships: []
      }
      market_comparisons: {
        Row: {
          away_team: string | null
          best_offer_bet_link: string | null
          best_offer_edge_points: number | null
          best_offer_edge_standardized: number | null
          best_offer_event_link: string | null
          best_offer_expected_value_per_unit: number | null
          best_offer_market: string | null
          best_offer_market_link: string | null
          best_offer_model_cover_probability: number | null
          best_offer_model_fair_price: number | null
          best_offer_point: number | null
          best_offer_price: number | null
          best_offer_provider: string | null
          best_offer_provider_key: string | null
          best_offer_provider_last_update: string | null
          best_offer_selection: string | null
          executable_offer_available: boolean | null
          game_id: number
          home_team: string | null
          margin_sd: number | null
          market_available: boolean | null
          model_as_of: string | null
          model_home_spread: number | null
          model_total: number | null
          priced_offer_available: boolean | null
          recommendation_status: string | null
          review_status: string | null
          start_date: string | null
          total_sd: number | null
        }
        Insert: {
          away_team?: string | null
          best_offer_bet_link?: string | null
          best_offer_edge_points?: number | null
          best_offer_edge_standardized?: number | null
          best_offer_event_link?: string | null
          best_offer_expected_value_per_unit?: number | null
          best_offer_market?: string | null
          best_offer_market_link?: string | null
          best_offer_model_cover_probability?: number | null
          best_offer_model_fair_price?: number | null
          best_offer_point?: number | null
          best_offer_price?: number | null
          best_offer_provider?: string | null
          best_offer_provider_key?: string | null
          best_offer_provider_last_update?: string | null
          best_offer_selection?: string | null
          executable_offer_available?: boolean | null
          game_id: number
          home_team?: string | null
          margin_sd?: number | null
          market_available?: boolean | null
          model_as_of?: string | null
          model_home_spread?: number | null
          model_total?: number | null
          priced_offer_available?: boolean | null
          recommendation_status?: string | null
          review_status?: string | null
          start_date?: string | null
          total_sd?: number | null
        }
        Update: {
          away_team?: string | null
          best_offer_bet_link?: string | null
          best_offer_edge_points?: number | null
          best_offer_edge_standardized?: number | null
          best_offer_event_link?: string | null
          best_offer_expected_value_per_unit?: number | null
          best_offer_market?: string | null
          best_offer_market_link?: string | null
          best_offer_model_cover_probability?: number | null
          best_offer_model_fair_price?: number | null
          best_offer_point?: number | null
          best_offer_price?: number | null
          best_offer_provider?: string | null
          best_offer_provider_key?: string | null
          best_offer_provider_last_update?: string | null
          best_offer_selection?: string | null
          executable_offer_available?: boolean | null
          game_id?: number
          home_team?: string | null
          margin_sd?: number | null
          market_available?: boolean | null
          model_as_of?: string | null
          model_home_spread?: number | null
          model_total?: number | null
          priced_offer_available?: boolean | null
          recommendation_status?: string | null
          review_status?: string | null
          start_date?: string | null
          total_sd?: number | null
        }
        Relationships: []
      }
      performance_metrics: {
        Row: {
          brier_score: number | null
          closer_than_market_share: number | null
          computed_at: string | null
          coverage_50: number | null
          coverage_80: number | null
          coverage_90: number | null
          games: number | null
          games_with_market: number | null
          log_loss: number | null
          margin_bias: number | null
          margin_mae: number | null
          margin_rmse: number | null
          market_mae: number | null
          model_minus_market_mae: number | null
          prediction_source: string
          probability_games: number | null
          season: number
          segment: string
          segment_kind: string
          segment_order: number | null
          thin_sample: boolean | null
          total_bias: number | null
          total_games: number | null
          total_mae: number | null
          total_rmse: number | null
        }
        Insert: {
          brier_score?: number | null
          closer_than_market_share?: number | null
          computed_at?: string | null
          coverage_50?: number | null
          coverage_80?: number | null
          coverage_90?: number | null
          games?: number | null
          games_with_market?: number | null
          log_loss?: number | null
          margin_bias?: number | null
          margin_mae?: number | null
          margin_rmse?: number | null
          market_mae?: number | null
          model_minus_market_mae?: number | null
          prediction_source: string
          probability_games?: number | null
          season: number
          segment: string
          segment_kind: string
          segment_order?: number | null
          thin_sample?: boolean | null
          total_bias?: number | null
          total_games?: number | null
          total_mae?: number | null
          total_rmse?: number | null
        }
        Update: {
          brier_score?: number | null
          closer_than_market_share?: number | null
          computed_at?: string | null
          coverage_50?: number | null
          coverage_80?: number | null
          coverage_90?: number | null
          games?: number | null
          games_with_market?: number | null
          log_loss?: number | null
          margin_bias?: number | null
          margin_mae?: number | null
          margin_rmse?: number | null
          market_mae?: number | null
          model_minus_market_mae?: number | null
          prediction_source?: string
          probability_games?: number | null
          season?: number
          segment?: string
          segment_kind?: string
          segment_order?: number | null
          thin_sample?: boolean | null
          total_bias?: number | null
          total_games?: number | null
          total_mae?: number | null
          total_rmse?: number | null
        }
        Relationships: []
      }
      player_model_meta: {
        Row: {
          as_of: string
          credit_shares: string
          fcs_opponent_weight: number
          heisman_ballot_share_covered: number | null
          heisman_coefficients: string
          heisman_evaluation_kind: string | null
          heisman_evaluation_seasons: number | null
          heisman_evaluation_week: number | null
          heisman_model_version: string
          heisman_top_three_rate: number
          heisman_training_seasons: string
          heisman_winner_hit_rate: number
          heisman_winner_pool_coverage: number | null
          opponent_effect_prior_games: number
          prior_games: number
          qualifying_games: number
          reliability: string
          replacement_percentile: number
          season: number
          value_model_version: string
        }
        Insert: {
          as_of: string
          credit_shares: string
          fcs_opponent_weight: number
          heisman_ballot_share_covered?: number | null
          heisman_coefficients: string
          heisman_evaluation_kind?: string | null
          heisman_evaluation_seasons?: number | null
          heisman_evaluation_week?: number | null
          heisman_model_version: string
          heisman_top_three_rate: number
          heisman_training_seasons: string
          heisman_winner_hit_rate: number
          heisman_winner_pool_coverage?: number | null
          opponent_effect_prior_games?: number
          prior_games?: number
          qualifying_games?: number
          reliability: string
          replacement_percentile: number
          season: number
          value_model_version: string
        }
        Update: {
          as_of?: string
          credit_shares?: string
          fcs_opponent_weight?: number
          heisman_ballot_share_covered?: number | null
          heisman_coefficients?: string
          heisman_evaluation_kind?: string | null
          heisman_evaluation_seasons?: number | null
          heisman_evaluation_week?: number | null
          heisman_model_version?: string
          heisman_top_three_rate?: number
          heisman_training_seasons?: string
          heisman_winner_hit_rate?: number
          heisman_winner_pool_coverage?: number | null
          opponent_effect_prior_games?: number
          prior_games?: number
          qualifying_games?: number
          reliability?: string
          replacement_percentile?: number
          season?: number
          value_model_version?: string
        }
        Relationships: []
      }
      player_values: {
        Row: {
          adjusted_epa: number
          adjusted_per_game: number
          adjusted_rate: number
          as_of: string
          athlete_id: string
          athlete_name: string
          classification: string | null
          fcs_play_share: number
          games: number
          model_version: string
          overall_rank: number
          plays: number
          position: string | null
          position_group: string
          position_rank: number
          raw_epa: number
          replacement_per_game: number
          season: number
          shrunk_per_game: number
          team: string
          team_id: number | null
          value_above_replacement: number
          week: number
          wpa: number
        }
        Insert: {
          adjusted_epa: number
          adjusted_per_game?: number
          adjusted_rate: number
          as_of: string
          athlete_id: string
          athlete_name: string
          classification?: string | null
          fcs_play_share: number
          games: number
          model_version: string
          overall_rank: number
          plays: number
          position?: string | null
          position_group: string
          position_rank: number
          raw_epa: number
          replacement_per_game?: number
          season: number
          shrunk_per_game?: number
          team: string
          team_id?: number | null
          value_above_replacement: number
          week: number
          wpa: number
        }
        Update: {
          adjusted_epa?: number
          adjusted_per_game?: number
          adjusted_rate?: number
          as_of?: string
          athlete_id?: string
          athlete_name?: string
          classification?: string | null
          fcs_play_share?: number
          games?: number
          model_version?: string
          overall_rank?: number
          plays?: number
          position?: string | null
          position_group?: string
          position_rank?: number
          raw_epa?: number
          replacement_per_game?: number
          season?: number
          shrunk_per_game?: number
          team?: string
          team_id?: number | null
          value_above_replacement?: number
          week?: number
          wpa?: number
        }
        Relationships: []
      }
      qb_availability: {
        Row: {
          notes: string | null
          player: string
          reported_at: string
          season: number
          source: string
          source_url: string | null
          status: string
          team: string
          updated_at: string
          week: number
        }
        Insert: {
          notes?: string | null
          player: string
          reported_at: string
          season: number
          source: string
          source_url?: string | null
          status: string
          team: string
          updated_at?: string
          week: number
        }
        Update: {
          notes?: string | null
          player?: string
          reported_at?: string
          season?: number
          source?: string
          source_url?: string | null
          status?: string
          team?: string
          updated_at?: string
          week?: number
        }
        Relationships: []
      }
      recommendations: {
        Row: {
          away_missing_input_count: number | null
          away_points: number | null
          away_team: string
          closing_point: number | null
          closing_price: number | null
          closing_source: string | null
          clv_points: number | null
          decision_at: string
          decision_forecast: Json | null
          degrees_of_freedom: number | null
          edge_points: number | null
          expected_value_per_unit: number | null
          forecast_as_of: string
          game_id: number
          graded_at: string | null
          home_missing_input_count: number | null
          home_points: number | null
          home_team: string
          margin_sd: number
          market: string
          market_fetched_at: string | null
          market_total: number | null
          match_score: number | null
          model_home_margin: number
          model_total: number
          model_version: string
          odds_api_event_id: string | null
          outcome: string
          point: number | null
          policy_version: string
          price: number | null
          probability_edge: number | null
          profit_units: number | null
          provider: string | null
          provider_key: string | null
          provider_last_update: string | null
          provider_start_date: string | null
          published_at: string
          push_probability: number | null
          reason: string
          season: number
          selection: string | null
          settlement_reason: string | null
          side: string | null
          stake_units: number
          start_date: string
          status: string
          total_sd: number
          week: number
          win_probability: number | null
        }
        Insert: {
          away_missing_input_count?: number | null
          away_points?: number | null
          away_team: string
          closing_point?: number | null
          closing_price?: number | null
          closing_source?: string | null
          clv_points?: number | null
          decision_at: string
          decision_forecast?: Json | null
          degrees_of_freedom?: number | null
          edge_points?: number | null
          expected_value_per_unit?: number | null
          forecast_as_of: string
          game_id: number
          graded_at?: string | null
          home_missing_input_count?: number | null
          home_points?: number | null
          home_team: string
          margin_sd: number
          market: string
          market_fetched_at?: string | null
          market_total?: number | null
          match_score?: number | null
          model_home_margin: number
          model_total: number
          model_version: string
          odds_api_event_id?: string | null
          outcome?: string
          point?: number | null
          policy_version: string
          price?: number | null
          probability_edge?: number | null
          profit_units?: number | null
          provider?: string | null
          provider_key?: string | null
          provider_last_update?: string | null
          provider_start_date?: string | null
          published_at?: string
          push_probability?: number | null
          reason: string
          season: number
          selection?: string | null
          settlement_reason?: string | null
          side?: string | null
          stake_units: number
          start_date: string
          status: string
          total_sd: number
          week: number
          win_probability?: number | null
        }
        Update: {
          away_missing_input_count?: number | null
          away_points?: number | null
          away_team?: string
          closing_point?: number | null
          closing_price?: number | null
          closing_source?: string | null
          clv_points?: number | null
          decision_at?: string
          decision_forecast?: Json | null
          degrees_of_freedom?: number | null
          edge_points?: number | null
          expected_value_per_unit?: number | null
          forecast_as_of?: string
          game_id?: number
          graded_at?: string | null
          home_missing_input_count?: number | null
          home_points?: number | null
          home_team?: string
          margin_sd?: number
          market?: string
          market_fetched_at?: string | null
          market_total?: number | null
          match_score?: number | null
          model_home_margin?: number
          model_total?: number
          model_version?: string
          odds_api_event_id?: string | null
          outcome?: string
          point?: number | null
          policy_version?: string
          price?: number | null
          probability_edge?: number | null
          profit_units?: number | null
          provider?: string | null
          provider_key?: string | null
          provider_last_update?: string | null
          provider_start_date?: string | null
          published_at?: string
          push_probability?: number | null
          reason?: string
          season?: number
          selection?: string | null
          settlement_reason?: string | null
          side?: string | null
          stake_units?: number
          start_date?: string
          status?: string
          total_sd?: number
          week?: number
          win_probability?: number | null
        }
        Relationships: []
      }
      serving_anchors: {
        Row: {
          anchor_week: number
          closing_fetched_at: string | null
          closing_snapshot_id: string | null
          closing_spread: number | null
          game_id: number
          home_margin: number
          latest_provider_update: string | null
          margin_sd: number
          margin_sd_method: string | null
          market_anchor_source: string | null
          model_week: number
          n_spread_offers: number | null
          published_at: string
          season: number
        }
        Insert: {
          anchor_week: number
          closing_fetched_at?: string | null
          closing_snapshot_id?: string | null
          closing_spread?: number | null
          game_id: number
          home_margin: number
          latest_provider_update?: string | null
          margin_sd: number
          margin_sd_method?: string | null
          market_anchor_source?: string | null
          model_week: number
          n_spread_offers?: number | null
          published_at?: string
          season: number
        }
        Update: {
          anchor_week?: number
          closing_fetched_at?: string | null
          closing_snapshot_id?: string | null
          closing_spread?: number | null
          game_id?: number
          home_margin?: number
          latest_provider_update?: string | null
          margin_sd?: number
          margin_sd_method?: string | null
          market_anchor_source?: string | null
          model_week?: number
          n_spread_offers?: number | null
          published_at?: string
          season?: number
        }
        Relationships: []
      }
      team_ratings: {
        Row: {
          as_of: string
          classification: string | null
          conference: string | null
          defense_points: number | null
          expected_possessions: number | null
          forecast_alignment_points: number | null
          market_rating: number | null
          market_rating_games: number | null
          market_rating_sd: number | null
          missing_input_count: number | null
          model_version: string
          offense_points: number | null
          power_rating: number
          power_rating_sd: number | null
          scoring_environment: number | null
          season: number
          team: string
          team_id: number
          week: number
        }
        Insert: {
          as_of: string
          classification?: string | null
          conference?: string | null
          defense_points?: number | null
          expected_possessions?: number | null
          forecast_alignment_points?: number | null
          market_rating?: number | null
          market_rating_games?: number | null
          market_rating_sd?: number | null
          missing_input_count?: number | null
          model_version: string
          offense_points?: number | null
          power_rating: number
          power_rating_sd?: number | null
          scoring_environment?: number | null
          season: number
          team: string
          team_id: number
          week: number
        }
        Update: {
          as_of?: string
          classification?: string | null
          conference?: string | null
          defense_points?: number | null
          expected_possessions?: number | null
          forecast_alignment_points?: number | null
          market_rating?: number | null
          market_rating_games?: number | null
          market_rating_sd?: number | null
          missing_input_count?: number | null
          model_version?: string
          offense_points?: number | null
          power_rating?: number
          power_rating_sd?: number | null
          scoring_environment?: number | null
          season?: number
          team?: string
          team_id?: number
          week?: number
        }
        Relationships: []
      }
      team_unit_ratings: {
        Row: {
          as_of: string
          classification: string | null
          model_version: string
          pass_block: number | null
          pass_defense: number | null
          pass_offense: number | null
          run_block: number | null
          rush_defense: number | null
          rush_offense: number | null
          season: number
          source_season: number | null
          team: string
          team_id: number
          unit_history_missing: boolean
          week: number
        }
        Insert: {
          as_of: string
          classification?: string | null
          model_version: string
          pass_block?: number | null
          pass_defense?: number | null
          pass_offense?: number | null
          run_block?: number | null
          rush_defense?: number | null
          rush_offense?: number | null
          season: number
          source_season?: number | null
          team: string
          team_id: number
          unit_history_missing?: boolean
          week: number
        }
        Update: {
          as_of?: string
          classification?: string | null
          model_version?: string
          pass_block?: number | null
          pass_defense?: number | null
          pass_offense?: number | null
          run_block?: number | null
          rush_defense?: number | null
          rush_offense?: number | null
          season?: number
          source_season?: number | null
          team?: string
          team_id?: number
          unit_history_missing?: boolean
          week?: number
        }
        Relationships: []
      }
      teams: {
        Row: {
          alternate_color: string | null
          color: string | null
          logo_dark: string | null
          logo_light: string | null
          team: string
          team_id: number
        }
        Insert: {
          alternate_color?: string | null
          color?: string | null
          logo_dark?: string | null
          logo_light?: string | null
          team: string
          team_id: number
        }
        Update: {
          alternate_color?: string | null
          color?: string | null
          logo_dark?: string | null
          logo_light?: string | null
          team?: string
          team_id?: number
        }
        Relationships: []
      }
    }
    Views: {
      recommendation_performance: {
        Row: {
          average_clv_points: number | null
          average_ev: number | null
          clv_positive_share: number | null
          clv_sample: number | null
          first_decision_at: string | null
          last_decision_at: string | null
          last_graded_at: string | null
          losses: number | null
          no_plays: number | null
          pending: number | null
          picks: number | null
          profit_units: number | null
          pushes: number | null
          roi: number | null
          season: number | null
          segment: string | null
          segment_kind: string | null
          staked_units: number | null
          thin_sample: boolean | null
          voids: number | null
          win_rate: number | null
          wins: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      recommendation_summary: {
        Args: { p_from?: string; p_market?: string; p_season?: number }
        Returns: {
          average_clv_points: number | null
          average_ev: number | null
          clv_positive_share: number | null
          clv_sample: number | null
          first_decision_at: string | null
          last_decision_at: string | null
          last_graded_at: string | null
          losses: number | null
          no_plays: number | null
          pending: number | null
          picks: number | null
          profit_units: number | null
          pushes: number | null
          roi: number | null
          season: number | null
          segment: string | null
          segment_kind: string | null
          staked_units: number | null
          thin_sample: boolean | null
          voids: number | null
          win_rate: number | null
          wins: number | null
        }[]
        SetofOptions: {
          from: "*"
          to: "recommendation_performance"
          isOneToOne: false
          isSetofReturn: true
        }
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  mlb: {
    Tables: {
      bullpen_daily: {
        Row: {
          game_date: string
          n_relievers: number
          reliever_outs: number
          starter_outs: number
          team: string
          updated_at: string
        }
        Insert: {
          game_date: string
          n_relievers?: number
          reliever_outs?: number
          starter_outs?: number
          team: string
          updated_at?: string
        }
        Update: {
          game_date?: string
          n_relievers?: number
          reliever_outs?: number
          starter_outs?: number
          team?: string
          updated_at?: string
        }
        Relationships: []
      }
      bullpen_stats: {
        Row: {
          bb_9: number | null
          era: number | null
          fip: number | null
          hr_9: number | null
          id: number
          ip: number | null
          k_9: number | null
          rhp_ip_share: number | null
          season: number
          siera: number | null
          team: string
          whip: number | null
          xfip: number | null
        }
        Insert: {
          bb_9?: number | null
          era?: number | null
          fip?: number | null
          hr_9?: number | null
          id?: number
          ip?: number | null
          k_9?: number | null
          rhp_ip_share?: number | null
          season?: number
          siera?: number | null
          team: string
          whip?: number | null
          xfip?: number | null
        }
        Update: {
          bb_9?: number | null
          era?: number | null
          fip?: number | null
          hr_9?: number | null
          id?: number
          ip?: number | null
          k_9?: number | null
          rhp_ip_share?: number | null
          season?: number
          siera?: number | null
          team?: string
          whip?: number | null
          xfip?: number | null
        }
        Relationships: []
      }
      experiment_runs: {
        Row: {
          best_cv_mae: number | null
          created_at: string | null
          feature_list: string[] | null
          git_sha: string | null
          hyperparameters: Json | null
          id: number
          notes: string | null
          run_date: string | null
        }
        Insert: {
          best_cv_mae?: number | null
          created_at?: string | null
          feature_list?: string[] | null
          git_sha?: string | null
          hyperparameters?: Json | null
          id?: number
          notes?: string | null
          run_date?: string | null
        }
        Update: {
          best_cv_mae?: number | null
          created_at?: string | null
          feature_list?: string[] | null
          git_sha?: string | null
          hyperparameters?: Json | null
          id?: number
          notes?: string | null
          run_date?: string | null
        }
        Relationships: []
      }
      games: {
        Row: {
          away_score: number | null
          away_team: string
          created_at: string | null
          game_date: string
          game_pk: number
          game_type: string | null
          home_score: number | null
          home_team: string
          start_time: string | null
          status: string
          updated_at: string | null
          venue: string | null
        }
        Insert: {
          away_score?: number | null
          away_team: string
          created_at?: string | null
          game_date: string
          game_pk: number
          game_type?: string | null
          home_score?: number | null
          home_team: string
          start_time?: string | null
          status?: string
          updated_at?: string | null
          venue?: string | null
        }
        Update: {
          away_score?: number | null
          away_team?: string
          created_at?: string | null
          game_date?: string
          game_pk?: number
          game_type?: string | null
          home_score?: number | null
          home_team?: string
          start_time?: string | null
          status?: string
          updated_at?: string | null
          venue?: string | null
        }
        Relationships: []
      }
      live_evaluation_completions: {
        Row: {
          completed_at: string
          eval_date: string
          game_pk: number
          input_version: string
        }
        ComputedFields: never
        Insert: {
          completed_at?: string
          eval_date: string
          game_pk: number
          input_version: string
        }
        Update: {
          completed_at?: string
          eval_date?: string
          game_pk?: number
          input_version?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_evaluation_completions_game_pk_fkey"
            columns: ["game_pk"]
            isOneToOne: true
            referencedRelation: "games"
            referencedColumns: ["game_pk"]
          },
        ]
      }
      live_win_probability: {
        Row: {
          game_pk: number
          payload: NonNullable<Json>
          source_timestamp: string
          updated_at: string
        }
        Insert: {
          game_pk: number
          payload: NonNullable<Json>
          source_timestamp: string
          updated_at: string
        }
        Update: {
          game_pk?: number
          payload?: NonNullable<Json>
          source_timestamp?: string
          updated_at?: string
        }
        Relationships: []
      }
      model_calibration: {
        Row: {
          bin_mid: number
          count: number | null
          created_at: string | null
          date: string
          id: number
          observed_rate: number | null
          predicted_mean: number | null
        }
        Insert: {
          bin_mid: number
          count?: number | null
          created_at?: string | null
          date: string
          id?: number
          observed_rate?: number | null
          predicted_mean?: number | null
        }
        Update: {
          bin_mid?: number
          count?: number | null
          created_at?: string | null
          date?: string
          id?: number
          observed_rate?: number | null
          predicted_mean?: number | null
        }
        Relationships: []
      }
      model_edge_buckets: {
        Row: {
          bucket_label: string
          created_at: string | null
          date: string
          eval_window: string
          hit_rate: number | null
          id: number
          n_bets: number | null
          roi: number | null
        }
        Insert: {
          bucket_label: string
          created_at?: string | null
          date: string
          eval_window: string
          hit_rate?: number | null
          id?: number
          n_bets?: number | null
          roi?: number | null
        }
        Update: {
          bucket_label?: string
          created_at?: string | null
          date?: string
          eval_window?: string
          hit_rate?: number | null
          id?: number
          n_bets?: number | null
          roi?: number | null
        }
        Relationships: []
      }
      model_evaluation: {
        Row: {
          average_total_diff: number | null
          average_win_prob: number | null
          avg_ml_line: number | null
          brier_score: number | null
          created_at: string | null
          date: string
          equity_end_units: number | null
          eval_window: string | null
          evaluation_started_at: string | null
          evaluation_state: string
          favorites_correct: number | null
          id: number
          interval_coverage_50: number | null
          interval_coverage_80: number | null
          interval_coverage_90: number | null
          interval_coverage_predictions: number | null
          log_loss: number | null
          mae: number | null
          mape: number | null
          max_drawdown: number | null
          ml_accuracy: number | null
          ml_correct: number | null
          ml_predictions: number | null
          n_favorites: number | null
          n_run_line: number | null
          n_underdogs: number | null
          net_profit_units: number | null
          overs_correct: number | null
          overs_predictions: number | null
          overs_roi: number | null
          predictions_rewritten: boolean
          r2: number | null
          rmse: number | null
          roi: number | null
          roi_favorites: number | null
          roi_run_line: number | null
          roi_underdogs: number | null
          run_line_accuracy: number | null
          run_line_bets_correct: number | null
          run_line_correct: number | null
          run_line_predictions: number | null
          sharpe: number | null
          sharpness: number | null
          sortino: number | null
          total_accuracy: number | null
          total_correct: number | null
          total_predictions: number | null
          total_staked_units: number | null
          totals_accuracy: number | null
          totals_correct: number | null
          totals_predictions: number | null
          underdogs_correct: number | null
          unders_correct: number | null
          unders_predictions: number | null
          unders_roi: number | null
        }
        Insert: {
          average_total_diff?: number | null
          average_win_prob?: number | null
          avg_ml_line?: number | null
          brier_score?: number | null
          created_at?: string | null
          date: string
          equity_end_units?: number | null
          eval_window?: string | null
          evaluation_started_at?: string | null
          evaluation_state?: string
          favorites_correct?: number | null
          id?: number
          interval_coverage_50?: number | null
          interval_coverage_80?: number | null
          interval_coverage_90?: number | null
          interval_coverage_predictions?: number | null
          log_loss?: number | null
          mae?: number | null
          mape?: number | null
          max_drawdown?: number | null
          ml_accuracy?: number | null
          ml_correct?: number | null
          ml_predictions?: number | null
          n_favorites?: number | null
          n_run_line?: number | null
          n_underdogs?: number | null
          net_profit_units?: number | null
          overs_correct?: number | null
          overs_predictions?: number | null
          overs_roi?: number | null
          predictions_rewritten?: boolean
          r2?: number | null
          rmse?: number | null
          roi?: number | null
          roi_favorites?: number | null
          roi_run_line?: number | null
          roi_underdogs?: number | null
          run_line_accuracy?: number | null
          run_line_bets_correct?: number | null
          run_line_correct?: number | null
          run_line_predictions?: number | null
          sharpe?: number | null
          sharpness?: number | null
          sortino?: number | null
          total_accuracy?: number | null
          total_correct?: number | null
          total_predictions?: number | null
          total_staked_units?: number | null
          totals_accuracy?: number | null
          totals_correct?: number | null
          totals_predictions?: number | null
          underdogs_correct?: number | null
          unders_correct?: number | null
          unders_predictions?: number | null
          unders_roi?: number | null
        }
        Update: {
          average_total_diff?: number | null
          average_win_prob?: number | null
          avg_ml_line?: number | null
          brier_score?: number | null
          created_at?: string | null
          date?: string
          equity_end_units?: number | null
          eval_window?: string | null
          evaluation_started_at?: string | null
          evaluation_state?: string
          favorites_correct?: number | null
          id?: number
          interval_coverage_50?: number | null
          interval_coverage_80?: number | null
          interval_coverage_90?: number | null
          interval_coverage_predictions?: number | null
          log_loss?: number | null
          mae?: number | null
          mape?: number | null
          max_drawdown?: number | null
          ml_accuracy?: number | null
          ml_correct?: number | null
          ml_predictions?: number | null
          n_favorites?: number | null
          n_run_line?: number | null
          n_underdogs?: number | null
          net_profit_units?: number | null
          overs_correct?: number | null
          overs_predictions?: number | null
          overs_roi?: number | null
          predictions_rewritten?: boolean
          r2?: number | null
          rmse?: number | null
          roi?: number | null
          roi_favorites?: number | null
          roi_run_line?: number | null
          roi_underdogs?: number | null
          run_line_accuracy?: number | null
          run_line_bets_correct?: number | null
          run_line_correct?: number | null
          run_line_predictions?: number | null
          sharpe?: number | null
          sharpness?: number | null
          sortino?: number | null
          total_accuracy?: number | null
          total_correct?: number | null
          total_predictions?: number | null
          total_staked_units?: number | null
          totals_accuracy?: number | null
          totals_correct?: number | null
          totals_predictions?: number | null
          underdogs_correct?: number | null
          unders_correct?: number | null
          unders_predictions?: number | null
          unders_roi?: number | null
        }
        Relationships: []
      }
      model_feature_importance: {
        Row: {
          created_at: string | null
          date: string
          feature: string
          id: number
          importance: number | null
        }
        Insert: {
          created_at?: string | null
          date: string
          feature: string
          id?: number
          importance?: number | null
        }
        Update: {
          created_at?: string | null
          date?: string
          feature?: string
          id?: number
          importance?: number | null
        }
        Relationships: []
      }
      model_outputs: {
        Row: {
          created_at: string | null
          date: string | null
          ev_flag: string | null
          expected_runs: number | null
          expected_runs_p10: number | null
          expected_runs_p50: number | null
          expected_runs_p90: number | null
          game_pk: number
          high_variance_flag: string | null
          kelly_full_ml: number | null
          kelly_full_rl: number | null
          kelly_full_total: number | null
          kelly_quarter_ml: number | null
          kelly_quarter_rl: number | null
          kelly_quarter_total: number | null
          lineup_hash: string | null
          lineup_source: string | null
          lineups_locked: boolean | null
          ml_confidence: number | null
          moneyline: number | null
          our_odds: number | null
          our_total: number | null
          p_cover: number | null
          p_over: number | null
          p_under: number | null
          posterior_age_days: number | null
          prediction_context: Json | null
          prediction_updated_at: string | null
          run_line_confidence: number | null
          run_line_ev_flag: string | null
          runs_hist: Json | null
          spread: number | null
          spread_odds: number | null
          start_time: string | null
          starter: string | null
          team: string
          total: number | null
          total_diff: number | null
          total_over_odds: number | null
          total_p10: number | null
          total_p50: number | null
          total_p90: number | null
          total_play: string | null
          total_under_odds: number | null
          updated_at: string | null
          win_prob: number | null
          win_prob_p10: number | null
          win_prob_p90: number | null
        }
        Insert: {
          created_at?: string | null
          date?: string | null
          ev_flag?: string | null
          expected_runs?: number | null
          expected_runs_p10?: number | null
          expected_runs_p50?: number | null
          expected_runs_p90?: number | null
          game_pk: number
          high_variance_flag?: string | null
          kelly_full_ml?: number | null
          kelly_full_rl?: number | null
          kelly_full_total?: number | null
          kelly_quarter_ml?: number | null
          kelly_quarter_rl?: number | null
          kelly_quarter_total?: number | null
          lineup_hash?: string | null
          lineup_source?: string | null
          lineups_locked?: boolean | null
          ml_confidence?: number | null
          moneyline?: number | null
          our_odds?: number | null
          our_total?: number | null
          p_cover?: number | null
          p_over?: number | null
          p_under?: number | null
          posterior_age_days?: number | null
          prediction_context?: Json | null
          prediction_updated_at?: string | null
          run_line_confidence?: number | null
          run_line_ev_flag?: string | null
          runs_hist?: Json | null
          spread?: number | null
          spread_odds?: number | null
          start_time?: string | null
          starter?: string | null
          team: string
          total?: number | null
          total_diff?: number | null
          total_over_odds?: number | null
          total_p10?: number | null
          total_p50?: number | null
          total_p90?: number | null
          total_play?: string | null
          total_under_odds?: number | null
          updated_at?: string | null
          win_prob?: number | null
          win_prob_p10?: number | null
          win_prob_p90?: number | null
        }
        Update: {
          created_at?: string | null
          date?: string | null
          ev_flag?: string | null
          expected_runs?: number | null
          expected_runs_p10?: number | null
          expected_runs_p50?: number | null
          expected_runs_p90?: number | null
          game_pk?: number
          high_variance_flag?: string | null
          kelly_full_ml?: number | null
          kelly_full_rl?: number | null
          kelly_full_total?: number | null
          kelly_quarter_ml?: number | null
          kelly_quarter_rl?: number | null
          kelly_quarter_total?: number | null
          lineup_hash?: string | null
          lineup_source?: string | null
          lineups_locked?: boolean | null
          ml_confidence?: number | null
          moneyline?: number | null
          our_odds?: number | null
          our_total?: number | null
          p_cover?: number | null
          p_over?: number | null
          p_under?: number | null
          posterior_age_days?: number | null
          prediction_context?: Json | null
          prediction_updated_at?: string | null
          run_line_confidence?: number | null
          run_line_ev_flag?: string | null
          runs_hist?: Json | null
          spread?: number | null
          spread_odds?: number | null
          start_time?: string | null
          starter?: string | null
          team?: string
          total?: number | null
          total_diff?: number | null
          total_over_odds?: number | null
          total_p10?: number | null
          total_p50?: number | null
          total_p90?: number | null
          total_play?: string | null
          total_under_odds?: number | null
          updated_at?: string | null
          win_prob?: number | null
          win_prob_p10?: number | null
          win_prob_p90?: number | null
        }
        Relationships: []
      }
      model_outputs_season: {
        Row: {
          created_at: string | null
          date: string | null
          ev_flag: string | null
          expected_runs: number | null
          expected_runs_p10: number | null
          expected_runs_p50: number | null
          expected_runs_p90: number | null
          game_pk: number | null
          high_variance_flag: string | null
          kelly_full_ml: number | null
          kelly_full_rl: number | null
          kelly_full_total: number | null
          kelly_quarter_ml: number | null
          kelly_quarter_rl: number | null
          kelly_quarter_total: number | null
          lineup_hash: string | null
          lineup_source: string | null
          lineups_locked: boolean | null
          ml_confidence: number | null
          moneyline: number | null
          our_odds: number | null
          our_total: number | null
          p_cover: number | null
          p_over: number | null
          p_under: number | null
          posterior_age_days: number | null
          prediction_context: Json | null
          prediction_updated_at: string | null
          run_line_confidence: number | null
          run_line_ev_flag: string | null
          runs_hist: Json | null
          spread: number | null
          spread_odds: number | null
          start_time: string | null
          starter: string | null
          team: string | null
          total: number | null
          total_diff: number | null
          total_over_odds: number | null
          total_p10: number | null
          total_p50: number | null
          total_p90: number | null
          total_play: string | null
          total_under_odds: number | null
          updated_at: string | null
          win_prob: number | null
          win_prob_p10: number | null
          win_prob_p90: number | null
        }
        Insert: {
          created_at?: string | null
          date?: string | null
          ev_flag?: string | null
          expected_runs?: number | null
          expected_runs_p10?: number | null
          expected_runs_p50?: number | null
          expected_runs_p90?: number | null
          game_pk?: number | null
          high_variance_flag?: string | null
          kelly_full_ml?: number | null
          kelly_full_rl?: number | null
          kelly_full_total?: number | null
          kelly_quarter_ml?: number | null
          kelly_quarter_rl?: number | null
          kelly_quarter_total?: number | null
          lineup_hash?: string | null
          lineup_source?: string | null
          lineups_locked?: boolean | null
          ml_confidence?: number | null
          moneyline?: number | null
          our_odds?: number | null
          our_total?: number | null
          p_cover?: number | null
          p_over?: number | null
          p_under?: number | null
          posterior_age_days?: number | null
          prediction_context?: Json | null
          prediction_updated_at?: string | null
          run_line_confidence?: number | null
          run_line_ev_flag?: string | null
          runs_hist?: Json | null
          spread?: number | null
          spread_odds?: number | null
          start_time?: string | null
          starter?: string | null
          team?: string | null
          total?: number | null
          total_diff?: number | null
          total_over_odds?: number | null
          total_p10?: number | null
          total_p50?: number | null
          total_p90?: number | null
          total_play?: string | null
          total_under_odds?: number | null
          updated_at?: string | null
          win_prob?: number | null
          win_prob_p10?: number | null
          win_prob_p90?: number | null
        }
        Update: {
          created_at?: string | null
          date?: string | null
          ev_flag?: string | null
          expected_runs?: number | null
          expected_runs_p10?: number | null
          expected_runs_p50?: number | null
          expected_runs_p90?: number | null
          game_pk?: number | null
          high_variance_flag?: string | null
          kelly_full_ml?: number | null
          kelly_full_rl?: number | null
          kelly_full_total?: number | null
          kelly_quarter_ml?: number | null
          kelly_quarter_rl?: number | null
          kelly_quarter_total?: number | null
          lineup_hash?: string | null
          lineup_source?: string | null
          lineups_locked?: boolean | null
          ml_confidence?: number | null
          moneyline?: number | null
          our_odds?: number | null
          our_total?: number | null
          p_cover?: number | null
          p_over?: number | null
          p_under?: number | null
          posterior_age_days?: number | null
          prediction_context?: Json | null
          prediction_updated_at?: string | null
          run_line_confidence?: number | null
          run_line_ev_flag?: string | null
          runs_hist?: Json | null
          spread?: number | null
          spread_odds?: number | null
          start_time?: string | null
          starter?: string | null
          team?: string | null
          total?: number | null
          total_diff?: number | null
          total_over_odds?: number | null
          total_p10?: number | null
          total_p50?: number | null
          total_p90?: number | null
          total_play?: string | null
          total_under_odds?: number | null
          updated_at?: string | null
          win_prob?: number | null
          win_prob_p10?: number | null
          win_prob_p90?: number | null
        }
        Relationships: []
      }
      model_outputs_season_v1_archive: {
        Row: {
          created_at: string | null
          date: string | null
          ev_flag: string | null
          expected_runs: number | null
          game_pk: number | null
          high_variance_flag: string | null
          kelly_full_ml: number | null
          kelly_full_rl: number | null
          kelly_full_total: number | null
          kelly_quarter_ml: number | null
          kelly_quarter_rl: number | null
          kelly_quarter_total: number | null
          ml_confidence: number | null
          moneyline: number | null
          our_odds: number | null
          our_total: number | null
          p_cover: number | null
          p_over: number | null
          p_under: number | null
          run_line_confidence: number | null
          run_line_ev_flag: string | null
          spread: number | null
          spread_odds: number | null
          starter: string | null
          team: string | null
          total: number | null
          total_diff: number | null
          total_over_odds: number | null
          total_play: string | null
          total_under_odds: number | null
          updated_at: string | null
          win_prob: number | null
        }
        Insert: {
          created_at?: string | null
          date?: string | null
          ev_flag?: string | null
          expected_runs?: number | null
          game_pk?: number | null
          high_variance_flag?: string | null
          kelly_full_ml?: number | null
          kelly_full_rl?: number | null
          kelly_full_total?: number | null
          kelly_quarter_ml?: number | null
          kelly_quarter_rl?: number | null
          kelly_quarter_total?: number | null
          ml_confidence?: number | null
          moneyline?: number | null
          our_odds?: number | null
          our_total?: number | null
          p_cover?: number | null
          p_over?: number | null
          p_under?: number | null
          run_line_confidence?: number | null
          run_line_ev_flag?: string | null
          spread?: number | null
          spread_odds?: number | null
          starter?: string | null
          team?: string | null
          total?: number | null
          total_diff?: number | null
          total_over_odds?: number | null
          total_play?: string | null
          total_under_odds?: number | null
          updated_at?: string | null
          win_prob?: number | null
        }
        Update: {
          created_at?: string | null
          date?: string | null
          ev_flag?: string | null
          expected_runs?: number | null
          game_pk?: number | null
          high_variance_flag?: string | null
          kelly_full_ml?: number | null
          kelly_full_rl?: number | null
          kelly_full_total?: number | null
          kelly_quarter_ml?: number | null
          kelly_quarter_rl?: number | null
          kelly_quarter_total?: number | null
          ml_confidence?: number | null
          moneyline?: number | null
          our_odds?: number | null
          our_total?: number | null
          p_cover?: number | null
          p_over?: number | null
          p_under?: number | null
          run_line_confidence?: number | null
          run_line_ev_flag?: string | null
          spread?: number | null
          spread_odds?: number | null
          starter?: string | null
          team?: string | null
          total?: number | null
          total_diff?: number | null
          total_over_odds?: number | null
          total_play?: string | null
          total_under_odds?: number | null
          updated_at?: string | null
          win_prob?: number | null
        }
        Relationships: []
      }
      model_outputs_v1_archive: {
        Row: {
          date: string | null
          ev_flag: string | null
          expected_runs: number | null
          game_pk: number | null
          high_variance_flag: string | null
          is_home: number | null
          kelly_full_ml: number | null
          kelly_full_rl: number | null
          kelly_full_total: number | null
          kelly_quarter_ml: number | null
          kelly_quarter_rl: number | null
          kelly_quarter_total: number | null
          ml_confidence: number | null
          moneyline: number | null
          our_odds: number | null
          our_total: number | null
          p_cover: number | null
          p_over: number | null
          p_under: number | null
          run_line_confidence: number | null
          run_line_ev_flag: string | null
          spread: number | null
          spread_odds: number | null
          starter: string | null
          team: string | null
          total: number | null
          total_diff: number | null
          total_over_odds: number | null
          total_play: string | null
          total_under_odds: number | null
          win_prob: number | null
        }
        Insert: {
          date?: string | null
          ev_flag?: string | null
          expected_runs?: number | null
          game_pk?: number | null
          high_variance_flag?: string | null
          is_home?: number | null
          kelly_full_ml?: number | null
          kelly_full_rl?: number | null
          kelly_full_total?: number | null
          kelly_quarter_ml?: number | null
          kelly_quarter_rl?: number | null
          kelly_quarter_total?: number | null
          ml_confidence?: number | null
          moneyline?: number | null
          our_odds?: number | null
          our_total?: number | null
          p_cover?: number | null
          p_over?: number | null
          p_under?: number | null
          run_line_confidence?: number | null
          run_line_ev_flag?: string | null
          spread?: number | null
          spread_odds?: number | null
          starter?: string | null
          team?: string | null
          total?: number | null
          total_diff?: number | null
          total_over_odds?: number | null
          total_play?: string | null
          total_under_odds?: number | null
          win_prob?: number | null
        }
        Update: {
          date?: string | null
          ev_flag?: string | null
          expected_runs?: number | null
          game_pk?: number | null
          high_variance_flag?: string | null
          is_home?: number | null
          kelly_full_ml?: number | null
          kelly_full_rl?: number | null
          kelly_full_total?: number | null
          kelly_quarter_ml?: number | null
          kelly_quarter_rl?: number | null
          kelly_quarter_total?: number | null
          ml_confidence?: number | null
          moneyline?: number | null
          our_odds?: number | null
          our_total?: number | null
          p_cover?: number | null
          p_over?: number | null
          p_under?: number | null
          run_line_confidence?: number | null
          run_line_ev_flag?: string | null
          spread?: number | null
          spread_odds?: number | null
          starter?: string | null
          team?: string | null
          total?: number | null
          total_diff?: number | null
          total_over_odds?: number | null
          total_play?: string | null
          total_under_odds?: number | null
          win_prob?: number | null
        }
        Relationships: []
      }
      odds: {
        Row: {
          book: string
          game_pk: number | null
          id: number
          moneyline: number | null
          scraped_at: string | null
          spread: number | null
          spread_odds: number | null
          team: string
          total: number | null
          total_over_odds: number | null
          total_under_odds: number | null
        }
        Insert: {
          book: string
          game_pk?: number | null
          id?: number
          moneyline?: number | null
          scraped_at?: string | null
          spread?: number | null
          spread_odds?: number | null
          team: string
          total?: number | null
          total_over_odds?: number | null
          total_under_odds?: number | null
        }
        Update: {
          book?: string
          game_pk?: number | null
          id?: number
          moneyline?: number | null
          scraped_at?: string | null
          spread?: number | null
          spread_odds?: number | null
          team?: string
          total?: number | null
          total_over_odds?: number | null
          total_under_odds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "odds_game_pk_fkey"
            columns: ["game_pk"]
            referencedRelation: "games"
            referencedColumns: ["game_pk"]
          },
        ]
      }
      park_factors: {
        Row: {
          park_factor: number
          season: number
          team: string
          venue: string
        }
        Insert: {
          park_factor?: number
          season?: number
          team: string
          venue: string
        }
        Update: {
          park_factor?: number
          season?: number
          team?: string
          venue?: string
        }
        Relationships: []
      }
      pitcher_stats: {
        Row: {
          avg_ip_per_start: number | null
          bb_9: number | null
          era: number | null
          fip: number | null
          hr_9: number | null
          id: number
          ip: number | null
          k_9: number | null
          pitcher_id: number | null
          pitcher_name: string
          role: string
          season: number
          siera: number | null
          team: string
          whip: number | null
          xfip: number | null
        }
        Insert: {
          avg_ip_per_start?: number | null
          bb_9?: number | null
          era?: number | null
          fip?: number | null
          hr_9?: number | null
          id?: number
          ip?: number | null
          k_9?: number | null
          pitcher_id?: number | null
          pitcher_name: string
          role?: string
          season?: number
          siera?: number | null
          team: string
          whip?: number | null
          xfip?: number | null
        }
        Update: {
          avg_ip_per_start?: number | null
          bb_9?: number | null
          era?: number | null
          fip?: number | null
          hr_9?: number | null
          id?: number
          ip?: number | null
          k_9?: number | null
          pitcher_id?: number | null
          pitcher_name?: string
          role?: string
          season?: number
          siera?: number | null
          team?: string
          whip?: number | null
          xfip?: number | null
        }
        Relationships: []
      }
      pitcher_workload: {
        Row: {
          game_date: string
          outs: number
          pitcher_id: number
          role: string
          team: string
          updated_at: string
        }
        Insert: {
          game_date: string
          outs: number
          pitcher_id: number
          role: string
          team: string
          updated_at?: string
        }
        Update: {
          game_date?: string
          outs?: number
          pitcher_id?: number
          role?: string
          team?: string
          updated_at?: string
        }
        Relationships: []
      }
      playoff_forecasts: {
        Row: {
          generated_at: string
          payload: NonNullable<Json>
          season: number
          stage: string
        }
        Insert: {
          generated_at: string
          payload: NonNullable<Json>
          season: number
          stage: string
        }
        Update: {
          generated_at?: string
          payload?: NonNullable<Json>
          season?: number
          stage?: string
        }
        Relationships: []
      }
      posterior_sigmas: {
        Row: {
          mean: number
          p10: number | null
          p90: number | null
          refit_date: string
          sigma_name: string
        }
        Insert: {
          mean: number
          p10?: number | null
          p90?: number | null
          refit_date: string
          sigma_name: string
        }
        Update: {
          mean?: number
          p10?: number | null
          p90?: number | null
          refit_date?: string
          sigma_name?: string
        }
        Relationships: []
      }
      posterior_skills: {
        Row: {
          actor_id: number
          actor_name: string | null
          actor_type: string
          rank: number
          rank_type: string
          refit_date: string
          skill_score: number
          split_label: string
          team: string | null
        }
        Insert: {
          actor_id: number
          actor_name?: string | null
          actor_type: string
          rank: number
          rank_type: string
          refit_date: string
          skill_score: number
          split_label: string
          team?: string | null
        }
        Update: {
          actor_id?: number
          actor_name?: string | null
          actor_type?: string
          rank?: number
          rank_type?: string
          refit_date?: string
          skill_score?: number
          split_label?: string
          team?: string | null
        }
        Relationships: []
      }
      probable_starters: {
        Row: {
          game_pk: number | null
          handedness: string | null
          id: number
          is_home: boolean
          pitcher_id: number | null
          pitcher_name: string
          team: string
        }
        Insert: {
          game_pk?: number | null
          handedness?: string | null
          id?: number
          is_home: boolean
          pitcher_id?: number | null
          pitcher_name: string
          team: string
        }
        Update: {
          game_pk?: number | null
          handedness?: string | null
          id?: number
          is_home?: boolean
          pitcher_id?: number | null
          pitcher_name?: string
          team?: string
        }
        Relationships: [
          {
            foreignKeyName: "probable_starters_game_pk_fkey"
            columns: ["game_pk"]
            referencedRelation: "games"
            referencedColumns: ["game_pk"]
          },
        ]
      }
      team_batting: {
        Row: {
          babip: number | null
          bb_pct: number | null
          id: number
          iso: number | null
          k_pct: number | null
          obp: number | null
          ops: number | null
          pa: number | null
          season: number
          slg: number | null
          split: string
          team: string
          woba: number | null
          wrc_plus: number | null
        }
        Insert: {
          babip?: number | null
          bb_pct?: number | null
          id?: number
          iso?: number | null
          k_pct?: number | null
          obp?: number | null
          ops?: number | null
          pa?: number | null
          season?: number
          slg?: number | null
          split: string
          team: string
          woba?: number | null
          wrc_plus?: number | null
        }
        Update: {
          babip?: number | null
          bb_pct?: number | null
          id?: number
          iso?: number | null
          k_pct?: number | null
          obp?: number | null
          ops?: number | null
          pa?: number | null
          season?: number
          slg?: number | null
          split?: string
          team?: string
          woba?: number | null
          wrc_plus?: number | null
        }
        Relationships: []
      }
      weather: {
        Row: {
          condition: string | null
          game_pk: number
          is_dome: boolean
          temp_f: number | null
          updated_at: string
          wind_dir_enum: string | null
          wind_dir_raw: string | null
          wind_out_component: number | null
          wind_speed_mph: number | null
        }
        Insert: {
          condition?: string | null
          game_pk: number
          is_dome?: boolean
          temp_f?: number | null
          updated_at?: string
          wind_dir_enum?: string | null
          wind_dir_raw?: string | null
          wind_out_component?: number | null
          wind_speed_mph?: number | null
        }
        Update: {
          condition?: string | null
          game_pk?: number
          is_dome?: boolean
          temp_f?: number | null
          updated_at?: string
          wind_dir_enum?: string | null
          wind_dir_raw?: string | null
          wind_out_component?: number | null
          wind_speed_mph?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      bet_ledger_agg_v: {
        Row: {
          american_odds: number | null
          bet_type: string | null
          date: string | null
          decimal_odds: number | null
          edge: number | null
          game_pk: number | null
          ml_side: string | null
          payout: number | null
          push: boolean | null
          stake: number | null
          team: string | null
          totals_side: string | null
          won: boolean | null
        }
        Relationships: []
      }
      bet_ledger_v: {
        Row: {
          american_odds: number | null
          bet_type: string | null
          date: string | null
          decimal_odds: number | null
          edge: number | null
          game_pk: number | null
          payout: number | null
          push: boolean | null
          stake: number | null
          team: string | null
          totals_side: string | null
          won: boolean | null
        }
        Relationships: []
      }
      model_outputs_season_unified: {
        Row: {
          away_score: number | null
          away_team: string | null
          created_at: string | null
          date: string | null
          ev_flag: string | null
          expected_runs: number | null
          expected_runs_p10: number | null
          expected_runs_p50: number | null
          expected_runs_p90: number | null
          game_pk: number | null
          game_status: string | null
          high_variance_flag: string | null
          home_score: number | null
          home_team: string | null
          kelly_full_ml: number | null
          kelly_full_rl: number | null
          kelly_full_total: number | null
          kelly_quarter_ml: number | null
          kelly_quarter_rl: number | null
          kelly_quarter_total: number | null
          lineup_hash: string | null
          lineup_source: string | null
          lineups_locked: boolean | null
          ml_confidence: number | null
          model_version: string | null
          moneyline: number | null
          our_odds: number | null
          our_total: number | null
          p_cover: number | null
          p_over: number | null
          p_under: number | null
          posterior_age_days: number | null
          prediction_updated_at: string | null
          run_line_confidence: number | null
          run_line_ev_flag: string | null
          spread: number | null
          spread_odds: number | null
          start_time: string | null
          starter: string | null
          team: string | null
          total: number | null
          total_diff: number | null
          total_over_odds: number | null
          total_p10: number | null
          total_p50: number | null
          total_p90: number | null
          total_play: string | null
          total_under_odds: number | null
          updated_at: string | null
          win_prob: number | null
          win_prob_p10: number | null
          win_prob_p90: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      bet_record_summary: {
        Args: { p_from?: string; p_team?: string; p_to?: string }
        Returns: {
          bet_type: string
          losses: number
          pushes: number
          wins: number
        }[]
      }
      live_evaluation_status: {
        Args: { p_game_pk: number }
        Returns: {
          eval_date: string
          input_version: string
        }[]
      }
      complete_live_evaluation: {
        Args: {
          p_game_pk: number
          p_input_version: string
          p_rows: Json
          p_started_at: string
        }
        Returns: undefined
      }
      live_evaluation_input_version: {
        Args: { p_game_pk: number }
        Returns: string
      }
      live_evaluation_started_at: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      publish_live_evaluation: {
        Args: { p_rows: Json; p_started_at: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  nfl: {
    Tables: {
      award_boards: {
        Row: {
          as_of: string
          award: string
          candidate_id: string
          candidate_name: string
          context_reason: string | null
          context_source: string | null
          drivers: NonNullable<Json>
          games: number
          headshot_url: string | null
          model_version: string
          performance_rank: number | null
          performance_score: number | null
          position: string
          predicted_rank: number | null
          probability_status: string
          projected_stats: NonNullable<Json>
          rank_change: number | null
          season: number
          season_stats: NonNullable<Json>
          team: string
          week: number
          win_probability: number | null
        }
        Insert: {
          as_of: string
          award: string
          candidate_id: string
          candidate_name: string
          context_reason?: string | null
          context_source?: string | null
          drivers: NonNullable<Json>
          games: number
          headshot_url?: string | null
          model_version: string
          performance_rank?: number | null
          performance_score?: number | null
          position: string
          predicted_rank?: number | null
          probability_status: string
          projected_stats: NonNullable<Json>
          rank_change?: number | null
          season: number
          season_stats?: NonNullable<Json>
          team: string
          week: number
          win_probability?: number | null
        }
        Update: {
          as_of?: string
          award?: string
          candidate_id?: string
          candidate_name?: string
          context_reason?: string | null
          context_source?: string | null
          drivers?: NonNullable<Json>
          games?: number
          headshot_url?: string | null
          model_version?: string
          performance_rank?: number | null
          performance_score?: number | null
          position?: string
          predicted_rank?: number | null
          probability_status?: string
          projected_stats?: NonNullable<Json>
          rank_change?: number | null
          season?: number
          season_stats?: NonNullable<Json>
          team?: string
          week?: number
          win_probability?: number | null
        }
        Relationships: []
      }
      award_model_meta: {
        Row: {
          as_of: string
          award: string
          candidate_count: number
          model_version: string
          provenance: NonNullable<Json>
          season: number
          status: string
          training_seasons: NonNullable<Json>
          validation: NonNullable<Json>
          week: number
        }
        Insert: {
          as_of: string
          award: string
          candidate_count: number
          model_version: string
          provenance: NonNullable<Json>
          season: number
          status: string
          training_seasons: NonNullable<Json>
          validation: NonNullable<Json>
          week: number
        }
        Update: {
          as_of?: string
          award?: string
          candidate_count?: number
          model_version?: string
          provenance?: NonNullable<Json>
          season?: number
          status?: string
          training_seasons?: NonNullable<Json>
          validation?: NonNullable<Json>
          week?: number
        }
        Relationships: []
      }
      backtest_predictions: {
        Row: {
          actual_margin: number | null
          away_points: number | null
          away_team: string
          closing_spread: number | null
          game_id: string
          home_points: number | null
          home_team: string
          model_margin: number | null
          neutral_site: boolean | null
          pure_model_margin: number | null
          season: number
          season_type: string | null
          week: number
          week_index: number | null
        }
        Insert: {
          actual_margin?: number | null
          away_points?: number | null
          away_team: string
          closing_spread?: number | null
          game_id: string
          home_points?: number | null
          home_team: string
          model_margin?: number | null
          neutral_site?: boolean | null
          pure_model_margin?: number | null
          season: number
          season_type?: string | null
          week: number
          week_index?: number | null
        }
        Update: {
          actual_margin?: number | null
          away_points?: number | null
          away_team?: string
          closing_spread?: number | null
          game_id?: string
          home_points?: number | null
          home_team?: string
          model_margin?: number | null
          neutral_site?: boolean | null
          pure_model_margin?: number | null
          season?: number
          season_type?: string | null
          week?: number
          week_index?: number | null
        }
        Relationships: []
      }
      forecast_input_objects: {
        Row: {
          compressed_content: string
          recorded_at: string
          sha256: string
        }
        Insert: {
          compressed_content: string
          recorded_at?: string
          sha256: string
        }
        Update: {
          compressed_content?: string
          recorded_at?: string
          sha256?: string
        }
        Relationships: []
      }
      forecast_input_runs: {
        Row: {
          forecast_as_of: string
          manifest: NonNullable<Json>
          recorded_at: string
          run_id: string
          season: number
          week: number
        }
        Insert: {
          forecast_as_of: string
          manifest: NonNullable<Json>
          recorded_at?: string
          run_id: string
          season: number
          week: number
        }
        Update: {
          forecast_as_of?: string
          manifest?: NonNullable<Json>
          recorded_at?: string
          run_id?: string
          season?: number
          week?: number
        }
        Relationships: []
      }
      forecast_snapshots: {
        Row: {
          as_of: string
          away_qb_adjustment: number | null
          away_team: string
          away_team_abbr: string | null
          degrees_of_freedom: number | null
          distribution: string | null
          div_game: boolean | null
          expected_away_points: number | null
          expected_home_points: number | null
          game_id: string
          home_field_points: number | null
          home_margin: number | null
          home_qb_adjustment: number | null
          home_spread: number | null
          home_team: string
          home_team_abbr: string | null
          margin_sd: number | null
          margin_total_correlation: number | null
          market_home_spread: number | null
          market_informed_away_points: number | null
          market_informed_home_points: number | null
          market_informed_total: number | null
          market_total: number | null
          market_weight: number | null
          model_total: number | null
          model_version: string
          neutral_site: boolean | null
          pure_home_margin: number | null
          pure_home_spread: number | null
          recorded_at: string
          rest_adjustment: number | null
          season: number
          snapshot_id: number
          start_date: string | null
          total_sd: number | null
          week: number
        }
        Insert: {
          as_of: string
          away_qb_adjustment?: number | null
          away_team: string
          away_team_abbr?: string | null
          degrees_of_freedom?: number | null
          distribution?: string | null
          div_game?: boolean | null
          expected_away_points?: number | null
          expected_home_points?: number | null
          game_id: string
          home_field_points?: number | null
          home_margin?: number | null
          home_qb_adjustment?: number | null
          home_spread?: number | null
          home_team: string
          home_team_abbr?: string | null
          margin_sd?: number | null
          margin_total_correlation?: number | null
          market_home_spread?: number | null
          market_informed_away_points?: number | null
          market_informed_home_points?: number | null
          market_informed_total?: number | null
          market_total?: number | null
          market_weight?: number | null
          model_total?: number | null
          model_version: string
          neutral_site?: boolean | null
          pure_home_margin?: number | null
          pure_home_spread?: number | null
          recorded_at?: string
          rest_adjustment?: number | null
          season: number
          snapshot_id?: never
          start_date?: string | null
          total_sd?: number | null
          week: number
        }
        Update: {
          as_of?: string
          away_qb_adjustment?: number | null
          away_team?: string
          away_team_abbr?: string | null
          degrees_of_freedom?: number | null
          distribution?: string | null
          div_game?: boolean | null
          expected_away_points?: number | null
          expected_home_points?: number | null
          game_id?: string
          home_field_points?: number | null
          home_margin?: number | null
          home_qb_adjustment?: number | null
          home_spread?: number | null
          home_team?: string
          home_team_abbr?: string | null
          margin_sd?: number | null
          margin_total_correlation?: number | null
          market_home_spread?: number | null
          market_informed_away_points?: number | null
          market_informed_home_points?: number | null
          market_informed_total?: number | null
          market_total?: number | null
          market_weight?: number | null
          model_total?: number | null
          model_version?: string
          neutral_site?: boolean | null
          pure_home_margin?: number | null
          pure_home_spread?: number | null
          recorded_at?: string
          rest_adjustment?: number | null
          season?: number
          snapshot_id?: never
          start_date?: string | null
          total_sd?: number | null
          week?: number
        }
        Relationships: []
      }
      game_projections: {
        Row: {
          as_of: string
          away_qb_adjustment: number | null
          away_team: string
          away_team_abbr: string | null
          degrees_of_freedom: number | null
          distribution: string | null
          div_game: boolean | null
          expected_away_points: number | null
          expected_home_points: number | null
          game_id: string
          home_field_points: number | null
          home_margin: number | null
          home_qb_adjustment: number | null
          home_spread: number | null
          home_team: string
          home_team_abbr: string | null
          margin_sd: number | null
          margin_total_correlation: number | null
          market_home_spread: number | null
          market_informed_away_points: number | null
          market_informed_home_points: number | null
          market_informed_total: number | null
          market_total: number | null
          market_weight: number | null
          model_total: number | null
          model_version: string
          neutral_site: boolean | null
          pure_home_margin: number | null
          pure_home_spread: number | null
          rest_adjustment: number | null
          season: number
          start_date: string | null
          total_sd: number | null
          week: number
        }
        Insert: {
          as_of: string
          away_qb_adjustment?: number | null
          away_team: string
          away_team_abbr?: string | null
          degrees_of_freedom?: number | null
          distribution?: string | null
          div_game?: boolean | null
          expected_away_points?: number | null
          expected_home_points?: number | null
          game_id: string
          home_field_points?: number | null
          home_margin?: number | null
          home_qb_adjustment?: number | null
          home_spread?: number | null
          home_team: string
          home_team_abbr?: string | null
          margin_sd?: number | null
          margin_total_correlation?: number | null
          market_home_spread?: number | null
          market_informed_away_points?: number | null
          market_informed_home_points?: number | null
          market_informed_total?: number | null
          market_total?: number | null
          market_weight?: number | null
          model_total?: number | null
          model_version: string
          neutral_site?: boolean | null
          pure_home_margin?: number | null
          pure_home_spread?: number | null
          rest_adjustment?: number | null
          season: number
          start_date?: string | null
          total_sd?: number | null
          week: number
        }
        Update: {
          as_of?: string
          away_qb_adjustment?: number | null
          away_team?: string
          away_team_abbr?: string | null
          degrees_of_freedom?: number | null
          distribution?: string | null
          div_game?: boolean | null
          expected_away_points?: number | null
          expected_home_points?: number | null
          game_id?: string
          home_field_points?: number | null
          home_margin?: number | null
          home_qb_adjustment?: number | null
          home_spread?: number | null
          home_team?: string
          home_team_abbr?: string | null
          margin_sd?: number | null
          margin_total_correlation?: number | null
          market_home_spread?: number | null
          market_informed_away_points?: number | null
          market_informed_home_points?: number | null
          market_informed_total?: number | null
          market_total?: number | null
          market_weight?: number | null
          model_total?: number | null
          model_version?: string
          neutral_site?: boolean | null
          pure_home_margin?: number | null
          pure_home_spread?: number | null
          rest_adjustment?: number | null
          season?: number
          start_date?: string | null
          total_sd?: number | null
          week?: number
        }
        Relationships: []
      }
      game_results: {
        Row: {
          away_points: number
          away_team: string
          away_team_abbr: string
          closing_spread: number | null
          game_id: string
          home_points: number
          home_team: string
          home_team_abbr: string
          neutral_site: boolean
          season: number
          season_type: string
          source: string
          source_fetched_at: string
          start_date: string
          week: number
        }
        Insert: {
          away_points: number
          away_team: string
          away_team_abbr: string
          closing_spread?: number | null
          game_id: string
          home_points: number
          home_team: string
          home_team_abbr: string
          neutral_site: boolean
          season: number
          season_type: string
          source: string
          source_fetched_at: string
          start_date: string
          week: number
        }
        Update: {
          away_points?: number
          away_team?: string
          away_team_abbr?: string
          closing_spread?: number | null
          game_id?: string
          home_points?: number
          home_team?: string
          home_team_abbr?: string
          neutral_site?: boolean
          season?: number
          season_type?: string
          source?: string
          source_fetched_at?: string
          start_date?: string
          week?: number
        }
        Relationships: []
      }
      live_win_probability: {
        Row: {
          game_id: string
          payload: NonNullable<Json>
          updated_at: string
        }
        Insert: {
          game_id: string
          payload: NonNullable<Json>
          updated_at: string
        }
        Update: {
          game_id?: string
          payload?: NonNullable<Json>
          updated_at?: string
        }
        Relationships: []
      }
      market_comparisons: {
        Row: {
          away_team: string | null
          best_offer_bet_link: string | null
          best_offer_edge_points: number | null
          best_offer_edge_standardized: number | null
          best_offer_event_link: string | null
          best_offer_expected_value_per_unit: number | null
          best_offer_market: string | null
          best_offer_market_link: string | null
          best_offer_model_cover_probability: number | null
          best_offer_model_fair_price: number | null
          best_offer_point: number | null
          best_offer_price: number | null
          best_offer_provider: string | null
          best_offer_provider_key: string | null
          best_offer_provider_last_update: string | null
          best_offer_selection: string | null
          executable_offer_available: boolean | null
          game_id: string
          home_team: string | null
          margin_sd: number | null
          market_available: boolean | null
          model_as_of: string | null
          model_home_spread: number | null
          model_total: number | null
          priced_offer_available: boolean | null
          recommendation_status: string | null
          review_status: string | null
          start_date: string | null
          total_sd: number | null
        }
        Insert: {
          away_team?: string | null
          best_offer_bet_link?: string | null
          best_offer_edge_points?: number | null
          best_offer_edge_standardized?: number | null
          best_offer_event_link?: string | null
          best_offer_expected_value_per_unit?: number | null
          best_offer_market?: string | null
          best_offer_market_link?: string | null
          best_offer_model_cover_probability?: number | null
          best_offer_model_fair_price?: number | null
          best_offer_point?: number | null
          best_offer_price?: number | null
          best_offer_provider?: string | null
          best_offer_provider_key?: string | null
          best_offer_provider_last_update?: string | null
          best_offer_selection?: string | null
          executable_offer_available?: boolean | null
          game_id: string
          home_team?: string | null
          margin_sd?: number | null
          market_available?: boolean | null
          model_as_of?: string | null
          model_home_spread?: number | null
          model_total?: number | null
          priced_offer_available?: boolean | null
          recommendation_status?: string | null
          review_status?: string | null
          start_date?: string | null
          total_sd?: number | null
        }
        Update: {
          away_team?: string | null
          best_offer_bet_link?: string | null
          best_offer_edge_points?: number | null
          best_offer_edge_standardized?: number | null
          best_offer_event_link?: string | null
          best_offer_expected_value_per_unit?: number | null
          best_offer_market?: string | null
          best_offer_market_link?: string | null
          best_offer_model_cover_probability?: number | null
          best_offer_model_fair_price?: number | null
          best_offer_point?: number | null
          best_offer_price?: number | null
          best_offer_provider?: string | null
          best_offer_provider_key?: string | null
          best_offer_provider_last_update?: string | null
          best_offer_selection?: string | null
          executable_offer_available?: boolean | null
          game_id?: string
          home_team?: string | null
          margin_sd?: number | null
          market_available?: boolean | null
          model_as_of?: string | null
          model_home_spread?: number | null
          model_total?: number | null
          priced_offer_available?: boolean | null
          recommendation_status?: string | null
          review_status?: string | null
          start_date?: string | null
          total_sd?: number | null
        }
        Relationships: []
      }
      market_snapshots: {
        Row: {
          fetched_at: string
          game_id: string
          home_spread: number | null
          season: number
          spread_books: number | null
          total: number | null
          total_books: number | null
          week: number
        }
        Insert: {
          fetched_at: string
          game_id: string
          home_spread?: number | null
          season: number
          spread_books?: number | null
          total?: number | null
          total_books?: number | null
          week: number
        }
        Update: {
          fetched_at?: string
          game_id?: string
          home_spread?: number | null
          season?: number
          spread_books?: number | null
          total?: number | null
          total_books?: number | null
          week?: number
        }
        Relationships: []
      }
      recommendation_revisions: {
        Row: {
          game_id: string
          market: string
          previous_record: NonNullable<Json>
          published_at: string
          reason: string
          superseded_at: string
        }
        Insert: {
          game_id: string
          market: string
          previous_record: NonNullable<Json>
          published_at: string
          reason?: string
          superseded_at?: string
        }
        Update: {
          game_id?: string
          market?: string
          previous_record?: NonNullable<Json>
          published_at?: string
          reason?: string
          superseded_at?: string
        }
        Relationships: []
      }
      recommendation_schedule: {
        Row: {
          away_points: number | null
          away_team: string
          completed: boolean
          game_id: string
          game_status: string
          home_points: number | null
          home_team: string
          observed_at: string
          season: number
          start_date: string | null
        }
        Insert: {
          away_points?: number | null
          away_team: string
          completed: boolean
          game_id: string
          game_status: string
          home_points?: number | null
          home_team: string
          observed_at: string
          season: number
          start_date?: string | null
        }
        Update: {
          away_points?: number | null
          away_team?: string
          completed?: boolean
          game_id?: string
          game_status?: string
          home_points?: number | null
          home_team?: string
          observed_at?: string
          season?: number
          start_date?: string | null
        }
        Relationships: []
      }
      recommendations: {
        Row: {
          away_missing_input_count: number | null
          away_points: number | null
          away_team: string
          data_flags: NonNullable<Json>
          decision_at: string
          degrees_of_freedom: number | null
          edge_points: number | null
          execution_eligibility_verified: boolean
          expected_value_per_unit: number | null
          forecast_as_of: string
          game_id: string
          graded_at: string | null
          home_missing_input_count: number | null
          home_points: number | null
          home_team: string
          margin_sd: number
          market: string
          market_fetched_at: string | null
          market_total: number | null
          match_score: number | null
          model_home_margin: number
          model_total: number
          model_version: string
          odds_api_event_id: string | null
          outcome: string
          point: number | null
          policy_version: string
          price: number | null
          pricing_weights: NonNullable<Json>
          probability_edge: number | null
          profit_units: number | null
          provider: string | null
          provider_key: string | null
          provider_last_update: string | null
          provider_start_date: string | null
          published_at: string
          push_probability: number | null
          reason: string
          result_source_at: string | null
          season: number
          selection: string | null
          settlement_reason: string | null
          side: string | null
          source_timestamps: NonNullable<Json>
          stake_units: number
          start_date: string
          status: string
          total_sd: number
          week: number
          win_probability: number | null
        }
        Insert: {
          away_missing_input_count?: number | null
          away_points?: number | null
          away_team: string
          data_flags: NonNullable<Json>
          decision_at: string
          degrees_of_freedom?: number | null
          edge_points?: number | null
          execution_eligibility_verified?: boolean
          expected_value_per_unit?: number | null
          forecast_as_of: string
          game_id: string
          graded_at?: string | null
          home_missing_input_count?: number | null
          home_points?: number | null
          home_team: string
          margin_sd: number
          market: string
          market_fetched_at?: string | null
          market_total?: number | null
          match_score?: number | null
          model_home_margin: number
          model_total: number
          model_version: string
          odds_api_event_id?: string | null
          outcome?: string
          point?: number | null
          policy_version: string
          price?: number | null
          pricing_weights: NonNullable<Json>
          probability_edge?: number | null
          profit_units?: number | null
          provider?: string | null
          provider_key?: string | null
          provider_last_update?: string | null
          provider_start_date?: string | null
          published_at?: string
          push_probability?: number | null
          reason: string
          result_source_at?: string | null
          season: number
          selection?: string | null
          settlement_reason?: string | null
          side?: string | null
          source_timestamps: NonNullable<Json>
          stake_units: number
          start_date: string
          status: string
          total_sd: number
          week: number
          win_probability?: number | null
        }
        Update: {
          away_missing_input_count?: number | null
          away_points?: number | null
          away_team?: string
          data_flags?: NonNullable<Json>
          decision_at?: string
          degrees_of_freedom?: number | null
          edge_points?: number | null
          execution_eligibility_verified?: boolean
          expected_value_per_unit?: number | null
          forecast_as_of?: string
          game_id?: string
          graded_at?: string | null
          home_missing_input_count?: number | null
          home_points?: number | null
          home_team?: string
          margin_sd?: number
          market?: string
          market_fetched_at?: string | null
          market_total?: number | null
          match_score?: number | null
          model_home_margin?: number
          model_total?: number
          model_version?: string
          odds_api_event_id?: string | null
          outcome?: string
          point?: number | null
          policy_version?: string
          price?: number | null
          pricing_weights?: NonNullable<Json>
          probability_edge?: number | null
          profit_units?: number | null
          provider?: string | null
          provider_key?: string | null
          provider_last_update?: string | null
          provider_start_date?: string | null
          published_at?: string
          push_probability?: number | null
          reason?: string
          result_source_at?: string | null
          season?: number
          selection?: string | null
          settlement_reason?: string | null
          side?: string | null
          source_timestamps?: NonNullable<Json>
          stake_units?: number
          start_date?: string
          status?: string
          total_sd?: number
          week?: number
          win_probability?: number | null
        }
        Relationships: []
      }
      season_win_totals: {
        Row: {
          as_of: string
          conference: string | null
          depth_chart_as_of: string | null
          division: string | null
          games_played: number
          games_remaining: number
          losses: number
          model_version: string
          projected_wins: number
          ratings_through_date: string | null
          ratings_through_week: number
          remaining_expected_wins: number
          schedule_fetched_at: string
          season: number
          simulation_count: number
          simulation_seed: number
          sportsbook_source_date: string | null
          sportsbook_source_name: string | null
          sportsbook_source_url: string | null
          sportsbook_win_total: number | null
          team: string
          team_abbr: string
          ties: number
          wins: number
          wins_p10: number
          wins_p50: number
          wins_p90: number
        }
        Insert: {
          as_of: string
          conference?: string | null
          depth_chart_as_of?: string | null
          division?: string | null
          games_played: number
          games_remaining: number
          losses: number
          model_version: string
          projected_wins: number
          ratings_through_date?: string | null
          ratings_through_week: number
          remaining_expected_wins: number
          schedule_fetched_at: string
          season: number
          simulation_count: number
          simulation_seed: number
          sportsbook_source_date?: string | null
          sportsbook_source_name?: string | null
          sportsbook_source_url?: string | null
          sportsbook_win_total?: number | null
          team: string
          team_abbr: string
          ties: number
          wins: number
          wins_p10: number
          wins_p50: number
          wins_p90: number
        }
        Update: {
          as_of?: string
          conference?: string | null
          depth_chart_as_of?: string | null
          division?: string | null
          games_played?: number
          games_remaining?: number
          losses?: number
          model_version?: string
          projected_wins?: number
          ratings_through_date?: string | null
          ratings_through_week?: number
          remaining_expected_wins?: number
          schedule_fetched_at?: string
          season?: number
          simulation_count?: number
          simulation_seed?: number
          sportsbook_source_date?: string | null
          sportsbook_source_name?: string | null
          sportsbook_source_url?: string | null
          sportsbook_win_total?: number | null
          team?: string
          team_abbr?: string
          ties?: number
          wins?: number
          wins_p10?: number
          wins_p50?: number
          wins_p90?: number
        }
        Relationships: []
      }
      team_ratings: {
        Row: {
          as_of: string
          conference: string | null
          defense_points: number | null
          division: string | null
          expected_drives: number | null
          forecast_alignment_points: number | null
          missing_input_count: number | null
          model_version: string
          offense_points: number | null
          power_rating: number
          power_rating_sd: number | null
          scoring_environment: number | null
          season: number
          team: string
          team_abbr: string
          week: number
        }
        Insert: {
          as_of: string
          conference?: string | null
          defense_points?: number | null
          division?: string | null
          expected_drives?: number | null
          forecast_alignment_points?: number | null
          missing_input_count?: number | null
          model_version: string
          offense_points?: number | null
          power_rating: number
          power_rating_sd?: number | null
          scoring_environment?: number | null
          season: number
          team: string
          team_abbr: string
          week: number
        }
        Update: {
          as_of?: string
          conference?: string | null
          defense_points?: number | null
          division?: string | null
          expected_drives?: number | null
          forecast_alignment_points?: number | null
          missing_input_count?: number | null
          model_version?: string
          offense_points?: number | null
          power_rating?: number
          power_rating_sd?: number | null
          scoring_environment?: number | null
          season?: number
          team?: string
          team_abbr?: string
          week?: number
        }
        Relationships: []
      }
      team_unit_ratings: {
        Row: {
          as_of: string
          model_version: string
          pass_block: number | null
          pass_defense: number | null
          pass_offense: number | null
          run_block: number | null
          rush_defense: number | null
          rush_offense: number | null
          season: number
          special_teams: number | null
          team: string
          team_abbr: string
          week: number
        }
        Insert: {
          as_of: string
          model_version: string
          pass_block?: number | null
          pass_defense?: number | null
          pass_offense?: number | null
          run_block?: number | null
          rush_defense?: number | null
          rush_offense?: number | null
          season: number
          special_teams?: number | null
          team: string
          team_abbr: string
          week: number
        }
        Update: {
          as_of?: string
          model_version?: string
          pass_block?: number | null
          pass_defense?: number | null
          pass_offense?: number | null
          run_block?: number | null
          rush_defense?: number | null
          rush_offense?: number | null
          season?: number
          special_teams?: number | null
          team?: string
          team_abbr?: string
          week?: number
        }
        Relationships: []
      }
      teams: {
        Row: {
          alternate_color: string | null
          color: string | null
          logo_dark: string | null
          logo_light: string | null
          team: string
          team_abbr: string
        }
        Insert: {
          alternate_color?: string | null
          color?: string | null
          logo_dark?: string | null
          logo_light?: string | null
          team: string
          team_abbr: string
        }
        Update: {
          alternate_color?: string | null
          color?: string | null
          logo_dark?: string | null
          logo_light?: string | null
          team?: string
          team_abbr?: string
        }
        Relationships: []
      }
    }
    Views: {
      live_predictions: {
        Row: {
          actual_margin: number | null
          away_points: number | null
          away_team: string | null
          closing_absolute_error: number | null
          closing_source: string | null
          closing_spread: number | null
          forecast_as_of: string | null
          forecast_recorded_at: string | null
          game_id: string | null
          home_points: number | null
          home_team: string | null
          model_absolute_error: number | null
          model_margin: number | null
          model_version: string | null
          neutral_site: boolean | null
          pure_absolute_error: number | null
          pure_model_margin: number | null
          season: number | null
          season_type: string | null
          source_fetched_at: string | null
          start_date: string | null
          week: number | null
          week_index: number | null
        }
        Relationships: []
      }
      recommendation_performance: {
        Row: {
          average_ev: number | null
          first_decision_at: string | null
          last_decision_at: string | null
          last_graded_at: string | null
          losses: number | null
          no_plays: number | null
          pending: number | null
          picks: number | null
          profit_units: number | null
          pushes: number | null
          roi: number | null
          season: number | null
          segment: string | null
          segment_kind: string | null
          staked_units: number | null
          thin_sample: boolean | null
          unique_games: number | null
          voids: number | null
          win_rate: number | null
          wins: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      can_refresh_qb_pick: {
        Args: {
          previous: Database["nfl"]["Tables"]["recommendations"]["Row"]
          revised: Database["nfl"]["Tables"]["recommendations"]["Row"]
        }
        Returns: boolean
      }
      forecast_accuracy: { Args: { p_source?: string }; Returns: Json }
      recommendation_dashboard: {
        Args: { p_from?: string; p_market?: string; p_season?: number }
        Returns: Json
      }
      recommendation_history: {
        Args: {
          p_from?: string
          p_market?: string
          p_page?: number
          p_season?: number
        }
        Returns: Json
      }
      recommendation_summary: {
        Args: { p_from?: string; p_market?: string; p_season?: number }
        Returns: {
          average_ev: number | null
          first_decision_at: string | null
          last_decision_at: string | null
          last_graded_at: string | null
          losses: number | null
          no_plays: number | null
          pending: number | null
          picks: number | null
          profit_units: number | null
          pushes: number | null
          roi: number | null
          season: number | null
          segment: string | null
          segment_kind: string | null
          staked_units: number | null
          thin_sample: boolean | null
          unique_games: number | null
          voids: number | null
          win_rate: number | null
          wins: number | null
        }[]
        SetofOptions: {
          from: "*"
          to: "recommendation_performance"
          isOneToOne: false
          isSetofReturn: true
        }
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  nhl: {
    Tables: {
      backtest_predictions: {
        Row: {
          away_goals: number
          away_lambda: number
          away_team: string
          game_date: string
          game_id: string
          home_goals: number
          home_lambda: number
          home_team: string
          home_win_prob: number
          last_period_type: string | null
          model_total: number
          season: number
        }
        Insert: {
          away_goals: number
          away_lambda: number
          away_team: string
          game_date: string
          game_id: string
          home_goals: number
          home_lambda: number
          home_team: string
          home_win_prob: number
          last_period_type?: string | null
          model_total: number
          season: number
        }
        Update: {
          away_goals?: number
          away_lambda?: number
          away_team?: string
          game_date?: string
          game_id?: string
          home_goals?: number
          home_lambda?: number
          home_team?: string
          home_win_prob?: number
          last_period_type?: string | null
          model_total?: number
          season?: number
        }
        Relationships: []
      }
      forecast_snapshots: {
        Row: {
          as_of: string
          away_fair_decimal: number
          away_fair_price: number
          away_lambda: number
          away_minimum_price: number
          away_team: string
          away_team_abbr: string
          away_win_prob: number
          game_date: string
          game_id: string
          home_fair_decimal: number
          home_fair_price: number
          home_lambda: number
          home_minimum_price: number
          home_team: string
          home_team_abbr: string
          home_win_prob: number
          missing_input_count: number
          model_total: number
          model_version: string
          recorded_at: string
          season: number
          snapshot_id: number
          start_date: string
        }
        Insert: {
          as_of: string
          away_fair_decimal: number
          away_fair_price: number
          away_lambda: number
          away_minimum_price: number
          away_team: string
          away_team_abbr: string
          away_win_prob: number
          game_date: string
          game_id: string
          home_fair_decimal: number
          home_fair_price: number
          home_lambda: number
          home_minimum_price: number
          home_team: string
          home_team_abbr: string
          home_win_prob: number
          missing_input_count: number
          model_total: number
          model_version: string
          recorded_at?: string
          season: number
          snapshot_id?: never
          start_date: string
        }
        Update: {
          as_of?: string
          away_fair_decimal?: number
          away_fair_price?: number
          away_lambda?: number
          away_minimum_price?: number
          away_team?: string
          away_team_abbr?: string
          away_win_prob?: number
          game_date?: string
          game_id?: string
          home_fair_decimal?: number
          home_fair_price?: number
          home_lambda?: number
          home_minimum_price?: number
          home_team?: string
          home_team_abbr?: string
          home_win_prob?: number
          missing_input_count?: number
          model_total?: number
          model_version?: string
          recorded_at?: string
          season?: number
          snapshot_id?: never
          start_date?: string
        }
        Relationships: []
      }
      game_projections: {
        Row: {
          as_of: string
          away_fair_decimal: number
          away_fair_price: number
          away_lambda: number
          away_minimum_price: number
          away_team: string
          away_team_abbr: string
          away_win_prob: number
          game_date: string
          game_id: string
          home_fair_decimal: number
          home_fair_price: number
          home_lambda: number
          home_minimum_price: number
          home_team: string
          home_team_abbr: string
          home_win_prob: number
          missing_input_count: number
          model_total: number
          model_version: string
          season: number
          start_date: string
        }
        Insert: {
          as_of: string
          away_fair_decimal: number
          away_fair_price: number
          away_lambda: number
          away_minimum_price: number
          away_team: string
          away_team_abbr: string
          away_win_prob: number
          game_date: string
          game_id: string
          home_fair_decimal: number
          home_fair_price: number
          home_lambda: number
          home_minimum_price: number
          home_team: string
          home_team_abbr: string
          home_win_prob: number
          missing_input_count: number
          model_total: number
          model_version: string
          season: number
          start_date: string
        }
        Update: {
          as_of?: string
          away_fair_decimal?: number
          away_fair_price?: number
          away_lambda?: number
          away_minimum_price?: number
          away_team?: string
          away_team_abbr?: string
          away_win_prob?: number
          game_date?: string
          game_id?: string
          home_fair_decimal?: number
          home_fair_price?: number
          home_lambda?: number
          home_minimum_price?: number
          home_team?: string
          home_team_abbr?: string
          home_win_prob?: number
          missing_input_count?: number
          model_total?: number
          model_version?: string
          season?: number
          start_date?: string
        }
        Relationships: []
      }
      game_results: {
        Row: {
          away_goals: number
          away_team: string
          away_team_abbr: string
          game_date: string
          game_id: string
          home_goals: number
          home_team: string
          home_team_abbr: string
          last_period_type: string
          season: number
          source: string
          source_fetched_at: string
          start_date: string
        }
        Insert: {
          away_goals: number
          away_team: string
          away_team_abbr: string
          game_date: string
          game_id: string
          home_goals: number
          home_team: string
          home_team_abbr: string
          last_period_type: string
          season: number
          source: string
          source_fetched_at: string
          start_date: string
        }
        Update: {
          away_goals?: number
          away_team?: string
          away_team_abbr?: string
          game_date?: string
          game_id?: string
          home_goals?: number
          home_team?: string
          home_team_abbr?: string
          last_period_type?: string
          season?: number
          source?: string
          source_fetched_at?: string
          start_date?: string
        }
        Relationships: []
      }
      live_win_probability: {
        Row: {
          game_id: string
          payload: NonNullable<Json>
          updated_at: string
        }
        Insert: {
          game_id: string
          payload: NonNullable<Json>
          updated_at: string
        }
        Update: {
          game_id?: string
          payload?: NonNullable<Json>
          updated_at?: string
        }
        Relationships: []
      }
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
      recommendation_schedule: {
        Row: {
          away_goals: number | null
          away_team: string
          completed: boolean
          game_id: string
          game_status: string
          home_goals: number | null
          home_team: string
          observed_at: string
          season: number
          start_date: string | null
        }
        Insert: {
          away_goals?: number | null
          away_team: string
          completed: boolean
          game_id: string
          game_status: string
          home_goals?: number | null
          home_team: string
          observed_at: string
          season: number
          start_date?: string | null
        }
        Update: {
          away_goals?: number | null
          away_team?: string
          completed?: boolean
          game_id?: string
          game_status?: string
          home_goals?: number | null
          home_team?: string
          observed_at?: string
          season?: number
          start_date?: string | null
        }
        Relationships: []
      }
      recommendations: {
        Row: {
          away_goals: number | null
          away_lambda: number
          away_team: string
          data_flags: NonNullable<Json>
          decision_at: string
          edge_points: number | null
          expected_value_per_unit: number | null
          forecast_as_of: string
          game_date: string
          game_id: string
          graded_at: string | null
          home_goals: number | null
          home_lambda: number
          home_team: string
          kelly_fraction: number | null
          market: string
          market_fetched_at: string | null
          market_total: number | null
          minimum_price: number | null
          missing_input_count: number
          model_total: number
          model_version: string
          outcome: string
          point: number | null
          policy_version: string
          price: number | null
          pricing_weights: NonNullable<Json>
          probability_edge: number | null
          profit_units: number | null
          provider: string | null
          provider_event_id: string | null
          provider_key: string | null
          provider_last_update: string | null
          provider_start_date: string | null
          published_at: string
          push_probability: number | null
          reason: string
          result_source_at: string | null
          season: number
          selection: string | null
          settlement_reason: string | null
          side: string | null
          source_timestamps: NonNullable<Json>
          stake_units: number
          start_date: string
          status: string
          win_probability: number | null
        }
        Insert: {
          away_goals?: number | null
          away_lambda: number
          away_team: string
          data_flags: NonNullable<Json>
          decision_at: string
          edge_points?: number | null
          expected_value_per_unit?: number | null
          forecast_as_of: string
          game_date: string
          game_id: string
          graded_at?: string | null
          home_goals?: number | null
          home_lambda: number
          home_team: string
          kelly_fraction?: number | null
          market: string
          market_fetched_at?: string | null
          market_total?: number | null
          minimum_price?: number | null
          missing_input_count: number
          model_total: number
          model_version: string
          outcome?: string
          point?: number | null
          policy_version: string
          price?: number | null
          pricing_weights: NonNullable<Json>
          probability_edge?: number | null
          profit_units?: number | null
          provider?: string | null
          provider_event_id?: string | null
          provider_key?: string | null
          provider_last_update?: string | null
          provider_start_date?: string | null
          published_at?: string
          push_probability?: number | null
          reason: string
          result_source_at?: string | null
          season: number
          selection?: string | null
          settlement_reason?: string | null
          side?: string | null
          source_timestamps: NonNullable<Json>
          stake_units: number
          start_date: string
          status: string
          win_probability?: number | null
        }
        Update: {
          away_goals?: number | null
          away_lambda?: number
          away_team?: string
          data_flags?: NonNullable<Json>
          decision_at?: string
          edge_points?: number | null
          expected_value_per_unit?: number | null
          forecast_as_of?: string
          game_date?: string
          game_id?: string
          graded_at?: string | null
          home_goals?: number | null
          home_lambda?: number
          home_team?: string
          kelly_fraction?: number | null
          market?: string
          market_fetched_at?: string | null
          market_total?: number | null
          minimum_price?: number | null
          missing_input_count?: number
          model_total?: number
          model_version?: string
          outcome?: string
          point?: number | null
          policy_version?: string
          price?: number | null
          pricing_weights?: NonNullable<Json>
          probability_edge?: number | null
          profit_units?: number | null
          provider?: string | null
          provider_event_id?: string | null
          provider_key?: string | null
          provider_last_update?: string | null
          provider_start_date?: string | null
          published_at?: string
          push_probability?: number | null
          reason?: string
          result_source_at?: string | null
          season?: number
          selection?: string | null
          settlement_reason?: string | null
          side?: string | null
          source_timestamps?: NonNullable<Json>
          stake_units?: number
          start_date?: string
          status?: string
          win_probability?: number | null
        }
        Relationships: []
      }
      team_ratings: {
        Row: {
          as_of: string
          away_attack: number
          away_defense: number
          away_xga: number
          away_xgf: number
          home_attack: number
          home_defense: number
          home_xga: number
          home_xgf: number
          insufficient_window: boolean
          model_version: string
          published_at: string
          rating: number
          team: string
          team_abbr: string
          window_games_away: number
          window_games_home: number
        }
        Insert: {
          as_of: string
          away_attack: number
          away_defense: number
          away_xga: number
          away_xgf: number
          home_attack: number
          home_defense: number
          home_xga: number
          home_xgf: number
          insufficient_window: boolean
          model_version: string
          published_at?: string
          rating: number
          team: string
          team_abbr: string
          window_games_away: number
          window_games_home: number
        }
        Update: {
          as_of?: string
          away_attack?: number
          away_defense?: number
          away_xga?: number
          away_xgf?: number
          home_attack?: number
          home_defense?: number
          home_xga?: number
          home_xgf?: number
          insufficient_window?: boolean
          model_version?: string
          published_at?: string
          rating?: number
          team?: string
          team_abbr?: string
          window_games_away?: number
          window_games_home?: number
        }
        Relationships: []
      }
      teams: {
        Row: {
          color: string | null
          conference: string | null
          division: string | null
          logo_dark: string | null
          logo_light: string | null
          team: string
          team_abbr: string
        }
        Insert: {
          color?: string | null
          conference?: string | null
          division?: string | null
          logo_dark?: string | null
          logo_light?: string | null
          team: string
          team_abbr: string
        }
        Update: {
          color?: string | null
          conference?: string | null
          division?: string | null
          logo_dark?: string | null
          logo_light?: string | null
          team?: string
          team_abbr?: string
        }
        Relationships: []
      }
    }
    Views: {
      live_predictions: {
        Row: {
          away_goals: number | null
          away_lambda: number | null
          away_team: string | null
          forecast_as_of: string | null
          forecast_recorded_at: string | null
          game_date: string | null
          game_id: string | null
          home_goals: number | null
          home_lambda: number | null
          home_team: string | null
          home_win_prob: number | null
          last_period_type: string | null
          model_total: number | null
          model_version: string | null
          season: number | null
          source: string | null
          source_fetched_at: string | null
          start_date: string | null
        }
        Relationships: []
      }
      recommendation_performance: {
        Row: {
          average_ev: number | null
          first_decision_at: string | null
          last_decision_at: string | null
          last_graded_at: string | null
          losses: number | null
          no_plays: number | null
          pending: number | null
          picks: number | null
          profit_units: number | null
          pushes: number | null
          roi: number | null
          season: number | null
          segment: string | null
          segment_kind: string | null
          staked_units: number | null
          thin_sample: boolean | null
          unique_games: number | null
          voids: number | null
          win_rate: number | null
          wins: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      forecast_accuracy: { Args: { p_source?: string }; Returns: Json }
      latest_market_snapshots: {
        Args: { p_cutoffs?: Json; p_game_ids: string[] }
        Returns: {
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
        }[]
        SetofOptions: {
          from: "*"
          to: "market_snapshots"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      quote_verification_valid: {
        Args: {
          decision: string
          evidence: Json
          expected_game: string
          expected_market: string
          expected_point: number
          expected_price: number
          expected_provider: string
          expected_side: string
          expected_start: string
          fetched: string
          published: string
          receipt: Json
        }
        Returns: boolean
      }
      recommendation_dashboard: {
        Args: { p_from?: string; p_market?: string; p_season?: number }
        Returns: Json
      }
      recommendation_summary: {
        Args: { p_from?: string; p_market?: string; p_season?: number }
        Returns: {
          average_ev: number | null
          first_decision_at: string | null
          last_decision_at: string | null
          last_graded_at: string | null
          losses: number | null
          no_plays: number | null
          pending: number | null
          picks: number | null
          profit_units: number | null
          pushes: number | null
          roi: number | null
          season: number | null
          segment: string | null
          segment_kind: string | null
          staked_units: number | null
          thin_sample: boolean | null
          unique_games: number | null
          voids: number | null
          win_rate: number | null
          wins: number | null
        }[]
        SetofOptions: {
          from: "*"
          to: "recommendation_performance"
          isOneToOne: false
          isSetofReturn: true
        }
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  cfb: {
    Enums: {},
  },
  mlb: {
    Enums: {},
  },
  nfl: {
    Enums: {},
  },
  nhl: {
    Enums: {},
  },
} as const
