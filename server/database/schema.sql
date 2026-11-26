-- Fulgora database schema (MySQL 8.0.16+)
-- Source: MLD proposed on 2026-11-23, tested on MySQL 8.0 (26 tables).
-- Change from the proposal: workout_set.updated_at is NULL until a correction (RM-049).
-- This file documents the current state of the database. The database itself is
-- built by the numbered files in database/migrations/ (npm run db:migrate).
-- Reflects migrations 001 to 006.


CREATE TABLE `user` (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  username VARCHAR(50) NOT NULL,
  email VARCHAR(254) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  terms_accepted_at DATETIME(3) NOT NULL,
  sex ENUM('female','male') NULL,
  timezone VARCHAR(64) NOT NULL DEFAULT 'Europe/Paris',
  home_metric VARCHAR(40) NULL,
  weight_unit ENUM('kg','lb') NOT NULL DEFAULT 'kg',
  distance_unit ENUM('km','mi') NOT NULL DEFAULT 'km',
  sound_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  vibration_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  timer_notification_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id), UNIQUE KEY uq_user_username (username), UNIQUE KEY uq_user_email (email)
) ENGINE=InnoDB;

CREATE TABLE category (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  PRIMARY KEY (id), UNIQUE KEY uq_category_code (code)
) ENGINE=InnoDB;

CREATE TABLE muscle (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code VARCHAR(60) NOT NULL,
  name VARCHAR(100) NOT NULL,
  PRIMARY KEY (id), UNIQUE KEY uq_muscle_code (code)
) ENGINE=InnoDB;

CREATE TABLE equipment (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code VARCHAR(60) NOT NULL,
  name VARCHAR(100) NOT NULL,
  PRIMARY KEY (id), UNIQUE KEY uq_equipment_code (code)
) ENGINE=InnoDB;

CREATE TABLE measure (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code ENUM('reps','weight','duration','distance','speed','resistance','incline','calories') NOT NULL,
  label VARCHAR(80) NOT NULL,
  unit VARCHAR(20) NULL,
  PRIMARY KEY (id), UNIQUE KEY uq_measure_code (code)
) ENGINE=InnoDB;

