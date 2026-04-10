// agent-server.mjs
// Runs INSIDE the Vercel Sandbox — has direct filesystem access

import express from "express";
import cors from "cors";
import { execSync } from "child_process";
import { unstable_v2_createSession } from "@anthropic-ai/claude-agent-sdk";
import "dotenv/config";

const PORT = 4000;

// If SANDBOX_BRANCH is set, the agent must stay on that branch.
// When absent (internal use), any branch is allowed.
const ALLOWED_BRANCH = process.env.SANDBOX_BRANCH || null;

// Authoritative branch checkout — runs before anything else.
// The sandbox setup already tries this, but can race against git fetch.
// Doing it here guarantees we're on the right branch before the first message.
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
app.use(express.json());

// In-memory message log
const messages = [];

// One session per sandbox lifetime (persists conversation across messages)
const session = unstable_v2_createSession({
  model: "claude-sonnet-4-6",
  permissionMode: "auto",
  allowedTools: ["Read", "Edit", "Write", "Bash", "Glob", "Grep", "WebFetch"],
});

function sendSSE(res, data) {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

app.get("/messages", (_req, res) => {
  res.json(messages);
});



app.post("/message", async (req, res) => {
  const { message, attachments = [] } = req.body;

  // Log user message
  messages.push({ role: "user", content: message || "(attachment)" });

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  // Keep connection alive during long operations (proxies kill idle SSE streams)
  const heartbeat = setInterval(() => res.write(": ping\n\n"), 15000);

  let assistantText = "";

  try {
    // Build content array when attachments are present
    let sendArg = message;
    if (attachments.length > 0) {
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
      sendArg = content;
    }

    // Start streaming before sending so we don't miss events
    const stream = session.stream();
    await session.send(sendArg);

    for await (const msg of stream) {
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
          // Auto-commit and push on success
          if (msg.subtype === "success") {
            try {
              // Branch protection: only push to the allowed branch
              const currentBranch = execSync("git rev-parse --abbrev-ref HEAD", { cwd: "/vercel/sandbox" })
                .toString()
                .trim();

              if (ALLOWED_BRANCH && currentBranch !== ALLOWED_BRANCH) {
                // Silently skip — do not push to an unintended branch
                console.warn(`[agent-server] Skipping push: on '${currentBranch}', expected '${ALLOWED_BRANCH}'`);
              } else {
                execSync("git add -A", { cwd: "/vercel/sandbox" });
                execSync(`git commit -m "${message.replace(/"/g, '\\"').replace(/`/g, "\\`").replace(/\$/g, "\\$")}"`, { cwd: "/vercel/sandbox" });
                execSync("git push", { cwd: "/vercel/sandbox" });
                sendSSE(res, { type: "saved" });
              }
            } catch (e) {
              // No changes to commit is fine
            }
          }
          sendSSE(res, { type: "done", result: msg.subtype });
          break;
      }
    }

    // Log the full assistant reply
    if (assistantText) {
      messages.push({ role: "assistant", content: assistantText });
    }
  } catch (err) {
    sendSSE(res, { type: "error", message: err.message });
  } finally {
    clearInterval(heartbeat);
    res.end();
  }
});


app.listen(PORT, () => console.log(`Agent server on :${PORT}`));
