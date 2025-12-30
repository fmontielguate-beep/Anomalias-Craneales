
import React from 'react';
import { soundService } from '../services/soundService';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  disabled?: boolean;
  type?: 'button' | 'submit';
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  onClick, 
  className = '', 
  variant = 'primary', 
  disabled = false,
  type = 'button'
}) => {
  const baseStyles = "px-8 py-4 rounded-2xl font-bold transition-all duration-300 flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed tracking-wide shadow-sm";
  
  const variants = {
    primary: "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-100 hover:shadow-indigo-200",
    secondary: "bg-white hover:bg-slate-50 text-slate-600 border border-slate-100 shadow-sm",
    danger: "bg-rose-500 hover:bg-rose-600 text-white shadow-rose-100",
    ghost: "bg-transparent hover:bg-indigo-50 text-slate-500 hover:text-indigo-600"
  };

  const handleClick = () => {
    soundService.playClick();
    if (onClick) onClick();
  };

  return (
    <button
      type={type}
      onClick={handleClick}
      disabled={disabled}
      className={`${baseStyles} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
};
