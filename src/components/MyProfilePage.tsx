import React, { useState } from 'react';
import { Building2, Check, KeyRound, Mail, Phone, UserCircle2 } from 'lucide-react';
import { AuthSession, ScreenId } from '../types';
import {
  CharacterCounter,
  FieldError,
  HorizonPage,
  HorizonPageContent,
  HorizonPageTitle,
  HorizonToast,
  isPasswordStrong,
  PasswordStrengthMeter,
  Status,
  ValidationSummary,
  WorkspaceTabs,
} from './horizon';

interface MyProfilePageProps {
  onNavigate: (screen: ScreenId) => void;
  sessionUser: AuthSession | null;
}

const BIO_MAX_LENGTH = 200;

const roleLabels: Record<AuthSession['role'], string> = {
  underwriter: 'Senior Underwriter',
  executive: 'CEO / Executive',
  claims: 'Claims Manager',
  finance: 'Finance Officer',
  agent: 'Broker / Field Agent',
};

export const MyProfilePage: React.FC<MyProfilePageProps> = ({ onNavigate, sessionUser }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'security'>('overview');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [fullName, setFullName] = useState(sessionUser?.name || '');
  const [phone, setPhone] = useState('+254 712 000 000');
  const [branch, setBranch] = useState('Nairobi HQ');
  const [bio, setBio] = useState('Handles motor and commercial property underwriting for the Nairobi book.');
  const [profileAttempted, setProfileAttempted] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordAttempted, setPasswordAttempted] = useState(false);

  const showToast = (message: string) => {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(null), 2500);
  };

  const profileErrors: Record<string, string> = {};
  if (!fullName.trim()) profileErrors.fullName = 'Full name is required.';
  if (bio.length > BIO_MAX_LENGTH) profileErrors.bio = `Bio must be ${BIO_MAX_LENGTH} characters or fewer.`;
  const hasProfileErrors = Object.keys(profileErrors).length > 0;

  const handleSaveProfile = () => {
    if (hasProfileErrors) {
      setProfileAttempted(true);
      return;
    }
    setProfileAttempted(false);
    showToast('Profile updated successfully.');
  };

  const passwordErrors: Record<string, string> = {};
  if (!currentPassword) passwordErrors.currentPassword = 'Enter your current password.';
  if (!isPasswordStrong(newPassword)) passwordErrors.newPassword = 'New password does not meet all requirements below.';
  if (newPassword && currentPassword && newPassword === currentPassword) {
    passwordErrors.newPassword = 'New password must be different from your current password.';
  }
  if (confirmNewPassword !== newPassword) passwordErrors.confirmNewPassword = 'Passwords do not match.';
  const hasPasswordErrors = Object.keys(passwordErrors).length > 0;

  const handleChangePassword = () => {
    if (hasPasswordErrors) {
      setPasswordAttempted(true);
      return;
    }
    setIsChangingPassword(true);
    window.setTimeout(() => {
      setIsChangingPassword(false);
      setPasswordAttempted(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      showToast('Password changed successfully.');
    }, 600);
  };

  const tabs = [
    { id: 'overview' as const, label: 'Overview' },
    { id: 'security' as const, label: 'Security' },
  ];

  return (
    <HorizonPage id="my-profile-view">
      <HorizonPageTitle
        title="My Profile"
        subtitle="Account settings"
        onBack={() => onNavigate('underwriter-dashboard')}
      />

      <HorizonPageContent>
        <div className="flex flex-col gap-4 border-b border-[var(--hz-divider)] bg-[var(--hz-surface)] px-5 py-4 sm:flex-row sm:items-center">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[var(--hz-primary)] text-lg font-bold text-white">
            {(sessionUser?.name || 'U')
              .split(' ')
              .map((part) => part[0])
              .join('')
              .slice(0, 2)
              .toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-[var(--hz-text-primary)] tracking-tight">
                {sessionUser?.name || 'Unknown User'}
              </h2>
              <Status tone="success">{roleLabels[sessionUser?.role || 'underwriter']}</Status>
            </div>
            <p className="mt-1 text-xs text-[var(--hz-text-subtle)]">
              {sessionUser?.email || 'unknown@apex.co.ke'} • {sessionUser?.tenant || 'Apex Insurance Kenya Ltd'}
            </p>
          </div>
        </div>

        <WorkspaceTabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

        <div className="p-5">
          {activeTab === 'overview' && (
            <div className="max-w-2xl space-y-5">
              <div className="grid grid-cols-1 gap-4 text-xs sm:grid-cols-2">
                <label className="space-y-1">
                  <span className="block font-medium text-[var(--hz-text-subtle)]">Full Name</span>
                  <input
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    className="hz-field w-full px-3 py-1.5"
                  />
                  {profileAttempted && <FieldError message={profileErrors.fullName} />}
                </label>
                <label className="space-y-1">
                  <span className="flex items-center gap-1.5 font-medium text-[var(--hz-text-subtle)]">
                    <Mail className="h-3 w-3" /> Email
                  </span>
                  <div className="hz-field w-full bg-[var(--hz-surface-subtle)] px-3 py-1.5 text-[var(--hz-text-subtle)]">
                    {sessionUser?.email || '—'}
                  </div>
                </label>
                <label className="space-y-1">
                  <span className="flex items-center gap-1.5 font-medium text-[var(--hz-text-subtle)]">
                    <Phone className="h-3 w-3" /> Phone
                  </span>
                  <input
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    className="hz-field w-full px-3 py-1.5"
                  />
                </label>
                <label className="space-y-1">
                  <span className="flex items-center gap-1.5 font-medium text-[var(--hz-text-subtle)]">
                    <Building2 className="h-3 w-3" /> Branch
                  </span>
                  <input
                    value={branch}
                    onChange={(event) => setBranch(event.target.value)}
                    className="hz-field w-full px-3 py-1.5"
                  />
                </label>
              </div>

              <div>
                <span className="block text-xs font-medium text-[var(--hz-text-subtle)]">About</span>
                <textarea
                  rows={3}
                  maxLength={BIO_MAX_LENGTH}
                  value={bio}
                  onChange={(event) => setBio(event.target.value)}
                  className="hz-field mt-1 w-full px-3 py-2 text-xs"
                />
                <CharacterCounter current={bio.length} max={BIO_MAX_LENGTH} />
                {profileAttempted && <FieldError message={profileErrors.bio} />}
              </div>

              {profileAttempted && <ValidationSummary errors={Object.values(profileErrors)} />}

              <div className="flex justify-end">
                <button className="hz-button hz-button-primary" onClick={handleSaveProfile}>
                  <Check className="h-3.5 w-3.5" />
                  <span>Save Changes</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="max-w-md space-y-5">
              <div className="flex items-center gap-2 rounded-[var(--hz-radius-md)] border border-[var(--hz-border)] bg-[var(--hz-surface-subtle)] px-3 py-2 text-xs text-[var(--hz-text-secondary)]">
                <KeyRound className="h-4 w-4 shrink-0 text-[var(--hz-text-subtle)]" />
                <span>Update your password. You'll stay signed in on this device after changing it.</span>
              </div>

              <label className="block space-y-1 text-xs">
                <span className="font-medium text-[var(--hz-text-subtle)]">Current Password</span>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  className="hz-field w-full px-3 py-1.5"
                />
                {passwordAttempted && <FieldError message={passwordErrors.currentPassword} />}
              </label>

              <label className="block space-y-1 text-xs">
                <span className="font-medium text-[var(--hz-text-subtle)]">New Password</span>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  className="hz-field w-full px-3 py-1.5"
                />
              </label>

              <div className="space-y-2">
                <PasswordStrengthMeter password={newPassword} />
                {passwordAttempted && <FieldError message={passwordErrors.newPassword} />}
              </div>

              <label className="block space-y-1 text-xs">
                <span className="font-medium text-[var(--hz-text-subtle)]">Confirm New Password</span>
                <input
                  type="password"
                  value={confirmNewPassword}
                  onChange={(event) => setConfirmNewPassword(event.target.value)}
                  className="hz-field w-full px-3 py-1.5"
                />
                {passwordAttempted && <FieldError message={passwordErrors.confirmNewPassword} />}
              </label>

              <div className="flex justify-end">
                <button
                  className="hz-button hz-button-primary"
                  disabled={isChangingPassword}
                  onClick={handleChangePassword}
                >
                  <UserCircle2 className="h-3.5 w-3.5" />
                  <span>{isChangingPassword ? 'Changing Password...' : 'Change Password'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </HorizonPageContent>

      <HorizonToast message={toastMessage} tone="success" />
    </HorizonPage>
  );
};
