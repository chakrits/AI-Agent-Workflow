# Functional Test Design Techniques Reference

## Happy Path
Use for primary business flows and core user journeys.

## Negative Testing
Use invalid input, invalid state, permission mismatch, missing data, duplicate data, expired state, rejected transition, and backend/API error conditions.

## Boundary Value Analysis
Use when the input has a range, length, amount, date, retry count, timeout, age, quantity, or numeric limit.

## Equivalence Partitioning
Use to split input domains into valid and invalid partitions.

## Risk-based Testing
Prioritize high-likelihood and high-impact failures first.

## Exploratory Testing
Use when there is ambiguity, UI behavior risk, integration risk, or user workflow complexity.

## Traceability
Every test case should map to a source requirement, function spec, change request, defect, or explicit assumption.
