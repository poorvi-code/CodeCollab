import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import MonacoEditor from '@monaco-editor/react';
import { useAuth } from '../context/AuthContext.jsx';
import { useSocket } from '../context/SocketContext.jsx';
import { showToast } from '../components/Toast.jsx';
import { GET_ROOM_BY_ID, GET_MESSAGES } from '../services/graphql.js';
import { compilerApi, roomsApi } from '../services/api.js';

const LANGUAGE_OPTIONS = [
  { value: 'javascript', label: 'JavaScript', monaco: 'javascript' },
  { value: 'python', label: 'Python', monaco: 'python' },
  { value: 'c', label: 'C', monaco: 'c' },
  { value: 'cpp', label: 'C++', monaco: 'cpp' },
  { value: 'java', label: 'Java', monaco: 'java' }
];

const BOILERPLATE = {
  javascript: 'console.log("Hello Poorvi");\n',
  python: 'print("Hello Poorvi")\n',
  c: '#include <stdio.h>\n\nint main() {\n    printf("Hello Poorvi\\n");\n    return 0;\n}\n',
  cpp: '#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello Poorvi" << endl;\n    return 0;\n}\n',
  java: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello Poorvi");\n    }\n}\n'
};

const formatStatus = (status) => {
  const labels = {
    success: 'Success',
    compilation_error: 'Compilation Failed',
    runtime_error: 'Runtime Error',
    timeout: 'Execution Timed Out',
    unsupported: 'Unsupported Language'
  };
  return labels[status] || 'Finished';
};

const getSubmissionId = (submission) => submission?._id || submission?.id;

