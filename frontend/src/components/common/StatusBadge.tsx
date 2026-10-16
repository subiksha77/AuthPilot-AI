import React from 'react';
import type { ClaimStatus } from '../../types';

const STATUS_STYLES: Record<ClaimStatus, string> = {
  'submitted':  'bg-blue-100 text-blue-800',
  'in-review':  'bg-yellow-100 text-yellow-800',
  'approved':   'bg-green-100 text-green-800',
  'rejected':   'bg-red-100 text-red-800',
  'needs-info': 'bg-orange-100 text-orange-800',
};

const STATUS_LABELS: Record<ClaimStatus, string> = {
  'submitted':  'Submitted',
  'in-review':  'In Review',
  'approved':   'Approved',
  'rejected':   'Rejected',
  'needs-info': 'Needs Info',
};

interface Props { status: ClaimStatus; }

const StatusBadge: React.FC<Props> = ({ status }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[status]}`}>
    {STATUS_LABELS[status]}
  </span>
);

export default StatusBadge;
