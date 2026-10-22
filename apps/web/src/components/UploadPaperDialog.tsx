'use client';

import React, { useState, useRef } from 'react';
import { Upload, FileUp, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface UploadPaperDialogProps {
  onPaperUploaded: (paperId: string) => void;
}

export function UploadPaperDialog({ onPaperUploaded }: UploadPaperDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [jobStatus, setJobStatus] = useState<string | null>(null);
  const [jobProgress, setJobProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setSelectedFile(null);
    setIsUploading(false);
    setJobStatus(null);
    setJobProgress(0);
    setErrorMessage(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
        setErrorMessage('Please select a valid academic PDF paper.');
        return;
      }
      setSelectedFile(file);
      setErrorMessage(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setErrorMessage(null);
    setJobStatus('uploading');
    setJobProgress(10);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const res = await fetch('http://localhost:3001/api/papers/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        throw new Error(`Upload failed: status ${res.status}`);
      }

      const { jobId, paperId } = await res.json();
      setJobStatus('parsing');
      setJobProgress(30);

      // Poll job status until completion
      const pollInterval = setInterval(async () => {
        try {
          const pollRes = await fetch(`http://localhost:3001/api/jobs/${jobId}`);
          if (!pollRes.ok) return;

          const jobData = await pollRes.json();
          setJobStatus(jobData.status);
          setJobProgress(jobData.progress || 50);

          if (jobData.status === 'completed') {
            clearInterval(pollInterval);
            setIsUploading(false);
            setJobProgress(100);
            setTimeout(() => {
              setOpen(false);
              resetState();
              onPaperUploaded(paperId);
            }, 800);
          } else if (jobData.status === 'failed') {
            clearInterval(pollInterval);
            setIsUploading(false);
            setErrorMessage(jobData.error || 'Ingestion extraction failed.');
          }
        } catch {
          // Ignore transient network errors during poll
        }
      }, 500);
    } catch (err: any) {
      setIsUploading(false);
      setErrorMessage(err?.message || 'Failed to connect to ingestion server.');
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!isUploading) {
          setOpen(nextOpen);
          if (!nextOpen) resetState();
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full gap-2 border-zinc-700/80 hover:bg-zinc-800 text-zinc-300">
          <Upload className="w-3.5 h-3.5 text-zinc-400" />
          <span>Upload Paper</span>
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload Research Paper</DialogTitle>
          <DialogDescription>
            Ingest a PDF manuscript with multimodal section, table, and formula extraction.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {!isUploading && jobStatus !== 'completed' && (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-zinc-800 hover:border-zinc-700 bg-zinc-900/40 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer transition-colors text-center"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={handleFileChange}
              />
              <FileUp className="w-7 h-7 text-zinc-400 mb-2" />
              {selectedFile ? (
                <div className="space-y-1">
                  <div className="text-xs font-medium text-zinc-200 truncate max-w-[280px]">
                    {selectedFile.name}
                  </div>
                  <div className="text-[11px] font-mono text-zinc-400">
                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="text-xs font-medium text-zinc-300">
                    Click to select PDF paper
                  </div>
                  <div className="text-[11px] text-zinc-400 font-mono">
                    Multi-page academic manuscripts (max 50MB)
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Active Job Progress View */}
          {(isUploading || jobStatus === 'completed') && (
            <div className="p-4 rounded-lg bg-zinc-900/80 border border-zinc-800 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  {jobStatus === 'completed' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Loader2 className="w-4 h-4 text-zinc-400 animate-spin" />
                  )}
                  <span className="font-mono text-zinc-200 capitalize">
                    {jobStatus === 'completed' ? 'Ingestion Complete' : `${jobStatus}...`}
                  </span>
                </div>
                <span className="font-mono text-zinc-400">{jobProgress}%</span>
              </div>

              <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-zinc-100 h-1.5 transition-all duration-300 rounded-full"
                  style={{ width: `${jobProgress}%` }}
                />
              </div>

              <div className="text-[11px] font-mono text-zinc-400">
                {jobStatus === 'parsing' && 'Transcribing layout and Markdown sections...'}
                {jobStatus === 'extracting' && 'Preserving LaTeX equations and data tables...'}
                {jobStatus === 'completed' && 'Paper indexed and ready for discussion.'}
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="flex items-start gap-2 p-3 rounded bg-red-950/40 border border-red-900/60 text-red-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="ghost"
              size="sm"
              disabled={isUploading}
              onClick={() => {
                setOpen(false);
                resetState();
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!selectedFile || isUploading || jobStatus === 'completed'}
              onClick={handleUpload}
            >
              {isUploading ? 'Extracting...' : 'Start Ingestion'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
