const API_BASE_URL = "http://localhost:8000";

export async function sendMessage(message: string): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message }),
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
