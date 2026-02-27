# SemaData — Field Data Collection & AI-Powered Linguistic Research Platform

## Overview

**SemaData** is an enterprise-grade platform for collecting, transcribing, and extracting structured data from field conversations in African languages and dialects. It combines audio recording, speech-to-text, semantic feature extraction, and domain-driven workflows to enable researchers, NGOs, and enterprises to gather high-quality linguistic and behavioral data at scale.

### Core Value Proposition
- **For Collectors**: Earn money by recording conversations; offline-capable app with local sync.
- **For Researchers/Domains**: Define custom features, hire collectors via jobs, track progress dashboards.
- **For Admins**: Manage domains, approve applications, review transcriptions, export datasets.
- **For AI/ML**: Pre-processed, semantically segmented datasets ready for NLP/LLM training.

## Architecture

### Tech Stack
- **Backend**: Python Flask, SQLAlchemy ORM, Alembic migrations
- **Frontend**: React + Vite, Dexie (IndexedDB) for offline drafts
- **ML/LLM**: faster-whisper (Inference), SentenceTransformers (embeddings), Ollama (local LLM)
- **Database**: PostgreSQL
- **Infrastructure**: Docker, Docker Compose, Gunicorn (production)
- **Auth**: JWT (Flask-JWT-Extended)
- **Payments**: Daraja M-Pesa integration

### High-Level Flow
```
Collector → Audio Recording → IndexedDB Draft (offline)
          ↓ (online)
          ↓ POST /api/core/transcribe
Backend   → Quality Gate → WebM→WAV → Transcription (Whisper)
          → Semantic Segmentation → LLM Refinement (Ollama)
          → Save Dataset + Transcription
          ↓
Admin     → View datasets, approve, export CSV
```

## Getting Started (Development)

### Prerequisites
- Python 3.9+, PostgreSQL 12+, Node.js 16+
- `ffmpeg` (audio conversion), Ollama (optional LLM refinement)

### Backend Setup
```bash
cd Backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env  # Edit with your config
alembic upgrade head
python run.py
```

Server: `http://localhost:8000`

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

Frontend: `http://localhost:5173`

## Roadmap: Path to $1M+ ARR in Kenya & Africa

### Phase 1: Product Consolidation (Months 1-3)
**Goal**: Perfect core flow; build brand & early adopters.

1. **Full DB Migration Suite** — Versioned migrations with rollback tests.
2. **Quality & Testing** — Unit tests, integration tests, load testing.
3. **Mobile App** — React Native/Flutter; offline-first; geo-tagging.
4. **Data Export** — CSV/JSON export; transcription review UI.

### Phase 2: Market Expansion (Months 4-9)
**Goal**: Product-market fit; capture key verticals in Kenya.

1. **Language Support** — Whisper models for Swahili, Luhya, Dinka, Somali; code-switching.
2. **Domain Marketplace** — Researchers post requests; 15-20% SemaData commission.
3. **Integration Partners** — NGOs, agricultural extension, fintech, MFIs.
4. **Mobile Apps** — iOS/Android with push notifications, in-app M-Pesa earnings.
5. **Payment & Incentives** — Instant M-Pesa payouts, quality bonuses, referrals.

### Phase 3: Regional Scale (Months 10-18)
**Goal**: Expand East/West Africa; build B2B revenue streams.

1. **Enterprise Edition** — White-label, custom APIs, on-premise: $5k–$20k/month.
2. **20+ Languages** — Amharic, Yoruba, Zulu, Lingala; partner with linguistic institutes.
3. **Multi-Country Ops** — Kenya, Uganda, Nigeria, Ethiopia; local payment methods.
4. **AI Model Marketplace** — Fine-tuned NLP models (sentiment, intent, entity extraction): $100/month licensing.
5. **Analytics Dashboard** — Linguistic patterns, dialect heat maps, anonymized insights for dev orgs.

### Phase 4: Enterprise & Scale (Months 19-30)
**Goal**: Build $1M+ ARR; establish Africa's data infrastructure.

1. **Government Contracts** — Census, health surveys, education: $50k–$500k+ per project.
2. **Tech Partnerships** — OpenAI, Google, Meta licensing datasets; $500k–$2M per license.
3. **Vertical Solutions** — AgriTech, HealthTech, FinTech; $10k–$50k/month each.
4. **Deep Integrations** — Safaricom, Airtel, DeFi, banks (voice-based KYC, support); $10k–$100k/month.
5. **Data Annotation Marketplace** — Crowdsourced transcription review; 30–40% margin.
6. **Research Institute** — SemaData Labs; academic partnerships; grant funding.

