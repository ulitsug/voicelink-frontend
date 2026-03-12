import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCall } from '../contexts/CallContext';
import { callsAPI } from '../services/api';
import {
  FiPhone, FiVideo, FiPhoneIncoming, FiPhoneOutgoing, FiPhoneMissed, FiClock,
} from 'react-icons/fi';

export default function CallHistory({ onlineUsers = [] }) {
  const { user } = useAuth();
  const { initiateCall } = useCall();
  const [calls, setCalls] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadHistory();
  }, [page]);

  const loadHistory = async () => {
    try {
      const { data } = await callsAPI.getHistory(page);
      setCalls(data.calls || []);
      setTotalPages(data.pages || 1);
    } catch (e) {
      console.error('Failed to load call history:', e);
    }
  };

  const getCallIcon = (call, userId) => {
    if (call.status === 'missed' || call.status === 'rejected') {
      return <FiPhoneMissed size={16} className="call-missed" />;
    }
    if (call.caller_id === userId) {
      return <FiPhoneOutgoing size={16} className="call-outgoing" />;
    }
    return <FiPhoneIncoming size={16} className="call-incoming" />;
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '—';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  return (
    <div className="call-history">
      {calls.length === 0 ? (
        <div className="empty-state">
          <FiClock size={48} />
          <p>No call history</p>
          <span>Your calls will appear here</span>
        </div>
      ) : (
        <div className="calls-list">
          {calls.map((call) => (
            <div key={call.id} className={`call-item ${call.status}`}>
              <div className="call-type-icon">
                {call.call_type === 'video' ? <FiVideo size={18} /> : <FiPhone size={18} />}
              </div>
              <div className="call-info">
                <span className="call-contact">
                  {call.caller?.display_name || call.callee?.display_name || 'Unknown'}
                </span>
                <span className="call-meta">
                  {call.call_type} · {call.status}
                  {call.duration > 0 && ` · ${formatDuration(call.duration)}`}
                </span>
              </div>
              <div className="call-time">
                <span>{new Date(call.started_at).toLocaleDateString()}</span>
                <span>{new Date(call.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className="call-actions">
                {(() => {
                  const other = call.caller_id === user?.id ? call.callee : call.caller;
                  const otherId = call.caller_id === user?.id ? call.callee_id : call.caller_id;
                  const online = onlineUsers.some((u) => u.id === otherId);
                  return other ? (
                    <>
                      <button
                        className="btn-action call"
                        onClick={() => initiateCall(other, 'voice')}
                        title={online ? 'Call back' : 'Call back (user offline)'}
                      >
                        <FiPhone size={14} />
                      </button>
                      <button
                        className="btn-action video"
                        onClick={() => initiateCall(other, 'video')}
                        title={online ? 'Video call' : 'Video call (user offline)'}
                      >
                        <FiVideo size={14} />
                      </button>
                    </>
                  ) : null;
                })()}
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="pagination">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
          <span>{page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</button>
        </div>
      )}
    </div>
  );
}
