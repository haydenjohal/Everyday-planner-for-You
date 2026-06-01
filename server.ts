/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "15mb" }));

  // Safe lazy-initialization of Gemini if credentials are ready
  const apiKey = process.env.GEMINI_API_KEY;
  let ai: GoogleGenAI | null = null;
  if (apiKey) {
    ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }

  // Robust helper to perform Content Generation with models, falling back in case of 503 / UNAVAILABLE errors
  async function generateContentWithFallback(params: {
    contents: any;
    config?: any;
  }) {
    if (!ai) {
      throw new Error("GoogleGenAI is not initialized.");
    }

    const modelsToTry = ["gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-flash-latest"];
    let lastError: any = null;

    for (const modelName of modelsToTry) {
      try {
        console.log(`Attempting generateContent using model: ${modelName}`);
        const response = await ai.models.generateContent({
          model: modelName,
          contents: params.contents,
          config: params.config,
        });
        if (response) {
          console.log(`Successfully generated content using model: ${modelName}`);
          return response;
        }
      } catch (err) {
        console.warn(`Model ${modelName} failed or was rate limited/unavailable. Error info:`, err);
        lastError = err;
      }
    }

    throw lastError || new Error("All tried models failed.");
  }

// Fast in-memory cache to prevent duplicate Gemini API requests
interface CachedResult {
  insights: {
    mood: string;
    summary: string;
    tips: string[];
    suggestedSchedule: Array<{ itemId: string; suggestedDay: string; reason: string }>;
  };
  conflicts: any[];
}

const analysisCache = new Map<string, { timestamp: number; result: CachedResult }>();

