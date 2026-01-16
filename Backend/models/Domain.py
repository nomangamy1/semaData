from extensions import db 

class Domain(db.model):
    id = db.Column(db.Integer,primary_key = True,index =True,unique = True)
    domain_Name = db.Column(db.String(128),index =True)
    #I kind of wander if domain features should be added here since every domain owner
    #will define his/her features  
    