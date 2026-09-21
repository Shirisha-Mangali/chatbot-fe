import type { Attachment, Conversation, Message } from "../types/message";

const API_BASE_URL = "http://localhost:8000";

export async function listConversations(): Promise<Conversation[]> {
  const response = await fetch(`${API_BASE_URL}/api/conversations`);

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return response.json();
}

export async function createConversation(): Promise<Conversation> {
  const response = await fetch(`${API_BASE_URL}/api/conversations`, {
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return response.json();
}

export async function fetchHistory(conversationId: string): Promise<Message[]> {
  const response = await fetch(`${API_BASE_URL}/api/conversations/${conversationId}/messages`);

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return response.json();
}

export async function sendMessage(
  conversationId: string,
  message: string,
  attachment?: Attachment
): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/api/conversations/${conversationId}/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message, attachment }),
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  const data = await response.json();

  if (typeof data.reply !== "string") {
    throw new Error("Unexpected response format from server.");
  }

  return data.reply;
}
