import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { setNodes, setEdges, setSelectedNode, setViewport } from '@/features/diagram/diagramSlice';
import ServiceNode from './ServiceNode';

const nodeTypes = {
  service: ServiceNode,
};

const DiagramCanvas = () => {
  const dispatch = useDispatch();
  const { nodes: storeNodes, edges: storeEdges, viewport } = useSelector((state) => state.diagram);

  const [nodes, , onNodesChange] = useNodesState(storeNodes);
  const [edges, , onEdgesChange] = useEdgesState(storeEdges);

  const onConnect = useCallback(
    (params) => {
      const newEdges = addEdge(params, edges);
      dispatch(setEdges(newEdges));
    },
    [edges, dispatch]
  );

  const onNodeClick = useCallback(
    (event, node) => {
      dispatch(setSelectedNode(node.id));
    },
    [dispatch]
  );

  const onNodesChangeHandler = useCallback(
    (changes) => {
      onNodesChange(changes);
      const updatedNodes = changes.reduce((acc, change) => {
        if (change.type === 'position' && change.dragging === false) {
          return acc.map((node) =>
            node.id === change.id ? { ...node, position: change.position } : node
          );
        }
        return acc;
      }, nodes);
      dispatch(setNodes(updatedNodes));
    },
    [nodes, onNodesChange, dispatch]
  );

  const onEdgesChangeHandler = useCallback(
    (changes) => {
      onEdgesChange(changes);
      const updatedEdges = changes.reduce((acc, change) => {
        if (change.type === 'remove') {
          return acc.filter((edge) => edge.id !== change.id);
        }
        return acc;
      }, edges);
      dispatch(setEdges(updatedEdges));
    },
    [edges, onEdgesChange, dispatch]
  );

  const onMoveEnd = useCallback(
    (event, viewport) => {
      dispatch(setViewport(viewport));
    },
    [dispatch]
  );

  return (
    <div className="w-full h-full bg-muted/20">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChangeHandler}
        onEdgesChange={onEdgesChangeHandler}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onMoveEnd={onMoveEnd}
        nodeTypes={nodeTypes}
        defaultViewport={viewport}
        fitView
      >
        <Background color="#aaa" gap={16} />
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            switch (node.type) {
              case 'service':
                return '#3b82f6';
              default:
                return '#64748b';
            }
          }}
        />
      </ReactFlow>
    </div>
  );
};

export default DiagramCanvas;