// Generates a structural fingerprint so that minor changes or same-item arrays retrieve from cache
function getItemsFingerprint(items: any[]): string {
  if (!items || !Array.isArray(items)) return "";
  const subset = items.map(it => ({
    id: it.id,
    type: it.type,
    dayOfWeek: it.dayOfWeek,
    startTime: it.startTime || "",
    endTime: it.endTime || "",
    completed: !!it.completed,
    priority: it.priority || "",
    title: it.title || ""
  }));
  subset.sort((a, b) => a.id.localeCompare(b.id));
  return JSON.stringify(subset);
}

  // 1. AI Analysis Endpoint which performs smart conflict solving
  app.post("/api/planner/analyze", async (req, res) => {
    try {
      const { items, skipAI } = req.body;
      if (!items || !Array.isArray(items)) {
        return res.status(400).json({ error: "Invalid items parameter" });
      }

      // Always run local analyzer first as baseline
      const localConflicts = performLocalConflictAnalysis(items);

      // If the client requested skipAI or backend isn't ready, execute fast fallback immediately
      if (skipAI || !ai) {
        return res.json({
          insights: {
            mood: "Balanced ⚡",
            summary: "Nice! Local check has verified your layout. Click 'Refine Planner' to optimize.",
            tips: [
              "Keep events to 3 or fewer per school night.",
              "Position workouts where they won't cut into shifts.",
              "Tackle high mental load tasks when freshest."
            ],
            suggestedSchedule: []
          },
          conflicts: localConflicts
        });
      }

      // Check cache first to avoid rate-limits or quota abuse
      const fingerprint = getItemsFingerprint(items);
      if (fingerprint) {
        const cached = analysisCache.get(fingerprint);
        const cachedIsValid = cached && (Date.now() - cached.timestamp < 600000); // 10 minutes cache
        if (cachedIsValid && cached) {
          // Merge current local conflicts into the cached result to keep items immediate
          const mergedConflicts = [...cached.result.conflicts];
          localConflicts.forEach(localConf => {
            const exists = mergedConflicts.some(aiConf => aiConf.id === localConf.id);
            if (!exists) {
              mergedConflicts.push(localConf);
            }
          });
          return res.json({
            insights: cached.result.insights,
            conflicts: mergedConflicts
          });
        }
      }

      const prompt = `You are an encouraging academic planner advisor and lifestyle mentor for a Grade 10 student (sophomore).
Your goal is to guide them on balancing stressful weeks with school work, jobs, sport/workouts, and essential relaxation. 

We have input a list of schedule tasks, homework assignments, work shifts, and workouts:
${JSON.stringify(items, null, 2)}

Requirements for Output:
- Respond STRICTLY with valid JSON following the schema specified.
- Look for scheduling conflicts, e.g. temporal overlaps (work shift overlapping with workout or study time).
- Give smart suggestions for high school sophomores (e.g., studying the night before an exam, getting enough rest, avoiding double shifts).
- Recommend at most 2 useful rescheduling moves in "suggestedSchedule" using existing item IDs, explaining clearly why.
- Provide highly supportive tips tailored specifically for 10th graders with a super encouraging tone.
- In 'message', explain what the conflict is in a nice, reassuring way. Combine local conflict detections with your advanced logical insights if they align.`;

      const response = await generateContentWithFallback({
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              insights: {
                type: Type.OBJECT,
                properties: {
                  mood: { type: Type.STRING, description: "One-word or short custom phrase for the mood / vibe of this week." },
                  summary: { type: Type.STRING, description: "A friendly, encouraging sophomore-level overview of their week." },
                  tips: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "3 highly relatable, cool tips for managing their workload."
                  },
                  suggestedSchedule: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        itemId: { type: Type.STRING, description: "ID of the item being rescheduled" },
                        suggestedDay: { type: Type.STRING, description: "The day of week to move the item to" },
                        reason: { type: Type.STRING, description: "Why moving this item makes life easier" }
                      },
                      required: ["itemId", "suggestedDay", "reason"]
                    }
                  }
                },
                required: ["mood", "summary", "tips", "suggestedSchedule"]
              },
              conflicts: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    type: { type: Type.STRING, description: "Must be 'overlap', 'heavy_day', 'late_study', or 'general'" },
                    severity: { type: Type.STRING, description: "Must be 'warning', 'danger', or 'info'" },
                    message: { type: Type.STRING, description: "The friendly suggestion message explaining the issue" },
                    itemIds: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING }
                    }
                  },
                  required: ["id", "type", "severity", "message", "itemIds"]
                }
              }
            },
            required: ["insights", "conflicts"]
          }
        }
      });

      const text = response.text;
      if (!text) {
        throw new Error("Empty text returned from Gemini API.");
      }

      const aiData = JSON.parse(text.trim());
      
      // Make sure our local overlap safety checks are merged in case the AI missed any precise temporal overlaps!
      const mergedConflicts = [...aiData.conflicts];
      
      localConflicts.forEach(localConf => {
        const exists = mergedConflicts.some(aiConf => aiConf.id === localConf.id || (
          aiConf.type === 'overlap' && 
          aiConf.itemIds.includes(localConf.itemIds[0]) && 
          aiConf.itemIds.includes(localConf.itemIds[1])
        ));
        if (!exists) {
          mergedConflicts.push(localConf);
        }
      });

      // Save valid result to cache
      if (fingerprint) {
        if (analysisCache.size > 100) {
          analysisCache.clear();
        }
        analysisCache.set(fingerprint, {
          timestamp: Date.now(),
          result: {
            insights: aiData.insights,
            conflicts: mergedConflicts
          }
        });
      }

      return res.json({
        insights: aiData.insights,
        conflicts: mergedConflicts
      });

    } catch (err) {
      // Swallowed safely with informative info log to prevent hard standard-error trace warnings
      console.info("Express analyze fallback applied gracefully (Gemini resting):", err instanceof Error ? err.message : err);
      const manualConflicts = performLocalConflictAnalysis(req.body.items || []);
      return res.json({
        insights: {
          mood: "Cozy Mode 🍀",
          summary: "Your week is secured! Local checks are validating your slots.",
          tips: [
            "Highlight upcoming homework first to solve fast.",
            "Take 10-minute micro-breaks to preserve energy.",
            "Prioritize sleep over late-night crunch hours."
          ],
          suggestedSchedule: []
        },
        conflicts: manualConflicts
      });
    }
  });

  // 2. Encapsulated chatbot mentor endpoint for support / tutoring
  app.post("/api/planner/mentor", async (req, res) => {
    try {
      const { message, history, currentSchedule, image } = req.body;
      if (!ai) {
        return res.json({
          reply: "I am offline right now since no Gemini API Key is configured in your Secrets settings! However, try to avoid putting workouts right next to work shifts so you don't get super tired. You got this, champion!"
        });
      }

      const prompt = `You are "PlanMate," a super cool, friendly, and energetic high school planner assistant.
You talk directly to a high school student. You have full access to their planner data to answer questions about their schedule, warn of busy days, suggest schedules, and summarize upcoming chores, shifts, study blocks, and custom dates!

Current items on their schedule are: ${JSON.stringify(currentSchedule || [])}

Conversation history parameters:
${JSON.stringify(history || [])}

User message input: "${message || "What does my schedule look like?"}"

Give helpful advice that is concise, warm, encouraging, and highly specific to their schedule items listed above. If they uploaded an image (such as homework, workouts, timetables, or study schedules), look at it closely, answer their questions about it, extract key dates/tasks where helpful, and write a friendly response. Limit to 2-3 short sentences or simple scannable bullet points total. Bold key terms using markdown.`;

      let response;

      if (image && image.data && image.mimeType) {
        // Strip base64 headers if present
        let base64Data = image.data;
        if (base64Data.includes(";base64,")) {
          base64Data = base64Data.split(";base64,").pop() || "";
        }

        const imagePart = {
          inlineData: {
            mimeType: image.mimeType,
            data: base64Data,
          },
        };
        const textPart = {
          text: prompt,
        };

        response = await generateContentWithFallback({
          contents: { parts: [imagePart, textPart] }
        });
      } else {
        response = await generateContentWithFallback({
          contents: prompt
        });
      }

      return res.json({ reply: response.text || "Keep taking it one step at a time! You're going to do great." });
    } catch (err) {
      console.error("Mentor chatbot error:", err);
      return res.json({ reply: "No stress! I might have hit a minor snag talking with the neural network, but my key tip for you is: split big assignments into small, 30-minute daily targets!" });
    }
  });

  // Client-Vite pipeline setup
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is booted and listening on host 0.0.0.0 port ${PORT}`);
  });
}

// Baseline conflict finder rules engine to ensure reliability
function performLocalConflictAnalysis(items: any[]): any[] {
  const conflicts: any[] = [];
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  days.forEach(day => {
    const dayItems = items.filter(item => item.dayOfWeek === day);

    // Direct temporal overlap checking
    for (let i = 0; i < dayItems.length; i++) {
      for (let j = i + 1; j < dayItems.length; j++) {
        const itemA = dayItems[i];
        const itemB = dayItems[j];

        if (itemA.startTime && itemA.endTime && itemB.startTime && itemB.endTime) {
          const startA = timeToMinutes(itemA.startTime);
          const endA = timeToMinutes(itemA.endTime);
          const startB = timeToMinutes(itemB.startTime);
          const endB = timeToMinutes(itemB.endTime);

          if (startA < endB && startB < endA) {
            conflicts.push({
              id: `overlap-${itemA.id}-${itemB.id}`,
              type: 'overlap',
              severity: 'danger',
              message: `Double Booked! "${itemA.title}" overlaps with "${itemB.title}" on ${day}.`,
              itemIds: [itemA.id, itemB.id]
            });
          }
        }
      }
    }

    // Heavy workload checking (>3 events)
    if (dayItems.length >= 4) {
      conflicts.push({
        id: `heavy-${day}`,
        type: 'heavy_day',
        severity: 'warning',
        message: `${day} looks super busy with ${dayItems.length} items. Spreading workouts or study sessions out can prevent burnout!`,
        itemIds: dayItems.map(it => it.id)
      });
    }

    // Work shift & study fatigue checks
    const shifts = dayItems.filter(it => it.type === 'shift');
    const assignments = dayItems.filter(it => it.type === 'assignment' || it.type === 'study');
    if (shifts.length > 0 && assignments.length > 0) {
      const longShifts = shifts.filter(sh => {
        if (sh.startTime && sh.endTime) {
          return (timeToMinutes(sh.endTime) - timeToMinutes(sh.startTime)) > 240; // >4 hours
        }
        return false;
      });
      if (longShifts.length > 0) {
        conflicts.push({
          id: `shift-fatigue-${day}`,
          type: 'heavy_day',
          severity: 'warning',
          message: `You have a long work shift on ${day} plus homework tasks. Watch your energy levels!`,
          itemIds: [...longShifts.map(it => it.id), ...assignments.map(it => it.id)]
        });
      }
    }

    // Late-night warnings (past 10 PM)
    dayItems.forEach(it => {
      if (it.endTime) {
        const timeVal = timeToMinutes(it.endTime);
        if (timeVal > 22 * 60) {
          conflicts.push({
            id: `late-${it.id}`,
            type: 'late_study',
            severity: 'info',
            message: `"${it.title}" goes past 10:00 PM on ${day}. Don't skip vital sleep before school days!`,
            itemIds: [it.id]
          });
        }
      }
    });
  });

  return conflicts;
}

function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.split(':');
  if (parts.length < 2) return 0;
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
}

startServer();
