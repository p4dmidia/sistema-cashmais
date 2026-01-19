import React, { useEffect, useState } from 'react';
import { Users, User, Calendar, Mail, Activity, X, ChevronDown } from 'lucide-react';

interface NetworkNode {
  id: string;
  name: string;
  email?: string;
  active: boolean;
  level: number;
  signup_date: string;
  total_referrals: number;
  position?: 'left' | 'center' | 'right';
  children?: {
    left?: NetworkNode;
    center?: NetworkNode;
    right?: NetworkNode;
  };
}

interface NodeModalProps {
  node: NetworkNode;
  isOpen: boolean;
  onClose: () => void;
}

const NodeModal: React.FC<NodeModalProps> = ({ node, isOpen, onClose }) => {
  if (!isOpen) return null;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        
        <div className="text-center mb-4">
          <div className={`w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center ${
            node.active 
              ? 'bg-gradient-to-br from-blue-500 to-purple-600' 
              : 'bg-gray-400'
          }`}>
            <User className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-bold text-gray-800">{node.name}</h2>
          <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
            node.active 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            {node.active ? 'Ativo' : 'Inativo'}
          </span>
        </div>

        <div className="space-y-3">
          <div className="flex items-center space-x-3 text-gray-700">
            <Mail className="w-5 h-5 text-blue-500" />
            <span>{node.email || 'Email não informado'}</span>
          </div>
          
          <div className="flex items-center space-x-3 text-gray-700">
            <Calendar className="w-5 h-5 text-green-500" />
            <span>Cadastrado em {formatDate(node.signup_date)}</span>
          </div>
          
          <div className="flex items-center space-x-3 text-gray-700">
            <Users className="w-5 h-5 text-purple-500" />
            <span>{node.total_referrals} indicações diretas</span>
          </div>
          
          <div className="flex items-center space-x-3 text-gray-700">
            <Activity className="w-5 h-5 text-orange-500" />
            <span>Nível {node.level} na rede</span>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-2 px-4 rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

interface TreeNodeProps {
  node: NetworkNode | null;
  level: number;
  onNodeClick: (node: NetworkNode) => void;
  onExpandClick: (nodeId: string, level: number) => void;
  isExpanded: boolean;
  position?: 'left' | 'center' | 'right';
}

const TreeNode: React.FC<TreeNodeProps> = ({ 
  node, 
  level, 
  onNodeClick, 
  onExpandClick, 
  isExpanded
}) => {
  const isEmpty = !node;
  
  const handleNodeClick = () => {
    if (node) {
      onNodeClick(node);
    }
  };

  const handleExpandClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (node) {
      onExpandClick(node.id, level);
    }
  };

  const hasChildren = node?.children && (
    node.children.left || 
    node.children.center || 
    node.children.right
  );

  return (
    <div className="flex flex-col items-center">
      {/* Node Circle */}
      <div className="relative group">
        <div
          onClick={handleNodeClick}
          className={`w-16 h-16 rounded-full border-4 flex items-center justify-center cursor-pointer transition-all duration-200 ${
            isEmpty
              ? 'bg-gray-100 border-gray-300 hover:bg-gray-200'
              : node.active
              ? 'bg-gradient-to-br from-blue-500 to-purple-600 border-blue-300 hover:from-blue-600 hover:to-purple-700 transform hover:scale-105'
              : 'bg-gray-400 border-gray-500 hover:bg-gray-500'
          } shadow-lg hover:shadow-xl`}
        >
          {isEmpty ? (
            <span className="text-gray-500 text-xs font-medium">Vazio</span>
          ) : (
            <User className={`w-8 h-8 ${node.active ? 'text-white' : 'text-gray-200'}`} />
          )}
        </div>

        {/* Expand Button */}
        {node && hasChildren && (
          <button
            onClick={handleExpandClick}
            className={`absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-6 h-6 rounded-full border-2 border-white flex items-center justify-center transition-all ${
              isExpanded 
                ? 'bg-red-500 hover:bg-red-600 text-white rotate-180' 
                : 'bg-green-500 hover:bg-green-600 text-white'
            }`}
          >
            <ChevronDown className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Node Name */}
      <div className="mt-2 text-center">
        <p className={`text-sm font-medium max-w-20 truncate ${
          isEmpty 
            ? 'text-gray-500' 
            : 'text-gray-800'
        }`}>
          {isEmpty ? 'Vazio' : node.name}
        </p>
      </div>
    </div>
  );
};

interface TernaryNetworkTreeProps {
  maxLevels?: number;
}

const TernaryNetworkTree: React.FC<TernaryNetworkTreeProps> = () => {
  const [treeData, setTreeData] = useState<NetworkNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [selectedNode, setSelectedNode] = useState<NetworkNode | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['root']));
  const [loadedLevels, setLoadedLevels] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchNetworkTree();
  }, []);

  const fetchNetworkTree = async () => {
    try {
      const { authenticatedFetch } = await import('@/react-app/lib/authFetch');
      const response = await authenticatedFetch('/api/affiliate/network/tree?max_depth=5');

      if (response.ok) {
        const data = await response.json();
        const convertedData = convertToTernaryStructure(data);
        setTreeData(convertedData);
        setExpandedNodes(new Set(['root', convertedData?.id || '']));
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

  const convertToTernaryStructure = (data: any): NetworkNode => {
    const converted: NetworkNode = {
      id: data.id || 'root',
      name: data.name || data.full_name || 'Você',
      active: data.active !== false,
      level: data.level || 0,
      signup_date: data.signup_date || new Date().toISOString(),
      total_referrals: data.direct_referrals || 0,
      children: {}
    };
    if (typeof data.position_slot === 'number') {
      converted.position = data.position_slot === 0 ? 'left' : data.position_slot === 1 ? 'center' : 'right';
    }

    const slots: { left?: NetworkNode; center?: NetworkNode; right?: NetworkNode } = {};
    const sourceChildren: any[] =
      Array.isArray(data.children) && data.children.length ? data.children :
      Array.isArray(data.raw_data) && data.raw_data.length ? data.raw_data : [];
    try {
      console.log('[TREE] Source children length:', sourceChildren.length, 'node id:', converted.id);
    } catch {}
    if (sourceChildren.length) {
      sourceChildren.forEach((child, idx) => {
        const ps = typeof child.position_slot === 'number' ? child.position_slot : null;
        const childConverted = convertToTernaryStructure({
          id: child.id,
          name: child.full_name || child.name,
          active: child.last_access_at ? (new Date(child.last_access_at).getTime() > (Date.now() - 30 * 24 * 60 * 60 * 1000)) : true,
          level: (converted.level || 0) + 1,
          signup_date: child.created_at,
          direct_referrals: 0,
          position_slot: child.position_slot ?? null,
          children: child.children || [],
        });
        if (ps === 0) {
          slots.left = { ...childConverted, position: 'left' };
        } else if (ps === 1) {
          slots.center = { ...childConverted, position: 'center' };
        } else if (ps === 2) {
          slots.right = { ...childConverted, position: 'right' };
        } else {
          if (!slots.left) slots.left = { ...childConverted, position: 'left' };
          else if (!slots.center) slots.center = { ...childConverted, position: 'center' };
          else if (!slots.right) slots.right = { ...childConverted, position: 'right' };
        }
        // Index-based fallback to ensure visibility
        if (!slots.left && idx === 0) slots.left = { ...childConverted, position: 'left' };
        if (!slots.center && idx === 1) slots.center = { ...childConverted, position: 'center' };
        if (!slots.right && idx === 2) slots.right = { ...childConverted, position: 'right' };
      });
      // Final safety: if still empty, assign first items directly without recursion
      if (!slots.left && sourceChildren[0]) {
        const c = sourceChildren[0];
        slots.left = {
          id: c.id,
          name: c.full_name || c.name || 'Afiliado',
          active: c.last_access_at ? (new Date(c.last_access_at).getTime() > (Date.now() - 30 * 24 * 60 * 60 * 1000)) : true,
          level: (converted.level || 0) + 1,
          signup_date: c.created_at,
          total_referrals: 0,
          children: {},
          position: 'left'
        };
      }
      if (!slots.center && sourceChildren[1]) {
        const c = sourceChildren[1];
        slots.center = {
          id: c.id,
          name: c.full_name || c.name || 'Afiliado',
          active: c.last_access_at ? (new Date(c.last_access_at).getTime() > (Date.now() - 30 * 24 * 60 * 60 * 1000)) : true,
          level: (converted.level || 0) + 1,
          signup_date: c.created_at,
          total_referrals: 0,
          children: {},
          position: 'center'
        };
      }
      if (!slots.right && sourceChildren[2]) {
        const c = sourceChildren[2];
        slots.right = {
          id: c.id,
          name: c.full_name || c.name || 'Afiliado',
          active: c.last_access_at ? (new Date(c.last_access_at).getTime() > (Date.now() - 30 * 24 * 60 * 60 * 1000)) : true,
          level: (converted.level || 0) + 1,
          signup_date: c.created_at,
          total_referrals: 0,
          children: {},
          position: 'right'
        };
      }
    }
    converted.children = slots;

    return converted;
  };

  const handleNodeClick = (node: NetworkNode) => {
    setSelectedNode(node);
  };

  const handleExpandClick = (nodeId: string, level: number) => {
    const isExpanded = expandedNodes.has(nodeId);
    const newExpanded = new Set(expandedNodes);
    
    if (isExpanded) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
      
      // Load more levels if needed (mock implementation)
      if (!loadedLevels.has(`${nodeId}-${level}`)) {
        setLoadedLevels(prev => new Set(prev.add(`${nodeId}-${level}`)));
        // Here you would normally fetch more data from API
      }
    }
    
    setExpandedNodes(newExpanded);
  };

  const renderLevel = (nodes: NetworkNode['children'], level: number, parentExpanded: boolean = true) => {
    if (!parentExpanded || !nodes) return null;

    const leftNode = nodes.left;
    const centerNode = nodes.center;
    const rightNode = nodes.right;

    return (
      <div className="mt-12">
        {/* Connection Lines */}
        <div className="relative">
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-px h-8 bg-gray-300"></div>
          <div className="absolute top-8 left-1/4 right-1/4 h-px bg-gray-300"></div>
          <div className="absolute top-8 left-1/4 transform -translate-x-1/2 w-px h-8 bg-gray-300"></div>
          <div className="absolute top-8 left-1/2 transform -translate-x-1/2 w-px h-8 bg-gray-300"></div>
          <div className="absolute top-8 right-1/4 transform translate-x-1/2 w-px h-8 bg-gray-300"></div>
        </div>

        {/* Nodes Row */}
        <div className="flex justify-center items-start space-x-16 pt-16">
          <div className="flex flex-col items-center">
            <TreeNode
              node={leftNode || null}
              level={level}
              onNodeClick={handleNodeClick}
              onExpandClick={handleExpandClick}
              isExpanded={leftNode ? expandedNodes.has(leftNode.id) : false}
              position="left"
            />
            {leftNode && expandedNodes.has(leftNode.id) && renderLevel(leftNode.children, level + 1, true)}
          </div>

          <div className="flex flex-col items-center">
            <TreeNode
              node={centerNode || null}
              level={level}
              onNodeClick={handleNodeClick}
              onExpandClick={handleExpandClick}
              isExpanded={centerNode ? expandedNodes.has(centerNode.id) : false}
              position="center"
            />
            {centerNode && expandedNodes.has(centerNode.id) && renderLevel(centerNode.children, level + 1, true)}
          </div>

          <div className="flex flex-col items-center">
            <TreeNode
              node={rightNode || null}
              level={level}
              onNodeClick={handleNodeClick}
              onExpandClick={handleExpandClick}
              isExpanded={rightNode ? expandedNodes.has(rightNode.id) : false}
              position="right"
            />
            {rightNode && expandedNodes.has(rightNode.id) && renderLevel(rightNode.children, level + 1, true)}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-8 border border-gray-200 shadow-sm">
        <div className="flex items-center justify-center space-x-3">
          <div className="animate-spin">
            <Users className="w-6 h-6 text-blue-500" />
          </div>
          <span className="text-gray-600">Carregando árvore da rede...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl p-8 border border-gray-200 shadow-sm">
        <div className="text-center">
          <Users className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-800 mb-2">Erro ao Carregar</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchNetworkTree}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  if (!treeData) {
    return (
      <div className="bg-white rounded-xl p-8 border border-gray-200 shadow-sm">
        <div className="text-center">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-800 mb-2">Rede Vazia</h3>
          <p className="text-gray-600">
            Sua rede MLM ainda não possui membros. Comece a indicar pessoas para construir sua rede.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-800 flex items-center">
          <Users className="w-5 h-5 text-blue-500 mr-2" />
          Árvore Ternária MLM
        </h2>
        <p className="text-gray-600 text-sm mt-1">
          Estrutura hierárquica da sua rede com sistema ternário (3 posições por nível)
        </p>
      </div>

      <div className="p-8">
        <div className="min-w-max">
          {/* Root Node */}
          <div className="flex flex-col items-center">
            <TreeNode
              node={treeData}
              level={0}
              onNodeClick={handleNodeClick}
              onExpandClick={handleExpandClick}
              isExpanded={expandedNodes.has(treeData.id)}
            />
            
            {/* Render Children */}
            {treeData && expandedNodes.has(treeData.id) && renderLevel(treeData.children, 1, true)}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="px-6 pb-6">
        <div className="pt-4 border-t border-gray-200">
          <h3 className="text-sm font-medium text-gray-800 mb-3">Legenda</h3>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600"></div>
              <span className="text-gray-700 text-sm">Afiliado Ativo</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-full bg-gray-400"></div>
              <span className="text-gray-700 text-sm">Afiliado Inativo</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-full bg-gray-100 border-2 border-gray-300"></div>
              <span className="text-gray-700 text-sm">Posição Vazia</span>
            </div>
          </div>
          <p className="text-gray-500 text-xs mt-2">
            Clique nas bolinhas para ver detalhes dos afiliados. Use os botões + para expandir sub-níveis.
          </p>
        </div>
      </div>

      {/* Modal */}
      {selectedNode && (
        <NodeModal
          node={selectedNode}
          isOpen={!!selectedNode}
          onClose={() => setSelectedNode(null)}
        />
      )}
    </div>
  );
};

export default TernaryNetworkTree;
