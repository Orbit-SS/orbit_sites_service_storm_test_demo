// agent-server.mjs
// Runs INSIDE the Vercel Sandbox — has direct filesystem access

import express from "express";
import cors from "cors";
import { execSync } from "child_process";
import { query } from "@anthropic-ai/claude-agent-sdk";
import "dotenv/config";

const PORT = 4000;

// If SANDBOX_BRANCH is set, the agent must stay on that branch.
// When absent (internal use), any branch is allowed.
const ALLOWED_BRANCH = process.env.SANDBOX_BRANCH || null;

// Authoritative branch checkout — runs before anything else.
if (ALLOWED_BRANCH) {
  try {
    execSync(`git fetch origin ${ALLOWED_BRANCH}`, { cwd: "/vercel/sandbox", stdio: "pipe" });
    execSync(`git checkout ${ALLOWED_BRANCH}`, { cwd: "/vercel/sandbox", stdio: "pipe" });
    console.log(`[agent-server] On branch: ${ALLOWED_BRANCH}`);
  } catch (e) {
    console.error(`[agent-server] Failed to checkout '${ALLOWED_BRANCH}':`, e.message);
  }
}

const app = express();
app.use(cors());
app.use(express.json({ limit: '20mb' }));

// In-memory message log
const messages = [];

function sendSSE(res, data) {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

// Track the current running query so we can interrupt it
let currentQuery = null;
let activeRes = null;
// After a stop, start a fresh session (don't continue the interrupted one)
let freshSession = true;

// Build a prompt for query() — string for text-only, AsyncIterable for attachments
function makePrompt(message, attachments) {
  if (!attachments || attachments.length === 0) return message;

  const content = [];
  for (const att of attachments) {
    if (att.mediaType.startsWith('image/')) {
      content.push({ type: 'image', source: { type: 'base64', media_type: att.mediaType, data: att.data } });
    } else {
      const decoded = Buffer.from(att.data, 'base64').toString('utf-8').slice(0, 20000);
      content.push({ type: 'text', text: `[File: ${att.name}]\n${decoded}` });
    }
  }
  if (message) content.push({ type: 'text', text: message });

  return (async function* () {
    yield {
      type: 'user',
      message: { role: 'user', content },
      parent_tool_use_id: null,
    };
  })();
}

app.get("/messages", (_req, res) => {
  res.json(messages);
});

app.post("/stop", async (_req, res) => {
  if (currentQuery) {
    await currentQuery.interrupt();
  }
  res.json({ ok: true });
});

app.post("/message", async (req, res) => {
  const { message, attachments = [] } = req.body;

  messages.push({ role: "user", content: message || "(attachment)" });

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  activeRes = res;

  const heartbeat = setInterval(() => res.write(": ping\n\n"), 15000);

  let assistantText = "";

  try {
    const useContinue = !freshSession;
    freshSession = false;

    currentQuery = query({
      prompt: makePrompt(message, attachments),
      options: {
        model: "claude-sonnet-4-6",
        permissionMode: "auto",
        allowedTools: ["Read", "Edit", "Write", "Bash", "Glob", "Grep", "WebFetch"],
        cwd: "/vercel/sandbox",
        ...(useContinue ? { continue: true } : {}),
      },
    });

    for await (const msg of currentQuery) {
      switch (msg.type) {
        case "assistant": {
          const text = msg.message.content
            .filter((b) => b.type === "text")
            .map((b) => b.text)
            .join("");
          if (text) {
            assistantText += text;
            sendSSE(res, { type: "text", content: text });
          }
          for (const block of msg.message.content) {
            if (block.type === "tool_use") {
              sendSSE(res, { type: "tool_start", tool: block.name, id: block.id });
            }
          }
          break;
        }

        case "tool_progress":
          sendSSE(res, { type: "tool_progress", tool: msg.tool_name, id: msg.tool_use_id, elapsed: msg.elapsed_time_seconds });
          break;

        case "tool_use_summary":
          sendSSE(res, { type: "tool_done", summary: msg.summary });
          break;

        case "result":
          if (msg.subtype === "success") {
            try {
              const currentBranch = execSync("git rev-parse --abbrev-ref HEAD", { cwd: "/vercel/sandbox" })
                .toString()
                .trim();

              if (ALLOWED_BRANCH && currentBranch !== ALLOWED_BRANCH) {
                console.warn(`[agent-server] Skipping push: on '${currentBranch}', expected '${ALLOWED_BRANCH}'`);
              } else {
                const madeChanges = (() => {
                  try {
                    execSync("git diff --quiet HEAD", { cwd: "/vercel/sandbox" });
                    return false;
                  } catch {
                    return true;
                  }
                })();

                if (madeChanges) {
                  execSync("git add -A", { cwd: "/vercel/sandbox" });
                  execSync(`git commit -m "${message.replace(/"/g, '\\"').replace(/`/g, "\\`").replace(/\$/g, "\\$")}"`, { cwd: "/vercel/sandbox" });
                  execSync("git push", { cwd: "/vercel/sandbox" });
                  sendSSE(res, { type: "saved" });
                }
              }
            } catch (e) {
              // commit/push errors are non-fatal
            }
          }
          sendSSE(res, { type: "done", result: msg.subtype });
          break;
      }
    }

    if (assistantText) {
      messages.push({ role: "assistant", content: assistantText });
    }
  } catch (err) {
    const isInterrupt = err?.message?.includes('aborted') || err?.message?.includes('interrupt') || err?.message?.includes('ede_diagnostic');
    if (isInterrupt) {
      sendSSE(res, { type: "stopped" });
    } else {
      sendSSE(res, { type: "error", message: err.message });
    }
  } finally {
    currentQuery = null;
    activeRes = null;
    clearInterval(heartbeat);
    res.end();
  }
});

app.listen(PORT, () => console.log(`Agent server on :${PORT}`));
