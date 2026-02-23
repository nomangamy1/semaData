# SemaData Careers & Recruitment System

## Overview

This system shifts data collector recruitment from arbitrary domain owner invitations to a professional, **admin-controlled job board model**. Only **semaData admins** can post jobs; collectors apply through a public careers page, undergo screening, and receive reference numbers upon approval.

---

## System Architecture

```
┌─────────────────────────────────────────┐
│     SEMADATA ADMIN PANEL                │
│   (Post & Manage Jobs)                  │
├─────────────────────────────────────────┤
│                                         │
│ 1. Create Job                           │
│    - Title: "Agrovet Sellers"           │
│    - Field: "Agriculture"               │
│    - Requirements: Experience, Skills   │
│    - Location, Compensation             │
│                                         │
│ 2. Review Applications                  │
│    - Check CV & experience              │
│    - Approve/Reject                     │
│                                         │
│ 3. Assign Reference Numbers             │
│    - Auto-generated on approval         │
│    - Format: AGRO--ABC123XYZ            │
│                                         │
└─────────────────────────────────────────┘
         ↓              ↓
┌─────────────────┬──────────────────────┐
│  PUBLIC CAREERS │   COLLECTOR LOGIN    │
│     PAGE        │   Dashboard          │
├─────────────────┼──────────────────────┤
│ - Browse Jobs   │ - View Assigned Job  │
│ - Apply         │ - Track Progress     │
│ - Track Status  │ - Start Collecting   │
└─────────────────┴──────────────────────┘
```

---

## Database Models

### Job Model
```python
Job
├── id (PK)
├── title: "Agrovet Sellers - Farm Input Study"
├── description: Full job description
├── field: "Agriculture" (category for filtering)
├── specialization_required: "Agrovet Seller"
├── required_skills: ["Agricultural knowledge", "Customer interaction"]
├── min_experience_years: 2
├── languages: ["Swahili", "English"]
├── location: "Kenya - Western Region"
├── estimated_submissions: 500
├── compensation: "KES 50 per record"
├── duration: "2 weeks"
├── status: 'draft' | 'published' | 'closed' | 'archived'
├── posted_at: DateTime
├── closes_at: DateTime
└── applications: [JobApplication]
```

### JobApplication Model
```python
JobApplication
├── id (PK)
├── job_id (FK → Job)
├── applicant_id (FK → User)
├── cover_letter: Text
├── cv_file_path: "/uploads/cv/..."
├── relevant_experience: Text
├── self_assessment_skills: ["Agronomy", "Customer Service"]
├── status: 'submitted' | 'under_review' | 'approved' | 'rejected'
├── applied_at: DateTime
├── reviewed_at: DateTime (when admin reviewed)
├── reviewed_by_id (FK → DomainOwner/Admin)
├── rejection_reason: "Does not meet minimum experience"
├── approval_notes: "Great fit for the team"
├── reference_number_assigned: "AGRO--ABC123XYZ"
└── assigned_user_id (FK → User/Collector)
```

---

## API Endpoints

### ADMIN ENDPOINTS (Job Management)

#### 1. Create Job
```
POST /api/careers/admin/jobs
Authorization: JWT (Admin)

Request:
{
  "title": "Agrovet Sellers - Farm Input Study",
  "description": "We need experienced agrovet sellers to survey farmers...",
  "field": "Agriculture",
  "specialization_required": "Agrovet Seller",
  "required_skills": ["Agricultural knowledge", "Sales experience"],
  "min_experience_years": 2,
  "languages": ["Swahili", "English"],
  "location": "Western Kenya",
  "estimated_submissions": 500,
  "compensation": "KES 50 per verified record",
  "duration": "2 weeks"
}

Response:
{
  "message": "Job created successfully",
  "job_id": 1,
  "status": "draft"
}
```

#### 2. Publish Job (Make Public)
```
POST /api/careers/admin/jobs/1/publish
Authorization: JWT (Admin)

Response:
{
  "message": "Job published successfully",
  "job_id": 1,
  "applicants_can_now_see": true
}
```

#### 3. View All Jobs (Admin)
```
GET /api/careers/admin/jobs
Authorization: JWT (Admin)

Response:
{
  "total_jobs": 5,
  "jobs": [
    { job object }, 
    { job object }
  ]
}
```

