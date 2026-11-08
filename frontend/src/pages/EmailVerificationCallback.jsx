import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const EmailVerificationCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1));
    const token = params.get('token');
    const role = params.get('role');
    const ownerId = params.get('ownerId');

    if (!token || role !== 'domainowner') {
      navigate('/login?verified=true&next=/DomainDefinition', { replace: true });
      return;
    }

    localStorage.clear();
    localStorage.setItem('token', token);
    localStorage.setItem('userRole', role);
    if (ownerId) localStorage.setItem('ownerId', ownerId);

    navigate('/DomainDefinition', { replace: true });
  }, [navigate]);

  return <p role="status">Email verified. Opening domain setup...</p>;
};

export default EmailVerificationCallback;
