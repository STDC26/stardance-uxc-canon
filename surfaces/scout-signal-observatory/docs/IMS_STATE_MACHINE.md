# IMS State Machine Reference — SCOUT

**Source:** IMS_STATE_MACHINE_REFERENCE.md (architecture/standards/)
**Implementation:** src/logic/ims-state-machine.ts

## States

| State | Description |
|-------|-------------|
| `idle` | Awaiting signal input |
| `validating` | Checking signal format (timeout: 5s) |
| `processing` | Classifying signal (timeout: 30s) |
| `complete` | Result ready, confidence HIGH (≥0.75) |
| `partial_complete` | Result ready, confidence MEDIUM (0.45–0.74) + warnings |
| `failed` | Unclassifiable or timeout |

## Transitions (Fail-Closed)

```
idle → validating          guard: input present and non-empty
validating → processing    guard: input passes validation
validating → failed        guard: input fails validation
processing → complete      guard: result present + confidence ≥ 0.75
processing → partial_complete  guard: result + confidence 0.45–0.74 + warnings
processing → failed        guard: no result or error present
complete → idle            guard: always (operator control)
partial_complete → idle    guard: always (operator control)
failed → idle              guard: always (operator control)
```

## Orbit Mapping

| IMS State | Orbit State |
|-----------|-------------|
| `complete` | `signal_sense` |
| `partial_complete` | `signal_sense` |
| `idle` | `idle` |
| `validating` | `validating` |
| `processing` | `processing` |
| `failed` | `failed` |
