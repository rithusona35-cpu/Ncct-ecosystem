'use client';

import React, { useState } from 'react';
import { TraineeProfile } from '../lib/types';
import { authApi } from '../lib/api';
import {
  Building2,
  GraduationCap,
  BookOpen,
  Languages,
  Phone,
  MapPin,
  Tag,
  Plus,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  User as UserIcon,
  Sparkles
} from 'lucide-react';

interface TraineeProfileFormProps {
  initialProfile?: TraineeProfile | null;
  userName?: string;
  onProfileSaved: (profile: TraineeProfile) => void;
  onCancel?: () => void;
}

const COMMON_SKILLS = [
  'Cooperative Law',
  'Financial Accounting',
  'Microfinance',
  'Credit Appraisal',
  'MS Excel & Analytics',
  'Agribusiness',
  'Python',
  'Banking Compliance',
  'Dairy Management',
];

const COMMON_INSTITUTIONS = [
  'Vaikunth Mehta National Institute of Cooperative Management (VAMNICOM), Pune',
  'National Institute of Cooperative Management (NICM), Gandhinagar',
  'Regional Institute of Cooperative Management (RICM), Bengaluru',
  'Regional Institute of Cooperative Management (RICM), Chandigarh',
  'Regional Institute of Cooperative Management (RICM), Patna',
  'Institute of Cooperative Management (ICM), Bhopal',
  'Institute of Cooperative Management (ICM), Chennai',
];

export default function TraineeProfileForm({
  initialProfile,
  userName = '',
  onProfileSaved,
  onCancel,
}: TraineeProfileFormProps) {
  const [name, setName] = useState(initialProfile?.name || userName);
  const [institution, setInstitution] = useState(initialProfile?.institution || '');
  const [courseEnrolled, setCourseEnrolled] = useState(initialProfile?.course_enrolled || '');
  const [education, setEducation] = useState(initialProfile?.education || '');
  const [preferredLanguage, setPreferredLanguage] = useState(initialProfile?.preferred_language || 'English');
  const [phone, setPhone] = useState(initialProfile?.phone || '');
  const [address, setAddress] = useState(initialProfile?.address || '');

  // Skills tags
  const [skills, setSkills] = useState<string[]>(initialProfile?.previous_skills || []);
  const [skillInput, setSkillInput] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddSkill = (skillToAdd?: string) => {
    const s = (skillToAdd || skillInput).trim();
    if (!s) return;
    if (!skills.includes(s)) {
      setSkills([...skills, s]);
    }
    setSkillInput('');
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills(skills.filter((s) => s !== skillToRemove));
  };

  const handleKeyDownSkill = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddSkill();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!institution.trim() || !courseEnrolled.trim()) {
      setError('Institution and Course Enrolled are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const saved = await authApi.saveProfile({
        name,
        institution,
        course_enrolled: courseEnrolled,
        education,
        preferred_language: preferredLanguage,
        previous_skills: skills,
        phone,
        address,
      });
      onProfileSaved(saved);
    } catch (err: any) {
      setError(err.message || 'Failed to save profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Basic & Academic Information */}
      <div className="space-y-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <GraduationCap className="w-4 h-4 text-emerald-600" />
          Academic &amp; Institutional Details
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">Full Name</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <UserIcon className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all text-slate-900"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">Highest Education</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <BookOpen className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={education}
                onChange={(e) => setEducation(e.target.value)}
                placeholder="e.g. B.Com (Hons), B.Sc, MBA"
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all text-slate-900"
              />
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700">
            NCCT Institution / Training Center <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Building2 className="w-4 h-4" />
            </div>
            <input
              type="text"
              required
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
              list="institutions-list"
              placeholder="e.g. Vaikunth Mehta National Institute (VAMNICOM), Pune"
              className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all text-slate-900"
            />
            <datalist id="institutions-list">
              {COMMON_INSTITUTIONS.map((inst, idx) => (
                <option key={idx} value={inst} />
              ))}
            </datalist>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Course Enrolled <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <BookOpen className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                value={courseEnrolled}
                onChange={(e) => setCourseEnrolled(e.target.value)}
                placeholder="e.g. PG Diploma in Cooperative Management"
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all text-slate-900"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">Preferred Language</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Languages className="w-4 h-4" />
              </div>
              <select
                value={preferredLanguage}
                onChange={(e) => setPreferredLanguage(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all text-slate-900"
              >
                <option value="English">English</option>
                <option value="Hindi">Hindi (हिंदी)</option>
                <option value="English / Hindi">Bilingual (English / Hindi)</option>
                <option value="Tamil">Tamil (தமிழ்)</option>
                <option value="Telugu">Telugu (తెలుగు)</option>
                <option value="Gujarati">Gujarati (ગુજરાતી)</option>
                <option value="Marathi">Marathi (मराठी)</option>
                <option value="Bengali">Bengali (বাংলা)</option>
                <option value="Kannada">Kannada (ಕನ್ನಡ)</option>
                <option value="Malayalam">Malayalam (മലയാളം)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Skills Tags Section */}
      <div className="space-y-3 pt-2 border-t border-slate-100">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Tag className="w-4 h-4 text-emerald-600" />
            Previous Skills &amp; Competencies
          </label>
          <span className="text-[11px] text-slate-400">Press Enter or click + to add</span>
        </div>

        {/* Input for new tag */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={handleKeyDownSkill}
              placeholder="e.g. Financial Auditing, Python, Dairy Supply Chain..."
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all text-slate-900"
            />
          </div>
          <button
            type="button"
            onClick={() => handleAddSkill()}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Tag
          </button>
        </div>

        {/* Selected skills pills */}
        <div className="flex flex-wrap gap-2 min-h-8">
          {skills.length === 0 ? (
            <div className="text-xs text-slate-400 italic py-1">
              No skills added yet. Select suggestions below or type your own.
            </div>
          ) : (
            skills.map((skill) => (
              <span
                key={skill}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium animate-fadeIn"
              >
                <span>{skill}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveSkill(skill)}
                  className="w-4 h-4 rounded-full hover:bg-emerald-200 text-emerald-600 flex items-center justify-center cursor-pointer transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))
          )}
        </div>

        {/* Common skill suggestions */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-400">
            <Sparkles className="w-3 h-3 text-amber-500" />
            <span>Popular Suggestions:</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {COMMON_SKILLS.filter((s) => !skills.includes(s)).map((skill) => (
              <button
                type="button"
                key={skill}
                onClick={() => handleAddSkill(skill)}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-emerald-100 text-slate-600 hover:text-emerald-800 transition-colors border border-slate-200/60"
              >
                + {skill}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Contact Details */}
      <div className="space-y-4 pt-2 border-t border-slate-100">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <Phone className="w-4 h-4 text-emerald-600" />
          Contact &amp; Residence Details
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">Phone Number</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Phone className="w-4 h-4" />
              </div>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all text-slate-900"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">Address / City</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <MapPin className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. Pune, Maharashtra"
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all text-slate-900"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold transition-colors cursor-pointer"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-200 hover:shadow-emerald-300 transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Saving Profile...</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4" />
              <span>{initialProfile ? 'Update Profile' : 'Save & Generate Trainee ID'}</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
