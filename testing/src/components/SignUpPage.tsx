import React, { useState } from 'react';
import { Calendar as CalendarIcon, Lock, Mail, User as UserIcon, ArrowLeft } from 'lucide-react';
import { supabase } from '../services/supabase';
import { sendEmail, sendWelcomeEmail } from '../services/emailService';
import { User } from '../types';

interface SignUpPageProps {
  onSignUp: (user: User) => void;
  onNavigateToLogin: () => void;
}

export function SignUpPage({ onSignUp, onNavigateToLogin }: SignUpPageProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'student' | 'organizer'>('student');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Basic validation
    if (!email || !password || !name) {
       setError("Please fill in all fields.");
       setIsLoading(false);
       return;
    }

    try {
       // Generate a random 6-digit code
       const code = Math.floor(100000 + Math.random() * 900000).toString();
       setGeneratedCode(code);

       // Send verification email
       await sendEmail(
         email,
         'Verify your email',
         code,
         name,
         'code'
       );
       
       setIsVerifying(true);
       setError('');
    } catch (err: any) {
       console.error(err);
       setError('Failed to send verification code. Please make sure the backend server is running.');
    } finally {
        setIsLoading(false);
    }
  };

  const handleVerifyAndSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (verificationCode !== generatedCode) {
        setError("Invalid verification code. Please try again.");
        setIsLoading(false);
        return;
    }

    try {
      // NOTE: We have updated the database trigger to handle profile creation automatically.
      // However, we keep a manual fallback just in case the trigger fails or is delayed.

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            role: role,
            name: name // Included for robustness
          }
        }
      });

      if (error) throw error;

      // Manually create profile as a fallback
      if (data.user) {
         try {
            // Check if profile exists first to avoid conflict if trigger worked
            const { data: existingProfile } = await supabase
              .from('profiles')
              .select('id')
              .eq('id', data.user.id)
              .single();

            if (!existingProfile) {
                const { error: profileError } = await supabase.from('profiles').insert({
                     id: data.user.id,
                     full_name: name,
                     role: role,
                     username: email
                 });
                if (profileError) console.error("Manual profile creation fallback failed:", profileError);
            }
         } catch(e) {
             console.error("Profile creation exception", e);
         }

         // Send Welcome Email
         const newUser: User = {
            id: data.user.id,
            name: name,
            email: email,
            role: role
         };
         await sendWelcomeEmail(newUser).catch(err => console.error("Welcome email failed", err));

         // Auto login after signup
         onSignUp({
            id: data.user.id,
            name: name,
            email: email,
            role: role
         });
      }
    } catch (err: any) {
      if (err.message?.includes("rate limit")) {
         setError("Supabase email rate limit exceeded. Please disable 'Confirm Email' in your Supabase Dashboard > Auth > Providers > Email, or try again later.");
      } else {
         setError(err.message || 'Failed to sign up');
      }
    } finally {
      setIsLoading(false);
    }
  };
   
  if (isVerifying) {
      return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center text-blue-600">
          <CalendarIcon size={48} />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Verify your email
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          We sent a code to {email}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-gray-100">
          <form className="space-y-6" onSubmit={handleVerifyAndSignUp}>
            <div>
              <label htmlFor="code" className="block text-sm font-medium text-gray-700">
                Verification Code
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="code"
                  name="code"
                  type="text"
                  required
                  className="appearance-none block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="123456"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                />
              </div>
            </div>

             {error && (
              <div className="text-red-600 text-sm text-center bg-red-50 p-2 rounded-md border border-red-100">
                {error}
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
              >
                {isLoading ? 'Verifying...' : 'Verify & Create Account'}
              </button>
            </div>
             <div className="mt-4 text-center">
                <button
                    type="button"
                    onClick={() => { setIsVerifying(false); setVerificationCode(''); }}
                    className="text-sm text-blue-600 hover:text-blue-500"
                >
                    Back to edit details
                </button>
            </div>
          </form>
        </div>
      </div>
    </div>
      );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center text-blue-600">
          <CalendarIcon size={48} />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Create your account
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Join the Student Event Organiser
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-gray-100">
          <form className="space-y-6" onSubmit={handleSendCode}>
            {/* Role Selection */}
             <div className="flex rounded-md shadow-sm mb-4" role="group">
              <button
                type="button"
                onClick={() => setRole('student')}
                className={`flex-1 px-4 py-2 text-sm font-medium border text-center rounded-l-lg focus:z-10 focus:ring-2 focus:ring-blue-500 transition-colors ${role === 'student' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
              >
                Student
              </button>
              <button
                type="button"
                onClick={() => setRole('organizer')}
                className={`flex-1 px-4 py-2 text-sm font-medium border-t border-b border-r text-center rounded-r-lg focus:z-10 focus:ring-2 focus:ring-blue-500 transition-colors ${role === 'organizer' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
              >
                Event Organizer
              </button>
            </div>

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                {role === 'organizer' ? 'Organization Name' : 'Full Name'}
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <UserIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  className="appearance-none block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                I am a...
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole('student')}
                  className={`flex items-center justify-center px-4 py-2 border rounded-md text-sm font-medium transition-colors ${
                    role === 'student'
                      ? 'border-blue-500 text-blue-700 bg-blue-50 ring-1 ring-blue-500'
                      : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                  }`}
                >
                  Student
                </button>
                <button
                  type="button"
                  onClick={() => setRole('organizer')}
                  className={`flex items-center justify-center px-4 py-2 border rounded-md text-sm font-medium transition-colors ${
                    role === 'organizer'
                      ? 'border-blue-500 text-blue-700 bg-blue-50 ring-1 ring-blue-500'
                      : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                  }`}
                >
                  Event Organizer
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="appearance-none block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="student@university.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  className="appearance-none block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <div className="text-red-600 text-sm text-center bg-red-50 p-2 rounded-md border border-red-100">
                {error}
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-wait transition-colors"
              >
                {isLoading ? 'Sending Code...' : 'Next'}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">
                  Already have an account?
                </span>
              </div>
            </div>

            <div className="mt-6 flex justify-center">
              <button
                onClick={onNavigateToLogin}
                className="text-sm font-medium text-blue-600 hover:text-blue-500 flex items-center"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Sign in
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
