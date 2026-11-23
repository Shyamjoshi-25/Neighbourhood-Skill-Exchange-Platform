import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import axios from 'axios';
import { BrowserRouter } from 'react-router-dom';
import {
  Activity, ArrowUpRight, Bell, BookOpen, Check, CheckCircle2, ChevronRight, Clock,
  Compass, Filter, HandHeart, HeartHandshake, Home, LogOut, Menu, MessageCircle, Plus,
  Search, ShieldCheck, Star, Users, UserRound, AlertTriangle, ClipboardList, MapPin, X, KeyRound,
} from 'lucide-react';
import './style.css';

const API = import.meta.env.VITE_API_URL || '/api';
const api = axios.create({ baseURL: API });

const skillsList = [
  'Healthcare', 'Legal', 'Education', 'Electrical', 'Plumbing', 'Carpentry',
  'Computer & Technology', 'Finance', 'Translation', 'Fitness', 'Community Support', 'Other',
];

const idOf = (x) => String(x?._id || x);

const emptyAuthForm = {
  name: '', email: '', password: '', area: '', city: '', profession: '', skills: '', bio: '',
};


function App() {
  const [session, setSession] = useState(() => {
    try { return JSON.parse(localStorage.getItem('nse_session') || 'null'); } catch { return null; }
  });
  const [view, setView] = useState('overview');
  const [requests, setRequests] = useState([]);
  const [people, setPeople] = useState([]);
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', skillRequired: '', urgency: 'Normal' });
  const [authLoading, setAuthLoading] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState(emptyAuthForm);
  const [profileForm, setProfileForm] = useState({
    name: '', area: '', city: '', profession: '', skills: '', bio: '', availability: 'Available',
  });
  const [userFilter, setUserFilter] = useState('');
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [menuOpen, setMenuOpen] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const menuRef = useRef(null);

  const role = session?.user?.role || 'user';
  const admin = role === 'admin';
  const skilled = role === 'skilled_member';
  const displayRole = admin ? 'Administrator' : skilled ? 'Skilled Member' : 'Neighbour';

  const notify = (s) => {
    setToast(s);
    setTimeout(() => setToast(''), 3200);
  };

  useEffect(() => {
    if (session) {
      api.defaults.headers.common.Authorization = `Bearer ${session.token}`;
      setProfileForm({ ...session.user, skills: (session.user.skills || []).join(',') });
      fetchData();
    } else {
      delete api.defaults.headers.common.Authorization;
    }
  }, [session]);

  // Close the account menu when clicking outside it or pressing Escape
  useEffect(() => {
    const onClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    const onKey = (e) => { if (e.key === 'Escape') setMenuOpen(false); };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  // Log out automatically if the token has expired
  useEffect(() => {
    const id = api.interceptors.response.use(
      (r) => r,
      (e) => {
        if (e.response?.status === 401 && localStorage.getItem('nse_session')) {
          localStorage.removeItem('nse_session');
          setSession(null);
        }
        return Promise.reject(e);
      }
    );
    return () => api.interceptors.response.eject(id);
  }, []);

  async function fetchData() {
    // Keep the help-request list independent from the skilled-neighbour lookup.
    // A failure in one endpoint must not prevent the other section from updating.
    const [requestsResult, peopleResult] = await Promise.allSettled([
      api.get('/requests'),
      api.get(admin ? '/users' : '/users/skilled'),
    ]);

    if (requestsResult.status === 'fulfilled') {
      setRequests(Array.isArray(requestsResult.value.data) ? requestsResult.value.data : []);
    } else {
      const e = requestsResult.reason;
      notify(e.response?.data?.message || `Could not load requests (${e.response?.status || e.message}).`);
    }

    if (peopleResult.status === 'fulfilled') {
      if (admin) setUsers(Array.isArray(peopleResult.value.data) ? peopleResult.value.data : []);
      else setPeople(Array.isArray(peopleResult.value.data) ? peopleResult.value.data : []);
    } else {
      // Keep the rest of the dashboard usable if the optional people endpoint fails.
      if (admin) setUsers([]);
      else setPeople([]);
      const e = peopleResult.reason;
      console.error('Could not load people:', e.response?.status, e.response?.data || e.message);
    }
  }

  async function authSubmit(e) {
    e.preventDefault();
    if (authLoading) return; // ignore double clicks
    setAuthLoading(true);
    try {
      const payload =
        authMode === 'register'
          ? { ...authForm, skills: authForm.skills.split(',').map((s) => s.trim()).filter(Boolean) }
          : { email: authForm.email, password: authForm.password };
      const res = await api.post(`/auth/${authMode}`, payload);
      const next = { token: res.data.token, user: res.data.user };
      localStorage.setItem('nse_session', JSON.stringify(next));
      setAuthForm(emptyAuthForm); // never keep the email/password in memory after sign-in
      setAuthMode('login');
      setSession(next);
      setView('overview');
      notify('Welcome to your neighbourhood!');
    } catch (e) {
      notify(e.response?.data?.message || 'Authentication failed.');
    } finally {
      setAuthLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem('nse_session');
    setSession(null);
    setRequests([]);
    setPeople([]);
    setUsers([]);
    setAuthForm(emptyAuthForm); // clear email, password and all signup details
    setAuthMode('login');
    setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setProfileForm({ name: '', area: '', city: '', profession: '', skills: '', bio: '', availability: 'Available' });
    setSearch('');
    setShowPw(false);
    setMenuOpen(false);
    setMobileMenu(false);
    setView('overview');
    notify('You have logged out.');
  }

  async function createRequest(e) {
    e.preventDefault();
    try {
      await api.post('/requests', form);
      setShowCreate(false);
      setForm({ title: '', description: '', skillRequired: '', urgency: 'Normal' });
      await fetchData();
      notify('Help request posted successfully.');
    } catch (e) {
      notify(e.response?.data?.message || 'Could not post request.');
    }
  }

  async function respond(id, action) {
    try {
      await api.patch(`/requests/${id}/respond`, { action });
      await fetchData();
      notify(action === 'accept' ? 'Request accepted.' : 'Request declined.');
    } catch (e) {
      notify(e.response?.data?.message || 'Action failed.');
    }
  }

  async function updateStatus(id, status) {
    try {
      await api.patch(`/requests/${id}/status`, { status });
      await fetchData();
      notify(`Request marked ${status.toLowerCase()}.`);
    } catch (e) {
      notify(e.response?.data?.message || 'Status update failed.');
    }
  }

  async function saveProfile(e) {
    e.preventDefault();
    try {
      const payload = {
        ...profileForm,
        skills: String(profileForm.skills || '').split(',').map((x) => x.trim()).filter(Boolean),
      };
      const r = await api.put('/auth/me', payload);
      const next = { ...session, user: r.data.user };
      setSession(next);
      localStorage.setItem('nse_session', JSON.stringify(next));
      notify('Profile updated.');
    } catch (e) {
      notify(e.response?.data?.message || 'Profile save failed.');
    }
  }

  async function changePassword(e) {
    e.preventDefault();
    if (pwForm.newPassword.length < 8) return notify('New password must be at least 8 characters.');
    if (pwForm.newPassword !== pwForm.confirmPassword) return notify('New passwords do not match.');
    try {
      await api.put('/auth/change-password', {
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword,
      });
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setShowPw(false);
      notify('Password changed successfully.');
    } catch (e) {
      notify(e.response?.data?.message || 'Could not change password.');
    }
  }

  async function adminToggle(id, action) {
    try {
      await api.patch(`/users/${id}/${action}`);
      const u = await api.get('/users');
      setUsers(u.data);
      notify(action === 'verify' ? 'Verification status updated.' : 'User status updated.');
    } catch (e) {
      notify(e.response?.data?.message || 'Admin action failed.');
    }
  }

  const myId = String(session?.user?.id);
  const myRequests = requests.filter((r) => idOf(r.requester) === myId);
  const openRequests = requests.filter(
    (r) => r.status === 'Pending' && r.area === session?.user?.area && idOf(r.requester) !== myId
  );
  const filteredPeople = people.filter((p) =>
    `${p.name} ${p.profession} ${(p.skills || []).join(' ')}`.toLowerCase().includes(search.toLowerCase())
  );
  const professionOptions = [...new Set(people.map((p) => p.profession).filter(Boolean))].filter(
    (p) => !skillsList.includes(p)
  );

  const stats = admin
    ? {
        users: users.length,
        verified: users.filter((u) => u.verified).length,
        requests: requests.length,
        urgent: requests.filter((r) => r.urgency === 'Emergency').length,
      }
    : {
        neighbors: people.length,
        requests: myRequests.length,
        pending: myRequests.filter((r) => r.status === 'Pending').length,
        completed: myRequests.filter((r) => r.status === 'Completed').length,
      };

  const toastEl = toast ? (
    <div className="toast"><CheckCircle2 size={17} />{toast}</div>
  ) : null;

  if (!session) {
    return (
      <>
        <AuthPage
          mode={authMode}
          setMode={setAuthMode}
          form={authForm}
          setForm={setAuthForm}
          onSubmit={authSubmit}
          loading={authLoading}
        />
        {toastEl}
      </>
    );
  }

  const nav = [
    { id: 'overview', label: 'Overview', icon: Home },
    { id: 'discover', label: 'Find neighbours', icon: Compass },
    { id: 'myrequests', label: 'My requests', icon: ClipboardList },
    ...(skilled || admin ? [{ id: 'incoming', label: 'Requests to help', icon: HandHeart }] : []),
    { id: 'profile', label: 'My profile', icon: UserRound },
  ];
  if (admin) {
    nav.splice(
      1, 1,
      { id: 'people', label: 'Manage people', icon: Users },
      { id: 'allrequests', label: 'All requests', icon: ClipboardList },
      { id: 'verification', label: 'Verifications', icon: ShieldCheck }
    );
  }

  const subheads = {
    overview: 'Your local community is one connection away.',
    discover: 'Discover skills and helpful people nearby.',
    myrequests: 'Keep track of help you have asked for.',
    incoming: 'Requests from neighbours who need your skills.',
    people: 'Manage community member accounts.',
    allrequests: 'Monitor help requests across the community.',
    verification: 'Review skill profiles and trust signals.',
    profile: 'Update your details and availability.',
  };

  const statIcons = {
    neighbors: Users, requests: ClipboardList, pending: Clock, completed: CheckCircle2,
    users: Users, verified: ShieldCheck, urgent: AlertTriangle,
  };
  const statLabels = {
    neighbors: 'Skilled neighbours',
    requests: admin ? 'Help requests' : 'My help requests',
    pending: 'Pending',
    completed: 'Completed',
    users: 'Community users',
    verified: 'Verified profiles',
    urgent: 'Emergency requests',
  };

  const filteredMyRequests = myRequests.filter((r) => !userFilter || r.status === userFilter);
  const rowProps = { currentUser: session.user, onRespond: respond, onStatus: updateStatus, notify };

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileMenu ? 'open' : ''}`}>
        <div className="brand">
          <div className="brand-mark"><HeartHandshake size={22} /></div>
          <div><strong>Neighbourly</strong><small>Skill Exchange</small></div>
        </div>
        <div className="side-label">WORKSPACE</div>
        <nav>
          {nav.map((n) => (
            <button
              key={n.id}
              className={`nav-link ${view === n.id ? 'active' : ''}`}
              onClick={() => { setView(n.id); setShowPw(false); setMobileMenu(false); }}
            >
              <n.icon size={18} />
              <span>{n.label}</span>
              {n.id === 'incoming' && openRequests.length > 0 && <em>{openRequests.length}</em>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="side-help">
            <div className="help-icon"><HandHeart size={18} /></div>
            <b>Neighbourhood first</b>
            <p>Small acts of help make stronger communities.</p>
          </div>
          <button className="nav-link" onClick={logout}><LogOut size={18} /><span>Log out</span></button>
        </div>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <button className="icon-btn mobile-toggle" onClick={() => setMobileMenu((v) => !v)}>
            <Menu size={20} />
          </button>
          <div className="crumb">
            <span>Neighbourly</span><ChevronRight size={14} />
            <b>{nav.find((n) => n.id === view)?.label || view}</b>
          </div>
          <div className="top-actions">
            <button className="icon-btn" title="Notifications"><Bell size={18} /></button>
            <div className="user-menu" ref={menuRef}>
              <button className="user-menu-btn" onClick={() => setMenuOpen((v) => !v)}>
                <div className="user-mini"><b>{session.user.name}</b><span>{displayRole}</span></div>
                <div className="avatar">{session.user.name?.[0]?.toUpperCase()}</div>
              </button>
              {menuOpen && (
                <div className="user-dropdown">
                  <div className="dd-head">
                    <div className="avatar">{session.user.name?.[0]?.toUpperCase()}</div>
                    <div>
                      <b>{session.user.name}</b>
                      <small>{session.user.email}</small>
                      <small>{displayRole}</small>
                    </div>
                  </div>
                  <div className="dd-divider" />
                  <button className="dd-item" onClick={() => { setView('profile'); setShowPw(false); setMenuOpen(false); }}>
                    <UserRound size={18} /><span>My profile</span>
                  </button>
                  <button
                    className="dd-item"
                    onClick={() => {
                      setView('profile');
                      setShowPw(true);
                      setMenuOpen(false);
                      setTimeout(() => document.getElementById('change-password')?.scrollIntoView({ behavior: 'smooth' }), 100);
                    }}
                  >
                    <KeyRound size={18} /><span>Change password</span>
                  </button>
                  <div className="dd-divider" />
                  <button className="dd-item" onClick={() => { setMenuOpen(false); logout(); }}>
                    <LogOut size={18} /><span>Log out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="content">
          <div className="welcome-row">
            <div>
              <div className="eyebrow">
                <MapPin size={13} /> {session.user.area}{session.user.city ? `, ${session.user.city}` : ''}
              </div>
              <h1>
                {view === 'overview'
                  ? `Good day, ${session.user.name.split(' ')[0]} 👋`
                  : nav.find((n) => n.id === view)?.label || view}
              </h1>
              <p className="subhead">{subheads[view] || subheads.profile}</p>
            </div>
            {view === 'overview' && (
              <button className="primary-btn" onClick={() => setShowCreate(true)}>
                <Plus size={17} /> Ask for help
              </button>
            )}
          </div>

          {view === 'overview' && (
            <>
              <div className="hero-card">
                <div className="hero-copy">
                  <span className="hero-pill"><HeartHandshake size={14} /> COMMUNITY CARE</span>
                  <h2>It takes a neighbourhood<br />to make a difference.</h2>
                  <p>Share what you know. Ask for what you need. Help someone close to home today.</p>
                  <button className="hero-btn" onClick={() => setView('discover')}>
                    Explore neighbours <ArrowUpRight size={16} />
                  </button>
                </div>
                <div className="hero-art">
                  <div className="orbit orbit1"></div>
                  <div className="orbit orbit2"></div>
                  <div className="art-circle"><HeartHandshake size={64} /></div>
                  <div className="float-card fc1">
                    <div className="fc-icon"><Check size={15} /></div>
                    <div><b>Help delivered</b><small>Community makes it happen</small></div>
                  </div>
                  <div className="float-card fc2">
                    <div className="people-mini"><span>J</span><span>M</span><span>A</span></div>
                    <div><b>Neighbours nearby</b><small>Ready to lend a hand</small></div>
                  </div>
                </div>
              </div>

              <div className="stat-grid">
                {Object.entries(stats).map(([k, v]) => {
                  const Icon = statIcons[k] || Activity;
                  return (
                    <div className="stat-card" key={k}>
                      <div className={`stat-icon si-${k}`}><Icon size={19} /></div>
                      <span>{statLabels[k]}</span>
                      <strong>{v}</strong>
                      <small>
                        {k === 'neighbors' ? 'In your area'
                          : k === 'verified' ? 'Skill profiles'
                          : k === 'urgent' ? 'Priority requests'
                          : 'Across your account'}
                      </small>
                    </div>
                  );
                })}
              </div>

              <div className="section-grid">
                <section className="panel">
                  <div className="panel-head">
                    <div><h3>Recent requests</h3><p>Your latest community activity</p></div>
                    <button className="text-btn" onClick={() => setView('myrequests')}>
                      View all <ChevronRight size={15} />
                    </button>
                  </div>
                  {myRequests.slice(0, 4).length ? (
                    myRequests.slice(0, 4).map((r) => <RequestRow key={r._id} r={r} {...rowProps} />)
                  ) : (
                    <EmptyState
                      icon={HandHeart}
                      title="No requests yet"
                      text="Ask your neighbours for help to get started."
                      action={() => setShowCreate(true)}
                      actionLabel="Create request"
                    />
                  )}
                </section>
                <section className="panel">
                  <div className="panel-head">
                    <div><h3>Skilled neighbours</h3><p>People sharing skills nearby</p></div>
                    <button className="text-btn" onClick={() => setView('discover')}>
                      Discover <ChevronRight size={15} />
                    </button>
                  </div>
                  {people.slice(0, 3).map((p, i) => <PersonRow key={p._id || i} person={p} />)}
                  {people.length === 0 && (
                    <EmptyState
                      icon={Users}
                      title="No skilled profiles yet"
                      text="Skill profiles from your area will appear here."
                    />
                  )}
                </section>
              </div>
            </>
          )}

          {view === 'discover' && (
            <>
              <div className="toolbar">
                <div className="search-field">
                  <Search size={18} />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search profession or skill..."
                  />
                </div>
                <button className="outline-btn"><Filter size={16} /> My neighbourhood</button>
              </div>
              <div className="expert-grid">
                {filteredPeople.map((p, i) => (
                  <ExpertCard
                    key={p._id || i}
                    person={p}
                    onRequest={() => {
                      setForm((f) => ({ ...f, skillRequired: p.profession || p.skills?.[0] || '' }));
                      setShowCreate(true);
                    }}
                  />
                ))}
                {filteredPeople.length === 0 && (
                  <EmptyState icon={Search} title="No neighbours found" text="Try searching another skill or profession." />
                )}
              </div>
            </>
          )}

          {view === 'myrequests' && (
            <>
              <div className="toolbar">
                <div className="filter-tabs">
                  <button className={userFilter === '' ? 'selected' : ''} onClick={() => setUserFilter('')}>
                    All ({myRequests.length})
                  </button>
                  {['Pending', 'Accepted', 'Completed', 'Declined', 'Cancelled'].map((s) => (
                    <button key={s} className={userFilter === s ? 'selected' : ''} onClick={() => setUserFilter(s)}>
                      {s}
                    </button>
                  ))}
                </div>
                <button className="primary-btn" onClick={() => setShowCreate(true)}>
                  <Plus size={16} /> New request
                </button>
              </div>
              <div className="request-list">
                {filteredMyRequests.map((r) => <RequestRow key={r._id} r={r} {...rowProps} detailed />)}
                {filteredMyRequests.length === 0 && (
                  <EmptyState
                    icon={ClipboardList}
                    title="Nothing here yet"
                    text="Your help requests will show up here."
                    action={() => setShowCreate(true)}
                    actionLabel="Create a request"
                  />
                )}
              </div>
            </>
          )}

          {view === 'incoming' && (
            <div className="request-list">
              {openRequests.map((r) => <RequestRow key={r._id} r={r} {...rowProps} detailed />)}
              {openRequests.length === 0 && (
                <EmptyState
                  icon={HandHeart}
                  title="You're all caught up"
                  text="New help requests in your area will appear here."
                />
              )}
            </div>
          )}

          {view === 'profile' && (
          <div className="profile-layout">
            <section className="panel profile-panel">
              <div className="panel-head">
                <div><h3>Profile settings</h3><p>Update your community details and skills.</p></div>
              </div>
              <form className="profile-form" onSubmit={saveProfile}>
                <label>Full name
                  <input value={profileForm.name || ''} onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })} required />
                </label>
                <label>Email address
                  <input value={session.user.email} disabled />
                </label>
                <div className="form-row">
                  <label>Neighbourhood
                    <input value={profileForm.area || ''} onChange={(e) => setProfileForm({ ...profileForm, area: e.target.value })} required />
                  </label>
                  <label>City
                    <input value={profileForm.city || ''} onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })} />
                  </label>
                </div>
                <label>Profession
                  <input value={profileForm.profession || ''} onChange={(e) => setProfileForm({ ...profileForm, profession: e.target.value })} placeholder="e.g. Teacher, Electrician" />
                </label>
                <label>Skills (comma separated)
                  <input value={profileForm.skills || ''} onChange={(e) => setProfileForm({ ...profileForm, skills: e.target.value })} placeholder="Tutoring, Repairs, First aid" />
                </label>
                <label>About you
                  <textarea rows="3" value={profileForm.bio || ''} onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })} placeholder="Tell neighbours a little about yourself" />
                </label>
                <label>Availability
                  <select value={profileForm.availability || 'Available'} onChange={(e) => setProfileForm({ ...profileForm, availability: e.target.value })}>
                    <option>Available</option>
                    <option>Busy</option>
                    <option>Unavailable</option>
                  </select>
                </label>
                <button className="primary-btn" type="submit">Save profile</button>
              </form>

            </section>

            <aside className="profile-side">
              <section className="panel profile-card">
                <div className="avatar big">{session.user.name?.[0]?.toUpperCase()}</div>
                <h3>{session.user.name}</h3>
                <p className="profile-role">
                  {displayRole}{session.user.verified ? ' · Verified' : ''}
                </p>
                {session.user.bio && <p className="profile-bio">{session.user.bio}</p>}
                <ul className="profile-facts">
                  <li><span>Email</span><b>{session.user.email}</b></li>
                  <li>
                    <span>Neighbourhood</span>
                    <b>{session.user.area}{session.user.city ? `, ${session.user.city}` : ''}</b>
                  </li>
                  <li><span>Profession</span><b>{session.user.profession || '—'}</b></li>
                  <li><span>Availability</span><b>{session.user.availability || 'Available'}</b></li>
                </ul>
                {(session.user.skills || []).length > 0 && (
                  <div className="skills-pills">
                    {session.user.skills.map((s) => <span key={s}>{s}</span>)}
                  </div>
                )}
              </section>

              {showPw && (
              <section className="panel pw-panel" id="change-password">
              <div className="panel-head">
                <div><h3>Change password</h3><p>Use at least 8 characters.</p></div>
                <button type="button" className="icon-btn" onClick={() => setShowPw(false)}><X size={18} /></button>
              </div>
              <form className="profile-form" onSubmit={changePassword}>
                <label>Current password
                  <input type="password" value={pwForm.currentPassword} onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })} required />
                </label>
                <div className="form-row">
                  <label>New password
                    <input type="password" minLength={8} value={pwForm.newPassword} onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })} required />
                  </label>
                  <label>Confirm new password
                    <input type="password" minLength={8} value={pwForm.confirmPassword} onChange={(e) => setPwForm({ ...pwForm, confirmPassword: e.target.value })} required />
                  </label>
                </div>
                <button className="primary-btn" type="submit">Update password</button>
              </form>
              </section>
              )}
            </aside>
          </div>
          )}

          {view === 'people' && (
            <section className="panel">
              <div className="panel-head">
                <div><h3>Community members ({users.length})</h3><p>Review and manage accounts.</p></div>
                <div className="search-field compact">
                  <Search size={16} />
                  <input placeholder="Filter members" value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Member</th><th>Neighbourhood</th><th>Role</th><th>Verified</th><th>Status</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {users
                      .filter((u) => `${u.name} ${u.email} ${u.area}`.toLowerCase().includes(search.toLowerCase()))
                      .map((u) => (
                        <tr key={u._id}>
                          <td><b>{u.name}</b><small>{u.email}</small></td>
                          <td>{u.area}{u.city && `, ${u.city}`}</td>
                          <td>{u.role}</td>
                          <td>{u.verified ? 'Yes' : 'No'}</td>
                          <td>{u.isBlocked ? 'Blocked' : 'Active'}</td>
                          <td>
                            <button className="mini-action" onClick={() => adminToggle(u._id, 'verify')}>
                              {u.verified ? 'Unverify' : 'Verify'}
                            </button>
                            <button className="mini-action danger" onClick={() => adminToggle(u._id, 'block')}>
                              {u.isBlocked ? 'Unblock' : 'Block'}
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {(view === 'allrequests' || view === 'verification') && (
            <section className="panel">
              <div className="panel-head">
                <div>
                  <h3>{view === 'allrequests' ? 'All help requests' : 'Skill verification queue'}</h3>
                  <p>{view === 'allrequests' ? 'Community activity and status tracking' : 'Review skill profiles and verification'}</p>
                </div>
              </div>
              {view === 'allrequests' ? (
                <div className="request-list">
                  {requests.map((r) => <RequestRow key={r._id} r={r} {...rowProps} detailed admin />)}
                  {!requests.length && (
                    <EmptyState
                      icon={ClipboardList}
                      title="No requests"
                      text="Help requests will appear as the community uses the platform."
                    />
                  )}
                </div>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr><th>Member</th><th>Profession</th><th>Skills</th><th>Neighbourhood</th><th>Verification</th><th>Action</th></tr>
                    </thead>
                    <tbody>
                      {users.filter((u) => u.role === 'skilled_member').map((u) => (
                        <tr key={u._id}>
                          <td><b>{u.name}</b><small>{u.email}</small></td>
                          <td>{u.profession || '—'}</td>
                          <td>{(u.skills || []).join(', ')}</td>
                          <td>{u.area}</td>
                          <td>{u.verified ? 'Verified' : 'Pending'}</td>
                          <td>
                            <button className="mini-action" onClick={() => adminToggle(u._id, 'verify')}>
                              {u.verified ? 'Revoke' : 'Verify'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}
        </main>

        <footer className="footer">
          <span>© Neighbourly · Built for community care</span>
          <span><ShieldCheck size={14} /> Privacy-first neighbourhood support</span>
        </footer>
      </div>

      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div>
                <h2>Ask your neighbours for help</h2>
                <p>Share what you need. Someone nearby may be able to help.</p>
              </div>
              <button className="icon-btn" onClick={() => setShowCreate(false)}><X size={19} /></button>
            </div>
            <form className="modal-form" onSubmit={createRequest}>
              <label>Request title
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="What do you need help with?" required maxLength={120} />
              </label>
              <label>Describe your request
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows="4" placeholder="Provide a little detail so neighbours understand..." required />
              </label>
              <label>Skill needed
                <select value={form.skillRequired} onChange={(e) => setForm({ ...form, skillRequired: e.target.value })} required>
                  <option value="">Select a skill</option>
                  {skillsList.map((s) => <option key={s} value={s}>{s}</option>)}
                  {professionOptions.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </label>
              <label>Urgency
                <select value={form.urgency} onChange={(e) => setForm({ ...form, urgency: e.target.value })}>
                  <option>Normal</option>
                  <option>Urgent</option>
                  <option>Emergency</option>
                </select>
              </label>
              <div className="area-notice">
                <MapPin size={15} /> Request will be shared in <b>{session.user.area}</b> neighbourhood.
              </div>
              <button className="primary-btn full" type="submit"><Plus size={16} /> Post help request</button>
            </form>
          </div>
        </div>
      )}

      {toastEl}
    </div>
  );
}

function AuthPage({ mode, setMode, form, setForm, onSubmit, loading }) {
  return (
    <div className="auth-shell">
      <div className="auth-visual">
        <div className="auth-brand">
          <div className="brand-mark"><HeartHandshake size={22} /></div>
          <div><strong>Neighbourly</strong><small>Skill Exchange</small></div>
        </div>
        <div className="auth-quote">
          <div className="quote-symbol">“</div>
          <h1>Good neighbours<br />make great things<br />happen.</h1>
          <p>A little skill, a little kindness, can make all the difference close to home.</p>
          <div className="quote-users">
            <div className="people-mini"><span>A</span><span>R</span><span>M</span></div>
            <span>Built on community. Powered by kindness.</span>
          </div>
        </div>
      </div>
      <div className="auth-main">
        <div className="auth-box">
          <div className="auth-topline">
            <span className="eyebrow">YOUR COMMUNITY, CONNECTED</span>
            <div className="mini-trust"><ShieldCheck size={15} /> Safe community</div>
          </div>
          <h2>{mode === 'login' ? 'Welcome back' : 'Join your neighbourhood'}</h2>
          <p className="auth-sub">
            {mode === 'login'
              ? 'Sign in to find or offer help nearby.'
              : 'Create an account to connect with helpful neighbours.'}
          </p>
          <div className="auth-tabs">
            <button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>Sign in</button>
            <button type="button" className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')}>Create account</button>
          </div>
          <form key={mode} onSubmit={onSubmit} className="auth-form" autoComplete="off">
            {mode === 'register' && (
              <label>Full name
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Your full name" required />
              </label>
            )}
            <label>Email address
              <input type="email" name="email" autoComplete="off" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" required />
            </label>
            <label>Password
              <input
                type="password"
                name="password"
                autoComplete={mode === 'register' ? 'new-password' : 'off'}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder={mode === 'register' ? 'At least 8 characters' : 'Your password'}
                minLength={mode === 'register' ? 8 : undefined}
                required
              />
            </label>
            {mode === 'register' && (
              <>
                <label>Neighbourhood / Area
                  <input value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} placeholder="e.g. Green Park" required />
                </label>
                <label>City
                  <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="City" />
                </label>
                <label>Profession (optional)
                  <input value={form.profession} onChange={(e) => setForm({ ...form, profession: e.target.value })} placeholder="e.g. Tutor, Doctor, Technician" />
                </label>
                <label>Skills (comma separated)
                  <input value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} placeholder="e.g. Maths, First aid, Repairs" />
                </label>
              </>
            )}
            <button className="primary-btn full" type="submit" disabled={loading}>
              {loading
                ? (mode === 'login' ? 'Signing in…' : 'Creating account…')
                : (mode === 'login' ? 'Sign in to account' : 'Create my account')}
              {!loading && <ArrowUpRight size={16} />}
            </button>
          </form>
          <p className="auth-terms">By continuing, you agree to help keep your community respectful and safe.</p>
        </div>
        <div className="auth-bottom">
          <span>Need help? Contact your platform administrator.</span>
          <span>© Neighbourly</span>
        </div>
      </div>
    </div>
  );
}

function PersonRow({ person }) {
  return (
    <div className="person-row">
      <div className="person-avatar">{person.name?.[0]}</div>
      <div className="person-details">
        <b>{person.name} {person.verified && <ShieldCheck size={13} className="verified" />}</b>
        <small>{person.profession || 'Community member'} · {person.availability}</small>
      </div>
      <span className="person-area">{person.area}</span>
    </div>
  );
}

function ExpertCard({ person, onRequest }) {
  return (
    <div className="expert-card">
      <div className="expert-top">
        <div className="expert-avatar">{person.name?.[0]}</div>
        <span className={`availability ${person.availability === 'Available' ? 'avail' : 'busy'}`}>
          <i />{person.availability}
        </span>
      </div>
      <h3>{person.name}</h3>
      <p className="expert-prof">
        {person.profession || 'Skilled neighbour'} {person.verified && <ShieldCheck size={14} className="verified" />}
      </p>
      <div className="expert-area"><MapPin size={14} />{person.area}</div>
      <div className="skills-pills">
        {(person.skills || []).slice(0, 3).map((s) => <span key={s}>{s}</span>)}
      </div>
      <div className="expert-foot">
        <span><Users size={14} /> Local member</span>
        <button className="outline-btn small" onClick={onRequest}>
          Request help <ArrowUpRight size={14} />
        </button>
      </div>
    </div>
  );
}

function RequestRow({ r, currentUser, onRespond, onStatus, notify, detailed = false, admin = false }) {
  const own = idOf(r.requester) === String(currentUser.id);
  const helper = idOf(r.helper) === String(currentUser.id);
  const canRespond = !own && !helper && r.status === 'Pending' && currentUser.role === 'skilled_member';
  const canComplete = (own || helper || admin) && r.status === 'Accepted';
  const canCancel = own && ['Pending', 'Accepted'].includes(r.status);

  const [reviewOpen, setReviewOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  async function sendReview() {
    try {
      await api.post('/reviews', { requestId: r._id, rating: Number(rating), comment });
      setReviewOpen(false);
      notify('Thank you for your feedback!');
    } catch (e) {
      notify(e.response?.data?.message || 'Unable to submit review.');
    }
  }

  return (
    <div className={`request-row ${detailed ? 'detailed' : ''}`}>
      <div className={`request-urgency ${r.urgency?.toLowerCase()}`}>
        {r.urgency === 'Emergency' ? <AlertTriangle size={14} />
          : r.urgency === 'Urgent' ? <Activity size={14} />
          : <MessageCircle size={14} />}
        <span>{r.urgency}</span>
      </div>
      <div className="request-main">
        <div className="request-title-line">
          <h4>{r.title}</h4>
          <span className={`status-chip ${r.status.toLowerCase()}`}>{r.status}</span>
        </div>
        <p>{r.description}</p>
        <div className="request-meta">
          <span><BookOpen size={13} />{r.skillRequired}</span>
          <span><MapPin size={13} />{r.area}</span>
          <span><Clock size={13} />{new Date(r.createdAt).toLocaleDateString()}</span>
          {r.requester && <span><UserRound size={13} />{own ? 'You' : r.requester.name}</span>}
        </div>
        {r.helper && <div className="helper-line">Helper: <b>{helper ? 'You' : r.helper.name}</b></div>}
      </div>
      <div className="request-actions">
        {canRespond && (
          <>
            <button className="primary-btn mini" onClick={() => onRespond(r._id, 'accept')}>
              <Check size={15} /> Accept
            </button>
            <button className="outline-btn mini" onClick={() => onRespond(r._id, 'decline')}>Decline</button>
          </>
        )}
        {canComplete && (
          <button className="primary-btn mini" onClick={() => onStatus(r._id, 'Completed')}>
            <CheckCircle2 size={15} /> Mark complete
          </button>
        )}
        {canCancel && (
          <button className="outline-btn mini" onClick={() => onStatus(r._id, 'Cancelled')}>Cancel</button>
        )}
        {own && r.status === 'Completed' && (
          <button className="outline-btn mini" onClick={() => setReviewOpen((v) => !v)}>
            <Star size={14} /> Review
          </button>
        )}
      </div>
      {reviewOpen && (
        <div className="review-inline">
          <label>Rating
            <select value={rating} onChange={(e) => setRating(e.target.value)}>
              <option value={5}>5 - Excellent</option>
              <option value={4}>4 - Good</option>
              <option value={3}>3 - Okay</option>
              <option value={2}>2 - Poor</option>
              <option value={1}>1 - Very poor</option>
            </select>
          </label>
          <label>Feedback
            <textarea rows={2} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Share your experience (optional)" />
          </label>
          <button className="primary-btn mini" onClick={sendReview}>Submit review</button>
        </div>
      )}
    </div>
  );
}

function EmptyState({ icon: Icon, title, text, action, actionLabel }) {
  return (
    <div className="empty-state">
      <div className="empty-icon"><Icon size={24} /></div>
      <h3>{title}</h3>
      <p>{text}</p>
      {action && (
        <button className="outline-btn" onClick={action}>
          {actionLabel || 'Get started'}<ArrowUpRight size={15} />
        </button>
      )}
    </div>
  );
}

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);