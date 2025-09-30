import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  nodes: [],
  edges: [],
  selectedNodeId: null,
  viewport: { x: 0, y: 0, zoom: 1 },
};

const diagramSlice = createSlice({
  name: 'diagram',
  initialState,
  reducers: {
    setNodes: (state, action) => {
      state.nodes = action.payload;
    },
    setEdges: (state, action) => {
      state.edges = action.payload;
    },
    addNode: (state, action) => {
      state.nodes.push(action.payload);
    },
    removeNode: (state, action) => {
      state.nodes = state.nodes.filter(node => node.id !== action.payload);
      state.edges = state.edges.filter(
        edge => edge.source !== action.payload && edge.target !== action.payload
      );
    },
    updateNode: (state, action) => {
      const index = state.nodes.findIndex(node => node.id === action.payload.id);
      if (index !== -1) {
        state.nodes[index] = { ...state.nodes[index], ...action.payload };
      }
    },
    addEdge: (state, action) => {
      state.edges.push(action.payload);
    },
    removeEdge: (state, action) => {
      state.edges = state.edges.filter(edge => edge.id !== action.payload);
    },
    setSelectedNode: (state, action) => {
      state.selectedNodeId = action.payload;
    },
    setViewport: (state, action) => {
      state.viewport = action.payload;
    },
    resetDiagram: () => initialState,
  },
});

export const {
  setNodes,
  setEdges,
  addNode,
  removeNode,
  updateNode,
  addEdge,
  removeEdge,
  setSelectedNode,
  setViewport,
  resetDiagram,
} = diagramSlice.actions;

export default diagramSlice.reducer;