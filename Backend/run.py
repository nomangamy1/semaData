from flask import Flask 

semaData = Flask(__name__)
@semaData.route('/')
def semaData():
    return "SemaData platform"


if __name__ == '__main__':
    semaData.run(debug=True)
    