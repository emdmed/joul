import Hyperswarm from "hyperswarm";
import crypto from "crypto";
import b4a from "b4a";

export async function initSwarm(roomName, messageHandler, peerHandler) {
  const swarm = new Hyperswarm();
  const topic = crypto.createHash("sha256").update(roomName).digest();

  console.log(
    "Joining swarm with topic:",
    b4a.toString(topic, "hex").slice(0, 16),
  );

  const peers = new Map();

  // Queue messages until peers connect
  const messageQueue = [];
  let isReady = false;

  swarm.on("connection", (conn, info) => {
    const peerId = b4a.toString(info.publicKey, "hex").slice(0, 8);
    console.log("🎉 NEW PEER CONNECTED:", peerId);

    peers.set(peerId, conn);
    console.log("   Total peers:", peers.size);

    // Mark as ready and flush queue
    if (!isReady && peers.size > 0) {
      isReady = true;
      console.log("✅ First peer connected! Flushing message queue...");
      // Send any queued messages
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
        console.log("✅ Received:", message);

        if (messageHandler) {
          messageHandler({
            ...message,
            peerId,
          });
        }
      } catch (err) {
        console.error("❌ Parse error:", err.message);
      }
    });

    conn.on("close", () => {
      console.log("👋 Peer disconnected:", peerId);
      peers.delete(peerId);
      if (peers.size === 0) {
        isReady = false;
      }
      if (peerHandler) {
        peerHandler(peers.size);
      }
    });

    conn.on("error", (err) => {
      console.error("⚠️  Connection error:", err.message);
    });
  });

  // Join with both client and server
  const discovery = swarm.join(topic, { client: true, server: true });
  await discovery.flushed();

  console.log("✅ Discovery flushed, waiting for connections...");

  // Give peers time to discover each other (important for P2P)
  await new Promise((resolve) => setTimeout(resolve, 2000));

  function sendMessageNow(text, username) {
    const message = {
      text,
      username,
      timestamp: Date.now(),
    };

    const data = Buffer.from(JSON.stringify(message));

    for (const [peerId, conn] of peers.entries()) {
      if (conn.writable && !conn.destroyed) {
        try {
          conn.write(data);
        } catch (err) {
          console.error("❌ Send failed:", err.message);
        }
      }
    }
  }

  function sendMessage(text, username) {
    console.log("📤 sendMessage:", text, "peers:", peers.size);

    if (!isReady || peers.size === 0) {
      console.log("⏳ No peers yet, queueing message");
      messageQueue.push({ text, username });
      // Show message locally anyway
      if (messageHandler) {
        messageHandler({
          text,
          username,
          timestamp: Date.now(),
          peerId: "you",
        });
      }
      return;
    }

    sendMessageNow(text, username);

    // Show message locally
    if (messageHandler) {
      messageHandler({
        text,
        username,
        timestamp: Date.now(),
        peerId: "you",
      });
    }
  }

  return { swarm, topic, sendMessage, getPeerCount: () => peers.size };
}
