import React, { useState } from "react";
import { X, Plus, Trash2 } from "lucide-react";

const FeatureEditModal = ({ domain, onClose, onSave }) => {
  const [features, setFeatures] = useState(
    (domain?.features || []).map(f => ({ id: f.id, name: f.name || f, isNew: false }))
  );
  const [newFeatureName, setNewFeatureName] = useState("");
  const [removedIds, setRemovedIds] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const addFeature = () => {
    const name = newFeatureName.trim();
    if (!name) return;
    if (features.some(f => f.name.toLowerCase() === name.toLowerCase())) {
      setError("That feature already exists.");
      return;
    }
    setFeatures(prev => [...prev, { id: null, name, isNew: true }]);
    setNewFeatureName("");
    setError("");
  };

  const removeFeature = (feat) => {
    if (feat.id) setRemovedIds(prev => [...prev, feat.id]);
    setFeatures(prev => prev.filter(f => f !== feat));
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const addFeatures = features.filter(f => f.isNew).map(f => f.name);

      const res = await fetch(
        `http://localhost:8000/api/domain/${domain.domain_id}/features`,
        {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            add_features: addFeatures,
            remove_feature_ids: removedIds
          })
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");

      onSave(data.current_features);
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(15,23,42,0.6)",
      backdropFilter: "blur(6px)", zIndex: 9999,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20
    }}>
      <div style={{
        background: "white", borderRadius: 20, padding: "1.75rem",
        width: "100%", maxWidth: 460, boxShadow: "0 25px 50px rgba(0,0,0,0.25)"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 900, color: "#0f172a", margin: 0 }}>
            Edit Data Schema
          </h3>
          <button onClick={onClose} style={{
            background: "none", border: "none", cursor: "pointer",
            color: "#94a3b8", padding: 4
          }}>
            <X size={20} />
          </button>
        </div>
        <p style={{ fontSize: "0.8rem", color: "#64748b", margin: "0 0 16px" }}>
          Add or remove the features your collectors capture for <strong>{domain?.domain_name}</strong>.
          Removing a feature won't delete past data — it just stops appearing in new submissions.
        </p>

        {error && (
          <div style={{
            background: "#fee2e2", color: "#991b1b", padding: "8px 12px",
            borderRadius: 8, fontSize: "0.8rem", fontWeight: 600, marginBottom: 12
          }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16, maxHeight: 260, overflowY: "auto" }}>
          {features.map((f, i) => (
            <div key={i} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              background: f.isNew ? "#f0fdf4" : "#f8fafc",
              border: `1px solid ${f.isNew ? "#bbf7d0" : "#e2e8f0"}`,
              borderRadius: 10, padding: "8px 12px"
            }}>
              <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#1e293b" }}>
                {f.name} {f.isNew && <span style={{ color: "#489c8c", fontSize: "0.7rem" }}>NEW</span>}
              </span>
              <button onClick={() => removeFeature(f)} style={{
                background: "none", border: "none", cursor: "pointer", color: "#ef4444", padding: 4
              }}>
                <Trash2 size={15} />
              </button>
            </div>
          ))}
          {features.length === 0 && (
            <p style={{ fontSize: "0.8rem", color: "#94a3b8", textAlign: "center", padding: "1rem 0" }}>
              No features defined yet.
            </p>
          )}
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          <input
            type="text"
            placeholder="Add a new feature (e.g. Crop Type)"
            value={newFeatureName}
            onChange={e => setNewFeatureName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addFeature()}
            style={{
              flex: 1, padding: "9px 12px", borderRadius: 10,
              border: "1.5px solid #e2e8f0", fontSize: "0.85rem", outline: "none"
            }}
          />
          <button onClick={addFeature} style={{
            display: "flex", alignItems: "center", gap: 4,
            background: "#489c8c", color: "white", border: "none",
            padding: "9px 16px", borderRadius: 10, fontWeight: 700,
            fontSize: "0.85rem", cursor: "pointer"
          }}>
            <Plus size={15} /> Add
          </button>
        </div>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{
            padding: "9px 18px", borderRadius: 10, border: "1px solid #e2e8f0",
            background: "white", color: "#64748b", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer"
          }}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving} style={{
            padding: "9px 22px", borderRadius: 10, border: "none",
            background: saving ? "#94a3b8" : "#0f172a", color: "white",
            fontWeight: 700, fontSize: "0.85rem", cursor: saving ? "not-allowed" : "pointer"
          }}>
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FeatureEditModal;
