/**
 * LSP Client utilities for communicating with language server
 */

class LSPClient {
  constructor() {
    // Use current host for API calls (works in both dev and Docker)
    this.serverUrl = '/api';
    this.initialized = false;
  }

  /**
   * Initialize the language server
   */
  async initialize() {
    try {
      const response = await fetch('/health', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        this.initialized = true;
        console.log('LSP Server initialized successfully');
        return true;
      } else {
        console.warn(`LSP Server health check failed: ${response.status}`);
        this.initialized = false;
        return false;
      }
    } catch (error) {
      console.warn('Failed to initialize LSP server:', error.message);
      this.initialized = false;
      return false;
    }
  }

  /**
   * Request completions from language server
   */
  async getCompletions(code, line, character) {
    if (!this.initialized) {
      console.log('LSP Client not initialized');
      return [];
    }

    try {
      const response = await fetch(`${this.serverUrl}/completion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          line,
          character
        })
      });

      if (response.ok) {
        const data = await response.json();
        return data.completions || [];
      }
    } catch (error) {
      console.warn('Error getting completions:', error);
    }

    return [];
  }

  /**
   * Request hover information
   */
  async getHover(code, line, character) {
    if (!this.initialized) {
      return null;
    }

    try {
      const response = await fetch(`${this.serverUrl}/hover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          line,
          character
        })
      });

      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.warn('Error getting hover info:', error);
    }

    return null;
  }

  /**
   * Request definition location
   */
  async getDefinition(code, line, character) {
    if (!this.initialized) {
      return null;
    }

    try {
      const response = await fetch(`${this.serverUrl}/definition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          line,
          character
        })
      });

      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.warn('Error getting definition:', error);
    }

    return null;
  }
}

export default LSPClient;
