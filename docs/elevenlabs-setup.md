# ElevenLabs + Twilio setup (moves C1 to C3): exact configuration

Everything here is copy-paste. Shohei does the account/dashboard actions; values land in `.env` locally and in Vercel project env vars.

## 1. Accounts (Shohei-gated)

* **ElevenLabs**: sign up, pick a plan. Starter $6/mo (75 min) is enough for ~2 full dry-runs a month; Creator ~$22/mo (275 min) if more. Dry-runs burn ~2x minutes (both agents are ours).
* **Twilio**: sign up AND upgrade out of trial (add card, ~$20 balance). Trial mode plays a message before every call and only dials verified numbers, which breaks dry-runs.
* Buy **two Canadian local numbers** in Twilio (~$1.15/mo each): one outbound (the Caller's line) and one sandbox (the fake clinic line).

## 2. Import both numbers into ElevenLabs

ElevenLabs dashboard → Phone numbers → Import from Twilio (needs TWILIO_ACCOUNT_SID + AUTH_TOKEN). Note the ElevenLabs phone-number id of the OUTBOUND number → `ELEVENLABS_CALLER_PHONE_NUMBER_ID`.

## 3. Create the Caller agent

Agents → New agent. Settings:

* **First message (fixed, never model-generated)**:
  > Hi, this is an automated assistant calling on behalf of {{user_first_name}}, who is looking for a family doctor. This call may be recorded so I can share the outcome with them. I have one quick question: is your clinic currently accepting new patients?
* **System prompt**:
  > You are a polite, efficient assistant calling a medical clinic on behalf of {{user_first_name}}. Your ONLY goal is to learn whether the clinic is accepting new patients.
  > Rules:
  > 1. The moment the receptionist clearly confirms they ARE or ARE NOT accepting new patients, thank them in one sentence and end the call using the end call tool. Never pitch, never persuade, never ask a second question. If they volunteer registration criteria (postal code limits, documents needed), note them silently; do not probe.
  > 2. If asked who you are: you are an automated assistant, you say so plainly.
  > 3. If asked for contact details: callback number {{user_callback}}, email {{contact_email}}.
  > 4. If you reach an answering machine or voicemail: leave this message once: "Hello, I'm calling on behalf of {{user_first_name}} who is looking for a family doctor accepting new patients. You can reach them at {{user_callback}}. Thank you." Then end the call.
  > 5. If the person is busy, hostile, or asks you to call back: apologize in one sentence, thank them, end the call.
  > 6. Speak {{user_language}}. Keep every turn under two sentences.
* **Dynamic variables**: `user_first_name`, `user_language`, `clinic_name`, `user_callback`, `contact_email` (the backend sends these per call; also `call_id` arrives in the client data for webhook matching).
* **Data collection** (Analysis tab): `accepting_new_patients` (enum: yes | no | unknown), `criteria_notes` (string), `callback_required` (boolean).
* **Tools**: enable **End call**.
* **Voice**: pick a natural professional stock voice (Shohei auditions 3 and picks one). The personal clone comes later behind the `user_voice_clone` flag with `docs/consent/voice-clone-consent.md` signed.
* Copy the agent id → `ELEVENLABS_CALLER_AGENT_ID`.

## 4. Create the Receptionist agent (dry-run counterpart)

* **System prompt**: "You are a receptionist at {{clinic_name}}, a busy Toronto family medicine clinic. Answer briefly and naturally, like a real receptionist between tasks. Follow the persona instructions provided for this call exactly. Never volunteer that you are an AI. Keep turns short; be reactive, not chatty; never ask follow-up questions unless the persona says to."
* Persona per call is injected by our webhook (see 5); personas live in `api/_lib/personas.ts` (accepting / not accepting / voicemail / brusque-busy).
* **Voice**: any stock voice distinct from the Caller's.
* Assign this agent to INBOUND on the sandbox number.
* Copy the agent id → `ELEVENLABS_RECEPTIONIST_AGENT_ID`.

## 5. Webhooks (needs the deployed Vercel URL first, move P6)

* Agents → (workspace) webhooks: post-call transcription webhook → `https://YOUR-APP.vercel.app/api/webhooks/elevenlabs`; copy the signing secret → `ELEVENLABS_WEBHOOK_SECRET`.
* Receptionist agent → conversation initiation webhook (fetch config) → `https://YOUR-APP.vercel.app/api/webhooks/receptionist-init`.

## 6. Env vars (local `.env` + Vercel → Settings → Environment Variables)

`ELEVENLABS_API_KEY`, `ELEVENLABS_CALLER_AGENT_ID`, `ELEVENLABS_RECEPTIONIST_AGENT_ID`, `ELEVENLABS_CALLER_PHONE_NUMBER_ID`, `ELEVENLABS_WEBHOOK_SECRET`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `SANDBOX_RECEPTIONIST_NUMBER` (E.164, the fake clinic line), `USER_CALLBACK_NUMBER` (E.164, the outbound line).

## 7. Verification (no observation, no pass)

1. Dashboard text-test the Caller with 5 receptionist behaviours: instant yes, instant no, question back ("who is this?"), hold request, hostile. Pass = disclosure verbatim first, honest robot answer, one-turn exit on clear confirmation.
2. Phone the sandbox number from your cell: the Receptionist answers in persona. Pass = no trial message, no dead air.
3. Then run the app's dry-run: `docs/api-verification.md` has the endpoint-by-endpoint observations.
