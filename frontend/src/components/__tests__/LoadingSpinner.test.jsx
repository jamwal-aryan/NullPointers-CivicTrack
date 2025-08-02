import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import LoadingSpinner, { LoadingPage, LoadingOverlay } from '../LoadingSpinner';

describe('LoadingSpinner', () => {
  it('renders loading spinner with default size', () => {
    render(<LoadingSpinner />);
    const spinner = screen.getByRole('status', { hidden: true });
    expect(spinner).toBeInTheDocument();
  });

  it('renders loading spinner with custom size', () => {
    render(<LoadingSpinner size="lg" />);
    const spinner = screen.getByRole('status', { hidden: true });
    expect(spinner).toBeInTheDocument();
  });
});

describe('LoadingPage', () => {
  it('renders loading page with default message', () => {
    render(<LoadingPage />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('Loading...', { selector: 'p' })).toBeInTheDocument();
  });

  it('renders loading page with custom message', () => {
    render(<LoadingPage message="Custom loading message" />);
    expect(screen.getByText('Custom loading message')).toBeInTheDocument();
  });
});

describe('LoadingOverlay', () => {
  it('renders loading overlay with default message', () => {
    render(<LoadingOverlay />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('Loading...', { selector: 'p' })).toBeInTheDocument();
  });

  it('renders loading overlay with custom message', () => {
    render(<LoadingOverlay message="Processing..." />);
    expect(screen.getByText('Processing...')).toBeInTheDocument();
  });
});