import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import LoginPage from '../page';
import { createClient } from '@/lib/supabase/client';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

const mockSignIn = vi.fn();
const mockSignUp = vi.fn();
const mockGetUser = vi.fn();
const mockUpdateUser = vi.fn();

vi.mock('@/lib/supabase/client', () => {
  return {
    createClient: () => ({
      auth: {
        signInWithPassword: mockSignIn,
        signUp: mockSignUp,
        getUser: mockGetUser,
        updateUser: mockUpdateUser,
      },
    }),
  };
});

describe('LoginPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    mockUpdateUser.mockResolvedValue({ data: {}, error: null });
  });

  it('renders all sign-in form elements by default', () => {
    render(<LoginPage />);
    expect(screen.getByLabelText(/email/i)).toBeDefined();
    expect(screen.getByLabelText(/password/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeDefined();
    expect(screen.getByText(/don't have an account\? sign up/i)).toBeDefined();
  });

  it('toggles to sign-up mode and calls signUp on submission', async () => {
    mockSignUp.mockResolvedValue({ data: { user: {} }, error: null });

    render(<LoginPage />);
    
    // Toggle mode
    const toggleBtn = screen.getByText(/don't have an account\? sign up/i);
    fireEvent.click(toggleBtn);

    // Form inputs should show sign up state
    expect(screen.getByRole('button', { name: /sign up/i })).toBeDefined();
    expect(screen.getByText(/already have an account\? sign in/i)).toBeDefined();

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'owen@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'securepwd123' } });

    fireEvent.click(screen.getByRole('button', { name: /sign up/i }));

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith({
        email: 'owen@example.com',
        password: 'securepwd123',
      });
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('calls signInWithPassword on successful login submission', async () => {
    mockSignIn.mockResolvedValue({ data: { user: {} }, error: null });

    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'owen@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'securepwd123' } });

    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith({
        email: 'owen@example.com',
        password: 'securepwd123',
      });
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });
  });
});
