import { describe, expect, it } from 'vitest';
import {
  digitsOnly,
  toFullPhone,
  validateLoginInput,
  validateRegisterInput,
} from '@/lib/auth-validation';

describe('digitsOnly', () => {
  it('strips non-digit characters', () => {
    expect(digitsOnly('+998 (90) 123-45-67')).toBe('998901234567');
  });
});

describe('toFullPhone', () => {
  it('combines country code and digits', () => {
    expect(toFullPhone('+998', '90 123 45 67')).toBe('+998901234567');
  });
});

describe('validateLoginInput', () => {
  it('requires phone and password', () => {
    expect(validateLoginInput({ phone: '', password: '' })).toBe('error_phone_pass_req');
  });

  it('requires at least 9 phone digits', () => {
    expect(validateLoginInput({ phone: '90123', password: 'secret12' })).toBe('error_phone_full_req');
  });

  it('passes valid input', () => {
    expect(validateLoginInput({ phone: '901234567', password: 'secret12' })).toBeNull();
  });
});

describe('validateRegisterInput', () => {
  const base = {
    name: 'Ali',
    surname: 'Valiyev',
    phone: '901234567',
    password: 'secret12',
    confirmPassword: 'secret12',
    age: '20',
  };

  it('requires all fields', () => {
    expect(
      validateRegisterInput({
        name: '',
        surname: '',
        phone: '',
        password: '',
        confirmPassword: '',
        age: '',
      })
    ).toBe('filling_all_fields_req');
  });

  it('checks password length', () => {
    expect(
      validateRegisterInput({
        ...base,
        password: '123',
        confirmPassword: '123',
      })
    ).toBe('error_password_min');
  });

  it('checks password match', () => {
    expect(
      validateRegisterInput({
        ...base,
        confirmPassword: 'other12',
      })
    ).toBe('error_passwords_not_match');
  });

  it('checks age', () => {
    expect(
      validateRegisterInput({
        ...base,
        age: '10',
      })
    ).toBe('error_age_invalid');
  });

  it('passes valid input', () => {
    expect(validateRegisterInput(base)).toBeNull();
  });
});
