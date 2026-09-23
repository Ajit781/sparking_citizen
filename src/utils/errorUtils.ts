/**
 * Utility function to extract a clean, user-friendly error message
 * from any error object, string, or API response.
 */
export const getErrorMessage = (error: any, fallbackMessage: string = 'Something went wrong. Please try again.'): string => {
  if (!error) return fallbackMessage;

  // If it's a string, it might be raw text or stringified JSON
  if (typeof error === 'string') {
    // If it looks like HTML, return fallback to avoid showing huge raw HTML
    if (error.trim().startsWith('<') || error.toLowerCase().includes('<html>')) {
      return fallbackMessage;
    }

    try {
      // Maybe it's stringified JSON?
      const parsed = JSON.parse(error);
      if (parsed.message) return parsed.message;
      if (parsed.error) return parsed.error;
    } catch (e) {
      // Just a normal string
      return error;
    }
    return error;
  }

  // If it's an Error object (e.g., thrown by apiClient)
  if (error instanceof Error) {
    const msg = error.message;
    if (msg.trim().startsWith('<') || msg.toLowerCase().includes('<html>') || msg.toLowerCase().includes('request failed with http status')) {
      return fallbackMessage;
    }
    return msg;
  }

  // If it's an object with a message field
  if (error.message) {
    return typeof error.message === 'string' ? error.message : fallbackMessage;
  }

  // If it's an object with an error field
  if (error.error) {
    return typeof error.error === 'string' ? error.error : fallbackMessage;
  }

  return fallbackMessage;
};
