from backend.database import db

class SpeciesOccurrence(db.Model):
    __tablename__ = 'occurrences'

    id = db.Column(db.Integer, primary_key=True)
    species_name = db.Column(db.String(100), nullable=False)
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    year = db.Column(db.Integer, nullable=False)
