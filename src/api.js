import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:8000' : '');

const api = axios.create({
  baseURL: API_URL,
});

const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64String = reader.result.split(',')[1];
      resolve(base64String);
    };
    reader.onerror = (error) => reject(error);
  });
};

export const uploadPDF = async (file, onUploadProgress) => {
  const base64Data = await fileToBase64(file);
  
  const response = await api.post('/api/upload', {
    file_name: file.name,
    file_data: base64Data,
  }, {
    onUploadProgress: (progressEvent) => {
      if (onUploadProgress && progressEvent.total) {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onUploadProgress(percentCompleted);
      }
    },
  });
  return response.data;
};

export const queryDocument = async (question, docId) => {
  const response = await api.post('/api/query', {
    question,
    doc_id: docId,
  });
  return response.data;
};

export default api;
