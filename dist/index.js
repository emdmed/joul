// src/index.js
import { render } from "ink";
import React4 from "react";

// src/ui/App.js
import React3, { useState as useState2, useEffect } from "react";
import { Box as Box3, Text as Text3 } from "ink";

// src/ui/MessageList.js
import React from "react";
import { Box, Text } from "ink";
function MessageList({ messages }) {
  const recentMessages = messages.slice(-20);
  return /* @__PURE__ */ React.createElement(Box, { flexDirection: "column" }, recentMessages.length === 0 ? /* @__PURE__ */ React.createElement(Text, { color: "gray" }, "No messages yet. Start chatting!") : recentMessages.map((msg, i) => {
    const time = new Date(msg.timestamp).toLocaleTimeString();
    const isYou = msg.peerId === "you";
    return /* @__PURE__ */ React.createElement(Box, { key: i, marginY: 0 }, /* @__PURE__ */ React.createElement(Text, { color: "gray" }, "[", time, "] "), /* @__PURE__ */ React.createElement(Text, { color: isYou ? "green" : "blue" }, msg.username), /* @__PURE__ */ React.createElement(Text, { color: "gray" }, ": "), /* @__PURE__ */ React.createElement(Text, null, msg.text));
  }));
}

// src/ui/Input.js
import React2, { useState } from "react";
import { Box as Box2, Text as Text2, useInput } from "ink";
function Input({ onSubmit }) {
  const [input, setInput] = useState("");
  useInput((inputChar, key) => {
    if (key.return) {
      onSubmit(input);
      setInput("");
    } else if (key.backspace || key.delete) {
      setInput(input.slice(0, -1));
    } else if (!key.ctrl && !key.meta && inputChar) {
      setInput(input + inputChar);
    }
  });
  return /* @__PURE__ */ React2.createElement(Box2, null, /* @__PURE__ */ React2.createElement(Text2, { color: "yellow" }, "> "), /* @__PURE__ */ React2.createElement(Text2, null, input), /* @__PURE__ */ React2.createElement(Text2, { color: "gray" }, "\u2588"));
}

// src/ui/App.js
function App({ sendMessage: sendMessage2, roomName: roomName2, handlers: handlers2 }) {
  const [messages, setMessages] = useState2([]);
  const [peerCount, setPeerCount] = useState2(0);
  const [username] = useState2(
    () => `user-${Math.random().toString(36).slice(2, 6)}`
  );
  useEffect(() => {
    console.log("\u{1F4DD} Registering handlers");
    handlers2.message = (message) => {
      console.log("App received message:", message);
      setMessages((prev) => [...prev, message]);
    };
    handlers2.peer = (count) => {
      console.log("Peer count:", count);
      setPeerCount(count);
    };
    return () => {
      handlers2.message = null;
      handlers2.peer = null;
    };
  }, [handlers2]);
  const handleSend = (text) => {
    if (text.trim()) {
      sendMessage2(text.trim(), username);
    }
  };
  return /* @__PURE__ */ React3.createElement(Box3, { flexDirection: "column", height: "100%", width: "100%" }, /* @__PURE__ */ React3.createElement(Box3, { borderStyle: "round", borderColor: "cyan", paddingX: 1 }, /* @__PURE__ */ React3.createElement(Text3, { color: "cyan" }, "Room: ", roomName2, " | Peers: ", peerCount, " | You: ", username)), /* @__PURE__ */ React3.createElement(Box3, { flexGrow: 1, flexDirection: "column", paddingX: 1, paddingY: 1 }, peerCount === 0 && /* @__PURE__ */ React3.createElement(Box3, { marginBottom: 1 }, /* @__PURE__ */ React3.createElement(Text3, { color: "yellow" }, "\u23F3 Waiting for peers to connect...")), /* @__PURE__ */ React3.createElement(MessageList, { messages })), /* @__PURE__ */ React3.createElement(Box3, { borderStyle: "single", borderColor: "gray", paddingX: 1 }, /* @__PURE__ */ React3.createElement(Input, { onSubmit: handleSend })));
}

