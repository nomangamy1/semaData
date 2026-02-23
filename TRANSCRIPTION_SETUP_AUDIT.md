# Transcription & Ollama Setup Audit Report

## Summary
**Status**: ⚠️ **PARTIALLY CONFIGURED** - Multiple critical gaps found

---

## Issues Found

### 1. **CRITICAL: Transcription-to-Dataset Data Flow Broken** ❌
**Location**: `Backend/routes/core/semaDataEngine.py` + `Backend/routes/main/Dashboard.py`

**Problem**: 
- The `/transcribe` endpoint saves segmented data to the `Dataset` model as `segmented_text` (JSON)
- But the CSV export in `Dashboard.py` queries the `Transcription` table instead
- **No `Transcription` records are ever created** - the endpoint doesn't instantiate `Transcription` objects

**Code Flow**:
```
/transcribe endpoint:
  ✓ Saves to Dataset.segmented_text (JSON)
  ✗ NEVER creates Transcription records
  
/download endpoint:
  ✗ Queries Transcription.query.filter_by(dataset_id=...)
  ✗ Expected to find Transcription.domain_features
  → Result: Downloads empty CSV with headers only
```

---

### 2. **Dataset Missing DomainOwner Association** ❌
**Location**: `Backend/models/dataset.py`

**Problem**:
- `Dataset` has `domain_id` (links to Domain)
- `Domain` has `owner_id` (links to DomainOwner)
- But `Dataset` has NO direct `owner_id` column
- CSV export filter chains: `Dataset.domain_id → Domain.owner_id`
- This is inefficient and requires manual joins

**Current Model**:
```python
class Dataset(db.Model):
    domain_id = db.Column(db.Integer, db.ForeignKey('domain.id'))  
    collector_id = db.Column(db.Integer)  # NOT linked to DomainOwner
    # Missing: owner_id = db.Column(db.Integer, db.ForeignKey('DomainOwner.id'))
```

---

### 3. **Ollama Fallback Missing Error Handling** ⚠️
**Location**: `Backend/routes/core/semaDataEngine.py` lines ~112-115

**Problem**:
```python
try:
    refined_json_strings = refine_with_llm(transcribed_text, initial_segments)
    segmented_text = json.loads(refined_json_strings)  # ← Can fail silently
except Exception as e:
    print(f"Ollama Error {e} . Falling back to initial segmentation ")
    segmented_text = initial_segments  # Falls back to semantic results
```

**Issues**:
- Ollama failures silently return semantic segmentation results
- No confidence score tracking
- Frontend unaware if Ollama was used vs fallback

---

### 4. **Transcription Model Not Utilized** ❌
**Location**: `Backend/models/Transcription.py`

**Defined but unused**:
```python
class Transcription(db.Model):
    __tablename__ = 'transcriptions'
    id = db.Column(db.Integer, primary_key=True)
    dataset_id = db.Column(db.Integer, db.ForeignKey('datasets.id'))
    user_id = db.Column(db.Integer, db.ForeignKey('Users.id'))
    domain_features = db.Column(db.JSON, nullable=False)  # ← CSV export expects this!
```

- **Purpose**: Appears designed to store individual contributor transcriptions
- **Current Status**: Never instantiated in `/transcribe` endpoint
- **Impact**: CSV export has no data to retrieve

---

### 5. **CSV Export Filter Not Validating DomainOwner** ⚠️
**Location**: `Backend/routes/main/Dashboard.py` lines 69-75

**Code**:
```python
@dashboard_bp.route('/download/<int:domain_id>', methods=['GET'])
@jwt_required()
def download_dataset(domain_id):
    current_owner_id = get_jwt_identity()  # Gets JWT identity
    domain = Domain.query.get(domain_id)
    
    if domain.owner_id != current_owner_id:  # ✓ Validates ownership
        return jsonify({"error": "Unauthorized"}), 403
```

**Status**: ✓ **CORRECT** - Properly validates domain ownership before download

---

### 6. **Ollama Integration Status** ⚠️
**Location**: `Backend/routes/core/semaDataEngine.py` lines ~96-109

**What's Working**:
- ✓ Ollama integration attempted with `ollama.chat(model='llama3.2:1b')`
- ✓ JSON format requested explicitly
- ✓ Fallback to semantic segmentation if Ollama unavailable
- ✓ Model is small (1B) for efficiency

