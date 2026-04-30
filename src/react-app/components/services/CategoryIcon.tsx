import * as LucideIcons from 'lucide-react';
import { LucideProps } from 'lucide-react';
import { motion } from 'framer-motion';

interface CategoryIconProps {
  iconName: string | null;
  className?: string;
  size?: number;
  color?: string;
}

/**
 * CategoryIcon renders a Lucide icon dynamically based on its name.
 * It includes premium styling with glassmorphism and animations.
 */
export default function CategoryIcon({ 
  iconName, 
  className = "", 
  size = 24, 
  color = "#70ff00" 
}: CategoryIconProps) {
  
  // Mapping of common Portuguese terms to Lucide icon names for fallback logic
  const autoMap: Record<string, string> = {
    'encanador': 'Wrench',
    'eletricista': 'Zap',
    'marceneiro': 'Hammer',
    'mecanico': 'Car',
    'pintor': 'Paintbrush',
    'pedreiro': 'Construction',
    'jardineiro': 'Leaf',
    'limpeza': 'Sparkles',
    'ar-condicionado': 'Wind',
    'chaveiro': 'Key',
    'alimentacao': 'Utensils',
    'saude': 'HeartPulse',
    'beleza': 'Sparkles',
    'educacao': 'GraduationCap',
    'tecnologia': 'Monitor',
    'pet': 'Dog',
    'imoveis': 'Home',
    'seguranca': 'ShieldCheck'
  };

  // Get the actual icon component
  const getIcon = () => {
    if (!iconName) return LucideIcons.Tag;
    
    // Try exact match
    let Icon = (LucideIcons as any)[iconName];
    
    // Try mapping if not found (lowercase search)
    if (!Icon) {
      const mappedName = autoMap[iconName.toLowerCase()];
      if (mappedName) {
        Icon = (LucideIcons as any)[mappedName];
      }
    }
    
    return Icon || LucideIcons.Tag;
  };

  const IconComponent = getIcon();

  return (
    <motion.div
      whileHover={{ scale: 1.1, rotate: 5 }}
      whileTap={{ scale: 0.9 }}
      className={`relative flex items-center justify-center rounded-xl p-3 glass-morphism ${className}`}
      style={{ boxShadow: `0 0 15px ${color}20` }}
    >
      <IconComponent 
        size={size} 
        color={color} 
        strokeWidth={2}
        className="icon-glow"
      />
      
      {/* Subtle background glow */}
      <div 
        className="absolute inset-0 opacity-20 blur-xl rounded-full"
        style={{ backgroundColor: color }}
      ></div>
    </motion.div>
  );
}
