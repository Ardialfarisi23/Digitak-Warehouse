# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: blackbox\rbac.spec.ts >> Blackbox Testing: Role-Based Access Control / RBAC (RBAC-01 s/d RBAC-06) >> RBAC-06: [Negatif/EG] Akses rute terlindungi tanpa token mengarahkan ke halaman login
- Location: tests\blackbox\rbac.spec.ts:6:7

# Error details

```
Error: page.evaluate: SecurityError: Failed to read the 'localStorage' property from 'Window': Access is denied for this document.
    at UtilityScript.evaluate (<anonymous>:372:16)
    at UtilityScript.<anonymous> (<anonymous>:1:44)
```