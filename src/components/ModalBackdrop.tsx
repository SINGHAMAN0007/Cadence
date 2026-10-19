import React, { useEffect } from 'react';

export interface ModalBackdropProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  backdropClassName?: string;
  containerClassName?: string;
  role?: string;
  'aria-modal'?: boolean;
  'aria-labelledby'?: string;
}

export const ModalBackdrop: React.FC<ModalBackdropProps> = ({
  isOpen,
  onClose,
  children,
  className = '',
  backdropClassName = '',
  containerClassName = '',
  role = 'dialog',
  'aria-modal': ariaModal = true,
  'aria-labelledby': ariaLabelledBy,
}) => {
  // Prevent background scrolling while modal is active
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const hasCustomMaxWidth = className.includes('max-w-');
  const maxWidthClass = hasCustomMaxWidth ? '' : 'max-w-md';

  return (
    <div
      className={`fixed inset-0 z-50 select-none ${containerClassName}`}
      role={role}
      aria-modal={ariaModal}
      aria-labelledby={ariaLabelledBy}
    >
      {/* Professional Studio-Graded Frosted Overlay */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-50 bg-black/85 backdrop-blur-xl transition-opacity duration-300 ${backdropClassName}`}
        aria-hidden="true"
      />

      {/* Modal Dialog Body */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 pointer-events-none">
        <div
          onClick={(e) => e.stopPropagation()}
          className={`pointer-events-auto relative w-full ${maxWidthClass} bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden transition-all duration-200 animate-in zoom-in-95 ${className}`}
        >
          {children}
        </div>
      </div>
    </div>
  );
};