#### 4. Review Applications
```
GET /api/careers/admin/applications
Authorization: JWT (Admin)

Response:
{
  "total_pending": 3,
  "applications": [
    {
      "id": 1,
      "job_title": "Agrovet Sellers",
      "applicant_name": "Sarah Wambui",
      "status": "submitted",
      "applied_at": "2026-02-22T10:30:00"
    }
  ]
}
```

#### 5. Approve Application & Assign Reference Number
```
POST /api/careers/admin/applications/1/approve
Authorization: JWT (Admin)

Request:
{
  "approval_notes": "Excellent experience, perfect fit"
}

Response:
{
  "message": "Application approved successfully",
  "collector_name": "Sarah Wambui",
  "reference_number": "AGRO--X7K2M9N1",
  "job_title": "Agrovet Sellers - Farm Input Study",
  "email_sent": true  // Collector receives onboarding email
}
```

#### 6. Reject Application
```
POST /api/careers/admin/applications/1/reject
Authorization: JWT (Admin)

Request:
{
  "rejection_reason": "Insufficient agricultural background"
}

Response:
{
  "message": "Application rejected",
  "applicant": "James Kipchoge",
  "rejection_reason": "Insufficient agricultural background"
}
```

---

### PUBLIC ENDPOINTS (Careers Page)

#### 1. Get All Available Jobs
```
GET /api/careers/careers
Query Params: ?field=Agriculture&location=Kenya

Response:
{
  "total_available": 5,
  "jobs": [
    {
      "id": 1,
      "title": "Agrovet Sellers - Farm Input Study",
      "field": "Agriculture",
      "specialization_required": "Agrovet Seller",
      "location": "Western Kenya",
      "estimated_submissions": 500,
      "compensation": "KES 50 per record",
      "duration": "2 weeks"
    }
  ]
}
```

#### 2. Get Job Details
```
GET /api/careers/careers/1

Response:
{
  "id": 1,
  "title": "Agrovet Sellers - Farm Input Study",
  "description": "Full description...",
  "field": "Agriculture",
  "specialization_required": "Agrovet Seller",
  "required_skills": ["Agricultural knowledge", "Sales"],
  "min_experience_years": 2,
  "languages": ["Swahili", "English"],
  "location": "Western Kenya",
  "estimated_submissions": 500,
  "compensation": "KES 50 per verified record",
  "duration": "2 weeks",
  "status": "published",
  "posted_at": "2026-02-20T14:22:00",
  "closes_at": "2026-03-22T14:22:00"
}
```

#### 3. Get Available Fields (For Filtering)
```
GET /api/careers/careers/fields

Response:
{
  "available_fields": ["Agriculture", "Health", "Education", "Finance"]
}
```

---

### COLLECTOR ENDPOINTS (Apply & Track)

#### 1. Apply for Job
```
POST /api/careers/apply/1
Authorization: JWT (Collector)

Request:
{
  "cover_letter": "I am an experienced agrovet seller with 5 years...",
  "relevant_experience": "Worked at Best Agro Ltd for 5 years, managed 200+ farmer accounts",
  "skills_claimed": ["Agronomy", "Customer Service", "Sales", "Farm Advisory"]
}

Response:
{
  "message": "Application submitted successfully",
  "application_id": 1,
  "job_title": "Agrovet Sellers - Farm Input Study",
  "status": "submitted",
  "next_step": "Admin will review your application and contact you within 48 hours"
}
```

#### 2. View My Applications
```
GET /api/careers/my-applications
Authorization: JWT (Collector)

Response:
{
  "total_applications": 3,
  "applications": [
    {
      "id": 1,
      "job_title": "Agrovet Sellers",
      "status": "approved",
      "applied_at": "2026-02-20T10:00:00",
      "reviewed_at": "2026-02-21T14:30:00",
      "reference_number": "AGRO--X7K2M9N1"
    },
    {
      "id": 2,
      "job_title": "Health Surveyors",
      "status": "rejected",
      "rejection_reason": "Insufficient health background"
    }
  ]
}
```

#### 3. Check Application Status
```
GET /api/careers/my-application/1
Authorization: JWT (Collector)

Response (if approved):
{
  "application": {
    "id": 1,
    "job_title": "Agrovet Sellers",
    "status": "approved",
    "applied_at": "2026-02-20T10:00:00"
  },
  "job": {
    "title": "Agrovet Sellers - Farm Input Study",
    "description": "...",
    "field": "Agriculture"
  },
  "onboarding": {
    "status": "approved",
    "reference_number": "AGRO--X7K2M9N1",
    "next_step": "You can now log in and start collecting data",
    "login_url": "https://semadata.app/login"
  }
}
```

