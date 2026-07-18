import type { AnswerMap } from "@/lib/exam/types";
import { saveAnswers, submitWriting } from "@/lib/api/exam";

const DB_NAME = "ielts_mock_exam_outbox";
const STORE = "pending_saves";
const DB_VERSION = 1;

type OutboxEntry =
  | {
      id: string;
      kind: "answers";
      sessionCode: string;
      payload: Record<string, string | string[] | null>;
      createdAt: number;
    }
  | {
      id: string;
      kind: "writing";
      sessionCode: string;
      payload: { task1Text: string; task2Text: string };
      createdAt: number;
    };

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => Promise<T> | T,
): Promise<T> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const store = tx.objectStore(STORE);
    Promise.resolve(fn(store))
      .then(resolve)
      .catch(reject);
    tx.oncomplete = () => db.close();
    tx.onerror = () => reject(tx.error);
  });
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export async function queueAnswerSave(
  sessionCode: string,
  answers: Record<string, string | string[] | null>,
) {
  const entry: OutboxEntry = {
    id: makeId(),
    kind: "answers",
    sessionCode,
    payload: answers,
    createdAt: Date.now(),
  };
  await withStore("readwrite", (store) => {
    store.put(entry);
  });
}

export async function queueWritingSave(
  sessionCode: string,
  task1Text: string,
  task2Text: string,
) {
  const entry: OutboxEntry = {
    id: makeId(),
    kind: "writing",
    sessionCode,
    payload: { task1Text, task2Text },
    createdAt: Date.now(),
  };
  await withStore("readwrite", (store) => {
    store.put(entry);
  });
}

async function listEntries(sessionCode?: string): Promise<OutboxEntry[]> {
  return withStore("readonly", (store) =>
    new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => {
        const all = req.result as OutboxEntry[];
        resolve(
          sessionCode
            ? all.filter((e) => e.sessionCode === sessionCode)
            : all,
        );
      };
      req.onerror = () => reject(req.error);
    }),
  );
}

async function removeEntry(id: string) {
  await withStore("readwrite", (store) => {
    store.delete(id);
  });
}

export async function flushExamSaveOutbox(sessionCode?: string) {
  const entries = (await listEntries(sessionCode)).sort(
    (a, b) => a.createdAt - b.createdAt,
  );

  for (const entry of entries) {
    try {
      if (entry.kind === "answers") {
        await saveAnswers(entry.sessionCode, entry.payload);
      } else {
        await submitWriting(
          entry.sessionCode,
          entry.payload.task1Text,
          entry.payload.task2Text,
        );
      }
      await removeEntry(entry.id);
    } catch {
      break;
    }
  }
}

export type { AnswerMap };
