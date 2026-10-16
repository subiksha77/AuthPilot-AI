import type {
  Company,
  Policy,
  Claim,
  Policyholder,
  UploadedDocument,
  AuditEvent,
} from '../types';
import {
  DEMO_COMPANIES,
  DEMO_POLICIES,
  getStoredClaims,
  saveClaims,
  getStoredPolicyholders,
  getStoredAudit,
  addAuditEvent,
} from './demoData';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('authpilot_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options?.headers as Record<string, string> | undefined),
  };
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(`API ${res.status}: ${msg}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  // Authentication
  login: async (email: string, password: string) => {
    try {
      return await request<{ token: string; user: unknown }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
    } catch {
      // Offline fallback
      return { token: 'demo-token-' + Date.now(), user: { email } };
    }
  },

  // Companies
  getCompanies: async (): Promise<Company[]> => {
    try {
      return await request<Company[]>('/companies');
    } catch {
      return DEMO_COMPANIES;
    }
  },

  // Policies
  getPolicies: async (companyId?: string): Promise<Policy[]> => {
    try {
      const qs = companyId ? `?companyId=${companyId}` : '';
      return await request<Policy[]>(`/policies${qs}`);
    } catch {
      return companyId
        ? DEMO_POLICIES.filter((p) => p.companyId === companyId)
        : DEMO_POLICIES;
    }
  },

  // Policyholders Search
  searchPolicyholders: async (
    companyId?: string,
    policyIdQuery?: string,
    nameQuery?: string
  ): Promise<Policyholder[]> => {
    try {
      const qs = new URLSearchParams();
      if (companyId) qs.append('companyId', companyId);
      if (policyIdQuery) qs.append('policyId', policyIdQuery);
      if (nameQuery) qs.append('name', nameQuery);
      return await request<Policyholder[]>(`/policyholders/search?${qs.toString()}`);
    } catch {
      const all = getStoredPolicyholders();
      return all.filter((ph) => {
        if (companyId && ph.companyId !== companyId) return false;
        const matchesPolicyId =
          !policyIdQuery ||
          ph.policyNumber.toLowerCase().includes(policyIdQuery.toLowerCase()) ||
          ph.policyId.toLowerCase().includes(policyIdQuery.toLowerCase());
        const matchesName =
          !nameQuery || ph.name.toLowerCase().includes(nameQuery.toLowerCase());
        return matchesPolicyId && matchesName;
      });
    }
  },

  // Policyholder Profile
  getPolicyholder: async (policyIdOrNumber: string): Promise<Policyholder | undefined> => {
    try {
      return await request<Policyholder>(`/policyholders/${policyIdOrNumber}`);
    } catch {
      const all = getStoredPolicyholders();
      return all.find(
        (ph) =>
          ph.policyId === policyIdOrNumber ||
          ph.policyNumber === policyIdOrNumber ||
          ph.id === policyIdOrNumber
      );
    }
  },

  // Claims
  getClaims: async (params?: Record<string, string>): Promise<Claim[]> => {
    try {
      const qs = params ? `?${new URLSearchParams(params).toString()}` : '';
      return await request<Claim[]>(`/claims${qs}`);
    } catch {
      let claims = getStoredClaims();
      if (params?.patientId) {
        claims = claims.filter((c) => c.patientId === params.patientId);
      }
      if (params?.status && params.status !== 'all') {
        claims = claims.filter((c) => c.status === params.status);
      }
      return claims;
    }
  },

  getClaim: async (id: string): Promise<Claim | undefined> => {
    try {
      return await request<Claim>(`/claims/${id}`);
    } catch {
      return getStoredClaims().find((c) => c.id === id);
    }
  },

  createClaim: async (data: Partial<Claim>): Promise<Claim> => {
    try {
      return await request<Claim>('/claims', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    } catch {
      const all = getStoredClaims();
      const newClaim: Claim = {
        id: `cl-${Date.now()}`,
        claimNumber: `CLM-${new Date().getFullYear()}-${String(all.length + 1).padStart(4, '0')}`,
        patientName: data.patientName || 'Anonymous Patient',
        patientId: data.patientId || 'u4',
        policyId: data.policyId || 'p-star-01',
        policyNumber: data.policyNumber || 'POL-DEFAULT',
        companyName: data.companyName || 'Demo Insurance',
        procedure: data.procedure || 'Prior-Authorisation Evaluation',
        diagnosisCode: data.diagnosisCode || 'Z00.0',
        estimatedAmount: data.estimatedAmount || 25000,
        billedAmount: data.billedAmount || data.estimatedAmount || 25000,
        eligibleAmount: data.eligibleAmount,
        status: data.status || 'submitted',
        submittedDate: new Date().toISOString().split('T')[0],
        updatedDate: new Date().toISOString().split('T')[0],
        notes: data.notes || '',
        documents: data.documents || [],
      };
      saveClaims([newClaim, ...all]);

      addAuditEvent({
        claimId: newClaim.id,
        actor: data.assignedReviewer || 'James Okafor',
        role: 'coordinator',
        action: 'Claim Submitted via Policy Profile',
        details: `Submitted claim ${newClaim.claimNumber} for ${newClaim.procedure} ($${newClaim.estimatedAmount.toLocaleString()})`,
      });

      return newClaim;
    }
  },

  // Reviewer Decision
  recordReviewDecision: async (
    claimId: string,
    decision: 'approved' | 'rejected' | 'needs-info',
    reason: string,
    reviewerName: string
  ): Promise<Claim> => {
    try {
      return await request<Claim>(`/claims/${claimId}/review`, {
        method: 'POST',
        body: JSON.stringify({ decision, reason, reviewerName }),
      });
    } catch {
      const all = getStoredClaims();
      const idx = all.findIndex((c) => c.id === claimId);
      if (idx === -1) throw new Error('Claim not found');
      const updated: Claim = {
        ...all[idx],
        status: decision,
        decisionReason: reason,
        reviewerComment: reason,
        assignedReviewer: reviewerName,
        updatedDate: new Date().toISOString().split('T')[0],
      };
      all[idx] = updated;
      saveClaims([...all]);

      addAuditEvent({
        claimId,
        actor: reviewerName,
        role: 'reviewer',
        action:
          decision === 'approved'
            ? 'Prior-Authorisation Approved'
            : decision === 'rejected'
            ? 'Prior-Authorisation Rejected'
            : 'Additional Documents Requested',
        details: `Reason: ${reason}`,
      });

      return updated;
    }
  },

  // Audit
  getAuditHistory: async (claimId?: string): Promise<AuditEvent[]> => {
    try {
      const qs = claimId ? `?claimId=${claimId}` : '';
      return await request<AuditEvent[]>(`/audit${qs}`);
    } catch {
      const all = getStoredAudit();
      return claimId ? all.filter((a) => a.claimId === claimId) : all;
    }
  },
};
