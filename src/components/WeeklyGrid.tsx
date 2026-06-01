/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Plus, Check, Trash2, Calendar, BookOpen, Briefcase, Dumbbell, Clock, X, AlertTriangle } from "lucide-react";
import { DayOfWeek, PlannerItem } from "../types";
import { PlannerItemCard } from "./PlannerItemCard";

interface WeeklyGridProps {
  items: PlannerItem[];
  onToggleComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (item: PlannerItem) => void;
  onDragMove: (itemId: string, targetDay: DayOfWeek) => void;
  onQuickAdd: (day: DayOfWeek) => void;
  conflicts: any[]; // List of conflicts to highlight
}

const WEEKDAYS: DayOfWeek[] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

// Helper to calculate the calendar dates (numbers + month) for the current week starting from Monday
interface CalendarDay {
  dayName: DayOfWeek;
  dateNumber: number;
  monthName: string;
  year: number;
  dateString: string;
}

const getCurrentWeekDays = (): CalendarDay[] => {
  const current = new Date();
  const currentDayIndex = current.getDay(); // 0 is Sunday, 1 is Monday...
  
  // Find distance to Monday (if currentDayIndex is 0 (Sunday), distance from Monday is -6 days)
  const distanceToMonday = currentDayIndex === 0 ? -6 : 1 - currentDayIndex;
  
  const monday = new Date();
  monday.setDate(current.getDate() + distanceToMonday);
  
  return WEEKDAYS.map((dayName, idx) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + idx);
    const y = d.getFullYear();
    const m = (d.getMonth() + 1).toString().padStart(2, "0");
    const dNum = d.getDate().toString().padStart(2, "0");
    return {
      dayName,
      dateNumber: d.getDate(),
      monthName: d.toLocaleString("default", { month: "short" }),
      year: y,
      dateString: `${y}-${m}-${dNum}`
    };
  });
};

