import React, { useRef, useReducer, useEffect, useState } from 'react';

const COLORS = ['red','blue','yellow','green'];
const CELL_SIZE = 50;


function reducer(state, action) {
  switch (action.type) {
    case 'ADD':
      return { ...state, placed: [...state.placed, action.payload] };
    case 'REMOVE':
      return { ...state, placed: state.placed.filter(t => t.key !== action.payload) };
    case 'CLEAR':
      return { ...state, placed: [] };
    default:
      return state;
  }
}

export default function WangPlayground() {
  const canvasRef = useRef(null);


  const [cols, setCols] = useState(10);
  const [rows, setRows] = useState(10);

// Compute canvas size
  const gridPixelWidth = CELL_SIZE * cols;
  const gridPixelHeight = CELL_SIZE * rows;
  const canvasSize = Math.max(gridPixelWidth, gridPixelHeight);

// Centering offsets
  const offsetX = (canvasSize - gridPixelWidth) / 2;
  const offsetY = (canvasSize - gridPixelHeight) / 2;

  // Palette + custom tile state
  const [palette, setPalette]   = useState([
    { id:'A', edges:{n:0,e:1,s:2,w:1} },
    { id:'B', edges:{n:1,e:2,s:1,w:0} },
    { id:'C', edges:{n:2,e:2,s:0,w:3} },
    { id:'D', edges:{n:3,e:0,s:3,w:2} },
  ]);
  const [newEdges, setNewEdges] = useState({n:0,e:0,s:0,w:0});
  const [state, dispatch]       = useReducer(reducer, { placed: [] });
  const [drag, setDrag]         = useState(null);
  const [mp, setMp]             = useState({ x: 0, y: 0 });

  // Stripe definitions: [dir, ox, oy, w, h]
  const stripes = [
    ['n', 0,             0,              CELL_SIZE, 5],
    ['s', 0,             CELL_SIZE - 5,  CELL_SIZE, 5],
    ['w', 0,             0,              5,         CELL_SIZE],
    ['e', CELL_SIZE - 5, 0,              5,         CELL_SIZE],
  ];

// Global mouse tracking for drag-and-drop
  useEffect(() => {
    const onMove = e => {
      const rect = canvasRef.current.getBoundingClientRect();
      setMp({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    };
    const onUp = () => {
      if (drag) {
        const gx = Math.floor((mp.x - offsetX) / CELL_SIZE);
        const gy = Math.floor((mp.y - offsetY) / CELL_SIZE);
        if (
          gx >= 0 && gy >= 0 && gx < cols && gy < rows &&
          !state.placed.some(p => p.x === gx && p.y === gy) &&
          match(gx, gy, drag)
        ) {
          dispatch({ type: 'ADD', payload: { key: Date.now(), x: gx, y: gy, tile: drag } });
        }
      }
      setDrag(null);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [drag, mp, state.placed, cols, rows, offsetX, offsetY]);


  // Draw grid, placed tiles, and preview
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    canvas.width = canvasSize;
    canvas.height = canvasSize;
    ctx.clearRect(0, 0, canvasSize, canvasSize);

    // Draw background grid area
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 1;
    for (let i = 0; i <= cols; i++) {
      const x = offsetX + i * CELL_SIZE;
      ctx.beginPath(); ctx.moveTo(x, offsetY); ctx.lineTo(x, offsetY + gridPixelHeight); ctx.stroke();
    }
    for (let j = 0; j <= rows; j++) {
      const y = offsetY + j * CELL_SIZE;
      ctx.beginPath(); ctx.moveTo(offsetX, y); ctx.lineTo(offsetX + gridPixelWidth, y); ctx.stroke();
    }

    // Placed tiles
    state.placed.forEach(({ x, y, tile }) => {
      const px = offsetX + x * CELL_SIZE;
      const py = offsetY + y * CELL_SIZE;
      ctx.fillStyle = '#fff'; ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);
      ctx.strokeStyle = '#333'; ctx.strokeRect(px, py, CELL_SIZE, CELL_SIZE);
      stripes.forEach(([d, ox, oy, w, h]) => {
        ctx.fillStyle = COLORS[tile.edges[d]];
        ctx.fillRect(px + ox, py + oy, w, h);
      });
    });

  // Drag preview
    if (drag) {
      const gx = Math.floor((mp.x - offsetX) / CELL_SIZE);
      const gy = Math.floor((mp.y - offsetY) / CELL_SIZE);
      if (gx >= 0 && gy >= 0 && gx < cols && gy < rows) {
        const px = offsetX + gx * CELL_SIZE;
        const py = offsetY + gy * CELL_SIZE;
        ctx.globalAlpha = 0.4;
        ctx.fillStyle = '#fff'; ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);
        ctx.strokeStyle = '#555'; ctx.strokeRect(px, py, CELL_SIZE, CELL_SIZE);
        stripes.forEach(([d, ox, oy, w, h]) => {
          ctx.fillStyle = COLORS[drag.edges[d]];
          ctx.fillRect(px + ox, py + oy, w, h);
        });
        ctx.globalAlpha = 1;
      }
    }
  }, [state.placed, drag, mp, cols, rows, canvasSize, offsetX, offsetY]);

  
  const onClick = e => {
    const rect = canvasRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const gx = Math.floor((mx - offsetX) / CELL_SIZE);
    const gy = Math.floor((my - offsetY) / CELL_SIZE);
    const found = state.placed.find(p => p.x === gx && p.y === gy);
    if (found) dispatch({ type: 'REMOVE', payload: found.key });
  };

  // Edge matching
  const match = (gx, gy, tile) => {
    const offs = { n: [0, -1], e: [1, 0], s: [0, 1], w: [-1, 0] };
    const opp  = { n: 's', s: 'n', e: 'w', w: 'e' };
    return Object.entries(offs).every(([d, [dx, dy]]) => {
      const nb = state.placed.find(p => p.x === gx + dx && p.y === gy + dy);
      return !nb || nb.tile.edges[opp[d]] === tile.edges[d];
    });
  };

  // Add custom tile
  const addCustomTile = () => {
    const duplicate = palette.some(p =>
      ['n','e','s','w'].every(d => p.edges[d] === newEdges[d])
    );
    if (duplicate) {
      alert('Duplicate tile!');
      return;
    }
    const id = 'U' + (palette.length + 1);
    setPalette([...palette, { id, edges: { ...newEdges } }]);
    setNewEdges({ n:0, e:0, s:0, w:0 });
  };


  const panelStyle = {
    padding: '20px',
    background: '#f9f9f9',
    borderRadius: '8px',
    boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
    marginRight: '20px',
    minWidth: '220px'
  };
  const buttonStyle = {
    marginTop: '10px',
    padding: '8px 12px',
    border: 'none',
    borderRadius: '4px',
    background: '#4a90e2',
    color: 'white',
    cursor: 'pointer'
  };
  const inputStyle = {
    width: '60px',
    padding: '4px',
    borderRadius: '4px',
    border: '1px solid #ccc'
  };

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <div style={panelStyle}>
        <h3 style={{ marginTop: 0 }}>Tile Set</h3>
        {palette.map(tile => (
          <div key={tile.id} style={{ margin: '8px 0', cursor: 'grab' }}
               onMouseDown={e => { e.preventDefault(); setDrag(tile); }}>
            <div style={{ width: 40, height: 40, position: 'relative', border: '1px solid #333', borderRadius: '4px' }}>
              {['n','e','s','w'].map(dir => {
                const map = { n:[0,0,40,5], s:[0,35,40,5], w:[0,0,5,40], e:[35,0,5,40] };
                const [ox, oy, w, h] = map[dir];
                return <div key={dir} style={{ position:'absolute', left:ox, top:oy, width:w, height:h, background:COLORS[tile.edges[dir]] }} />;
              })}
            </div>
          </div>
        ))}
        <h4>New Tile</h4>
        {['n','e','s','w'].map(dir => (
          <div key={dir} style={{ margin: '6px 0' }}>
            <label>{dir.toUpperCase()}:</label>
            <select value={newEdges[dir]} onChange={e => setNewEdges({ ...newEdges, [dir]: +e.target.value })}
                    style={{ marginLeft: '8px', padding: '4px 6px', borderRadius: '4px', border: '1px solid #ccc' }}>
              {COLORS.map((c,i) => <option key={c} value={i}>{c}</option>)}
            </select>
          </div>
        ))}
        <button onClick={addCustomTile} style={buttonStyle}>Add Tile</button>

        <h4>Grid Size</h4>
        <div style={{ margin: '6px 0' }}>
          <label>Cols:</label>
          <input
            type="number"
            min={2} max={20}
            value={cols}
            onChange={e => {
              const v = +e.target.value;
              setCols(Math.min(20, Math.max(2, isNaN(v) ? 2 : v)));
            }}
            style={inputStyle}
          />
        </div>
        <div style={{ margin: '6px 0' }}>
          <label>Rows:</label>
          <input
            type="number"
            min={2} max={20}
            value={rows}
            onChange={e => {
              const v = +e.target.value;
              setRows(Math.min(20, Math.max(2, isNaN(v) ? 2 : v)));
            }}
            style={inputStyle}
          />
        </div>

        <button onClick={() => dispatch({ type: 'CLEAR' })} style={buttonStyle}>Clear Canvas</button>
      </div>

      <canvas
        ref={canvasRef}
        width={canvasSize}
        height={canvasSize}
        style={{ border: '2px solid #333', borderRadius: '8px', flexShrink: 0 }}
        onClick={onClick}
      />
    </div>
  );
}