---

### COLLECTOR DASHBOARD ENDPOINTS (After Approval)

#### 1. Get Assigned Job
```
GET /api/main/collector-assigned-job/5
Authorization: JWT (Collector ID 5)

Response:
{
  "job": {
    "id": 1,
    "title": "Agrovet Sellers - Farm Input Study",
    "description": "...",
    "field": "Agriculture",
    "specialization_required": "Agrovet Seller",
    "location": "Western Kenya",
    "compensation": "KES 50 per record",
    "duration": "2 weeks"
  },
  "assignment": {
    "reference_number": "AGRO--X7K2M9N1",
    "status": "active",
    "assigned_on": "2026-02-21T14:30:00",
    "message": "You are now authorized to collect data for this domain"
  }
}
```

#### 2. Get Job History
```
GET /api/main/collector-job-history/5
Authorization: JWT (Collector ID 5)

Response:
{
  "total_applications": 3,
  "applications": [
    {
      "id": 1,
      "job_title": "Agrovet Sellers",
      "job_field": "Agriculture",
      "specialization": "Agrovet Seller",
      "status": "approved",
      "applied_on": "2026-02-20T10:00:00",
      "reference_number": "AGRO--X7K2M9N1"
    }
  ]
}
```

---

## Reference Number Generation

**Format**: `FIELD_PREFIX--RANDOMCODE`

Example: `AGRO--X7K2M9N1`

- **FIELD_PREFIX**: First 4 letters of job field (Agriculture → AGRO)
- **RANDOMCODE**: 8 random alphanumeric characters (secure, unique)

**When Generated**: On application approval by admin

**Used For**: 
- Linking collector to domain
- Authenticating transcription requests
- Authorization checks

---

## Workflow Summary

### Step-by-Step Flow

**1. Admin Creates & Publishes Job**
```
Admin → POST /api/careers/admin/jobs → Job Status: "draft"
Admin → POST /api/careers/admin/jobs/1/publish → Job Status: "published"
```

**2. Job Appears on Public Careers Page**
```
Any User → GET /api/careers/careers → See Published Jobs
```

**3. Collector Applies**
```
Collector → POST /api/careers/apply/1 → Application Status: "submitted"
```

**4. Admin Reviews Applications**
```
Admin → GET /api/careers/admin/applications → See Pending Applications
Admin → Verify Experience & Skills
```

**5. Admin Approves/Rejects**
```
Admin → POST /api/careers/admin/applications/1/approve 
  → Reference Number Generated (AGRO--X7K2M9N1)
  → Collector Updated with Reference Number
  → Email Sent to Collector
```

**6. Collector Logs In & Starts Collecting**
```
Collector → Login with reference number
Collector → GET /api/careers/my-application/1 → See Onboarding Details
Collector → Start Transcribing Data
POST /api/core/transcribe → Uses Reference Number for Authorization
```

---

## Security Features

✅ **Admin-Only Control**: Only semaData admins can post jobs  
✅ **JWT Authorization**: All sensitive endpoints require authentication  
✅ **Ownership Verification**: Collectors can only see their own applications  
✅ **Reference Number Validation**: Each transcription request validates collector-job-domain match  
✅ **Audit Trail**: All approvals/rejections tracked with timestamps  
✅ **One-Time Processing**: Applications can only be approved once  

---

## Migration from Old System

Old System:
- Domain owner sends reference number manually
- No vetting process
- Collectors might not match domain requirements

New System:
- Collectors find opportunities independently
- Professional screening process
- Specialized collectors matched to specialized jobs
- Transparent application tracking

**Existing Users**: 
- Current domain owner-collector relationships can be converted to approved job applications
- Admin can bulk-assign reference numbers for existing assignments

---

## Next Steps for Frontend

1. **Public Careers Page**
   - Browse jobs by field/location
   - View job details
   - Apply button (redirects to collector signup/login)

2. **Collector Dashboard**
   - Application status tracker
   - Onboarding guide after approval
   - Start data collection button

3. **Admin Dashboard**
   - Job management (create, publish, close)
   - Application review interface
   - Approve/reject buttons with notes

4. **Email Notifications**
   - Job posted notification
   - Application received confirmation
   - Application approved with reference number
   - Application rejected with reason

