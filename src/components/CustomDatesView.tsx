/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { DayOfWeek, PlannerItem } from "../types";
import { Sparkles, Calendar, Clock, Plus, Trash2, Edit2, Check, AlertCircle } from "lucide-react";

interface CustomDatesViewProps {
  items: PlannerItem[];
  onSave: (item: Omit<PlannerItem, "id"> & { id?: string }) => void;
  onDelete: (id: string) => void;
}

const CUSTOM_CATEGORIES_THEMES = [
  { name: "Concert", color: "indigo" },
  { name: "Soccer Game", color: "emerald" },
  { name: "Vacation", color: "amber" },
  { name: "Birthday", color: "rose" },
  { name: "Tournament", color: "sky" },
  { name: "Family Event", color: "teal" },
  { name: "Other", color: "slate" }
];

export const CustomDatesView: React.FC<CustomDatesViewProps> = ({
  items,
  onSave,
  onDelete
}) => {
  const customItems = items.filter(it => it.type === "custom");

  // Form states
  const [editingItem, setEditingItem] = useState<PlannerItem | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Birthday");
  const [dueDate, setDueDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [notes, setNotes] = useState("");
  const [customColor, setCustomColor] = useState("rose");
  const [errorText, setErrorText] = useState("");

  // Update states if editingItem changes
  useEffect(() => {
    if (editingItem) {
      setTitle(editingItem.title);
      setCategory(editingItem.customCategory || "Birthday");
      setDueDate(editingItem.dueDate || "");
      setStartTime(editingItem.startTime || "");
      setEndTime(editingItem.endTime || "");
      setNotes(editingItem.notes || "");
      setCustomColor(editingItem.customColor || "rose");
    } else {
      resetForm();
    }
  }, [editingItem]);

  // Handle color preset when category increases
  useEffect(() => {
    if (!editingItem) {
      const matched = CUSTOM_CATEGORIES_THEMES.find(ct => ct.name === category);
      if (matched) {
        setCustomColor(matched.color);
      }
    }
  }, [category, editingItem]);

  const resetForm = () => {
    setTitle("");
    setCategory("Birthday");
    setDueDate("");
    setStartTime("");
    setEndTime("");
    setNotes("");
    setCustomColor("rose");
    setErrorText("");
    setEditingItem(null);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText("");

    if (!title.trim()) {
      setErrorText("Please enter a title or description!");
      return;
    }
    if (!dueDate) {
      setErrorText("Please select a specific calendar date!");
      return;
    }

    // Determine dayOfWeek name based on selected date
    let dayOfWeek: DayOfWeek = "Monday";
    const parts = dueDate.split("-").map(Number);
    if (parts.length === 3) {
      const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
      const dayNames: DayOfWeek[] = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      dayOfWeek = dayNames[dateObj.getDay()];
    }

    // Time inputs validation
    if (startTime && endTime) {
      const [startHrs, startMins] = startTime.split(":").map(Number);
      const [endHrs, endMins] = endTime.split(":").map(Number);
      const startTotal = startHrs * 60 + startMins;
      const endTotal = endHrs * 60 + endMins;
      
      if (endTotal <= startTotal) {
        setErrorText("The end time must be after the start time!");
        return;
      }
    }

    const payload: Omit<PlannerItem, "id"> & { id?: string } = {
      ...(editingItem ? { id: editingItem.id, completed: editingItem.completed } : { completed: false }),
      type: "custom",
      title: title.trim(),
      dayOfWeek,
      dueDate,
      startTime: startTime || undefined,
      endTime: endTime || undefined,
      notes: notes.trim() || undefined,
      customCategory: category,
      customColor: customColor
    };

    onSave(payload);
    resetForm();
  };

  const getColorClasses = (color: string) => {
    switch (color) {
      case "indigo": 
        return {
          bg: "bg-indigo-50 border-indigo-100 text-indigo-950",
          tag: "bg-indigo-500",
          border: "border-l-4 border-l-indigo-500"
        };
      case "emerald":
        return {
          bg: "bg-emerald-50 border-emerald-100 text-emerald-950",
          tag: "bg-emerald-500",
          border: "border-l-4 border-l-emerald-500"
        };
      case "amber":
        return {
          bg: "bg-amber-50 border-amber-100 text-amber-955",
          tag: "bg-amber-500",
          border: "border-l-4 border-l-amber-500"
        };
      case "sky":
        return {
          bg: "bg-sky-50 border-sky-100 text-sky-950",
          tag: "bg-sky-500",
          border: "border-l-4 border-l-sky-500"
        };
      case "teal":
        return {
          bg: "bg-teal-50 border-teal-100 text-teal-955",
          tag: "bg-teal-500",
          border: "border-l-4 border-l-teal-500"
        };
      case "slate":
        return {
          bg: "bg-slate-50 border-slate-205 text-slate-800",
          tag: "bg-slate-500",
          border: "border-l-4 border-l-slate-400"
        };
      case "rose":
      default:
        return {
          bg: "bg-rose-50 border-rose-100 text-rose-955",
          tag: "bg-rose-500",
          border: "border-l-4 border-l-rose-500"
        };
    }
  };

  return (
    <div className="w-full flex flex-col gap-6" id="custom-dates-tab-section">
      <div className="flex items-center justify-between select-none">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-rose-500" />
            <span>Custom Dates & Milestones</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Map out key milestones like concerts, tournament matchdays, vacations, and family gatherings.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form panel */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col h-fit">
          <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3 select-none flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-rose-500" />
            <span>{editingItem ? "Edit Custom Event" : "Create Custom Event"}</span>
          </h3>

          <form onSubmit={handleFormSubmit} className="mt-4 space-y-4">
            <div>
              <label htmlFor="custom-event-title" className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">
                Event Title / What you are doing
              </label>
              <input
                id="custom-event-title"
                type="text"
                placeholder="e.g. Coldplay Concert, Soccer Finals, Dad's Birthday"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-900"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="custom-event-category" className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">
                  Category
                </label>
                <select
                  id="custom-event-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none bg-white text-slate-800"
                >
                  {CUSTOM_CATEGORIES_THEMES.map(ct => (
                    <option key={ct.name} value={ct.name}>
                      {ct.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="custom-event-date" className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">
                  Calendar Date
                </label>
                <input
                  id="custom-event-date"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none bg-white text-slate-850 font-medium"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="custom-event-start-time" className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">
                  Start Time (Optional)
                </label>
                <input
                  id="custom-event-start-time"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label htmlFor="custom-event-end-time" className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">
                  End Time (Optional)
                </label>
                <input
                  id="custom-event-end-time"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none font-mono"
                />
              </div>
            </div>

            <div>
              <label htmlFor="custom-color-select" className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">
                Customize Card Theme Color
              </label>
              <div className="flex items-center gap-2 mt-1" id="custom-color-select">
                {CUSTOM_CATEGORIES_THEMES.map(t => (
                  <button
                    key={t.color}
                    type="button"
                    onClick={() => setCustomColor(t.color)}
                    className={`w-6 h-6 rounded-full transition-all border-2 flex items-center justify-center ${
                      customColor === t.color ? "border-slate-800 scale-110 shadow-xs" : "border-transparent"
                    } ${
                      t.color === "indigo" ? "bg-indigo-500" :
                      t.color === "emerald" ? "bg-emerald-500" :
                      t.color === "amber" ? "bg-amber-500" :
                      t.color === "rose" ? "bg-rose-500" :
                      t.color === "sky" ? "bg-sky-500" :
                      t.color === "teal" ? "bg-teal-500" : "bg-slate-500"
                    }`}
                    title={t.name}
                  >
                    {customColor === t.color && <Check className="w-3" />}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="custom-event-notes" className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">
                Event Details / Notes (Optional)
              </label>
              <textarea
                id="custom-event-notes"
                rows={2}
                placeholder="Locker combinations, travel directions, checklist reminders..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-900"
              />
            </div>

            {errorText && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-150 text-rose-800 text-xs font-semibold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{errorText}</span>
              </div>
            )}

            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
              {editingItem && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 py-2 text-xs font-bold text-slate-550 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                className="flex-[2] py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{editingItem ? "Save Changes" : "Record Event"}</span>
              </button>
            </div>
          </form>
        </div>

        {/* List panel */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center select-none">
            <h4 className="text-xs font-bold tracking-wider text-slate-400 uppercase">
              Schedule Milestones ({customItems.length})
            </h4>
          </div>

          {customItems.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {customItems.map((item) => {
                const colors = getColorClasses(item.customColor || "rose");
                
                // Format display date beautiful
                let displayDate = item.dueDate || item.dayOfWeek;
                if (item.dueDate) {
                  const parts = item.dueDate.split("-").map(Number);
                  if (parts.length === 3) {
                    const dobj = new Date(parts[0], parts[1] - 1, parts[2]);
                    displayDate = dobj.toLocaleString("default", { month: "short", day: "numeric", year: "numeric" });
                  }
                }

                return (
                  <div
                    key={item.id}
                    className={`p-4 rounded-2xl bg-white border border-slate-200 shadow-3xs flex flex-col justify-between hover:shadow-2xs transition-all duration-200 ${colors.border}`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className={`text-[9px] font-serif font-black px-2 py-0.5 rounded-full text-white ${colors.tag}`}>
                          {(item.customCategory || "Personal").toUpperCase()}
                        </span>
                        
                        <div className="flex items-center gap-1 opacity-60 hover:opacity-100 transition-opacity">
                          <button
                            id={`custom-edit-${item.id}`}
                            onClick={() => setEditingItem(item)}
                            className="p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
                            title="Edit Event"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            id={`custom-delete-${item.id}`}
                            onClick={() => onDelete(item.id)}
                            className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Delete Event"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <h4 className="text-sm font-extrabold text-slate-900 tracking-tight mt-2">{item.title}</h4>
                      
                      <div className="flex flex-col gap-1.5 mt-3 text-[11px] text-slate-500 font-medium font-sans">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{displayDate} <span className="text-slate-400 font-normal">({item.dayOfWeek})</span></span>
                        </span>

                        {item.startTime && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>{item.startTime} {item.endTime ? `- ${item.endTime}` : ""}</span>
                          </span>
                        )}
                      </div>

                      {item.notes && (
                        <p className="mt-3 text-xs text-slate-450 italic bg-slate-550/5 p-2 rounded-lg border border-slate-100">
                          "{item.notes}"
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-150 rounded-2xl py-12 px-6 flex flex-col items-center justify-center text-center select-none">
              <span className="text-3xl">🎸</span>
              <h5 className="text-sm font-bold text-slate-700 mt-2 select-none">No Custom Milestones Set</h5>
              <p className="text-xs text-slate-400 max-w-[280px] mt-1 select-none leading-normal">
                You haven't blocked out any big dates yet like concerts, game days, and trips. Add one using the form on the left!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
