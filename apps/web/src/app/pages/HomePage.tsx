import { useNavigate } from 'react-router';
import { generateId } from '../../core/ids.ts';

export function HomePage() {
  const navigate = useNavigate();

  const handleCreateBoard = () => {
    const boardId = generateId();
    navigate(`/board/${boardId}`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <h1>CollabBoard</h1>
      <p>Real-time collaborative whiteboard</p>
      <button onClick={handleCreateBoard} style={{ padding: '12px 24px', fontSize: '16px', cursor: 'pointer' }}>
        Create New Board
      </button>
    </div>
  );
}
