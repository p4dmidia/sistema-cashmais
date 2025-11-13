import React, { useEffect, useState } from 'react';
import { Users, ChevronDown, ChevronRight, User, Calendar, Crown, UserCheck, UserX } from 'lucide-react';

interface NetworkNode {
  id: string;
  name: string;
  coupon: string;
  active: boolean;
  level: number;
  cpf: string;
  direct_referrals: number;
  signup_date: string;
  children?: NetworkNode[];
}

interface NetworkTreeProps {
  maxDepth?: number;
}

interface TreeNodeProps {
  node: NetworkNode;
  depth: number;
  maxDepth: number;
  isLast?: boolean;
  parentLines?: boolean[];
}

const TreeNode: React.FC<TreeNodeProps> = ({ 
  node, 
  depth, 
  maxDepth, 
  isLast = false, 
  parentLines = [] 
}) => {
  const [isExpanded, setIsExpanded] = useState(depth < 3); // Auto-expand first 3 levels
  const hasChildren = node.children && node.children.length > 0;
  const canExpand = hasChildren && depth < maxDepth;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
  };

  const getNodeColor = (level: number, active: boolean) => {
    if (!active) return 'bg-gray-700/50 border-gray-600';
    
    switch (level) {
      case 0: return 'bg-gradient-to-r from-purple-600 to-blue-600 border-purple-400';
      case 1: return 'bg-gradient-to-r from-green-600 to-emerald-600 border-green-400';
      case 2: return 'bg-gradient-to-r from-yellow-600 to-orange-600 border-yellow-400';
      case 3: return 'bg-gradient-to-r from-red-600 to-pink-600 border-red-400';
      default: return 'bg-gradient-to-r from-indigo-600 to-purple-600 border-indigo-400';
    }
  };

  return (
    <div className="relative">
      {/* Connection Lines */}
      {depth > 0 && (
        <>
          {/* Vertical lines from parent levels */}
          {parentLines.map((hasLine, index) => (
            hasLine && (
              <div
                key={index}
                className="absolute top-0 bottom-0 w-px bg-gray-600"
                style={{
                  left: `${index * 24 + 12}px`,
                  top: index === parentLines.length - 1 ? '0' : '-24px'
                }}
              />
            )
          ))}
          
          {/* Horizontal line to this node */}
          <div
            className="absolute top-6 w-4 h-px bg-gray-600"
            style={{ left: `${(parentLines.length - 1) * 24 + 12}px` }}
          />
          
          {/* Vertical line down from parent */}
          <div
            className={`absolute w-px bg-gray-600 ${isLast ? 'h-6' : 'h-full'}`}
            style={{ 
              left: `${(parentLines.length - 1) * 24 + 12}px`,
              top: '-24px'
            }}
          />
        </>
      )}

      {/* Node Container */}
      <div 
        className="flex items-start"
        style={{ marginLeft: depth > 0 ? `${parentLines.length * 24 + 20}px` : '0' }}
      >
        {/* Node Card */}
        <div className={`
          relative min-w-72 p-4 rounded-xl border-2 shadow-lg backdrop-blur-sm
          ${getNodeColor(node.level, node.active)}
          ${node.active ? 'opacity-100' : 'opacity-70'}
          hover:scale-[1.02] transition-all duration-200
        `}>
          {/* Expand/Collapse Button */}
          {canExpand && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="absolute -bottom-2 -right-2 w-6 h-6 bg-gray-800 hover:bg-gray-700 rounded-full flex items-center justify-center border-2 border-gray-600 transition-colors"
            >
              {isExpanded ? (
                <ChevronDown className="w-3 h-3 text-white" />
              ) : (
                <ChevronRight className="w-3 h-3 text-white" />
              )}
            </button>
          )}

          {/* Node Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              {node.level === 0 ? (
                <Crown className="w-5 h-5 text-yellow-300" />
              ) : (
                <User className="w-4 h-4 text-white/80" />
              )}
              <h3 className="text-white font-semibold text-lg">
                {node.level === 0 ? node.name : node.name}
              </h3>
              {node.level === 0 && (
                <span className="px-2 py-1 bg-yellow-500/20 text-yellow-300 text-xs rounded-full font-bold">
                  VOCÊ
                </span>
              )}
            </div>
            
            <div className="flex items-center space-x-1">
              {node.active ? (
                <UserCheck className="w-4 h-4 text-green-300" />
              ) : (
                <UserX className="w-4 h-4 text-red-300" />
              )}
              <span className={`text-xs font-medium ${
                node.active ? 'text-green-300' : 'text-red-300'
              }`}>
                {node.active ? 'Ativo' : 'Inativo'}
              </span>
            </div>
          </div>

          {/* Node Info */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-white/60 text-xs block">Cupom</span>
              <span className="text-white font-mono font-medium">{node.coupon}</span>
            </div>
            <div>
              <span className="text-white/60 text-xs block">Nível</span>
              <span className="text-white font-medium">{node.level}</span>
            </div>
            <div className="col-span-2">
              <span className="text-white/60 text-xs block">CPF</span>
              <span className="text-white font-mono text-sm">{node.cpf}</span>
            </div>
          </div>

          {/* Node Stats */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/20">
            <div className="flex items-center space-x-1 text-white/80">
              <Calendar className="w-3 h-3" />
              <span className="text-xs">{formatDate(node.signup_date)}</span>
            </div>
            <div className="flex items-center space-x-1 text-white/80">
              <Users className="w-3 h-3" />
              <span className="text-xs">{node.direct_referrals} diretos</span>
            </div>
          </div>
        </div>
      </div>

      {/* Children */}
      {canExpand && isExpanded && hasChildren && (
        <div className="mt-6">
          {node.children!.map((child, index) => {
            const isLastChild = index === node.children!.length - 1;
            const newParentLines = [...parentLines, !isLastChild];
            
            return (
              <div key={child.id} className="mt-6">
                <TreeNode 
                  node={child} 
                  depth={depth + 1} 
                  maxDepth={maxDepth}
                  isLast={isLastChild}
                  parentLines={newParentLines}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Collapsed Children Count */}
      {canExpand && !isExpanded && hasChildren && (
        <div 
          className="mt-3 text-center"
          style={{ marginLeft: depth > 0 ? `${parentLines.length * 24 + 20}px` : '0' }}
        >
          <button
            onClick={() => setIsExpanded(true)}
            className="px-4 py-2 bg-gray-700/80 hover:bg-gray-600/80 text-gray-300 text-sm rounded-lg border border-gray-600 transition-colors"
          >
            <Users className="w-4 h-4 inline mr-2" />
            +{node.children!.length} membros
          </button>
        </div>
      )}
    </div>
  );
};

const NetworkTree: React.FC<NetworkTreeProps> = ({ maxDepth = 10 }) => {
  const [treeData, setTreeData] = useState<NetworkNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    fetchNetworkTree();
  }, []);

  const fetchNetworkTree = async () => {
    try {
      const response = await fetch(`/api/affiliate/network/tree?max_depth=${maxDepth}`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setTreeData(data);
      } else {
        setError('Erro ao carregar árvore da rede');
      }
    } catch (error) {
      console.error('Error fetching network tree:', error);
      setError('Erro de conexão');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-xl p-8 border border-gray-700">
        <div className="flex items-center justify-center space-x-3">
          <div className="animate-spin">
            <Users className="w-6 h-6 text-purple-500" />
          </div>
          <span className="text-gray-300">Carregando árvore da rede...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-800 rounded-xl p-8 border border-gray-700">
        <div className="text-center">
          <Users className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-300 mb-2">Erro ao Carregar</h3>
          <p className="text-gray-500 mb-4">{error}</p>
          <button
            onClick={fetchNetworkTree}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  if (!treeData) {
    return (
      <div className="bg-gray-800 rounded-xl p-8 border border-gray-700">
        <div className="text-center">
          <Users className="w-12 h-12 text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-300 mb-2">Rede Vazia</h3>
          <p className="text-gray-500">
            Sua rede MLM ainda não possui membros. Comece a indicar pessoas para construir sua rede.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700">
      <div className="p-6 border-b border-gray-700">
        <h2 className="text-xl font-semibold text-white flex items-center">
          <Users className="w-5 h-5 text-purple-500 mr-2" />
          Árvore Genealógica MLM
        </h2>
        <p className="text-gray-400 text-sm mt-1">
          Estrutura hierárquica da sua rede até {maxDepth} níveis
        </p>
      </div>

      <div className="p-6">
        <div className="overflow-x-auto">
          <div className="min-w-max">
            <TreeNode 
              node={treeData} 
              depth={0} 
              maxDepth={maxDepth}
            />
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="px-6 pb-6">
        <div className="mt-4 pt-4 border-t border-gray-700">
          <h3 className="text-sm font-medium text-gray-300 mb-3">Cores por Nível</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { level: 0, label: 'Você', color: 'from-purple-600 to-blue-600' },
              { level: 1, label: 'Nível 1', color: 'from-green-600 to-emerald-600' },
              { level: 2, label: 'Nível 2', color: 'from-yellow-600 to-orange-600' },
              { level: 3, label: 'Nível 3', color: 'from-red-600 to-pink-600' },
              { level: 4, label: 'Nível 4+', color: 'from-indigo-600 to-purple-600' }
            ].map(({ level, label, color }) => (
              <div key={level} className="flex items-center space-x-2">
                <div className={`w-4 h-4 rounded bg-gradient-to-r ${color}`}></div>
                <span className="text-gray-400 text-xs">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NetworkTree;
