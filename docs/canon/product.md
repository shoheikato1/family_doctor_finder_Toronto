# Product canon: Find a Family Doctor

## What this is

A web app that finds a family doctor for people in Toronto who don't have one. The user tells an agent their location, search radius, and language preferences. A **Scout agent** searches real public sources and shortlists up to 10 family doctor offices. A **Caller agent**, a real voice agent, phones each office, identifies itself as an assistant calling on behalf of the named user, and politely ends the call the moment the receptionist confirms whether they accept new patients. The user comes back to a shortlist of confirmed-accepting clinics with transcripts, and makes only the one call that matters: booking their own meet and greet.

## Who it is for

Ontario residents without a family doctor. Roughly 2.5 million people are in this position, and the default paths are a years-long provincial waitlist (Health Care Connect) or a grinding manual loop: google clinics, call, nobody picks up, remember to call back, repeat.

## The job being done

Eliminate that loop. The emotional payoff is coming back to found-and-confirmed rather than searching-and-hoping. The product does the grind; the human keeps the human moment (the actual registration call).

## What v1 is

* Multi-user, deployed, real sign-up (portfolio product from day one)
* Scout: real clinic discovery via Google Places API, radius + language aware, capped at 10
* Caller: real ElevenLabs voice pipeline, running in **dry-run mode**: it dials a sandbox number answered by a simulated receptionist. The full pipeline is real; only the destination differs.
* Live calling exists behind a server-side feature flag (`caller_live_mode`), off, with a documented go-live checklist. Flipping it early is an abort condition, not a judgment call.

## What v1 is not

* Not live-calling real clinics (gated behind the checklist)
* Not per-user voice cloning (one stock voice; Shohei's consented clone behind `user_voice_clone`)
* Not a booking system: the user always makes the registration call themselves
* Not medical advice, and not a data seller: transcripts and recordings exist only to share the outcome with the user who asked

## Hard product rules

1. The Caller always discloses it is an automated assistant calling on behalf of the named user. No impersonation.
2. The Caller asks one question and leaves. Never pitches, never persuades.
3. Automation flags, the human decides: statuses are surfaced, the user acts.
4. Every paid or outward-facing switch (live mode, plan purchases) is a human-gated decision.
