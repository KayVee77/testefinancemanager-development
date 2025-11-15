import React, { useState } from 'react';
import { User, Mail, Lock, Eye, EyeOff, LogIn, UserPlus } from 'lucide-react';
import { LoginCredentials, RegisterData, validateEmail, validatePassword } from '../utils/auth';
import { sanitizeAndTrim } from '../utils/sanitize';
import { useTranslation } from '../hooks/useTranslation';

interface AuthFormProps {
  onLogin: (credentials: LoginCredentials) => Promise<boolean>;
  onRegister: (data: RegisterData) => Promise<boolean>;
}

export const AuthForm: React.FC<AuthFormProps> = ({ onLogin, onRegister }) => {
  const { t } = useTranslation();
  
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Sanitize inputs
    const sanitizedEmail = sanitizeAndTrim(formData.email);
    const sanitizedName = sanitizeAndTrim(formData.name);

    // Validation
    if (!validateEmail(sanitizedEmail)) {
      setError(t('auth.invalidEmail'));
      setIsLoading(false);
      return;
    }

    if (!validatePassword(formData.password)) {
      setError(t('auth.invalidPassword'));
      setIsLoading(false);
      return;
    }

    if (!isLogin && !sanitizedName) {
      setError(t('auth.nameRequired'));
      setIsLoading(false);
      return;
    }

    try {
      let success = false;
      
      if (isLogin) {
        success = await onLogin({
          email: sanitizedEmail,
          password: formData.password
        });
        if (!success) {
          setError(t('auth.loginError'));
        }
      } else {
        success = await onRegister({
          name: sanitizedName,
          email: sanitizedEmail,
          password: formData.password
        });
        if (!success) {
          setError(t('auth.registerError'));
        }
      }
    } catch (err) {
      setError(t('auth.genericError'));
    }

    setIsLoading(false);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <User className="h-8 w-8 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {isLogin ? t('auth.login') : t('auth.register')}
            </h1>
            <p className="text-gray-600">
              {isLogin ? t('auth.loginTitle') : t('auth.registerTitle')}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('auth.name')}
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder={t('auth.namePlaceholder')}
                    required={!isLogin}
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('auth.email')}
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder={t('auth.emailPlaceholder')}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('auth.password')}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder={t('auth.passwordPlaceholder')}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  {isLogin ? <LogIn className="h-5 w-5 mr-2" /> : <UserPlus className="h-5 w-5 mr-2" />}
                  {isLogin ? t('auth.loginButton') : t('auth.registerButton')}
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
                setFormData({ name: '', email: '', password: '' });
              }}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors"
            >
              {isLogin ? t('auth.noAccount') : t('auth.hasAccount')}
            </button>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            {t('auth.privacyNotice')}
          </p>
        </div>
      </div>
    </div>
  );
};