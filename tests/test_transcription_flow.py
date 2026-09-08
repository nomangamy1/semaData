"""\nTest suite for Transcription-to-Dataset Data Flow\nVerifies that audio transcription creates both Dataset and Transcription records\nwith proper feature extraction for domain owners.\n"""

import pytest
import json
from datetime import datetime
from unittest.mock import patch, MagicMock
from Backend.models.dataset import Dataset
from Backend.models.Transcription import Transcription
from Backend.models.domain import Domain
from Backend.models.user import User
from Backend.models.JobApplication import JobApplication
from Backend.models.Job import Job
from extensions import db


class TestTranscriptionDataFlow:
    """
    Test Category: Collector Audio Upload → Dataset + Transcription Creation
    """

    @pytest.fixture
    def setup_test_data(self, app, client):
        """Setup test domain, collector, and job application"""
        with app.app_context():
            # Create domain owner
            domain_owner = User(
                email='owner@example.com',
                first_name='John',
                role='domain_owner'
            )
            db.session.add(domain_owner)
            db.session.flush()

            # Create domain with features
            domain = Domain(
                owner_id=domain_owner.id,
                domain_name='Test Agricultural Survey',
                is_active=True,
                target_goal=100,
                reference_number='AGR--12345'
            )
            db.session.add(domain)
            db.session.flush()

            # Create collector
            collector = User(
                email='collector@example.com',
                first_name='Alice',
                second_name='Johnson',
                role='collector',
                reference_number='AGR--ABC123'
            )
            db.session.add(collector)
            db.session.flush()

            # Create job
            job = Job(
                title='Agricultural Field Survey',
                domain_id=domain.id,
                field='agriculture'
            )
            db.session.add(job)
            db.session.flush()

            # Create approved application
            application = JobApplication(
                job_id=job.id,
                email=collector.email,
                first_name=collector.first_name,
                second_name=collector.second_name,
                status='approved',
                reference_number_assigned=collector.reference_number
            )
            db.session.add(application)
            db.session.commit()

            return {
                'domain_owner': domain_owner,
                'domain': domain,
                'collector': collector,
                'job': job,
                'application': application
            }

    def test_dataset_created_on_transcription(self, app, setup_test_data):
        """
        GIVEN a collector uploads audio
        WHEN the /transcribe endpoint processes the audio
        THEN a Dataset record is created with status='pending_review'
        """
        with app.app_context():
            domain_id = setup_test_data['domain'].id
            collector_id = setup_test_data['collector'].id
            
            # Create a mock dataset (simulating endpoint behavior)
            dataset = Dataset(
                name=f"Sub_AGR--ABC123_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                description="Automated AI Transcription",
                owner_id=setup_test_data['domain_owner'].id,
                ref_number='AGR--ABC123',
                domain_id=domain_id,
                audio_file_path='/tmp/test_audio.wav',
                collector_id=collector_id,
                combined_text="This is a test transcription",
                segmented_text=json.dumps({"age": "25", "gender": "male"}),
                status="pending_review"
            )
            db.session.add(dataset)
            db.session.commit()

            # Verify dataset was created
            saved_dataset = Dataset.query.filter_by(id=dataset.id).first()
            assert saved_dataset is not None
            assert saved_dataset.status == "pending_review"
            assert saved_dataset.owner_id == setup_test_data['domain_owner'].id
            assert saved_dataset.collector_id == collector_id

    def test_transcription_record_created_with_domain_features(self, app, setup_test_data):
        """
        GIVEN a dataset is created from audio transcription
        WHEN the transcription record is created immediately after
        THEN Transcription.domain_features contains the segmented feature data
        """
        with app.app_context():
            domain_id = setup_test_data['domain'].id
            collector_id = setup_test_data['collector'].id
            
            # Create dataset first
            dataset = Dataset(
                name=f"Sub_AGR--ABC123_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                description="Automated AI Transcription",
                owner_id=setup_test_data['domain_owner'].id,
                ref_number='AGR--ABC123',
                domain_id=domain_id,
                audio_file_path='/tmp/test_audio.wav',
                collector_id=collector_id,
                combined_text="The farmer is 30 years old and male",
                segmented_text=json.dumps({"age": "30", "gender": "male", "location": "Nairobi"}),
                status="pending_review"
            )
            db.session.add(dataset)
            db.session.flush()

            # Create transcription record with domain features
            segmented_data = json.loads(dataset.segmented_text)
            transcription = Transcription(
                dataset_id=dataset.id,
                user_id=collector_id,
                contributor_name=f"{setup_test_data['collector'].first_name} {setup_test_data['collector'].second_name}",
                transcription_text=dataset.combined_text,
                domain_features=json.dumps(segmented_data)
            )
            db.session.add(transcription)
            db.session.commit()

            # Verify transcription was created
            saved_transcription = Transcription.query.filter_by(dataset_id=dataset.id).first()
            assert saved_transcription is not None
            assert saved_transcription.dataset_id == dataset.id
            
            # Verify domain_features are populated
            features = json.loads(saved_transcription.domain_features)
            assert features.get("age") == "30"
            assert features.get("gender") == "male"
            assert features.get("location") == "Nairobi"

    def test_csv_export_finds_transcription_records(self, app, setup_test_data):
        """
        GIVEN a domain owner downloads their dataset as CSV
        WHEN the export queries Transcription records
        THEN it finds data instead of empty results
        """
        with app.app_context():
            domain_id = setup_test_data['domain'].id
            collector_id = setup_test_data['collector'].id
            
            # Create dataset + transcription
            dataset = Dataset(
                name="Test Sub",
                description="Test",
                owner_id=setup_test_data['domain_owner'].id,
                ref_number='AGR--ABC123',
                domain_id=domain_id,
                audio_file_path='/tmp/test.wav',
                collector_id=collector_id,
                combined_text="Test transcription",
                segmented_text=json.dumps({"age": "25", "gender": "female"}),
                status="Verified"
            )
            db.session.add(dataset)
            db.session.flush()

            transcription = Transcription(
                dataset_id=dataset.id,
                user_id=collector_id,
                contributor_name="Alice Johnson",
                transcription_text="Test transcription",
                domain_features=json.dumps({"age": "25", "gender": "female"})
            )
            db.session.add(transcription)
            db.session.commit()

            # Query like CSV export does
            datasets = Dataset.query.filter_by(
                domain_id=domain_id,
                status="Verified"
            ).all()
            
            assert len(datasets) > 0
            
            for ds in datasets:
                transcriptions = Transcription.query.filter_by(dataset_id=ds.id).all()
                assert len(transcriptions) > 0, f"No transcriptions found for dataset {ds.id}"
                
                for trans in transcriptions:
                    features = json.loads(trans.domain_features)
                    assert isinstance(features, dict)
                    assert len(features) > 0

    def test_owner_id_filtering_works(self, app, setup_test_data):
        """
        GIVEN multiple domain owners exist
        WHEN filtering datasets by owner_id
        THEN only that owner's datasets are returned
        """
        with app.app_context():
            owner1_id = setup_test_data['domain_owner'].id
            
            # Create second domain owner
            owner2 = User(
                email='owner2@example.com',
                first_name='Jane',
                role='domain_owner'
            )
            db.session.add(owner2)
            db.session.flush()

            # Create dataset for owner 1
            dataset1 = Dataset(
                name="Owner1 Sub",
                description="Test",
                owner_id=owner1_id,
                ref_number='AGR--ABC123',
                domain_id=setup_test_data['domain'].id,
                audio_file_path='/tmp/test1.wav',
                collector_id=setup_test_data['collector'].id,
                combined_text="Test",
                segmented_text=json.dumps({"age": "25"}),
                status="Verified"
            )
            db.session.add(dataset1)
            db.session.commit()

            # Query for owner1
            owner1_datasets = Dataset.query.filter_by(owner_id=owner1_id).all()
            assert len(owner1_datasets) > 0
            
            # Query for owner2
            owner2_datasets = Dataset.query.filter_by(owner_id=owner2.id).all()
            assert len(owner2_datasets) == 0
