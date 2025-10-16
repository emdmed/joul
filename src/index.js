import { render } from "ink";
import React from "react";
import App from "./ui/App.js";
import { initSwarm } from "./network/swarm.js";

const roomName = process.argv[2] || "default-room";

// Create handler storage
const handlers = {
  message: null,
  peer: null,
};

console.log("🚀 Starting app for room:", roomName);

const { swarm, topic, sendMessage, getPeerCount } = await initSwarm(
  roomName,
  (msg) => handlers.message?.(msg),
  (count) => handlers.peer?.(count),
);

// Render the app
const { unmount, waitUntilExit } = render(
  <App
    swarm={swarm}
    topic={topic}
    sendMessage={sendMessage}
    roomName={roomName}
    handlers={handlers}
  />

);

const cleanup = () => {
  console.log("🧹 Cleaning up...");
  swarm.destroy();
  unmount();
  process.exit(0);
};

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);

await waitUntilExit();
cleanup();
