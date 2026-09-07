export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  mlb: {
    Tables: {
      bullpen_daily: {
        Row: {
          game_date: string
          team: string
          reliever_outs: number
          starter_outs: number
          n_relievers: number
          updated_at: string
        }
        Insert: {
          game_date: string
          team: string
          reliever_outs?: number
          starter_outs?: number
          n_relievers?: number
          updated_at?: string
        }
        Update: {
          game_date?: string
          team?: string
          reliever_outs?: number
          starter_outs?: number
          n_relievers?: number
          updated_at?: string
        }
        Relationships: []
      }
      bullpen_stats: {
        Row: {
          id: number
          team: string
          season: number
          ip: number | null
          era: number | null
          fip: number | null
          xfip: number | null
          siera: number | null
          whip: number | null
          k_9: number | null
          bb_9: number | null
          hr_9: number | null
          rhp_ip_share: number | null
        }
        Insert: {
          id?: number
          team: string
          season?: number
          ip?: number | null
          era?: number | null
          fip?: number | null
          xfip?: number | null
          siera?: number | null
          whip?: number | null
          k_9?: number | null
          bb_9?: number | null
          hr_9?: number | null
          rhp_ip_share?: number | null
        }
        Update: {
          id?: number
          team?: string
          season?: number
          ip?: number | null
          era?: number | null
          fip?: number | null
          xfip?: number | null
          siera?: number | null
          whip?: number | null
          k_9?: number | null
          bb_9?: number | null
          hr_9?: number | null
          rhp_ip_share?: number | null
        }
        Relationships: []
      }
      experiment_runs: {
        Row: {
          id: number
          run_date: string | null
          git_sha: string | null
          hyperparameters: Json | null
          best_cv_mae: number | null
          feature_list: string[] | null
          notes: string | null
          created_at: string | null
        }
        Insert: {
          id?: number
          run_date?: string | null
          git_sha?: string | null
          hyperparameters?: Json | null
          best_cv_mae?: number | null
          feature_list?: string[] | null
          notes?: string | null
          created_at?: string | null
        }
        Update: {
          id?: number
          run_date?: string | null
          git_sha?: string | null
          hyperparameters?: Json | null
          best_cv_mae?: number | null
          feature_list?: string[] | null
          notes?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      games: {
        Row: {
          game_pk: number
          game_date: string
          home_team: string
          away_team: string
          home_score: number | null
          away_score: number | null
          status: string
          venue: string | null
          created_at: string | null
          updated_at: string | null
          start_time: string | null
        }
        Insert: {
          game_pk: number
          game_date: string
          home_team: string
          away_team: string
          home_score?: number | null
          away_score?: number | null
          status?: string
          venue?: string | null
          created_at?: string | null
          updated_at?: string | null
          start_time?: string | null
        }
        Update: {
          game_pk?: number
          game_date?: string
          home_team?: string
          away_team?: string
          home_score?: number | null
          away_score?: number | null
          status?: string
          venue?: string | null
          created_at?: string | null
          updated_at?: string | null
          start_time?: string | null
        }
        Relationships: []
      }
      model_calibration: {
        Row: {
          id: number
          date: string
          bin_mid: number
          predicted_mean: number | null
          observed_rate: number | null
          count: number | null
          created_at: string | null
        }
        Insert: {
          id?: number
          date: string
          bin_mid: number
          predicted_mean?: number | null
          observed_rate?: number | null
          count?: number | null
          created_at?: string | null
        }
        Update: {
          id?: number
          date?: string
          bin_mid?: number
          predicted_mean?: number | null
          observed_rate?: number | null
          count?: number | null
          created_at?: string | null
        }
        Relationships: []
      }
      model_edge_buckets: {
        Row: {
          id: number
          date: string
          eval_window: string
          bucket_label: string
          n_bets: number | null
          hit_rate: number | null
          roi: number | null
          created_at: string | null
        }
        Insert: {
          id?: number
          date: string
          eval_window: string
          bucket_label: string
          n_bets?: number | null
          hit_rate?: number | null
          roi?: number | null
          created_at?: string | null
        }
        Update: {
          id?: number
          date?: string
          eval_window?: string
          bucket_label?: string
          n_bets?: number | null
          hit_rate?: number | null
          roi?: number | null
          created_at?: string | null
        }
        Relationships: []
      }
      model_evaluation: {
        Row: {
          id: number
          date: string
          total_correct: number | null
          total_predictions: number | null
          total_accuracy: number | null
          ml_correct: number | null
          ml_predictions: number | null
          ml_accuracy: number | null
          run_line_correct: number | null
          run_line_predictions: number | null
          run_line_accuracy: number | null
          average_total_diff: number | null
          average_win_prob: number | null
          created_at: string | null
          eval_window: string | null
          mae: number | null
          rmse: number | null
          mape: number | null
          r2: number | null
          brier_score: number | null
          log_loss: number | null
          sharpness: number | null
          interval_coverage_80: number | null
          roi: number | null
          sharpe: number | null
          sortino: number | null
          max_drawdown: number | null
          total_staked_units: number | null
          net_profit_units: number | null
          equity_end_units: number | null
          totals_correct: number | null
          totals_predictions: number | null
          totals_accuracy: number | null
          interval_coverage_50: number | null
          interval_coverage_90: number | null
          roi_favorites: number | null
          roi_underdogs: number | null
          n_favorites: number | null
          n_underdogs: number | null
          avg_ml_line: number | null
          overs_correct: number | null
          overs_predictions: number | null
          unders_correct: number | null
          unders_predictions: number | null
          overs_roi: number | null
          unders_roi: number | null
          favorites_correct: number | null
          underdogs_correct: number | null
          roi_run_line: number | null
          n_run_line: number | null
          run_line_bets_correct: number | null
          predictions_rewritten: boolean
        }
        Insert: {
          id?: number
          date: string
          total_correct?: number | null
          total_predictions?: number | null
          total_accuracy?: number | null
          ml_correct?: number | null
          ml_predictions?: number | null
          ml_accuracy?: number | null
          run_line_correct?: number | null
          run_line_predictions?: number | null
          run_line_accuracy?: number | null
          average_total_diff?: number | null
          average_win_prob?: number | null
          created_at?: string | null
          eval_window?: string | null
          mae?: number | null
          rmse?: number | null
          mape?: number | null
          r2?: number | null
          brier_score?: number | null
          log_loss?: number | null
          sharpness?: number | null
          interval_coverage_80?: number | null
          roi?: number | null
          sharpe?: number | null
          sortino?: number | null
          max_drawdown?: number | null
          total_staked_units?: number | null
          net_profit_units?: number | null
          equity_end_units?: number | null
          totals_correct?: number | null
          totals_predictions?: number | null
          totals_accuracy?: number | null
          interval_coverage_50?: number | null
          interval_coverage_90?: number | null
          roi_favorites?: number | null
          roi_underdogs?: number | null
          n_favorites?: number | null
          n_underdogs?: number | null
          avg_ml_line?: number | null
          overs_correct?: number | null
          overs_predictions?: number | null
          unders_correct?: number | null
          unders_predictions?: number | null
          overs_roi?: number | null
          unders_roi?: number | null
          favorites_correct?: number | null
          underdogs_correct?: number | null
          roi_run_line?: number | null
          n_run_line?: number | null
          run_line_bets_correct?: number | null
          predictions_rewritten?: boolean
        }
        Update: {
          id?: number
          date?: string
          total_correct?: number | null
          total_predictions?: number | null
          total_accuracy?: number | null
          ml_correct?: number | null
          ml_predictions?: number | null
          ml_accuracy?: number | null
          run_line_correct?: number | null
          run_line_predictions?: number | null
          run_line_accuracy?: number | null
          average_total_diff?: number | null
          average_win_prob?: number | null
          created_at?: string | null
          eval_window?: string | null
          mae?: number | null
          rmse?: number | null
          mape?: number | null
          r2?: number | null
          brier_score?: number | null
          log_loss?: number | null
          sharpness?: number | null
          interval_coverage_80?: number | null
          roi?: number | null
          sharpe?: number | null
          sortino?: number | null
          max_drawdown?: number | null
          total_staked_units?: number | null
          net_profit_units?: number | null
          equity_end_units?: number | null
          totals_correct?: number | null
          totals_predictions?: number | null
          totals_accuracy?: number | null
          interval_coverage_50?: number | null
          interval_coverage_90?: number | null
          roi_favorites?: number | null
          roi_underdogs?: number | null
          n_favorites?: number | null
          n_underdogs?: number | null
          avg_ml_line?: number | null
          overs_correct?: number | null
          overs_predictions?: number | null
          unders_correct?: number | null
          unders_predictions?: number | null
          overs_roi?: number | null
          unders_roi?: number | null
          favorites_correct?: number | null
          underdogs_correct?: number | null
          roi_run_line?: number | null
          n_run_line?: number | null
          run_line_bets_correct?: number | null
          predictions_rewritten?: boolean
        }
        Relationships: []
      }
      model_feature_importance: {
        Row: {
          id: number
          date: string
          feature: string
          importance: number | null
          created_at: string | null
        }
        Insert: {
          id?: number
          date: string
          feature: string
          importance?: number | null
          created_at?: string | null
        }
        Update: {
          id?: number
          date?: string
          feature?: string
          importance?: number | null
          created_at?: string | null
        }
        Relationships: []
      }
      model_outputs: {
        Row: {
          game_pk: number
          date: string | null
          team: string
          starter: string | null
          expected_runs: number | null
          win_prob: number | null
          our_odds: number | null
          expected_runs_p10: number | null
          expected_runs_p50: number | null
          expected_runs_p90: number | null
          total_p10: number | null
          total_p50: number | null
          total_p90: number | null
          win_prob_p10: number | null
          win_prob_p90: number | null
          moneyline: number | null
          total: number | null
          spread: number | null
          spread_odds: number | null
          our_total: number | null
          total_diff: number | null
          total_play: string | null
          ev_flag: string | null
          run_line_ev_flag: string | null
          ml_confidence: number | null
          run_line_confidence: number | null
          high_variance_flag: string | null
          kelly_full_ml: number | null
          kelly_quarter_ml: number | null
          kelly_full_rl: number | null
          kelly_quarter_rl: number | null
          kelly_full_total: number | null
          kelly_quarter_total: number | null
          p_cover: number | null
          p_over: number | null
          p_under: number | null
          total_over_odds: number | null
          total_under_odds: number | null
          lineups_locked: boolean | null
          lineup_source: string | null
          prediction_updated_at: string | null
          posterior_age_days: number | null
          created_at: string | null
          updated_at: string | null
          lineup_hash: string | null
          start_time: string | null
          runs_hist: Json | null
        }
        Insert: {
          game_pk: number
          date?: string | null
          team: string
          starter?: string | null
          expected_runs?: number | null
          win_prob?: number | null
          our_odds?: number | null
          expected_runs_p10?: number | null
          expected_runs_p50?: number | null
          expected_runs_p90?: number | null
          total_p10?: number | null
          total_p50?: number | null
          total_p90?: number | null
          win_prob_p10?: number | null
          win_prob_p90?: number | null
          moneyline?: number | null
          total?: number | null
          spread?: number | null
          spread_odds?: number | null
          our_total?: number | null
          total_diff?: number | null
          total_play?: string | null
          ev_flag?: string | null
          run_line_ev_flag?: string | null
          ml_confidence?: number | null
          run_line_confidence?: number | null
          high_variance_flag?: string | null
          kelly_full_ml?: number | null
          kelly_quarter_ml?: number | null
          kelly_full_rl?: number | null
          kelly_quarter_rl?: number | null
          kelly_full_total?: number | null
          kelly_quarter_total?: number | null
          p_cover?: number | null
          p_over?: number | null
          p_under?: number | null
          total_over_odds?: number | null
          total_under_odds?: number | null
          lineups_locked?: boolean | null
          lineup_source?: string | null
          prediction_updated_at?: string | null
          posterior_age_days?: number | null
          created_at?: string | null
          updated_at?: string | null
          lineup_hash?: string | null
          start_time?: string | null
          runs_hist?: Json | null
        }
        Update: {
          game_pk?: number
          date?: string | null
          team?: string
          starter?: string | null
          expected_runs?: number | null
          win_prob?: number | null
          our_odds?: number | null
          expected_runs_p10?: number | null
          expected_runs_p50?: number | null
          expected_runs_p90?: number | null
          total_p10?: number | null
          total_p50?: number | null
          total_p90?: number | null
          win_prob_p10?: number | null
          win_prob_p90?: number | null
          moneyline?: number | null
          total?: number | null
          spread?: number | null
          spread_odds?: number | null
          our_total?: number | null
          total_diff?: number | null
          total_play?: string | null
          ev_flag?: string | null
          run_line_ev_flag?: string | null
          ml_confidence?: number | null
          run_line_confidence?: number | null
          high_variance_flag?: string | null
          kelly_full_ml?: number | null
          kelly_quarter_ml?: number | null
          kelly_full_rl?: number | null
          kelly_quarter_rl?: number | null
          kelly_full_total?: number | null
          kelly_quarter_total?: number | null
          p_cover?: number | null
          p_over?: number | null
          p_under?: number | null
          total_over_odds?: number | null
          total_under_odds?: number | null
          lineups_locked?: boolean | null
          lineup_source?: string | null
          prediction_updated_at?: string | null
          posterior_age_days?: number | null
          created_at?: string | null
          updated_at?: string | null
          lineup_hash?: string | null
          start_time?: string | null
          runs_hist?: Json | null
        }
        Relationships: []
      }
      model_outputs_season: {
        Row: {
          game_pk: number | null
          date: string | null
          team: string | null
          starter: string | null
          expected_runs: number | null
          win_prob: number | null
          our_odds: number | null
          expected_runs_p10: number | null
          expected_runs_p50: number | null
          expected_runs_p90: number | null
          total_p10: number | null
          total_p50: number | null
          total_p90: number | null
          win_prob_p10: number | null
          win_prob_p90: number | null
          moneyline: number | null
          total: number | null
          spread: number | null
          spread_odds: number | null
          our_total: number | null
          total_diff: number | null
          total_play: string | null
          ev_flag: string | null
          run_line_ev_flag: string | null
          ml_confidence: number | null
          run_line_confidence: number | null
          high_variance_flag: string | null
          kelly_full_ml: number | null
          kelly_quarter_ml: number | null
          kelly_full_rl: number | null
          kelly_quarter_rl: number | null
          kelly_full_total: number | null
          kelly_quarter_total: number | null
          p_cover: number | null
          p_over: number | null
          p_under: number | null
          total_over_odds: number | null
          total_under_odds: number | null
          lineups_locked: boolean | null
          lineup_source: string | null
          prediction_updated_at: string | null
          posterior_age_days: number | null
          created_at: string | null
          updated_at: string | null
          lineup_hash: string | null
          start_time: string | null
          runs_hist: Json | null
        }
        Insert: {
          game_pk?: number | null
          date?: string | null
          team?: string | null
          starter?: string | null
          expected_runs?: number | null
          win_prob?: number | null
          our_odds?: number | null
          expected_runs_p10?: number | null
          expected_runs_p50?: number | null
          expected_runs_p90?: number | null
          total_p10?: number | null
          total_p50?: number | null
          total_p90?: number | null
          win_prob_p10?: number | null
          win_prob_p90?: number | null
          moneyline?: number | null
          total?: number | null
          spread?: number | null
          spread_odds?: number | null
          our_total?: number | null
          total_diff?: number | null
          total_play?: string | null
          ev_flag?: string | null
          run_line_ev_flag?: string | null
          ml_confidence?: number | null
          run_line_confidence?: number | null
          high_variance_flag?: string | null
          kelly_full_ml?: number | null
          kelly_quarter_ml?: number | null
          kelly_full_rl?: number | null
          kelly_quarter_rl?: number | null
          kelly_full_total?: number | null
          kelly_quarter_total?: number | null
          p_cover?: number | null
          p_over?: number | null
          p_under?: number | null
          total_over_odds?: number | null
          total_under_odds?: number | null
          lineups_locked?: boolean | null
          lineup_source?: string | null
          prediction_updated_at?: string | null
          posterior_age_days?: number | null
          created_at?: string | null
          updated_at?: string | null
          lineup_hash?: string | null
          start_time?: string | null
          runs_hist?: Json | null
        }
        Update: {
          game_pk?: number | null
          date?: string | null
          team?: string | null
          starter?: string | null
          expected_runs?: number | null
          win_prob?: number | null
          our_odds?: number | null
          expected_runs_p10?: number | null
          expected_runs_p50?: number | null
          expected_runs_p90?: number | null
          total_p10?: number | null
          total_p50?: number | null
          total_p90?: number | null
          win_prob_p10?: number | null
          win_prob_p90?: number | null
          moneyline?: number | null
          total?: number | null
          spread?: number | null
          spread_odds?: number | null
          our_total?: number | null
          total_diff?: number | null
          total_play?: string | null
          ev_flag?: string | null
          run_line_ev_flag?: string | null
          ml_confidence?: number | null
          run_line_confidence?: number | null
          high_variance_flag?: string | null
          kelly_full_ml?: number | null
          kelly_quarter_ml?: number | null
          kelly_full_rl?: number | null
          kelly_quarter_rl?: number | null
          kelly_full_total?: number | null
          kelly_quarter_total?: number | null
          p_cover?: number | null
          p_over?: number | null
          p_under?: number | null
          total_over_odds?: number | null
          total_under_odds?: number | null
          lineups_locked?: boolean | null
          lineup_source?: string | null
          prediction_updated_at?: string | null
          posterior_age_days?: number | null
          created_at?: string | null
          updated_at?: string | null
          lineup_hash?: string | null
          start_time?: string | null
          runs_hist?: Json | null
        }
        Relationships: []
      }
      model_outputs_season_v1_archive: {
        Row: {
          game_pk: number | null
          date: string | null
          team: string | null
          starter: string | null
          expected_runs: number | null
          win_prob: number | null
          our_odds: number | null
          moneyline: number | null
          total: number | null
          spread: number | null
          spread_odds: number | null
          our_total: number | null
          total_diff: number | null
          total_play: string | null
          ev_flag: string | null
          run_line_ev_flag: string | null
          ml_confidence: number | null
          run_line_confidence: number | null
          high_variance_flag: string | null
          kelly_full_ml: number | null
          kelly_quarter_ml: number | null
          kelly_full_rl: number | null
          kelly_quarter_rl: number | null
          kelly_full_total: number | null
          kelly_quarter_total: number | null
          p_cover: number | null
          p_over: number | null
          p_under: number | null
          total_over_odds: number | null
          total_under_odds: number | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          game_pk?: number | null
          date?: string | null
          team?: string | null
          starter?: string | null
          expected_runs?: number | null
          win_prob?: number | null
          our_odds?: number | null
          moneyline?: number | null
          total?: number | null
          spread?: number | null
          spread_odds?: number | null
          our_total?: number | null
          total_diff?: number | null
          total_play?: string | null
          ev_flag?: string | null
          run_line_ev_flag?: string | null
          ml_confidence?: number | null
          run_line_confidence?: number | null
          high_variance_flag?: string | null
          kelly_full_ml?: number | null
          kelly_quarter_ml?: number | null
          kelly_full_rl?: number | null
          kelly_quarter_rl?: number | null
          kelly_full_total?: number | null
          kelly_quarter_total?: number | null
          p_cover?: number | null
          p_over?: number | null
          p_under?: number | null
          total_over_odds?: number | null
          total_under_odds?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          game_pk?: number | null
          date?: string | null
          team?: string | null
          starter?: string | null
          expected_runs?: number | null
          win_prob?: number | null
          our_odds?: number | null
          moneyline?: number | null
          total?: number | null
          spread?: number | null
          spread_odds?: number | null
          our_total?: number | null
          total_diff?: number | null
          total_play?: string | null
          ev_flag?: string | null
          run_line_ev_flag?: string | null
          ml_confidence?: number | null
          run_line_confidence?: number | null
          high_variance_flag?: string | null
          kelly_full_ml?: number | null
          kelly_quarter_ml?: number | null
          kelly_full_rl?: number | null
          kelly_quarter_rl?: number | null
          kelly_full_total?: number | null
          kelly_quarter_total?: number | null
          p_cover?: number | null
          p_over?: number | null
          p_under?: number | null
          total_over_odds?: number | null
          total_under_odds?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      model_outputs_v1_archive: {
        Row: {
          game_pk: number | null
          date: string | null
          team: string | null
          starter: string | null
          expected_runs: number | null
          win_prob: number | null
          our_odds: number | null
          is_home: number | null
          moneyline: number | null
          total: number | null
          spread: number | null
          spread_odds: number | null
          total_over_odds: number | null
          total_under_odds: number | null
          our_total: number | null
          total_diff: number | null
          p_cover: number | null
          p_over: number | null
          p_under: number | null
          total_play: string | null
          ev_flag: string | null
          run_line_ev_flag: string | null
          kelly_full_ml: number | null
          kelly_quarter_ml: number | null
          kelly_full_rl: number | null
          kelly_quarter_rl: number | null
          kelly_full_total: number | null
          kelly_quarter_total: number | null
          ml_confidence: number | null
          run_line_confidence: number | null
          high_variance_flag: string | null
        }
        Insert: {
          game_pk?: number | null
          date?: string | null
          team?: string | null
          starter?: string | null
          expected_runs?: number | null
          win_prob?: number | null
          our_odds?: number | null
          is_home?: number | null
          moneyline?: number | null
          total?: number | null
          spread?: number | null
          spread_odds?: number | null
          total_over_odds?: number | null
          total_under_odds?: number | null
          our_total?: number | null
          total_diff?: number | null
          p_cover?: number | null
          p_over?: number | null
          p_under?: number | null
          total_play?: string | null
          ev_flag?: string | null
          run_line_ev_flag?: string | null
          kelly_full_ml?: number | null
          kelly_quarter_ml?: number | null
          kelly_full_rl?: number | null
          kelly_quarter_rl?: number | null
          kelly_full_total?: number | null
          kelly_quarter_total?: number | null
          ml_confidence?: number | null
          run_line_confidence?: number | null
          high_variance_flag?: string | null
        }
        Update: {
          game_pk?: number | null
          date?: string | null
          team?: string | null
          starter?: string | null
          expected_runs?: number | null
          win_prob?: number | null
          our_odds?: number | null
          is_home?: number | null
          moneyline?: number | null
          total?: number | null
          spread?: number | null
          spread_odds?: number | null
          total_over_odds?: number | null
          total_under_odds?: number | null
          our_total?: number | null
          total_diff?: number | null
          p_cover?: number | null
          p_over?: number | null
          p_under?: number | null
          total_play?: string | null
          ev_flag?: string | null
          run_line_ev_flag?: string | null
          kelly_full_ml?: number | null
          kelly_quarter_ml?: number | null
          kelly_full_rl?: number | null
          kelly_quarter_rl?: number | null
          kelly_full_total?: number | null
          kelly_quarter_total?: number | null
          ml_confidence?: number | null
          run_line_confidence?: number | null
          high_variance_flag?: string | null
        }
        Relationships: []
      }
      odds: {
        Row: {
          id: number
          game_pk: number | null
          team: string
          book: string
          moneyline: number | null
          spread: number | null
          spread_odds: number | null
          total: number | null
          total_over_odds: number | null
          total_under_odds: number | null
          scraped_at: string | null
        }
        Insert: {
          id?: number
          game_pk?: number | null
          team: string
          book: string
          moneyline?: number | null
          spread?: number | null
          spread_odds?: number | null
          total?: number | null
          total_over_odds?: number | null
          total_under_odds?: number | null
          scraped_at?: string | null
        }
        Update: {
          id?: number
          game_pk?: number | null
          team?: string
          book?: string
          moneyline?: number | null
          spread?: number | null
          spread_odds?: number | null
          total?: number | null
          total_over_odds?: number | null
          total_under_odds?: number | null
          scraped_at?: string | null
        }
        Relationships: []
      }
      park_factors: {
        Row: {
          team: string
          venue: string
          season: number
          park_factor: number
        }
        Insert: {
          team: string
          venue: string
          season?: number
          park_factor?: number
        }
        Update: {
          team?: string
          venue?: string
          season?: number
          park_factor?: number
        }
        Relationships: []
      }
      pitcher_stats: {
        Row: {
          id: number
          pitcher_name: string
          team: string
          season: number
          role: string
          ip: number | null
          era: number | null
          fip: number | null
          xfip: number | null
          siera: number | null
          whip: number | null
          k_9: number | null
          bb_9: number | null
          hr_9: number | null
          pitcher_id: number | null
          avg_ip_per_start: number | null
        }
        Insert: {
          id?: number
          pitcher_name: string
          team: string
          season?: number
          role?: string
          ip?: number | null
          era?: number | null
          fip?: number | null
          xfip?: number | null
          siera?: number | null
          whip?: number | null
          k_9?: number | null
          bb_9?: number | null
          hr_9?: number | null
          pitcher_id?: number | null
          avg_ip_per_start?: number | null
        }
        Update: {
          id?: number
          pitcher_name?: string
          team?: string
          season?: number
          role?: string
          ip?: number | null
          era?: number | null
          fip?: number | null
          xfip?: number | null
          siera?: number | null
          whip?: number | null
          k_9?: number | null
          bb_9?: number | null
          hr_9?: number | null
          pitcher_id?: number | null
          avg_ip_per_start?: number | null
        }
        Relationships: []
      }
      pitcher_workload: {
        Row: {
          game_date: string
          pitcher_id: number
          team: string
          outs: number
          role: string
          updated_at: string
        }
        Insert: {
          game_date: string
          pitcher_id: number
          team: string
          outs: number
          role: string
          updated_at?: string
        }
        Update: {
          game_date?: string
          pitcher_id?: number
          team?: string
          outs?: number
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      posterior_sigmas: {
        Row: {
          refit_date: string
          sigma_name: string
          mean: number
          p10: number | null
          p90: number | null
        }
        Insert: {
          refit_date: string
          sigma_name: string
          mean: number
          p10?: number | null
          p90?: number | null
        }
        Update: {
          refit_date?: string
          sigma_name?: string
          mean?: number
          p10?: number | null
          p90?: number | null
        }
        Relationships: []
      }
      posterior_skills: {
        Row: {
          refit_date: string
          actor_type: string
          split_label: string
          rank_type: string
          rank: number
          actor_id: number
          actor_name: string | null
          team: string | null
          skill_score: number
        }
        Insert: {
          refit_date: string
          actor_type: string
          split_label: string
          rank_type: string
          rank: number
          actor_id: number
          actor_name?: string | null
          team?: string | null
          skill_score: number
        }
        Update: {
          refit_date?: string
          actor_type?: string
          split_label?: string
          rank_type?: string
          rank?: number
          actor_id?: number
          actor_name?: string | null
          team?: string | null
          skill_score?: number
        }
        Relationships: []
      }
      probable_starters: {
        Row: {
          id: number
          game_pk: number | null
          team: string
          pitcher_name: string
          pitcher_id: number | null
          handedness: string | null
          is_home: boolean
        }
        Insert: {
          id?: number
          game_pk?: number | null
          team: string
          pitcher_name: string
          pitcher_id?: number | null
          handedness?: string | null
          is_home: boolean
        }
        Update: {
          id?: number
          game_pk?: number | null
          team?: string
          pitcher_name?: string
          pitcher_id?: number | null
          handedness?: string | null
          is_home?: boolean
        }
        Relationships: []
      }
      team_batting: {
        Row: {
          id: number
          team: string
          season: number
          split: string
          pa: number | null
          wrc_plus: number | null
          woba: number | null
          ops: number | null
          slg: number | null
          obp: number | null
          iso: number | null
          babip: number | null
          k_pct: number | null
          bb_pct: number | null
        }
        Insert: {
          id?: number
          team: string
          season?: number
          split: string
          pa?: number | null
          wrc_plus?: number | null
          woba?: number | null
          ops?: number | null
          slg?: number | null
          obp?: number | null
          iso?: number | null
          babip?: number | null
          k_pct?: number | null
          bb_pct?: number | null
        }
        Update: {
          id?: number
          team?: string
          season?: number
          split?: string
          pa?: number | null
          wrc_plus?: number | null
          woba?: number | null
          ops?: number | null
          slg?: number | null
          obp?: number | null
          iso?: number | null
          babip?: number | null
          k_pct?: number | null
          bb_pct?: number | null
        }
        Relationships: []
      }
      weather: {
        Row: {
          game_pk: number
          wind_speed_mph: number | null
          wind_dir_raw: string | null
          wind_dir_enum: string | null
          wind_out_component: number | null
          temp_f: number | null
          condition: string | null
          is_dome: boolean
          updated_at: string
        }
        Insert: {
          game_pk: number
          wind_speed_mph?: number | null
          wind_dir_raw?: string | null
          wind_dir_enum?: string | null
          wind_out_component?: number | null
          temp_f?: number | null
          condition?: string | null
          is_dome?: boolean
          updated_at?: string
        }
        Update: {
          game_pk?: number
          wind_speed_mph?: number | null
          wind_dir_raw?: string | null
          wind_dir_enum?: string | null
          wind_out_component?: number | null
          temp_f?: number | null
          condition?: string | null
          is_dome?: boolean
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      bet_ledger_agg_v: {
        Row: {
          date: string | null
          team: string | null
          game_pk: number | null
          bet_type: string | null
          totals_side: string | null
          ml_side: string | null
          stake: number | null
          payout: number | null
          won: boolean | null
          edge: number | null
          american_odds: number | null
          decimal_odds: number | null
        }
        Relationships: []
      }
      bet_ledger_v: {
        Row: {
          date: string | null
          team: string | null
          game_pk: number | null
          bet_type: string | null
          stake: number | null
          decimal_odds: number | null
          american_odds: number | null
          totals_side: string | null
          won: boolean | null
          edge: number | null
          payout: number | null
        }
        Relationships: []
      }
      model_outputs_season_unified: {
        Row: {
          game_pk: number | null
          date: string | null
          team: string | null
          starter: string | null
          expected_runs: number | null
          win_prob: number | null
          our_odds: number | null
          expected_runs_p10: number | null
          expected_runs_p50: number | null
          expected_runs_p90: number | null
          total_p10: number | null
          total_p50: number | null
          total_p90: number | null
          win_prob_p10: number | null
          win_prob_p90: number | null
          moneyline: number | null
          total: number | null
          spread: number | null
          spread_odds: number | null
          our_total: number | null
          total_diff: number | null
          total_play: string | null
          ev_flag: string | null
          run_line_ev_flag: string | null
          ml_confidence: number | null
          run_line_confidence: number | null
          high_variance_flag: string | null
          kelly_full_ml: number | null
          kelly_quarter_ml: number | null
          kelly_full_rl: number | null
          kelly_quarter_rl: number | null
          kelly_full_total: number | null
          kelly_quarter_total: number | null
          p_cover: number | null
          p_over: number | null
          p_under: number | null
          total_over_odds: number | null
          total_under_odds: number | null
          lineups_locked: boolean | null
          lineup_source: string | null
          prediction_updated_at: string | null
          posterior_age_days: number | null
          created_at: string | null
          updated_at: string | null
          lineup_hash: string | null
          start_time: string | null
          model_version: string | null
          game_status: string | null
          home_team: string | null
          away_team: string | null
          home_score: number | null
          away_score: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      bet_record_summary: {
        Args: { p_from?: string | null; p_team?: string | null }
        Returns: {
          bet_type: string
          wins: number
          losses: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  cfb: {
    Tables: {
      backtest_predictions: {
        Row: {
          game_id: number
          season: number
          week: number
          week_index: number | null
          season_type: string | null
          home_team: string
          away_team: string
          neutral_site: boolean | null
          home_points: number | null
          away_points: number | null
          margin: number | null
          closing_spread: number | null
          model_margin: number | null
          actual_margin: number | null
        }
        Insert: {
          game_id: number
          season: number
          week: number
          week_index?: number | null
          season_type?: string | null
          home_team: string
          away_team: string
          neutral_site?: boolean | null
          home_points?: number | null
          away_points?: number | null
          margin?: number | null
          closing_spread?: number | null
          model_margin?: number | null
          actual_margin?: number | null
        }
        Update: {
          game_id?: number
          season?: number
          week?: number
          week_index?: number | null
          season_type?: string | null
          home_team?: string
          away_team?: string
          neutral_site?: boolean | null
          home_points?: number | null
          away_points?: number | null
          margin?: number | null
          closing_spread?: number | null
          model_margin?: number | null
          actual_margin?: number | null
        }
        Relationships: []
      }
      game_projections: {
        Row: {
          game_id: number
          season: number
          week: number
          as_of: string
          model_version: string
          start_date: string | null
          home_team_id: number | null
          home_team: string
          away_team_id: number | null
          away_team: string
          neutral_site: boolean | null
          home_field_points: number | null
          expected_home_points: number | null
          expected_away_points: number | null
          home_margin: number | null
          home_spread: number | null
          model_total: number | null
          margin_sd: number | null
          total_sd: number | null
          margin_total_correlation: number | null
          distribution: string | null
          degrees_of_freedom: number | null
          home_classification: string | null
          away_classification: string | null
          home_missing_input_count: number | null
          away_missing_input_count: number | null
          conference_game: boolean | null
          pure_home_margin: number | null
          pure_home_spread: number | null
          market_home_spread: number | null
          market_weight: number | null
          market_informed_home_margin: number | null
          market_informed_home_spread: number | null
        }
        Insert: {
          game_id: number
          season: number
          week: number
          as_of: string
          model_version: string
          start_date?: string | null
          home_team_id?: number | null
          home_team: string
          away_team_id?: number | null
          away_team: string
          neutral_site?: boolean | null
          home_field_points?: number | null
          expected_home_points?: number | null
          expected_away_points?: number | null
          home_margin?: number | null
          home_spread?: number | null
          model_total?: number | null
          margin_sd?: number | null
          total_sd?: number | null
          margin_total_correlation?: number | null
          distribution?: string | null
          degrees_of_freedom?: number | null
          home_classification?: string | null
          away_classification?: string | null
          home_missing_input_count?: number | null
          away_missing_input_count?: number | null
          conference_game?: boolean | null
          pure_home_margin?: number | null
          pure_home_spread?: number | null
          market_home_spread?: number | null
          market_weight?: number | null
          market_informed_home_margin?: number | null
          market_informed_home_spread?: number | null
        }
        Update: {
          game_id?: number
          season?: number
          week?: number
          as_of?: string
          model_version?: string
          start_date?: string | null
          home_team_id?: number | null
          home_team?: string
          away_team_id?: number | null
          away_team?: string
          neutral_site?: boolean | null
          home_field_points?: number | null
          expected_home_points?: number | null
          expected_away_points?: number | null
          home_margin?: number | null
          home_spread?: number | null
          model_total?: number | null
          margin_sd?: number | null
          total_sd?: number | null
          margin_total_correlation?: number | null
          distribution?: string | null
          degrees_of_freedom?: number | null
          home_classification?: string | null
          away_classification?: string | null
          home_missing_input_count?: number | null
          away_missing_input_count?: number | null
          conference_game?: boolean | null
          pure_home_margin?: number | null
          pure_home_spread?: number | null
          market_home_spread?: number | null
          market_weight?: number | null
          market_informed_home_margin?: number | null
          market_informed_home_spread?: number | null
        }
        Relationships: []
      }
      graded_games: {
        Row: {
          game_id: number
          season: number
          week: number
          season_type: string | null
          forecast_week: number | null
          start_date: string | null
          neutral_site: boolean | null
          conference_game: boolean | null
          home_team_id: number | null
          home_team: string | null
          away_team_id: number | null
          away_team: string | null
          home_classification: string | null
          away_classification: string | null
          home_missing_input_count: number | null
          away_missing_input_count: number | null
          model_version: string | null
          forecast_as_of: string | null
          pure_home_margin: number | null
          market_informed_home_margin: number | null
          market_weight: number | null
          forecast_market_home_spread: number | null
          model_total: number | null
          margin_sd: number | null
          total_sd: number | null
          distribution: string | null
          degrees_of_freedom: number | null
          home_win_probability: number | null
          probability_method: string | null
          closing_spread: number | null
          closing_total: number | null
          n_spread_offers: number | null
          n_total_offers: number | null
          closing_source: string | null
          home_points: number | null
          away_points: number | null
          actual_margin: number | null
          actual_total: number | null
          score_source: string | null
          source_ingested_at: string | null
          graded_at: string | null
        }
        Insert: {
          game_id: number
          season: number
          week: number
          season_type?: string | null
          forecast_week?: number | null
          start_date?: string | null
          neutral_site?: boolean | null
          conference_game?: boolean | null
          home_team_id?: number | null
          home_team?: string | null
          away_team_id?: number | null
          away_team?: string | null
          home_classification?: string | null
          away_classification?: string | null
          home_missing_input_count?: number | null
          away_missing_input_count?: number | null
          model_version?: string | null
          forecast_as_of?: string | null
          pure_home_margin?: number | null
          market_informed_home_margin?: number | null
          market_weight?: number | null
          forecast_market_home_spread?: number | null
          model_total?: number | null
          margin_sd?: number | null
          total_sd?: number | null
          distribution?: string | null
          degrees_of_freedom?: number | null
          home_win_probability?: number | null
          probability_method?: string | null
          closing_spread?: number | null
          closing_total?: number | null
          n_spread_offers?: number | null
          n_total_offers?: number | null
          closing_source?: string | null
          home_points?: number | null
          away_points?: number | null
          actual_margin?: number | null
          actual_total?: number | null
          score_source?: string | null
          source_ingested_at?: string | null
          graded_at?: string | null
        }
        Update: {
          game_id?: number
          season?: number
          week?: number
          season_type?: string | null
          forecast_week?: number | null
          start_date?: string | null
          neutral_site?: boolean | null
          conference_game?: boolean | null
          home_team_id?: number | null
          home_team?: string | null
          away_team_id?: number | null
          away_team?: string | null
          home_classification?: string | null
          away_classification?: string | null
          home_missing_input_count?: number | null
          away_missing_input_count?: number | null
          model_version?: string | null
          forecast_as_of?: string | null
          pure_home_margin?: number | null
          market_informed_home_margin?: number | null
          market_weight?: number | null
          forecast_market_home_spread?: number | null
          model_total?: number | null
          margin_sd?: number | null
          total_sd?: number | null
          distribution?: string | null
          degrees_of_freedom?: number | null
          home_win_probability?: number | null
          probability_method?: string | null
          closing_spread?: number | null
          closing_total?: number | null
          n_spread_offers?: number | null
          n_total_offers?: number | null
          closing_source?: string | null
          home_points?: number | null
          away_points?: number | null
          actual_margin?: number | null
          actual_total?: number | null
          score_source?: string | null
          source_ingested_at?: string | null
          graded_at?: string | null
        }
        Relationships: []
      }
      market_comparisons: {
        Row: {
          game_id: number
          start_date: string | null
          home_team: string | null
          away_team: string | null
          model_home_spread: number | null
          model_total: number | null
          margin_sd: number | null
          total_sd: number | null
          model_as_of: string | null
          market_available: boolean | null
          priced_offer_available: boolean | null
          executable_offer_available: boolean | null
          review_status: string | null
          recommendation_status: string | null
          best_offer_market: string | null
          best_offer_selection: string | null
          best_offer_point: number | null
          best_offer_price: number | null
          best_offer_provider: string | null
          best_offer_provider_key: string | null
          best_offer_provider_last_update: string | null
          best_offer_event_link: string | null
          best_offer_market_link: string | null
          best_offer_bet_link: string | null
          best_offer_edge_points: number | null
          best_offer_edge_standardized: number | null
          best_offer_model_cover_probability: number | null
          best_offer_model_fair_price: number | null
          best_offer_expected_value_per_unit: number | null
        }
        Insert: {
          game_id: number
          start_date?: string | null
          home_team?: string | null
          away_team?: string | null
          model_home_spread?: number | null
          model_total?: number | null
          margin_sd?: number | null
          total_sd?: number | null
          model_as_of?: string | null
          market_available?: boolean | null
          priced_offer_available?: boolean | null
          executable_offer_available?: boolean | null
          review_status?: string | null
          recommendation_status?: string | null
          best_offer_market?: string | null
          best_offer_selection?: string | null
          best_offer_point?: number | null
          best_offer_price?: number | null
          best_offer_provider?: string | null
          best_offer_provider_key?: string | null
          best_offer_provider_last_update?: string | null
          best_offer_event_link?: string | null
          best_offer_market_link?: string | null
          best_offer_bet_link?: string | null
          best_offer_edge_points?: number | null
          best_offer_edge_standardized?: number | null
          best_offer_model_cover_probability?: number | null
          best_offer_model_fair_price?: number | null
          best_offer_expected_value_per_unit?: number | null
        }
        Update: {
          game_id?: number
          start_date?: string | null
          home_team?: string | null
          away_team?: string | null
          model_home_spread?: number | null
          model_total?: number | null
          margin_sd?: number | null
          total_sd?: number | null
          model_as_of?: string | null
          market_available?: boolean | null
          priced_offer_available?: boolean | null
          executable_offer_available?: boolean | null
          review_status?: string | null
          recommendation_status?: string | null
          best_offer_market?: string | null
          best_offer_selection?: string | null
          best_offer_point?: number | null
          best_offer_price?: number | null
          best_offer_provider?: string | null
          best_offer_provider_key?: string | null
          best_offer_provider_last_update?: string | null
          best_offer_event_link?: string | null
          best_offer_market_link?: string | null
          best_offer_bet_link?: string | null
          best_offer_edge_points?: number | null
          best_offer_edge_standardized?: number | null
          best_offer_model_cover_probability?: number | null
          best_offer_model_fair_price?: number | null
          best_offer_expected_value_per_unit?: number | null
        }
        Relationships: []
      }
      performance_metrics: {
        Row: {
          season: number
          prediction_source: string
          segment_kind: string
          segment: string
          segment_order: number | null
          games: number | null
          thin_sample: boolean | null
          margin_mae: number | null
          margin_rmse: number | null
          margin_bias: number | null
          total_games: number | null
          total_mae: number | null
          total_rmse: number | null
          total_bias: number | null
          coverage_50: number | null
          coverage_80: number | null
          coverage_90: number | null
          games_with_market: number | null
          market_mae: number | null
          model_minus_market_mae: number | null
          closer_than_market_share: number | null
          probability_games: number | null
          brier_score: number | null
          log_loss: number | null
          computed_at: string | null
        }
        Insert: {
          season: number
          prediction_source: string
          segment_kind: string
          segment: string
          segment_order?: number | null
          games?: number | null
          thin_sample?: boolean | null
          margin_mae?: number | null
          margin_rmse?: number | null
          margin_bias?: number | null
          total_games?: number | null
          total_mae?: number | null
          total_rmse?: number | null
          total_bias?: number | null
          coverage_50?: number | null
          coverage_80?: number | null
          coverage_90?: number | null
          games_with_market?: number | null
          market_mae?: number | null
          model_minus_market_mae?: number | null
          closer_than_market_share?: number | null
          probability_games?: number | null
          brier_score?: number | null
          log_loss?: number | null
          computed_at?: string | null
        }
        Update: {
          season?: number
          prediction_source?: string
          segment_kind?: string
          segment?: string
          segment_order?: number | null
          games?: number | null
          thin_sample?: boolean | null
          margin_mae?: number | null
          margin_rmse?: number | null
          margin_bias?: number | null
          total_games?: number | null
          total_mae?: number | null
          total_rmse?: number | null
          total_bias?: number | null
          coverage_50?: number | null
          coverage_80?: number | null
          coverage_90?: number | null
          games_with_market?: number | null
          market_mae?: number | null
          model_minus_market_mae?: number | null
          closer_than_market_share?: number | null
          probability_games?: number | null
          brier_score?: number | null
          log_loss?: number | null
          computed_at?: string | null
        }
        Relationships: []
      }
      serving_anchors: {
        Row: {
          season: number
          anchor_week: number
          game_id: number
          model_week: number
          home_margin: number
          margin_sd: number
          closing_spread: number | null
          n_spread_offers: number | null
          margin_sd_method: string | null
          market_anchor_source: string | null
          closing_snapshot_id: string | null
          closing_fetched_at: string | null
          latest_provider_update: string | null
          published_at: string
        }
        Insert: {
          season: number
          anchor_week: number
          game_id: number
          model_week: number
          home_margin: number
          margin_sd: number
          closing_spread?: number | null
          n_spread_offers?: number | null
          margin_sd_method?: string | null
          market_anchor_source?: string | null
          closing_snapshot_id?: string | null
          closing_fetched_at?: string | null
          latest_provider_update?: string | null
          published_at?: string
        }
        Update: {
          season?: number
          anchor_week?: number
          game_id?: number
          model_week?: number
          home_margin?: number
          margin_sd?: number
          closing_spread?: number | null
          n_spread_offers?: number | null
          margin_sd_method?: string | null
          market_anchor_source?: string | null
          closing_snapshot_id?: string | null
          closing_fetched_at?: string | null
          latest_provider_update?: string | null
          published_at?: string
        }
        Relationships: []
      }
      team_ratings: {
        Row: {
          season: number
          week: number
          as_of: string
          model_version: string
          team_id: number
          team: string
          conference: string | null
          classification: string | null
          offense_points: number | null
          defense_points: number | null
          power_rating: number
          scoring_environment: number | null
          expected_possessions: number | null
          power_rating_sd: number | null
          missing_input_count: number | null
        }
        Insert: {
          season: number
          week: number
          as_of: string
          model_version: string
          team_id: number
          team: string
          conference?: string | null
          classification?: string | null
          offense_points?: number | null
          defense_points?: number | null
          power_rating: number
          scoring_environment?: number | null
          expected_possessions?: number | null
          power_rating_sd?: number | null
          missing_input_count?: number | null
        }
        Update: {
          season?: number
          week?: number
          as_of?: string
          model_version?: string
          team_id?: number
          team?: string
          conference?: string | null
          classification?: string | null
          offense_points?: number | null
          defense_points?: number | null
          power_rating?: number
          scoring_environment?: number | null
          expected_possessions?: number | null
          power_rating_sd?: number | null
          missing_input_count?: number | null
        }
        Relationships: []
      }
      team_unit_ratings: {
        Row: {
          season: number
          week: number
          as_of: string
          model_version: string
          source_season: number | null
          team_id: number
          team: string
          classification: string | null
          unit_history_missing: boolean
          rush_offense: number | null
          pass_offense: number | null
          rush_defense: number | null
          pass_defense: number | null
          pass_block: number | null
          run_block: number | null
        }
        Insert: {
          season: number
          week: number
          as_of: string
          model_version: string
          source_season?: number | null
          team_id: number
          team: string
          classification?: string | null
          unit_history_missing?: boolean
          rush_offense?: number | null
          pass_offense?: number | null
          rush_defense?: number | null
          pass_defense?: number | null
          pass_block?: number | null
          run_block?: number | null
        }
        Update: {
          season?: number
          week?: number
          as_of?: string
          model_version?: string
          source_season?: number | null
          team_id?: number
          team?: string
          classification?: string | null
          unit_history_missing?: boolean
          rush_offense?: number | null
          pass_offense?: number | null
          rush_defense?: number | null
          pass_defense?: number | null
          pass_block?: number | null
          run_block?: number | null
        }
        Relationships: []
      }
      teams: {
        Row: {
          team_id: number
          team: string
          color: string | null
          alternate_color: string | null
          logo_light: string | null
          logo_dark: string | null
        }
        Insert: {
          team_id: number
          team: string
          color?: string | null
          alternate_color?: string | null
          logo_light?: string | null
          logo_dark?: string | null
        }
        Update: {
          team_id?: number
          team?: string
          color?: string | null
          alternate_color?: string | null
          logo_light?: string | null
          logo_dark?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
      forecast_snapshots: {
        Row: {
          snapshot_id: number
          recorded_at: string
          game_id: string
          season: number
          week: number
          as_of: string
          model_version: string
          start_date: string | null
          home_team_abbr: string | null
          home_team: string
          away_team_abbr: string | null
          away_team: string
          neutral_site: boolean | null
          div_game: boolean | null
          home_field_points: number | null
          expected_home_points: number | null
          expected_away_points: number | null
          home_qb_adjustment: number | null
          away_qb_adjustment: number | null
          rest_adjustment: number | null
          pure_home_margin: number | null
          pure_home_spread: number | null
          market_home_spread: number | null
          market_weight: number | null
          home_margin: number | null
          home_spread: number | null
          model_total: number | null
          margin_sd: number | null
          total_sd: number | null
          margin_total_correlation: number | null
          distribution: string | null
          degrees_of_freedom: number | null
        }
        Insert: {
          snapshot_id?: never
          recorded_at?: string
          game_id: string
          season: number
          week: number
          as_of: string
          model_version: string
          start_date?: string | null
          home_team_abbr?: string | null
          home_team: string
          away_team_abbr?: string | null
          away_team: string
          neutral_site?: boolean | null
          div_game?: boolean | null
          home_field_points?: number | null
          expected_home_points?: number | null
          expected_away_points?: number | null
          home_qb_adjustment?: number | null
          away_qb_adjustment?: number | null
          rest_adjustment?: number | null
          pure_home_margin?: number | null
          pure_home_spread?: number | null
          market_home_spread?: number | null
          market_weight?: number | null
          home_margin?: number | null
          home_spread?: number | null
          model_total?: number | null
          margin_sd?: number | null
          total_sd?: number | null
          margin_total_correlation?: number | null
          distribution?: string | null
          degrees_of_freedom?: number | null
        }
        Update: {
          snapshot_id?: never
          recorded_at?: string
          game_id?: string
          season?: number
          week?: number
          as_of?: string
          model_version?: string
          start_date?: string | null
          home_team_abbr?: string | null
          home_team?: string
          away_team_abbr?: string | null
          away_team?: string
          neutral_site?: boolean | null
          div_game?: boolean | null
          home_field_points?: number | null
          expected_home_points?: number | null
          expected_away_points?: number | null
          home_qb_adjustment?: number | null
          away_qb_adjustment?: number | null
          rest_adjustment?: number | null
          pure_home_margin?: number | null
          pure_home_spread?: number | null
          market_home_spread?: number | null
          market_weight?: number | null
          home_margin?: number | null
          home_spread?: number | null
          model_total?: number | null
          margin_sd?: number | null
          total_sd?: number | null
          margin_total_correlation?: number | null
          distribution?: string | null
          degrees_of_freedom?: number | null
        }
        Relationships: []
      }
      game_results: {
        Row: {
          game_id: string
          season: number
          week: number
          season_type: string
          start_date: string
          home_team_abbr: string
          away_team_abbr: string
          home_team: string
          away_team: string
          neutral_site: boolean
          home_points: number
          away_points: number
          closing_spread: number | null
          source: string
          source_fetched_at: string
        }
        Insert: {
          game_id: string
          season: number
          week: number
          season_type: string
          start_date: string
          home_team_abbr: string
          away_team_abbr: string
          home_team: string
          away_team: string
          neutral_site: boolean
          home_points: number
          away_points: number
          closing_spread?: number | null
          source: string
          source_fetched_at: string
        }
        Update: {
          game_id?: string
          season?: number
          week?: number
          season_type?: string
          start_date?: string
          home_team_abbr?: string
          away_team_abbr?: string
          home_team?: string
          away_team?: string
          neutral_site?: boolean
          home_points?: number
          away_points?: number
          closing_spread?: number | null
          source?: string
          source_fetched_at?: string
        }
        Relationships: []
      }
      season_win_totals: {
        Row: {
          season: number
          as_of: string
          model_version: string
          team_abbr: string
          team: string
          conference: string | null
          division: string | null
          wins: number
          losses: number
          ties: number
          games_played: number
          games_remaining: number
          projected_wins: number
          remaining_expected_wins: number
          wins_p10: number
          wins_p50: number
          wins_p90: number
          simulation_count: number
          simulation_seed: number
          ratings_through_week: number
          ratings_through_date: string | null
          schedule_fetched_at: string
          depth_chart_as_of: string | null
          sportsbook_win_total: number | null
          sportsbook_source_name: string | null
          sportsbook_source_date: string | null
          sportsbook_source_url: string | null
        }
        Insert: {
          season: number
          as_of: string
          model_version: string
          team_abbr: string
          team: string
          conference?: string | null
          division?: string | null
          wins: number
          losses: number
          ties: number
          games_played: number
          games_remaining: number
          projected_wins: number
          remaining_expected_wins: number
          wins_p10: number
          wins_p50: number
          wins_p90: number
          simulation_count: number
          simulation_seed: number
          ratings_through_week: number
          ratings_through_date?: string | null
          schedule_fetched_at: string
          depth_chart_as_of?: string | null
          sportsbook_win_total?: number | null
          sportsbook_source_name?: string | null
          sportsbook_source_date?: string | null
          sportsbook_source_url?: string | null
        }
        Update: {
          season?: number
          as_of?: string
          model_version?: string
          team_abbr?: string
          team?: string
          conference?: string | null
          division?: string | null
          wins?: number
          losses?: number
          ties?: number
          games_played?: number
          games_remaining?: number
          projected_wins?: number
          remaining_expected_wins?: number
          wins_p10?: number
          wins_p50?: number
          wins_p90?: number
          simulation_count?: number
          simulation_seed?: number
          ratings_through_week?: number
          ratings_through_date?: string | null
          schedule_fetched_at?: string
          depth_chart_as_of?: string | null
          sportsbook_win_total?: number | null
          sportsbook_source_name?: string | null
          sportsbook_source_date?: string | null
          sportsbook_source_url?: string | null
        }
        Relationships: []
      }
      backtest_predictions: {
        Row: {
          game_id: string
          season: number
          week: number
          week_index: number | null
          season_type: string | null
          home_team: string
          away_team: string
          neutral_site: boolean | null
          home_points: number | null
          away_points: number | null
          closing_spread: number | null
          model_margin: number | null
          pure_model_margin: number | null
          actual_margin: number | null
        }
        Insert: {
          game_id: string
          season: number
          week: number
          week_index?: number | null
          season_type?: string | null
          home_team: string
          away_team: string
          neutral_site?: boolean | null
          home_points?: number | null
          away_points?: number | null
          closing_spread?: number | null
          model_margin?: number | null
          pure_model_margin?: number | null
          actual_margin?: number | null
        }
        Update: {
          game_id?: string
          season?: number
          week?: number
          week_index?: number | null
          season_type?: string | null
          home_team?: string
          away_team?: string
          neutral_site?: boolean | null
          home_points?: number | null
          away_points?: number | null
          closing_spread?: number | null
          model_margin?: number | null
          pure_model_margin?: number | null
          actual_margin?: number | null
        }
        Relationships: []
      }
      game_projections: {
        Row: {
          game_id: string
          season: number
          week: number
          as_of: string
          model_version: string
          start_date: string | null
          home_team_abbr: string | null
          home_team: string
          away_team_abbr: string | null
          away_team: string
          neutral_site: boolean | null
          div_game: boolean | null
          home_field_points: number | null
          expected_home_points: number | null
          expected_away_points: number | null
          home_qb_adjustment: number | null
          away_qb_adjustment: number | null
          rest_adjustment: number | null
          pure_home_margin: number | null
          pure_home_spread: number | null
          market_home_spread: number | null
          market_weight: number | null
          home_margin: number | null
          home_spread: number | null
          model_total: number | null
          margin_sd: number | null
          total_sd: number | null
          margin_total_correlation: number | null
          distribution: string | null
          degrees_of_freedom: number | null
        }
        Insert: {
          game_id: string
          season: number
          week: number
          as_of: string
          model_version: string
          start_date?: string | null
          home_team_abbr?: string | null
          home_team: string
          away_team_abbr?: string | null
          away_team: string
          neutral_site?: boolean | null
          div_game?: boolean | null
          home_field_points?: number | null
          expected_home_points?: number | null
          expected_away_points?: number | null
          home_qb_adjustment?: number | null
          away_qb_adjustment?: number | null
          rest_adjustment?: number | null
          pure_home_margin?: number | null
          pure_home_spread?: number | null
          market_home_spread?: number | null
          market_weight?: number | null
          home_margin?: number | null
          home_spread?: number | null
          model_total?: number | null
          margin_sd?: number | null
          total_sd?: number | null
          margin_total_correlation?: number | null
          distribution?: string | null
          degrees_of_freedom?: number | null
        }
        Update: {
          game_id?: string
          season?: number
          week?: number
          as_of?: string
          model_version?: string
          start_date?: string | null
          home_team_abbr?: string | null
          home_team?: string
          away_team_abbr?: string | null
          away_team?: string
          neutral_site?: boolean | null
          div_game?: boolean | null
          home_field_points?: number | null
          expected_home_points?: number | null
          expected_away_points?: number | null
          home_qb_adjustment?: number | null
          away_qb_adjustment?: number | null
          rest_adjustment?: number | null
          pure_home_margin?: number | null
          pure_home_spread?: number | null
          market_home_spread?: number | null
          market_weight?: number | null
          home_margin?: number | null
          home_spread?: number | null
          model_total?: number | null
          margin_sd?: number | null
          total_sd?: number | null
          margin_total_correlation?: number | null
          distribution?: string | null
          degrees_of_freedom?: number | null
        }
        Relationships: []
      }
      market_comparisons: {
        Row: {
          game_id: string
          start_date: string | null
          home_team: string | null
          away_team: string | null
          model_home_spread: number | null
          model_total: number | null
          margin_sd: number | null
          total_sd: number | null
          model_as_of: string | null
          market_available: boolean | null
          priced_offer_available: boolean | null
          executable_offer_available: boolean | null
          review_status: string | null
          recommendation_status: string | null
          best_offer_market: string | null
          best_offer_selection: string | null
          best_offer_point: number | null
          best_offer_price: number | null
          best_offer_provider: string | null
          best_offer_provider_key: string | null
          best_offer_provider_last_update: string | null
          best_offer_event_link: string | null
          best_offer_market_link: string | null
          best_offer_bet_link: string | null
          best_offer_edge_points: number | null
          best_offer_edge_standardized: number | null
          best_offer_model_cover_probability: number | null
          best_offer_model_fair_price: number | null
          best_offer_expected_value_per_unit: number | null
        }
        Insert: {
          game_id: string
          start_date?: string | null
          home_team?: string | null
          away_team?: string | null
          model_home_spread?: number | null
          model_total?: number | null
          margin_sd?: number | null
          total_sd?: number | null
          model_as_of?: string | null
          market_available?: boolean | null
          priced_offer_available?: boolean | null
          executable_offer_available?: boolean | null
          review_status?: string | null
          recommendation_status?: string | null
          best_offer_market?: string | null
          best_offer_selection?: string | null
          best_offer_point?: number | null
          best_offer_price?: number | null
          best_offer_provider?: string | null
          best_offer_provider_key?: string | null
          best_offer_provider_last_update?: string | null
          best_offer_event_link?: string | null
          best_offer_market_link?: string | null
          best_offer_bet_link?: string | null
          best_offer_edge_points?: number | null
          best_offer_edge_standardized?: number | null
          best_offer_model_cover_probability?: number | null
          best_offer_model_fair_price?: number | null
          best_offer_expected_value_per_unit?: number | null
        }
        Update: {
          game_id?: string
          start_date?: string | null
          home_team?: string | null
          away_team?: string | null
          model_home_spread?: number | null
          model_total?: number | null
          margin_sd?: number | null
          total_sd?: number | null
          model_as_of?: string | null
          market_available?: boolean | null
          priced_offer_available?: boolean | null
          executable_offer_available?: boolean | null
          review_status?: string | null
          recommendation_status?: string | null
          best_offer_market?: string | null
          best_offer_selection?: string | null
          best_offer_point?: number | null
          best_offer_price?: number | null
          best_offer_provider?: string | null
          best_offer_provider_key?: string | null
          best_offer_provider_last_update?: string | null
          best_offer_event_link?: string | null
          best_offer_market_link?: string | null
          best_offer_bet_link?: string | null
          best_offer_edge_points?: number | null
          best_offer_edge_standardized?: number | null
          best_offer_model_cover_probability?: number | null
          best_offer_model_fair_price?: number | null
          best_offer_expected_value_per_unit?: number | null
        }
        Relationships: []
      }
      market_snapshots: {
        Row: {
          game_id: string
          season: number
          week: number
          fetched_at: string
          home_spread: number | null
          total: number | null
          spread_books: number | null
          total_books: number | null
        }
        Insert: {
          game_id: string
          season: number
          week: number
          fetched_at: string
          home_spread?: number | null
          total?: number | null
          spread_books?: number | null
          total_books?: number | null
        }
        Update: {
          game_id?: string
          season?: number
          week?: number
          fetched_at?: string
          home_spread?: number | null
          total?: number | null
          spread_books?: number | null
          total_books?: number | null
        }
        Relationships: []
      }
      team_ratings: {
        Row: {
          season: number
          week: number
          as_of: string
          model_version: string
          team_abbr: string
          team: string
          conference: string | null
          division: string | null
          offense_points: number | null
          defense_points: number | null
          power_rating: number
          scoring_environment: number | null
          expected_drives: number | null
          power_rating_sd: number | null
          missing_input_count: number | null
        }
        Insert: {
          season: number
          week: number
          as_of: string
          model_version: string
          team_abbr: string
          team: string
          conference?: string | null
          division?: string | null
          offense_points?: number | null
          defense_points?: number | null
          power_rating: number
          scoring_environment?: number | null
          expected_drives?: number | null
          power_rating_sd?: number | null
          missing_input_count?: number | null
        }
        Update: {
          season?: number
          week?: number
          as_of?: string
          model_version?: string
          team_abbr?: string
          team?: string
          conference?: string | null
          division?: string | null
          offense_points?: number | null
          defense_points?: number | null
          power_rating?: number
          scoring_environment?: number | null
          expected_drives?: number | null
          power_rating_sd?: number | null
          missing_input_count?: number | null
        }
        Relationships: []
      }
      team_unit_ratings: {
        Row: {
          season: number
          week: number
          as_of: string
          model_version: string
          team_abbr: string
          team: string
          rush_offense: number | null
          pass_offense: number | null
          rush_defense: number | null
          pass_defense: number | null
          pass_block: number | null
          run_block: number | null
          special_teams: number | null
        }
        Insert: {
          season: number
          week: number
          as_of: string
          model_version: string
          team_abbr: string
          team: string
          rush_offense?: number | null
          pass_offense?: number | null
          rush_defense?: number | null
          pass_defense?: number | null
          pass_block?: number | null
          run_block?: number | null
          special_teams?: number | null
        }
        Update: {
          season?: number
          week?: number
          as_of?: string
          model_version?: string
          team_abbr?: string
          team?: string
          rush_offense?: number | null
          pass_offense?: number | null
          rush_defense?: number | null
          pass_defense?: number | null
          pass_block?: number | null
          run_block?: number | null
          special_teams?: number | null
        }
        Relationships: []
      }
      teams: {
        Row: {
          team_abbr: string
          team: string
          color: string | null
          alternate_color: string | null
          logo_light: string | null
          logo_dark: string | null
        }
        Insert: {
          team_abbr: string
          team: string
          color?: string | null
          alternate_color?: string | null
          logo_light?: string | null
          logo_dark?: string | null
        }
        Update: {
          team_abbr?: string
          team?: string
          color?: string | null
          alternate_color?: string | null
          logo_light?: string | null
          logo_dark?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      live_predictions: {
        Row: {
          game_id: string | null
          season: number | null
          week: number | null
          week_index: number | null
          season_type: string | null
          home_team: string | null
          away_team: string | null
          neutral_site: boolean | null
          home_points: number | null
          away_points: number | null
          closing_spread: number | null
          model_margin: number | null
          pure_model_margin: number | null
          actual_margin: number | null
          start_date: string | null
          forecast_as_of: string | null
          forecast_recorded_at: string | null
          model_version: string | null
          closing_source: string | null
          source_fetched_at: string | null
          model_absolute_error: number | null
          pure_absolute_error: number | null
          closing_absolute_error: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
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

export type Tables<
  SchemaName extends keyof DatabaseWithoutInternals,
  TableName extends keyof (DatabaseWithoutInternals[SchemaName]["Tables"] &
    DatabaseWithoutInternals[SchemaName]["Views"]),
> = (DatabaseWithoutInternals[SchemaName]["Tables"] &
  DatabaseWithoutInternals[SchemaName]["Views"])[TableName] extends { Row: infer R }
  ? R
  : never
