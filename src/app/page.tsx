'use client';

import { useEffect, useState, useRef } from 'react';
import Tree, { TreeNodeDatum } from 'react-d3-tree';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { PasswordProtection } from '../components/PasswordProtection';

interface FamilyMember {
  id: number;
  name: string;
  birth_year: string;
  notes: string;
  phone_number: string;
  address: string;
  generation: number;
  parent_id: number | null;
  spouse_id: number | null;
}

interface CustomTreeNodeDatum extends TreeNodeDatum {
  _collapsed?: boolean;
  spouse?: CustomTreeNodeDatum;
  attributes?: {
    birthYear?: string;
    phoneNumber?: string;
    address?: string;
    notes?: string;
  };
}

interface TreeNode {
  name: string;
  attributes?: {
    birthYear?: string;
    phoneNumber?: string;
    address?: string;
    notes?: string;
  };
  children?: TreeNode[];
  spouse?: TreeNode;
  _collapsed?: boolean;
}

// View options
type ViewType = 'graph' | 'text';

export default function Home() {
  const { isAuthenticated } = useAuth();
  const [treeData, setTreeData] = useState<TreeNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [viewType, setViewType] = useState<ViewType>('graph');
  const treeContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    
    const updateDimensions = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);

    return () => window.removeEventListener('resize', updateDimensions);
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    
    async function fetchFamilyData() {
      try {
        const { data, error } = await supabase
          .from('family_members')
          .select('*')
          .order('generation', { ascending: true });

        if (error) throw error;

        const tree = transformToTree(data);
        setTreeData(tree);
        if (tree) {
          const allNodeNames = new Set<string>();
          const collectNodeNames = (node: TreeNode) => {
            allNodeNames.add(node.name);
            if (node.children) {
              node.children.forEach(collectNodeNames);
            }
          };
          collectNodeNames(tree);
          setExpandedNodes(allNodeNames);
        }
      } catch (err) {
        console.error('Error fetching family data:', err);
        setError('Failed to load family tree data');
      } finally {
        setLoading(false);
      }
    }

    fetchFamilyData();
  }, [isAuthenticated]);

  const transformToTree = (members: FamilyMember[]): TreeNode => {
    const memberMap = new Map<number, TreeNode>();
    let rootNode: TreeNode | null = null;

    // First pass: create all nodes
    members.forEach(member => {
      memberMap.set(member.id, {
        name: member.name,
        attributes: {
          birthYear: member.birth_year,
          phoneNumber: member.phone_number,
          address: member.address,
          notes: member.notes
        },
        children: [],
        _collapsed: false // Initialize all nodes as expanded
      });
    });

    // Second pass: set up relationships
    members.forEach(member => {
      const currentNode = memberMap.get(member.id);
      if (!currentNode) return;

      if (member.parent_id === null && member.generation === 0) {
        rootNode = currentNode;
      }

      if (member.spouse_id !== null) {
        const spouseNode = memberMap.get(member.spouse_id);
        if (spouseNode) {
          currentNode.spouse = spouseNode;
          spouseNode.spouse = currentNode;
        }
      }

      if (member.parent_id !== null) {
        const parentNode = memberMap.get(member.parent_id);
        if (parentNode) {
          parentNode.children = parentNode.children || [];
          parentNode.children.push(currentNode);
        }
      }
    });

    if (!rootNode) {
      rootNode = {
        name: 'Family Tree',
        children: [],
        _collapsed: false
      };
    }

    return rootNode;
  };

  const handleRecenter = () => {
    window.location.reload();
  };

  const handleNodeClick = (nodeDatum: TreeNode) => {
    const nodeName = nodeDatum.name;
    const newExpandedNodes = new Set(expandedNodes);
    
    if (newExpandedNodes.has(nodeName)) {
      newExpandedNodes.delete(nodeName);
      // Recursively collapse all children
      const collapseChildren = (node: TreeNode) => {
        node._collapsed = true;
        if (node.children) {
          node.children.forEach(child => {
            newExpandedNodes.delete(child.name);
            collapseChildren(child);
          });
        }
      };
      collapseChildren(nodeDatum);
    } else {
      newExpandedNodes.add(nodeName);
      nodeDatum._collapsed = false;
    }
    
    setExpandedNodes(newExpandedNodes);
  };

  // Function to toggle view between graph and text
  const toggleView = () => {
    setViewType(viewType === 'graph' ? 'text' : 'graph');
  };

  // Recursive component for the text-based view
  const TextTreeNode = ({ node, depth = 0 }: { node: TreeNode; depth?: number }) => {
    const indentSize = 20; // Pixels per indent level
    const birthYear = node.attributes?.birthYear ? ` (${node.attributes.birthYear})` : '';
    
    return (
      <div>
        <div 
          className="py-1 flex items-baseline" 
          style={{ paddingLeft: `${depth * indentSize}px` }}
        >
          <span className="font-medium">{node.name} </span>
          <span className="text-gray-600 text-sm ml-1">{birthYear}</span>
          
          {node.spouse && (
            <span className="text-gray-600 ml-2">
               - {node.spouse.name}
              {node.spouse.attributes?.birthYear ? ` (${node.spouse.attributes.birthYear})` : ''}
            </span>
          )}
        </div>
        
        {node.children && node.children.length > 0 && (
          
          <div>
            {node.children.map((child, i) => (
              <TextTreeNode key={`${child.name} - ${i}`} node={child} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  // Component for the text-based view
  const TextBasedView = () => {
    if (!treeData) return null;
    
    return (
      <div className="p-6 bg-white rounded-lg shadow-sm overflow-auto max-h-[calc(100vh-200px)]">
        <br></br>
        <div className="font-mono text-sm sm:text-base">
          <TextTreeNode node={treeData} />
        </div>
      </div>
    );
  };

  // If not authenticated, show password protection component
  if (!isAuthenticated) {
    return <PasswordProtection />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-xl">Loading family tree...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-xl text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-bold text-center text-gray-800">
            Silsilah Keluarga Galib Tjakradinata
          </h1>
          
          <div className="flex items-center mt-4 sm:mt-0 space-x-4 p-4">
            <button
              onClick={toggleView}
              className="p-4 px-4 py-2 bg-indigo-600 text-white rounded-md shadow-sm text-sm font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              Ganti Tampilan 
            </button> <div> <p>    </p></div>
            <button
              onClick={handleRecenter}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md shadow-sm text-sm font-medium hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400"
            >
              Perbaharui Halaman 
            </button>
          </div>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-8 m-4px">
        {viewType === 'graph' ? (
          <div 
            ref={treeContainerRef}
            className="relative w-full" 
            style={{ height: 'calc(100vh - 120px)' }}
          >
            {treeData && (
              <Tree
                data={treeData}
                orientation="vertical"
                pathFunc="step"
                translate={{
                  x: dimensions.width < 768 ? dimensions.width / 4 : dimensions.width / 3,
                  y: dimensions.height / 2
                }}
                nodeSize={{
                  x: dimensions.width < 768 ? 150 : 200,
                  y: dimensions.width < 768 ? 80 : 100
                }}
                separation={{
                  siblings: dimensions.width < 768 ? 1.5 : 2,
                  nonSiblings: dimensions.width < 768 ? 1.5 : 2
                }}
                renderCustomNodeElement={({ nodeDatum, toggleNode }) => {
                  const customNode = nodeDatum as CustomTreeNodeDatum;
                  const isExpanded = expandedNodes.has(customNode.name);
                  const hasChildren = customNode.children && customNode.children.length > 0;
                  
                  return (
                    <g>
                      <circle
                        r={dimensions.width < 768 ? 15 : 20}
                        fill={hasChildren ? (isExpanded ? "#0047AB" : "#D22B2B") : "#0047AB"}
                        onClick={() => {
                          handleNodeClick(customNode);
                          toggleNode();
                        }}
                        className="cursor-pointer hover:opacity-80 transition-colors"
                      />
                      <text
                        dy={dimensions.width < 768 ? 30 : 35}
                        textAnchor="middle"
                        className="text-xs md:text-sm font-medium"
                      >
                        {customNode.name}
                      </text>
                      {customNode.attributes?.birthYear && (
                        <text
                          dy={dimensions.width < 768 ? 45 : 55}
                          textAnchor="middle"
                          className="text-[10px] md:text-xs text-gray-600"
                        >
                          {customNode.attributes.birthYear}
                        </text>
                      )}
                      {customNode.spouse && (
                        <text
                          dy={dimensions.width < 768 ? 60 : 75}
                          textAnchor="middle"
                          className="text-[10px] md:text-xs text-gray-600"
                        >
                          Pasangan: {customNode.spouse.name}
                        </text>
                      )}
                    </g>
                  );
                }}
              />
            )}
          </div>
        ) : (
          <TextBasedView />
        )}
      </main>
    </div>
  );
}