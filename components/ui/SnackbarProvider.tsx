import React, { createContext, useContext, useState, useCallback } from 'react';
import { Snackbar } from 'react-native-paper';

type SnackbarType = 'success' | 'error' | 'info';

interface SnackbarState {
  visible: boolean;
  message: string;
  type: SnackbarType;
}

interface SnackbarContextType {
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  showInfo: (message: string) => void;
}

const SnackbarContext = createContext<SnackbarContextType>({
  showSuccess: () => {},
  showError: () => {},
  showInfo: () => {},
});

export function SnackbarProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<SnackbarState>({
    visible: false,
    message: '',
    type: 'success',
  });

  const show = useCallback((message: string, type: SnackbarType) => {
    setState({ visible: true, message, type });
  }, []);

  const showSuccess = useCallback((message: string) => show(message, 'success'), [show]);
  const showError = useCallback((message: string) => show(message, 'error'), [show]);
  const showInfo = useCallback((message: string) => show(message, 'info'), [show]);

  const dismiss = () => setState(prev => ({ ...prev, visible: false }));

  const getColor = () => {
    switch (state.type) {
      case 'success': return '#4CAF50';
      case 'error': return '#E53935';
      default: return '#2B9EB3';
    }
  };

  return (
    <SnackbarContext.Provider value={{ showSuccess, showError, showInfo }}>
      {children}
      <Snackbar
        visible={state.visible}
        onDismiss={dismiss}
        duration={3000}
        style={{ backgroundColor: getColor() }}
        action={{ label: '✕', onPress: dismiss, labelStyle: { color: '#fff' } }}
      >
        {state.message}
      </Snackbar>
    </SnackbarContext.Provider>
  );
}

export function useSnackbar() {
  return useContext(SnackbarContext);
}
