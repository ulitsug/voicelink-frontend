import React, { useState, useEffect } from 'react';
import { calendarAPI } from '../services/api';
import {
  FiCalendar, FiPlus, FiTrash2, FiClock, FiEdit2, FiX, FiCheck, FiXCircle
} from 'react-icons/fi';

export default function CalendarView() {
  const [events, setEvents] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    scheduled_at: '',
    duration_minutes: 30,
    reminder_minutes: 15,
    event_type: 'call',
  });

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      const { data } = await calendarAPI.getEvents();
      setEvents(data.events || []);
    } catch (e) {
      console.error('Failed to load events:', e);
    }
  };

  const handleCreate = async () => {
    if (!form.title || !form.scheduled_at) return;
    try {
      await calendarAPI.createEvent(form);
      setForm({
        title: '', description: '', scheduled_at: '',
        duration_minutes: 30, reminder_minutes: 15, event_type: 'call',
      });
      setShowCreate(false);
      loadEvents();
    } catch (e) {
      console.error('Create event failed:', e);
    }
  };

  const handleDelete = async (eventId) => {
    try {
      await calendarAPI.deleteEvent(eventId);
      loadEvents();
    } catch (e) {
      console.error('Delete event failed:', e);
    }
  };

  const handleRespond = async (eventId, status) => {
    try {
      await calendarAPI.respondToEvent(eventId, status);
      loadEvents();
    } catch (e) {
      console.error('Respond failed:', e);
    }
  };

  const sortedEvents = [...events].sort(
    (a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at)
  );

  const upcomingEvents = sortedEvents.filter(
    (e) => new Date(e.scheduled_at) >= new Date()
  );
  const pastEvents = sortedEvents.filter(
    (e) => new Date(e.scheduled_at) < new Date()
  );

  return (
    <div className="calendar-view">
      <div className="panel-actions">
        <button className="btn-icon" onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? <FiX size={18} /> : <FiPlus size={18} />}
        </button>
      </div>

      {showCreate && (
        <div className="create-event-form">
          <input
            type="text"
            placeholder="Event Title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <textarea
            placeholder="Description (optional)"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <input
            type="datetime-local"
            value={form.scheduled_at}
            onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })}
          />
          <div className="form-row">
            <div className="form-field">
              <label>Duration (min)</label>
              <input
                type="number"
                value={form.duration_minutes}
                onChange={(e) => setForm({ ...form, duration_minutes: parseInt(e.target.value) || 30 })}
                min="5"
              />
            </div>
            <div className="form-field">
              <label>Reminder (min before)</label>
              <input
                type="number"
                value={form.reminder_minutes}
                onChange={(e) => setForm({ ...form, reminder_minutes: parseInt(e.target.value) || 15 })}
                min="0"
              />
            </div>
            <div className="form-field">
              <label>Type</label>
              <select
                value={form.event_type}
                onChange={(e) => setForm({ ...form, event_type: e.target.value })}
              >
                <option value="call">Call</option>
                <option value="meeting">Meeting</option>
              </select>
            </div>
          </div>
          <button className="btn-primary" onClick={handleCreate}>
            Schedule Event
          </button>
        </div>
      )}

      <div className="events-section">
        <h3>Upcoming</h3>
        {upcomingEvents.length === 0 ? (
          <div className="empty-state small">
            <FiCalendar size={32} />
            <p>No upcoming events</p>
          </div>
        ) : (
          upcomingEvents.map((event) => (
            <div key={event.id} className="event-card">
              <div className="event-date">
                <span className="event-day">
                  {new Date(event.scheduled_at).toLocaleDateString([], { day: 'numeric' })}
                </span>
                <span className="event-month">
                  {new Date(event.scheduled_at).toLocaleDateString([], { month: 'short' })}
                </span>
              </div>
              <div className="event-details">
                <span className="event-title">{event.title}</span>
                <span className="event-time">
                  <FiClock size={12} />
                  {new Date(event.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  {' · '}{event.duration_minutes} min
                </span>
                {event.description && (
                  <span className="event-desc">{event.description}</span>
                )}
              </div>
              <div className="event-actions">
                <button
                  className="btn-action success"
                  onClick={() => handleRespond(event.id, 'accepted')}
                  title="Accept"
                >
                  <FiCheck size={14} />
                </button>
                <button
                  className="btn-action warning"
                  onClick={() => handleRespond(event.id, 'declined')}
                  title="Decline"
                >
                  <FiXCircle size={14} />
                </button>
                <button className="btn-action danger" onClick={() => handleDelete(event.id)}>
                  <FiTrash2 size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {pastEvents.length > 0 && (
        <div className="events-section past">
          <h3>Past Events</h3>
          {pastEvents.slice(0, 10).map((event) => (
            <div key={event.id} className="event-card past">
              <div className="event-date">
                <span className="event-day">
                  {new Date(event.scheduled_at).toLocaleDateString([], { day: 'numeric' })}
                </span>
                <span className="event-month">
                  {new Date(event.scheduled_at).toLocaleDateString([], { month: 'short' })}
                </span>
              </div>
              <div className="event-details">
                <span className="event-title">{event.title}</span>
                <span className="event-time">
                  <FiClock size={12} />
                  {new Date(event.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
