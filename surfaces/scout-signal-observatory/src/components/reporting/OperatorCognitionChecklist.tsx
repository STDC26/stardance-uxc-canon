// src/components/reporting/OperatorCognitionChecklist.tsx
// CC_SCOUT_23 — Operator Cognition Checklist.
// Guides operator through understanding verification before acting.

import React, { useState } from 'react';

// ─── Checklist items ──────────────────────────────────────────────────────────

export interface ChecklistItem {
  id:       string;
  text:     string;
  category: 'orientation' | 'confidence' | 'governance' | 'decision';
}

export const COGNITION_CHECKLIST: ChecklistItem[] = [
  {
    id:       'posture',
    text:     "Can you describe the signal's current posture (strong/weak/suppressed)?",
    category: 'orientation',
  },
  {
    id:       'confidence_level',
    text:     'Do you understand why confidence is at its current level?',
    category: 'confidence',
  },
  {
    id:       'cap_awareness',
    text:     'Are you aware of any confidence cap applied?',
    category: 'confidence',
  },
  {
    id:       'ethics_gates',
    text:     'Do you understand which ethics gates pass/fail and why?',
    category: 'governance',
  },
  {
    id:       'decision_rationale',
    text:     'Can you articulate your next action and rationale?',
    category: 'decision',
  },
];

const PASS_MESSAGE = '✓ You understand the signal. Ready to act.';

// ─── Main component ───────────────────────────────────────────────────────────

interface OperatorCognitionChecklistProps {
  onComplete?: (allChecked: boolean) => void;
}

export const OperatorCognitionChecklist: React.FC<OperatorCognitionChecklistProps> = ({ onComplete }) => {
  const [checked, setChecked] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setChecked(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      const allChecked = COGNITION_CHECKLIST.every(i => next.has(i.id));
      onComplete?.(allChecked);
      return next;
    });
  };

  const allChecked = COGNITION_CHECKLIST.every(i => checked.has(i.id));

  return (
    <div
      className="operator-cognition-checklist"
      data-testid="operator-cognition-checklist"
      style={{ padding: '16px 20px', background: '#0d1e2d', borderRadius: '8px', border: '1px solid rgba(8,145,178,0.2)' }}
    >
      <div style={{ fontSize: '11px', color: '#4a6070', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px' }}>
        Operator Cognition Checklist
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {COGNITION_CHECKLIST.map(item => (
          <label
            key={item.id}
            data-testid={`checklist-item-${item.id}`}
            style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}
          >
            <input
              type="checkbox"
              data-testid={`checkbox-${item.id}`}
              checked={checked.has(item.id)}
              onChange={() => toggle(item.id)}
              style={{ marginTop: '2px', accentColor: '#0891b2', flexShrink: 0 }}
            />
            <span style={{
              fontSize: '12px',
              color: checked.has(item.id) ? '#9ca3af' : '#d1d5db',
              textDecoration: checked.has(item.id) ? 'line-through' : 'none',
            }}>
              {item.text}
              <span style={{ marginLeft: '6px', fontSize: '10px', color: '#374151' }}>
                [{item.category}]
              </span>
            </span>
          </label>
        ))}
      </div>

      {allChecked && (
        <div
          data-testid="checklist-pass-message"
          style={{ marginTop: '12px', fontSize: '13px', color: '#10b981', fontWeight: 600, background: 'rgba(16,185,129,0.08)', borderRadius: '4px', padding: '6px 10px' }}
        >
          {PASS_MESSAGE}
        </div>
      )}
    </div>
  );
};
