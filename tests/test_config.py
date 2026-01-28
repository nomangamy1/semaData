def test_testing_config(semaData_app):
    """Ensure the app is correctly set to TESTING mode"""
    assert semaData_app.config['TESTING'] is True

def test_homepage_status(client):
    """Check if the server is alive"""
    response = client.get('/')
    assert response.status_code == 200