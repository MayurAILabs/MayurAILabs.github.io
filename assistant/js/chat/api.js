import { consumeSse } from "../utils/sse.js";

// Posts to the assistant endpoint and streams the reply.
// history entries must be { role: 'user'|'assistant', content: string }.
export async function sendMessage({ endpoint, message, history }, { onDelta, onDone, onError }) {
  let response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message, history }),
    });
  } catch {
    onError("Couldn't reach the assistant. Check your connection and try again.");
    return;
  }

  if (!response.ok) {
    let errorMessage = "Something went wrong. Please try again.";
    try {
      const data = await response.json();
      if (data?.error) errorMessage = data.error;
    } catch {
      // ignore
    }
    onError(errorMessage);
    return;
  }

  let sawDone = false;
  await consumeSse(response, (evt) => {
    if (evt.delta) onDelta(evt.delta);
    else if (evt.error) onError(evt.error);
    else if (evt.done) {
      sawDone = true;
      onDone();
    }
  });
  if (!sawDone) onDone();
}
