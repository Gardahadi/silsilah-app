'use client';

import { useEffect, useState } from 'react';
import Tree from 'react-d3-tree';
import { supabase } from '../lib/supabase';

interface TreeNode {
  name: string;
  children?: TreeNode[];
}

export default function Home() {
  const [treeData, setTreeData] = useState<TreeNode | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTreeData() {
      try {
        const { data, error } = await supabase
          .from('tree_nodes')
          .select('*');

        if (error) throw error;

        // Transform the flat data into a tree structure
        const tree = transformToTree(data);
        setTreeData(tree);
      } catch (error) {
        console.error('Error fetching tree data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchTreeData();
  }, []);

  const transformToTree = (nodes: any[]): TreeNode => {
    const nodeMap = new Map();
    let root: TreeNode | null = null;

    // First pass: create all nodes
    nodes.forEach(node => {
      nodeMap.set(node.id, {
        name: node.name,
        children: []
      });
    });

    // Second pass: build the tree structure
    nodes.forEach(node => {
      const treeNode = nodeMap.get(node.id);
      if (node.parent_id === null) {
        root = treeNode;
      } else {
        const parent = nodeMap.get(node.parent_id);
        if (parent) {
          parent.children.push(treeNode);
        }
      }
    });

    return root || { name: 'Root', children: [] };
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <main className="min-h-screen p-8">
      <h1 className="text-2xl font-bold mb-4">Tree Visualization</h1>
      <div className="w-full h-[600px] border border-gray-200 rounded-lg">
        {treeData && (
          <Tree
            data={treeData}
            orientation="vertical"
            pathFunc="step"
            translate={{ x: 400, y: 50 }}
          />
        )}
      </div>
    </main>
  );
} 