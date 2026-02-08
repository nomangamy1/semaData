import React from 'react';
import { Users, UserPlus, Mail, Shield, MoreVertical, Star } from 'lucide-react';

const TeamCollectors = () => {
  // Mock data for team members
  const teamMembers = [
    { id: 1, name: "Sarah Wambui", email: "sarah.w@semadata.org", role: "Field Lead", submissions: 142, accuracy: "98.5%", status: "Active" },
    { id: 2, name: "David Kipkorir", email: "david.k@semadata.org", role: "Data Collector", submissions: 89, accuracy: "94.2%", status: "Active" },
    { id: 3, name: "Amara Okechi", email: "amara.o@semadata.org", role: "Researcher", submissions: 215, accuracy: "99.1%", status: "On Leave" },
    { id: 4, name: "Kevin Mutua", email: "kevin.m@semadata.org", role: "Data Collector", submissions: 45, accuracy: "92.0%", status: "Active" },
  ];

  return (
    <div className="team-view animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* --- HEADER & INVITE --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900">Research Team</h2>
          <p className="text-slate-500 font-medium">Manage permissions and monitor collector performance.</p>
        </div>
        <button className="bg-[#489c8c] hover:bg-[#3d8577] text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 transition shadow-lg shadow-emerald-900/10">
          <UserPlus size={20} /> Invite New Member
        </button>
      </div>

      {/* --- QUICK STATS --- */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Active Collectors", val: "12", icon: <Users size={16}/> },
          { label: "Top Performer", val: "Amara O.", icon: <Star size={16}/> },
          { label: "Avg. Accuracy", val: "96.4%", icon: <Shield size={16}/> },
          { label: "Invites Sent", val: "3", icon: <Mail size={16}/> }
        ].map((s, i) => (
          <div key={i} className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center gap-4">
            <div className="p-2 bg-slate-50 text-[#489c8c] rounded-lg">{s.icon}</div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{s.label}</p>
              <p className="text-sm font-bold text-slate-800">{s.val}</p>
            </div>
          </div>
        ))}
      </div>

      {/* --- TEAM TABLE --- */}
      <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50">
              <th className="p-6 text-xs font-black text-slate-400 uppercase tracking-widest">Team Member</th>
              <th className="p-6 text-xs font-black text-slate-400 uppercase tracking-widest">Role</th>
              <th className="p-6 text-xs font-black text-slate-400 uppercase tracking-widest text-center">Submissions</th>
              <th className="p-6 text-xs font-black text-slate-400 uppercase tracking-widest">AI Accuracy</th>
              <th className="p-6 text-xs font-black text-slate-400 uppercase tracking-widest">Status</th>
              <th className="p-6"></th>
            </tr>
          </thead>
          <tbody>
            {teamMembers.map((member) => (
              <tr key={member.id} className="border-t border-slate-50 hover:bg-slate-50/30 transition-colors group">
                <td className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center font-bold text-[#489c8c]">
                      {member.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">{member.name}</p>
                      <p className="text-xs text-slate-400">{member.email}</p>
                    </div>
                  </div>
                </td>
                <td className="p-6">
                  <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-lg">{member.role}</span>
                </td>
                <td className="p-6 text-center font-mono text-sm font-bold text-slate-700">
                  {member.submissions}
                </td>
                <td className="p-6">
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-[#489c8c]" 
                        style={{ width: member.accuracy }}
                      ></div>
                    </div>
                    <span className="text-xs font-bold text-[#489c8c]">{member.accuracy}</span>
                  </div>
                </td>
                <td className="p-6">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${member.status === 'Active' ? 'bg-green-500' : 'bg-slate-300'}`}></span>
                    <span className="text-xs font-bold text-slate-600">{member.status}</span>
                  </div>
                </td>
                <td className="p-6 text-right">
                  <button className="p-2 text-slate-300 hover:text-slate-600 transition">
                    <MoreVertical size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TeamCollectors;