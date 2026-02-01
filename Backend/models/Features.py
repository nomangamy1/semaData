from extensions import db
class Feature(db.Model):
    __tablename__ = 'domain_features'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False) # e.g., "Crop Type"
    domain_id = db.Column(db.Integer, db.ForeignKey('domain.id'), nullable=False)