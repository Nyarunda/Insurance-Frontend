import React from 'react';

interface InsureERPLogoProps {
  variant?: 'light' | 'dark';
  lockup?: 'mark' | 'full';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeMap = {
  sm: { mark: 32, width: 132, word: 'text-sm', sub: 'text-[9px]' },
  md: { mark: 40, width: 164, word: 'text-base', sub: 'text-[10px]' },
  lg: { mark: 48, width: 196, word: 'text-lg', sub: 'text-[11px]' },
};

export const InsureERPMark: React.FC<{ variant?: 'light' | 'dark'; size?: number; className?: string }> = ({
  variant = 'dark',
  size = 40,
  className,
}) => {
  const navy = variant === 'light' ? '#ffffff' : '#0a1e3d';
  const blue = variant === 'light' ? '#dce7f5' : '#153980';
  const cyan = '#00a7e1';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label="InsureERP Horizon logo mark"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M32 4L54 13V30C54 44 44.5 55.5 32 60C19.5 55.5 10 44 10 30V13L32 4Z" fill={navy} />
      <path d="M32 10L48 16.5V29.5C48 39.7 41.4 48.3 32 52.4C22.6 48.3 16 39.7 16 29.5V16.5L32 10Z" fill={variant === 'light' ? '#0a1e3d' : '#ffffff'} opacity="0.96" />
      <path d="M22 39C27.4 30.5 35.4 25.6 46 24.2" stroke={cyan} strokeWidth="4" strokeLinecap="round" />
      <path d="M22 22H29V43H22V22Z" fill={blue} />
      <path d="M33 21H45V27H33V21Z" fill={blue} />
      <path d="M33 31H43V37H33V31Z" fill={blue} />
      <path d="M33 41H46V47H33V41Z" fill={blue} />
      <path d="M48 16.5V29.5C48 39.7 41.4 48.3 32 52.4" stroke={cyan} strokeWidth="2" strokeLinecap="round" opacity="0.9" />
    </svg>
  );
};

export const InsureERPLogo: React.FC<InsureERPLogoProps> = ({
  variant = 'dark',
  lockup = 'full',
  size = 'md',
  className,
}) => {
  const dimensions = sizeMap[size];
  const textColor = variant === 'light' ? 'text-white' : 'text-[var(--hz-nav)]';
  const subColor = variant === 'light' ? 'text-blue-100' : 'text-[var(--hz-primary)]';

  if (lockup === 'mark') {
    return <InsureERPMark variant={variant} size={dimensions.mark} className={className} />;
  }

  return (
    <div className={`inline-flex items-center gap-3 ${className || ''}`} style={{ minWidth: dimensions.width }}>
      <InsureERPMark variant={variant} size={dimensions.mark} />
      <div className="leading-none">
        <div className={`${dimensions.word} font-extrabold tracking-normal ${textColor}`}>
          Insure<span className={variant === 'light' ? 'text-[#00a7e1]' : 'text-[var(--hz-primary)]'}>ERP</span>
        </div>
        <div className={`${dimensions.sub} mt-1 font-mono font-bold uppercase tracking-[0.14em] ${subColor}`}>
          Horizon
        </div>
      </div>
    </div>
  );
};
