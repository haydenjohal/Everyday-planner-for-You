/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { 
  BookOpen, 
  Briefcase, 
  Dumbbell, 
  Calendar, 
  Check, 
  Clock, 
  Trash2, 
  Sparkles,
  AlertTriangle 
} from "lucide-react";
import { PlannerItem } from "../types";

interface PlannerItemCardProps {
  item: PlannerItem;
  onToggleComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (item: PlannerItem) => void;
  highlightedIds?: string[]; // IDs involved in conflicts
}

export const PlannerItemCard: React.FC<PlannerItemCardProps> = ({
  item,
  onToggleComplete,
  onDelete,
  onEdit,
  highlightedIds = []
}) => {
  const isConflict = highlightedIds.includes(item.id);

  // Define left-border color accents and icon for the specific item type
  const getTypeStyling = () => {
    if (item.completed) {
      return {
        borderL: "border-l-[3px] border-l-slate-300",
        icon: <Check className="w-3.5 h-3.5 text-slate-400" />
      };
    }

    switch (item.type) {
      case "assignment":
        return {
          borderL: "border-l-[3px] border-l-indigo-600",
          icon: <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
        };
      case "shift":
        return {
          borderL: "border-l-[3px] border-l-slate-400",
          icon: <Briefcase className="w-3.5 h-3.5 text-slate-500" />
        };
      case "workout":
        return {
          borderL: "border-l-[3px] border-l-emerald-500",
          icon: <Dumbbell className="w-3.5 h-3.5 text-emerald-500" />
        };
      case "study":
        return {
          borderL: "border-l-[3px] border-l-indigo-300",
          icon: <Clock className="w-3.5 h-3.5 text-indigo-400" />
        };
      case "custom": {
        let borderL = "border-l-[3px] border-l-pink-500";
        if (item.customColor === "indigo") borderL = "border-l-[3px] border-l-indigo-500";
        else if (item.customColor === "emerald") borderL = "border-l-[3px] border-l-emerald-500";
        else if (item.customColor === "amber") borderL = "border-l-[3px] border-l-amber-550";
        else if (item.customColor === "sky") borderL = "border-l-[3px] border-l-sky-500";
        else if (item.customColor === "teal") borderL = "border-l-[3px] border-l-teal-500";
        else if (item.customColor === "slate") borderL = "border-l-[3px] border-l-slate-400";
        return {
          borderL,
          icon: <Sparkles className="w-3.5 h-3.5 text-pink-500" />
        };
      }
      default:
        return {
          borderL: "border-l-[3px] border-l-slate-500",
          icon: <Calendar className="w-3.5 h-3.5 text-slate-500" />
        };
    }
  };

  const styling = getTypeStyling();

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("text/plain", item.id);
    e.dataTransfer.effectAllowed = "move";
  };

  return (
    <div
      id={`planner-item-${item.id}`}
      draggable
      onDragStart={handleDragStart}
      className={`relative group flex flex-col p-3 rounded-xl bg-white border border-slate-100 hover:border-slate-200 hover:shadow-[0_4px_12px_rgba(0,0,0,0.03)] transition-all duration-150 cursor-grab active:cursor-grabbing outline-none ${
        styling.borderL
      } ${
        item.completed ? "opacity-60" : ""
      } ${
        isConflict ? "border-red-200 bg-red-50/20" : ""
      }`}
    >
      {/* Top Details & Action Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 min-w-0">
          {styling.icon}
          {item.priority === "high" && !item.completed && (
            <span className="bg-rose-50 text-rose-600 text-[8px] font-extrabold px-1.5 rounded-full select-none select-none tracking-wider">
              PRIME
            </span>
          )}
        </div>
        
        {/* Modern minimal actions */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-150">
          <button
            id={`edit-item-${item.id}`}
            onClick={(e) => {
              e.stopPropagation();
              onEdit(item);
            }}
            className="p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-slate-50 transition-colors"
            title="Edit item"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
          <button
            id={`delete-item-${item.id}`}
            onClick={(e) => {
              e.stopPropagation();
              onDelete(item.id);
            }}
            className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
            title="Delete item"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Main title and trigger check if assignment */}
      <div className="mt-2.5">
        <div className="flex items-start gap-1.5">
          {item.type === "assignment" && (
            <button
              id={`toggle-complete-${item.id}`}
              onClick={(e) => {
                e.stopPropagation();
                onToggleComplete(item.id);
              }}
              className={`mt-0.5 flex-shrink-0 w-3.5 h-3.5 rounded-full flex items-center justify-center border transition-all cursor-pointer ${
                item.completed
                  ? "bg-indigo-600 border-indigo-600 text-white"
                  : "border-slate-300 hover:border-indigo-600 bg-white"
              }`}
            >
              {item.completed && <Check className="w-2.5 h-2.5 stroke-[3.5]" />}
            </button>
          )}
          <p className={`text-xs font-semibold leading-snug tracking-tight text-slate-800 select-none ${
            item.completed ? "line-through text-slate-400 font-normal" : "text-slate-900"
          }`}>
            {item.title}
          </p>
        </div>

        {/* Info Badges & Time tags */}
        <div className="flex flex-wrap items-center gap-1.5 mt-2 text-[10px] text-slate-500 font-medium select-none">
          {item.startTime && (
            <span className={`font-mono text-[9px] font-bold px-1.5 py-0.5 rounded ${
              isConflict 
                ? "bg-rose-50 text-rose-600" 
                : "bg-slate-100 text-slate-600"
            }`}>
              {item.startTime}
            </span>
          )}

          {item.type === "shift" && item.employer && (
            <span className="truncate max-w-[80px]">@{item.employer}</span>
          )}

          {item.subject && (
            <span className="truncate max-w-[80px]">{item.subject}</span>
          )}

          {item.workoutCategory && (
            <span className="truncate max-w-[80px]">{item.workoutCategory}</span>
          )}

          {item.type === "custom" && item.customCategory && (
            <span className="truncate max-w-[90px] text-pink-600 font-bold bg-pink-50/70 px-1.5 py-0.5 rounded">
              {item.customCategory}
            </span>
          )}
        </div>

        {item.notes && (
          <p className="mt-1.5 text-[9px] text-slate-400 line-clamp-1 italic select-none">
            {item.notes}
          </p>
        )}
      </div>

      {/* Conflict Badge */}
      {isConflict && (
        <div className="absolute -right-1 -top-1 bg-rose-650 text-white text-[7.5px] font-black px-1.5 py-0.5 rounded-full select-none shadow-sm flex items-center gap-0.5 animate-pulse-subtle">
          <AlertTriangle className="w-2.5 h-2.5" />
          <span>CONFLICT</span>
        </div>
      )}
    </div>
  );
};

