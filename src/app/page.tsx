'use client';

import { useEffect, useState, useRef } from 'react';
import Tree, { TreeNodeDatum } from 'react-d3-tree';
import { supabase } from '../lib/supabase';

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

export default function Home() {
  const [treeData, setTreeData] = useState<TreeNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const treeContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateDimensions = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);

    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  useEffect(() => {
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
  }, []);

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
        <div className="container mx-auto px-4 py-4 flex flex-col items-center">
          <h1 className="text-2xl md:text-3xl font-bold text-center text-gray-800">
            Family Tree
          </h1>
          <p className="text-sm text-center mt-2">
            <span className="text-indigo-600">●</span> Click the node to collapse/expand 
          </p>
          <p className="text-sm text-center mt-2">
            <span className="text-indigo-600">●</span> Click <span 
              onClick={handleRecenter} 
              style={{ color: 'blue', cursor: 'pointer' }}
            >here</span> to refresh
          </p>
          
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">
        <div 
          ref={treeContainerRef}
          className="relative w-full" 
          style={{ height: 'calc(100vh - 120px)' }}
        >
          {treeData && (
            <Tree
              data={treeData}
              orientation="horizontal"
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
                      fill={hasChildren ? (isExpanded ? "#4F46E5" : "#EF4444") : "#4F46E5"}
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
                        Spouse: {customNode.spouse.name}
                      </text>
                    )}
                  </g>
                );
              }}
            />
          )}

        </div>
      </main>
    </div>
  );
} 