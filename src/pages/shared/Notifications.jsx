import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { LoadingSpinner, Badge, EmptyState } from '../../components/ui';
import { Bell, Check, CheckCheck, Trash2, Clock, AlertTriangle, Pill, CalendarDays, Heart, Shield } from 'lucide-react';
import { formatDateTime } from '../../data/demoDate';
import { markNotificationRead, markAllNotificationsRead } from '../../services/dataService';

export default function Notifications() {
  const { currentUser, data, refreshData, addToast } = useApp();
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all');

  const notifications = useMemo(() => {
    if (!currentUser || !data?.notifications) return [];
    return data.notifications
      .filter(n => n.userId === currentUser.id)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [currentUser, data?.notifications]);

  const filtered = useMemo(() => {
    if (filter === 'unread') return notifications.filter(n => !n.read);
    if (filter === 'clinical') return notifications.filter(n => ['prescription', 'escalation', 'safety', 'refill'].includes(n.type));
    return notifications;
  }, [notifications, filter]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkAsRead = async (id, e) => {
    e?.stopPropagation();
    await markNotificationRead(id);
    refreshData();
  };

  const handleMarkAllRead = async () => {
    if (!currentUser) return;
    await markAllNotificationsRead(currentUser.id);
    refreshData();
    addToast({ type: 'success', message: 'All notifications marked as read' });
  };

  const handleClickNotification = async (n) => {
    if (!n.read) {
      await markNotificationRead(n.id);
      refreshData();
    }

    // Role-aware navigation based on notification type
    if (n.type === 'prescription' || n.type === 'medication') {
      navigate(currentUser.role === 'patient' ? '/patient/medications' : '/doctor/prescriptions');
    } else if (n.type === 'safety' || n.type === 'alert') {
      navigate(currentUser.role === 'patient' ? '/patient/safety' : '/doctor/escalations');
    } else if (n.type === 'appointment') {
      navigate('/appointments');
    } else if (n.type === 'counselling' || n.type === 'refill' || n.type === 'escalation') {
      if (currentUser.role === 'pharmacist') navigate('/pharmacist/dashboard');
      else if (currentUser.role === 'doctor') navigate('/doctor/escalations');
      else navigate('/patient/dashboard');
    } else if (n.type === 'screening') {
      navigate('/patient/screening');
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'prescription':
      case 'medication':
      case 'refill':
        return <Pill size={16} className="text-secondary" />;
      case 'safety':
      case 'escalation':
      case 'alert':
        return <AlertTriangle size={16} className="text-danger" />;
      case 'appointment':
        return <CalendarDays size={16} className="text-primary" />;
      case 'counselling':
        return <Heart size={16} className="text-rose-500" />;
      default:
        return <Bell size={16} className="text-gray-500" />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight">Clinical Notifications & Alerts</h1>
          <p className="text-sm font-semibold text-slate-700 mt-0.5">
            Real-time notifications, prescription renewals, lab alerts, and physician communications.
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="btn-secondary text-sm font-bold flex items-center gap-2 cursor-pointer self-start sm:self-auto"
          >
            <CheckCheck size={16} />
            <span>Mark all as read</span>
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setFilter('all')}
          className={`px-3.5 py-1.5 rounded-lg text-sm font-bold transition-colors cursor-pointer ${
            filter === 'all' ? 'bg-primary text-white shadow-xs' : 'text-slate-800 hover:bg-slate-100'
          }`}
        >
          All ({notifications.length})
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`px-3.5 py-1.5 rounded-lg text-sm font-bold transition-colors cursor-pointer ${
            filter === 'unread' ? 'bg-primary text-white shadow-xs' : 'text-slate-800 hover:bg-slate-100'
          }`}
        >
          Unread ({unreadCount})
        </button>
        <button
          onClick={() => setFilter('clinical')}
          className={`px-3.5 py-1.5 rounded-lg text-sm font-bold transition-colors cursor-pointer ${
            filter === 'clinical' ? 'bg-primary text-white shadow-xs' : 'text-slate-800 hover:bg-slate-100'
          }`}
        >
          Clinical Alerts
        </button>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="card p-12 text-center border border-slate-200">
            <EmptyState
              icon={Bell}
              title="No notifications"
              description={filter === 'unread' ? 'You have caught up with all your notifications!' : 'No notifications match your current filter.'}
            />
          </div>
        ) : (
          filtered.map(item => (
            <div
              key={item.id}
              onClick={() => handleClickNotification(item)}
              className={`card p-4 flex items-start gap-4 transition-all duration-200 cursor-pointer border hover:shadow-md ${
                !item.read ? 'bg-teal-50/50 border-teal-300 shadow-xs' : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="p-2.5 rounded-xl bg-slate-100 border border-slate-200 shrink-0 mt-0.5">
                {getTypeIcon(item.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h3 className={`text-base ${!item.read ? 'font-black text-slate-950' : 'font-bold text-slate-900'}`}>
                    {item.title}
                  </h3>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                      <Clock size={13} />
                      {formatDateTime(item.createdAt)}
                    </span>
                    {!item.read && (
                      <button
                        title="Mark as read"
                        onClick={(e) => handleMarkAsRead(item.id, e)}
                        className="p-1.5 hover:bg-slate-200 rounded text-slate-700 hover:text-slate-950 transition-colors cursor-pointer"
                      >
                        <Check size={15} />
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-sm font-semibold text-slate-800 mt-1 leading-relaxed">
                  {item.message}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-800 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                    {item.type || 'Alert'}
                  </span>
                  {!item.read && (
                    <span className="w-2.5 h-2.5 rounded-full bg-teal-600 animate-pulse" />
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
