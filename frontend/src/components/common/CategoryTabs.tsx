import React from 'react';
import { motion } from 'framer-motion';

interface CategoryTabsProps {
  categories: string[];
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  scrollable?: boolean;
}

export const CategoryTabs: React.FC<CategoryTabsProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
  scrollable = true
}) => {
  return (
    <div className={`w-full ${scrollable ? 'overflow-x-auto' : ''}`}>
      <div className={`flex ${scrollable ? 'space-x-4 pb-2' : 'flex-wrap gap-2 justify-center'}`}>
        {categories.map((category) => {
          const isSelected = category === selectedCategory;
          
          return (
            <motion.button
              key={category}
              onClick={() => onSelectCategory(category)}
              className={`
                relative px-6 py-3 rounded-full text-sm font-medium whitespace-nowrap
                transition-all duration-200 border
                ${isSelected 
                  ? 'bg-primary-500 text-white border-primary-500 shadow-md' 
                  : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200 hover:border-gray-300'
                }
                focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-opacity-50
              `}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              initial={false}
              animate={{
                backgroundColor: isSelected ? '#10b981' : '#f3f4f6',
                color: isSelected ? '#ffffff' : '#374151',
                borderColor: isSelected ? '#10b981' : '#e5e7eb',
              }}
              transition={{ duration: 0.2 }}
            >
              {category}
              
              {/* Active indicator */}
              {isSelected && (
                <motion.div
                  layoutId="categoryIndicator"
                  className="absolute inset-0 bg-primary-500 rounded-full -z-10"
                  transition={{
                    type: "spring",
                    stiffness: 380,
                    damping: 30,
                  }}
                />
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};