import React, { useState, useEffect } from 'react';
import { User, Mail, Lock, Eye, EyeOff, LogIn, UserPlus, Languages } from 'lucide-react';
import { LoginCredentials, RegisterData, validateEmail, validatePassword } from '../utils/auth';
import { sanitizeAndTrim } from '../utils/sanitize';
import { useTranslation } from '../hooks/useTranslation';
import { useLanguage } from '../contexts/LanguageContext';

interface AuthFormProps {
  onLogin: (credentials: LoginCredentials) => Promise<boolean>;
  onRegister: (data: RegisterData) => Promise<boolean>;
}

interface ValidationErrors {
  name?: string;
  email?: string;
  password?: string;
}

export const AuthForm: React.FC<AuthFormProps> = ({ onLogin, onRegister }) => {
  const { t, language } = useTranslation();
  const { setLanguage } = useLanguage();
  
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });

  const validateField = (field: string, value: string): string | undefined => {
    switch (field) {
      case 'name':
        if (!isLogin && !sanitizeAndTrim(value)) {
          return t('auth.nameRequired');
        }
        break;
      case 'email':
        if (!value.trim()) {
          return t('auth.emailRequired');
        }
        if (!validateEmail(value)) {
          return t('auth.emailInvalid');
        }
        break;
      case 'password':
        if (!value) {
          return t('auth.passwordRequired');
        }
        if (!validatePassword(value)) {
          return t('auth.passwordTooShort');
        }
        break;
    }
    return undefined;
  };

  // Re-validate all touched fields when language changes
  useEffect(() => {
    const touchedFieldNames = Object.keys(touchedFields).filter(key => touchedFields[key]);
    if (touchedFieldNames.length > 0) {
      const newErrors: ValidationErrors = {};
      touchedFieldNames.forEach(field => {
        newErrors[field as keyof ValidationErrors] = validateField(field, formData[field as keyof typeof formData]);
      });
      setValidationErrors(newErrors);
    }
  }, [language]); // Re-run when language changes

  const handleBlur = (field: string) => {
    setTouchedFields(prev => ({ ...prev, [field]: true }));
    const errorMessage = validateField(field, formData[field as keyof typeof formData]);
    setValidationErrors(prev => ({
      ...prev,
      [field]: errorMessage
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Mark all fields as touched
    setTouchedFields({
      name: true,
      email: true,
      password: true
    });

    // Validate all fields
    const errors: ValidationErrors = {};
    errors.email = validateField('email', formData.email);
    errors.password = validateField('password', formData.password);
    if (!isLogin) {
      errors.name = validateField('name', formData.name);
    }

    // Check if there are any validation errors
    const hasErrors = Object.values(errors).some(err => err !== undefined);
    if (hasErrors) {
      setValidationErrors(errors);
      return;
    }

    setIsLoading(true);

    // Sanitize inputs
    const sanitizedEmail = sanitizeAndTrim(formData.email);
    const sanitizedName = sanitizeAndTrim(formData.name);

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
    // Clear validation error for this field when user types
    if (touchedFields[field]) {
      const errorMessage = validateField(field, value);
      setValidationErrors(prev => ({
        ...prev,
        [field]: errorMessage
      }));
    }
  };

  const toggleLanguage = () => {
    setLanguage(language === 'lt' ? 'en' : 'lt');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 relative">
          {/* Language Switcher */}
          <button
            onClick={toggleLanguage}
            className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            type="button"
          >
            <Languages className="h-4 w-4" />
            <span className={language === 'lt' ? 'text-blue-600 font-semibold' : ''}>LT</span>
            <span className="text-gray-400">|</span>
            <span className={language === 'en' ? 'text-blue-600 font-semibold' : ''}>EN</span>
          </button>

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

          <form onSubmit={handleSubmit} noValidate className="space-y-6">
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
                    onBlur={() => handleBlur('name')}
                    className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                      touchedFields.name && validationErrors.name
                        ? 'border-red-500 focus:ring-red-500'
                        : 'border-gray-300'
                    }`}
                    placeholder={t('auth.namePlaceholder')}
                  />
                </div>
                {touchedFields.name && validationErrors.name && (
                  <p className="mt-1.5 text-sm text-red-600">{validationErrors.name}</p>
                )}
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
                  onBlur={() => handleBlur('email')}
                  className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                    touchedFields.email && validationErrors.email
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-gray-300'
                  }`}
                  placeholder={t('auth.emailPlaceholder')}
                />
              </div>
              {touchedFields.email && validationErrors.email && (
                <p className="mt-1.5 text-sm text-red-600">{validationErrors.email}</p>
              )}
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
                  onBlur={() => handleBlur('password')}
                  className={`w-full pl-10 pr-12 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                    touchedFields.password && validationErrors.password
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-gray-300'
                  }`}
                  placeholder={t('auth.passwordPlaceholder')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {touchedFields.password && validationErrors.password && (
                <p className="mt-1.5 text-sm text-red-600">{validationErrors.password}</p>
              )}
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
                setValidationErrors({});
                setTouchedFields({});
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