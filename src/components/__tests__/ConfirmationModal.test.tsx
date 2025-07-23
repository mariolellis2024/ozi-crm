import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConfirmationModal } from '../ConfirmationModal';

describe('ConfirmationModal', () => {
  const defaultProps = {
    isOpen: true,
    title: 'Confirm Action',
    message: 'Are you sure you want to proceed?',
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render when isOpen is true', () => {
    render(<ConfirmationModal {...defaultProps} />);
    
    expect(screen.getByText('Confirm Action')).toBeInTheDocument();
    expect(screen.getByText('Are you sure you want to proceed?')).toBeInTheDocument();
  });

  it('should not render when isOpen is false', () => {
    render(<ConfirmationModal {...defaultProps} isOpen={false} />);
    
    expect(screen.queryByText('Confirm Action')).not.toBeInTheDocument();
  });

  it('should call onConfirm when confirm button is clicked', () => {
    render(<ConfirmationModal {...defaultProps} />);
    
    const confirmButton = screen.getByText('Confirmar');
    fireEvent.click(confirmButton);
    
    expect(defaultProps.onConfirm).toHaveBeenCalledTimes(1);
  });

  it('should call onCancel when cancel button is clicked', () => {
    render(<ConfirmationModal {...defaultProps} />);
    
    const cancelButton = screen.getByText('Cancelar');
    fireEvent.click(cancelButton);
    
    expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
  });

  it('should call onCancel when X button is clicked', () => {
    render(<ConfirmationModal {...defaultProps} />);
    
    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);
    
    expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
  });

  it('should render custom button texts', () => {
    render(
      <ConfirmationModal 
        {...defaultProps} 
        confirmText="Delete Now"
        cancelText="Keep It"
      />
    );
    
    expect(screen.getByText('Delete Now')).toBeInTheDocument();
    expect(screen.getByText('Keep It')).toBeInTheDocument();
  });

  it('should render danger variant with correct styling', () => {
    render(<ConfirmationModal {...defaultProps} variant="danger" />);
    
    const confirmButton = screen.getByText('Confirmar');
    expect(confirmButton).toHaveClass('bg-red-500', 'hover:bg-red-600');
  });

  it('should render warning variant with correct styling', () => {
    render(<ConfirmationModal {...defaultProps} variant="warning" />);
    
    const confirmButton = screen.getByText('Confirmar');
    expect(confirmButton).toHaveClass('bg-yellow-500', 'hover:bg-yellow-600');
  });

  it('should call onCancel when clicking outside the modal', () => {
    render(<ConfirmationModal {...defaultProps} />);
    
    const overlay = screen.getByRole('dialog').parentElement;
    fireEvent.click(overlay!);
    
    expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
  });

  it('should not call onCancel when clicking inside the modal content', () => {
    render(<ConfirmationModal {...defaultProps} />);
    
    const modalContent = screen.getByRole('dialog');
    fireEvent.click(modalContent);
    
    expect(defaultProps.onCancel).not.toHaveBeenCalled();
  });
});