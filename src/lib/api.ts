const API_BASE = '';

class ApiClient {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('auth_token');
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  private async handleResponse(response: Response) {
    const isLoginPage = window.location.pathname.startsWith('/login');

    if ((response.status === 401 || response.status === 403) && !isLoginPage) {
      this.token = null;
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
      throw new Error('Sessão expirada');
    }
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Erro na requisição');
    }
    return data;
  }

  async get(path: string) {
    const response = await fetch(`${API_BASE}${path}`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  async post(path: string, body: any) {
    const response = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(body),
    });
    return this.handleResponse(response);
  }

  async put(path: string, body: any) {
    const response = await fetch(`${API_BASE}${path}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(body),
    });
    return this.handleResponse(response);
  }

  async patch(path: string, body: any) {
    const response = await fetch(`${API_BASE}${path}`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify(body),
    });
    return this.handleResponse(response);
  }

  async delete(path: string) {
    const response = await fetch(`${API_BASE}${path}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  // Auth methods
  async login(email: string, password: string) {
    const data = await this.post('/api/auth/login', { email, password });
    this.token = data.token;
    localStorage.setItem('auth_token', data.token);
    return data;
  }

  async signup(email: string, password: string, full_name?: string) {
    const data = await this.post('/api/auth/signup', { email, password, full_name });
    this.token = data.token;
    localStorage.setItem('auth_token', data.token);
    return data;
  }

  logout() {
    this.token = null;
    localStorage.removeItem('auth_token');
  }

  async getUser() {
    if (!this.token) return null;
    try {
      const data = await this.get('/api/auth/me');
      return data.user;
    } catch {
      return null;
    }
  }

  isAuthenticated(): boolean {
    return !!this.token;
  }
}

export const api = new ApiClient();
