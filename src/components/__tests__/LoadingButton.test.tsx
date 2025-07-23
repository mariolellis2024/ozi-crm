import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LoadingButton } from '../LoadingButton';

describe('LoadingButton', () => {
  it('should render with correct text when not loading', () => {
    render(<LoadingButton isLoading={false} text="Save Changes" />);
    
    expect(screen.getByText('Save Changes')).toBeInTheDocument();
    expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
  });

  it('should show loading spinner when isLoading is true', () => {
    render(<LoadingButton isLoading={true} text="Save Changes" />);
    
    // Should show the Loader2 icon (spinner)
    expect(screen.getByRole('button')).toBeInTheDocument();
    expect(screen.queryByText('Save Changes')).not.toBeInTheDocument();
    
    // Check if the button contains the Loader2 component (it has animate-spin class)
    const button = screen.getByRole('button');
    const spinner = button.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('should be disabled when loading', () => {
    render(<LoadingButton isLoading={true} text="Save Changes" />);
    
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('should not be disabled when not loading', () => {
    render(<LoadingButton isLoading={false} text="Save Changes" />);
    
    const button = screen.getByRole('button');
    expect(button).not.toBeDisabled();
  });

  it('should have correct CSS classes', () => {
    render(<LoadingButton isLoading={false} text="Test Button" />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('group', 'relative', 'w-full');
    expect(button).toHaveClass('bg-teal-accent', 'text-dark');
  });

  it('should have correct CSS classes when disabled', () => {
    render(<LoadingButton isLoading={true} text="Test Button" />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('disabled:opacity-50', 'disabled:cursor-not-allowed');
  });
});