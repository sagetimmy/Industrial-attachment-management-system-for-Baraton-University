# Industrial-attachment-management-system-for-Baraton-University
A mobile app for managing students on  industrial attachments  from the University of Eastern Africa, Baraton

## Setup notes

1. **Frontend API URL**: set `EXPO_PUBLIC_API_URL` (for example `http://192.168.1.10:5000/api`).
2. **Auth flow**: new accounts are created as unverified and must complete email verification before login.
3. **Backend email config**: ensure `EMAIL_USER`, `EMAIL_PASS`, and `EMAIL_FROM` are set so verification codes can be sent.
