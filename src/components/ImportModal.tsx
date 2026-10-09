import React, { useState, useRef } from 'react';
import { 
  X, UploadCloud, FolderUp, Link as LinkIcon, Sparkles, 
  FileAudio, Check, AlertCircle, Loader2 
} from 'lucide-react';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportFiles: (files: FileList | File[]) => Promise<void>;
  onImportFolder: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onLoadDemoTracks: () => void;
  isImporting: boolean;
  isLoadingDemo: boolean;
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150">
      <div 
        className="w-full max-w-md bg-[#1c1c1e]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl p-5 text-zinc-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center text-rose-500">
              <UploadCloud size={18} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white tracking-tight">Import Music</h2>
              <p className="text-[11px] text-zinc-400">Save audio tracks to your persistent browser library</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex p-1 bg-white/[0.06] rounded-full my-4">
          <button
            onClick={() => setActiveTab('files')}
            className={`flex-1 py-1.5 text-xs font-medium rounded-full transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'files' ? 'bg-white text-zinc-950 shadow-sm' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <FileAudio size={14} />
            <span>Local Files</span>
          </button>
          <button
            onClick={() => setActiveTab('url')}
            className={`flex-1 py-1.5 text-xs font-medium rounded-full transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'url' ? 'bg-white text-zinc-950 shadow-sm' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <LinkIcon size={14} />
            <span>From Web URL</span>
          </button>
        </div>

        {activeTab === 'files' ? (
          <div className="space-y-3">
            {/* Hidden native inputs */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="audio/*"
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

            {/* Choose files button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
              className="w-full p-4 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] active:bg-white/[0.1] transition-all text-left flex items-center gap-3.5 group"
            >
              <div className="w-10 h-10 rounded-xl bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-rose-500/20 group-hover:scale-105 transition-transform">
                {isImporting ? <Loader2 size={18} className="animate-spin" /> : <UploadCloud size={20} />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-white">Select Audio Files</div>
                <div className="text-[11px] text-zinc-400 mt-0.5">MP3, WAV, FLAC, AAC, M4A, OGG from your phone or PC</div>
              </div>
            </button>

            {/* Choose folder (window.showDirectoryPicker or webkitdirectory) */}
            <button
              onClick={handleSelectFolder}
              disabled={isImporting || isScanningFolder}
              className="w-full min-h-[48px] p-3 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.06] active:bg-white/[0.08] transition-colors text-left flex items-center gap-3 touch-manipulation"
            >
              <div className="w-9 h-9 rounded-lg bg-white/[0.06] text-zinc-300 flex items-center justify-center shrink-0">
                {isScanningFolder ? <Loader2 size={16} className="animate-spin text-rose-400" /> : <FolderUp size={16} />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium text-zinc-200">
                  {isScanningFolder ? 'Scanning Folder Audio...' : 'Select Folder'}
                </div>
                <div className="text-[10px] text-zinc-400">
                  Recursively index audio files (.mp3, .wav, .flac, .m4a, .aac)
                </div>
              </div>
            </button>

            {/* Load instant demo tracks */}
            <div className="pt-2 border-t border-white/[0.06]">
              <button
                onClick={() => {
                  onLoadDemoTracks();
                  onClose();
                }}
                disabled={isLoadingDemo}
                className="w-full py-2 px-3 rounded-full bg-white/[0.04] hover:bg-white/[0.08] text-rose-300 hover:text-white border border-white/10 text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
              >
                <Sparkles size={14} className="text-rose-400" />
                <span>{isLoadingDemo ? 'Synthesizing...' : 'Load 3 Free Synth Demo Tracks'}</span>
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleUrlSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Direct Audio File URL
              </label>
              <input
                type="url"
                required
                value={audioUrl}
                onChange={(e) => setAudioUrl(e.target.value)}
                placeholder="https://example.com/music/song.mp3"
                className="w-full bg-white/[0.06] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-rose-500/50"
              />
              <p className="text-[10px] text-zinc-400 mt-1">
                Paste any direct link to an MP3 or WAV file to download it into your local browser library.
              </p>
            </div>

            {urlError && (
              <div className="p-2.5 rounded-lg bg-red-950/60 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0 text-red-400" />
                <span>{urlError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={!audioUrl.trim() || isUrlDownloading}
              className="w-full py-2.5 px-4 bg-rose-500 hover:bg-rose-400 disabled:opacity-40 text-white rounded-full text-xs font-medium shadow-md shadow-rose-500/20 transition-all flex items-center justify-center gap-1.5"
            >
              {isUrlDownloading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Downloading & Importing...</span>
                </>
              ) : (
                <>
                  <Check size={14} />
                  <span>Download & Save to Library</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
