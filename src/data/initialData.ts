/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PlannerItem } from "../types";

export const INITIAL_PLANNER_ITEMS: PlannerItem[] = [
  {
    id: "init-1",
    type: "assignment",
    title: "Math Homework: Page 245 problems 1-15",
    dayOfWeek: "Monday",
    startTime: "15:30",
    endTime: "17:00",
    priority: "high",
    dueDate: "2026-06-03", // Wednesday
    dueTime: "11:59",
    subject: "Math",
    completed: false,
    notes: "Requires drawing coordinate planes and calculating gradients. Ask Sarah if stuck!"
  },
  {
    id: "init-2",
    type: "workout",
    title: "Core & Legs Gym Session",
    dayOfWeek: "Tuesday",
    startTime: "16:00",
    endTime: "17:30",
    workoutCategory: "Strength",
    notes: "Meet in school gym with coach. Remember hydration bottle!"
  },
  {
    id: "init-3",
    type: "study",
    title: "Chemistry Exam Prep",
    dayOfWeek: "Monday",
    startTime: "19:00",
    endTime: "21:00",
    subject: "Chemistry",
    notes: "Review periodic table groups, valence electrons, and basic bonding rules."
  },
  {
    id: "init-4",
    type: "shift",
    title: "Cashier Shift - Grocery Store",
    dayOfWeek: "Thursday",
    startTime: "16:00",
    endTime: "20:00",
    employer: "Trader Joe's",
    notes: "Wear uniform and nametag. Ask Manager Dave for roster update."
  },
  {
    id: "init-5",
    type: "assignment",
    title: "History Project Draft - Cold War",
    dayOfWeek: "Friday",
    startTime: "14:00",
    endTime: "15:30",
    priority: "medium",
    dueDate: "2026-06-05", // Friday
    dueTime: "17:00",
    subject: "History",
    completed: true,
    notes: "Outline key causes from alliance divisions post WWII. Already printed bibliography!"
  },
  {
    id: "init-6",
    type: "workout",
    title: "5K Trail Run & Stretching",
    dayOfWeek: "Friday",
    startTime: "16:30",
    endTime: "17:30",
    workoutCategory: "Cardio",
    notes: "Along the local park trail. Aim for 26 mins!"
  },
  {
    id: "init-7",
    type: "shift",
    title: "Weekend Shift - Grocery Store",
    dayOfWeek: "Saturday",
    startTime: "10:00",
    endTime: "15:00",
    employer: "Trader Joe's",
    notes: "Lunch break at 12:30."
  }
];

export const SUBJECTS = ["Math", "English", "Science", "Chemistry", "Biology", "Physics", "History", "Spanish", "Art", "Other"];
export const WORKOUT_CATEGORIES = ["Strength", "Cardio", "Yoga", "Flexibility", "Sport Practice", "Other"];
