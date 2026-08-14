"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Tool = {
  id: string;
  label: string;
  task: string;
  interval_weeks: number;
  last_serviced_date: string | null;
};

function status(tool: Tool): { text: string; color: string } {
  if (!tool.last_serviced_date) {
    return { text: "Never logged", color: "var(--danger)" };
  }
  const last = new Date(tool.last_serviced_date);
  const dueDate = new Date(last);
  dueDate.setDate(dueDate.getDate() + tool.interval_weeks * 7);
  const daysUntilDue = Math.round((dueDate.getTime() - Date.now()) / 86400000);

  if (daysUntilDue < 0) return { text: `Overdue by ${Math.abs(daysUntilDue)}d`, color: "var(--danger)" };
  if (daysUntilDue <= 7) return { text: `Due in ${daysUntilDue}d`, color: "var(--gold-bright)" };
  return { text: `OK — due in ${daysUntilDue}d`, color: "var(--ivory-dim)" };
}

export default function ToolList({ tools: initialTools }: { tools: Tool[] }) {
  const supabase = createClient();
  const [tools, setTools] = useState(initialTools);

  async function markServiced(id: string) {
    const today = new Date().toISOString().slice(0, 10);
    const { error } = await supabase
      .from("tool_maintenance")
      .update({ last_serviced_date: today })
      .eq("id", id);
    if (!error) {
      setTools((prev) => prev.map((t) => (t.id === id ? { ...t, last_serviced_date: today } : t)));
    }
  }

  return (
    <div>
      {tools.map((tool) => {
        const s = status(tool);
        return (
          <div key={tool.id} className="zone-card">
            <div>
              <div className="zlabel">{tool.label}</div>
              <div className="zcode">{tool.task.toUpperCase()}</div>
            </div>
            <div>
              <div className="ztext">
                {tool.last_serviced_date
                  ? `Last serviced ${new Date(tool.last_serviced_date).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}`
                  : "Not logged yet"}
                {" · "}Every {tool.interval_weeks}wk
                {" · "}
                <span style={{ color: s.color }}>{s.text}</span>
              </div>
              <div className="zone-actions">
                <button className="btn btn-sm" onClick={() => markServiced(tool.id)}>
                  Mark serviced today
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
