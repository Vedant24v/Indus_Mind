import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { uploadPDF } from '../api';

const UploadPanel = ({ onUploadSuccess }) => {
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('idle'); // idle | uploading | success | error
  const [errorMessage, setErrorMessage] = useState('');
  const [uploadInfo, setUploadInfo] = useState(null); // { chunks, doc_id }
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      validateAndUpload(selectedFile);
    }
  };

  const validateAndUpload = async (selectedFile) => {
    if (!selectedFile.name.toLowerCase().endsWith('.pdf')) {
      setStatus('error');
      setErrorMessage('Only PDF documents are allowed.');
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      setStatus('error');
      setErrorMessage('File size exceeds the 10MB limit.');
      return;
    }

    setFile(selectedFile);
    setStatus('uploading');
    setProgress(0);
    setErrorMessage('');

    try {
      const data = await uploadPDF(selectedFile, (percent) => {
        setProgress(percent);
      });
      setStatus('success');
      setUploadInfo(data);
      if (onUploadSuccess) {
        onUploadSuccess(data.doc_id, selectedFile.name, data.chunks);
      }
    } catch (err) {
      console.error(err);
      setStatus('error');
      setErrorMessage(err.response?.data?.detail || 'Failed to upload and process PDF file.');
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      validateAndUpload(droppedFile);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current.click();
  };

  return (
    <div className="flex flex-col h-full bg-transparent p-6">
      <div className="mb-6">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <FileText className="text-blue-500 w-5 h-5" />
          Document Ingestion
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Upload industrial manuals, datasheets, or standard operating procedures (SOPs) to begin querying.
        </p>
      </div>

      <div
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={status !== 'uploading' ? triggerFileInput : undefined}
        className={`flex-1 flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-6 cursor-pointer transition-all duration-300 ${
          status === 'uploading'
            ? 'border-blue-500 bg-blue-950/10 pointer-events-none'
            : status === 'success'
            ? 'border-emerald-500/50 bg-emerald-950/5'
            : 'border-white/10 hover:border-blue-500/50 bg-white/[0.01] hover:bg-white/[0.03] hover:shadow-[0_0_20px_rgba(59,130,246,0.02)]'
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".pdf"
          className="hidden"
        />

        {status === 'idle' && (
          <div className="text-center flex flex-col items-center">
            <UploadCloud className="w-10 h-10 text-slate-400 mb-3 animate-pulse" />
            <p className="text-sm text-slate-200 font-semibold mb-1">
              Drag & Drop PDF or Click to browse
            </p>
            <p className="text-xs text-slate-500 font-medium">Max size 10MB</p>
          </div>
        )}

        {status === 'uploading' && (
          <div className="text-center w-full flex flex-col items-center">
            <Loader2 className="w-10 h-10 text-blue-500 mb-3 animate-spin" />
            <p className="text-sm text-slate-200 font-semibold mb-2">Processing Document...</p>
            <div className="w-full bg-white/5 rounded-full h-1.5 max-w-xs mb-1">
              <div
                className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="text-xs text-slate-400 font-medium">{progress}%</p>
            <p className="text-[10px] text-slate-500 mt-3 animate-pulse">
              Parsing & storing vector embeddings...
            </p>
          </div>
        )}

        {status === 'success' && (
          <div className="text-center flex flex-col items-center">
            <CheckCircle className="w-10 h-10 text-emerald-500 mb-3" />
            <p className="text-sm text-emerald-400 font-semibold mb-1">Upload Successful</p>
            <p className="text-xs text-slate-300 font-medium break-all max-w-[200px] mb-2 font-mono">
              {file?.name}
            </p>
            <div className="bg-white/[0.03] px-3 py-1.5 rounded-lg text-xs text-slate-300 inline-block font-mono border border-white/5">
              <span className="text-blue-400 font-semibold">{uploadInfo?.chunks}</span> chunks created
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center flex flex-col items-center">
            <AlertCircle className="w-10 h-10 text-rose-500 mb-3" />
            <p className="text-sm text-rose-400 font-semibold mb-1">Upload Failed</p>
            <p className="text-xs text-slate-300 max-w-[220px] mb-4">{errorMessage}</p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setStatus('idle');
              }}
              className="px-3 py-1.5 bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 rounded-lg text-xs text-slate-200 transition font-medium"
            >
              Try Again
            </button>
          </div>
        )}
      </div>

      {status === 'success' && (
        <div className="mt-4 p-4 bg-white/[0.02] border border-white/5 rounded-xl">
          <div className="text-xs text-slate-400 font-medium">Active Document Collection ID</div>
          <div className="text-xs font-mono text-blue-400 mt-1.5 select-all break-all bg-black/40 p-2 rounded-lg border border-white/5">
            {uploadInfo?.doc_id}
          </div>
          <button
            onClick={() => setStatus('idle')}
            className="w-full mt-3 py-2 bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 text-xs text-slate-200 font-semibold rounded-lg transition"
          >
            Upload a new document
          </button>
        </div>
      )}
    </div>
  );
};

export default UploadPanel;
