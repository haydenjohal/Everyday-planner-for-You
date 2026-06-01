/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { DayOfWeek, PlannerItem, PlannerItemType } from "../types";
import { SUBJECTS, WORKOUT_CATEGORIES } from "../data/initialData";
import { Calendar, Brain, Briefcase, Dumbbell, X, Save, Sparkles } from "lucide-react";

interface AddEditFormProps {
  itemToEdit?: PlannerItem | null;
  defaultDayOfWeek?: DayOfWeek;
  defaultStartTime?: string;
  defaultEndTime?: string;
  defaultDueDate?: string;
  onSave: (item: Omit<PlannerItem, "id"> & { id?: string }) => void;
  onCancel: () => void;
}

const DAYS_LIST: DayOfWeek[] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const CUSTOM_CATEGORIES_LIST = ["Concert", "Soccer Game", "Vacation", "Birthday", "Tournament", "Family Event", "Other"];

export const AddEditForm: React.FC<AddEditFormProps> = ({
  itemToEdit,
  defaultDayOfWeek = "Monday",
  defaultStartTime = "",
  defaultEndTime = "",
  defaultDueDate = "",
  onSave,
  onCancel
}) => {
  const [type, setType] = useState<PlannerItemType>("assignment");
  const [title, setTitle] = useState("");
  const [dayOfWeek, setDayOfWeek] = useState<DayOfWeek>(defaultDayOfWeek);
  
  // Time ranges
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  
  // Custom type attributes
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("");
  const [subject, setSubject] = useState("");
  const [employer, setEmployer] = useState("");
  const [workoutCategory, setWorkoutCategory] = useState("");
  const [customCategory, setCustomCategory] = useState("Birthday");
  const [notes, setNotes] = useState("");
  
  // Internal error state
  const [errorText, setErrorText] = useState("");

  // Sync state if form is requested to EDIT an existing item
  useEffect(() => {
    if (itemToEdit) {
      setType(itemToEdit.type);
      setTitle(itemToEdit.title);
      setDayOfWeek(itemToEdit.dayOfWeek);
      setStartTime(itemToEdit.startTime || "");
      setEndTime(itemToEdit.endTime || "");
      setPriority(itemToEdit.priority || "medium");
      setDueDate(itemToEdit.dueDate || "");
      setDueTime(itemToEdit.dueTime || "");
      setSubject(itemToEdit.subject || "");
      setEmployer(itemToEdit.employer || "");
      setWorkoutCategory(itemToEdit.workoutCategory || "");
      setCustomCategory(itemToEdit.customCategory || "Birthday");
      setNotes(itemToEdit.notes || "");
      setErrorText("");
    } else {
      // Keep selected default day from grid, reset everything else
      setTitle("");
      setDayOfWeek(defaultDayOfWeek);
      setStartTime(defaultStartTime);
      setEndTime(defaultEndTime);
      setPriority("medium");
      setDueDate(defaultDueDate);
      setDueTime("");
      setSubject("");
      setEmployer("");
      setWorkoutCategory("");
      setCustomCategory("Birthday");
      setNotes("");
      setErrorText("");
    }
  }, [itemToEdit, defaultDayOfWeek, defaultStartTime, defaultEndTime, defaultDueDate]);

  // Auto-calculate dayOfWeek from dueDate to keep scheduling solid
  useEffect(() => {
    if (dueDate) {
      const parts = dueDate.split("-").map(Number);
      if (parts.length === 3) {
        const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
        const dayNames: DayOfWeek[] = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        setDayOfWeek(dayNames[dateObj.getDay()]);
      }
    }
  }, [dueDate]);

  // Set default times or presets depending on tab transitions to make scheduling extremely rapid for a teenager
  const handleTypeChange = (newType: PlannerItemType) => {
    setType(newType);
    setErrorText("");
    if (newType === "assignment") {
      setStartTime("15:30");
      setEndTime("17:00");
      if (!subject) setSubject(SUBJECTS[0]);
    } else if (newType === "shift") {
      setStartTime("16:00");
      setEndTime("20:00");
    } else if (newType === "workout") {
      setStartTime("16:30");
      setEndTime("17:30");
      if (!workoutCategory) setWorkoutCategory(WORKOUT_CATEGORIES[0]);
    } else if (newType === "study") {
      setStartTime("19:00");
      setEndTime("21:00");
      if (!subject) setSubject(SUBJECTS[0]);
    } else if (newType === "custom") {
      setStartTime("18:00");
      setEndTime("20:00");
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText("");

    if (!title.trim()) {
      setErrorText("Oops! Please enter a name or title.");
      return;
    }

    // Time validation helper
    if (startTime && endTime) {
      const [startHrs, startMins] = startTime.split(":").map(Number);
      const [endHrs, endMins] = endTime.split(":").map(Number);
      const startTotal = startHrs * 60 + startMins;
      const endTotal = endHrs * 60 + endMins;
      
      if (endTotal <= startTotal) {
        setErrorText("Double check your times: the end time has to be after the start time!");
        return;
      }
    }

    const payload: Omit<PlannerItem, "id"> & { id?: string } = {
      ...(itemToEdit ? { id: itemToEdit.id } : {}),
      type,
      title: title.trim(),
      dayOfWeek,
      startTime: startTime || undefined,
      endTime: endTime || undefined,
      notes: notes.trim() || undefined,
      completed: itemToEdit ? itemToEdit.completed : false,
    };

    // Append specific metadata based on tab choice
    if (type === "assignment") {
      payload.priority = priority;
      payload.dueDate = dueDate || undefined;
      payload.dueTime = dueTime || undefined;
      payload.subject = subject || undefined;
    } else if (type === "shift") {
      payload.employer = employer.trim() || "Work";
    } else if (type === "workout") {
      payload.workoutCategory = workoutCategory || undefined;
    } else if (type === "study") {
      payload.subject = subject || undefined;
    } else if (type === "custom") {
      payload.customCategory = customCategory;
      payload.dueDate = dueDate || undefined;
      // Determine custom coloring matching the selected category
      let col = "rose";
      if (customCategory === "Concert") col = "indigo";
      else if (customCategory === "Soccer Game") col = "emerald";
      else if (customCategory === "Vacation") col = "amber";
      else if (customCategory === "Tournament") col = "sky";
      else if (customCategory === "Family Event") col = "teal";
      else if (customCategory === "Other") col = "slate";
      payload.customColor = col;
    }

    onSave(payload);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden max-w-lg w-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-200">
        <div>
          <h2 className="text-base font-bold text-slate-900 select-none">
            {itemToEdit ? "Edit Task" : "Schedule New Task"}
          </h2>
          <p className="text-xs text-slate-400 select-none">
            {itemToEdit ? "Modify properties and times below." : "Enter info and select a category page below."}
          </p>
        </div>
        <button
          id="close-add-form"
          onClick={onCancel}
          className="p-1 px-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition-colors"
          title="Cancel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto px-6 py-5 max-h-[75vh]" id="add-edit-planner-form">
        {/* Form tabs */}
        <div className="grid grid-cols-5 gap-1 p-1 rounded-xl bg-slate-100 mb-5 select-none">
          <button
            id="tab-select-assignment"
            type="button"
            onClick={() => handleTypeChange("assignment")}
            className={`flex flex-col items-center gap-1 py-1.5 rounded-lg text-[10px] font-semibold transition-all ${
              type === "assignment"
                ? "bg-white text-indigo-600 shadow-xs"
                : "text-slate-500 hover:bg-white/50 hover:text-slate-800"
            }`}
          >
            <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Homework</span>
          </button>
          
          <button
            id="tab-select-study"
            type="button"
            onClick={() => handleTypeChange("study")}
            className={`flex flex-col items-center gap-1 py-1.5 rounded-lg text-[10px] font-semibold transition-all ${
              type === "study"
                ? "bg-white text-amber-600 shadow-xs"
                : "text-slate-500 hover:bg-white/50 hover:text-slate-800"
            }`}
          >
            <Brain className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Study</span>
          </button>

          <button
            id="tab-select-shift"
            type="button"
            onClick={() => handleTypeChange("shift")}
            className={`flex flex-col items-center gap-1 py-1.5 rounded-lg text-[10px] font-semibold transition-all ${
              type === "shift"
                ? "bg-white text-emerald-600 shadow-xs"
                : "text-slate-500 hover:bg-white/50 hover:text-slate-800"
            }`}
          >
            <Briefcase className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Shift</span>
          </button>

          <button
            id="tab-select-workout"
            type="button"
            onClick={() => handleTypeChange("workout")}
            className={`flex flex-col items-center gap-1 py-1.5 rounded-lg text-[10px] font-semibold transition-all ${
              type === "workout"
                ? "bg-white text-rose-600 shadow-xs"
                : "text-slate-500 hover:bg-white/50 hover:text-slate-800"
            }`}
          >
            <Dumbbell className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Workout</span>
          </button>

          <button
            id="tab-select-custom"
            type="button"
            onClick={() => handleTypeChange("custom")}
            className={`flex flex-col items-center gap-1 py-1.5 rounded-lg text-[10px] font-semibold transition-all ${
              type === "custom"
                ? "bg-white text-rose-600 shadow-xs"
                : "text-slate-500 hover:bg-white/50 hover:text-slate-800"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Personal</span>
          </button>
        </div>

        {/* Global Item Title / Name Input */}
        <div className="mb-4">
          <label htmlFor="item-title-input" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            {type === "assignment" 
              ? "Homework Assignment / Paper Title" 
              : type === "shift" 
              ? "Shift Description (e.g. Morning Cast)" 
              : type === "workout" 
              ? "Workout Plan (e.g. 5K Run)" 
              : type === "custom"
              ? "Personal / Custom Event Name"
              : "Study Topic or Goal"}
          </label>
          <input
            id="item-title-input"
            type="text"
            placeholder={
              type === "assignment" 
                ? "e.g. Read Act 2 of Macbeth" 
                : type === "shift" 
                ? "e.g. Register 3 Support Shift" 
                : type === "workout" 
                ? "e.g. Chest & Triceps routine" 
                : type === "custom"
                ? "e.g. School Concert, Soccer Game, My Birthday"
                : "e.g. Practice Biology flashcards"
            }
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
            required
          />
        </div>

        {/* Day selection */}
        <div className="mb-4">
          <label htmlFor="item-day-select" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            Day Of Week
          </label>
          <select
            id="item-day-select"
            value={dayOfWeek}
            onChange={(e) => setDayOfWeek(e.target.value as DayOfWeek)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-900 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
          >
            {DAYS_LIST.map((day) => (
              <option key={day} value={day}>
                {day}
              </option>
            ))}
          </select>
        </div>

        {/* Direct Start and End Times */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label htmlFor="item-start-time" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Start Time
            </label>
            <input
              id="item-start-time"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono"
            />
          </div>
          <div>
            <label htmlFor="item-end-time" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              End Time
            </label>
            <input
              id="item-end-time"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono"
            />
          </div>
        </div>

        {/* TYPE SPECIFIC FIELDS */}

        {/* 1. Assignment specific input fields */}
        {type === "assignment" && (
          <div className="p-4 rounded-xl bg-indigo-50/40 border border-indigo-100/60 mb-4 animate-fade-in">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label htmlFor="assignment-subject" className="block text-xs font-bold text-indigo-950 uppercase tracking-wider mb-1">
                  School Subject
                </label>
                <select
                  id="assignment-subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-indigo-100 text-indigo-950 text-xs bg-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/10"
                >
                  {SUBJECTS.map((sub) => (
                    <option key={sub} value={sub}>
                      {sub}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-indigo-950 uppercase tracking-wider mb-1">
                  Priority level
                </label>
                <div className="grid grid-cols-3 gap-1 p-0.5 bg-slate-100 rounded-lg text-[11px] font-bold">
                  {(["low", "medium", "high"] as const).map((lvl) => (
                    <button
                      id={`priority-${lvl}`}
                      key={lvl}
                      type="button"
                      onClick={() => setPriority(lvl)}
                      className={`py-1 rounded-md text-center transition-all capitalize select-none ${
                        priority === lvl
                          ? lvl === "high"
                            ? "bg-rose-500 text-white shadow-xs"
                            : lvl === "medium"
                            ? "bg-amber-500 text-white shadow-xs"
                            : "bg-indigo-600 text-white shadow-xs"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="assignment-due-date" className="block text-xs font-bold text-indigo-900 uppercase tracking-wider mb-1">
                  Due Calendar Date
                </label>
                <input
                  id="assignment-due-date"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-indigo-150 text-slate-800 text-xs focus:outline-none bg-white"
                />
              </div>
              <div>
                <label htmlFor="assignment-due-time" className="block text-xs font-bold text-indigo-900 uppercase tracking-wider mb-1">
                  Due Time
                </label>
                <input
                  id="assignment-due-time"
                  type="time"
                  value={dueTime}
                  onChange={(e) => setDueTime(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-indigo-150 text-slate-800 text-xs focus:outline-none bg-white font-mono"
                />
              </div>
            </div>
          </div>
        )}

        {/* 2. Study block specific inputs */}
        {type === "study" && (
          <div className="p-4 rounded-xl bg-amber-50/40 border border-amber-100/60 mb-4">
            <div className="w-full">
              <label htmlFor="study-subject" className="block text-xs font-bold text-amber-950 uppercase tracking-wider mb-1">
                Subject to Study
              </label>
              <select
                id="study-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-amber-100 text-amber-950 text-xs bg-white font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/10"
              >
                {SUBJECTS.map((sub) => (
                  <option key={sub} value={sub}>
                    {sub}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* 3. Work Shift specific inputs */}
        {type === "shift" && (
          <div className="p-4 rounded-xl bg-emerald-50/45 border border-emerald-100/60 mb-4 animate-fade-in">
            <label htmlFor="shift-employer" className="block text-xs font-bold text-emerald-950 uppercase tracking-wider mb-1">
              Store / Employer
            </label>
            <input
              id="shift-employer"
              type="text"
              placeholder="e.g. Trader Joe's, Local Library, Soccer Club"
              value={employer}
              onChange={(e) => setEmployer(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-emerald-150 text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/10 bg-white"
            />
          </div>
        )}

        {/* 4. Workout specific inputs */}
        {type === "workout" && (
          <div className="p-4 rounded-xl bg-rose-50/40 border border-rose-100/60 mb-4 animate-fade-in">
            <label htmlFor="workout-category-select" className="block text-xs font-bold text-rose-950 uppercase tracking-wider mb-1">
              Exercise Category
            </label>
            <select
              id="workout-category-select"
              value={workoutCategory}
              onChange={(e) => setWorkoutCategory(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg border border-rose-100 text-rose-950 text-xs bg-white font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/10"
            >
              {WORKOUT_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* 5. Custom / Personal specific inputs */}
        {type === "custom" && (
          <div className="p-4 rounded-xl bg-pink-50/50 border border-pink-100/60 mb-4 animate-fade-in space-y-3">
            <div>
              <label htmlFor="custom-category-select" className="block text-xs font-bold text-pink-950 uppercase tracking-wider mb-1">
                Color / Category Theme
              </label>
              <select
                id="custom-category-select"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-pink-100 text-pink-955 text-xs bg-white font-medium focus:outline-none focus:ring-2 focus:ring-pink-500/10"
              >
                {CUSTOM_CATEGORIES_LIST.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="custom-due-date" className="block text-xs font-bold text-pink-950 uppercase tracking-wider mb-1">
                Calendar Event Date
              </label>
              <input
                id="custom-due-date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-pink-100 text-slate-800 text-xs focus:outline-none bg-white font-medium"
                required
              />
            </div>
          </div>
        )}

        {/* Global Notes */}
        <div className="mb-4">
          <label htmlFor="item-notes-text" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            Important details & reminders (Optional)
          </label>
          <textarea
            id="item-notes-text"
            rows={3}
            placeholder="Write down details, textbook numbers, study questions, locker checklist, etc."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
          />
        </div>

        {/* Warning error logs */}
        {errorText && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium mb-3 select-none flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping flex-shrink-0" />
            <span>{errorText}</span>
          </div>
        )}

        {/* Actions bar */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-5">
          <button
            id="cancel-add-form"
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 bg-slate-100/60 hover:bg-slate-100 rounded-xl transition-all"
          >
            Cancel
          </button>
          
          <button
            id="submit-add-form"
            type="submit"
            className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 rounded-xl shadow-xs hover:shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Schedule</span>
          </button>
        </div>
      </form>
    </div>
  );
};
