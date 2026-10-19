import React, { useState, useRef } from 'react';
import { 
  X, UploadCloud, FolderUp, Link as LinkIcon, 
  FileAudio, Check, AlertCircle, Loader2, ArrowUp
} from 'lucide-react';
import { ModalBackdrop } from './ModalBackdrop';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportFiles: (files: FileList | File[]) => Promise<void>;
  onImportFolder: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onLoadDemoTracks?: () => void;
  isImporting: boolean;
  isLoadingDemo?: boolean;
}

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  onImportFiles,
  onImportFolder,
  onLoadDemoTracks,
  isImporting,
  isLoadingDemo,
}) => {
  const [activeTab, setActiveTab] = useState<'files' | 'url'>('files');
  const [audioUrl, setAudioUrl] = useState('');
  const [isUrlDownloading, setIsUrlDownloading] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [isScanningFolder, setIsScanningFolder] = useState(false);

  if (!isOpen) return null;

  const isAudioFile = (name: string, type?: string) => {
    return (
      (type && type.startsWith('audio/')) ||
      /\.(mp3|wav|flac|m4a|aac|ogg|opus|weba|aiff|m4b)$/i.test(name)
    );
  };

  const handleSelectFolder = async () => {
    // Check for native Desktop showDirectoryPicker support (Windows/macOS/Linux)
    if (typeof window !== 'undefined' && 'showDirectoryPicker' in window) {
      try {
        setIsScanningFolder(true);
        const win = window as unknown as { showDirectoryPicker: () => Promise<FileSystemDirectoryHandle> };
        const dirHandle = await win.showDirectoryPicker();
        const collectedFiles: File[] = [];

        const scanDirectory = async (handle: FileSystemDirectoryHandle): Promise<void> => {
          const handleWithValues = handle as unknown as { values: () => AsyncIterable<FileSystemHandle> };
          for await (const entry of handleWithValues.values()) {
            if (entry.kind === 'file') {
              const fileHandle = entry as FileSystemFileHandle;
              const file = await fileHandle.getFile();
              if (isAudioFile(file.name, file.type)) {
                collectedFiles.push(file);
              }
            } else if (entry.kind === 'directory') {
              await scanDirectory(entry as FileSystemDirectoryHandle);
            }
          }
        };

        await scanDirectory(dirHandle);
        setIsScanningFolder(false);

        if (collectedFiles.length > 0) {
          await onImportFiles(collectedFiles);
          onClose();
        }
        return;
      } catch (err: unknown) {
        setIsScanningFolder(false);
        if ((err as Error)?.name === 'AbortError') {
          return; // User canceled folder selection
        }
        console.warn('showDirectoryPicker failed, falling back to input:', err);
      }
    }

    // Android & Universal Fallback: Webkit Directory File Input
    folderInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await onImportFiles(e.target.files);
      e.target.value = '';
      onClose();
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await onImportFiles(e.dataTransfer.files);
      onClose();
    }
  };

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!audioUrl.trim()) return;
    setIsUrlDownloading(true);
    setUrlError(null);

    try {
      const res = await fetch(audioUrl.trim());
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const blob = await res.blob();
      const filename = audioUrl.split('/').pop()?.split('?')[0] || 'Web_Track.mp3';
      const file = new File([blob], filename, { type: blob.type || 'audio/mpeg' });
      await onImportFiles([file]);
      setAudioUrl('');
      onClose();
    } catch (err) {
      console.error('URL download error:', err);
      setUrlError('Could not download audio from URL. Please check the URL or CORS permissions.');
    } finally {
      setIsUrlDownloading(false);
    }
  };

  return (
    <ModalBackdrop
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-lg bg-[#0a0a0a] p-6 text-zinc-100"
    >
      {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div>
            <h2 className="text-base font-semibold text-white">Import Audio</h2>
            <p className="text-xs text-zinc-400 mt-0.5">Select local audio files or drag and drop folders into your library</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="w-full p-1 bg-white/[0.04] border border-white/5 rounded-xl flex items-center gap-1 my-4">
          <button
            type="button"
            onClick={() => setActiveTab('files')}
            className={`flex-1 h-9 px-3 rounded-lg font-medium text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'files'
                ? 'bg-white/10 text-white shadow-sm border border-white/10'
                : 'text-zinc-400 hover:text-white hover:bg-white/[0.03]'
            }`}
          >
            <FileAudio className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'files' ? 'text-white' : 'text-zinc-400'}`} />
            <span>Local Files & Folders</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('url')}
            className={`flex-1 h-9 px-3 rounded-lg font-medium text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'url'
                ? 'bg-white/10 text-white shadow-sm border border-white/10'
                : 'text-zinc-400 hover:text-white hover:bg-white/[0.03]'
            }`}
          >
            <LinkIcon className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'url' ? 'text-white' : 'text-zinc-400'}`} />
            <span>Web URL</span>
          </button>
        </div>

        {activeTab === 'files' ? (
          <div className="space-y-3">
            {/* Hidden native inputs */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="audio/*,.mp3,.wav,.flac,.m4a,.aac,.ogg,.opus,.weba"
              onChange={handleFileChange}
              className="hidden"
            />
            <input
              ref={folderInputRef}
              type="file"
              // @ts-expect-error webkitdirectory is standard for folder picker
              webkitdirectory=""
              directory=""
              multiple
              onChange={(e) => {
                onImportFolder(e);
                onClose();
              }}
              className="hidden"
            />

            {/* Drag-and-Drop Dropzone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center transition-colors cursor-pointer group ${
                isDragging
                  ? 'border-white/40 bg-white/[0.06]'
                  : 'border-white/10 hover:border-white/20 bg-white/[0.02] hover:bg-white/[0.04]'
              }`}
            >
              <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3">
                {isImporting ? (
                  <Loader2 size={24} className="animate-spin text-white" />
                ) : (
                  <ArrowUp className="w-8 h-8 text-zinc-400 group-hover:text-white transition-colors" />
                )}
              </div>

              <button
                type="button"
                disabled={isImporting}
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="px-4 py-2 rounded-xl bg-white text-black font-semibold text-xs hover:bg-zinc-200 transition-colors shadow-sm cursor-pointer"
              >
                Browse Files
              </button>

              <span className="text-[11px] text-zinc-500 mt-2 font-mono">
                Supports MP3, FLAC, WAV, AAC, M4A, OGG
              </span>
            </div>

            {/* Secondary actions: Folder Picker & Demo library */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleSelectFolder}
                disabled={isImporting || isScanningFolder}
                className="flex-1 py-2.5 px-3 rounded-xl border border-white/5 bg-white/[0.03] hover:bg-white/[0.06] text-xs font-medium text-zinc-300 hover:text-white transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                {isScanningFolder ? (
                  <Loader2 size={14} className="animate-spin text-zinc-300" />
                ) : (
                  <FolderUp size={14} className="text-zinc-400" />
                )}
                <span>{isScanningFolder ? 'Scanning Folder...' : 'Import Folder'}</span>
              </button>

              {onLoadDemoTracks && (
                <button
                  type="button"
                  onClick={() => {
                    onLoadDemoTracks();
                    onClose();
                  }}
                  disabled={isLoadingDemo}
                  className="py-2.5 px-3 rounded-xl border border-white/5 bg-white/[0.03] hover:bg-white/[0.06] text-xs font-medium text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  {isLoadingDemo ? 'Loading...' : 'Load Sample Songs'}
                </button>
              )}
            </div>
          </div>
        ) : (
          <form onSubmit={handleUrlSubmit} className="space-y-3.5">
            <div>
              <label className="block text-[11px] font-medium text-zinc-400 uppercase tracking-wider mb-1.5">
                Direct Audio File URL
              </label>
              <input
                type="url"
                required
                value={audioUrl}
                onChange={(e) => setAudioUrl(e.target.value)}
                placeholder="https://example.com/audio/song.mp3"
                className="w-full h-10 px-3.5 rounded-xl bg-white/[0.04] border border-white/10 focus:border-white/25 text-xs text-white placeholder-zinc-500 focus:outline-none transition-colors"
              />
              <p className="text-[11px] text-zinc-500 mt-1.5">
                Paste any direct link to an MP3, FLAC, or WAV file to save it directly into your local library.
              </p>
            </div>

            {urlError && (
              <div className="p-3 rounded-xl bg-white/[0.03] border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0" />
                <span>{urlError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setActiveTab('files')}
                className="px-4 h-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-zinc-300 transition-colors cursor-pointer"
              >
                Back
              </button>

              <button
                type="submit"
                disabled={!audioUrl.trim() || isUrlDownloading}
                className="px-5 h-9 rounded-xl bg-white text-black font-semibold text-xs hover:bg-zinc-200 transition-colors shadow-sm flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
              >
                {isUrlDownloading ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>Downloading...</span>
                  </>
                ) : (
                  <>
                    <Check size={13} />
                    <span>Save to Library</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
    </ModalBackdrop>
  );
};