**What's Missing**:
- ✗ No validation if Ollama service is running
- ✗ No retry logic
- ✗ No confidence/status feedback to frontend
- ✗ Hardcoded model name (should be configurable)

---

## CSV Export Current Flow

```
Domain Owner downloads CSV:
  1. GET /download/<domain_id>
  2. Validates: current_owner_id == domain.owner_id ✓
  3. Queries: datasets = Dataset.query.filter_by(domain_id=domain_id, status="Processed")
  4. For each dataset:
       → Queries: Transcription.query.filter_by(dataset_id=dataset.id)  ← ❌ EMPTY!
       → Extracts: transcription.domain_features
  5. Result: CSV with headers only (no data rows)
```

---

## Recommendations to Fix

### Priority 1: Create Missing Transcription Records
```python
# In semaDataEngine.py /transcribe endpoint, after AI refinement:
transcription_record = Transcription(
    dataset_id=new_dataset.id,  # or existing_entry.id
    user_id=collector_id,
    domain_features=segmented_text,  # The refined JSON
)
db.session.add(transcription_record)
db.session.commit()
```

### Priority 2: Add owner_id to Dataset Model
```python
class Dataset(db.Model):
    # ... existing columns ...
    owner_id = db.Column(db.Integer, db.ForeignKey('DomainOwner.id'), nullable=False)
    
    # Add index for faster queries
    __table_args__ = (
        db.Index('ix_dataset_owner_domain', 'owner_id', 'domain_id'),
    )
```

### Priority 3: Enhanced Ollama Error Handling
```python
def refine_with_llm(transcribed_text, segmented_text):
    try:
        # Add timeout and better error messages
        response = ollama.chat(
            model='llama3.2:1b',
            format='json',
            messages=[{'role': 'user', 'content': prompt}],
            timeout=30  # Add timeout
        )
        return response['message']['content'], {'status': 'LLM_SUCCESS', 'model': 'llama3.2:1b'}
    except ConnectionError:
        print("Ollama service not running")
        return segmented_text, {'status': 'OLLAMA_OFFLINE', 'fallback': 'semantic'}
    except json.JSONDecodeError:
        print("LLM returned invalid JSON")
        return segmented_text, {'status': 'LLM_PARSE_ERROR', 'fallback': 'semantic'}
```

### Priority 4: Update CSV Export to Handle Both Flows
```python
# Option A: Use Dataset.segmented_text (if Transcription unused)
# Option B: Continue using Transcription (after fixing step 1)

# Recommendation: Use Transcription (more scalable for multi-contributor scenarios)
for dataset in datasets:
    transcriptions = Transcription.query.filter_by(dataset_id=dataset.id).all()
    for transcription in transcriptions:
        if transcription.domain_features:
            domain_features_dict = transcription.domain_features if isinstance(transcription.domain_features, dict) else json.loads(transcription.domain_features)
            feature_values = [domain_features_dict.get(fname, '') for fname in feature_names]
            writer.writerow(feature_values)
            total_records += 1
```

---

## Testing Checklist

- [ ] Verify Ollama service running: `curl http://localhost:11434/api/tags`
- [ ] Test `/transcribe` endpoint creates both Dataset AND Transcription records
- [ ] Verify Transcription.domain_features matches expected schema
- [ ] Test CSV download with multiple transcriptions per dataset
- [ ] Verify CSV only contains data from authenticated domain owner's domains
- [ ] Test fallback behavior when Ollama is offline
- [ ] Check database for orphaned datasets (no transcriptions)

---

## Architecture Diagram (Current vs Fixed)

```
CURRENT (Broken):
Dataset (segmented_text) ──┐
                            ├→ CSV Export queries Transcription (EMPTY)
Transcription (unused)  ────┘

FIXED (Recommended):
/transcribe endpoint:
  1. Create Dataset record
  2. Create Transcription record with domain_features ← Key fix
  3. Return success + LLM status
  
CSV Export:
  1. Query Transcription records for dataset
  2. Extract domain_features from each
  3. Populate CSV rows ✓
```

---

## Conclusion

**Current Status**: The system is architecturally sound but has a **critical implementation gap**:
- Transcription records are never created despite the model being defined
- CSV export queries an empty table, returning no data
- Adding Transcription record creation is a simple 4-line fix

**Ollama Integration**: Properly configured with reasonable fallback behavior, but lacks observability.