export const WeeklyGrid: React.FC<WeeklyGridProps> = ({
  items,
  onToggleComplete,
  onDelete,
  onEdit,
  onDragMove,
  onQuickAdd,
  conflicts
}) => {
  // Simple state to track which day is hovered during external dragging
  const [dragOverDay, setDragOverDay] = useState<DayOfWeek | null>(null);
  const [selectedDayDetail, setSelectedDayDetail] = useState<DayOfWeek | null>(null);

  const weekDays = getCurrentWeekDays();

  const handleDragOver = (e: React.DragEvent, day: DayOfWeek) => {
    e.preventDefault();
    if (dragOverDay !== day) {
      setDragOverDay(day);
    }
  };

  const handleDragLeave = () => {
    setDragOverDay(null);
  };

  const handleDrop = (e: React.DragEvent, day: DayOfWeek) => {
    e.preventDefault();
    setDragOverDay(null);
    const itemId = e.dataTransfer.getData("text/plain");
    if (itemId) {
      onDragMove(itemId, day);
    }
  };

  // Convert time helper for sorting view
  const parseTimeToMinutes = (timeStr?: string): number | null => {
    if (!timeStr) return null;
    const parts = timeStr.split(":");
    if (parts.length < 2) return null;
    const hrs = parseInt(parts[0], 10);
    const mins = parseInt(parts[1], 10);
    return hrs * 60 + mins;
  };

  // Convert time string "HH:MM" to minutes for chronologically sorting the tasks list inside each day column
  const getSortScore = (item: PlannerItem) => {
    if (!item.startTime) return 9999; // Put all-day items at the end
    const mins = parseTimeToMinutes(item.startTime);
    return mins ?? 9999;
  };

  // Extract critical ids specifically linked in danger conflicts
  const conflictItemIds: string[] = [];
  conflicts.forEach(c => {
    if (c.severity === "danger" || c.severity === "warning") {
      conflictItemIds.push(...(c.itemIds || []));
    }
  });

  // Styles utility matching item models
  const getItemStyles = (item: PlannerItem) => {
    const isConflict = conflictItemIds.includes(item.id);

    if (item.completed) {
      return {
        bg: "bg-white border-slate-250 text-slate-400 opacity-60 line-through-xs",
        tagColor: "text-slate-400",
        label: "DONE",
        borderAccent: "border-l-2 border-l-slate-300",
        icon: <Check className="w-3 h-3 text-slate-400" />
      };
    }

    if (isConflict) {
      return {
        bg: "bg-red-50 border-red-200 text-red-950",
        tagColor: "text-red-500 font-bold",
        label: "CONFLICT",
        borderAccent: "border-l-4 border-l-red-500 shadow-sm shadow-red-100",
        icon: <Clock className="w-3 h-3 text-red-500 animate-pulse" />
      };
    }

    switch (item.type) {
      case "assignment":
        return {
          bg: "bg-indigo-50 border-indigo-100 text-indigo-950 hover:bg-indigo-100/50",
          tagColor: "text-indigo-650 font-bold",
          label: "SCHOOL",
          borderAccent: "border-l-3 border-l-indigo-500",
          icon: <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
        };
      case "shift":
        return {
          bg: "bg-amber-50 border-amber-100 text-amber-950 hover:bg-amber-100/50",
          tagColor: "text-amber-600 font-bold",
          label: "WORK",
          borderAccent: "border-l-3 border-l-amber-500",
          icon: <Briefcase className="w-3.5 h-3.5 text-amber-500" />
        };
      case "workout":
        return {
          bg: "bg-emerald-50 border-emerald-100 text-emerald-950 hover:bg-emerald-100/50",
          tagColor: "text-emerald-600 font-bold",
          label: "FITNESS",
          borderAccent: "border-l-3 border-l-emerald-500",
          icon: <Dumbbell className="w-3.5 h-3.5 text-emerald-500" />
        };
      case "study":
        return {
          bg: "bg-indigo-50/40 border-indigo-100/60 text-slate-800 hover:bg-indigo-50/50",
          tagColor: "text-indigo-500 font-bold",
          label: "STUDY",
          borderAccent: "border-l-3 border-l-indigo-400",
          icon: <Clock className="w-3.5 h-3.5 text-indigo-400" />
        };
      case "custom": {
        let label = (item.customCategory || "Personal").toUpperCase();
        let bg = "bg-rose-50 border-rose-100 text-rose-955 hover:bg-rose-100/50";
        let textCol = "text-rose-600 font-bold";
        let borderAccent = "border-l-3 border-l-rose-500";
        if (item.customCategory === "Concert") {
          bg = "bg-indigo-50 border-indigo-150 text-indigo-950 hover:bg-indigo-100/50";
          textCol = "text-indigo-650 font-bold";
          borderAccent = "border-l-3 border-l-indigo-500";
        } else if (item.customCategory === "Soccer Game") {
          bg = "bg-emerald-50 border-emerald-150 text-emerald-950 hover:bg-emerald-100/50";
          textCol = "text-emerald-600 font-bold";
          borderAccent = "border-l-3 border-l-emerald-500";
        } else if (item.customCategory === "Vacation") {
          bg = "bg-amber-50 border-amber-150 text-amber-955 hover:bg-amber-100/50";
          textCol = "text-amber-600 font-bold";
          borderAccent = "border-l-3 border-l-amber-500";
        } else if (item.customCategory === "Tournament") {
          bg = "bg-sky-50 border-sky-150 text-sky-950 hover:bg-sky-100/50";
          textCol = "text-sky-650 font-bold";
          borderAccent = "border-l-3 border-l-sky-500";
        } else if (item.customCategory === "Family Event") {
          bg = "bg-teal-50 border-teal-150 text-teal-955 hover:bg-teal-100/50";
          textCol = "text-teal-600 font-bold";
          borderAccent = "border-l-3 border-l-teal-500";
        } else if (item.customCategory === "Other") {
          bg = "bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100/50";
          textCol = "text-slate-500 font-bold";
          borderAccent = "border-l-3 border-l-slate-400";
        }
        return {
          bg,
          tagColor: textCol,
          label,
          borderAccent,
          icon: <Calendar className="w-3.5 h-3.5 text-rose-550" />
        };
      }
      default:
        return {
          bg: "bg-white border-slate-200 text-slate-800",
          tagColor: "text-slate-400",
          label: "TASK",
          borderAccent: "border-l-2 border-l-slate-400",
          icon: <Calendar className="w-3.5 h-3.5 text-slate-400" />
        };
    }
  };

  // Retrieve current selected day details for modal
  const selectedDayInfo = selectedDayDetail ? weekDays.find(wd => wd.dayName === selectedDayDetail) : null;
  const filteredItemsForSelectedDetail = selectedDayInfo 
    ? items.filter((item) => {
        if (item.dueDate) {
          return item.dueDate === selectedDayInfo.dateString;
        }
        return item.dayOfWeek === selectedDayInfo.dayName;
      }).sort((a, b) => getSortScore(a) - getSortScore(b))
    : [];

  const conflictsForSelectedDetail = selectedDayDetail
    ? conflicts.filter(c => {
        const itemIdsInDay = filteredItemsForSelectedDetail.map(it => it.id);
        return c.itemIds?.some((id: string) => itemIdsInDay.includes(id)) || c.id.includes(selectedDayDetail);
      })
    : [];

  return (
    <div className="relative">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4 min-h-[450px]">
        {weekDays.map(({ dayName, dateNumber, monthName, dateString }) => {
          // Filter items for this specific day
          const dayItems = items
            .filter((item) => {
              if (item.dueDate) {
                return item.dueDate === dateString;
              }
              return item.dayOfWeek === dayName;
            })
            .sort((a, b) => getSortScore(a) - getSortScore(b));

          // Find conflicts affecting this day as a whole
          const dayConflicts = conflicts.filter((c) => {
            const itemIdsInDay = dayItems.map(it => it.id);
            return c.itemIds?.some((id: string) => itemIdsInDay.includes(id)) || c.id.includes(dayName);
          });

          const hasDangerConflict = dayConflicts.some(c => c.severity === "danger");
          const dayAbbr = dayName.substring(0, 3);
          const isToday = new Date().getDate() === dateNumber && new Date().getMonth() === new Date().getMonth();

            return (
              <div
                id={`column-day-${dayName}`}
                key={dayName}
                onDragOver={(e) => handleDragOver(e, dayName)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, dayName)}
                className={`flex flex-col h-full rounded-2xl transition-all duration-200 outline-none p-2 bg-white border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.01)] ${
                  dragOverDay === dayName
                    ? "bg-indigo-50/50 border-2 border-dashed border-indigo-400 ring-4 ring-indigo-50 scale-[1.01]"
                    : ""
                }`}
              >
                {/* Advanced Compact Day Header */}
                <div className="flex items-center justify-between px-1.5 py-1 mb-2.5 relative group">
                  <div 
                    onClick={() => setSelectedDayDetail(dayName)}
                    className="flex items-center gap-2 cursor-pointer py-1 px-1.5 rounded-lg hover:bg-slate-50 transition-all text-left select-none"
                    title={`Click to view details for ${dayName}`}
                  >
                    <span className={`text-base font-extrabold tracking-tight ${
                      isToday ? "text-indigo-600" : "text-slate-800"
                    }`}>
                      {dateNumber}
                    </span>
                    <div className="flex flex-col">
                      <span className="text-[11px] font-bold text-slate-850 leading-none">{dayName}</span>
                      <span className="text-[9px] font-semibold text-slate-400 mt-0.5">{monthName}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 select-none">
                    {dayItems.length > 0 && (
                      <span className="text-[9px] font-mono font-bold bg-slate-50 border border-slate-100 text-slate-505 px-1.5 py-0.5 rounded-md">
                        {dayItems.length}
                      </span>
                    )}

                    {dayConflicts.length > 0 && (
                      <div 
                        className={`w-1.5 h-1.5 rounded-full ${hasDangerConflict ? "bg-rose-500" : "bg-amber-500"} animate-pulse`}
                        title={`${dayConflicts.length} conflict alerts!`}
                      />
                    )}

                    <button
                      id={`quick-add-${dayName}`}
                      onClick={() => onQuickAdd(dayName)}
                      className="p-1 rounded text-slate-400 hover:text-indigo-650 hover:bg-slate-50 transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                      title={`Quick add to ${dayName}`}
                    >
                      <Plus className="w-3 shrink-0" />
                    </button>
                  </div>
                </div>

                {/* List block */}
                <div className="flex-1 flex flex-col gap-2 min-h-[350px] overflow-y-auto pb-3 scrollbar-thin">
                  {dayItems.length > 0 ? (
                    <>
                      {dayItems.map((item) => (
                        <PlannerItemCard
                          key={item.id}
                          item={item}
                          onToggleComplete={onToggleComplete}
                          onDelete={onDelete}
                          onEdit={onEdit}
                          highlightedIds={conflictItemIds}
                        />
                      ))}
                      {/* Subtle column plus block inline at bottom to make operations organic */}
                      <button
                        id={`quick-add-column-bottom-${dayName}`}
                        onClick={() => onQuickAdd(dayName)}
                        className="py-1.5 border border-dashed border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/20 rounded-xl text-[10px] font-bold text-slate-400 hover:text-indigo-600 transition-all cursor-pointer text-center select-none"
                      >
                        + Add Task
                      </button>
                    </>
                  ) : (
                    /* Elegant minimalist "Quiet Day" slot */
                    <div 
                      onClick={() => onQuickAdd(dayName)}
                      className="flex-1 min-h-[180px] rounded-xl border border-dashed border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/10 flex flex-col items-center justify-center p-3 cursor-pointer group transition-all"
                    >
                      <span className="text-[10px] font-bold text-slate-300 group-hover:text-indigo-500 uppercase tracking-widest select-none">
                        Quiet Day
                      </span>
                      <Plus className="w-3.5 h-3.5 text-slate-3 w group-hover:text-indigo-500 mt-1 transition-colors" />
                    </div>
                  )}
                </div>
              </div>
            );
        })}
      </div>

      {/* POPUP OVERLAY DRAWER FOR "EVERYTHING I DO IN THAT DAY" */}
      {selectedDayDetail && selectedDayInfo && (
        <div 
          id="columns-day-inspection-overlay"
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex justify-end z-[80] transition-all"
          onClick={() => setSelectedDayDetail(null)}
        >
          {/* Drawer slide-out container */}
          <div 
            className="w-full max-w-[440px] bg-white h-full shadow-2xl flex flex-col p-6 animate-slide-left relative overflow-hidden" 
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header section representing Date Info */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4 mb-4">
              <div>
                <span className="text-[10px] font-bold text-indigo-650 uppercase tracking-widest font-mono">
                  Day Inspection Overview
                </span>
                <h3 className="text-xl font-extrabold text-slate-800 tracking-tight mt-1 flex items-center gap-2">
                  <span>{selectedDayInfo.dayName}</span>
                  <span className="bg-slate-100 text-slate-700 text-sm font-extrabold px-2.5 py-1 rounded-full border border-slate-200">
                    {selectedDayInfo.monthName} {selectedDayInfo.dateNumber}
                  </span>
                </h3>
              </div>
              <button 
                id="close-day-inspection"
                onClick={() => setSelectedDayDetail(null)}
                className="p-1.5 rounded-lg text-slate-450 hover:text-slate-750 hover:bg-slate-100 transition-all cursor-pointer"
                title="Close day details"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Daily stats summary / alert counts */}
            <div className="flex items-center gap-3 mb-4 select-none">
              <span className="text-xs text-slate-500 font-medium">
                Total Activities: <strong className="text-slate-800 font-bold">{filteredItemsForSelectedDetail.length}</strong>
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-slate-350" />
              <span className="text-xs text-slate-500 font-medium">
                Completed: <strong className="text-slate-800 font-bold">{filteredItemsForSelectedDetail.filter(i => i.completed).length}</strong>
              </span>
            </div>

            {/* Warners / High-contrast day warning conflicts */}
            {conflictsForSelectedDetail.length > 0 && (
              <div className="mb-4 space-y-2 select-none">
                {conflictsForSelectedDetail.map((c, i) => (
                  <div 
                    key={i} 
                    className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs ${
                      c.severity === "danger" 
                        ? "bg-red-50 text-red-900 border-red-200" 
                        : "bg-amber-50 text-amber-900 border-amber-200"
                    }`}
                  >
                    <AlertTriangle className={`w-4 h-4 mt-0.5 shrink-0 ${
                      c.severity === "danger" ? "text-red-600 animate-bounce" : "text-amber-500"
                    }`} />
                    <p className="font-medium leading-relaxed">{c.message}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Main Activities Feed List */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-3 mb-6 scrollbar-thin">
              {filteredItemsForSelectedDetail.length > 0 ? (
                filteredItemsForSelectedDetail.map((item) => {
                  const style = getItemStyles(item);
                  return (
                    <div 
                      key={item.id}
                      className={`p-3.5 rounded-2xl border transition-all hover:shadow-xs group/item ${style.bg} ${style.borderAccent} flex gap-3`}
                      onClick={() => onEdit(item)}
                    >
                      {/* Left circular complete button */}
                      <button 
                        id={`modal-complete-${item.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleComplete(item.id);
                        }}
                        className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 cursor-pointer mt-0.5 transition-all ${
                          item.completed 
                            ? "bg-indigo-600 border-indigo-600 text-white" 
                            : "bg-white border-slate-300 hover:border-indigo-500"
                        }`}
                        title={item.completed ? "Mark Incomplete" : "Mark Completed"}
                      >
                        {item.completed && <Check className="w-3 h-3 stroke-[3.5]" />}
                      </button>

                      {/* Content block */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`text-[8.5px] font-extrabold uppercase tracking-wider ${style.tagColor}`}>
                            {style.label}
                          </span>
                          {item.priority === "high" && !item.completed && (
                            <span className="bg-red-100 text-red-800 font-bold text-[8px] px-1.5 rounded-full animate-pulse">
                              HIGH PRIORITY
                            </span>
                          )}
                        </div>
                        <h4 className={`text-sm font-bold truncate mt-1 ${
                          item.completed ? "line-through text-slate-400 font-medium" : "text-slate-900 font-sans"
                        }`}>
                          {item.title}
                        </h4>

                        {/* Extra descriptors */}
                        <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-slate-500">
                          {/* Duration */}
                          <span className="flex items-center gap-1 font-mono font-bold bg-slate-100 px-1.5 py-0.5 rounded-md text-[10.5px]">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {item.startTime ? `${item.startTime} - ${item.endTime || "??:??"}` : "Untimed / All Day"}
                          </span>

                          {/* Category indicators */}
                          {item.subject && (
                            <span className="text-indigo-600 font-semibold">• {item.subject}</span>
                          )}
                          {item.employer && (
                            <span className="text-amber-600 font-semibold">• Job / @{item.employer}</span>
                          )}
                          {item.workoutCategory && (
                            <span className="text-emerald-600 font-semibold">• {item.workoutCategory}</span>
                          )}
                        </div>

                        {/* Notes snippet view */}
                        {item.notes && (
                          <p className="text-xs text-slate-400 mt-2 bg-slate-50/5 p-1.5 rounded-lg border border-slate-100 line-clamp-2 italic">
                            "{item.notes}"
                          </p>
                        )}
                      </div>

                      {/* Right column: Action utilities */}
                      <div className="flex flex-col gap-1.5 justify-center opacity-0 group-hover/item:opacity-100 transition-opacity">
                        <button
                          id={`modal-edit-${item.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onEdit(item);
                          }}
                          className="p-1 rounded-md text-slate-455 hover:text-indigo-600 hover:bg-slate-100 transition-colors cursor-pointer"
                          title="Edit Task"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        <button
                          id={`modal-delete-${item.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(item.id);
                          }}
                          className="p-1 rounded-md text-slate-455 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Delete Task"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-slate-150 rounded-2xl bg-slate-50/50 select-none">
                  <span className="text-4xl">🌤️</span>
                  <h5 className="text-sm font-bold text-slate-700 mt-3">Nothing Planned Yet</h5>
                  <p className="text-xs text-slate-400 text-center max-w-[240px] mt-1 leading-normal">
                    This day is completely clear! Take it easy or schedule some light studies or activities below.
                  </p>
                </div>
              )}
            </div>

            {/* Quick add triggers footer layout inside sidebar */}
            <div className="mt-auto pt-4 border-t border-slate-100 grid grid-cols-2 gap-2">
              <button
                id="modal-quick-add-time"
                onClick={() => {
                  onQuickAdd(selectedDayDetail);
                  setSelectedDayDetail(null);
                }}
                className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold py-3 px-4 rounded-xl transition-all cursor-pointer text-center flex items-center justify-center gap-1 leading-none shadow-3xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Timed Task</span>
              </button>

              <button
                id="modal-quick-add-all-day"
                onClick={() => {
                  onQuickAdd(selectedDayDetail);
                  setSelectedDayDetail(null);
                }}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-3 px-4 rounded-xl transition-all cursor-pointer text-center flex items-center justify-center gap-1 leading-none shadow-3xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Untimed / All Day</span>
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
