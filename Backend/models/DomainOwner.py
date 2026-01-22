from extensions import db 

class DomainOwner():
    __tablename__ = 'DomainOwner'
    id = db.column(db.Integer,primary_key=True)
    first_Name =db.column(db.String(64),index=True)
    last_Name = db.Column(db.String(64),index =True)
    username = db.Column(db.String(36,unique=True))
    email = db.column(db.string(64),unique=True)
    DomainField= db.Column(db.string(128),index = True,default = 'Health')
    referenceNumber = db.Column(db.Integer,unique =True)
    hash_password =db.Column(db.String(128))