// src/network/swarm.js
import Hyperswarm from "hyperswarm";
import crypto from "crypto";
import b4a from "b4a";
async function initSwarm(roomName2, messageHandler, peerHandler) {
  const swarm2 = new Hyperswarm();
  const topic2 = crypto.createHash("sha256").update(roomName2).digest();
  console.log(
    "Joining swarm with topic:",
    b4a.toString(topic2, "hex").slice(0, 16)
  );
  const peers = /* @__PURE__ */ new Map();
  const messageQueue = [];
  let isReady = false;
  swarm2.on("connection", (conn, info) => {
    const peerId = b4a.toString(info.publicKey, "hex").slice(0, 8);
    console.log("\u{1F389} NEW PEER CONNECTED:", peerId);
    peers.set(peerId, conn);
    console.log("   Total peers:", peers.size);
    if (!isReady && peers.size > 0) {
      isReady = true;
      console.log("\u2705 First peer connected! Flushing message queue...");
      messageQueue.forEach(({ text, username }) => {
        sendMessageNow(text, username);
      });
      messageQueue.length = 0;
    }
    if (peerHandler) {
      peerHandler(peers.size);
    }
    conn.on("data", (data) => {
      try {
        const message = JSON.parse(data.toString());
        console.log("\u2705 Received:", message);
        if (messageHandler) {
          messageHandler({
            ...message,
            peerId
          });
        }
      } catch (err) {
        console.error("\u274C Parse error:", err.message);
      }
    });
    conn.on("close", () => {
      console.log("\u{1F44B} Peer disconnected:", peerId);
      peers.delete(peerId);
      if (peers.size === 0) {
        isReady = false;
      }
      if (peerHandler) {
        peerHandler(peers.size);
      }
    });
    conn.on("error", (err) => {
      console.error("\u26A0\uFE0F  Connection error:", err.message);
    });
  });
  const discovery = swarm2.join(topic2, { client: true, server: true });
  await discovery.flushed();
  console.log("\u2705 Discovery flushed, waiting for connections...");
  await new Promise((resolve) => setTimeout(resolve, 2e3));
  function sendMessageNow(text, username) {
    const message = {
      text,
      username,
      timestamp: Date.now()
    };
    const data = Buffer.from(JSON.stringify(message));
    for (const [peerId, conn] of peers.entries()) {
      if (conn.writable && !conn.destroyed) {
        try {
          conn.write(data);
        } catch (err) {
          console.error("\u274C Send failed:", err.message);
        }
      }
    }
  }
  function sendMessage2(text, username) {
    console.log("\u{1F4E4} sendMessage:", text, "peers:", peers.size);
    if (!isReady || peers.size === 0) {
      console.log("\u23F3 No peers yet, queueing message");
      messageQueue.push({ text, username });
      if (messageHandler) {
        messageHandler({
          text,
          username,
          timestamp: Date.now(),
          peerId: "you"
        });
      }
      return;
    }
    sendMessageNow(text, username);
    if (messageHandler) {
      messageHandler({
        text,
        username,
        timestamp: Date.now(),
        peerId: "you"
      });
    }
  }
  return { swarm: swarm2, topic: topic2, sendMessage: sendMessage2, getPeerCount: () => peers.size };
}

// src/index.js
var roomName = process.argv[2] || "default-room";
var handlers = {
  message: null,
  peer: null
};
console.log("\u{1F680} Starting app for room:", roomName);
var { swarm, topic, sendMessage, getPeerCount } = await initSwarm(
  roomName,
  (msg) => handlers.message?.(msg),
  (count) => handlers.peer?.(count)
);
var { unmount, waitUntilExit } = render(
  /* @__PURE__ */ React4.createElement(
    App,
    {
      swarm,
      topic,
      sendMessage,
      roomName,
      handlers
    }
  )
);
var cleanup = () => {
  console.log("\u{1F9F9} Cleaning up...");
  swarm.destroy();
  unmount();
  process.exit(0);
};
process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);
await waitUntilExit();
cleanup();
