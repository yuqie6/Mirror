import React from 'react';

interface SkeletonProps {
    className?: string;
    variant?: 'text' | 'circular' | 'rectangular';
    width?: string | number;
    height?: string | number;
}

const Skeleton: React.FC<SkeletonProps> = ({ 
    className = '', 
    variant = 'rectangular',
    width,
    height 
}) => {
    const baseClass = 'bg-gray-200 animate-pulse';
    
    const variantClass = {
        text: 'rounded h-4',
        circular: 'rounded-full',
        rectangular: 'rounded-xl',
    }[variant];

    const style: React.CSSProperties = {
        width: width ?? (variant === 'text' ? '100%' : undefined),
        height: height ?? (variant === 'circular' ? width : undefined),
    };

    return <div className={`${baseClass} ${variantClass} ${className}`} style={style} />;
};

// 预设骨架屏布局
export const CardSkeleton: React.FC = () => (
    <div className="card space-y-4">
        <Skeleton variant="text" width="40%" height={20} />
        <Skeleton variant="text" height={16} />
        <Skeleton variant="text" height={16} />
        <Skeleton variant="text" width="60%" height={16} />
    </div>
);

export const StatCardSkeleton: React.FC = () => (
    <div className="stat-card">
        <Skeleton variant="text" width="50%" height={12} className="mb-2" />
        <Skeleton variant="text" width="70%" height={32} />
    </div>
);

export const ListItemSkeleton: React.FC = () => (
    <div className="flex items-center gap-3 p-3">
        <Skeleton variant="circular" width={40} height={40} />
        <div className="flex-1 space-y-2">
            <Skeleton variant="text" width="60%" height={14} />
            <Skeleton variant="text" width="40%" height={12} />
        </div>
    </div>
);

export default Skeleton;