## Revenue Model Projections

| Year | ARR | Milestones |
|------|-----|-----------|
| **Year 1** | Ksh 5–10M (~$40k–$80k) | 5–10 customers, 100 collectors |
| **Year 2** | Ksh 50–100M (~$400k–$800k) | Regional expansion, 500–1k collectors, 30–50 customers, data licensing |
| **Year 3** | Ksh 150–300M (~$1.2M–$2.4M) | Vertical solutions, govt contracts, 5k–10k collectors, 100–200 customers |

## Competitive Advantages

1. **Language-First Design** — Built for African languages from day one (not an afterthought).
2. **Offline-Capable** — Collectors work on 2G/3G without stable internet.
3. **Semantic Understanding** — STT + embeddings + LLM = nuanced extraction (not just transcription).
4. **Local Expertise** — Built in Kenya for Africa; understand regional payments, languages, regulations.
5. **Open & Extensible** — Partner-friendly APIs, white-label, data licensing.

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| **Competition** (Google, OpenAI) | Focus on underserved verticals (AgriTech, HealthTech) & data privacy. |
| **Collector Churn** | Gamification, referral bonuses, transparent pay, quality incentives. |
| **Data Quality** | Multi-level QA (auto + human), feedback loops, transparent rejection reasons. |
| **Language Drift** | Regular model retraining, dialect fine-tuning, community feedback. |
| **Regulatory** (privacy, labor) | GDPR/DPA compliance, local labor laws, clear ToS & consent. |
| **CAC** (Customer Acquisition) | Self-serve onboarding, free tier, referrals, direct sales for enterprise. |

## Deployment (Production)

### Docker
```bash
docker-compose up -d
```

### Environment Variables
```
FLASK_ENV=production
DATABASE_URI=postgresql://user:pass@host:5432/semadata
SECRET_KEY=your-secret-key
FRONTEND_URL=https://app.semadata.com
MAIL_SERVER=smtp.gmail.com
MAIL_USERNAME=your-email
DARAJA_CONSUMER_KEY=your_key
DARAJA_CONSUMER_SECRET=your_secret
DARAJA_PASSKEY=your_passkey
```

### Hosting
- **API**: AWS EC2, DigitalOcean, Render
- **Database**: AWS RDS, Heroku Postgres
- **Frontend**: Vercel, Netlify
- **Storage**: AWS S3

## API Endpoints (Summary)

### Public
- `GET /api/main/careers` — List published jobs
- `POST /api/main/apply/<job_id>` — Apply for job

### Collector (JWT Protected)
- `GET /api/main/collector-stats/<user_id>` — Personal quota & progress
- `POST /api/core/transcribe` — Upload audio for transcription

### Admin (JWT + Role)
- `POST /api/AdminCareers/admin/jobs` — Create job
- `GET /api/AdminCareers/admin/applications` — Review apps
- `POST /api/AdminCareers/admin/applications/<app_id>/approve` — Approve

## Contributing

1. Fork the repo.
2. Feature branch: `git checkout -b feature/my-feature`.
3. Commit: `git commit -m "Add feature"`.
4. Push: `git push origin feature-my-feature`.
5. Open PR.

## License

MIT License — See LICENSE file.

## Contact

