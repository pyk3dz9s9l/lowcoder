// UPDATED MessageSent Query Code
// Replaces broadcastNewMessage with setRoomData

const currentRoomId = chatControllerSignal1.currentRoomId;
const rooms = chatControllerSignal1.sharedState?.rooms || [];
const currentRoom = rooms.find(r => r.id === currentRoomId);

console.log("CURRENT ROOM", currentRoom);

saveMessage.run()
  .then(() => {
    // Check if current room is an LLM room
    if (currentRoom && currentRoom.type === 'llm') {
      console.log("STARTING AI THINKING...");
      // Broadcast to all users: AI is thinking
      chatControllerSignal1.setAiThinking(currentRoomId, true);
      return getAIResponse.run();
    }
  })
  .then(() => {
    // AI finished - stop thinking animation
    if (currentRoom && currentRoom.type === 'llm') {
      console.log("AI THINKING STOPPED");
      chatControllerSignal1.setAiThinking(currentRoomId, false);
    }
    
    // NEW: Signal other users that a message was saved
    // This triggers their "Room Data Changed" event which reloads messages
    chatControllerSignal1.setRoomData(currentRoomId, "lastMessage", {
      ts: Date.now(),
      authorId: chatControllerSignal1.userId
    });
    
    // Reload your own messages
    return loadMessages.run();
  })
  .catch(err => {
    // Stop thinking on error so it doesn't get stuck
    if (currentRoom && currentRoom.type === 'llm') {
      chatControllerSignal1.setAiThinking(currentRoomId, false);
    }
    console.error("Error:", err);
  });
