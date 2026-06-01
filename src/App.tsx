/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { 
  Sparkles, 
  Calendar, 
  Plus, 
  BookOpen, 
  RotateCcw, 
  CheckCircle, 
  Info, 
  TrendingUp, 
  X, 
  AlertTriangle,
  ArrowRight,
  TrendingUp as CheckRateIcon
} from "lucide-react";
import { DayOfWeek, PlannerItem, AIResponse } from "./types";
import { INITIAL_PLANNER_ITEMS } from "./data/initialData";
import { WeeklyGrid } from "./components/WeeklyGrid";
import { AddEditForm } from "./components/AddEditForm";
import { PlanMateChat } from "./components/PlanMateChat";
import { CalendarView } from "./components/CalendarView";
import { CustomDatesView } from "./components/CustomDatesView";
import { MessageSquare } from "lucide-react";

const LOCAL_STORAGE_KEY = "weekly-planner-student-items";

export default function App() {
  // Main planner items state
  const [items, setItems] = useState<PlannerItem[]>(() => {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (_) {
        return INITIAL_PLANNER_ITEMS;
      }
    }
    return INITIAL_PLANNER_ITEMS;
  });

  // UI state
  const [selectedItemForEdit, setSelectedItemForEdit] = useState<PlannerItem | null>(null);
  const [defaultDayForAdd, setDefaultDayForAdd] = useState<DayOfWeek>("Monday");
  const [showForm, setShowForm] = useState(false);
  const [infoHelpDrawerOpen, setInfoHelpDrawerOpen] = useState(false);
  const [viewType, setViewType] = useState<"columns" | "calendar" | "custom_dates" | "planmate_chat">("calendar");
  const [defaultStartTimeForAdd, setDefaultStartTimeForAdd] = useState<string>("");
  const [defaultEndTimeForAdd, setDefaultEndTimeForAdd] = useState<string>("");
  const [defaultDueDateForAdd, setDefaultDueDateForAdd] = useState<string>("");

  // AI Response state
  const [aiAnalysis, setAiAnalysis] = useState<AIResponse>({
    insights: {
      mood: "Ready ⚡",
      summary: "Add your high-school tasks below, then click 'Refine with AI' to check overlapping duties, work conflicts, first-ready exams, and receive grades coaching!",
      tips: [
        "Plan assignments ahead: set sub-deadlines so they don't hit all at once.",
        "Include time for physical activity to keep your brain oxygenated and energetic.",
        "Keep at least one night completely free to socialize or play video games!"
      ],
      suggestedSchedule: []
    },
    conflicts: []
  });
  const [analysisLoading, setAnalysisLoading] = useState(false);

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
    // Trigger automatic local-reanalysis to keep conflict markers updated without hitting Gemini rate limits
    triggerReanalysis(items, true);
  }, [items]);

  // Sync conflicts and insights via server API or local rules engine
  const triggerReanalysis = async (currentItems: PlannerItem[], skipAI = true) => {
    setAnalysisLoading(true);
    try {
      const res = await fetch("/api/planner/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: currentItems, skipAI })
      });
      if (res.ok) {
        const data = await res.json();
        setAiAnalysis(data);
      }
    } catch (err) {
      console.warn("Failed to fetch AI feedback gracefully:", err);
    } finally {
      setAnalysisLoading(false);
    }
  };

  // 1. Handlers for adding/modifying items
  const handleSaveItem = (itemPayload: Omit<PlannerItem, "id"> & { id?: string }) => {
    if (itemPayload.id) {
      // Editing Mode
      setItems(prev => prev.map(it => it.id === itemPayload.id ? (itemPayload as PlannerItem) : it));
    } else {
      // Create Mode
      const newItem: PlannerItem = {
        ...itemPayload,
        id: `task-${Date.now()}`
      };
      setItems(prev => [...prev, newItem]);
    }
    setShowForm(false);
    setSelectedItemForEdit(null);
  };

  const handleToggleComplete = (id: string) => {
    setItems(prev => prev.map(it => {
      if (it.id === id) {
        return { ...it, completed: !it.completed };
      }
      return it;
    }));
  };

  const handleDeleteItem = (id: string) => {
    setItems(prev => prev.filter(it => it.id !== id));
  };

  const handleStartEdit = (item: PlannerItem) => {
    setSelectedItemForEdit(item);
    setShowForm(true);
  };

  const handleDragMove = (itemId: string, targetDay: DayOfWeek) => {
    setItems(prev => prev.map(it => {
      if (it.id === itemId) {
        return { ...it, dayOfWeek: targetDay };
      }
      return it;
    }));
  };

  const handleDragMoveWithTime = (itemId: string, targetDay: DayOfWeek, startTimeStr?: string) => {
    setItems(prev => prev.map(it => {
      if (it.id === itemId) {
        if (!startTimeStr) {
          const { startTime: _, endTime: __, ...rest } = it;
          return { ...rest, dayOfWeek: targetDay } as PlannerItem;
        }

        let durationMinutes = 90; // Default 1.5 hours
        if (it.startTime && it.endTime) {
          const [sh, sm] = it.startTime.split(":").map(Number);
          const [eh, em] = it.endTime.split(":").map(Number);
          if (!isNaN(sh) && !isNaN(sm) && !isNaN(eh) && !isNaN(em)) {
            const diff = (eh * 60 + em) - (sh * 60 + sm);
            if (diff > 0) durationMinutes = diff;
          }
        }

        const [newH, newM] = startTimeStr.split(":").map(Number);
        const endTotalMins = (newH * 60 + newM) + durationMinutes;
        const endH = Math.min(23, Math.floor(endTotalMins / 60));
        const endM = endTotalMins % 60;
        const endTimeStr = endH.toString().padStart(2, "0") + ":" + endM.toString().padStart(2, "0");

        return {
          ...it,
          dayOfWeek: targetDay,
          startTime: startTimeStr,
          endTime: endTimeStr
        };
      }
      return it;
    }));
  };

  const handleQuickAddClick = (day: DayOfWeek, startTimeStr?: string, endTimeStr?: string, dueDateStr?: string) => {
    setDefaultDayForAdd(day);
    setDefaultStartTimeForAdd(startTimeStr || "");
    setDefaultEndTimeForAdd(endTimeStr || "");
    setDefaultDueDateForAdd(dueDateStr || "");
    setSelectedItemForEdit(null);
    setShowForm(true);
  };

  const handleQuickAddWithTime = (day: DayOfWeek, startTimeStr?: string, dueDateStr?: string) => {
    let endStr = "";
    if (startTimeStr) {
      const [h, m] = startTimeStr.split(":").map(Number);
      const endTotal = (h * 60 + m) + 90; // default 1.5 hours
      const eh = Math.min(23, Math.floor(endTotal / 60));
      const em = endTotal % 60;
      endStr = eh.toString().padStart(2, "0") + ":" + em.toString().padStart(2, "0");
    }
    handleQuickAddClick(day, startTimeStr, endStr, dueDateStr);
  };

  // 2. Action to execute suggested coordinate moves directly
  const handleApplyAIRecommendation = (itemId: string, targetDay: DayOfWeek) => {
    setItems(prev => prev.map(it => {
      if (it.id === itemId) {
        return { ...it, dayOfWeek: targetDay };
      }
      return it;
    }));
    // Remove the executed suggestion from UI state
    setAiAnalysis(prev => ({
      ...prev,
      insights: {
        ...prev.insights,
        suggestedSchedule: prev.insights.suggestedSchedule?.filter(s => s.itemId !== itemId)
      }
    }));
  };

  // 3. System actions: reset to starter templates or clean slate
  const handleResetToDefault = () => {
    if (window.confirm("Do you want to reset your planner to the standard starter homework, shifts, and workout setup? This overwrites current changes.")) {
      setItems(INITIAL_PLANNER_ITEMS);
    }
  };

  const handleClearAllSchedule = () => {
    if (window.confirm("Are you sure you want to completely wipe your weekly schedule and start on a blank canvas?")) {
      setItems([]);
    }
  };

  // 4. Score board statistics
  const assignmentItems = items.filter(it => it.type === "assignment");
  const completedAssignments = assignmentItems.filter(it => it.completed).length;
  const assignmentProgress = assignmentItems.length > 0 
    ? Math.round((completedAssignments / assignmentItems.length) * 100) 
    : 0;  const totalShifts = items.filter(it => it.type === "shift").length;
  const totalWorkouts = items.filter(it => it.type === "workout").length;
  const dangerousConflictCount = aiAnalysis.conflicts.filter(c => c.severity === "danger").length;  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans select-none antialiased">
      {/* Dynamic Alert Banner if dangerous overlaps exist */}
      {dangerousConflictCount > 0 && (
        <div id="conflict-critical-banner" className="bg-rose-50 border-b border-rose-100/80 text-rose-800 text-xs font-semibold px-4 py-2 flex items-center justify-between gap-2 shadow-sm font-sans">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping" />
            <span>
              Schedule Alert: We detected <strong>{dangerousConflictCount} overlaps</strong> in your weekly agenda.
            </span>
          </div>
          <button 
            id="dismiss-critical-banner"
            onClick={() => setAiAnalysis(prev => ({ ...prev, conflicts: prev.conflicts.filter(c => c.severity !== "danger") }))}
            className="p-1 rounded text-rose-500 hover:text-rose-950 transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Elegant Header Matching "StudyFlow" Layout */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-3 flex flex-row items-center justify-between">
          {/* Brand Logo and Title */}
          <div className="flex items-center gap-2.5 select-none">
            <div className="w-7 h-7 bg-slate-900 rounded flex items-center justify-center">
              <div className="w-3 h-3 border-2 border-white rounded-[2px]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-xs font-bold tracking-widest text-slate-900 uppercase">PLANMATE</h1>
                <span className="text-[8px] bg-slate-100 font-bold px-1.5 py-0.5 rounded text-slate-500 tracking-wider">STUDENT PLANNER</span>
              </div>
            </div>
          </div>

          {/* Header Action Badges and Helpers */}
          <div className="flex items-center gap-2">
            {/* Dynamic Date display mimicking exactly the mockup bar */}
            <div className="hidden sm:flex items-center gap-1.5 bg-slate-50 border border-slate-100 px-3 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-550" />
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider font-sans">
                WEEK OF {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            </div>

            <button
              id="open-guide-button"
              onClick={() => setInfoHelpDrawerOpen(true)}
              className="p-1.5 rounded-lg border border-slate-100 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 transition-all cursor-pointer"
              title="Help guide"
            >
              <Info className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Core View Area with Responsiveness */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-6 flex flex-col lg:flex-row gap-8">
        
        {/* LEFT SIDEBAR: Personal Advisor, Priority suggested schedule changes */}
        <aside className="w-full lg:w-80 flex flex-col gap-5 shrink-0">
          
          {/* AI Mood Overview Vibe */}
          <div className="bg-white rounded-2xl border border-slate-205/10 p-5 shadow-[0_4px_16px_rgba(0,0,0,0.02)] flex flex-col gap-3 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50/50 rounded-full blur-xl pointer-events-none" />

            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <Sparkles className="w-4 h-4 text-slate-800" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">Plan Advisor</h2>
              <span className="ml-auto text-[9px] bg-indigo-50 text-indigo-600 font-bold px-1.5 py-0.5 rounded">
                VIBE: {aiAnalysis.insights.mood || "BALANCED"}
              </span>
            </div>

            {/* AI Advisor Assessment */}
            <p className="text-[11.5px] leading-relaxed text-slate-600 font-medium">
              {analysisLoading ? (
                <span className="flex items-center gap-1.5 text-indigo-600 font-bold animate-pulse">
                  Analyzing loads...
                </span>
              ) : (
                aiAnalysis.insights.summary
              )}
            </p>

            {/* Compact Actionable tips */}
            {aiAnalysis.insights.tips && aiAnalysis.insights.tips.length > 0 && (
              <div className="mt-2 space-y-2 select-none">
                <span className="block text-[9px] font-bold text-slate-400 tracking-wider uppercase">Action Tips</span>
                <ul className="space-y-1.5">
                  {aiAnalysis.insights.tips.slice(0, 2).map((tip, index) => (
                    <li key={index} className="text-[10.5px] text-slate-500 font-medium leading-relaxed flex items-start gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* AI Auto-Fix Drag Suggestions List */}
          {aiAnalysis.insights.suggestedSchedule && aiAnalysis.insights.suggestedSchedule.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-205/10 p-5 shadow-[0_4px_16px_rgba(0,0,0,0.02)] flex flex-col gap-3">
              <div className="flex items-center gap-1.5 border-b border-slate-100 pb-2 select-none">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-sans">Quick Moves</h3>
              </div>
              <div className="space-y-2.5">
                {aiAnalysis.insights.suggestedSchedule.map((sug, idx) => {
                  const item = items.find(it => it.id === sug.itemId);
                  if (!item) return null;
                  return (
                    <div key={idx} className="bg-indigo-50/30 rounded-xl p-3 border border-indigo-100/40 flex flex-col gap-2">
                       <p className="text-[11px] text-slate-705 leading-snug font-semibold select-text">
                        Shift <span className="text-slate-950 font-bold">"{item.title}"</span> to <span className="text-indigo-600 font-bold">{sug.suggestedDay}</span>
                      </p>
                      <p className="text-[9.5px] text-slate-450 font-medium italic select-text leading-normal">
                        "{sug.reason}"
                      </p>
                      <button
                        id={`apply-suggested-reschedule-${item.id}`}
                        onClick={() => handleApplyAIRecommendation(item.id, sug.suggestedDay)}
                        className="self-end text-[9px] font-bold text-indigo-600 hover:text-indigo-805 bg-white hover:bg-slate-50 border border-indigo-100 rounded-lg px-2 py-1.5 cursor-pointer transition-all flex items-center gap-0.5 leading-none"
                      >
                        Apply Move
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Warning conflicts log summary */}
          {aiAnalysis.conflicts && aiAnalysis.conflicts.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-205/10 p-5 shadow-[0_4px_16px_rgba(0,0,0,0.02)] select-none">
              <h3 className="text-xs font-bold tracking-wider text-rose-600 uppercase mb-3">Identified Conflicts</h3>
              <div className="space-y-1.5 max-h-[160px] overflow-y-auto scrollbar-thin">
                {aiAnalysis.conflicts.map((conf) => (
                  <div key={conf.id} className="p-2.5 bg-rose-50/50 border border-rose-100/70 rounded-xl text-[10px] text-rose-950 font-medium leading-normal flex gap-1.5 items-start">
                    <span className="text-rose-500 mt-0.5 shrink-0">⚠️</span>
                    <span>{conf.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Goal Progress Panel */}
          <div className="bg-white rounded-2xl border border-slate-205/10 p-5 shadow-[0_4px_16px_rgba(0,0,0,0.02)] flex flex-col gap-1 select-none">
            <span className="text-[9px] font-bold tracking-widest text-slate-400 uppercase block">Homework Progress</span>
            <p className="text-xs font-bold text-slate-800 leading-normal">Completed Assignments</p>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-2">
              <div className="h-full bg-indigo-600 transition-all duration-300" style={{ width: `${assignmentProgress}%` }}></div>
            </div>
            <p className="text-[9.5px] text-right mt-1.5 text-slate-400 font-mono font-bold">{assignmentProgress}% Completed &bull; {completedAssignments}/{assignmentItems.length}</p>
          </div>

        </aside>

        {/* RIGHT MAIN PANEL: Columns Dashboard, and operating tools */}
        <div className="flex-1 flex flex-col gap-5">
          
          {/* CENTRAL OPERATING SYSTEM TOOLBAR */}
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white px-5 py-3.5 rounded-2xl border border-slate-205/10 shadow-[0_4px_16px_rgba(0,0,0,0.02)]">
            <div className="select-none text-center sm:text-left">
              <h2 className="text-sm font-bold tracking-tight text-slate-900 leading-tight">
                {viewType === "calendar" ? "Weekly Calendar Schedule" : "Weekly Planner Columns Board"}
              </h2>
            </div>

            {/* Operational row */}
            <div className="flex items-center gap-1.5">
              {/* Trigger Optimizer Analysis manually */}
              <button
                id="trigger-ai-optimize"
                onClick={() => triggerReanalysis(items, false)}
                disabled={analysisLoading}
                className="bg-slate-900 text-white font-bold text-[10.5px] px-4 py-2 rounded-xl hover:bg-slate-800 transition-all flex items-center gap-1 shrink-0 cursor-pointer"
                title="Trigger automated schedule analysis"
              >
                <Sparkles className="w-3 h-3 fill-slate-300" />
                <span>{analysisLoading ? "Refining..." : "Refine Planner"}</span>
              </button>

              <button
                id="planner-add-task-button"
                onClick={() => {
                  setSelectedItemForEdit(null);
                  setDefaultDayForAdd("Monday");
                  setShowForm(true);
                }}
                className="bg-indigo-650 text-white font-bold text-[10.5px] px-4 py-2 rounded-xl hover:bg-indigo-750 transition-all shrink-0 cursor-pointer"
              >
                + New Task
              </button>

              <button
                id="reset-to-defaults-button"
                onClick={handleResetToDefault}
                className="p-1.5 border border-slate-200 text-slate-400 hover:text-slate-600 bg-white rounded-lg hover:bg-slate-50 transition-all cursor-pointer"
                title="Reset starter planner"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              <button
                id="wipe-planner-button"
                onClick={handleClearAllSchedule}
                className="p-1.5 border border-rose-100 text-rose-500 hover:text-rose-750 bg-white rounded-lg hover:bg-rose-50/50 transition-all cursor-pointer"
                title="Wipe planner values"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>

          {/* VIEW SWITCHER / MULTI-GRID MANAGER */}
          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-xl w-fit select-none">
            <button
              id="toggle-view-calendar"
              onClick={() => setViewType("calendar")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all outline-none cursor-pointer ${
                viewType === "calendar" 
                  ? "bg-white text-slate-900 shadow-sm" 
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
              <span>Calendar View</span>
            </button>
            <button
              id="toggle-view-columns"
              onClick={() => setViewType("columns")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all outline-none cursor-pointer ${
                viewType === "columns" 
                  ? "bg-white text-slate-900 shadow-sm" 
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <svg className="w-3.5 h-3.5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z" />
              </svg>
              <span>Weekly View</span>
            </button>
            <button
              id="toggle-view-custom-dates"
              onClick={() => setViewType("custom_dates")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all outline-none cursor-pointer ${
                viewType === "custom_dates" 
                  ? "bg-white text-slate-900 shadow-sm" 
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-pink-500" />
              <span>Custom Dates</span>
            </button>
            <button
              id="toggle-view-planmate-chat"
              onClick={() => setViewType("planmate_chat")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all outline-none cursor-pointer ${
                viewType === "planmate_chat" 
                  ? "bg-white text-slate-900 shadow-sm" 
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
              <span>PlanMate Chat</span>
            </button>
          </div>

          {/* THE DRAGGABLE CALENDAR GRID */}
          <div className="flex-1">
            {viewType === "calendar" ? (
              <CalendarView
                items={items}
                onToggleComplete={handleToggleComplete}
                onDelete={handleDeleteItem}
                onEdit={handleStartEdit}
                onDragMoveWithTime={handleDragMoveWithTime}
                onQuickAddWithTime={handleQuickAddWithTime}
                conflicts={aiAnalysis.conflicts}
              />
            ) : viewType === "columns" ? (
              <WeeklyGrid
                items={items}
                onToggleComplete={handleToggleComplete}
                onDelete={handleDeleteItem}
                onEdit={handleStartEdit}
                onDragMove={handleDragMove}
                onQuickAdd={(day) => handleQuickAddClick(day)}
                conflicts={aiAnalysis.conflicts}
              />
            ) : viewType === "custom_dates" ? (
              <CustomDatesView
                items={items}
                onSave={handleSaveItem}
                onDelete={handleDeleteItem}
              />
            ) : (
              <PlanMateChat currentSchedule={items} />
            )}
          </div>

          {/* Metrics & Strategy Double column footer */}
          {viewType !== "planmate_chat" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start mt-4">
              
              <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-3xs select-none">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Metrics Scoreboard</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider">Homework</span>
                    <span className="text-xs font-extrabold text-indigo-600 font-mono mt-0.5 block">{assignmentItems.length} Tasks</span>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider">Shifts</span>
                    <span className="text-xs font-extrabold text-amber-600 font-mono mt-0.5 block">{totalShifts} Rosters</span>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider">Workouts</span>
                    <span className="text-xs font-extrabold text-emerald-600 font-mono mt-0.5 block">{totalWorkouts} sessions</span>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider">All Items</span>
                    <span className="text-xs font-extrabold text-indigo-500 font-mono mt-0.5 block">{items.length} total</span>
                  </div>
                </div>
              </div>

              <div className="bg-indigo-50/50 border border-indigo-150/50 rounded-2xl p-5 shadow-3xs flex flex-col justify-center h-full select-none">
                <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-wide flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  <span>PlanMate Strategy Tip</span>
                </h4>
                <p className="text-[11px] leading-relaxed text-indigo-750 font-medium mt-1.5">
                  Avoid scheduling gym sessions next to intense grocery work shifts. Keep ample downtime buffers for high active energy.
                </p>
              </div>

            </div>
          )}

        </div>

      </main>

      {/* DRAWER / MODAL POPUP FOR CREATING OR EDITING ITEMS (showForm === true) */}
      {showForm && (
        <div id="add-edit-modal-backdrop" className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="animate-scale-up max-w-lg w-full">
            <AddEditForm
              itemToEdit={selectedItemForEdit}
              defaultDayOfWeek={defaultDayForAdd}
              defaultStartTime={defaultStartTimeForAdd}
              defaultEndTime={defaultEndTimeForAdd}
              defaultDueDate={defaultDueDateForAdd}
              onSave={handleSaveItem}
              onCancel={() => {
                setShowForm(false);
                setSelectedItemForEdit(null);
                setDefaultStartTimeForAdd("");
                setDefaultEndTimeForAdd("");
                setDefaultDueDateForAdd("");
              }}
            />
          </div>
        </div>
      )}

      {/* DETAILED INFORMATION DRAWER (Help Guides) */}
      {infoHelpDrawerOpen && (
        <div id="detailed-info-overlay" className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex justify-end">
          <div className="animate-slide-left bg-white w-full max-w-md h-full flex flex-col p-6 shadow-2xl overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4 select-none">
              <h2 className="text-base font-extrabold text-slate-900">High School Student Guide</h2>
              <button
                id="close-guide-drawer"
                onClick={() => setInfoHelpDrawerOpen(false)}
                className="p-1 px-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100/50 transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 select-text">
              <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 text-indigo-950 font-medium">
                <p className="text-xs leading-relaxed">
                  Welcome to the **Weekly Scholar Planner**! This tool is configured specifically to make balancing homework, grocery jobs, and fitness routines super smooth.
                </p>
              </div>

              <div>
                <dt className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-1.5">1. Drag and Reschedule</dt>
                <dd className="text-xs leading-relaxed text-slate-600">
                  Simply select a card in any day column, hold and drag it across the columns to adjust your task day immediately.
                </dd>
              </div>

              <div>
                <dt className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-1.5">2. Conflict Detection Warnings</dt>
                <dd className="text-xs leading-relaxed text-slate-600">
                  Our system evaluates direct double bookings (e.g., overlapping start and end times), extreme shift counts, and high homework weights on the same, busy evenings. Danger icons appear on high conflict days.
                </dd>
              </div>

              <div>
                <dt className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-1.5">3. AI Smart Advisor & Auto-reschedule</dt>
                <dd className="text-xs leading-relaxed text-slate-600">
                  PlanMate can examine your week and formulate smart time-management strategies, listing auto-fix recommendations. Simply click the green '**Move Item**' button on any advice card to implement the layout immediately.
                </dd>
              </div>

              <div>
                <dt className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-1.5 font-bold text-slate-800">💡 Offline Support Notice</dt>
                <dd className="text-xs leading-relaxed text-slate-500 italic">
                  Even if no Gemini API secret keys are populated, local mathematical validations will execute flawlessly, checking for hour overlaps, over-commitments, and late schedules!
                </dd>
              </div>
            </div>

            <button
              id="got-it-guide-button"
              onClick={() => setInfoHelpDrawerOpen(false)}
              className="mt-8 w-full py-3 text-xs font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-all cursor-pointer text-center select-none"
            >
              Okay, got it!
            </button>
          </div>
        </div>
      )}

      {/* Footer copyright */}
      <footer className="bg-white border-t border-slate-200 py-4 select-none">
        <p className="text-center text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
          Weekly Planner • Grade 10 Student Edition • No external databases required
        </p>
      </footer>
    </div>
  );
}
