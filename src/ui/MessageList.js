import React from "react";
import { Box, Text } from "ink";

export default function MessageList({ messages }) {
  // Show last 20 messages to avoid memory issues
  const recentMessages = messages.slice(-20);

  return (
    <Box flexDirection="column">
      {recentMessages.length === 0 ? (
        <Text color="gray">No messages yet. Start chatting!</Text>
      ) : (
        recentMessages.map((msg, i) => {
          const time = new Date(msg.timestamp).toLocaleTimeString();
          const isYou = msg.peerId === "you";

          return (
            <Box key={i} marginY={0}>
              <Text color="gray">[{time}] </Text>
              <Text color={isYou ? "green" : "blue"}>{msg.username}</Text>
              <Text color="gray">: </Text>
              <Text>{msg.text}</Text>
            </Box>
          );
        })
      )}
    </Box>
  );
}
