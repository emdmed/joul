import React, { useState, useEffect } from "react";
import { Box, Text } from "ink";
import MessageList from "./MessageList.js";
import Input from "./Input.js";
import { useScreenSize } from "../hooks/useScreenSize.js";

export default function App({ sendMessage, roomName, handlers }) {
  const [messages, setMessages] = useState([]);
  const [peerCount, setPeerCount] = useState(0);
  const [username] = useState(
    () => `user-${Math.random().toString(36).slice(2, 6)}`,
  );

  const size = useScreenSize()

  console.log("SIZE", size)

  // Register handlers ONCE on mount
  useEffect(() => {
    handlers.message = (message) => {
      setMessages((prev) => [...prev, message]);
    };

    handlers.peer = (count) => {
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
    <Box flexDirection="column" borderStyle="round" borderColor="green" padding={1} height={size.height} width={size.width}>
      <Box gap={1}>
        <Text>{">"}</Text>
        <Text inverse color="green">{" "}{username}{" "}</Text>
        <Text>Room:</Text>
        <Text color="green" inverse>
          {" "}{roomName}{" "}
        </Text>
        <Text> Peers: {peerCount}</Text>
      </Box>
      <Box flexGrow={1} paddingTop={1} flexDirection="column">
        <MessageList messages={messages} />
      </Box>
      <Box borderStyle="single" borderTop={false} borderLeft={false} borderRight={false} borderColor="green">
        <Input onSubmit={handleSend} />
      </Box>
    </Box>
  );
}
