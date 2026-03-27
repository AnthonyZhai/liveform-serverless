import React, { createContext, useContext, useState, ReactNode } from 'react';
import { fetchWithAuth } from '../utils/api';

// Define the state structure for a single task
interface TaskState {
  analysis: {
    loading: boolean;
    result: string | null;
    fullPrompt: string;
    error: string | null;
  };
  dashboard: {
    loading: boolean;
    html: string | null;
    promptTemplate: string;
    error: string | null;
  };
}

// Define the context value structure
interface TaskGenerationContextType {
  taskStates: Record<string, TaskState>;
  startAnalysis: (uuid: string, prompt: string, user: any) => Promise<void>;
  startDashboardGeneration: (uuid: string, promptTemplate: string, submitUrl: string, user: any) => Promise<void>;
  updateTaskState: (uuid: string, type: 'analysis' | 'dashboard', updates: Partial<TaskState['analysis'] | TaskState['dashboard']>) => void;
  getTaskState: (uuid: string) => TaskState;
}

const TaskGenerationContext = createContext<TaskGenerationContextType | undefined>(undefined);

const initialTaskState: TaskState = {
  analysis: {
    loading: false,
    result: null,
    fullPrompt: '',
    error: null,
  },
  dashboard: {
    loading: false,
    html: null,
    promptTemplate: '',
    error: null,
  },
};

export const TaskGenerationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [taskStates, setTaskStates] = useState<Record<string, TaskState>>({});

  const getTaskState = (uuid: string) => {
    return taskStates[uuid] || initialTaskState;
  };

  const updateTaskState = (
    uuid: string,
    type: 'analysis' | 'dashboard',
    updates: Partial<TaskState['analysis'] | TaskState['dashboard']>
  ) => {
    setTaskStates(prev => {
      const currentState = prev[uuid] || JSON.parse(JSON.stringify(initialTaskState));
      return {
        ...prev,
        [uuid]: {
          ...currentState,
          [type]: {
            ...currentState[type],
            ...updates
          }
        }
      };
    });
  };

  const startAnalysis = async (uuid: string, prompt: string, user: any) => {
    // Initialize/Reset state for this task's analysis
    updateTaskState(uuid, 'analysis', { loading: true, result: '', fullPrompt: prompt, error: null });

    try {
      const res = await fetchWithAuth('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: [],
          prompt: prompt,
          model: user?.ai_model,
          api_url: user?.ai_api_url,
          api_key: user?.ai_api_key
        })
      });

      if (!res.ok) {
        const data = await res.json();
        updateTaskState(uuid, 'analysis', { loading: false, error: `Error: ${data.error}\nDetails: ${data.details || ''}` });
        return;
      }

      // Handle Streaming Response
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        updateTaskState(uuid, 'analysis', { loading: false, error: "Error: Cannot read response stream" });
        return;
      }

      let fullText = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value, { stream: true });

        if (text.includes('{"error":')) {
          try {
            const errJson = JSON.parse(text);
            updateTaskState(uuid, 'analysis', { loading: false, error: `Error: ${errJson.error}\nDetails: ${errJson.details || ''}` });
            return;
          } catch { }
        }

        fullText += text;
        // Update partial result in state
        updateTaskState(uuid, 'analysis', { result: fullText });
      }

      // Save analysis result after stream completes
      if (fullText) {
        try {
          await fetchWithAuth(`/tasks/${uuid}/analysis`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ analysis_result: fullText })
          });
        } catch (e) {
          console.error("Failed to save analysis result", e);
        }
      }

      updateTaskState(uuid, 'analysis', { loading: false });

    } catch (error: any) {
      updateTaskState(uuid, 'analysis', { loading: false, error: `Analysis Failed: ${error.message}` });
    }
  };

  const startDashboardGeneration = async (uuid: string, promptTemplate: string, submitUrl: string, user: any) => {
    // Update state to start
    updateTaskState(uuid, 'dashboard', { loading: true, html: '', promptTemplate: promptTemplate, error: null });

    // Construct prompt
    const prompt = promptTemplate.replace(/\{URL\}/g, submitUrl);

    try {
      const res = await fetchWithAuth('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: [],
          prompt: prompt,
          model: user?.ai_model,
          api_url: user?.ai_api_url,
          api_key: user?.ai_api_key
        })
      });

      if (!res.ok) {
        const data = await res.json();
        updateTaskState(uuid, 'dashboard', { loading: false, error: `Error: ${data.error}\nDetails: ${data.details || ''}` });
        return;
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        updateTaskState(uuid, 'dashboard', { loading: false, error: "Error: Cannot read response stream" });
        return;
      }

      let fullText = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value, { stream: true });

        if (text.includes('{"error":')) {
          try {
            const errJson = JSON.parse(text);
            updateTaskState(uuid, 'dashboard', { loading: false, error: `Error: ${errJson.error}\nDetails: ${errJson.details || ''}` });
            return;
          } catch { }
        }

        fullText += text;
        updateTaskState(uuid, 'dashboard', { html: fullText });
      }

      // Clean up markdown code blocks if present
      let finalHtml = fullText;
      if (finalHtml.includes("```html")) {
        finalHtml = finalHtml.split("```html")[1].split("```")[0];
      } else if (finalHtml.includes("```")) {
        finalHtml = finalHtml.split("```")[1].split("```")[0];
      }

      // Update state with cleaned HTML
      updateTaskState(uuid, 'dashboard', { html: finalHtml });

      // Save dashboard html to backend
      if (finalHtml) {
        try {
          const saveRes = await fetchWithAuth(`/tasks/${uuid}/dashboard`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dashboard_html: finalHtml })
          });

          if (saveRes.ok) {
            // Optional: Trigger a refresh or notification
            // Since we don't have task setTask here, the component listing to this state might need to reload task data if it relies on file path
            // But since we have the HTML in memory, we are good for preview.
          }
        } catch (e) {
          console.error("Failed to save dashboard", e);
        }
      }

      updateTaskState(uuid, 'dashboard', { loading: false });

    } catch (error: any) {
      updateTaskState(uuid, 'dashboard', { loading: false, error: `Generation Failed: ${error.message}` });
    }
  };

  return (
    <TaskGenerationContext.Provider value={{ taskStates, startAnalysis, startDashboardGeneration, updateTaskState, getTaskState }}>
      {children}
    </TaskGenerationContext.Provider>
  );
};

export const useTaskGeneration = () => {
  const context = useContext(TaskGenerationContext);
  if (!context) {
    throw new Error('useTaskGeneration must be used within a TaskGenerationProvider');
  }
  return context;
};
