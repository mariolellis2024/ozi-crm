import { 
  getErrorMessage, 
  createAppError, 
  isValidEmail, 
  isValidWhatsApp,
  formatErrorForDisplay 
} from '../../utils/errorHandling';

describe('getErrorMessage', () => {
  it('should handle Supabase unique constraint errors', () => {
    const error = {
      code: '23505',
      message: 'duplicate key value violates unique constraint "users_email_key"'
    };
    expect(getErrorMessage(error)).toBe('Este email já está cadastrado');
  });

  it('should handle foreign key constraint errors', () => {
    const error = {
      code: '23503',
      message: 'insert or update on table violates foreign key constraint'
    };
    expect(getErrorMessage(error)).toBe('Referência inválida - verifique os dados relacionados');
  });

  it('should handle authentication errors', () => {
    const error = {
      message: 'Invalid login credentials'
    };
    expect(getErrorMessage(error)).toBe('Email ou senha incorretos');
  });

  it('should handle network errors', () => {
    const error = {
      name: 'TypeError',
      message: 'Failed to fetch'
    };
    expect(getErrorMessage(error)).toBe('Erro de conexão - verifique sua internet');
  });

  it('should return unknown error for unhandled cases', () => {
    expect(getErrorMessage(null)).toBe('Erro desconhecido');
    expect(getErrorMessage({})).toBe('Erro desconhecido');
  });
});

describe('createAppError', () => {
  it('should create error object correctly', () => {
    const error = createAppError('Test message', 'TEST_CODE', { detail: 'test' });
    expect(error).toEqual({
      message: 'Test message',
      code: 'TEST_CODE',
      details: { detail: 'test' }
    });
  });
});

describe('isValidEmail', () => {
  it('should validate correct emails', () => {
    expect(isValidEmail('test@example.com')).toBe(true);
    expect(isValidEmail('user.name@domain.co.uk')).toBe(true);
    expect(isValidEmail('test+tag@example.org')).toBe(true);
  });

  it('should reject invalid emails', () => {
    expect(isValidEmail('invalid-email')).toBe(false);
    expect(isValidEmail('test@')).toBe(false);
    expect(isValidEmail('@example.com')).toBe(false);
    expect(isValidEmail('test..test@example.com')).toBe(false);
  });
});

describe('isValidWhatsApp', () => {
  it('should validate correct WhatsApp numbers', () => {
    expect(isValidWhatsApp('11999999999')).toBe(true);
    expect(isValidWhatsApp('1199999999')).toBe(true);
    expect(isValidWhatsApp('(11) 99999-9999')).toBe(true);
    expect(isValidWhatsApp('+55 11 99999-9999')).toBe(true);
  });

  it('should reject invalid WhatsApp numbers', () => {
    expect(isValidWhatsApp('123')).toBe(false);
    expect(isValidWhatsApp('119999999999')).toBe(false); // Too long
    expect(isValidWhatsApp('abc')).toBe(false);
  });
});

describe('formatErrorForDisplay', () => {
  it('should capitalize error messages', () => {
    const error = { message: 'test error message' };
    expect(formatErrorForDisplay(error)).toBe('Test error message');
  });
});