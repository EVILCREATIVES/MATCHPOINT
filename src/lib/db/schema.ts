// ============================================================
// MATCHPOINT — Database Schema (Drizzle ORM)
// ============================================================
// This schema maps to PostgreSQL via Drizzle ORM.
// Run `npm run db:push` to sync with your database.
// ============================================================

import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
  uuid,
  varchar,
  pgEnum,
  customType,
  index,
} from "drizzle-orm/pg-core";

// ── Custom pgvector type ──

const vector = customType<{ data: number[]; driverData: string }>({
  dataType() {
    return "vector(768)";
  },
  toDriver(value: number[]): string {
    return `[${value.join(",")}]`;
  },
  fromDriver(value: string): number[] {
    return value
      .slice(1, -1)
      .split(",")
      .map(Number);
  },
});

// ── Custom tsvector type (Postgres full-text search) ──

const tsvector = customType<{ data: string }>({
  dataType() {
    return "tsvector";
  },
});

// ── Enums ──

export const userRoleEnum = pgEnum("user_role", ["admin", "user"]);
export const sourceTypeEnum = pgEnum("source_type", ["pdf", "website", "youtube", "manual"]);
export const sourceStatusEnum = pgEnum("source_status", ["active", "inactive", "archived"]);
export const ingestionStateEnum = pgEnum("ingestion_state", ["pending", "processing", "completed", "failed", "reprocessing"]);
export const trustLevelEnum = pgEnum("trust_level", ["trusted", "untrusted", "unreviewed"]);
export const skillLevelEnum = pgEnum("skill_level", ["beginner", "intermediate", "advanced", "elite"]);
export const sessionTypeEnum = pgEnum("session_type", ["technical", "footwork", "conditioning", "tactical", "match_prep", "recovery", "drill", "serve_practice"]);
export const planPeriodEnum = pgEnum("plan_period", ["daily", "weekly"]);
export const progressStatusEnum = pgEnum("progress_status", ["completed", "skipped", "partial"]);
export const chunkKindEnum = pgEnum("chunk_kind", ["text", "figure", "table", "heading", "summary"]);

// ── Users ──

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  role: userRoleEnum("role").notNull().default("user"),
  passwordHash: text("password_hash"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ── User Profiles ──

export const userProfiles = pgTable("user_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  age: integer("age"),
  gender: varchar("gender", { length: 50 }),
  country: varchar("country", { length: 100 }),
  timezone: varchar("timezone", { length: 100 }),
  tennisLevel: skillLevelEnum("tennis_level").notNull().default("beginner"),
  yearsPlaying: integer("years_playing").notNull().default(0),
  dominantHand: varchar("dominant_hand", { length: 20 }).notNull().default("right"),
  currentGoals: jsonb("current_goals").$type<string[]>().default([]),
  availableTrainingDays: integer("available_training_days").notNull().default(3),
  availableMinutesPerSession: integer("available_minutes_per_session").notNull().default(60),
  hasCourtAccess: boolean("has_court_access").notNull().default(false),
  hasCoachAccess: boolean("has_coach_access").notNull().default(false),
  hasBallMachine: boolean("has_ball_machine").notNull().default(false),
  physicalLimitations: text("physical_limitations"),
  fitnessLevel: varchar("fitness_level", { length: 20 }).notNull().default("moderate"),
  preferredLearningStyle: varchar("preferred_learning_style", { length: 20 }).notNull().default("mixed"),
  preferredPlanIntensity: varchar("preferred_plan_intensity", { length: 20 }).notNull().default("moderate"),
  onboardingCompleted: boolean("onboarding_completed").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ── Sources ──

export const sources = pgTable("sources", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 500 }).notNull(),
  sourceType: sourceTypeEnum("source_type").notNull(),
  author: varchar("author", { length: 255 }),
  categoryId: uuid("category_id").references(() => categories.id),
  subcategoryId: uuid("subcategory_id"),
  skillLevel: skillLevelEnum("skill_level"),
  tags: jsonb("tags").$type<string[]>().default([]),
  status: sourceStatusEnum("status").notNull().default("active"),
  visibility: varchar("visibility", { length: 20 }).notNull().default("public"),
  ingestionState: ingestionStateEnum("ingestion_state").notNull().default("pending"),
  trustLevel: trustLevelEnum("trust_level").notNull().default("unreviewed"),
  sourceUrl: text("source_url"),
  filePath: text("file_path"),
  fileSize: integer("file_size"),
  description: text("description"),
  summary: text("summary"),
  chunkCount: integer("chunk_count").notNull().default(0),
  pageCount: integer("page_count"),
  language: varchar("language", { length: 16 }),
  errorMessage: text("error_message"),
  analysisVersion: integer("analysis_version").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ── Source Chunks ──

export const sourceChunks = pgTable(
  "source_chunks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sourceId: uuid("source_id").notNull().references(() => sources.id),
    content: text("content").notNull(),
    contentTsv: tsvector("content_tsv"),
    chunkIndex: integer("chunk_index").notNull(),
    tokenCount: integer("token_count").notNull().default(0),
    kind: chunkKindEnum("kind").notNull().default("text"),
    pageNumber: integer("page_number"),
    headingPath: jsonb("heading_path").$type<string[]>().default([]),
    embeddingId: varchar("embedding_id", { length: 255 }),
    embedding: vector("embedding"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    contentTsvIdx: index("source_chunks_content_tsv_idx").using("gin", table.contentTsv),
    sourceIdx: index("source_chunks_source_idx").on(table.sourceId),
  })
);

