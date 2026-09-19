Deutsche E-Mail-Vorlagen für Supabase Auth
==========================================
Einfügen unter: Supabase Dashboard -> Authentication -> Emails -> Templates

1) "Confirm sign up"
   Subject: Bitte bestätige deine E-Mail-Adresse – White Class Pro
   Message body: Inhalt von confirm-signup.html

2) "Reset password"
   Subject: Passwort zurücksetzen – White Class Pro
   Message body: Inhalt von reset-password.html

Wichtig:
- Die Links nutzen {{ .SiteURL }} und {{ .TokenHash }}. Beides muss unverändert bleiben.
- {{ .SiteURL }} kommt aus Authentication -> URL Configuration -> Site URL
  (jetzt: https://whiteclasspro.vercel.app, später die eigene Domain).
- Der Token wird erst von der Website (login.html) per JavaScript eingelöst, nicht beim
  bloßen Aufruf des Links. So verbrauchen Virenscanner der Mail-Anbieter ihn nicht.
