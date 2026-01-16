from extensions import db
import UserMixin 
class User(db.model,UserMixin):
    __tablename = 'Users'

    id = db.Column(db.Integer,primary_key = True)
    first_name = db.Column(db.String(64),unique =False,index =True)
    second_name = db.Column(db.String(64),unique =False,index =True)
    email = db.Column(db.String(30),unique =True,index =True)
    fieldName =db.Column(db.String(64))
    ReferenceNumber =db.Column(db.string(64),unique =True)
    password_hash = db.Column(db.String(128))
