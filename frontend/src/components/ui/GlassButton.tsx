import React from 'react';

interface GlassButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    children: React.ReactNode;
    variant?: 'primary' | 'secondary' | 'premium';
    size?: 'sm' | 'md' | 'lg';
}

export const GlassButton: React.FC<GlassButtonProps> = ({
    children,
    variant = 'primary',
    size = 'md',
    className = '',
    ...props
}) => {
    // iOS-inspired sizing
    const sizeClasses = {
        sm: 'px-4 py-2.5 text-sm',
        md: 'px-6 py-3.5 text-base',
        lg: 'px-8 py-4 text-lg'
    };

    const variantClasses = {
        primary: `
      bg-gradient-to-r from-[#007aff] to-[#5e5ce6]
      text-white 
      shadow-lg shadow-blue-500/30
      hover:shadow-xl hover:shadow-blue-500/40
    `,
        secondary: `
      backdrop-blur-xl 
      bg-white/10 
      border border-white/10 
      text-white
      hover:bg-white/20
    `,
        premium: `
      glass-premium
      text-white
      hover:bg-white/10
    `
    };

    return (
        <button
            className={`
        font-semibold 
        rounded-full 
        transition-all 
        duration-300 
        ease-out
        hover:scale-[1.02]
        active:scale-95
        ${sizeClasses[size]} 
        ${variantClasses[variant]} 
        ${className}
      `}
            {...props}
        >
            {children}
        </button>
    );
};
