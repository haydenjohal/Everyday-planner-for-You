/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Check, 
  Trash2, 
  Calendar, 
  BookOpen, 
  Briefcase, 
  Dumbbell, 
  Clock, 
  X, 
  AlertTriangle,
  Play,
  Sparkles
} from "lucide-react";
import { DayOfWeek, PlannerItem } from "../types";

interface CalendarViewProps {
  items: PlannerItem[];
  onToggleComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (item: PlannerItem) => void;
  onDragMoveWithTime: (itemId: string, targetDay: DayOfWeek, startTime?: string) => void;
  onQuickAddWithTime: (day: DayOfWeek, time?: string, dueDate?: string) => void;
  conflicts: any[];
}

const WEEKDAYS: DayOfWeek[] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export const CalendarView: React.FC<CalendarViewProps> = ({
  items,
  onToggleComplete,
  onDelete,
  onEdit,
  onDragMoveWithTime,
  onQuickAddWithTime,
  conflicts
}) => {
  // Store currently viewed month (defaults to June 2026 based on the 2026-06-01 system environment setting)
  const [currentDate, setCurrentDate] = useState<Date>(new Date(2026, 5, 1));
  const [selectedDayDetail, setSelectedDayDetail] = useState<{
    date: Date;
    dateString: string;
    dayName: DayOfWeek;
  } | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Helper date generators
  const checkIfToday = (date: Date): boolean => {
    // Exact match to system date June 1, 2026
    return date.getFullYear() === 2026 && date.getMonth() === 5 && date.getDate() === 1;
  };

  const formatDateString = (date: Date): string => {
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, "0");
    const d = date.getDate().toString().padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const getDayOfWeekName = (date: Date): DayOfWeek => {
    const days: DayOfWeek[] = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return days[date.getDay()];
  };

  // Pre-calculate full calendar cells array to match a 7x5 or 7x6 monthly grid
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const totalDaysInMonth = lastDayOfMonth.getDate();

  // Alignment shift for Monday as Column 1 instead of Sunday
  // firstDayOfMonth.getDay() -> 0 for Sunday, 1 for Monday, etc.
  const firstDayOffset = firstDayOfMonth.getDay() === 0 ? 6 : firstDayOfMonth.getDay() - 1;

  const cells: {
    date: Date;
    isCurrentMonth: boolean;
    isToday: boolean;
    dateString: string;
    dayName: DayOfWeek;
  }[] = [];

  // 1. Padding previous month days
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = firstDayOffset - 1; i >= 0; i--) {
    const prevDate = new Date(year, month - 1, prevMonthLastDay - i);
    cells.push({
      date: prevDate,
      isCurrentMonth: false,
      isToday: checkIfToday(prevDate),
      dateString: formatDateString(prevDate),
      dayName: getDayOfWeekName(prevDate),
    });
  }

  // 2. Current month days
  for (let d = 1; d <= totalDaysInMonth; d++) {
    const currDate = new Date(year, month, d);
    cells.push({
      date: currDate,
      isCurrentMonth: true,
      isToday: checkIfToday(currDate),
      dateString: formatDateString(currDate),
      dayName: getDayOfWeekName(currDate),
    });
  }

  // 3. Padding next month days to complete grid structure
  const totalCellsCount = cells.length % 7 === 0 ? cells.length : Math.ceil(cells.length / 7) * 7;
  const nextMonthDaysNeeded = totalCellsCount - cells.length;
  for (let i = 1; i <= nextMonthDaysNeeded; i++) {
    const nextDate = new Date(year, month + 1, i);
    cells.push({
      date: nextDate,
      isCurrentMonth: false,
      isToday: checkIfToday(nextDate),
      dateString: formatDateString(nextDate),
      dayName: getDayOfWeekName(nextDate),
    });
  }

  // Retrieve item matches. Dated assignment assignments map on EXACT YYYY-MM-DD. 
  // Custom recurring block sessions mapped continuously on standard DayOfWeek.
  const getItemsForCell = (dateString: string, dayName: DayOfWeek) => {
    return items.filter((item) => {
      if (item.dueDate) {
        return item.dueDate === dateString;
      }
      return item.dayOfWeek === dayName;
    }).sort((a, b) => {
      const aTime = a.startTime || "25:00";
      const bTime = b.startTime || "25:00";
      return aTime.localeCompare(bTime);
    });
  };

  // Overlap indicators matching system warning state
  const conflictItemIds: string[] = [];
  conflicts.forEach((c) => {
    if (c.severity === "danger" || c.severity === "warning") {
      conflictItemIds.push(...(c.itemIds || []));
    }
  });

  const getBadgeStyles = (item: PlannerItem) => {
    const isConflict = conflictItemIds.includes(item.id);

    if (item.completed) {
      return "bg-slate-100 border-l-2 border-slate-305 text-slate-400 line-through opacity-65";
    }
    if (isConflict) {
      return "bg-rose-50 border-l-2 border-rose-500 text-rose-950 font-semibold shadow-3xs hover:bg-rose-100";
    }

    switch (item.type) {
      case "assignment":
        return "bg-indigo-50 border-l-2 border-indigo-500 text-indigo-950 hover:bg-indigo-100/50";
      case "shift":
        return "bg-amber-50 border-l-2 border-amber-500 text-amber-950 hover:bg-amber-100/50";
      case "workout":
        return "bg-emerald-50 border-l-2 border-emerald-500 text-emerald-950 hover:bg-emerald-100/50";
      case "study":
        return "bg-indigo-50/40 border-l-2 border-indigo-400 text-slate-750 hover:bg-indigo-50/80";
      case "custom": {
        let borderAndBg = "bg-pink-50 border-l-2 border-pink-500 text-pink-900 hover:bg-pink-100";
        if (item.customColor === "indigo") borderAndBg = "bg-indigo-50 border-l-2 border-indigo-500 text-indigo-955 hover:bg-indigo-100";
        else if (item.customColor === "emerald") borderAndBg = "bg-emerald-50 border-l-2 border-emerald-500 text-emerald-955 hover:bg-emerald-105";
        else if (item.customColor === "amber") borderAndBg = "bg-amber-50 border-l-2 border-amber-500 text-amber-955 hover:bg-amber-100";
        else if (item.customColor === "sky") borderAndBg = "bg-sky-50 border-l-2 border-sky-500 text-sky-955 hover:bg-sky-100";
        else if (item.customColor === "teal") borderAndBg = "bg-teal-50 border-l-2 border-teal-500 text-teal-955 hover:bg-teal-100";
        else if (item.customColor === "slate") borderAndBg = "bg-slate-50 border-l-2 border-slate-400 text-slate-750 hover:bg-slate-100";
        return borderAndBg;
      }
      default:
        return "bg-slate-50 border-l-2 border-slate-400 text-slate-700 hover:bg-slate-100";
    }
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case "assignment":
        return <BookOpen className="w-2.5 h-2.5 text-indigo-550 shrink-0" />;
      case "shift":
        return <Briefcase className="w-2.5 h-2.5 text-amber-600 shrink-0" />;
      case "workout":
        return <Dumbbell className="w-2.5 h-2.5 text-emerald-600 shrink-0" />;
      case "custom":
        return <Sparkles className="w-2.5 h-2.5 text-pink-500 shrink-0" />;
      default:
        return <Clock className="w-2.5 h-2.5 text-slate-400 shrink-0" />;
    }
  };

  // Navigations
  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleGoToday = () => {
    setCurrentDate(new Date(2026, 5, 1)); // Default June 1st, 2026 environment
  };

  const monthLabel = currentDate.toLocaleString("default", { month: "long" });

  // Sidebar detail inspector selectors
  const dayItemsForDetail = selectedDayDetail 
    ? getItemsForDateDetailed(selectedDayDetail.dateString, selectedDayDetail.dayName)
    : [];

  function getItemsForDateDetailed(dateString: string, dayName: DayOfWeek) {
    return items.filter((item) => {
      if (item.dueDate) {
        return item.dueDate === dateString;
      }
      return item.dayOfWeek === dayName;
    }).sort((a, b) => {
      const aTime = a.startTime || "25:00";
      const bTime = b.startTime || "25:00";
      return aTime.localeCompare(bTime);
    });
  }

  const conflictsForDetail = selectedDayDetail
    ? conflicts.filter((c) => {
        const itemIdsInDay = dayItemsForDetail.map((it) => it.id);
        return c.itemIds?.some((id: string) => itemIdsInDay.includes(id)) || c.id.includes(selectedDayDetail.dayName);
      })
    : [];

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-md overflow-hidden flex flex-col relative w-full" id="monthly-calendar-container">
      {/* 1. CALENDAR ADMINISTRATIVE CONTROLS HEADER */}
      <div className="bg-white border-b border-slate-100 py-4 px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 select-none">
          <Calendar className="w-4 h-4 text-indigo-600" />
          <h3 className="text-sm font-bold tracking-tight text-slate-900">
            Monthly Planner
          </h3>
        </div>

        {/* Action navigation controls */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
          <button
            id="month-prev-button"
            onClick={handlePrevMonth}
            className="p-1.5 text-slate-500 hover:text-slate-800 bg-white hover:bg-slate-50 rounded-lg shadow-2xs cursor-pointer border border-slate-205/10 transition-all font-semibold"
            title="Previous Month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          
          <span className="text-xs font-bold text-slate-800 px-4 select-none min-w-[110px] text-center font-sans">
            {monthLabel} {year}
          </span>

          <button
            id="month-next-button"
            onClick={handleNextMonth}
            className="p-1.5 text-slate-500 hover:text-slate-800 bg-white hover:bg-slate-50 rounded-lg shadow-2xs cursor-pointer border border-slate-205/10 transition-all font-semibold"
            title="Next Month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <div className="w-[1px] h-4 bg-slate-250 mx-1" />

          <button
            id="today-preset-button"
            onClick={handleGoToday}
            className="px-3 py-1 text-[10px] font-bold text-indigo-600 bg-white hover:bg-slate-50 rounded-lg border border-slate-205/10 shadow-2xs cursor-pointer transition-all"
            title="Go to Today"
          >
            Today
          </button>
        </div>
      </div>

      {/* 2. CALENDAR WEEKDAY ROW LABELS */}
      <div className="grid grid-cols-7 text-center border-b border-slate-100 bg-slate-50/20 select-none">
        {WEEKDAY_LABELS.map((dayLabel, idx) => (
          <div key={idx} className="py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-r border-slate-100 last:border-r-0">
            {dayLabel}
          </div>
        ))}
      </div>

      {/* 3. CALENDAR INTERACTIVE DAYS CELL GRID */}
      <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-100/10 min-w-[700px]">
        {cells.map((cell, idx) => {
          const dayItems = getItemsForCell(cell.dateString, cell.dayName);
          const fitsInGrid = dayItems.slice(0, 3);
          const overflowCount = dayItems.length - 3;
          
          // Overlap checks for this specific day cell
          const hasDangerConflict = conflicts.some((c) => {
            const itemIdsInDay = dayItems.map((it) => it.id);
            return (
              (c.severity === "danger" && c.itemIds?.some((id: string) => itemIdsInDay.includes(id))) || 
              (c.severity === "danger" && c.id.includes(cell.dayName))
            );
          });

          return (
            <div
              id={`month-cell-${cell.dateString}`}
              key={idx}
              onClick={() => setSelectedDayDetail({
                date: cell.date,
                dateString: cell.dateString,
                dayName: cell.dayName
              })}
              className={`min-h-[115px] border-r border-b border-slate-100 p-2 overflow-hidden flex flex-col justify-between cursor-pointer group relative transition-all duration-200 outline-none select-none ${
                cell.isCurrentMonth ? "bg-white" : "bg-slate-550/5 text-slate-350 opacity-70"
              } ${
                cell.isToday 
                  ? "bg-indigo-50/30 font-extrabold ring-1 inset-0 ring-indigo-500 shadow-xs" 
                  : "hover:bg-slate-50/50"
              }`}
            >
              {/* Day Header */}
              <div className="flex items-start justify-between select-none">
                <div className="flex items-center gap-1">
                  <span className={`text-xs font-black tracking-tight flex items-center justify-center rounded-full w-6 h-6 leading-none transition-colors ${
                    cell.isToday 
                      ? "bg-indigo-600 text-white font-extrabold border border-indigo-400" 
                      : "text-slate-800 hover:text-indigo-600"
                  }`}>
                    {cell.date.getDate()}
                  </span>
                  
                  {/* Show Month text for the 1st day of month or boundaries */}
                  {cell.date.getDate() === 1 && (
                    <span className="text-[10px] font-extrabold tracking-wider text-indigo-650 uppercase font-mono">
                      {cell.date.toLocaleString("default", { month: "short" })}
                    </span>
                  )}
                </div>

                {/* Left Mini Conflict Alarm Indicator if conflict exists */}
                {dayItems.length > 0 && hasDangerConflict && (
                  <span className="w-2.5 h-2.5 rounded-full bg-red-650 animate-pulse border border-white mt-1" title="High Conflict Day!" />
                )}

                {/* floating mini quick ADD plus button */}
                <button
                  id={`quick-add-btn-${cell.dateString}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    // Preset the day of week & precise calendar date in quick-add state!
                    onQuickAddWithTime(cell.dayName, undefined, cell.dateString);
                  }}
                  className="p-1 rounded-md text-slate-350 hover:text-indigo-650 hover:bg-indigo-50/80 transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                  title={`Add homework/shift/workout centered on ${cell.dateString}`}
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Day's Event Badges List */}
              <div className="flex-1 flex flex-col gap-1 mt-1.5 overflow-hidden">
                {fitsInGrid.map((item) => {
                  const style = getBadgeStyles(item);
                  return (
                    <div
                      id={`cell-item-${item.id}`}
                      key={item.id}
                      onClick={(e) => {
                        e.stopPropagation(); // Avoid triggering cell background details popup drawer
                        onEdit(item);
                      }}
                      className={`px-1.5 py-1 rounded-sm text-[9.5px] leading-tight flex items-center gap-1 border-slate-200 border transition-all truncate hover:translate-x-0.5 hover:shadow-3xs ${style}`}
                      title={`${item.title} (${item.startTime || "Untimed"})`}
                    >
                      {getIconForType(item.type)}
                      <span className="truncate max-w-[85%] font-medium">
                        {item.title}
                      </span>
                    </div>
                  );
                })}
                
                {/* Overflow items marker indicator */}
                {overflowCount > 0 && (
                  <div className="text-[9px] font-bold text-indigo-600 pl-1 font-mono hover:underline">
                    + {overflowCount} more...
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 4. MODERN MONTH INSPECTOR DAILY SIDE DRAWER POPUP */}
      {selectedDayDetail && (
        <div
          id="month-inspection-overlay"
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-3xs flex justify-end z-[80] transition-all"
          onClick={() => setSelectedDayDetail(null)}
        >
          {/* Main Slide-out Container panel */}
          <div
            className="w-full max-w-[440px] bg-white h-full shadow-2xl flex flex-col p-6 animate-slide-left relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header with full date */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4 mb-4 select-none">
              <div>
                <span className="text-[10px] font-black text-indigo-650 uppercase tracking-widest font-mono select-none">
                  Day Inspection Overview
                </span>
                
                <h3 className="text-xl font-extrabold text-slate-800 tracking-tight mt-1 flex items-center gap-2">
                  <span>{selectedDayDetail.dayName}</span>
                  <span className="bg-slate-100 text-indigo-600 font-extrabold text-xs px-3 py-1 rounded-full border border-slate-205">
                    {selectedDayDetail.date.toLocaleString("default", { month: "short" })} {selectedDayDetail.date.getDate()}, {selectedDayDetail.date.getFullYear()}
                  </span>
                </h3>
              </div>
              
              <button
                id="close-inspector-x"
                onClick={() => setSelectedDayDetail(null)}
                className="p-1.5 rounded-lg text-slate-450 hover:text-slate-805 hover:bg-slate-100 transition-all cursor-pointer"
                title="Close inspection"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Daily stats summary / alert counts */}
            <div className="flex items-center gap-3 mb-4 select-none">
              <span className="text-xs text-slate-500 font-semibold font-mono">
                Planned: <strong className="text-slate-800 font-bold">{dayItemsForDetail.length} Tasks</strong>
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
              <span className="text-xs text-slate-500 font-semibold font-mono">
                Completed: <strong className="text-slate-800 font-bold">{dayItemsForDetail.filter((i) => i.completed).length}</strong>
              </span>
            </div>

            {/* System warning indicators if conflicts occur */}
            {conflictsForDetail.length > 0 && (
              <div className="mb-4 space-y-2 select-none">
                {conflictsForDetail.map((c, i) => (
                  <div
                    key={i}
                    className={`p-3 rounded-xl border flex items-start gap-2 text-xs font-semibold ${
                      c.severity === "danger"
                        ? "bg-red-50 text-red-950 border-red-200"
                        : "bg-amber-50 text-amber-900 border-amber-200"
                    }`}
                  >
                    <AlertTriangle className={`w-4 h-4 mt-0.5 shrink-0 ${
                      c.severity === "danger" ? "text-red-500 animate-bounce" : "text-amber-500"
                    }`} />
                    <p className="font-medium leading-relaxed">{c.message}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Main Daily List Scroll Container */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-3 mb-6 scrollbar-thin">
              {dayItemsForDetail.length > 0 ? (
                dayItemsForDetail.map((item) => {
                  const styleClass = getBadgeStyles(item);
                  return (
                    <div
                      key={item.id}
                      className={`p-4 rounded-2xl border transition-all hover:shadow-xs group/item ${styleClass} flex gap-3 cursor-pointer`}
                      onClick={() => onEdit(item)}
                    >
                      {/* Left Toggle complete button */}
                      <button
                        id={`complete-drawer-btn-${item.id}`}
                        onClick={(e) => {
                          e.stopPropagation(); // Avoid open editor form
                          onToggleComplete(item.id);
                        }}
                        className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 cursor-pointer mt-0.5 transition-all ${
                          item.completed
                            ? "bg-indigo-600 border-indigo-600 text-white"
                            : "bg-white border-slate-350 hover:border-indigo-500"
                        }`}
                        title={item.completed ? "Mark incomplete" : "Complete Task"}
                      >
                        {item.completed && <Check className="w-3 h-3 stroke-[3]" />}
                      </button>

                      {/* Content column */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[8px] font-black uppercase tracking-wider font-mono">
                            {item.type}
                          </span>
                          {item.priority === "high" && !item.completed && (
                            <span className="bg-red-105 text-red-700 font-bold text-[8.5px] px-1.5 rounded-full select-none leading-none pt-0.5 pb-0.5">
                              HIGH
                            </span>
                          )}
                        </div>
                        
                        <h4 className={`text-sm font-bold truncate mt-1 ${
                          item.completed ? "line-through text-slate-400 font-normal" : "text-slate-900"
                        }`}>
                          {item.title}
                        </h4>

                        {/* Description labels */}
                        <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-slate-450 font-medium select-none">
                          <span className="flex items-center gap-1 font-mono font-bold bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">
                            <Clock className="w-3 h-3 text-slate-450" />
                            {item.startTime ? `${item.startTime} - ${item.endTime || "??:??"}` : "Untimed"}
                          </span>

                          {item.subject && (
                            <span className="text-indigo-600">• Subject: {item.subject}</span>
                          )}
                          {item.employer && (
                            <span className="text-amber-600">• Job: {item.employer}</span>
                          )}
                          {item.workoutCategory && (
                            <span className="text-emerald-600">• Style: {item.workoutCategory}</span>
                          )}
                        </div>

                        {item.notes && (
                          <p className="text-xs text-slate-400 mt-2 bg-slate-50/50 p-2 rounded-lg border border-slate-100 line-clamp-2 italic">
                            "{item.notes}"
                          </p>
                        )}
                      </div>

                      {/* Controls right */}
                      <div className="flex flex-col gap-1.5 justify-center opacity-0 group-hover/item:opacity-100 transition-opacity">
                        <button
                          id={`item-drawer-edit-${item.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onEdit(item);
                          }}
                          className="p-1 rounded-md text-slate-450 hover:text-indigo-650 hover:bg-slate-100 transition-colors cursor-pointer"
                          title="Edit Task"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        
                        <button
                          id={`item-drawer-delete-${item.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(item.id);
                          }}
                          className="p-1 rounded-md text-slate-450 hover:text-rose-600 hover:bg-rose-50/55 transition-colors cursor-pointer"
                          title="Delete Task"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50 select-none">
                  <span className="text-4xl text-slate-400">☀️</span>
                  <h5 className="text-sm font-black text-slate-700 mt-3 select-none">No Items Planned</h5>
                  <p className="text-xs text-slate-400 text-center max-w-[245px] mt-1 leading-normal select-none">
                    This day has a clear slate! Take index, study at your own pace, or tap the button below to add activities.
                  </p>
                </div>
              )}
            </div>

            {/* Quick addition trigger buttons within inside drawers drawer footer */}
            <div className="mt-auto pt-4 border-t border-slate-100 grid grid-cols-2 gap-2">
              <button
                id="drawer-add-timed-btn"
                onClick={() => {
                  onQuickAddWithTime(selectedDayDetail.dayName, "16:00", selectedDayDetail.dateString);
                  setSelectedDayDetail(null);
                }}
                className="bg-indigo-50 hover:bg-indigo-100 text-indigo-755 text-xs font-extrabold py-3.5 px-4 rounded-xl transition-all cursor-pointer text-center flex items-center justify-center gap-1 leading-none shadow-3xs hover:shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Timed Session</span>
              </button>

              <button
                id="drawer-add-untimed-btn"
                onClick={() => {
                  onQuickAddWithTime(selectedDayDetail.dayName, undefined, selectedDayDetail.dateString);
                  setSelectedDayDetail(null);
                }}
                className="bg-slate-100 hover:bg-slate-205 text-slate-700 text-xs font-extrabold py-3.5 px-4 rounded-xl transition-all cursor-pointer text-center flex items-center justify-center gap-1 leading-none shadow-3xs hover:shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Untimed Task</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
