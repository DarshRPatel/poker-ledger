import './ConfirmModal.css';

export default function ConfirmModal({ isOpen, title, message, onConfirm, onCancel }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay animate-fade-in-up">
      <div className="modal-content glass-card">
        <h3 className="modal-title">{title}</h3>
        <p className="modal-message">{message}</p>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button className="btn btn-primary btn-danger" onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </div>
  );
}
