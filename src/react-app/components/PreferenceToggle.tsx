import { Users, ArrowLeft, ArrowRight, RotateCcw } from "lucide-react";

interface PreferenceToggleProps {
  value: 'left' | 'right' | 'center' | 'auto';
  onChange: (value: 'left' | 'right' | 'center' | 'auto') => void;
  disabled?: boolean;
}

export default function PreferenceToggle({ value, onChange, disabled = false }: PreferenceToggleProps) {
  const options = [
    {
      value: 'auto' as const,
      label: 'Automático',
      description: 'Sistema balanceia automaticamente',
      icon: RotateCcw,
      color: 'bg-purple-600 border-purple-500 text-white'
    },
    {
      value: 'left' as const,
      label: 'Perna Esquerda',
      description: 'Novos afiliados vão para a esquerda',
      icon: ArrowLeft,
      color: 'bg-blue-600 border-blue-500 text-white'
    },
    {
      value: 'center' as const,
      label: 'Centro',
      description: 'Novos afiliados vão para o centro',
      icon: Users,
      color: 'bg-yellow-600 border-yellow-500 text-white'
    },
    {
      value: 'right' as const,
      label: 'Perna Direita',
      description: 'Novos afiliados vão para a direita',
      icon: ArrowRight,
      color: 'bg-green-600 border-green-500 text-white'
    }
  ];

  return (
    <div>
      <div className="flex items-center mb-4">
        <Users className="w-5 h-5 text-purple-500 mr-2" />
        <h3 className="text-white font-medium">Onde posicionar novos afiliados?</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {options.map((option) => {
          const Icon = option.icon;
          const isSelected = value === option.value;
          
          return (
            <button
              key={option.value}
              onClick={() => !disabled && onChange(option.value)}
              disabled={disabled}
              className={`p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                isSelected
                  ? option.color
                  : 'bg-gray-700 border-gray-600 text-white hover:bg-gray-600 hover:border-gray-500'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className="flex items-center space-x-3 mb-2">
                <Icon className="w-5 h-5" />
                <h4 className="font-medium">{option.label}</h4>
              </div>
              <p className={`text-sm ${isSelected ? 'text-white/80' : 'text-gray-400'}`}>
                {option.description}
              </p>
            </button>
          );
        })}
      </div>
      
      <div className="mt-4 p-3 bg-yellow-900/30 border border-yellow-700 rounded-lg">
        <p className="text-yellow-200 text-sm">
          <strong>Sistema Ternário:</strong> Cada nível pode ter até 3 afiliados diretos (esquerda, centro, direita). Quando completar 3, novos afiliados descem para o próximo nível. O modo automático é recomendado para maximizar o crescimento equilibrado.
        </p>
      </div>
    </div>
  );
}
