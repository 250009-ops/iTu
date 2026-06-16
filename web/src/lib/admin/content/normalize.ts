import type { ContentModule } from "@/lib/admin/types";
import {
  emptyListeningContent,
  emptyReadingContent,
  emptySpeakingContent,
  emptyWritingContent,
} from "@/lib/admin/content/factories";

export function normalizeContent(module: ContentModule, raw: object): object {
  const c = raw as Record<string, unknown>;

  switch (module) {
    case "reading": {
      const passages = c.passages;
      if (Array.isArray(passages) && passages.length > 0) return raw;
      return emptyReadingContent(typeof c.title === "string" ? c.title : "Reading");
    }
    case "listening": {
      const parts = c.parts;
      if (Array.isArray(parts) && parts.length > 0) return raw;
      return emptyListeningContent(typeof c.title === "string" ? c.title : "Listening");
    }
    case "writing": {
      const tasks = c.tasks;
      if (Array.isArray(tasks) && tasks.length > 0) return raw;
      return emptyWritingContent(typeof c.title === "string" ? c.title : "Writing");
    }
    case "speaking": {
      const parts = c.parts;
      if (Array.isArray(parts) && parts.length > 0) return raw;
      return emptySpeakingContent();
    }
  }
}
