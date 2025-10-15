import React, { useState, useEffect } from "react";
import { Box, Text } from "ink";
import MessageList from "./MessageList.js";
import Input from "./Input.js";

export default function App({ sendMessage, roomName, handlers }) {
  const [messages, setMessages] = useState([]);
  const [peerCount, setPeerCount] = useState(0);
  const [username] = useState(
    () => `user-${Math.random().toString(36).slice(2, 6)}`,
  );

  // Register handlers ONCE on mount
  useEffect(() => {
    console.log("📝 Registering handlers");

    handlers.message = (message) => {
      console.log("App received message:", message);
      setMessages((prev) => [...prev, message]);
    };

    handlers.peer = (count) => {
      console.log("Peer count:", count);
      setPeerCount(count);
    };

    return () => {
      handlers.message = null;
      handlers.peer = null;
    };
  }, [handlers]);

  const handleSend = (text) => {
    if (text.trim()) {
      sendMessage(text.trim(), username);
    }
  };

  return (
    <Box flexDirection="column" height="100%" width="100%">
      <Box borderStyle="round" borderColor="cyan" paddingX={1}>
        <Text color="cyan">
          Room: {roomName} | Peers: {peerCount} | You: {username}
        </Text>
      </Box>
      <Box flexGrow={1} flexDirection="column" paddingX={1} paddingY={1}>
        {peerCount === 0 && (
          <Box marginBottom={1}>
            <Text color="yellow">⏳ Waiting for peers to connect...</Text>
          </Box>
        )}
        <MessageList messages={messages} />
      </Box>
      <Box borderStyle="single" borderColor="gray" paddingX={1}>
        <Input onSubmit={handleSend} />
      </Box>
    </Box>
  );
}
