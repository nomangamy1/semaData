from extensions import db 
from flask_login import UserMaxin 
class Domain(db.model,UserMaxin):
    __tablename__ = 'Domain'
    id = db.Column(db.Integer,primary_key = True,index =True,unique = True)
    domain_name = db.Column(db.String(128),index =True)
    reference_number =db.Column(db.Integer,Unique =True)
    domain_features = db.Column(db.Text)
    owner_id =db.Column(db.Integer,db.ForeginKey('user.id'))
    #I kind of wander if domain features should be added here since every domain owner
    #will define his/her features  
    