// ── Source Figures (extracted images / diagrams) ──

export const sourceFigures = pgTable("source_figures", {
  id: uuid("id").primaryKey().defaultRandom(),
  sourceId: uuid("source_id").notNull().references(() => sources.id),
  chunkId: uuid("chunk_id").references(() => sourceChunks.id),
  pageNumber: integer("page_number"),
  caption: text("caption").notNull(),
  description: text("description"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── Ingestion Jobs ──

export const ingestionJobs = pgTable("ingestion_jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  sourceId: uuid("source_id").notNull().references(() => sources.id),
  status: ingestionStateEnum("status").notNull().default("pending"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  chunksCreated: integer("chunks_created").notNull().default(0),
  errorMessage: text("error_message"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── Categories ──

export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  parentId: uuid("parent_id"),
  description: text("description"),
  icon: varchar("icon", { length: 50 }),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── Tags ──

export const tags = pgTable("tags", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  color: varchar("color", { length: 20 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── Structured Tennis Knowledge (extracted by Gemini analyzer) ──

export const techniques = pgTable("techniques", {
  id: uuid("id").primaryKey().defaultRandom(),
  sourceId: uuid("source_id").references(() => sources.id),
  name: varchar("name", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }),
  skillLevel: skillLevelEnum("skill_level"),
  description: text("description").notNull(),
  keyPoints: jsonb("key_points").$type<string[]>().default([]),
  tags: jsonb("tags").$type<string[]>().default([]),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const commonErrors = pgTable("common_errors", {
  id: uuid("id").primaryKey().defaultRandom(),
  sourceId: uuid("source_id").references(() => sources.id),
  techniqueName: varchar("technique_name", { length: 255 }),
  errorName: varchar("error_name", { length: 255 }).notNull(),
  description: text("description").notNull(),
  cause: text("cause"),
  fix: text("fix"),
  skillLevel: skillLevelEnum("skill_level"),
  tags: jsonb("tags").$type<string[]>().default([]),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const drills = pgTable("drills", {
  id: uuid("id").primaryKey().defaultRandom(),
  sourceId: uuid("source_id").references(() => sources.id),
  name: varchar("name", { length: 255 }).notNull(),
  focus: varchar("focus", { length: 100 }),
  skillLevel: skillLevelEnum("skill_level"),
  description: text("description").notNull(),
  setup: text("setup"),
  instructions: jsonb("instructions").$type<string[]>().default([]),
  durationMinutes: integer("duration_minutes"),
  equipment: jsonb("equipment").$type<string[]>().default([]),
  tags: jsonb("tags").$type<string[]>().default([]),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const progressions = pgTable("progressions", {
  id: uuid("id").primaryKey().defaultRandom(),
  sourceId: uuid("source_id").references(() => sources.id),
  name: varchar("name", { length: 255 }).notNull(),
  goal: text("goal").notNull(),
  skillLevel: skillLevelEnum("skill_level"),
  steps: jsonb("steps").$type<Array<{ order: number; title: string; description: string }>>().default([]),
  durationWeeks: integer("duration_weeks"),
  tags: jsonb("tags").$type<string[]>().default([]),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── Query Cache (RAG response cache) ──

export const queryCache = pgTable(
  "query_cache",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    queryHash: varchar("query_hash", { length: 64 }).notNull().unique(),
    queryText: text("query_text").notNull(),
    filterHash: varchar("filter_hash", { length: 64 }).notNull(),
    embedding: vector("embedding"),
    chunkIds: jsonb("chunk_ids").$type<string[]>().default([]),
    answer: text("answer"),
    hits: integer("hits").notNull().default(0),
    expiresAt: timestamp("expires_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    hashIdx: index("query_cache_hash_idx").on(table.queryHash),
  })
);

// ── Training Plans ──

export const trainingPlans = pgTable("training_plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description").notNull().default(""),
  period: planPeriodEnum("period").notNull().default("weekly"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  focusAreas: jsonb("focus_areas").$type<string[]>().default([]),
  skillLevel: skillLevelEnum("skill_level").notNull(),
  intensity: varchar("intensity", { length: 20 }).notNull().default("moderate"),
  isActive: boolean("is_active").notNull().default(true),
  generatedBy: varchar("generated_by", { length: 20 }).notNull().default("ai"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ── Training Sessions ──

export const trainingSessions = pgTable("training_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  planId: uuid("plan_id").notNull().references(() => trainingPlans.id),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description").notNull().default(""),
  sessionType: sessionTypeEnum("session_type").notNull(),
  dayOfWeek: integer("day_of_week").notNull(),
  date: timestamp("date"),
  durationMinutes: integer("duration_minutes").notNull().default(60),
  exercises: jsonb("exercises").$type<unknown[]>().default([]),
  warmup: text("warmup"),
  cooldown: text("cooldown"),
  coachNotes: text("coach_notes"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── Lessons ──

export const lessons = pgTable("lessons", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 500 }).notNull(),
  slug: varchar("slug", { length: 500 }).notNull().unique(),
  description: text("description").notNull().default(""),
  categoryId: uuid("category_id").references(() => categories.id),
  skillLevel: skillLevelEnum("skill_level").notNull(),
  content: jsonb("content").$type<Record<string, unknown>>().notNull(),
  tags: jsonb("tags").$type<string[]>().default([]),
  estimatedMinutes: integer("estimated_minutes").notNull().default(15),
  sortOrder: integer("sort_order").notNull().default(0),
  isPublished: boolean("is_published").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ── Progress Logs ──

export const progressLogs = pgTable("progress_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  sessionId: uuid("session_id").references(() => trainingSessions.id),
  date: timestamp("date").notNull(),
  status: progressStatusEnum("status").notNull(),
  selfRating: integer("self_rating"),
  notes: text("notes"),
  focusAreas: jsonb("focus_areas").$type<string[]>().default([]),
  durationMinutes: integer("duration_minutes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── User Goals ──

export const userGoals = pgTable("user_goals", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  targetDate: timestamp("target_date"),
  isCompleted: boolean("is_completed").notNull().default(false),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── System Settings ──

export const systemSettings = pgTable("system_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: varchar("key", { length: 255 }).notNull().unique(),
  value: text("value").notNull(),
  description: text("description"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
