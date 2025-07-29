// contexts/ChatContext.tsx
'use client';

import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { LLMModel } from '../types';

interface ModelSettings {
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
}

interface ChatState {
  selectedModel: string;
  availableModels: LLMModel[];
  modelSettings: Record<string, ModelSettings>;
  currentSessionId?: number;
  isLoading: boolean;
  error: string | null;
}

type ChatAction =
  | { type: 'SET_MODELS'; payload: LLMModel[] }
  | { type: 'SET_SELECTED_MODEL'; payload: string }
  | { type: 'SET_MODEL_SETTINGS'; payload: { modelId: string; settings: Partial<ModelSettings> } }
  | { type: 'SET_SESSION_ID'; payload: number }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'RESET_SESSION' };

const initialState: ChatState = {
  selectedModel: '',
  availableModels: [],
  modelSettings: {},
  currentSessionId: undefined,
  isLoading: false,
  error: null,
};

const defaultModelSettings: ModelSettings = {
  temperature: 0.7,
  maxTokens: 10000,
  systemPrompt: '',
};

function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'SET_MODELS':
      return {
        ...state,
        availableModels: action.payload,
        selectedModel: state.selectedModel || (action.payload[0]?.id ?? ''),
      };
    
    case 'SET_SELECTED_MODEL':
      return {
        ...state,
        selectedModel: action.payload,
      };
    
    case 'SET_MODEL_SETTINGS':
      return {
        ...state,
        modelSettings: {
          ...state.modelSettings,
          [action.payload.modelId]: {
            ...defaultModelSettings,
            ...state.modelSettings[action.payload.modelId],
            ...action.payload.settings,
          },
        },
      };
    
    case 'SET_SESSION_ID':
      return {
        ...state,
        currentSessionId: action.payload,
      };
    
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };
    
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
      };
    
    case 'RESET_SESSION':
      return {
        ...state,
        currentSessionId: undefined,
      };
    
    default:
      return state;
  }
}

interface ChatContextType {
  state: ChatState;
  dispatch: React.Dispatch<ChatAction>;
  getModelSettings: (modelId: string) => ModelSettings;
  updateModelSettings: (modelId: string, settings: Partial<ModelSettings>) => void;
  switchModel: (modelId: string) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(chatReducer, initialState);

  // 로컬 스토리지에서 설정 로드
  useEffect(() => {
    const savedSettings = localStorage.getItem('chatModelSettings');
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        Object.entries(settings).forEach(([modelId, modelSettings]) => {
          dispatch({
            type: 'SET_MODEL_SETTINGS',
            payload: { modelId, settings: modelSettings as Partial<ModelSettings> },
          });
        });
      } catch (error) {
        console.error('모델 설정 로드 실패:', error);
      }
    }

    const savedModel = localStorage.getItem('selectedModel');
    if (savedModel) {
      dispatch({ type: 'SET_SELECTED_MODEL', payload: savedModel });
    }
  }, []);

  // 설정 변경 시 로컬 스토리지에 저장
  useEffect(() => {
    localStorage.setItem('chatModelSettings', JSON.stringify(state.modelSettings));
  }, [state.modelSettings]);

  useEffect(() => {
    if (state.selectedModel) {
      localStorage.setItem('selectedModel', state.selectedModel);
    }
  }, [state.selectedModel]);

  const getModelSettings = (modelId: string): ModelSettings => {
    return {
      ...defaultModelSettings,
      ...state.modelSettings[modelId],
    };
  };

  const updateModelSettings = (modelId: string, settings: Partial<ModelSettings>) => {
    dispatch({
      type: 'SET_MODEL_SETTINGS',
      payload: { modelId, settings },
    });
  };

  const switchModel = (modelId: string) => {
    dispatch({ type: 'SET_SELECTED_MODEL', payload: modelId });
  };

  const contextValue: ChatContextType = {
    state,
    dispatch,
    getModelSettings,
    updateModelSettings,
    switchModel,
  };

  return (
    <ChatContext.Provider value={contextValue}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChatContext() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return context;
}