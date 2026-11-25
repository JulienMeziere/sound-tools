import React from 'react';

import type { EffectName } from '../../shared/effects';

type IconProps = React.SVGProps<SVGSVGElement>;

/** 20×20 stroke icons that follow the current text color. */
const Icon: React.FC<IconProps & { children: React.ReactNode }> = ({
  children,
  ...props
}) => (
  <svg
    width='20'
    height='20'
    viewBox='0 0 20 20'
    fill='none'
    stroke='currentColor'
    strokeWidth='1.6'
    strokeLinecap='round'
    strokeLinejoin='round'
    aria-hidden='true'
    {...props}
  >
    {children}
  </svg>
);

export const DistortionIcon: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    <path d='M2 10h2.5l2-5.5 3 11 3-11 2 5.5H18' />
  </Icon>
);

export const ReverbIcon: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    <circle cx='5' cy='10' r='1.2' fill='currentColor' stroke='none' />
    <path d='M8.5 6.5a5 5 0 0 1 0 7' />
    <path d='M11.5 4a8.5 8.5 0 0 1 0 12' opacity='0.7' />
    <path d='M14.5 1.8a11.5 11.5 0 0 1 0 16.4' opacity='0.4' />
  </Icon>
);

export const FilterIcon: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    <path d='M2 15c2.5 0 3-8 6-8h3c3 0 4 .5 4.5 1.5S16.5 15 18 15' />
  </Icon>
);

export const MidiIcon: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    <rect x='2.5' y='4' width='15' height='12' rx='2' />
    <path d='M6.25 11v5M10 11v5M13.75 11v5' />
    <path
      d='M5.25 4h2v7h-2zM9 4h2v7H9zM12.75 4h2v7h-2z'
      fill='currentColor'
      stroke='none'
    />
  </Icon>
);

export const ChevronIcon: React.FC<IconProps> = (props) => (
  <Icon width='16' height='16' {...props}>
    <path d='m6 8 4 4 4-4' />
  </Icon>
);

export const AlertIcon: React.FC<IconProps> = (props) => (
  <Icon width='18' height='18' {...props}>
    <path d='M10 3 2.5 16h15L10 3Z' />
    <path d='M10 8v3.5' />
    <circle cx='10' cy='13.8' r='0.4' fill='currentColor' />
  </Icon>
);

export const CloseIcon: React.FC<IconProps> = (props) => (
  <Icon width='12' height='12' strokeWidth='2' {...props}>
    <path d='m5 5 10 10M15 5 5 15' />
  </Icon>
);

export const EFFECT_ICONS: Record<EffectName, React.FC<IconProps>> = {
  distortion: DistortionIcon,
  reverb: ReverbIcon,
  filter: FilterIcon,
};