const Room = () => {
  const { id: roomId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const socket = useSocket();

  const editorRef = useRef(null);
  const isIncomingChange = useRef(false);
  const chatEndRef = useRef(null);
  const outputEndRef = useRef(null);

  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [activeTab, setActiveTab] = useState('chat');
  const [customInput, setCustomInput] = useState('');

  const [activeUsers, setActiveUsers] = useState([]);
  const [userCursors, setUserCursors] = useState({});
  const [typingUsers, setTypingUsers] = useState({});
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');

  const [consoleOutput, setConsoleOutput] = useState([
    { text: 'Compiler ready. Select a language, add input if needed, and run code.', type: 'info' }
  ]);
  const [sharedRun, setSharedRun] = useState(null);
  const [submissionHistory, setSubmissionHistory] = useState([]);
  const [isCompiling, setIsCompiling] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);

  const languageConfig = useMemo(
    () => LANGUAGE_OPTIONS.find((item) => item.value === language) || LANGUAGE_OPTIONS[0],
    [language]
  );

  const { loading: roomLoading, data: roomData, error: roomError } = useQuery(GET_ROOM_BY_ID, {
    variables: { id: roomId },
    onCompleted: (data) => {
      setCode(data.room.code || '');
      setLanguage(data.room.language || 'javascript');
    }
  });

  useQuery(GET_MESSAGES, {
    variables: { roomId },
    onCompleted: (data) => {
      setChatMessages(data.messages);
    }
  });

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const history = await compilerApi.getHistory(roomId);
      setSubmissionHistory(history);
    } catch (err) {
      showToast(err.response?.data?.message || 'Unable to load submission history', 'error');
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [roomId]);

  useEffect(() => {
    if (!socket || !user) return;

    socket.emit('join-room', { roomId, userId: user._id });

    socket.on('active-users-list', (users) => {
      setActiveUsers(users);
    });

    socket.on('user-joined', ({ name, activeUsers: updatedUsers }) => {
      setActiveUsers(updatedUsers);
      showToast(`${name} entered the room`, 'info');
    });

    socket.on('user-left', ({ name, activeUsers: updatedUsers }) => {
      setActiveUsers(updatedUsers);
      showToast(`${name} left the room`, 'info');
      setUserCursors((prev) => {
        const copy = { ...prev };
        delete copy[name];
        return copy;
      });
    });

    socket.on('code-update', ({ code: updatedCode }) => {
      isIncomingChange.current = true;
      setCode(updatedCode);
      if (editorRef.current && editorRef.current.getValue() !== updatedCode) {
        const position = editorRef.current.getPosition();
        editorRef.current.setValue(updatedCode);
        if (position) editorRef.current.setPosition(position);
      }
      setTimeout(() => {
        isIncomingChange.current = false;
      }, 50);
    });

    socket.on('language-update', ({ language: updatedLang }) => {
      setLanguage(updatedLang);
      showToast(`Language switched to ${updatedLang}`, 'info');
    });

    socket.on('cursor-update', ({ name, color, cursor }) => {
      setUserCursors((prev) => ({
        ...prev,
        [name]: { cursor, color }
      }));
    });

    socket.on('new-chat-message', (msg) => {
      setChatMessages((prev) => [...prev, msg]);
    });

    socket.on('typing-status', ({ name, isTyping }) => {
      setTypingUsers((prev) => ({
        ...prev,
        [name]: isTyping
      }));
    });

    socket.on('shared-output', ({ result, runner, timestamp }) => {
      setSharedRun({ result, runner, timestamp });
      setConsoleOutput((prev) => [
        ...prev,
        {
          text: `${runner?.name || 'A collaborator'} ran ${result.language}: ${formatStatus(result.status)}`,
          type: result.status === 'success' ? 'success' : 'error'
        },
        {
          text: buildOutputText(result),
          type: result.status === 'success' ? 'success' : 'error'
        }
      ]);
      if (result.submission) {
        setSubmissionHistory((prev) => [result.submission, ...prev.filter((item) => getSubmissionId(item) !== getSubmissionId(result.submission))]);
      }
    });

    return () => {
      socket.off('active-users-list');
      socket.off('user-joined');
      socket.off('user-left');
      socket.off('code-update');
      socket.off('language-update');
      socket.off('cursor-update');
      socket.off('new-chat-message');
      socket.off('typing-status');
      socket.off('shared-output');
    };
  }, [socket, roomId, user]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  useEffect(() => {
    outputEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [consoleOutput]);

  const handleEditorDidMount = (editor) => {
    editorRef.current = editor;

    editor.onDidChangeCursorPosition((e) => {
      if (socket) {
        socket.emit('cursor-move', {
          roomId,
          cursor: {
            lineNumber: e.position.lineNumber,
            column: e.position.column
          }
        });
      }
    });

    let typingTimeout;
    editor.onDidChangeModelContent(() => {
      if (socket && !isIncomingChange.current) {
        socket.emit('typing', { roomId, isTyping: true });

        clearTimeout(typingTimeout);
        typingTimeout = setTimeout(() => {
          socket.emit('typing', { roomId, isTyping: false });
        }, 1500);
      }
    });
  };

  const handleEditorChange = (value) => {
    if (isIncomingChange.current) return;
    const nextCode = value || '';
    setCode(nextCode);
    if (socket) {
      socket.emit('code-change', { roomId, code: nextCode });
    }
  };

  const handleLanguageChange = (e) => {
    const selectedLang = e.target.value;
    setLanguage(selectedLang);
    if (!code.trim()) {
      setCode(BOILERPLATE[selectedLang] || '');
    }
    if (socket) {
      socket.emit('language-change', { roomId, language: selectedLang });
    }
  };

  const handleSendChatMessage = (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !socket) return;

    socket.emit('send-chat-message', { roomId, message: chatInput.trim() });
    setChatInput('');
  };

  const handleLeaveRoom = async () => {
    if (!window.confirm('Are you sure you want to leave this coding room?')) return;
    try {
      await roomsApi.leave(roomId);
      showToast('Left room successfully', 'success');
      navigate('/dashboard');
    } catch (err) {
      showToast('Error leaving room', 'error');
    }
  };

  const handleCopyInviteLink = () => {
    const link = `${window.location.origin}/room/${roomId}`;
    navigator.clipboard.writeText(link);
    showToast('Room invite link copied to clipboard!', 'success');
  };

  const handleRunCode = async () => {
    setIsCompiling(true);
    setConsoleOutput((prev) => [
      ...prev,
      { text: `> Running ${languageConfig.label} code...`, type: 'info' }
    ]);

    try {
      const result = await compilerApi.execute({
        roomId,
        language,
        sourceCode: code,
        input: customInput
      });

      const outputEntry = {
        text: buildOutputText(result),
        type: result.status === 'success' ? 'success' : 'error'
      };
      setConsoleOutput((prev) => [...prev, outputEntry]);
      if (result.submission) {
        setSubmissionHistory((prev) => [result.submission, ...prev]);
      }
      socket?.emit('execution-result', { roomId, result });
    } catch (err) {
      setConsoleOutput((prev) => [
        ...prev,
        { text: err.response?.data?.message || 'Execution request failed.', type: 'error' }
      ]);
    } finally {
      setIsCompiling(false);
    }
  };

  const handleRerunSubmission = (submission) => {
    setLanguage(submission.language);
    setCode(submission.sourceCode);
    setCustomInput(submission.input || '');
    setActiveTab('chat');
    showToast('Submission loaded into the editor', 'success');
  };

  const handleDeleteSubmission = async (submissionId) => {
    try {
      await compilerApi.deleteSubmission(submissionId);
      setSubmissionHistory((prev) => prev.filter((submission) => getSubmissionId(submission) !== submissionId));
      showToast('Submission deleted', 'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'Unable to delete submission', 'error');
    }
  };

  if (roomLoading) {
    return <div style={{ textAlign: 'center', padding: '10rem', color: 'var(--text-muted)' }}>Entering workspace...</div>;
  }

  if (roomError) {
    return (
      <div style={{ textAlign: 'center', padding: '10rem' }}>
        <h3>Error accessing room</h3>
        <p style={{ color: 'var(--text-error)', marginTop: '0.5rem' }}>{roomError.message}</p>
        <button onClick={() => navigate('/dashboard')} className="btn btn-primary" style={{ marginTop: '1rem' }}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  const room = roomData?.room;

  return (
    <main className="workspace fade-in" role="main" aria-label="Coding Workspace - Real-time Code Editor and Collaboration Space with Chat and Compiler">
      <div className="editor-area">
        <div className="editor-header">
          <div className="room-title-row">
            <span className="room-title">{room?.roomName}</span>
            <span className="pill pill-accent">{languageConfig.label}</span>
          </div>

          <div className="editor-controls">
            <select
              value={language}
              onChange={handleLanguageChange}
              className="form-select editor-language-select"
            >
              {LANGUAGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>

            <button
              onClick={handleRunCode}
              className={`btn btn-blue ${isCompiling ? 'btn-disabled' : ''}`}
              disabled={isCompiling}
            >
              {isCompiling ? 'Running...' : 'Run Code'}
            </button>

            <button onClick={handleCopyInviteLink} className="btn btn-secondary">
              Copy Link
            </button>

            <button onClick={handleLeaveRoom} className="btn btn-danger">
              Leave Room
            </button>
          </div>
        </div>

        <div className="monaco-container">
          <MonacoEditor
            height="100%"
            language={languageConfig.monaco}
            value={code}
            onChange={handleEditorChange}
            onMount={handleEditorDidMount}
            theme="vs-dark"
            options={{
              fontSize: 14,
              minimap: { enabled: false },
              automaticLayout: true,
              scrollBeyondLastLine: false,
              cursorBlinking: 'smooth',
              cursorSmoothCaretAnimation: 'on',
              padding: { top: 12 },
              tabSize: 4,
              autoIndent: 'full',
              suggestOnTriggerCharacters: true,
              quickSuggestions: true
            }}
          />
        </div>

        <div className="io-console">
          <div className="input-pane">
            <div className="output-header">
              <span>INPUT CONSOLE</span>
              <button onClick={() => setCustomInput('')} className="console-action">Clear</button>
            </div>
            <textarea
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              className="input-console"
              placeholder="Custom input, one value per line"
            />
          </div>

          <div className="output-pane">
            <div className="output-header">
              <span>OUTPUT CONSOLE</span>
              <button onClick={() => setConsoleOutput([])} className="console-action">Clear</button>
            </div>
            <div className="output-scroll">
              {sharedRun && (
                <div className="shared-output-banner">
                  Last run by {sharedRun.runner?.name || 'collaborator'} at {new Date(sharedRun.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
              {consoleOutput.map((out, idx) => (
                <pre key={`${idx}-${out.text.slice(0, 12)}`} className={`output-line output-${out.type}`}>
                  {out.text}
                </pre>
              ))}
              <div ref={outputEndRef} />
            </div>
          </div>
        </div>
      </div>

      <div className="sidebar-panel">
        <div className="panel-tabs">
          <button className={`panel-tab ${activeTab === 'chat' ? 'active' : ''}`} onClick={() => setActiveTab('chat')}>
            Chat
          </button>
          <button className={`panel-tab ${activeTab === 'members' ? 'active' : ''}`} onClick={() => setActiveTab('members')}>
            Members ({activeUsers.length})
          </button>
          <button className={`panel-tab ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>
            History
          </button>
        </div>

        <div className="panel-content">
          {activeTab === 'chat' && (
            <>
              <div className="chat-messages">
                {chatMessages.length === 0 ? (
                  <div className="empty-panel">Welcome to the chat. Send a message to start communicating.</div>
                ) : (
                  chatMessages.map((msg) => {
                    const isMine = msg.sender?.id === user?._id;
                    return (
                      <div key={msg.id} className={`chat-message-bubble ${isMine ? 'mine' : ''}`}>
                        <span className="chat-sender" style={{ color: msg.sender?.avatarColor || 'var(--accent)' }}>
                          {msg.sender?.name}
                        </span>
                        <div>{msg.message}</div>
                        <span className="chat-time">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    );
                  })
                )}
                <div ref={chatEndRef} />
              </div>

              <form onSubmit={handleSendChatMessage} className="chat-input-area">
                <input
                  type="text"
                  className="chat-input"
                  placeholder="Type a message..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                />
                <button type="submit" className="btn btn-primary chat-send-button">
                  Send
                </button>
              </form>
            </>
          )}

          {activeTab === 'members' && (
            <div className="members-list">
              <h3 className="panel-kicker">Active Collaborators</h3>
              {activeUsers.map((member) => {
                const memberId = member.userId?.toString();
                const isSelf = memberId === user?._id;
                const name = member.name;
                const typing = typingUsers[name];
                const cursorInfo = userCursors[name];

                return (
                  <div key={member.socketId || memberId} className="member-row">
                    <div className="member-info">
                      <div className="user-avatar member-avatar" style={{ backgroundColor: member.avatarColor || 'var(--accent)' }}>
                        {name ? name.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <span className="member-name">{name} {isSelf ? '(You)' : ''}</span>
                    </div>

                    <div className="member-presence">
                      {typing && <span className="member-typing">{name} is typing...</span>}
                      {!typing && cursorInfo?.cursor && (
                        <span>{name} is editing line {cursorInfo.cursor.lineNumber}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="history-list">
              <div className="history-header">
                <h3 className="panel-kicker">Submission History</h3>
                <button onClick={loadHistory} className="console-action">{historyLoading ? 'Loading' : 'Refresh'}</button>
              </div>
              {submissionHistory.length === 0 ? (
                <div className="empty-panel">No submissions yet. Run code to save the first entry.</div>
              ) : (
                submissionHistory.map((submission) => {
                  const submissionId = getSubmissionId(submission);
                  return (
                    <div key={submissionId} className="history-item">
                      <div className="history-meta">
                        <span className={`history-status history-${submission.status}`}>{formatStatus(submission.status)}</span>
                        <span>{submission.language}</span>
                        <span>{submission.executionTimeMs || 0} ms</span>
                      </div>
                      <div className="history-user">
                        {submission.user?.name || 'Unknown'} - {new Date(submission.createdAt).toLocaleString()}
                      </div>
                      <pre className="history-output">{submission.output || submission.error || 'No output'}</pre>
                      <div className="history-actions">
                        <button onClick={() => handleRerunSubmission(submission)} className="btn btn-secondary history-button">Load</button>
                        <button onClick={() => handleDeleteSubmission(submissionId)} className="btn btn-danger history-button">Delete</button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
};

const buildOutputText = (result) => {
  const stats = `Status: ${formatStatus(result.status)} | Time: ${result.executionTimeMs || 0} ms | Memory: ${result.memoryUsageKb || 0} KB`;
  const output = result.output?.trim() ? `\n\n${result.output.trimEnd()}` : '';
  const error = result.error?.trim() ? `\n\n${result.error.trimEnd()}` : '';
  return `${stats}${output}${error}`;
};

export default Room;
