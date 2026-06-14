import fs from "fs";
import path from "path";

const stateFile = path.join(__dirname, ".state.json");

type E2EState = {
  sessionCode: string;
  studentToken: string;
};

function readState(): E2EState {
  try {
    return JSON.parse(fs.readFileSync(stateFile, "utf8")) as E2EState;
  } catch {
    return { sessionCode: "", studentToken: "" };
  }
}

function writeState(state: E2EState) {
  fs.mkdirSync(path.dirname(stateFile), { recursive: true });
  fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));
}

export const e2eState = new Proxy({} as E2EState, {
  get(_target, prop: keyof E2EState) {
    return readState()[prop];
  },
  set(_target, prop: keyof E2EState, value: string) {
    const next = { ...readState(), [prop]: value };
    writeState(next);
    return true;
  },
});
