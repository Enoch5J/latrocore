import { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { initializeData, resetData as resetServiceData } from '../services/dataService';

const AppContext = createContext(null);

const initialState = {
  currentUser: null,
  data: null,
  loading: true,
  toasts: [],
  guidedDemo: { active: false, step: 0 },
};

function appReducer(state, action) {
  switch (action.type) {
    case 'INIT_DATA':
      return { ...state, data: action.payload, loading: false };
    case 'SET_USER':
      return { ...state, currentUser: action.payload };
    case 'UPDATE_DATA': {
      const newData = { ...state.data, ...action.payload };
      try { localStorage.setItem('latrocore_data', JSON.stringify(newData)); } catch (e) { /* ignore */ }
      return { ...state, data: newData };
    }
    case 'REFRESH_DATA': {
      const data = initializeData();
      return { ...state, data };
    }
    case 'RESET_DATA': {
      const freshData = resetServiceData();
      return { ...state, data: freshData, currentUser: null };
    }
    case 'ADD_TOAST':
      return { ...state, toasts: [...state.toasts, { ...action.payload, id: Date.now() }] };
    case 'REMOVE_TOAST':
      return { ...state, toasts: state.toasts.filter(t => t.id !== action.payload) };
    case 'SET_GUIDED_DEMO':
      return { ...state, guidedDemo: { ...state.guidedDemo, ...action.payload } };
    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  useEffect(() => {
    const data = initializeData();
    dispatch({ type: 'INIT_DATA', payload: data });

    // Restore user session
    try {
      const savedUser = localStorage.getItem('latrocore_user');
      if (savedUser) {
        const user = JSON.parse(savedUser);
        if (data.users[user.id]) {
          dispatch({ type: 'SET_USER', payload: data.users[user.id] });
        }
      } else {
        // Default to doctor (doc-001) so direct navigations to /overview or workspaces have full session
        const defaultDoc = data.users['doc-001'] || Object.values(data.users)[0];
        if (defaultDoc) {
          dispatch({ type: 'SET_USER', payload: defaultDoc });
        }
      }
    } catch (e) { /* ignore */ }
  }, []);

  const setUser = useCallback((user) => {
    dispatch({ type: 'SET_USER', payload: user });
    if (user) {
      localStorage.setItem('latrocore_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('latrocore_user');
    }
  }, []);

  const refreshData = useCallback(() => {
    dispatch({ type: 'REFRESH_DATA' });
  }, []);

  const addToast = useCallback((toast) => {
    dispatch({ type: 'ADD_TOAST', payload: toast });
    setTimeout(() => {
      dispatch({ type: 'REMOVE_TOAST', payload: toast.id || Date.now() });
    }, toast.duration || 4000);
  }, []);

  const removeToast = useCallback((id) => {
    dispatch({ type: 'REMOVE_TOAST', payload: id });
  }, []);

  const value = {
    ...state,
    dispatch,
    setUser,
    refreshData,
    addToast,
    removeToast,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}

export default AppContext;
