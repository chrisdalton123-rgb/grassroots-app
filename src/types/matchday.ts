export type Player = {
  id: string;
  name: string;
  squad_number: number;
  preferred_position: string;
  seconds_played: number;
  current_position: string;
  isAvailable?: boolean;
  isInjured?: boolean;
  isActive?: boolean;
  isStarter?: boolean;
  total_matches?: number;
  total_seconds_played?: number;
  total_goals?: number;
  total_potm?: number;
};

export type TrainingRecord = {
  playerId: string;
  status: 'attended' | 'absent' | 'excused';
  effortRating: number;
  notes: string;
};

export type SubPlanStep = {
  id: string;
  minute: number;
  offPlayerId: string;
  offPlayerName: string;
  onPlayerId: string;
  onPlayerName: string;
  assignedPosition: string;
  status: 'pending' | 'completed';
};

export type MatchGoal = {
  id: string;
  scorerName: string;
  minute: number;
  isOpponent: boolean;
};

export type SavedMatch = {
  id: string;
  created_at: string;
  opponent_name: string;
  age_group: string;
  our_score: number;
  opponent_score: number;
  player_of_the_match: string | null;
  starting_lineup?: string[] | null;
  match_date: string;
};