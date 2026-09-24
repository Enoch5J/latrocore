import { useState, useMemo, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { LoadingSpinner, Badge, EmptyState, Avatar } from '../../components/ui';
import { MessageSquare, Send, User, Search, Clock, CheckCheck, ShieldAlert, PhoneCall, ArrowLeft } from 'lucide-react';
import { formatDateTime, formatTime } from '../../data/demoDate';
import { addMessage, markMessageRead } from '../../services/dataService';

export default function Messages() {
  const { currentUser, data, refreshData, addToast } = useApp();
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [inputText, setInputText] = useState('');
  const [search, setSearch] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    setTimeout(() => setLoading(false), 200);
  }, []);

  // Determine contacts linked to current user
  const contacts = useMemo(() => {
    if (!currentUser || !data?.users) return [];
    const allUsers = Object.values(data.users);

    if (currentUser.role === 'patient') {
      return allUsers.filter(u => u.id === currentUser.assignedDoctor || u.id === currentUser.assignedPharmacist);
    } else if (currentUser.role === 'doctor') {
      const assignedPatients = currentUser.assignedPatients || [];
      return allUsers.filter(u => assignedPatients.includes(u.id) || u.role === 'pharmacist');
    } else if (currentUser.role === 'pharmacist') {
      const assignedPatients = currentUser.assignedPatients || [];
      return allUsers.filter(u => assignedPatients.includes(u.id) || u.role === 'doctor');
    } else {
      return allUsers.filter(u => u.id !== currentUser.id);
    }
  }, [currentUser, data?.users]);

  // Set default selected user on desktop
  useEffect(() => {
    if (contacts.length > 0 && !selectedUserId) {
      setSelectedUserId(contacts[0].id);
    }
  }, [contacts, selectedUserId]);

  const selectedUser = data?.users?.[selectedUserId];

  // Filter messages between currentUser and selectedUser
  const conversation = useMemo(() => {
    if (!currentUser || !selectedUserId || !data?.messages) return [];
    return data.messages
      .filter(m =>
        (m.senderId === currentUser.id && m.receiverId === selectedUserId) ||
        (m.senderId === selectedUserId && m.receiverId === currentUser.id)
      )
      .sort((a, b) => new Date(a.timestamp) - new Date(a.timestamp));
  }, [currentUser, selectedUserId, data?.messages]);

  // Mark incoming unread messages as read
  useEffect(() => {
    if (conversation.length > 0 && currentUser) {
      conversation.forEach(m => {
        if (m.receiverId === currentUser.id && !m.read) {
          markMessageRead(m.id);
        }
      });
    }
  }, [conversation, currentUser]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation]);

  const handleSelectContact = (id) => {
    setSelectedUserId(id);
    setShowMobileChat(true);
  };

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!inputText.trim() || !selectedUserId || !currentUser) return;

    const newMsg = {
      senderId: currentUser.id,
      receiverId: selectedUserId,
      text: inputText.trim(),
    };

    setInputText('');
    await addMessage(newMsg);
    refreshData();
  };

  const filteredContacts = useMemo(() => {
    if (!search) return contacts;
    return contacts.filter(c =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.role.toLowerCase().includes(search.toLowerCase())
    );
  }, [contacts, search]);

  if (loading) return <LoadingSpinner text="Loading messages..." />;

  return (
    <div className="space-y-4 animate-fade-in pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight">Clinical Messaging Hub</h1>
          <p className="text-sm font-semibold text-slate-700 mt-0.5">
            Direct, secure communication between patients and designated clinical team.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="bg-emerald-50 text-emerald-950 border border-emerald-300 rounded-full px-3 py-1 text-xs font-bold flex items-center gap-2 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
            Active Clinical Channel
          </span>
        </div>
      </div>

      {/* Main Messaging Box */}
      <div className="card h-[calc(100vh-230px)] min-h-[520px] flex overflow-hidden border border-slate-200 shadow-sm">
        {/* Contacts Sidebar - hidden on mobile when viewing chat */}
        <div className={`w-full sm:w-80 md:w-96 border-r border-slate-200 flex flex-col bg-slate-50/50 ${showMobileChat ? 'hidden sm:flex' : 'flex'}`}>
          <div className="p-3 border-b border-slate-200 bg-white">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search care contacts..."
                className="w-full pl-9 pr-3 py-2 text-sm bg-slate-100 rounded-lg border border-slate-200 text-slate-950 placeholder:text-slate-500 focus:border-primary focus:bg-white transition-colors"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-200">
            {filteredContacts.length === 0 ? (
              <div className="p-6 text-center text-sm font-semibold text-slate-600">
                No connected contacts found.
              </div>
            ) : (
              filteredContacts.map(contact => {
                const isSelected = contact.id === selectedUserId;
                const contactRole = contact.role === 'pharmacist' ? 'Pharm D' : contact.role.charAt(0).toUpperCase() + contact.role.slice(1);
                
                const lastMsg = (data?.messages || [])
                  .filter(m => (m.senderId === contact.id && m.receiverId === currentUser.id) || (m.senderId === currentUser.id && m.receiverId === contact.id))
                  .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];

                const unreadCount = (data?.messages || [])
                  .filter(m => m.senderId === contact.id && m.receiverId === currentUser.id && !m.read).length;

                return (
                  <button
                    key={contact.id}
                    onClick={() => handleSelectContact(contact.id)}
                    className={`w-full p-3.5 flex items-start gap-3 text-left transition-colors cursor-pointer ${
                      isSelected ? 'bg-white border-l-4 border-l-primary shadow-xs' : 'hover:bg-slate-100'
                    }`}
                  >
                    <Avatar user={contact} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className={`text-sm truncate ${isSelected ? 'font-extrabold text-slate-950' : 'font-bold text-slate-900'}`}>
                          {contact.name}
                        </p>
                        {lastMsg && (
                          <span className="text-[11px] font-bold text-slate-600 shrink-0">
                            {formatTime(lastMsg.timestamp)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <span className="text-xs font-semibold text-slate-700">{contactRole}</span>
                        {unreadCount > 0 && (
                          <span className="w-4 h-4 bg-primary text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                            {unreadCount}
                          </span>
                        )}
                      </div>
                      {lastMsg && (
                        <p className="text-xs font-medium text-slate-700 truncate mt-1">
                          {lastMsg.senderId === currentUser.id ? 'You: ' : ''}{lastMsg.text}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Conversation Area - hidden on mobile when not viewing chat */}
        <div className={`flex-1 flex flex-col bg-white ${showMobileChat ? 'flex' : 'hidden sm:flex'}`}>
          {selectedUser ? (
            <>
              {/* Conversation Header */}
              <div className="p-3.5 border-b border-slate-200 flex items-center justify-between bg-white z-10">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowMobileChat(false)}
                    className="sm:hidden p-1.5 -ml-1 text-slate-800 hover:bg-slate-100 rounded-lg flex items-center gap-1 font-bold text-xs"
                  >
                    <ArrowLeft size={18} />
                    <span>Back</span>
                  </button>
                  <Avatar user={selectedUser} size="md" />
                  <div>
                    <h3 className="font-extrabold text-sm sm:text-base text-slate-950">{selectedUser.name}</h3>
                    <p className="text-xs font-semibold text-slate-700 capitalize">
                      {selectedUser.role === 'pharmacist' ? 'Clinical Pharmacist (Pharm D)' : selectedUser.role} • {selectedUser.email || 'Verified Clinician'}
                    </p>
                  </div>
                </div>
                <div className="text-xs font-bold bg-amber-50 text-amber-950 px-3 py-1 rounded-full border border-amber-300 hidden md:flex items-center gap-1.5">
                  <ShieldAlert size={15} className="text-amber-700" />
                  <span>Routine queries only • Dial 911/112 for medical emergencies</span>
                </div>
              </div>

              {/* Messages Stream */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50">
                {conversation.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6">
                    <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mb-3 text-primary">
                      <MessageSquare size={24} />
                    </div>
                    <p className="text-base font-extrabold text-slate-950">No messages yet</p>
                    <p className="text-xs font-semibold text-slate-700 mt-1 max-w-sm">
                      Send a secure message to {selectedUser.name} regarding treatment updates, routine symptoms, or dosage queries.
                    </p>
                  </div>
                ) : (
                  conversation.map(msg => {
                    const isMe = msg.senderId === currentUser.id;
                    return (
                      <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-2.5 shadow-xs text-sm ${
                            isMe
                              ? 'bg-teal-700 text-white rounded-br-xs font-medium'
                              : 'bg-white text-slate-950 border border-slate-200 rounded-bl-xs font-medium'
                          }`}
                        >
                          <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                          <div className={`flex items-center justify-end gap-1 mt-1 text-[11px] font-bold ${isMe ? 'text-teal-100' : 'text-slate-600'}`}>
                            <span>{formatTime(msg.timestamp)}</span>
                            {isMe && <CheckCheck size={14} className="inline ml-0.5 text-teal-200" />}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <form onSubmit={handleSend} className="p-3 border-t border-slate-200 bg-white flex items-center gap-2">
                <input
                  type="text"
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  placeholder={`Write a message to ${selectedUser.name}...`}
                  className="input flex-1 text-sm py-2.5 text-slate-950 placeholder:text-slate-500 font-medium"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim()}
                  className="btn-primary py-2.5 px-4 shrink-0 flex items-center gap-2 cursor-pointer disabled:opacity-50 font-bold"
                >
                  <Send size={15} />
                  <span className="hidden sm:inline">Send</span>
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center p-6">
              <EmptyState
                icon={MessageSquare}
                title="Select a contact"
                description="Choose a healthcare professional or patient from the left panel to begin communicating."
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
