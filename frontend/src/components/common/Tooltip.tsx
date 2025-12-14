import React, { useState, useRef, useEffect } from 'react';

interface TooltipProps {
    content: string;
    children: React.ReactNode;
    position?: 'top' | 'bottom' | 'left' | 'right';
}

const Tooltip: React.FC<TooltipProps> = ({ content, children, position = 'bottom' }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [coords, setCoords] = useState({ top: 0, left: 0 });
    const triggerRef = useRef<HTMLDivElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isVisible && triggerRef.current && tooltipRef.current) {
            const trigger = triggerRef.current.getBoundingClientRect();
            const tooltip = tooltipRef.current.getBoundingClientRect();
            
            let top = 0, left = 0;
            const offset = 8;

            switch (position) {
                case 'top':
                    top = trigger.top - tooltip.height - offset;
                    left = trigger.left + (trigger.width - tooltip.width) / 2;
                    break;
                case 'bottom':
                    top = trigger.bottom + offset;
                    left = trigger.left + (trigger.width - tooltip.width) / 2;
                    break;
                case 'left':
                    top = trigger.top + (trigger.height - tooltip.height) / 2;
                    left = trigger.left - tooltip.width - offset;
                    break;
                case 'right':
                    top = trigger.top + (trigger.height - tooltip.height) / 2;
                    left = trigger.right + offset;
                    break;
            }

            setCoords({ top, left });
        }
    }, [isVisible, position]);

    return (
        <div
            ref={triggerRef}
            className="relative inline-flex"
            onMouseEnter={() => setIsVisible(true)}
            onMouseLeave={() => setIsVisible(false)}
        >
            {children}
            {isVisible && (
                <div
                    ref={tooltipRef}
                    className="fixed z-[9999] px-2.5 py-1.5 text-xs font-medium text-white bg-gray-900 rounded-lg shadow-lg whitespace-nowrap animate-fade-in"
                    style={{ top: coords.top, left: coords.left }}
                >
                    {content}
                    <div
                        className={`absolute w-2 h-2 bg-gray-900 rotate-45 ${
                            position === 'top' ? 'bottom-[-4px] left-1/2 -translate-x-1/2' :
                            position === 'bottom' ? 'top-[-4px] left-1/2 -translate-x-1/2' :
                            position === 'left' ? 'right-[-4px] top-1/2 -translate-y-1/2' :
                            'left-[-4px] top-1/2 -translate-y-1/2'
                        }`}
                    />
                </div>
            )}
        </div>
    );
};

export default Tooltip;
