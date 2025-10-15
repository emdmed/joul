import Hyperswarm from "hyperswarm";
import crypto from "crypto";
import b4a from "b4a";

export async function initSwarm(roomName, messageHandler, peerHandler) {
  const swarm = new Hyperswarm();
  const topic = crypto.createHash("sha256").update(roomName).digest();

  console.log("🔑 Topic hash:", b4a.toString(topic, "hex"));
  console.log("📍 Room name:", roomName);

  const peers = new Map();
  const messageQueue = [];
  let isReady = false;

  swarm.on("connection", (conn, info) => {
    const peerId = b4a.toString(info.publicKey, "hex").slice(0, 8);
    console.log("\n🎉 NEW PEER CONNECTED:", peerId);
    console.log("   Initiator:", info.client ? "Yes (client)" : "No (server)");

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

    // Send a handshake message to confirm connection
    const handshake = {
      type: "handshake",
      peerId: "self",
      timestamp: Date.now(),
    };
    conn.write(Buffer.from(JSON.stringify(handshake)));

    conn.on("data", (data) => {
      try {
        const message = JSON.parse(data.toString());
        console.log(
          "📨 Received from",
          peerId + ":",
          message.type || "message",
        );

        // Handle handshake separately
        if (message.type === "handshake") {
          console.log("🤝 Handshake received from", peerId);
          return;
        }

        if (messageHandler) {
          messageHandler({
            ...message,
            peerId,
          });
        }
      } catch (err) {
        console.error("❌ Parse error:", err.message);
        console.error("   Raw data:", data.toString());
      }
    });

    conn.on("close", () => {
      console.log("👋 Peer disconnected:", peerId);
      peers.delete(peerId);
      if (peers.size === 0) {
        isReady = false;
        console.log("⚠️  No peers connected");
      }
      if (peerHandler) {
        peerHandler(peers.size);
      }
    });

    conn.on("error", (err) => {
      console.error("⚠️  Connection error with", peerId + ":", err.message);
      // Don't remove peer immediately on error, let close event handle it
    });
  });

  // Important: Join as both client and server for bidirectional discovery
  console.log("🔍 Starting discovery...");
  const discovery = swarm.join(topic, {
    client: true,
    server: true,
    // Add announce and lookup explicitly
    announce: true,
    lookup: true,
  });

  // Wait for the discovery to be fully flushed
  await discovery.flushed();
  console.log("✅ Discovery flushed - actively looking for peers");

  // Log discovery events for debugging
  swarm.on("update", () => {
    console.log("🔄 Discovery update event");
  });

  // Add periodic status check for debugging
  const statusInterval = setInterval(() => {
    if (peers.size === 0) {
      console.log(
        "⏳ Still waiting for peers... (ensure both clients use same room name)",
      );
    }
  }, 5000);

  function sendMessageNow(text, username) {
    const message = {
      text,
      username,
      timestamp: Date.now(),
    };

    const data = Buffer.from(JSON.stringify(message));
    let sentCount = 0;

    for (const [peerId, conn] of peers.entries()) {
      if (conn.writable && !conn.destroyed) {
        try {
          conn.write(data);
          sentCount++;
          console.log("✉️  Sent to peer:", peerId);
        } catch (err) {
          console.error("❌ Send failed to", peerId + ":", err.message);
        }
      } else {
        console.warn("⚠️  Peer", peerId, "not writable");
      }
    }

    console.log(`📤 Message sent to ${sentCount}/${peers.size} peers`);
  }

  function sendMessage(text, username) {
    console.log("\n📤 Sending message:", text);
    console.log("   Current peers:", peers.size);

    if (!isReady || peers.size === 0) {
      console.log("⏳ No peers connected, queueing message");
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

  // Cleanup function
  function destroy() {
    clearInterval(statusInterval);
    swarm.leave(topic);
    swarm.destroy();
  }

  return {
    swarm,
    topic,
    sendMessage,
    getPeerCount: () => peers.size,
    destroy,
  };
}