- **Email**: support@semadata.com
- **Twitter**: [@SemaDataAI](https://twitter.com/semadata)
- **Slack**: [Community](https://semadata.slack.com) (Coming soon)

---

**Built with ❤️ in Kenya for Africa. — Feb 2026**




## Getting started

To make it easy for you to get started with GitLab, here's a list of recommended next steps.

Already a pro? Just edit this README.md and make it your own. Want to make it easy? [Use the template at the bottom](#editing-this-readme)!

## Add your files

* [Create](https://docs.gitlab.com/ee/user/project/repository/web_editor.html#create-a-file) or [upload](https://docs.gitlab.com/ee/user/project/repository/web_editor.html#upload-a-file) files
* [Add files using the command line](https://docs.gitlab.com/topics/git/add_files/#add-files-to-a-git-repository) or push an existing Git repository with the following command:

```
cd existing_repo
git remote add origin https://gitlab.com/nomangamy/semadata.git
git branch -M main
git push -uf origin main
```

## Integrate with your tools

* [Set up project integrations](https://gitlab.com/nomangamy/semadata/-/settings/integrations)

## Collaborate with your team

* [Invite team members and collaborators](https://docs.gitlab.com/ee/user/project/members/)
* [Create a new merge request](https://docs.gitlab.com/ee/user/project/merge_requests/creating_merge_requests.html)
* [Automatically close issues from merge requests](https://docs.gitlab.com/ee/user/project/issues/managing_issues.html#closing-issues-automatically)
* [Enable merge request approvals](https://docs.gitlab.com/ee/user/project/merge_requests/approvals/)
* [Set auto-merge](https://docs.gitlab.com/user/project/merge_requests/auto_merge/)

## Test and Deploy

Use the built-in continuous integration in GitLab.

* [Get started with GitLab CI/CD](https://docs.gitlab.com/ee/ci/quick_start/)
* [Analyze your code for known vulnerabilities with Static Application Security Testing (SAST)](https://docs.gitlab.com/ee/user/application_security/sast/)
* [Deploy to Kubernetes, Amazon EC2, or Amazon ECS using Auto Deploy](https://docs.gitlab.com/ee/topics/autodevops/requirements.html)
* [Use pull-based deployments for improved Kubernetes management](https://docs.gitlab.com/ee/user/clusters/agent/)
* [Set up protected environments](https://docs.gitlab.com/ee/ci/environments/protected_environments.html)

***

# Editing this README

When you're ready to make this README your own, just edit this file and use the handy template below (or feel free to structure it however you want - this is just a starting point!). Thanks to [makeareadme.com](https://www.makeareadme.com/) for this template.

## Suggestions for a good README

Every project is different, so consider which of these sections apply to yours. The sections used in the template are suggestions for most open source projects. Also keep in mind that while a README can be too long and detailed, too long is better than too short. If you think your README is too long, consider utilizing another form of documentation rather than cutting out information.

## Name
Choose a self-explaining name for your project.

## Description
Let people know what your project can do specifically. Provide context and add a link to any reference visitors might be unfamiliar with. A list of Features or a Background subsection can also be added here. If there are alternatives to your project, this is a good place to list differentiating factors.

## Badges
On some READMEs, you may see small images that convey metadata, such as whether or not all the tests are passing for the project. You can use Shields to add some to your README. Many services also have instructions for adding a badge.

## Visuals
Depending on what you are making, it can be a good idea to include screenshots or even a video (you'll frequently see GIFs rather than actual videos). Tools like ttygif can help, but check out Asciinema for a more sophisticated method.

## Installation
Within a particular ecosystem, there may be a common way of installing things, such as using Yarn, NuGet, or Homebrew. However, consider the possibility that whoever is reading your README is a novice and would like more guidance. Listing specific steps helps remove ambiguity and gets people to using your project as quickly as possible. If it only runs in a specific context like a particular programming language version or operating system or has dependencies that have to be installed manually, also add a Requirements subsection.

## Usage
Use examples liberally, and show the expected output if you can. It's helpful to have inline the smallest example of usage that you can demonstrate, while providing links to more sophisticated examples if they are too long to reasonably include in the README.

## Support
Tell people where they can go to for help. It can be any combination of an issue tracker, a chat room, an email address, etc.

## Roadmap
If you have ideas for releases in the future, it is a good idea to list them in the README.

## Contributing
State if you are open to contributions and what your requirements are for accepting them.

For people who want to make changes to your project, it's helpful to have some documentation on how to get started. Perhaps there is a script that they should run or some environment variables that they need to set. Make these steps explicit. These instructions could also be useful to your future self.

You can also document commands to lint the code or run tests. These steps help to ensure high code quality and reduce the likelihood that the changes inadvertently break something. Having instructions for running tests is especially helpful if it requires external setup, such as starting a Selenium server for testing in a browser.

## Authors and acknowledgment
Show your appreciation to those who have contributed to the project.

## License
For open source projects, say how it is licensed.

## Project status
If you have run out of energy or time for your project, put a note at the top of the README saying that development has slowed down or stopped completely. Someone may choose to fork your project or volunteer to step in as a maintainer or owner, allowing your project to keep going. You can also make an explicit request for maintainers.
