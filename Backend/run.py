import os
from semaData import semaData_app

app = semaData_app()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8000))
    app.run(host='0.0.0.0', port=port, debug=app.config.get('DEBUG', True))
    