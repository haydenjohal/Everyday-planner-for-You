/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

export type PlannerItemType = 'assignment' | 'shift' | 'workout' | 'study' | 'custom';

export interface PlannerItem {
  id: string;
  type: PlannerItemType;
  title: string;
  dayOfWeek: DayOfWeek;
  
  // Time fields
  startTime?: string; // "HH:MM" 24h format
  endTime?: string;   // "HH:MM" 24h format
  
  // Assignment specific
  priority?: 'low' | 'medium' | 'high';
  dueDate?: string;     // e.g. "2026-06-03"
  dueTime?: string;     // e.g. "23:59"
  subject?: string;     // e.g. "Math", "History", "Chemistry"
  completed?: boolean;
  
  // Work shift specific
  employer?: string;
  
  // Workout specfic
  workoutCategory?: string; // 'Strength' | 'Cardio' | 'Yoga' | 'Flexibility' | 'Sport'
  
  // Custom date specific
  customCategory?: string; // e.g. 'Concert', 'Soccer Game', 'Vacation', 'Birthday', 'Tournament', 'Family Event', 'Other'
  customColor?: string;    // CSS or Tailwind color class prefix
  
  notes?: string;
}

export interface Conflict {
  id: string;
  type: 'overlap' | 'heavy_day' | 'late_study' | 'general';
  severity: 'warning' | 'danger' | 'info';
  message: string;
  itemIds: string[]; // Planner items involved
}

export interface WeeklyInsight {
  mood: string;
  summary: string;
  tips: string[];
  suggestedSchedule?: {
    itemId: string;
    suggestedDay: DayOfWeek;
    reason: string;
  }[];
}

export interface AIResponse {
  insights: WeeklyInsight;
  conflicts: Conflict[];
}
