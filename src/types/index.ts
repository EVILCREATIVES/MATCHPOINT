// ============================================================
// MATCHPOINT — Core Domain Types
// ============================================================
// These types represent the full data model for the application.
// They are used across admin/user interfaces and map to the DB schema.
// ============================================================

// ── Enums ──

export type UserRole = "admin" | "user";

export type SourceType = "pdf" | "website" | "youtube" | "manual";

export type SourceStatus = "active" | "inactive" | "archived";

export type IngestionState =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "reprocessing";

export type TrustLevel = "trusted" | "untrusted" | "unreviewed";

export type SkillLevel = "beginner" | "intermediate" | "advanced" | "elite";

export type SessionType =
  | "technical"
  | "footwork"
  | "conditioning"
  | "tactical"
  | "match_prep"
  | "recovery"
  | "drill"
  | "serve_practice";

export type PlanPeriod = "daily" | "weekly";

export type ProgressStatus = "completed" | "skipped" | "partial";

export type DominantHand = "right" | "left" | "ambidextrous";

export type LearningStyle = "visual" | "reading" | "kinesthetic" | "mixed";

export type PlanIntensity = "light" | "moderate" | "intense" | "elite";

export type FitnessLevel = "low" | "moderate" | "high" | "athletic";

// ── Users & Auth ──

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  id: string;
  userId: string;
  age?: number;
  gender?: string;
  country?: string;
  timezone?: string;
  tennisLevel: SkillLevel;
  yearsPlaying: number;
  dominantHand: DominantHand;
  currentGoals: string[];
  availableTrainingDays: number;
  availableMinutesPerSession: number;
  hasCourtAccess: boolean;
  hasCoachAccess: boolean;
  hasBallMachine: boolean;
  physicalLimitations?: string;
  fitnessLevel: FitnessLevel;
  preferredLearningStyle: LearningStyle;
  preferredPlanIntensity: PlanIntensity;
  onboardingCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

// ── Knowledge Sources ──

export interface Source {
  id: string;
  title: string;
  sourceType: SourceType;
  author?: string;
  categoryId?: string;
  subcategoryId?: string;
  skillLevel?: SkillLevel;
  tags: string[];
  status: SourceStatus;
  visibility: "public" | "private";
  ingestionState: IngestionState;
  trustLevel: TrustLevel;
  sourceUrl?: string;
  filePath?: string;
  fileSize?: number;
  description?: string;
  summary?: string;
  chunkCount: number;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SourceChunk {
  id: string;
  sourceId: string;
  content: string;
  chunkIndex: number;
  tokenCount: number;
  embeddingId?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface IngestionJob {
  id: string;
  sourceId: string;
  status: IngestionState;
  startedAt?: string;
  completedAt?: string;
  chunksCreated: number;
  errorMessage?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

// ── Taxonomy ──

export interface Category {
  id: string;
  name: string;
  slug: string;
  parentId?: string;
  description?: string;
  icon?: string;
  sortOrder: number;
  createdAt: string;
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
  color?: string;
  createdAt: string;
}

// ── Training Plans ──

export interface TrainingPlan {
  id: string;
  userId: string;
  title: string;
  description: string;
  period: PlanPeriod;
  startDate: string;
  endDate: string;
  focusAreas: string[];
  skillLevel: SkillLevel;
  intensity: PlanIntensity;
  sessions: TrainingSession[];
  isActive: boolean;
  generatedBy: "ai" | "manual";
  createdAt: string;
  updatedAt: string;
}

export interface TrainingSession {
  id: string;
  planId: string;
  title: string;
  description: string;
  sessionType: SessionType;
  dayOfWeek: number; // 0-6
  date?: string;
  durationMinutes: number;
  exercises: Exercise[];
  warmup?: string;
  cooldown?: string;
  coachNotes?: string;
  sortOrder: number;
  createdAt: string;
}

export interface Exercise {
  id: string;
  sessionId: string;
  title: string;
  description: string;
  durationMinutes?: number;
  sets?: number;
  reps?: number;
  restSeconds?: number;
  category: string;
  difficulty: SkillLevel;
  tips: string[];
  sortOrder: number;
}

// ── Lessons ──

export interface Lesson {
  id: string;
  title: string;
  slug: string;
  description: string;
  categoryId: string;
  skillLevel: SkillLevel;
  content: LessonContent;
  tags: string[];
  estimatedMinutes: number;
  sortOrder: number;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LessonContent {
  explanation: string;
  keyPoints: string[];
  steps: LessonStep[];
  commonMistakes: string[];
  recommendedDrills: string[];
  relatedLessonIds: string[];
  videoPlaceholder?: string;
}

export interface LessonStep {
  title: string;
  description: string;
  imageUrl?: string;
}

// ── Progress ──

export interface ProgressLog {
  id: string;
  userId: string;
  sessionId?: string;
  date: string;
  status: ProgressStatus;
  selfRating?: number; // 1-5
  notes?: string;
  focusAreas: string[];
  durationMinutes?: number;
  createdAt: string;
}

export interface UserGoal {
  id: string;
  userId: string;
  title: string;
  description?: string;
  targetDate?: string;
  isCompleted: boolean;
  completedAt?: string;
  createdAt: string;
}

// ── System ──

export interface SystemSettings {
  id: string;
  key: string;
  value: string;
  description?: string;
  updatedAt: string;
}

// ── Dashboard Stats ──

export interface AdminDashboardStats {
  totalSources: number;
  activeSources: number;
  pendingIngestion: number;
  totalUsers: number;
  totalPlans: number;
  recentUploads: Source[];
  recentUpdates: Source[];
  systemStatus: "healthy" | "degraded" | "error";
}

export interface UserDashboardData {
  user: User;
  profile: UserProfile;
  activePlan?: TrainingPlan;
  todaySession?: TrainingSession;
  weeklyProgress: ProgressLog[];
  recentGoals: UserGoal[];
  recommendedLessons: Lesson[];
  stats: {
    totalSessions: number;
    completedSessions: number;
    currentStreak: number;
    focusAreaBreakdown: Record<string, number>;
  };
}
