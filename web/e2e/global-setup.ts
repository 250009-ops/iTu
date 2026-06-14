import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const API_BASE =
  process.env.API_URL ?? "http://localhost:3001/api/v1";

export default async function globalSetup() {
  const apiDir = path.resolve(__dirname, "../../api");
  const stateFile = path.join(__dirname, ".state.json");

  fs.writeFileSync(
    stateFile,
    JSON.stringify({ sessionCode: "", studentToken: "" }),
  );

  try {
    const health = await fetch(`${API_BASE}/health`);
    if (!health.ok) {
      throw new Error(`API health check failed (${health.status})`);
    }
  } catch {
    throw new Error(
      `API is not reachable at ${API_BASE}. Start it with: cd api && npm run start:dev`,
    );
  }

  console.log("Resetting Alex Johnson (fresh student)…");
  execSync("npm run db:reset-student", {
    cwd: apiDir,
    stdio: "inherit",
  });
}
