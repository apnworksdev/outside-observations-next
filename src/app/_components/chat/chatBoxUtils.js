export const DEFAULT_FIRST_MESSAGE = `Welcome to Outside Observations®. We're glad you're here.

Use the menu on the left to explore, or tell me what you're looking for and I'll point you in the right direction.`;

export function toOrderedUniqueIds(itemIds) {
  const orderedUniqueIds = [];
  const seenIds = new Set();
  for (let index = 0; index < itemIds.length; index += 1) {
    const id = itemIds[index];
    if (!seenIds.has(id)) {
      seenIds.add(id);
      orderedUniqueIds.push(id);
    }
  }
  return orderedUniqueIds;
}

export function createArchiveSearchPayload(itemIds, searchQuery) {
  const orderedUniqueIds = toOrderedUniqueIds(itemIds);
  return {
    resultsState:
      orderedUniqueIds.length > 0
        ? { active: true, ids: orderedUniqueIds, orderedIds: orderedUniqueIds }
        : { active: true, ids: [], orderedIds: [] },
    statusState: {
      status: 'success',
      query: searchQuery,
      summary: {
        original: searchQuery,
        rewritten: searchQuery,
        matches: orderedUniqueIds.length,
        threshold: 0.1,
      },
      error: null,
    },
  };
}

export function buildConversationPayload(messages, userMessage, maxLength = 9500) {
  const historyParts = messages
    .filter(
      (m) =>
        !m.isImageMessage &&
        !m.isError &&
        m.text != null &&
        String(m.text).trim().length > 0
    )
    .map((m) => {
      const text = String(m.text).trim();
      const prefix = m.sender === 'user' ? 'user:' : 'bot:';
      return `${prefix} ${text}`;
    });
  const currentLine = `user: ${userMessage}`;
  let fullConversation = [...historyParts, currentLine].join('\n\n');
  if (fullConversation.length > maxLength) {
    fullConversation = fullConversation.slice(-maxLength);
  }
  return fullConversation;
}

export function resolveChatErrorMessage(error) {
  let errorMessage = 'Sorry, I encountered an error. Please try again.';
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return 'Unable to connect to the server. Please check your internet connection and try again.';
  }
  if (error?.message) {
    const message = error.message.toLowerCase();
    if (message.includes('network') || message.includes('fetch')) {
      return 'Network error. Please check your connection and try again.';
    }
    if (message.includes('timeout')) {
      return 'Request timed out. Please try again.';
    }
    if (message.length < 100) {
      return error.message;
    }
  }
  return errorMessage;
}
