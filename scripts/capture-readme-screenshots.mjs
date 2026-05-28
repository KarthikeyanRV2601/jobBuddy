import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

const appUrl = process.env.JOBBUDDY_SCREENSHOT_URL ?? "http://localhost:5173/";
const chromePath =
  process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const outputDir = new URL("../docs/screenshots/", import.meta.url);
const viewport = { width: 1280, height: 720 };

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const requestJson = async (url) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed: ${url} (${response.status})`);
  }

  return response.json();
};

const createPageTarget = async (port) => {
  const response = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, {
    method: "PUT",
  });
  if (!response.ok) {
    throw new Error(`Unable to create Chrome page target (${response.status})`);
  }

  return response.json();
};

const send = (socket, method, params = {}) =>
  new Promise((resolve, reject) => {
    const id = send.nextId++;
    const handleMessage = (event) => {
      const message = JSON.parse(event.data.toString());
      if (message.id !== id) {
        return;
      }

      socket.removeEventListener("message", handleMessage);
      if (message.error !== undefined) {
        reject(new Error(`${method}: ${message.error.message}`));
        return;
      }

      resolve(message.result);
    };

    socket.addEventListener("message", handleMessage);
    socket.send(JSON.stringify({ id, method, params }));
  });
send.nextId = 1;

const evaluate = async (socket, expression) => {
  const result = await send(socket, "Runtime.evaluate", {
    awaitPromise: true,
    expression,
    returnByValue: true,
  });

  if (result.exceptionDetails !== undefined) {
    throw new Error(
      result.exceptionDetails.exception?.description ??
        result.exceptionDetails.text ??
        "Runtime evaluation failed",
    );
  }

  return result.result.value;
};

const clickButton = async (socket, label, index = 0) => {
  await evaluate(
    socket,
    `(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const matches = buttons.filter((button) => {
        const text = button.textContent.trim();
        return text === ${JSON.stringify(label)} || text.includes(${JSON.stringify(label)});
      });
      if (matches.length <= ${index}) {
        throw new Error("Button not found: ${label}");
      }
      matches[${index}].click();
    })()`,
  );
  await delay(220);
};

const capture = async (socket, fileName) => {
  const { data } = await send(socket, "Page.captureScreenshot", {
    captureBeyondViewport: false,
    format: "png",
  });
  await writeFile(new URL(fileName, outputDir), Buffer.from(data, "base64"));
};

const launchChrome = async (userDataDir, port) => {
  const chrome = spawn(chromePath, [
    "--headless=new",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    "--hide-scrollbars",
    "--no-first-run",
    "--no-default-browser-check",
    `--window-size=${viewport.width},${viewport.height}`,
    "about:blank",
  ]);

  chrome.stderr.setEncoding("utf8");
  chrome.stderr.on("data", (chunk) => {
    if (chunk.includes("DevTools listening")) {
      return;
    }
    process.stderr.write(chunk);
  });

  return chrome;
};

const main = async () => {
  await mkdir(outputDir, { recursive: true });
  const userDataDir = await mkdtemp(join(tmpdir(), "jobbuddy-screenshots-"));
  const port = 9333 + Math.floor(Math.random() * 400);
  const chrome = await launchChrome(userDataDir, port);

  try {
    let version;
    for (let attempt = 0; attempt < 50; attempt += 1) {
      try {
        version = await requestJson(`http://127.0.0.1:${port}/json/version`);
        break;
      } catch {
        await delay(100);
      }
    }

    if (version === undefined) {
      throw new Error("Chrome DevTools did not start.");
    }

    const target = await createPageTarget(port);
    const socket = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      socket.addEventListener("open", resolve, { once: true });
      socket.addEventListener("error", reject, { once: true });
    });

    await send(socket, "Page.enable");
    await send(socket, "Runtime.enable");
    await send(socket, "Emulation.setDeviceMetricsOverride", {
      deviceScaleFactor: 1,
      height: viewport.height,
      mobile: false,
      width: viewport.width,
    });
    await send(socket, "Page.navigate", { url: appUrl });
    for (let attempt = 0; attempt < 50; attempt += 1) {
      const readyState = await evaluate(socket, "document.readyState");
      if (readyState === "complete") {
        break;
      }
      await delay(100);
    }
    await delay(500);

    await capture(socket, "dashboard-empty-sync.png");
    await clickButton(socket, "Edit");
    await capture(socket, "gmail-query-editor.png");
    await clickButton(socket, "Cancel");

    await clickButton(socket, "Tracker");
    await clickButton(socket, "Load sample");
    await capture(socket, "tracker-sample-table.png");

    await clickButton(socket, "Skills");
    await capture(socket, "skill-note-popup.png");
    await clickButton(socket, "Cancel");

    await clickButton(socket, "Edit");
    await capture(socket, "application-edit-popup.png");

    socket.close();
  } finally {
    chrome.kill();
    await delay(250);
    await rm(userDataDir, {
      force: true,
      maxRetries: 3,
      recursive: true,
      retryDelay: 150,
    });
  }
};

await main();
