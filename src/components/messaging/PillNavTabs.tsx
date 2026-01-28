/**
 * PillNavTabs - Animated tab navigation with pill indicator
 * Based on ReactBits PillNav pattern with framer-motion
 * Refactored for Tailwind CSS + Light Mode
 */

import React from 'react';
import { motion } from 'motion/react';

// Checking package.json, clsx and tailwind-merge are installed. 
// I will use clsx/tailwind-merge directly if cn is not standard, or just className strings.
// package.json has "clsx" and "tailwind-merge". I'll assume standard `cn` utility exists or verify.
// Given previous code didn't import `cn`, I'll define a quick helper or just use template literals to be safe.
// Wait, ConversationsSidebar imports `cn`? No.
// I'll stick to standard template literals/clsx to be safe, or just clear class strings.

export interface TabItem {
    id: string;
    label: string;
    count?: number;
}

interface PillNavTabsProps {
    tabs: TabItem[];
    activeTab: string;
    onTabChange: (tabId: string) => void;
    className?: string;
}

export const PillNavTabs: React.FC<PillNavTabsProps> = ({
    tabs,
    activeTab,
    onTabChange,
    className = '',
}) => {
    return (
        <div
            className={`flex items-center gap-1 p-1 bg-gray-100/80 rounded-xl relative ${className}`}
            role="tablist"
            aria-label="Conversation filters"
        >
            {tabs.map((tab) => {
                const isActive = activeTab === tab.id;

                return (
                    <button
                        key={tab.id}
                        role="tab"
                        aria-selected={isActive}
                        onClick={() => onTabChange(tab.id)}
                        className={`
                            relative px-4 py-2 text-sm font-medium rounded-lg transition-colors z-10
                            flex items-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-black/10
                            ${isActive ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700'}
                        `}
                    >
                        {/* Animated pill background */}
                        {isActive && (
                            <motion.div
                                layoutId="activeTabPill"
                                className="absolute inset-0 bg-white rounded-lg shadow-sm border border-black/5 -z-10"
                                initial={false}
                                transition={{
                                    type: 'spring',
                                    stiffness: 500,
                                    damping: 35,
                                }}
                            />
                        )}

                        <span>{tab.label}</span>

                        {/* Badge for count */}
                        {tab.count !== undefined && tab.count > 0 && (
                            <span
                                className={`
                                    flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 
                                    text-[11px] font-bold rounded-full transition-colors
                                    ${isActive
                                        ? 'bg-gray-100 text-gray-900'
                                        : 'bg-gray-200/80 text-gray-600'}
                                `}
                            >
                                {tab.count > 99 ? '99+' : tab.count}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
};

export default PillNavTabs;
