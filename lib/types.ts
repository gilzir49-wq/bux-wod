// ===== Core domain types for the BUX WOD generator =====

export type Level = 'beginner' | 'intermediate' | 'advanced';

export type Goal = 'strength' | 'cardio' | 'general' | 'gymnastics';

// Equipment ids the user can multi-select.
export type Equipment =
  | 'none' // bodyweight only
  | 'pullup_bar'
  | 'dumbbells'
  | 'kettlebell'
  | 'barbell'
  | 'bands'
  | 'jump_rope'
  | 'box'
  | 'rings'
  | 'rower'
  | 'bike'
  | 'skierg'
  | 'full_gym'
  | 'park';

export type Modality = 'weightlifting' | 'gymnastics' | 'cardio';

export type TimeOption = 15 | 20 | 30 | 40 | 45 | 60;

// How a movement's prescription is measured.
export type Unit = 'reps' | 'cal' | 'm' | 'sec';

export interface Movement {
  id: string;
  name: string; // English CrossFit terminology — always.
  modality: Modality;
  // Equipment that satisfies this movement. If any selected equipment is in
  // this list (or it is 'none'), the movement is available.
  equipment: Equipment[];
  youtube: string; // working demo link
  levels: Level[]; // levels this movement suits
  // Baseline rep target for an intermediate athlete in a single round.
  baseReps: number;
  unit: Unit;
  scaling?: string; // Hebrew scaling note for harder movements
  // Relative loading "weight" used for time budgeting (heavier = slower per rep).
  load?: number;
  tags?: string[];
}

export type WorkoutFormat = 'AMRAP' | 'For Time' | 'EMOM' | 'Chipper' | 'Rounds For Time';

export interface PrescribedMovement {
  name: string;
  detail: string; // e.g. "15 reps", "12 cal", "200m", "Rx: 43/30kg"
  youtube: string;
  scaling?: string;
}

export interface WorkoutSection {
  title: string; // Hebrew section heading
  durationLabel: string; // e.g. "5 דק׳"
  movements: PrescribedMovement[];
  note?: string; // Hebrew coaching note
}

export interface MainPiece {
  format: WorkoutFormat;
  formatLine: string; // athlete-facing prescription line, e.g. "AMRAP 20 דקות"
  goalLine: string; // short athlete-facing goal sentence (Hebrew)
  movements: PrescribedMovement[];
  note?: string;
}

export interface Workout {
  id: string;
  createdAt: number; // epoch ms
  // Inputs that produced it.
  time: TimeOption;
  level: Level;
  goal: Goal;
  equipment: Equipment[];
  title: string; // Hebrew display title, e.g. "אימון כוח · 30 דק׳"
  warmup: WorkoutSection;
  main: MainPiece;
  cooldown: WorkoutSection;
  rating?: number; // 1-5 stars
}

export interface GeneratorInput {
  time: TimeOption;
  level: Level;
  goal: Goal;
  equipment: Equipment[];
}
