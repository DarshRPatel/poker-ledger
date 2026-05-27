import { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import { formatSessionText } from '../utils/share';
import './ShareModal.css';

export default function ShareModal({ isOpen, onClose, session, settlements, captureRef }) {
  const [copied, setCopied] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const timeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  if (!isOpen || !session) return null;

  const shareText = formatSessionText(session, settlements);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      setErrorMessage('Could not copy to clipboard');
    }
  };

  const handleWhatsApp = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleWebShare = async () => {
    if (!navigator.share) {
      setErrorMessage('Web Share not supported on this browser');
      return;
    }
    try {
      await navigator.share({
        title: `Poker Ledger Session #${session.sessionNumber}`,
        text: shareText,
      });
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Web share failed:', err);
        setErrorMessage('Failed to share results');
      }
    }
  };

  const handleDownloadImage = async () => {
    if (!captureRef || !captureRef.current) {
      setErrorMessage('Capture reference is missing');
      return;
    }

    setGeneratingImage(true);
    setErrorMessage('');

    try {
      const canvas = await html2canvas(captureRef.current, {
        backgroundColor: '#0b0f0e',
        scale: 2,
        logging: false,
        useCORS: true,
      });

      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `poker-session-${session.sessionNumber}-results.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to generate image:', err);
      setErrorMessage('Failed to generate PNG image');
    } finally {
      setGeneratingImage(false);
    }
  };

  return (
    <div className="modal-overlay animate-fade-in" id="share-modal-overlay">
      <div className="share-modal-content glass-card animate-fade-in-up" id="share-modal-content">
        <div className="share-modal-header">
          <h3>Share Results</h3>
          <button className="share-close-btn" onClick={onClose} aria-label="Close modal">×</button>
        </div>

        {errorMessage && <div className="share-error-banner">{errorMessage}</div>}

        <div className="share-preview-container">
          <label className="share-preview-label">Summary Preview</label>
          <textarea
            className="share-preview-text"
            value={shareText}
            readOnly
            rows={8}
            id="share-text-preview"
          />
        </div>

        <div className="share-actions-grid">
          <button
            className={`btn btn-secondary ${copied ? 'btn-copied' : ''}`}
            onClick={handleCopy}
            id="btn-copy-clipboard"
          >
            {copied ? '✓ Copied' : '📋 Copy Text'}
          </button>
          <button
            className="btn btn-secondary btn-whatsapp"
            onClick={handleWhatsApp}
            id="btn-share-whatsapp"
          >
            💬 WhatsApp
          </button>
          {navigator.share && (
            <button
              className="btn btn-secondary btn-webshare"
              onClick={handleWebShare}
              id="btn-web-share"
            >
              🔗 More Share
            </button>
          )}
          <button
            className="btn btn-primary"
            onClick={handleDownloadImage}
            disabled={generatingImage}
            id="btn-download-image"
          >
            {generatingImage ? 'Generating PNG...' : '🖼️ Download Image'}
          </button>
        </div>
      </div>
    </div>
  );
}
