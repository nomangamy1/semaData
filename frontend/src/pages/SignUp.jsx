import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Briefcase, ArrowRight, CheckCircle2 } from 'lucide-react';

const Signup = () => {
  const navigate = useNavigate();
  const [role, setRole] = useState('User'); // 'User' (Collector) or 'DomainOwner'
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '', // Maps to last_name for Owner, second_name for Collector
    email: '',
    username: '', 
    password: '',
    reference_number: '',
    domain_name: '',
    field_name: 'Health',
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };
  const handleSubmit = async (e) => {
  e.preventDefault();

  // Prepare the payload to match your Flask backend exactly
  const payload = {
    role: role, // 'User' or 'DomainOwner'
    first_name: formData.first_name,
    // Match backend: Owner uses last_name, Collector uses second_name
    [role === 'DomainOwner' ? 'last_name' : 'second_name']: formData.last_name,
    email: formData.email,
    password: formData.password,
    // Role-specific fields
    ...(role === 'DomainOwner' 
        ? { username: formData.username, domain_field: formData.field_name } 
        : { reference_number: formData.reference_number, domain_name: formData.domain_name }
    )
  };

  try {
    const response = await fetch('http://localhost:8000/api/Auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (response.ok) {
      alert("Registration Successful! Please check your email for verification.");
      navigate('/login'); // Take them to login
    } else {
      alert(`Error: ${data.error}`);
    }
  } catch (error) {
    console.error("Signup Error:", error);
    alert("Server is down. Please try again later.");
  }
};

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="text-center text-4xl font-black text-gray-900 tracking-tight">
          Join <span className="text-[#489c8c]">semaData</span>
        </h2>
        <p className="mt-2 text-center text-gray-600">
          The bridge between local insights and global standards.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="bg-white py-10 px-6 shadow-2xl rounded-[40px] border border-gray-100 sm:px-12">
          
          {/* --- ROLE SELECTOR --- */}
          <div className="flex p-1 bg-gray-100 rounded-2xl mb-8">
            <button
              onClick={() => setRole('User')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all ${
                role === 'User' ? 'bg-[#489c8c] text-white shadow-md' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <User size={18} /> Data Collector
            </button>
            <button
              onClick={() => setRole('DomainOwner')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all ${
                role === 'DomainOwner' ? 'bg-[#489c8c] text-white shadow-md' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Briefcase size={18} /> Domain Owner
            </button>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">First Name</label>
                <input
                  name="first_name"
                  type="text"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#489c8c] focus:border-transparent outline-none transition"
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  {role === 'DomainOwner' ? 'Last Name' : 'Second Name'}
                </label>
                <input
                  name="last_name"
                  type="text"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#489c8c] focus:border-transparent outline-none transition"
                  onChange={handleChange}
                />
              </div>
            </div>

            {role === 'DomainOwner' && (
              <div className="animate-in fade-in duration-500">
                <label className="block text-sm font-bold text-gray-700 mb-1">Username</label>
                <input
                  name="username"
                  type="text"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#489c8c] outline-none"
                  onChange={handleChange}
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Email Address</label>
              <input
                name="email"
                type="email"
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#489c8c] outline-none"
                onChange={handleChange}
              />
            </div>

            {/* --- DYNAMIC FIELDS BASED ON ROLE --- */}
            {role === 'User' ? (
              <div className="space-y-5 animate-in slide-in-from-left-4 duration-300">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Invite Reference Number</label>
                  <input
                    name="reference_number"
                    placeholder="e.g. 100234"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#489c8c] outline-none"
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Domain Name</label>
                  <input
                    name="domain_name"
                    placeholder="The name of the clinic or project"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#489c8c] outline-none"
                    onChange={handleChange}
                  />
                </div>
              </div>
            ) : (
              <div className="animate-in slide-in-from-right-4 duration-300">
                <label className="block text-sm font-bold text-gray-700 mb-1">Domain Category</label>
                <select
                  name="field_name"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#489c8c] outline-none bg-white"
                  onChange={handleChange}
                >
                  <option value="Health">Health / Medical</option>
                  <option value="Agriculture">Agriculture</option>
                  <option value="Linguistics">Linguistics</option>
                  <option value="Research">Research</option>
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Password</label>
              <input
                name="password"
                type="password"
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#489c8c] outline-none"
                onChange={handleChange}
              />
            </div>

            <button
              type="submit"
              className="w-full flex justify-center items-center gap-2 py-4 px-4 border border-transparent rounded-2xl shadow-lg text-lg font-bold text-white bg-[#489c8c] hover:bg-[#367a6d] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#489c8c] transition-all transform hover:scale-[1.02]"
            >
              Create {role === 'DomainOwner' ? 'Admin' : 'Collector'} Account <ArrowRight size={20} />
            </button>
          </form>

          <div className="mt-6">
            <p className="text-center text-sm text-gray-600">
              Already a member?{' '}
              <Link to="/login" className="font-bold text-[#489c8c] hover:text-[#367a6d]">
                Log in here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;