CREATE TABLE exercise (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  owner_user_id BIGINT UNSIGNED NULL,
  source_exercise_id BIGINT UNSIGNED NULL,
  slug VARCHAR(160) NOT NULL,
  name VARCHAR(160) NOT NULL,
  description TEXT NULL,
  difficulty ENUM('beginner','intermediate','advanced') NOT NULL,
  image_male_url VARCHAR(1024) NULL,
  image_female_url VARCHAR(1024) NULL,
  muscle_map_male_url VARCHAR(1024) NULL,
  muscle_map_female_url VARCHAR(1024) NULL,
  allows_per_side BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'RM-084: "Chaque côté" offered for this exercise',
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id), UNIQUE KEY uq_exercise_slug (slug),
  KEY ix_exercise_owner (owner_user_id, is_archived),
  CONSTRAINT fk_exercise_owner FOREIGN KEY (owner_user_id) REFERENCES `user`(id) ON DELETE RESTRICT,
  CONSTRAINT fk_exercise_source FOREIGN KEY (source_exercise_id) REFERENCES exercise(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE exercise_text (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  exercise_id BIGINT UNSIGNED NOT NULL,
  `type` ENUM('instruction','mistake','alternative') NOT NULL,
  position SMALLINT UNSIGNED NOT NULL,
  content TEXT NOT NULL,
  PRIMARY KEY (id), UNIQUE KEY uq_exercise_text_order (exercise_id, `type`, position),
  CONSTRAINT fk_exercise_text_exercise FOREIGN KEY (exercise_id) REFERENCES exercise(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE exercise_category (
  exercise_id BIGINT UNSIGNED NOT NULL,
  category_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (exercise_id,category_id),
  CONSTRAINT fk_ec_exercise FOREIGN KEY (exercise_id) REFERENCES exercise(id) ON DELETE RESTRICT,
  CONSTRAINT fk_ec_category FOREIGN KEY (category_id) REFERENCES category(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE exercise_muscle (
  exercise_id BIGINT UNSIGNED NOT NULL,
  muscle_id BIGINT UNSIGNED NOT NULL,
  role ENUM('primary','secondary') NOT NULL,
  PRIMARY KEY (exercise_id,muscle_id),
  CONSTRAINT fk_em_exercise FOREIGN KEY (exercise_id) REFERENCES exercise(id) ON DELETE RESTRICT,
  CONSTRAINT fk_em_muscle FOREIGN KEY (muscle_id) REFERENCES muscle(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE exercise_equipment (
  exercise_id BIGINT UNSIGNED NOT NULL,
  equipment_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (exercise_id,equipment_id),
  CONSTRAINT fk_ee_exercise FOREIGN KEY (exercise_id) REFERENCES exercise(id) ON DELETE RESTRICT,
  CONSTRAINT fk_ee_equipment FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE exercise_measure (
  exercise_id BIGINT UNSIGNED NOT NULL,
  measure_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (exercise_id,measure_id),
  CONSTRAINT fk_eme_exercise FOREIGN KEY (exercise_id) REFERENCES exercise(id) ON DELETE RESTRICT,
  CONSTRAINT fk_eme_measure FOREIGN KEY (measure_id) REFERENCES measure(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE session_template (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  owner_user_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(160) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  CONSTRAINT fk_session_template_user FOREIGN KEY (owner_user_id) REFERENCES `user`(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE session_version (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  session_template_id BIGINT UNSIGNED NOT NULL,
  version_number INT UNSIGNED NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id), UNIQUE KEY uq_session_version_number (session_template_id,version_number),
  CONSTRAINT fk_session_version_template FOREIGN KEY (session_template_id) REFERENCES session_template(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE template_block (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  session_version_id BIGINT UNSIGNED NOT NULL,
  block_type ENUM('classic','circuit','amrap','for_time','warm_up','stretching','challenge','note') NOT NULL,
  name VARCHAR(160) NULL,
  position SMALLINT UNSIGNED NOT NULL,
  planned_rounds SMALLINT UNSIGNED NULL,
  time_limit_seconds INT UNSIGNED NULL,
  instructions TEXT NULL,
  PRIMARY KEY (id), UNIQUE KEY uq_template_block_position (session_version_id,position),
  CONSTRAINT fk_template_block_version FOREIGN KEY (session_version_id) REFERENCES session_version(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE template_block_exercise (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  template_block_id BIGINT UNSIGNED NOT NULL,
  exercise_id BIGINT UNSIGNED NOT NULL,
  position SMALLINT UNSIGNED NOT NULL,
  instructions TEXT NULL,
  default_rest_seconds INT UNSIGNED NULL,
  is_per_side BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Done left then right (US-51)',
  PRIMARY KEY (id), UNIQUE KEY uq_template_block_exercise_position (template_block_id,position),
  CONSTRAINT fk_tbe_block FOREIGN KEY (template_block_id) REFERENCES template_block(id) ON DELETE RESTRICT,
  CONSTRAINT fk_tbe_exercise FOREIGN KEY (exercise_id) REFERENCES exercise(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE planned_set (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  template_block_exercise_id BIGINT UNSIGNED NOT NULL,
  position SMALLINT UNSIGNED NOT NULL,
  reps INT UNSIGNED NULL,
  weight_kg DECIMAL(9,3) NULL,
  weight_left_kg DECIMAL(9,3) NULL COMMENT 'Per side (US-51)',
  weight_right_kg DECIMAL(9,3) NULL COMMENT 'Per side (US-51)',
  duration_seconds INT UNSIGNED NULL,
  distance_meters DECIMAL(12,3) NULL,
  speed_kmh DECIMAL(8,3) NULL,
  resistance DECIMAL(9,3) NULL,
  incline_percent DECIMAL(6,2) NULL,
  calories DECIMAL(9,2) NULL,
  rest_after_seconds INT UNSIGNED NULL,
  PRIMARY KEY (id), UNIQUE KEY uq_planned_set_position (template_block_exercise_id,position),
  CONSTRAINT fk_planned_set_exercise FOREIGN KEY (template_block_exercise_id) REFERENCES template_block_exercise(id) ON DELETE RESTRICT,
  CONSTRAINT ck_planned_set_nonnegative CHECK ((weight_kg IS NULL OR weight_kg >= 0) AND (distance_meters IS NULL OR distance_meters >= 0) AND (speed_kmh IS NULL OR speed_kmh >= 0) AND (calories IS NULL OR calories >= 0))
) ENGINE=InnoDB;

CREATE TABLE program (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  owner_user_id BIGINT UNSIGNED NOT NULL,
  source_program_id BIGINT UNSIGNED NULL,
  name VARCHAR(160) NOT NULL,
  description TEXT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status ENUM('draft','programmed','in_progress','finished','abandoned') NOT NULL DEFAULT 'programmed',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id), KEY ix_program_owner (owner_user_id,status),
  CONSTRAINT fk_program_user FOREIGN KEY (owner_user_id) REFERENCES `user`(id) ON DELETE RESTRICT,
  CONSTRAINT fk_program_source FOREIGN KEY (source_program_id) REFERENCES program(id) ON DELETE RESTRICT,
  CONSTRAINT ck_program_dates CHECK (end_date >= start_date)
) ENGINE=InnoDB;

CREATE TABLE weekly_schedule (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  program_id BIGINT UNSIGNED NOT NULL,
  session_template_id BIGINT UNSIGNED NOT NULL,
  weekday TINYINT UNSIGNED NOT NULL COMMENT 'ISO: 1=Monday, 7=Sunday',
  planned_time TIME NULL,
  deactivated_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id), KEY ix_schedule_program (program_id, deactivated_at),
  CONSTRAINT fk_weekly_schedule_program FOREIGN KEY (program_id) REFERENCES program(id) ON DELETE RESTRICT,
  CONSTRAINT fk_weekly_schedule_template FOREIGN KEY (session_template_id) REFERENCES session_template(id) ON DELETE RESTRICT,
  CONSTRAINT ck_weekday CHECK (weekday BETWEEN 1 AND 7)
) ENGINE=InnoDB;

CREATE TABLE program_change (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  program_id BIGINT UNSIGNED NOT NULL,
  changed_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  change_type VARCHAR(60) NOT NULL,
  old_value JSON NULL,
  new_value JSON NULL,
  PRIMARY KEY (id), KEY ix_program_change_date (program_id, changed_at),
  CONSTRAINT fk_program_change_program FOREIGN KEY (program_id) REFERENCES program(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE appointment (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  owner_user_id BIGINT UNSIGNED NOT NULL,
  session_version_id BIGINT UNSIGNED NOT NULL,
  program_id BIGINT UNSIGNED NULL,
  weekly_schedule_id BIGINT UNSIGNED NULL,
  initial_date DATE NULL,
  planned_date DATE NOT NULL,
  planned_time TIME NULL,
  moved_manually BOOLEAN NOT NULL DEFAULT FALSE,
  status ENUM('planned','to_confirm','missed','cancelled','attended') NOT NULL DEFAULT 'planned',
  cancelled_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id), KEY ix_appointment_calendar (owner_user_id,planned_date,planned_time),
  KEY ix_appointment_schedule (weekly_schedule_id,planned_date,status),
  CONSTRAINT fk_appointment_user FOREIGN KEY (owner_user_id) REFERENCES `user`(id) ON DELETE RESTRICT,
  CONSTRAINT fk_appointment_version FOREIGN KEY (session_version_id) REFERENCES session_version(id) ON DELETE RESTRICT,
  CONSTRAINT fk_appointment_program FOREIGN KEY (program_id) REFERENCES program(id) ON DELETE RESTRICT,
  CONSTRAINT fk_appointment_schedule FOREIGN KEY (weekly_schedule_id) REFERENCES weekly_schedule(id) ON DELETE RESTRICT,
  CONSTRAINT ck_appointment_schedule_program CHECK (weekly_schedule_id IS NULL OR program_id IS NOT NULL),
  CONSTRAINT ck_appointment_cancelled_at CHECK ((status = 'cancelled') = (cancelled_at IS NOT NULL))
) ENGINE=InnoDB;

CREATE TABLE workout_session (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  appointment_id BIGINT UNSIGNED NOT NULL,
  owner_user_id BIGINT UNSIGNED NOT NULL COMMENT 'Derived from appointment; must be checked for consistency',
  status ENUM('in_progress','completed','unfinished') NOT NULL,
  started_at DATETIME(3) NOT NULL COMMENT 'Actual training start time, may be declared retroactively',
  ended_at DATETIME(3) NULL,
  last_activity_at DATETIME(3) NOT NULL COMMENT 'Last confirmed user action, for 4-hour inactivity policy',
  comment TEXT NULL,
  auto_closed BOOLEAN NOT NULL DEFAULT FALSE,
  declared_afterwards BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  active_owner_user_id BIGINT UNSIGNED GENERATED ALWAYS AS (CASE WHEN status='in_progress' THEN owner_user_id ELSE NULL END) STORED,
  PRIMARY KEY (id), UNIQUE KEY uq_workout_appointment (appointment_id),
  UNIQUE KEY uq_one_active_workout_per_user (active_owner_user_id),
  KEY ix_workout_owner_history (owner_user_id,started_at),
  KEY ix_workout_inactivity (status,last_activity_at),
  CONSTRAINT fk_workout_appointment FOREIGN KEY (appointment_id) REFERENCES appointment(id) ON DELETE RESTRICT,
  CONSTRAINT fk_workout_user FOREIGN KEY (owner_user_id) REFERENCES `user`(id) ON DELETE RESTRICT,
  CONSTRAINT ck_workout_end CHECK (ended_at IS NULL OR ended_at >= started_at)
) ENGINE=InnoDB;

CREATE TABLE workout_block (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  workout_session_id BIGINT UNSIGNED NOT NULL,
  source_template_block_id BIGINT UNSIGNED NULL,
  block_type ENUM('classic','circuit','amrap','for_time','warm_up','stretching','challenge','note') NOT NULL,
  name VARCHAR(160) NULL,
  position SMALLINT UNSIGNED NOT NULL,
  planned_rounds SMALLINT UNSIGNED NULL,
  time_limit_seconds INT UNSIGNED NULL,
  instructions TEXT NULL,
  completed_rounds SMALLINT UNSIGNED NULL,
  extra_reps INT UNSIGNED NULL,
  actual_duration_seconds INT UNSIGNED NULL,
  PRIMARY KEY (id), UNIQUE KEY uq_workout_block_position (workout_session_id,position),
  CONSTRAINT fk_workout_block_session FOREIGN KEY (workout_session_id) REFERENCES workout_session(id) ON DELETE RESTRICT,
  CONSTRAINT fk_workout_block_source FOREIGN KEY (source_template_block_id) REFERENCES template_block(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE workout_exercise (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  workout_block_id BIGINT UNSIGNED NOT NULL,
  exercise_id BIGINT UNSIGNED NOT NULL,
  source_template_block_exercise_id BIGINT UNSIGNED NULL,
  position SMALLINT UNSIGNED NOT NULL,
  instructions TEXT NULL,
  default_rest_seconds INT UNSIGNED NULL,
  is_per_side BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Done left then right (US-51)',
  comment TEXT NULL,
  PRIMARY KEY (id), UNIQUE KEY uq_workout_exercise_position (workout_block_id,position),
  CONSTRAINT fk_workout_exercise_block FOREIGN KEY (workout_block_id) REFERENCES workout_block(id) ON DELETE RESTRICT,
  CONSTRAINT fk_workout_exercise_exercise FOREIGN KEY (exercise_id) REFERENCES exercise(id) ON DELETE RESTRICT,
  CONSTRAINT fk_workout_exercise_source FOREIGN KEY (source_template_block_exercise_id) REFERENCES template_block_exercise(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE workout_set (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  workout_exercise_id BIGINT UNSIGNED NOT NULL,
  source_planned_set_id BIGINT UNSIGNED NULL,
  position SMALLINT UNSIGNED NOT NULL,
  reps_planned INT UNSIGNED NULL, reps_actual INT UNSIGNED NULL,
  weight_planned_kg DECIMAL(9,3) NULL, weight_actual_kg DECIMAL(9,3) NULL,
  weight_left_planned_kg DECIMAL(9,3) NULL, weight_right_planned_kg DECIMAL(9,3) NULL,
  duration_planned_seconds INT UNSIGNED NULL, duration_actual_seconds INT UNSIGNED NULL,
  distance_planned_meters DECIMAL(12,3) NULL, distance_actual_meters DECIMAL(12,3) NULL,
  speed_planned_kmh DECIMAL(8,3) NULL, speed_actual_kmh DECIMAL(8,3) NULL,
  resistance_planned DECIMAL(9,3) NULL, resistance_actual DECIMAL(9,3) NULL,
  incline_planned_percent DECIMAL(6,2) NULL, incline_actual_percent DECIMAL(6,2) NULL,
  calories_planned DECIMAL(9,2) NULL, calories_actual DECIMAL(9,2) NULL,
  planned_rest_seconds INT UNSIGNED NULL,
  validated_at DATETIME(3) NULL,
  updated_at DATETIME(3) NULL COMMENT 'Set by the server only when a validated set is corrected (RM-049)',
  PRIMARY KEY (id), UNIQUE KEY uq_workout_set_position (workout_exercise_id,position),
  CONSTRAINT fk_workout_set_exercise FOREIGN KEY (workout_exercise_id) REFERENCES workout_exercise(id) ON DELETE RESTRICT,
  CONSTRAINT fk_workout_set_source FOREIGN KEY (source_planned_set_id) REFERENCES planned_set(id) ON DELETE RESTRICT,
  CONSTRAINT ck_workout_set_nonnegative CHECK ((weight_actual_kg IS NULL OR weight_actual_kg >= 0) AND (distance_actual_meters IS NULL OR distance_actual_meters >= 0) AND (calories_actual IS NULL OR calories_actual >= 0))
) ENGINE=InnoDB;

-- What was really done on each side of a per-side set (US-51, RM-044).
CREATE TABLE workout_set_side (
  workout_set_id BIGINT UNSIGNED NOT NULL,
  side ENUM('left','right') NOT NULL,
  reps_actual INT UNSIGNED NULL,
  weight_actual_kg DECIMAL(9,3) NULL,
  duration_actual_seconds INT UNSIGNED NULL,
  validated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NULL COMMENT 'Set when the side is corrected (US-37, RM-049)',
  PRIMARY KEY (workout_set_id, side),
  CONSTRAINT fk_workout_set_side_set FOREIGN KEY (workout_set_id) REFERENCES workout_set(id) ON DELETE RESTRICT,
  CONSTRAINT ck_workout_set_side_nonnegative CHECK (weight_actual_kg IS NULL OR weight_actual_kg >= 0)
) ENGINE=InnoDB;

CREATE TABLE notification (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  `type` ENUM('session_to_confirm','session_missed','program_finished','personal_record') NOT NULL,
  title VARCHAR(180) NOT NULL,
  message TEXT NULL,
  appointment_id BIGINT UNSIGNED NULL,
  program_id BIGINT UNSIGNED NULL,
  exercise_id BIGINT UNSIGNED NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  read_at DATETIME(3) NULL,
  appointment_notification_unique_id BIGINT UNSIGNED GENERATED ALWAYS AS (CASE WHEN `type` IN ('session_to_confirm','session_missed') THEN appointment_id ELSE NULL END) STORED,
  appointment_notification_unique_type VARCHAR(32) GENERATED ALWAYS AS (CASE WHEN `type` IN ('session_to_confirm','session_missed') THEN `type` ELSE NULL END) STORED,
  PRIMARY KEY (id), UNIQUE KEY uq_notification_appointment_type (appointment_notification_unique_id,appointment_notification_unique_type),
  KEY ix_notification_user_unread (user_id,read_at,created_at),
  CONSTRAINT fk_notification_user FOREIGN KEY (user_id) REFERENCES `user`(id) ON DELETE RESTRICT,
  CONSTRAINT fk_notification_appointment FOREIGN KEY (appointment_id) REFERENCES appointment(id) ON DELETE RESTRICT,
  CONSTRAINT fk_notification_program FOREIGN KEY (program_id) REFERENCES program(id) ON DELETE RESTRICT,
  CONSTRAINT fk_notification_exercise FOREIGN KEY (exercise_id) REFERENCES exercise(id) ON DELETE RESTRICT,
  CONSTRAINT ck_notification_appointment_required CHECK (`type` NOT IN ('session_to_confirm','session_missed') OR appointment_id IS NOT NULL)
) ENGINE=InnoDB;

-- APP/SERVICE CONSTRAINTS (cannot be expressed solely by the above foreign keys):
-- A. Owner consistency across program, schedule, template, appointment, workout_session, notification.
-- B. Every exercise must have >=1 primary muscle; every published exercise >=1 category and valid measures.
-- C. Template versions and their descendants are immutable once published.
-- D. For source links, parent chain must match (a workout_set source must belong to the same source workout_exercise chain).
-- E. On direct workout start lock user row (SELECT ... FOR UPDATE), validate appointment, create snapshots and update status atomically.
-- F. A 4-hour background job closes inactive in_progress sessions as unfinished; use compare-and-update with last_activity_at.
-- G. Account deletion must explicitly delete children in dependency order within one transaction; FK RESTRICT intentionally prevents accidental deletion.
-- H. Keep originals archived and immutable once used in realized sessions; derive UI measurement fields from exercise_measure.
-- I. Free appointments: program_id and weekly_schedule_id NULL; a manually added program appointment may have program_id but no weekly_schedule_id.
-- J. If a past missed appointment is declared attended, build the snapshot from its historical session_version_id.
