import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ExplorerBadge from '../ExplorerBadge';
import React from 'react';

test('renders explorer badge with correct title and icon', () => {
  const tiers = [
    { id: 'explorer-wood', title: 'Promeneur Local', icon: '👣', min: 0, max: 4 },
    { id: 'explorer-bronze', title: 'Arpenteur', icon: '🧭', min: 5, max: 14 },
  ];
  render(React.createElement(ExplorerBadge, { tiers, current: 6 }));
  expect(screen.getByText('Arpenteur')).toBeInTheDocument();
  expect(screen.getByText('🧭')).toBeInTheDocument();
});
