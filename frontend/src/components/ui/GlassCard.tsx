import React from 'react';

interface GlassCardProps {
    children: React.ReactNode;
    className?: string;
    hover?: boolean;
    hoverEffect?: boolean;
    onClick?: React.MouseEventHandler<HTMLDivElement>;
    noPadding?: boolean;
    style?: React.CSSProperties;
}

export const GlassCard: React.FC<GlassCardProps> = ({
    children,
    className = '',
    hover = false,
    hoverEffect = false, // Alias for hover
    onClick,
    noPadding = false, // Destructure noPadding with a default value
    style = {},
}) => {
    const shouldHover = hover || hoverEffect;
    return (
        <div
            onClick={onClick}
            className={`
                relative overflow-hidden transition-all duration-300 glass-premium
                ${!noPadding ? 'p-6' : ''} 
                ${shouldHover ? 'hover:scale-[1.01] hover:shadow-2xl cursor-pointer' : ''}
                ${className}
            `}
            style={{
                borderRadius: '25px',
                ...style,
            }}
        >
            {children}
        </div>
    );
};


